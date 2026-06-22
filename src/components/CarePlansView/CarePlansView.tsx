"use client";

/* =============================================================================
   CarePlansView — Care plans (clinical)

   Protocol templates + active patient care plans for chronic-disease
   coordination. Grounding in mastersource:
     • §29 Result product boundary — Kura tracks "result is back" and owns the
       catalog + reference-range model, but is NOT a full result pipeline. So a
       plan step references a monitoring lab and its last *known* result; we never
       pretend to interpret or release results in-page.
     • §36 Kura is a clinic + lab coordination platform, not a full EMR. A care
       plan here is a longitudinal *coordination* artefact — an ordered schedule
       of monitoring labs + clinical targets + follow-up cadence — not a problem
       list / prescription / decision-support engine. Marking a monitoring step
       done does not stop surveillance: it advances the step to the next cadence
       interval so the roster stays a live schedule.
     • §39.6 Result provenance — last results carry a source ("Kura Lab ·
       verified" vs imported), never blended into a single trusted number.

   The diabetes / CKD / hypertension care-gap concept already modelled in the
   app (HbA1c repeat due, microalbumin/creatinine follow-up, annual eye exam) is
   reused faithfully. Two areas, switched by tabs:
     A — Template library: protocol cards, each an ordered monitoring schedule +
         targets + follow-up cadence. Templates are now FULLY EDITABLE and the
         single source of truth: edit step cadence/label, edit the protocol's
         review cadence, add/remove clinical targets, add/remove steps, author a
         brand-new protocol, and enrol a patient onto a real active plan derived
         from the template's current steps.
     B — Active plans: patients enrolled on a protocol with an adherence/gap
         status by tone (On track / Gap due / Overdue). Expand to see steps, the
         next due lab and last result; order the due lab, adjust schedule, or
         mark a step done — status recomputes live. Plans created via enrolment
         render through this same card UI and obey the same handlers.

   The two halves are connected: enrolment in Area A creates a plan that surfaces
   in Area B (the view auto-switches tabs). Templates and active plans share one
   container so an enrolment from the library lands in the roster.

   Self-contained: local fixtures, no backend. Ordering a lab / opening a chart
   can't navigate here, so they fire a toast. Deterministic dates/values — every
   "next due" derives from a cadence string or TODAY_LABEL, never the wall clock. */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Avatar,
  Badge,
  Button,
  Chip,
  Drawer,
  IconButton,
  Input,
  SegmentedToggle,
  Select,
  Tabs,
} from "@/components/ui";
import {
  ArrowDown as ArrowDownIcon,
  ArrowUp as ArrowUpIcon,
  Calendar as CalendarIcon,
  Check as CheckIcon,
  CheckCircle as CheckCircleIcon,
  ChevronDown as ChevronDownIcon,
  ChevronRight as ChevronRightIcon,
  Clock as ClockIcon,
  Close as CloseIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Flask as FlaskIcon,
  Heart as HeartIcon,
  Kidney as KidneyIcon,
  Minus as MinusIcon,
  Note as NoteIcon,
  Patient as PatientIcon,
  Pill as PillIcon,
  Plus as PlusIcon,
  User as UserIcon,
  Warning as WarningIcon,
} from "@/icons/components";
import type { IconProps } from "@/icons/components";
import { cx } from "@/lib/cx";
import "./CarePlansView.css";

/* ------------------------------------------------------------------ types -- */

type Tone = "danger" | "warning" | "info" | "success" | "neutral";
type AdherenceTone = "success" | "warning" | "danger";
type ProtocolKey = "t2dm" | "ckd" | "htn" | "lipid";
type StepKind = "lab" | "exam" | "measure";

/* Status is never colour alone — every tone carries its icon. */
const TONE_ICON: Record<Tone, (props: IconProps) => React.ReactElement> = {
  danger: WarningIcon,
  warning: ClockIcon,
  info: FlaskIcon,
  success: CheckCircleIcon,
  neutral: CalendarIcon,
};

const PROTOCOL_ICON: Record<ProtocolKey, (props: IconProps) => React.ReactElement> = {
  t2dm: PillIcon,
  ckd: KidneyIcon,
  htn: HeartIcon,
  lipid: FlaskIcon,
};

/* One scheduled monitoring step in a protocol template. */
type TemplateStep = {
  id: string;
  /* "lab" steps reference a monitoring lab; "exam"/"measure" are coordination
     steps (referral / home reading) — never a Kura lab order. */
  kind: StepKind;
  label: string;
  cadence: string;
};

type ProtocolTemplate = {
  key: string;
  protocol: ProtocolKey;
  name: string;
  summary: string;
  /* clinical targets, plausible for Cambodia primary care */
  targets: string[];
  reviewCadence: string;
  steps: TemplateStep[];
};

/* A step inside a patient's active plan — carries operational state + the last
   known result (with provenance) and when the next is due. */
type PlanStepState = "due" | "overdue" | "scheduled" | "done";

type PlanStep = {
  id: string;
  label: string;
  kind: StepKind;
  cadence: string;
  /* last known result — display string + a direction for the arrow glyph */
  last?: { value: string; date: string; source: string; dir: "up" | "down" | "flat" };
  nextDue: string;
  state: PlanStepState;
  /* set transiently when a done step has just been advanced, to show a calm
     "completed — next due" confirmation without making the step terminal. */
  justCompleted?: boolean;
};

type ActivePlan = {
  id: string;
  patient: string;
  initials: string;
  patientMeta: string;
  protocol: ProtocolKey;
  protocolName: string;
  /* set for plans created by enrolment, so a plan can be traced to its source
     template (§29: a plan is a coordination artefact derived from a protocol). */
  templateId?: string;
  templateName?: string;
  enrolled: string;
  nextReview: string;
  steps: PlanStep[];
};

/* A roster plan with its live-rolled-up adherence — the shape rendered by the
   active-plans area (steps may differ from the fixture after mutations). */
type PlanView = ActivePlan & { adherence: { tone: AdherenceTone; label: string } };

/* ------------------------------------------------------------- fixtures ---- */

const TEMPLATES: ProtocolTemplate[] = [
  {
    key: "t2dm",
    protocol: "t2dm",
    name: "Type 2 diabetes",
    summary: "Glycaemic monitoring with renal and eye surveillance.",
    targets: ["HbA1c < 7%", "Fasting glucose 4.4–7.2 mmol/L", "BP < 130/80"],
    reviewCadence: "Review every 3 months",
    steps: [
      { id: "t2dm-hba1c", kind: "lab", label: "HbA1c", cadence: "Every 3 months" },
      { id: "t2dm-fbg", kind: "lab", label: "Fasting glucose", cadence: "Every 3 months" },
      { id: "t2dm-lipid", kind: "lab", label: "Lipid panel", cadence: "Every 12 months" },
      { id: "t2dm-acr", kind: "lab", label: "Urine albumin / creatinine ratio", cadence: "Every 12 months" },
      { id: "t2dm-eye", kind: "exam", label: "Dilated eye exam (ophthalmology)", cadence: "Every 12 months" },
      { id: "t2dm-foot", kind: "exam", label: "Foot exam", cadence: "Every 6 months" },
    ],
  },
  {
    key: "ckd",
    protocol: "ckd",
    name: "Chronic kidney disease",
    summary: "Stage-based renal monitoring; slow progression, watch albuminuria.",
    targets: ["No eGFR decline > 5 mL/min per year", "ACR < 30 mg/g", "BP < 130/80"],
    reviewCadence: "Review every 3 months (stage 3+)",
    steps: [
      { id: "ckd-creat", kind: "lab", label: "Creatinine + eGFR", cadence: "Every 3 months" },
      { id: "ckd-acr", kind: "lab", label: "Urine albumin / creatinine ratio", cadence: "Every 3 months" },
      { id: "ckd-k", kind: "lab", label: "Potassium", cadence: "Every 6 months" },
      { id: "ckd-hb", kind: "lab", label: "Haemoglobin", cadence: "Every 6 months" },
      { id: "ckd-bp", kind: "measure", label: "Blood pressure", cadence: "Every visit" },
    ],
  },
  {
    key: "htn",
    protocol: "htn",
    name: "Hypertension",
    summary: "Blood-pressure control with metabolic and renal checks.",
    targets: ["BP < 140/90 (clinic)", "Home average < 135/85"],
    reviewCadence: "Review every 6 months once controlled",
    steps: [
      { id: "htn-bp", kind: "measure", label: "Clinic blood pressure", cadence: "Every visit" },
      { id: "htn-home", kind: "measure", label: "Home BP log review", cadence: "Every 3 months" },
      { id: "htn-creat", kind: "lab", label: "Creatinine + electrolytes", cadence: "Every 12 months" },
      { id: "htn-lipid", kind: "lab", label: "Lipid panel", cadence: "Every 12 months" },
    ],
  },
  {
    key: "lipid",
    protocol: "lipid",
    name: "Lipid / CVD risk",
    summary: "Lipid surveillance for cardiovascular risk reduction.",
    targets: ["LDL-C < 2.6 mmol/L", "LDL-C < 1.8 mmol/L if high risk"],
    reviewCadence: "Review every 12 months when at goal",
    steps: [
      { id: "lipid-panel", kind: "lab", label: "Fasting lipid panel", cadence: "Every 12 months" },
      { id: "lipid-alt", kind: "lab", label: "ALT (statin safety)", cadence: "Every 12 months" },
      { id: "lipid-glu", kind: "lab", label: "Fasting glucose", cadence: "Every 12 months" },
    ],
  },
  /* A draft protocol with no steps yet — exercises the per-card "no steps" guard
     and is the seed for the empty-library demo. */
  {
    key: "copd-draft",
    protocol: "lipid",
    name: "COPD (draft)",
    summary: "Spirometry and exacerbation surveillance — schedule not authored yet.",
    targets: ["Reduce exacerbation frequency"],
    reviewCadence: "Review cadence not set",
    steps: [],
  },
];

const ACTIVE_PLANS: ActivePlan[] = [
  {
    id: "plan-sokha",
    patient: "Sokha Chann",
    initials: "SC",
    patientMeta: "F · 58 · Toul Kork",
    protocol: "t2dm",
    protocolName: "Type 2 diabetes",
    enrolled: "15 Jan 2026",
    nextReview: "21 Aug 2026",
    steps: [
      {
        id: "s1",
        label: "HbA1c",
        kind: "lab",
        cadence: "Every 3 months",
        last: { value: "8.3%", date: "21 May 2026", source: "Kura Lab · verified", dir: "down" },
        nextDue: "21 Aug 2026",
        state: "due",
      },
      {
        id: "s2",
        label: "Urine albumin / creatinine ratio",
        kind: "lab",
        cadence: "Every 12 months",
        last: { value: "155.5 mg/g", date: "21 May 2026", source: "Kura Lab · verified", dir: "up" },
        nextDue: "21 May 2027",
        state: "scheduled",
      },
      {
        id: "s3",
        label: "Dilated eye exam (ophthalmology)",
        kind: "exam",
        cadence: "Every 12 months",
        last: { value: "No retinopathy", date: "8 Mar 2025", source: "Outside report", dir: "flat" },
        nextDue: "8 Mar 2026",
        state: "overdue",
      },
      {
        id: "s4",
        label: "Lipid panel",
        kind: "lab",
        cadence: "Every 12 months",
        last: { value: "LDL 3.1 mmol/L", date: "15 Jan 2026", source: "Kura Lab · verified", dir: "flat" },
        nextDue: "15 Jan 2027",
        state: "scheduled",
      },
    ],
  },
  {
    id: "plan-dara",
    patient: "Dara Pich",
    initials: "DP",
    patientMeta: "M · 64 · Sen Sok",
    protocol: "ckd",
    protocolName: "Chronic kidney disease",
    enrolled: "3 Mar 2026",
    nextReview: "3 Jun 2026",
    steps: [
      {
        id: "s1",
        label: "Creatinine + eGFR",
        kind: "lab",
        cadence: "Every 3 months",
        last: { value: "eGFR 38", date: "3 Mar 2026", source: "Kura Lab · verified", dir: "down" },
        nextDue: "3 Jun 2026",
        state: "overdue",
      },
      {
        id: "s2",
        label: "Urine albumin / creatinine ratio",
        kind: "lab",
        cadence: "Every 3 months",
        last: { value: "210 mg/g", date: "3 Mar 2026", source: "Kura Lab · verified", dir: "up" },
        nextDue: "3 Jun 2026",
        state: "overdue",
      },
      {
        id: "s3",
        label: "Potassium",
        kind: "lab",
        cadence: "Every 6 months",
        last: { value: "4.6 mmol/L", date: "3 Mar 2026", source: "Kura Lab · verified", dir: "flat" },
        nextDue: "3 Sep 2026",
        state: "scheduled",
      },
      {
        id: "s4",
        label: "Blood pressure",
        kind: "measure",
        cadence: "Every visit",
        last: { value: "146/92", date: "3 Mar 2026", source: "Clinic measurement", dir: "up" },
        nextDue: "Next visit",
        state: "due",
      },
    ],
  },
  {
    id: "plan-mealea",
    patient: "Mealea Sok",
    initials: "MS",
    patientMeta: "F · 49 · Chamkar Mon",
    protocol: "htn",
    protocolName: "Hypertension",
    enrolled: "12 Feb 2026",
    nextReview: "12 Aug 2026",
    steps: [
      {
        id: "s1",
        label: "Clinic blood pressure",
        kind: "measure",
        cadence: "Every visit",
        last: { value: "128/82", date: "20 May 2026", source: "Clinic measurement", dir: "down" },
        nextDue: "Next visit",
        state: "scheduled",
      },
      {
        id: "s2",
        label: "Home BP log review",
        kind: "measure",
        cadence: "Every 3 months",
        last: { value: "Avg 131/84", date: "20 May 2026", source: "Patient log", dir: "flat" },
        nextDue: "20 Aug 2026",
        state: "scheduled",
      },
      {
        id: "s3",
        label: "Creatinine + electrolytes",
        kind: "lab",
        cadence: "Every 12 months",
        last: { value: "Normal", date: "12 Feb 2026", source: "Kura Lab · verified", dir: "flat" },
        nextDue: "12 Feb 2027",
        state: "scheduled",
      },
    ],
  },
  {
    id: "plan-visal",
    patient: "Visal Nuon",
    initials: "VN",
    patientMeta: "M · 55 · Daun Penh",
    protocol: "lipid",
    protocolName: "Lipid / CVD risk",
    enrolled: "5 Apr 2026",
    nextReview: "5 Apr 2027",
    steps: [
      {
        id: "s1",
        label: "Fasting lipid panel",
        kind: "lab",
        cadence: "Every 12 months",
        last: { value: "LDL 2.4 mmol/L", date: "5 Apr 2026", source: "Kura Lab · verified", dir: "down" },
        nextDue: "5 Apr 2027",
        state: "scheduled",
      },
      {
        id: "s2",
        label: "ALT (statin safety)",
        kind: "lab",
        cadence: "Every 12 months",
        last: { value: "28 U/L", date: "5 Apr 2026", source: "Kura Lab · verified", dir: "flat" },
        nextDue: "5 Apr 2027",
        state: "scheduled",
      },
    ],
  },
];

/* Roster of enrollable patients — plausible Cambodia names consistent with the
   app. The first four mirror the seeded active plans so the "already enrolled"
   guard has something to bite on; the rest are fresh candidates. */
type RosterPatient = { name: string; initials: string; meta: string };
const PATIENT_ROSTER: RosterPatient[] = [
  { name: "Sokha Chann", initials: "SC", meta: "F · 58 · Toul Kork" },
  { name: "Dara Pich", initials: "DP", meta: "M · 64 · Sen Sok" },
  { name: "Mealea Sok", initials: "MS", meta: "F · 49 · Chamkar Mon" },
  { name: "Visal Nuon", initials: "VN", meta: "M · 55 · Daun Penh" },
  { name: "Sreymom Sok", initials: "SS", meta: "F · 52 · Russey Keo" },
  { name: "Sovann Tep", initials: "ST", meta: "M · 61 · Mean Chey" },
  { name: "Chenda Lim", initials: "CL", meta: "F · 47 · Boeng Keng Kang" },
  { name: "Rithy Veng", initials: "RV", meta: "M · 59 · Dangkao" },
  { name: "Bopha Heng", initials: "BH", meta: "F · 66 · Prampir Makara" },
];

/* Deterministic "today" for the demo — aligns with the latest fixture results. */
const TODAY_LABEL = "21 Jun 2026";

/* --------------------------------------------------------- derivations ----- */

const STEP_STATE_LABEL: Record<PlanStepState, string> = {
  due: "Due",
  overdue: "Overdue",
  scheduled: "Scheduled",
  done: "Done",
};

const STEP_STATE_TONE: Record<PlanStepState, Tone> = {
  due: "warning",
  overdue: "danger",
  scheduled: "neutral",
  done: "success",
};

/* A plan's overall adherence rolls up from its open steps: any overdue → at
   risk (danger); else any due → gap due (warning); else on track (success). */
function adherenceOf(steps: PlanStep[]): { tone: AdherenceTone; label: string } {
  if (steps.some((s) => s.state === "overdue")) return { tone: "danger", label: "Overdue" };
  if (steps.some((s) => s.state === "due")) return { tone: "warning", label: "Gap due" };
  return { tone: "success", label: "On track" };
}

function openStepCount(steps: PlanStep[]): number {
  return steps.filter((s) => s.state !== "done").length;
}

function careGapCount(steps: PlanStep[]): number {
  return steps.filter((s) => s.state === "due" || s.state === "overdue").length;
}

function nextActionStep(steps: PlanStep[]): PlanStep | undefined {
  return (
    steps.find((s) => s.state === "overdue") ??
    steps.find((s) => s.state === "due") ??
    steps.find((s) => s.state === "scheduled")
  );
}

const ADHERENCE_ICON: Record<AdherenceTone, (props: IconProps) => React.ReactElement> = {
  success: CheckCircleIcon,
  warning: ClockIcon,
  danger: WarningIcon,
};

/* Cadence → months. "Every visit" has no fixed interval. */
const CADENCE_MONTHS: Record<string, number | null> = {
  "Every visit": null,
  "Every 3 months": 3,
  "Every 6 months": 6,
  "Every 12 months": 12,
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/* Deterministic month-advance from TODAY_LABEL by a cadence's interval, so a
   completed step reschedules to its next surveillance date (§36). Also used to
   seed a derived plan step's first nextDue at enrolment. */
function advanceFromToday(cadence: string): string {
  const months = CADENCE_MONTHS[cadence];
  if (months == null) return "Next visit";
  const [d, mName, y] = TODAY_LABEL.split(" ");
  const day = Number(d);
  const year = Number(y);
  const mIdx = MONTHS.indexOf(mName);
  const total = mIdx + months;
  const newYear = year + Math.floor(total / 12);
  const newMonth = ((total % 12) + 12) % 12;
  return `${day} ${MONTHS[newMonth]} ${newYear}`;
}

function DirArrow({ dir }: { dir: "up" | "down" | "flat" }) {
  if (dir === "up") return <ArrowUpIcon size={12} variant="stroke" aria-label="trending up" />;
  if (dir === "down") return <ArrowDownIcon size={12} variant="stroke" aria-label="trending down" />;
  return <MinusIcon size={12} variant="stroke" aria-label="unchanged" />;
}

const CADENCE_OPTIONS = [
  "Every visit",
  "Every 3 months",
  "Every 6 months",
  "Every 12 months",
];

/* The exam/measure split is preserved in the data model; the builder offers the
   three kinds (a scheduled lab, an in-visit measure, or an exam/referral). All
   three are reachable on seeded templates and rendered correctly. */
const STEP_KIND_BUILDER: { label: string; value: StepKind }[] = [
  { label: "Lab", value: "lab" },
  { label: "Measure", value: "measure" },
  { label: "Exam / referral", value: "exam" },
];

const STEP_ICON: Record<StepKind, (props: IconProps) => React.ReactElement> = {
  lab: FlaskIcon,
  exam: HeartIcon,
  measure: CalendarIcon,
};

function stepKindCaption(kind: StepKind): string | null {
  if (kind === "exam") return "Coordination · referral";
  if (kind === "measure") return "In-visit measurement";
  return null;
}

/* A lab monitored "Every visit" is clinically implausible (labs are scheduled,
   not run at every encounter). Used by every cadence editor + the builders. */
function isImplausible(kind: StepKind, cadence: string): boolean {
  return kind === "lab" && cadence === "Every visit";
}

/* Stable, deterministic slug from arbitrary text — used to mint template ids
   and step ids from names so nothing depends on Math.random / Date.now. A
   uniqueness suffix is layered on by the caller from an existing-id set. */
function slugify(text: string): string {
  const base = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "protocol";
}

function uniqueId(base: string, taken: Set<string>): string {
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

/* ============================================================== component == */

type TabKey = "templates" | "active";

export function CarePlansView() {
  const [tab, setTab] = useState<TabKey>("active");

  /* SINGLE SOURCE OF TRUTH, lifted to the page so the two halves share state:
     templates drive what can be enrolled; the roster + per-plan steps drive the
     active area. Enrolment writes into both, then switches the tab. */
  const [templates, setTemplates] = useState<ProtocolTemplate[]>(TEMPLATES);
  const [roster, setRoster] = useState<ActivePlan[]>(ACTIVE_PLANS);
  const [planSteps, setPlanSteps] = useState<Record<string, PlanStep[]>>(() =>
    Object.fromEntries(ACTIVE_PLANS.map((p) => [p.id, p.steps])),
  );
  /* Which plan to expand + scroll to after an enrolment lands in Area B. */
  const [focusPlanId, setFocusPlanId] = useState<string | null>(null);

  /* Build a real active plan from a template's CURRENT steps (§29: the plan is a
     coordination artefact derived from the protocol). Each derived step starts
     with no last result, a deterministic nextDue from its cadence, and a state
     of due (interval-based) or open (every-visit) so the new plan immediately
     reads as a live schedule with a first gap to action. */
  const enrollPatient = useCallback(
    (template: ProtocolTemplate, patient: RosterPatient) => {
      const planId = `plan-${slugify(template.key)}-${slugify(patient.name)}`;
      const steps: PlanStep[] = template.steps.map((step, i) => ({
        id: `enr-${step.id}-${i}`,
        label: step.label,
        kind: step.kind,
        cadence: step.cadence,
        nextDue: advanceFromToday(step.cadence),
        /* First cycle of a brand-new plan: nothing measured yet, so it's a gap
           to action — labs/measures read as "due", never overdue/done. */
        state: "due",
      }));
      const plan: ActivePlan = {
        id: planId,
        patient: patient.name,
        initials: patient.initials,
        patientMeta: patient.meta,
        protocol: template.protocol,
        protocolName: template.name,
        templateId: template.key,
        templateName: template.name,
        enrolled: TODAY_LABEL,
        nextReview: advanceFromToday(reviewCadenceToInterval(template.reviewCadence)),
        steps,
      };
      setRoster((prev) => [plan, ...prev]);
      setPlanSteps((prev) => ({ ...prev, [planId]: steps }));
      setFocusPlanId(planId);
      setTab("active");
      const stepNote = steps.length === 1 ? "1 monitoring step" : `${steps.length} monitoring steps`;
      toast.success(`${patient.name} enrolled on ${template.name}`, {
        description: `${stepNote} scheduled · see Enrolled patients`,
      });
    },
    [],
  );

  /* True when this exact patient is already on a plan derived from this exact
     template — the enrolment guard (no duplicate enrolment). */
  const isEnrolled = useCallback(
    (templateKey: string, patientName: string) =>
      roster.some((p) => p.templateId === templateKey && p.patient === patientName),
    [roster],
  );

  const activePlanViews = useMemo(
    () =>
      roster.map((plan) => {
        const steps = planSteps[plan.id] ?? plan.steps;
        return { ...plan, steps, adherence: adherenceOf(steps) };
      }),
    [planSteps, roster],
  );

  const commandMetrics = useMemo(
    () => ({
      overdue: activePlanViews.filter((p) => p.adherence.tone === "danger").length,
      due: activePlanViews.filter((p) => p.adherence.tone === "warning").length,
      openSteps: activePlanViews.reduce((total, p) => total + openStepCount(p.steps), 0),
      templates: templates.length,
    }),
    [activePlanViews, templates.length],
  );

  return (
    <div className="cpv" aria-label="Care programs">
      <div className="cpv-command">
        <div className="cpv-command-copy">
          <p className="cpv-eyebrow">Care programs</p>
          <p className="cpv-lede">
            Population view — enrolled patients, open monitoring gaps, and the protocol templates that drive them. Open a patient to manage their care in the chart.
          </p>
        </div>
        <div className="cpv-command-metrics" aria-label="Care plan status summary">
          <span className="cpv-command-stat cpv-command-stat--danger">
            <strong>{commandMetrics.overdue}</strong>
            <small>overdue</small>
          </span>
          <span className="cpv-command-stat cpv-command-stat--warning">
            <strong>{commandMetrics.due}</strong>
            <small>gap due</small>
          </span>
          <span className="cpv-command-stat">
            <strong>{commandMetrics.openSteps}</strong>
            <small>open steps</small>
          </span>
          <span className="cpv-command-stat">
            <strong>{commandMetrics.templates}</strong>
            <small>templates</small>
          </span>
        </div>
      </div>

      <Tabs<TabKey>
        aria-label="Care programs view"
        value={tab}
        onChange={setTab}
        size="sm"
        className="cpv-tabs"
        items={[
          { label: "Enrolled patients", value: "active", count: activePlanViews.length },
          { label: "Template library", value: "templates", count: templates.length },
        ]}
      />

      {tab === "active" ? (
        <ActivePlansArea
          roster={roster}
          setRoster={setRoster}
          planSteps={planSteps}
          setPlanSteps={setPlanSteps}
          focusPlanId={focusPlanId}
          clearFocus={() => setFocusPlanId(null)}
          onGoToLibrary={() => setTab("templates")}
        />
      ) : (
        <TemplateLibraryArea
          templates={templates}
          setTemplates={setTemplates}
          roster={roster}
          enrollPatient={enrollPatient}
          isEnrolled={isEnrolled}
        />
      )}
    </div>
  );
}

/* A protocol's review-cadence string is free text ("Review every 3 months
   (stage 3+)"). Pull the first cadence keyword out of it so a derived plan's
   nextReview can be advanced deterministically; fall back to 3 months. */
function reviewCadenceToInterval(reviewCadence: string): string {
  const lower = reviewCadence.toLowerCase();
  if (lower.includes("12 month")) return "Every 12 months";
  if (lower.includes("6 month")) return "Every 6 months";
  if (lower.includes("3 month")) return "Every 3 months";
  return "Every 3 months";
}

/* ----------------------------------------------------- shared atoms -------- */

function EmptyState({
  icon,
  message,
  tone = "neutral",
  cta,
}: {
  icon: (props: IconProps) => React.ReactElement;
  message: string;
  tone?: Tone;
  cta?: { label: string; icon?: (props: IconProps) => React.ReactElement; onClick: () => void };
}) {
  const Icon = icon;
  const CtaIcon = cta?.icon;
  return (
    <div className={cx("cpv-empty", `cpv-empty--${tone}`)}>
      <span aria-hidden className={cx("cpv-empty-ic", `cpv-tone-${tone}`)}>
        <Icon size={18} variant="stroke" />
      </span>
      <span className="cpv-empty-copy">{message}</span>
      {cta && (
        <Button
          intent="secondary"
          size="sm"
          leadingIcon={CtaIcon ? <CtaIcon size={14} variant="stroke" /> : undefined}
          onClick={cta.onClick}
        >
          {cta.label}
        </Button>
      )}
    </div>
  );
}

/* ----------------------------------------------------- Area A: templates --- */

function TemplateLibraryArea({
  templates,
  setTemplates,
  roster,
  enrollPatient,
  isEnrolled,
}: {
  templates: ProtocolTemplate[];
  setTemplates: React.Dispatch<React.SetStateAction<ProtocolTemplate[]>>;
  roster: ActivePlan[];
  enrollPatient: (template: ProtocolTemplate, patient: RosterPatient) => void;
  isEnrolled: (templateKey: string, patientName: string) => boolean;
}) {
  /* Which card just got created, so the library can auto-expand it. */
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [enrollFor, setEnrollFor] = useState<ProtocolTemplate | null>(null);

  const takenKeys = useMemo(() => new Set(templates.map((t) => t.key)), [templates]);

  /* ---- template mutation helpers — all write into the lifted `templates` --- */

  const updateStep = (templateKey: string, stepId: string, patch: Partial<TemplateStep>) => {
    setTemplates((prev) =>
      prev.map((t) =>
        t.key === templateKey
          ? { ...t, steps: t.steps.map((s) => (s.id === stepId ? { ...s, ...patch } : s)) }
          : t,
      ),
    );
  };

  const removeStep = (templateKey: string, stepId: string) => {
    /* Read the removed step + its original index up front so the undo toast can
       splice it back at the same position. */
    const owner = templates.find((t) => t.key === templateKey);
    const index = owner ? owner.steps.findIndex((s) => s.id === stepId) : -1;
    const step = index >= 0 && owner ? owner.steps[index] : null;
    if (!step) return;

    setTemplates((prev) =>
      prev.map((t) =>
        t.key === templateKey ? { ...t, steps: t.steps.filter((s) => s.id !== stepId) } : t,
      ),
    );
    toast.success(`${step.label} removed`, {
      description: "Step deleted from this protocol",
      action: {
        label: "Undo",
        onClick: () =>
          setTemplates((prev) =>
            prev.map((t) =>
              t.key === templateKey
                ? { ...t, steps: [...t.steps.slice(0, index), step, ...t.steps.slice(index)] }
                : t,
            ),
          ),
      },
    });
  };

  const addStep = (templateKey: string, step: Omit<TemplateStep, "id">) => {
    setTemplates((prev) =>
      prev.map((t) => {
        if (t.key !== templateKey) return t;
        const existing = new Set(t.steps.map((s) => s.id));
        const id = uniqueId(`${t.key}-${slugify(step.label)}`, existing);
        return { ...t, steps: [...t.steps, { ...step, id }] };
      }),
    );
    toast.success(`${step.label} added`, { description: `${step.cadence} · monitoring step` });
  };

  const setReviewCadence = (templateKey: string, reviewCadence: string) => {
    setTemplates((prev) => prev.map((t) => (t.key === templateKey ? { ...t, reviewCadence } : t)));
    toast.success("Review cadence updated", { description: reviewCadence });
  };

  const addTarget = (templateKey: string, target: string) => {
    const trimmed = target.trim();
    if (!trimmed) return;
    setTemplates((prev) =>
      prev.map((t) =>
        t.key === templateKey && !t.targets.includes(trimmed)
          ? { ...t, targets: [...t.targets, trimmed] }
          : t,
      ),
    );
    toast.success("Target added", { description: trimmed });
  };

  const removeTarget = (templateKey: string, target: string) => {
    setTemplates((prev) =>
      prev.map((t) =>
        t.key === templateKey ? { ...t, targets: t.targets.filter((x) => x !== target) } : t,
      ),
    );
    toast.success("Target removed", { description: target });
  };

  const createTemplate = (template: ProtocolTemplate) => {
    setTemplates((prev) => [template, ...prev]);
    setFocusKey(template.key);
    setCreateOpen(false);
    toast.success(`${template.name} created`, {
      description: `${template.steps.length} step${template.steps.length === 1 ? "" : "s"} · ready to enrol`,
    });
  };

  const restoreDefaults = () => {
    setTemplates(TEMPLATES);
    toast.success("Default protocols restored", {
      description: "The seed protocol library is back",
    });
  };

  return (
    <section className="cpv-section" aria-label="Template library">
      <div className="cpv-section-head">
        <div className="cpv-section-headrow">
          <p className="k-section-label cpv-group-label">
            Templates
            <Badge appearance="subtle" className="cpv-count" tone="neutral">
              {templates.length}
            </Badge>
          </p>
          <div className="cpv-head-actions">
            <Button
              intent="primary"
              size="sm"
              leadingIcon={<PlusIcon size={14} variant="stroke" />}
              onClick={() => setCreateOpen(true)}
            >
              New protocol
            </Button>
            {templates.length > 0 && (
              <Button intent="ghost" size="sm" onClick={() => setTemplates([])}>
                Clear library
              </Button>
            )}
          </div>
        </div>
        <p className="cpv-section-sub">
          Each protocol is an ordered monitoring schedule plus clinical targets. Edits here are the
          single source of truth — they persist for the session and are what an enrolment derives from.
        </p>
      </div>

      {templates.length === 0 ? (
        <EmptyState
          icon={NoteIcon}
          message="No protocol templates yet. Author a new protocol, or restore the default library."
          cta={{
            label: "Restore defaults",
            icon: NoteIcon,
            onClick: restoreDefaults,
          }}
        />
      ) : (
        <ul className="cpv-template-grid">
          {templates.map((template) => (
            <li key={template.key}>
              <TemplateCard
                template={template}
                defaultOpen={template.key === focusKey}
                enrolledCount={roster.filter((p) => p.templateId === template.key).length}
                onUpdateStep={(stepId, patch) => updateStep(template.key, stepId, patch)}
                onRemoveStep={(stepId) => removeStep(template.key, stepId)}
                onAddStep={(step) => addStep(template.key, step)}
                onSetReviewCadence={(c) => setReviewCadence(template.key, c)}
                onAddTarget={(t) => addTarget(template.key, t)}
                onRemoveTarget={(t) => removeTarget(template.key, t)}
                onEnroll={() => setEnrollFor(template)}
              />
            </li>
          ))}
        </ul>
      )}

      <CreateProtocolDrawer
        open={createOpen}
        takenKeys={takenKeys}
        onClose={() => setCreateOpen(false)}
        onCreate={createTemplate}
      />

      <EnrollDrawer
        template={enrollFor}
        onClose={() => setEnrollFor(null)}
        isEnrolled={isEnrolled}
        onEnroll={(patient) => {
          if (enrollFor) {
            enrollPatient(enrollFor, patient);
            setEnrollFor(null);
          }
        }}
      />
    </section>
  );
}

function TemplateCard({
  template,
  defaultOpen,
  enrolledCount,
  onUpdateStep,
  onRemoveStep,
  onAddStep,
  onSetReviewCadence,
  onAddTarget,
  onRemoveTarget,
  onEnroll,
}: {
  template: ProtocolTemplate;
  defaultOpen: boolean;
  enrolledCount: number;
  onUpdateStep: (stepId: string, patch: Partial<TemplateStep>) => void;
  onRemoveStep: (stepId: string) => void;
  onAddStep: (step: Omit<TemplateStep, "id">) => void;
  onSetReviewCadence: (cadence: string) => void;
  onAddTarget: (target: string) => void;
  onRemoveTarget: (target: string) => void;
  onEnroll: () => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [addingStep, setAddingStep] = useState(false);
  const [editingReview, setEditingReview] = useState(false);
  const [reviewDraft, setReviewDraft] = useState(template.reviewCadence);
  const [targetDraft, setTargetDraft] = useState("");
  const Icon = PROTOCOL_ICON[template.protocol];
  const bodyId = `cpv-tpl-body-${template.key}`;

  /* If the card is newly created (defaultOpen flips true), open it once. */
  const wasDefaultOpen = useRef(false);
  useEffect(() => {
    if (defaultOpen && !wasDefaultOpen.current) {
      wasDefaultOpen.current = true;
      setOpen(true);
    }
  }, [defaultOpen]);

  const labCount = template.steps.filter((s) => s.kind === "lab").length;

  const commitReview = () => {
    const next = reviewDraft.trim();
    setEditingReview(false);
    if (!next || next === template.reviewCadence) return;
    onSetReviewCadence(next);
  };

  const commitTarget = () => {
    const next = targetDraft.trim();
    if (!next) return;
    onAddTarget(next);
    setTargetDraft("");
  };

  return (
    <div className={cx("k-card", "cpv-template", open && "cpv-template--open")}>
      <button
        type="button"
        className="cpv-template-head"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={() => setOpen((v) => !v)}
      >
        <span aria-hidden className="cpv-template-mark">
          <Icon size={20} variant="duotone" />
        </span>
        <span className="cpv-template-titles">
          <strong>{template.name}</strong>
          <span>{template.summary}</span>
        </span>
        <span aria-hidden className="cpv-template-chevron">
          <ChevronDownIcon size={16} variant="stroke" />
        </span>
      </button>

      <div className="cpv-template-meta">
        <Badge appearance="subtle" tone="info" icon={<FlaskIcon size={12} variant="stroke" />}>
          {labCount} monitoring labs
        </Badge>
        <Badge appearance="subtle" tone="neutral" icon={<CalendarIcon size={12} variant="stroke" />}>
          {template.reviewCadence}
        </Badge>
        {enrolledCount > 0 && (
          <Badge appearance="subtle" tone="success" icon={<UserIcon size={12} variant="stroke" />}>
            {enrolledCount} enrolled
          </Badge>
        )}
      </div>

      {open && (
        <div className="cpv-template-body" id={bodyId}>
          {/* Review cadence — inline editable */}
          <div className="cpv-review-row">
            <p className="cpv-mini-label cpv-mini-label--inline">Review cadence</p>
            {editingReview ? (
              <span className="cpv-review-edit">
                <Input
                  aria-label="Review cadence"
                  containerClassName="cpv-review-input"
                  value={reviewDraft}
                  autoFocus
                  onChange={(e) => setReviewDraft(e.currentTarget.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      commitReview();
                    }
                    if (e.key === "Escape") {
                      setReviewDraft(template.reviewCadence);
                      setEditingReview(false);
                    }
                  }}
                />
                <Button intent="primary" size="sm" onClick={commitReview}>
                  Save
                </Button>
                <Button
                  intent="secondary"
                  size="sm"
                  onClick={() => {
                    setReviewDraft(template.reviewCadence);
                    setEditingReview(false);
                  }}
                >
                  Cancel
                </Button>
              </span>
            ) : (
              <span className="cpv-review-view">
                <span className="cpv-review-value">{template.reviewCadence}</span>
                <button
                  type="button"
                  className="cpv-link"
                  onClick={() => {
                    setReviewDraft(template.reviewCadence);
                    setEditingReview(true);
                  }}
                >
                  Edit
                </button>
              </span>
            )}
          </div>

          {/* Clinical targets — chip list with add/remove */}
          <div className="cpv-target-block">
            <p className="cpv-mini-label">Clinical targets</p>
            {template.targets.length === 0 ? (
              <p className="cpv-template-nosteps">
                <NoteIcon size={14} variant="stroke" aria-hidden />
                No clinical targets set yet.
              </p>
            ) : (
              <ul className="cpv-target-chips">
                {template.targets.map((target) => (
                  <li key={target}>
                    <Chip
                      variant="removable"
                      onRemove={() => onRemoveTarget(target)}
                      leadingIcon={<CheckIcon size={12} variant="stroke" />}
                    >
                      {target}
                    </Chip>
                  </li>
                ))}
              </ul>
            )}
            <div className="cpv-target-add">
              <Input
                aria-label="Add a clinical target"
                containerClassName="cpv-target-input"
                placeholder="e.g. HbA1c < 7%"
                value={targetDraft}
                onChange={(e) => setTargetDraft(e.currentTarget.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    commitTarget();
                  }
                }}
              />
              <Button
                intent="outline"
                size="sm"
                disabled={!targetDraft.trim()}
                leadingIcon={<PlusIcon size={14} variant="stroke" />}
                onClick={commitTarget}
              >
                Add
              </Button>
            </div>
          </div>

          {/* Monitoring schedule — controlled step rows + add/remove */}
          <div className="cpv-step-block">
            <p className="cpv-mini-label">Monitoring schedule</p>
            {template.steps.length === 0 ? (
              <p className="cpv-template-nosteps">
                <NoteIcon size={14} variant="stroke" aria-hidden />
                No monitoring steps in this protocol yet — add one below.
              </p>
            ) : (
              <ul className="cpv-template-steps k-rows">
                {template.steps.map((step) => (
                  <TemplateStepRow
                    key={step.id}
                    step={step}
                    protocolName={template.name}
                    onUpdate={(patch) => onUpdateStep(step.id, patch)}
                    onRemove={() => onRemoveStep(step.id)}
                  />
                ))}
              </ul>
            )}

            {addingStep ? (
              <AddStepRow
                onCancel={() => setAddingStep(false)}
                onAdd={(step) => {
                  onAddStep(step);
                  setAddingStep(false);
                }}
              />
            ) : (
              <div className="cpv-addstep-row">
                <Button
                  intent="secondary"
                  size="sm"
                  leadingIcon={<PlusIcon size={14} variant="stroke" />}
                  onClick={() => setAddingStep(true)}
                >
                  Add step
                </Button>
              </div>
            )}
          </div>

          {/* Enrolment — connects template → active plan */}
          <div className="cpv-template-foot">
            <Button
              intent="primary"
              size="sm"
              leadingIcon={<PatientIcon size={14} variant="stroke" />}
              disabled={template.steps.length === 0}
              onClick={onEnroll}
            >
              Enrol patient
            </Button>
            {template.steps.length === 0 && (
              <span className="cpv-foot-hint">Add at least one step to enrol a patient.</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* A controlled template step row — cadence Select + inline label edit + remove.
   No own cadence state: it reads from `step` and writes through onUpdate. */
function TemplateStepRow({
  step,
  protocolName,
  onUpdate,
  onRemove,
}: {
  step: TemplateStep;
  protocolName: string;
  onUpdate: (patch: Partial<TemplateStep>) => void;
  onRemove: () => void;
}) {
  const [editingLabel, setEditingLabel] = useState(false);
  const [labelDraft, setLabelDraft] = useState(step.label);
  const StepIcon = STEP_ICON[step.kind];
  const caption = stepKindCaption(step.kind);

  const onCadenceChange = (next: string) => {
    if (next === step.cadence) return;
    if (isImplausible(step.kind, next)) {
      toast.error("A lab can't be run every visit", {
        description: "Pick a monitoring interval for a lab step.",
      });
      return;
    }
    onUpdate({ cadence: next });
    toast.success(`${step.label} cadence set to ${next.toLowerCase()}`, {
      description: `${protocolName} template`,
    });
  };

  const commitLabel = () => {
    const next = labelDraft.trim();
    setEditingLabel(false);
    if (!next || next === step.label) {
      setLabelDraft(step.label);
      return;
    }
    onUpdate({ label: next });
    toast.success("Step renamed", { description: next });
  };

  return (
    <li className="cpv-step-row">
      <span aria-hidden className="cpv-step-ic">
        <StepIcon size={15} variant="stroke" />
      </span>
      <span className="cpv-step-copy">
        {editingLabel ? (
          <span className="cpv-step-labeledit">
            <Input
              aria-label={`Rename ${step.label}`}
              containerClassName="cpv-step-labelinput"
              value={labelDraft}
              autoFocus
              onChange={(e) => setLabelDraft(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commitLabel();
                }
                if (e.key === "Escape") {
                  setLabelDraft(step.label);
                  setEditingLabel(false);
                }
              }}
              onBlur={commitLabel}
            />
          </span>
        ) : (
          <button
            type="button"
            className="cpv-step-labelbtn"
            onClick={() => {
              setLabelDraft(step.label);
              setEditingLabel(true);
            }}
          >
            <strong>{step.label}</strong>
            <EditIcon size={12} variant="stroke" aria-hidden />
          </button>
        )}
        {caption && <span className="cpv-step-kind">{caption}</span>}
      </span>
      <span className="cpv-step-cadence">
        <Select
          className="cpv-cadence-select"
          value={step.cadence}
          aria-label={`Cadence for ${step.label}`}
          containerClassName="cpv-cadence-selectfield"
          onChange={(e) => onCadenceChange(e.currentTarget.value)}
        >
          {CADENCE_OPTIONS.map((opt) => (
            <option
              key={opt}
              value={opt}
              disabled={isImplausible(step.kind, opt) && opt !== step.cadence}
            >
              {opt}
            </option>
          ))}
        </Select>
        <IconButton
          size="micro"
          variant="tertiary"
          tone="critical"
          aria-label={`Remove ${step.label}`}
          icon={<DeleteIcon size={15} variant="stroke" />}
          onClick={onRemove}
        />
      </span>
    </li>
  );
}

/* Inline "add step" row inside a template card. */
function AddStepRow({
  onCancel,
  onAdd,
}: {
  onCancel: () => void;
  onAdd: (step: Omit<TemplateStep, "id">) => void;
}) {
  const [kind, setKind] = useState<StepKind>("lab");
  const [label, setLabel] = useState("");
  const [cadence, setCadence] = useState("Every 3 months");
  const [touched, setTouched] = useState(false);

  const implausible = isImplausible(kind, cadence);
  const labelError = touched && !label.trim();

  const submit = () => {
    setTouched(true);
    if (!label.trim() || implausible) return;
    onAdd({ kind, label: label.trim(), cadence });
  };

  /* Switching to a lab while "Every visit" is selected nudges cadence to a
     sensible interval so we never commit an implausible default. */
  const changeKind = (next: StepKind) => {
    setKind(next);
    if (next === "lab" && cadence === "Every visit") setCadence("Every 3 months");
  };

  return (
    <div className="cpv-addstep">
      <div className="cpv-addstep-grid">
        <SegmentedToggle<StepKind>
          aria-label="Step kind"
          value={kind}
          onChange={changeKind}
          options={STEP_KIND_BUILDER}
        />
        <Input
          aria-label="Step label"
          placeholder="e.g. HbA1c"
          value={label}
          onChange={(e) => setLabel(e.currentTarget.value)}
          error={labelError ? "A step needs a label" : undefined}
        />
        <Select
          aria-label="Step cadence"
          value={cadence}
          containerClassName="cpv-addstep-cadence"
          error={implausible ? "Labs can't be every visit" : undefined}
          onChange={(e) => setCadence(e.currentTarget.value)}
        >
          {CADENCE_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </Select>
      </div>
      <div className="cpv-addstep-actions">
        <Button intent="secondary" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          intent="primary"
          size="sm"
          disabled={implausible}
          leadingIcon={<PlusIcon size={14} variant="stroke" />}
          onClick={submit}
        >
          Add step
        </Button>
      </div>
    </div>
  );
}

/* ----------------------------------------------- Create-protocol drawer ---- */

type DraftStep = { tempId: string; kind: StepKind; label: string; cadence: string };

let draftStepSeq = 0;
function nextDraftStepId(): string {
  draftStepSeq += 1;
  return `draft-step-${draftStepSeq}`;
}

function CreateProtocolDrawer({
  open,
  takenKeys,
  onClose,
  onCreate,
}: {
  open: boolean;
  takenKeys: Set<string>;
  onClose: () => void;
  onCreate: (template: ProtocolTemplate) => void;
}) {
  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="New protocol"
      subtitle="Author a monitoring schedule + targets"
      width={460}
    >
      {open && <CreateProtocolBody takenKeys={takenKeys} onClose={onClose} onCreate={onCreate} />}
    </Drawer>
  );
}

function CreateProtocolBody({
  takenKeys,
  onClose,
  onCreate,
}: {
  takenKeys: Set<string>;
  onClose: () => void;
  onCreate: (template: ProtocolTemplate) => void;
}) {
  const [name, setName] = useState("");
  const [area, setArea] = useState("");
  const [reviewCadence, setReviewCadence] = useState("Review every 3 months");
  const [targets, setTargets] = useState<string[]>([]);
  const [targetDraft, setTargetDraft] = useState("");
  const [steps, setSteps] = useState<DraftStep[]>([
    { tempId: nextDraftStepId(), kind: "lab", label: "", cadence: "Every 3 months" },
  ]);
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current);
  }, []);

  const nameError = touched && !name.trim();
  const noSteps = steps.length === 0;
  const anyEmptyStep = steps.some((s) => !s.label.trim());
  const anyImplausible = steps.some((s) => isImplausible(s.kind, s.cadence));
  const stepsError =
    touched && (noSteps || anyEmptyStep)
      ? noSteps
        ? "Add at least one step"
        : "Every step needs a label"
      : undefined;
  const canSubmit = Boolean(name.trim()) && !noSteps && !anyEmptyStep && !anyImplausible;

  const addTargetDraft = () => {
    const t = targetDraft.trim();
    if (!t || targets.includes(t)) {
      setTargetDraft("");
      return;
    }
    setTargets((prev) => [...prev, t]);
    setTargetDraft("");
  };

  const addDraftStep = () =>
    setSteps((prev) => [
      ...prev,
      { tempId: nextDraftStepId(), kind: "lab", label: "", cadence: "Every 3 months" },
    ]);

  const updateDraftStep = (tempId: string, patch: Partial<DraftStep>) =>
    setSteps((prev) =>
      prev.map((s) => {
        if (s.tempId !== tempId) return s;
        const merged = { ...s, ...patch };
        /* keep lab + every-visit from sneaking in via a kind switch */
        if (merged.kind === "lab" && merged.cadence === "Every visit") {
          merged.cadence = "Every 3 months";
        }
        return merged;
      }),
    );

  const removeDraftStep = (tempId: string) =>
    setSteps((prev) => prev.filter((s) => s.tempId !== tempId));

  const submit = () => {
    setTouched(true);
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    const key = uniqueId(slugify(name), takenKeys);
    const finalTargets =
      targetDraft.trim() && !targets.includes(targetDraft.trim())
        ? [...targets, targetDraft.trim()]
        : targets;
    const built: ProtocolTemplate = {
      key,
      /* New authored protocols use a neutral lab/flask mark — the four disease
         protocol icons are reserved for the seeded conditions. */
      protocol: "lipid",
      name: name.trim(),
      summary: area.trim() ? `${area.trim()} monitoring protocol.` : "Custom monitoring protocol.",
      targets: finalTargets,
      reviewCadence: reviewCadence.trim() || "Review every 3 months",
      steps: steps.map((s, i) => ({
        id: `${key}-${slugify(s.label)}-${i}`,
        kind: s.kind,
        label: s.label.trim(),
        cadence: s.cadence,
      })),
    };
    timer.current = window.setTimeout(() => {
      onCreate(built);
    }, 450);
  };

  return (
    <div className="cpv-drawer-body">
      <Input
        label="Protocol name"
        required
        placeholder="e.g. Heart failure"
        value={name}
        onChange={(e) => setName(e.currentTarget.value)}
        error={nameError ? "A protocol needs a name" : undefined}
      />
      <Input
        label="Specialty / area"
        placeholder="e.g. Cardiology"
        helpText="Optional — used in the protocol summary"
        value={area}
        onChange={(e) => setArea(e.currentTarget.value)}
      />
      <Input
        label="Review cadence"
        placeholder="e.g. Review every 3 months"
        value={reviewCadence}
        onChange={(e) => setReviewCadence(e.currentTarget.value)}
      />

      <div className="cpv-field">
        <span className="cpv-mini-label">Clinical targets</span>
        {targets.length > 0 && (
          <ul className="cpv-target-chips">
            {targets.map((t) => (
              <li key={t}>
                <Chip
                  variant="removable"
                  onRemove={() => setTargets((prev) => prev.filter((x) => x !== t))}
                  leadingIcon={<CheckIcon size={12} variant="stroke" />}
                >
                  {t}
                </Chip>
              </li>
            ))}
          </ul>
        )}
        <div className="cpv-target-add">
          <Input
            aria-label="Add a clinical target"
            containerClassName="cpv-target-input"
            placeholder="e.g. LDL-C < 1.8 mmol/L"
            value={targetDraft}
            onChange={(e) => setTargetDraft(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTargetDraft();
              }
            }}
          />
          <Button
            intent="outline"
            size="sm"
            disabled={!targetDraft.trim()}
            leadingIcon={<PlusIcon size={14} variant="stroke" />}
            onClick={addTargetDraft}
          >
            Add
          </Button>
        </div>
      </div>

      <div className="cpv-field">
        <span className="cpv-mini-label">Monitoring steps</span>
        {steps.length > 0 && (
          <ul className="cpv-builder-list">
            {steps.map((s, i) => {
              const implausible = isImplausible(s.kind, s.cadence);
              const empty = touched && !s.label.trim();
              return (
                <li className="cpv-builder-step" key={s.tempId}>
                  <SegmentedToggle<StepKind>
                    aria-label={`Kind for step ${i + 1}`}
                    value={s.kind}
                    onChange={(kind) => updateDraftStep(s.tempId, { kind })}
                    options={STEP_KIND_BUILDER}
                  />
                  <Input
                    aria-label={`Label for step ${i + 1}`}
                    placeholder="e.g. NT-proBNP"
                    value={s.label}
                    onChange={(e) => updateDraftStep(s.tempId, { label: e.currentTarget.value })}
                    error={empty ? "Required" : undefined}
                  />
                  <Select
                    aria-label={`Cadence for step ${i + 1}`}
                    value={s.cadence}
                    containerClassName="cpv-addstep-cadence"
                    error={implausible ? "Not for labs" : undefined}
                    onChange={(e) => updateDraftStep(s.tempId, { cadence: e.currentTarget.value })}
                  >
                    {CADENCE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </Select>
                  <IconButton
                    size="micro"
                    variant="tertiary"
                    tone="critical"
                    aria-label={`Remove step ${i + 1}`}
                    icon={<CloseIcon size={15} variant="stroke" />}
                    onClick={() => removeDraftStep(s.tempId)}
                  />
                </li>
              );
            })}
          </ul>
        )}
        {stepsError && (
          <p className="cpv-builder-error" role="alert">
            <WarningIcon size={12} variant="stroke" aria-hidden />
            {stepsError}
          </p>
        )}
        <Button
          intent="secondary"
          size="sm"
          leadingIcon={<PlusIcon size={14} variant="stroke" />}
          onClick={addDraftStep}
        >
          Add step
        </Button>
      </div>

      <div className="cpv-drawer-foot">
        <Button intent="secondary" size="sm" disabled={submitting} onClick={onClose}>
          Cancel
        </Button>
        <Button intent="primary" size="sm" loading={submitting} onClick={submit}>
          {submitting ? "Creating" : "Create protocol"}
        </Button>
      </div>
    </div>
  );
}

/* ----------------------------------------------------- Enrol drawer -------- */

function EnrollDrawer({
  template,
  onClose,
  isEnrolled,
  onEnroll,
}: {
  template: ProtocolTemplate | null;
  onClose: () => void;
  isEnrolled: (templateKey: string, patientName: string) => boolean;
  onEnroll: (patient: RosterPatient) => void;
}) {
  return (
    <Drawer
      open={template != null}
      onClose={onClose}
      title="Enrol patient"
      subtitle={template ? `Start a plan from ${template.name}` : undefined}
      width={440}
    >
      {template && (
        <EnrollBody key={template.key} template={template} isEnrolled={isEnrolled} onEnroll={onEnroll} />
      )}
    </Drawer>
  );
}

function EnrollBody({
  template,
  isEnrolled,
  onEnroll,
}: {
  template: ProtocolTemplate;
  isEnrolled: (templateKey: string, patientName: string) => boolean;
  onEnroll: (patient: RosterPatient) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const labCount = template.steps.filter((s) => s.kind === "lab").length;

  const selectedPatient = PATIENT_ROSTER.find((p) => p.name === selected) ?? null;
  const selectedAlready = selectedPatient ? isEnrolled(template.key, selectedPatient.name) : false;

  const confirm = () => {
    if (!selectedPatient) return;
    if (isEnrolled(template.key, selectedPatient.name)) {
      toast.error(`${selectedPatient.name} is already enrolled on ${template.name}`, {
        description: "Open the existing plan in Active plans.",
      });
      return;
    }
    onEnroll(selectedPatient);
  };

  return (
    <div className="cpv-drawer-body">
      <p className="cpv-drawer-note">
        The new plan derives its schedule from this protocol&apos;s current {template.steps.length}{" "}
        step{template.steps.length === 1 ? "" : "s"} ({labCount} monitoring lab
        {labCount === 1 ? "" : "s"}). Each step starts due, with no result yet.
      </p>

      <div className="cpv-field">
        <span className="cpv-mini-label">Choose a patient</span>
        <ul className="cpv-roster">
          {PATIENT_ROSTER.map((patient) => {
            const already = isEnrolled(template.key, patient.name);
            const active = selected === patient.name;
            return (
              <li key={patient.name}>
                <button
                  type="button"
                  className={cx(
                    "cpv-roster-row",
                    active && "cpv-roster-row--active",
                    already && "cpv-roster-row--disabled",
                  )}
                  aria-pressed={active}
                  disabled={already}
                  onClick={() => setSelected(patient.name)}
                >
                  <Avatar initials={patient.initials} name={patient.name} size="sm" />
                  <span className="cpv-roster-id">
                    <strong>{patient.name}</strong>
                    <small>{patient.meta}</small>
                  </span>
                  {already ? (
                    <Badge appearance="subtle" tone="success" icon={<CheckCircleIcon size={11} variant="stroke" />}>
                      Already enrolled
                    </Badge>
                  ) : active ? (
                    <span aria-hidden className="cpv-roster-check cpv-tone-success">
                      <CheckCircleIcon size={18} variant="stroke" />
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {selectedAlready && (
        <p className="cpv-builder-error" role="alert">
          <WarningIcon size={12} variant="stroke" aria-hidden />
          That patient is already on this protocol — pick another.
        </p>
      )}

      <div className="cpv-drawer-foot">
        <Button
          intent="primary"
          size="sm"
          disabled={!selectedPatient || selectedAlready}
          leadingIcon={<PatientIcon size={14} variant="stroke" />}
          onClick={confirm}
        >
          Start plan
        </Button>
      </div>
    </div>
  );
}

/* ----------------------------------------------------- Area B: active ------ */

type FilterKey = "all" | "danger" | "warning" | "success";

function ActivePlansArea({
  roster,
  setRoster,
  planSteps,
  setPlanSteps,
  focusPlanId,
  clearFocus,
  onGoToLibrary,
}: {
  roster: ActivePlan[];
  setRoster: React.Dispatch<React.SetStateAction<ActivePlan[]>>;
  planSteps: Record<string, PlanStep[]>;
  setPlanSteps: React.Dispatch<React.SetStateAction<Record<string, PlanStep[]>>>;
  focusPlanId: string | null;
  clearFocus: () => void;
  onGoToLibrary: () => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(ACTIVE_PLANS[0]?.id ?? null);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [scheduleFor, setScheduleFor] = useState<{ planId: string; step: PlanStep } | null>(null);
  /* Per-step async state, keyed by `${planId}:${stepId}`. */
  const [ordering, setOrdering] = useState<Set<string>>(new Set());
  const [ordered, setOrdered] = useState<Set<string>>(new Set());
  const [marking, setMarking] = useState<Set<string>>(new Set());
  const [applying, setApplying] = useState(false);
  const timers = useRef<number[]>([]);
  const cardRefs = useRef<Record<string, HTMLLIElement | null>>({});

  useEffect(() => {
    const list = timers.current;
    return () => list.forEach((t) => window.clearTimeout(t));
  }, []);

  /* A freshly-enrolled plan: clear any filter that would hide it, expand it, and
     scroll it into view so the cross-tab action visibly lands in the roster. The
     state writes + scroll are deferred to a timer callback (not run synchronously
     in the effect body) so a cross-tab enrolment lands without cascading renders. */
  useEffect(() => {
    if (!focusPlanId) return;
    const id = focusPlanId;
    const t = window.setTimeout(() => {
      setFilter("all");
      setExpanded(id);
      cardRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "center" });
      clearFocus();
    }, 60);
    timers.current.push(t);
    return () => window.clearTimeout(t);
  }, [focusPlanId, clearFocus]);

  const plans = useMemo(
    () =>
      roster.map((plan) => {
        const steps = planSteps[plan.id] ?? plan.steps;
        return { ...plan, steps, adherence: adherenceOf(steps) };
      }),
    [planSteps, roster],
  );

  const counts = useMemo(() => {
    const c = { all: plans.length, danger: 0, warning: 0, success: 0 };
    for (const p of plans) c[p.adherence.tone] += 1;
    return c;
  }, [plans]);

  const visible = filter === "all" ? plans : plans.filter((p) => p.adherence.tone === filter);

  const STATUS_RANK: Record<AdherenceTone, number> = { danger: 0, warning: 1, success: 2 };
  const queuePlans = [...visible].sort(
    (a, b) => STATUS_RANK[a.adherence.tone] - STATUS_RANK[b.adherence.tone],
  );
  const selectedPlan = queuePlans.find((p) => p.id === expanded) ?? queuePlans[0] ?? null;

  /* Changing the filter drops an expansion that's no longer visible, so a
     re-appearing plan isn't unexpectedly left open. */
  const changeFilter = (next: FilterKey) => {
    setFilter(next);
    if (expanded) {
      const stillVisible =
        next === "all" || plans.some((p) => p.id === expanded && p.adherence.tone === next);
      if (!stillVisible) setExpanded(null);
    }
  };

  const key = (planId: string, stepId: string) => `${planId}:${stepId}`;

  const markDone = (planId: string, step: PlanStep) => {
    const k = key(planId, step.id);
    const prevStep = step;
    setMarking((m) => new Set(m).add(k));
    const t = window.setTimeout(() => {
      const nextDue = advanceFromToday(step.cadence);
      setPlanSteps((prev) => {
        const steps = (prev[planId] ?? []).map((s) =>
          s.id === step.id
            ? {
                ...s,
                state: "scheduled" as PlanStepState,
                nextDue,
                last: s.last ? { ...s.last, date: TODAY_LABEL } : s.last,
                justCompleted: true,
              }
            : s,
        );
        return { ...prev, [planId]: steps };
      });
      setMarking((m) => {
        const n = new Set(m);
        n.delete(k);
        return n;
      });
      toast.success(`${prevStep.label} completed`, {
        description: `Next due ${nextDue}`,
        action: {
          label: "Undo",
          onClick: () =>
            setPlanSteps((prev) => {
              const steps = (prev[planId] ?? []).map((s) =>
                s.id === step.id ? { ...prevStep, justCompleted: false } : s,
              );
              return { ...prev, [planId]: steps };
            }),
        },
      });
    }, 500);
    timers.current.push(t);
  };

  const orderLab = (plan: { id: string; patient: string }, step: PlanStep) => {
    const k = key(plan.id, step.id);
    setOrdering((o) => new Set(o).add(k));
    const t = window.setTimeout(() => {
      setOrdering((o) => {
        const n = new Set(o);
        n.delete(k);
        return n;
      });
      setOrdered((o) => new Set(o).add(k));
      /* Ordering clears the gap — the sample is now awaited. */
      setPlanSteps((prev) => {
        const steps = (prev[plan.id] ?? []).map((s) =>
          s.id === step.id ? { ...s, state: "scheduled" as PlanStepState } : s,
        );
        return { ...prev, [plan.id]: steps };
      });
      toast.success(`${step.label} added to a new order`, {
        description: `${plan.patient} · review and confirm in the order flow`,
      });
    }, 700);
    timers.current.push(t);
  };

  const applySchedule = (planId: string, stepId: string, cadence: string, nextDue: string) => {
    setApplying(true);
    const t = window.setTimeout(() => {
      setPlanSteps((prev) => {
        const steps = (prev[planId] ?? []).map((s) =>
          s.id === stepId
            ? {
                ...s,
                cadence,
                nextDue,
                state:
                  s.state === "overdue" || s.state === "due"
                    ? ("scheduled" as PlanStepState)
                    : s.state,
                justCompleted: false,
              }
            : s,
        );
        return { ...prev, [planId]: steps };
      });
      setApplying(false);
      setScheduleFor(null);
      toast.success("Schedule adjusted", { description: `${cadence} · next due ${nextDue}` });
    }, 500);
    timers.current.push(t);
  };

  return (
    <section className="cpv-section cpv-active" aria-label="Active plans">
      <div className="cpv-section-head cpv-active-head">
        <div className="cpv-section-headrow">
          <div>
            <p className="k-section-label cpv-group-label">
              Active plans
              <Badge appearance="subtle" className="cpv-count" tone="neutral">
                {plans.length}
              </Badge>
            </p>
            <p className="cpv-section-sub">
              Worst-first roster, selected plan detail, and one context rail for the next safe action.
            </p>
          </div>
          {roster.length > 0 && (
            <Button
              intent="ghost"
              size="sm"
              onClick={() => {
                setExpanded(null);
                setScheduleFor(null);
                setFilter("all");
                setRoster([]);
              }}
            >
              Clear roster
            </Button>
          )}
        </div>
        {roster.length > 0 && (
          <div className="cpv-filterbar" role="group" aria-label="Filter by adherence">
            <FilterChip active={filter === "all"} onClick={() => changeFilter("all")} tone="neutral" label="All" count={counts.all} />
            <FilterChip active={filter === "danger"} onClick={() => changeFilter("danger")} tone="danger" label="Overdue" count={counts.danger} />
            <FilterChip active={filter === "warning"} onClick={() => changeFilter("warning")} tone="warning" label="Gap due" count={counts.warning} />
            <FilterChip active={filter === "success"} onClick={() => changeFilter("success")} tone="success" label="On track" count={counts.success} />
          </div>
        )}
      </div>

      {roster.length === 0 ? (
        <EmptyState
          icon={UserIcon}
          message="No patients enrolled on a care plan yet. Enrol one from a protocol template."
          cta={{
            label: "Go to templates",
            icon: NoteIcon,
            onClick: onGoToLibrary,
          }}
        />
      ) : (
        visible.length === 0 ? (
          <FilteredEmpty filter={filter} />
        ) : (
          <div className="cpv-workspace">
            <aside className="cpv-queue-panel" aria-label="Care plan roster">
              <div className="cpv-queue-head">
                <div>
                  <p className="cpv-mini-label">Roster</p>
                  <strong>{queuePlans.length} shown</strong>
                </div>
                {filter !== "all" && (
                  <Button intent="ghost" size="sm" onClick={() => changeFilter("all")}>
                    Show all
                  </Button>
                )}
              </div>
              <ul className="cpv-queue-list">{queuePlans.map((plan) => renderQueueItem(plan))}</ul>
            </aside>

            <div className="cpv-detail-panel">
              {selectedPlan ? renderPlanCard(selectedPlan) : <FilteredEmpty filter={filter} />}
            </div>

            {selectedPlan && renderContextRail(selectedPlan)}
          </div>
        )
      )}

      <ScheduleDrawer
        target={scheduleFor}
        applying={applying}
        onClose={() => {
          if (!applying) setScheduleFor(null);
        }}
        onApply={applySchedule}
      />
    </section>
  );

  function renderQueueItem(plan: PlanView) {
    const AdhIcon = ADHERENCE_ICON[plan.adherence.tone];
    const ProtoIcon = PROTOCOL_ICON[plan.protocol];
    const nextStep = nextActionStep(plan.steps);
    const isSelected = selectedPlan?.id === plan.id;
    const gaps = careGapCount(plan.steps);

    return (
      <li
        className="cpv-queue-item"
        key={plan.id}
        ref={(el) => {
          cardRefs.current[plan.id] = el;
        }}
      >
        <button
          type="button"
          className={cx(
            "cpv-queue-row",
            `cpv-queue-row--${plan.adherence.tone}`,
            isSelected && "cpv-queue-row--active",
          )}
          aria-current={isSelected ? "true" : undefined}
          onClick={() => setExpanded(plan.id)}
        >
          <span className="cpv-queue-primary">
            <Avatar initials={plan.initials} name={plan.patient} size="sm" />
            <span className="cpv-queue-id">
              <strong>{plan.patient}</strong>
              <small>{plan.patientMeta}</small>
            </span>
          </span>
          <span className="cpv-queue-proto">
            <span aria-hidden className="cpv-queue-proto-ic">
              <ProtoIcon size={13} variant="stroke" />
            </span>
            <span>{plan.protocolName}</span>
          </span>
          <span className="cpv-queue-status">
            <Badge
              appearance="subtle"
              tone={plan.adherence.tone}
              icon={<AdhIcon size={12} variant="stroke" />}
            >
              {plan.adherence.label}
            </Badge>
            <span>{openStepCount(plan.steps)} open</span>
          </span>
          {nextStep && (
            <span className="cpv-queue-next">
              Next: {nextStep.label} · {STEP_STATE_LABEL[nextStep.state].toLowerCase()} {nextStep.nextDue}
            </span>
          )}
          {gaps > 0 && <span className="cpv-queue-gap">{gaps} gap{gaps === 1 ? "" : "s"}</span>}
        </button>
      </li>
    );
  }

  function renderContextRail(plan: PlanView) {
    const nextStep = nextActionStep(plan.steps);
    const dueSteps = plan.steps.filter((s) => s.state === "due" || s.state === "overdue");
    const nextTone = nextStep ? STEP_STATE_TONE[nextStep.state] : "success";
    const NextIcon = nextStep ? TONE_ICON[nextTone] : CheckCircleIcon;
    const nextKey = nextStep ? key(plan.id, nextStep.id) : "";
    const nextActionable = nextStep?.state === "due" || nextStep?.state === "overdue";
    const nextIsOrdered = nextStep ? ordered.has(nextKey) : false;
    const nextIsOrdering = nextStep ? ordering.has(nextKey) : false;
    const nextIsMarking = nextStep ? marking.has(nextKey) : false;

    return (
      <aside className="cpv-context-rail" aria-label={`${plan.patient} care plan context`}>
        <section className={cx("cpv-rail-panel", nextActionable && "cpv-rail-panel--attention")}>
          <p className="cpv-mini-label">Next action</p>
          {nextStep ? (
            <>
              <div className="cpv-rail-next">
                <span aria-hidden className={cx("cpv-rail-next-ic", `cpv-tone-${nextTone}`)}>
                  <NextIcon size={16} variant="stroke" />
                </span>
                <span>
                  <strong>{nextStep.label}</strong>
                  <small>
                    {STEP_STATE_LABEL[nextStep.state]} · {nextStep.nextDue}
                  </small>
                </span>
              </div>
              <p className="cpv-rail-copy">
                {dueSteps.length > 0
                  ? `${dueSteps.length} open gap${dueSteps.length === 1 ? "" : "s"} need follow-up.`
                  : `No care gap. Next scheduled step is ${nextStep.nextDue}.`}
              </p>
              <div className="cpv-rail-actions">
                {nextIsOrdered ? (
                  <span className="cpv-pstep-muted">Ordered · awaiting sample</span>
                ) : (
                  <>
                    {nextStep.kind === "lab" && nextActionable && (
                      <Button
                        intent="primary"
                        size="sm"
                        loading={nextIsOrdering}
                        leadingIcon={<FlaskIcon size={14} variant="stroke" />}
                        onClick={() => orderLab(plan, nextStep)}
                      >
                        {nextIsOrdering ? "Ordering" : "Order due lab"}
                      </Button>
                    )}
                    <Button
                      intent="outline"
                      size="sm"
                      loading={nextIsMarking}
                      leadingIcon={<CheckIcon size={14} variant="stroke" />}
                      onClick={() => markDone(plan.id, nextStep)}
                    >
                      {nextIsMarking ? "Saving" : "Mark done"}
                    </Button>
                  </>
                )}
              </div>
            </>
          ) : (
            <p className="cpv-rail-copy">All steps are complete.</p>
          )}
        </section>

        <section className="cpv-rail-panel">
          <p className="cpv-mini-label">Plan facts</p>
          <dl className="cpv-rail-facts">
            <div>
              <dt>Protocol</dt>
              <dd>{plan.protocolName}</dd>
            </div>
            <div>
              <dt>Enrolled</dt>
              <dd>{plan.enrolled}</dd>
            </div>
            <div>
              <dt>Next review</dt>
              <dd>{plan.nextReview}</dd>
            </div>
            <div>
              <dt>Open steps</dt>
              <dd>
                {openStepCount(plan.steps)} of {plan.steps.length}
              </dd>
            </div>
          </dl>
        </section>

        <section className="cpv-rail-panel">
          <p className="cpv-mini-label">Safety boundary</p>
          <p className="cpv-rail-copy">
            Coordinates cadence, orders, and follow-up ownership. Result interpretation stays in the patient chart
            with provenance visible.
          </p>
        </section>
      </aside>
    );
  }

  /* Render the selected plan as a stable detail panel. Kept as an inner closure
     so it retains access to handlers and transient ordering/marking sets. */
  function renderPlanCard(plan: PlanView) {
    const AdhIcon = ADHERENCE_ICON[plan.adherence.tone];
    const ProtoIcon = PROTOCOL_ICON[plan.protocol];
    const openCount = openStepCount(plan.steps);
    const hasGap = careGapCount(plan.steps) > 0;

    return (
      <article
        className={cx("k-card", "k-card--flush", "cpv-plan", "cpv-plan--detail", `cpv-plan--${plan.adherence.tone}`)}
        aria-labelledby={`cpv-plan-title-${plan.id}`}
      >
        <div className="cpv-plan-head cpv-plan-head--static">
          <Avatar initials={plan.initials} name={plan.patient} size="sm" />
          <span className="cpv-plan-id">
            <strong id={`cpv-plan-title-${plan.id}`}>{plan.patient}</strong>
            <small>{plan.patientMeta}</small>
          </span>
          <span className="cpv-plan-proto">
            <ProtoIcon size={14} variant="stroke" aria-hidden />
            {plan.protocolName}
          </span>
          <Badge
            appearance="subtle"
            tone={plan.adherence.tone}
            icon={<AdhIcon size={12} variant="stroke" />}
          >
            {plan.adherence.label}
          </Badge>
        </div>

        <div className="cpv-plan-body">
          <div className="cpv-plan-facts">
            <span>
              <small>Enrolled</small>
              <strong>{plan.enrolled}</strong>
            </span>
            <span>
              <small>Next review</small>
              <strong>{plan.nextReview}</strong>
            </span>
            <span>
              <small>Open steps</small>
              <strong>{openCount} of {plan.steps.length}</strong>
            </span>
            {plan.templateName && (
              <span>
                <small>From template</small>
                <strong>{plan.templateName}</strong>
              </span>
            )}
          </div>

          {!hasGap && (
            <p className="cpv-plan-allclear">
              <CheckCircleIcon size={14} variant="stroke" aria-hidden />
              All monitoring up to date. Next review {plan.nextReview}.
            </p>
          )}

          <ul className="cpv-plan-steps">
            {plan.steps.map((step) => {
              const stTone = STEP_STATE_TONE[step.state];
              const StIcon = TONE_ICON[stTone];
              const actionable = step.state === "due" || step.state === "overdue";
              const k = key(plan.id, step.id);
              const isOrdering = ordering.has(k);
              const isOrdered = ordered.has(k);
              const isMarking = marking.has(k);
              return (
                <li className={cx("cpv-pstep", `cpv-pstep--${stTone}`)} key={step.id}>
                  <span aria-hidden className={cx("cpv-pstep-ic", `cpv-tone-${stTone}`)}>
                    <StIcon size={15} variant="stroke" />
                  </span>
                  <span className="cpv-pstep-main">
                    <span className="cpv-pstep-top">
                      <strong>{step.label}</strong>
                      <Badge appearance="subtle" tone={stTone} icon={<StIcon size={11} variant="stroke" />}>
                        {STEP_STATE_LABEL[step.state]}
                      </Badge>
                      {isOrdered && (
                        <Badge appearance="subtle" tone="info" icon={<FlaskIcon size={11} variant="stroke" />}>
                          Lab ordered
                        </Badge>
                      )}
                      {step.justCompleted && (
                        <Badge appearance="subtle" tone="success" icon={<CheckCircleIcon size={11} variant="stroke" />}>
                          Completed
                        </Badge>
                      )}
                    </span>
                    <span className="cpv-pstep-meta">
                      {step.cadence} · next due {step.nextDue}
                    </span>
                    {step.last ? (
                      <span className="cpv-pstep-last">
                        <span className="cpv-pstep-result">
                          <DirArrow dir={step.last.dir} />
                          {step.last.value}
                        </span>
                        <span className="cpv-pstep-prov">
                          {step.last.date} · {step.last.source}
                        </span>
                      </span>
                    ) : (
                      <span className="cpv-pstep-noresult">No result yet — first cycle of this plan.</span>
                    )}
                  </span>
                  <span className="cpv-pstep-actions">
                    {isOrdered ? (
                      <span className="cpv-pstep-muted">Ordered · awaiting sample</span>
                    ) : (
                      <>
                        {step.kind === "lab" && actionable && (
                          <Button
                            intent="secondary"
                            size="sm"
                            loading={isOrdering}
                            leadingIcon={<FlaskIcon size={14} variant="stroke" />}
                            onClick={() => orderLab(plan, step)}
                          >
                            {isOrdering ? "Ordering" : "Order due lab"}
                          </Button>
                        )}
                        <Button
                          intent="outline"
                          size="sm"
                          loading={isMarking}
                          leadingIcon={<CheckIcon size={14} variant="stroke" />}
                          onClick={() => markDone(plan.id, step)}
                        >
                          {isMarking ? "Saving" : "Mark done"}
                        </Button>
                        <IconButton
                          size="micro"
                          variant="tertiary"
                          aria-label={`Adjust schedule for ${step.label}`}
                          icon={<CalendarIcon size={15} variant="stroke" />}
                          onClick={() => setScheduleFor({ planId: plan.id, step })}
                        />
                      </>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>

          <div className="cpv-plan-foot">
            <Button
              intent="secondary"
              size="sm"
              trailingIcon={<ChevronRightIcon size={14} variant="stroke" />}
              onClick={() =>
                toast(`Open ${plan.patient}'s chart`, {
                  description: "Opens the care plan tab in the chart for per-patient detail",
                })
              }
            >
              Open chart
            </Button>
          </div>
        </div>
      </article>
    );
  }
}

function FilteredEmpty({ filter }: { filter: FilterKey }) {
  if (filter === "danger") {
    return (
      <div className="cpv-empty cpv-empty--success">
        <span aria-hidden className="cpv-empty-ic cpv-tone-success">
          <CheckCircleIcon size={18} variant="stroke" />
        </span>
        <span className="cpv-empty-copy">No overdue plans — no care gaps right now.</span>
      </div>
    );
  }
  const label = filter === "warning" ? "with a due gap" : "on track";
  return (
    <div className="cpv-empty cpv-empty--neutral">
      <span aria-hidden className="cpv-empty-ic cpv-tone-neutral">
        <CalendarIcon size={18} variant="stroke" />
      </span>
      <span className="cpv-empty-copy">No plans {label} right now.</span>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  tone,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  tone: Tone;
  label: string;
  count: number;
}) {
  const Icon = tone === "neutral" ? CalendarIcon : TONE_ICON[tone];
  return (
    <button
      type="button"
      className={cx("cpv-filter", `cpv-filter--${tone}`, active && "cpv-filter--active")}
      aria-pressed={active}
      onClick={onClick}
    >
      {tone !== "neutral" && <Icon size={13} variant="stroke" aria-hidden />}
      {label}
      <span className="cpv-filter-count">{count}</span>
    </button>
  );
}

/* Adjust-schedule drawer — pick a cadence and a next-due date; applying clears
   the gap (overdue/due → scheduled) and recomputes adherence. */
const NEXT_DUE_OPTIONS = ["Next visit", "In 1 month", "In 3 months", "In 6 months", "In 12 months"];

/* Seed a sensible relative next-due from the step's cadence so the default
   reflects the targeted step, not a hardcoded constant. */
function seedNextDue(cadence: string): string {
  switch (cadence) {
    case "Every visit":
      return "Next visit";
    case "Every 3 months":
      return "In 3 months";
    case "Every 6 months":
      return "In 6 months";
    case "Every 12 months":
      return "In 12 months";
    default:
      return "In 3 months";
  }
}

function ScheduleDrawer({
  target,
  applying,
  onClose,
  onApply,
}: {
  target: { planId: string; step: PlanStep } | null;
  applying: boolean;
  onClose: () => void;
  onApply: (planId: string, stepId: string, cadence: string, nextDue: string) => void;
}) {
  const step = target?.step;
  return (
    <Drawer
      open={target != null}
      onClose={onClose}
      title="Adjust schedule"
      subtitle={step ? step.label : undefined}
      width={420}
    >
      {target && (
        /* Keyed by step id so the form remounts with fresh state seeded from the
           targeted step. The wrapper stays mounted across opens (only the
           Drawer's children unmount), so without a remount the previous step's
           cadence/next-due would leak in and be written on apply. */
        <ScheduleDrawerBody key={target.step.id} target={target} applying={applying} onClose={onClose} onApply={onApply} />
      )}
    </Drawer>
  );
}

function ScheduleDrawerBody({
  target,
  applying,
  onClose,
  onApply,
}: {
  target: { planId: string; step: PlanStep };
  applying: boolean;
  onClose: () => void;
  onApply: (planId: string, stepId: string, cadence: string, nextDue: string) => void;
}) {
  const { step } = target;
  const [cadence, setCadence] = useState(step.cadence);
  const [nextDue, setNextDue] = useState(() => seedNextDue(step.cadence));
  const radioRefs = useRef<(HTMLButtonElement | null)[]>([]);

  /* Roving radiogroup: arrow keys move selection + focus. */
  const onRadioKey = (e: React.KeyboardEvent, idx: number) => {
    if (e.key === "ArrowDown" || e.key === "ArrowRight") {
      e.preventDefault();
      const next = (idx + 1) % NEXT_DUE_OPTIONS.length;
      setNextDue(NEXT_DUE_OPTIONS[next]);
      radioRefs.current[next]?.focus();
    } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
      e.preventDefault();
      const prev = (idx - 1 + NEXT_DUE_OPTIONS.length) % NEXT_DUE_OPTIONS.length;
      setNextDue(NEXT_DUE_OPTIONS[prev]);
      radioRefs.current[prev]?.focus();
    }
  };

  return (
    <div className="cpv-drawer-body">
      <p className="cpv-drawer-note">
        Adjusting the schedule clears the current gap and sets when this step is next due. The last
        result and its provenance are untouched.
      </p>

      {step.last && (
        <div className="cpv-drawer-last">
          <p className="cpv-mini-label">Last result</p>
          <span className="cpv-pstep-result">
            <DirArrow dir={step.last.dir} />
            {step.last.value}
          </span>
          <span className="cpv-pstep-prov">
            {step.last.date} · {step.last.source}
          </span>
        </div>
      )}

      <div className="cpv-field">
        <span className="cpv-mini-label">Monitoring cadence</span>
        <SegmentedToggle
          aria-label="Monitoring cadence"
          value={cadence}
          onChange={setCadence}
          options={CADENCE_OPTIONS.map((c) => ({ label: c.replace("Every ", ""), value: c }))}
        />
      </div>

      <div className="cpv-field">
        <span className="cpv-mini-label" id="cpv-nextdue-label">Next due</span>
        <div className="cpv-radio-list" role="radiogroup" aria-labelledby="cpv-nextdue-label">
          {NEXT_DUE_OPTIONS.map((opt, idx) => {
            const checked = nextDue === opt;
            return (
              <button
                key={opt}
                type="button"
                ref={(el) => {
                  radioRefs.current[idx] = el;
                }}
                role="radio"
                aria-checked={checked}
                tabIndex={checked ? 0 : -1}
                className={cx("cpv-radio", checked && "cpv-radio--active")}
                onKeyDown={(e) => onRadioKey(e, idx)}
                onClick={() => setNextDue(opt)}
              >
                <span aria-hidden className="cpv-radio-dot" />
                {opt}
              </button>
            );
          })}
        </div>
      </div>

      <div className="cpv-drawer-foot">
        <Button intent="secondary" size="sm" onClick={onClose} disabled={applying}>
          Cancel
        </Button>
        <Button
          intent="primary"
          size="sm"
          loading={applying}
          onClick={() => onApply(target.planId, step.id, cadence, nextDue)}
        >
          {applying ? "Applying" : "Apply schedule"}
        </Button>
      </div>
    </div>
  );
}

export default CarePlansView;
