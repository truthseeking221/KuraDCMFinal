"use client";

/* =============================================================================
   Care Plan — data model + in-session store (frontend prototype).

   A Care Plan is a longitudinal *care-coordination contract*, NOT a note, order,
   appointment, prescription, problem list, or task board. The minimal-but-correct
   spine is:

     Clinical focus → Goal → Intervention → Owner → Due date → Evidence → Review → Version

   Patient Detail holds MANY plans (episodes), grouped by status. Mutations create
   new versions + append history; clinical data is never destroyed (entered_in_error
   / superseded instead). No backend — a module store keyed by patientId, surviving
   tab mount/unmount within the session. Seeds are deterministic (fixed dates) so
   SSR and first client render match.
   ============================================================================= */

import { useCallback, useSyncExternalStore } from "react";

export type Tone = "danger" | "warning" | "info" | "success" | "neutral";

export type CarePlanStatus =
  | "draft"
  | "proposed"
  | "active"
  | "on_hold"
  | "completed"
  | "discontinued"
  | "entered_in_error";

/* Goals carry TWO independent statuses (a goal can be Active but At risk). */
export type GoalLifecycle = "planned" | "active" | "completed" | "cancelled";
export type GoalAchievement =
  | "on_track"
  | "at_risk"
  | "improving"
  | "unchanged"
  | "worsening"
  | "achieved"
  | "partially_achieved"
  | "not_achieved"
  | "not_assessable";

export type GoalType =
  | "quantitative"
  | "milestone"
  | "maintenance"
  | "avoidance"
  | "functional"
  | "patient_stated"
  | "narrative";

export type InterventionKind =
  | "monitoring"
  | "lab"
  | "imaging"
  | "consultation"
  | "referral"
  | "education"
  | "lifestyle"
  | "medication_review"
  | "procedure"
  | "home_measurement"
  | "follow_up"
  | "insurance";

/* Operational state of an intervention — kept separate from clinical assessment.
   "overdue"/"blocked"/"declined" are operational, never a clinical failure. */
export type InterventionStatus =
  | "planned"
  | "due"
  | "in_progress"
  | "overdue"
  | "completed"
  | "blocked"
  | "declined";

export type AgreementState =
  | "not_shared"
  | "shared"
  | "viewed"
  | "discussed"
  | "agreed"
  | "partially_agreed"
  | "declined";

export type ClinicalFocus = {
  id: string;
  label: string;
  coded?: string; // ICD-10 etc.
  status?: string; // e.g. "Suboptimal control"
  evidence?: string; // supporting evidence line
  reason?: string; // why it's in the plan
};

export type Goal = {
  id: string;
  label: string;
  type: GoalType;
  baseline?: string;
  target?: string;
  unit?: string;
  latest?: string; // latest measured value
  latestDate?: string;
  trendKey?: string; // links to a deltaLabFacts analyte for the spine sparkline
  targetDate?: string;
  owner?: string;
  lifecycle: GoalLifecycle;
  achievement: GoalAchievement;
  priority?: boolean;
  source?: string; // measurement source / provenance
};

/* Execution backlink — written when an intervention spawns a real object so the
   result can be traced back to the goal it served. */
export type ExecutionLink = {
  kind: "order" | "appointment" | "referral" | "rx";
  ref?: string;
  placedAt?: string;
};

export type Intervention = {
  id: string;
  kind: InterventionKind;
  label: string;
  detail?: string;
  goalId?: string;
  focusId?: string;
  owner: string;
  due?: string;
  frequency?: string;
  precondition?: string;
  status: InterventionStatus;
  agreement?: AgreementState;
  blockReason?: string; // when status === "blocked" (e.g. coverage)
  declineReason?: string; // when status === "declined" — specific, never "noncompliant"
  coverage?: "covered" | "partial" | "preauth" | "denied" | "self_pay" | "unknown";
  /* Seed for the order deep-link — tests + clinical rationale. Creating an order
     never auto-bills; the doctor confirms catalog items in the order flow. */
  order?: { labKeys: string[]; rationale: string };
  /* Backlink once executed. */
  execution?: ExecutionLink;
};

export type MonitoringRule = {
  id: string;
  label: string;
  trendKey?: string;
  baseline?: string;
  target?: string;
  unit?: string;
  frequency?: string;
  latest?: string;
  latestDate?: string;
  source?: string;
  alert?: string; // alert threshold note
};

export type Review = {
  id: string;
  date: string;
  reviewer: string;
  assessment: string;
  changes?: string;
  version: number;
};

export type CareTeam = {
  responsible: string; // responsible clinician
  author: string;
  reviewer?: string;
  nurse?: string;
  coordinator?: string;
  patient?: string;
  external?: string;
};

export type HistoryEntry = {
  id: string;
  at: string;
  actor: string;
  event: string;
  detail?: string;
};

export type CarePlan = {
  id: string;
  patientId: string;
  title: string;
  type?: string;
  rationale: string;
  primary?: boolean;
  status: CarePlanStatus;
  priority?: Tone;
  focuses: ClinicalFocus[];
  goals: Goal[];
  interventions: Intervention[];
  monitoring: MonitoringRule[];
  reviews: Review[];
  team: CareTeam;
  startDate?: string;
  expectedEnd?: string;
  nextReview?: string;
  lastReviewedBy?: string;
  lastReviewedAt?: string;
  version: number;
  source: string; // e.g. "Consultation · 9 May 2026"
  agreement: AgreementState;
  /* On-hold / discontinuation context. */
  holdReason?: string;
  resumeCondition?: string;
  completionOutcome?: string;
  createdAt: string;
  history: HistoryEntry[];
};

/* ----------------------------- display helpers ----------------------------- */

export const PLAN_STATUS_LABEL: Record<CarePlanStatus, string> = {
  draft: "Draft",
  proposed: "Proposed",
  active: "Active",
  on_hold: "On hold",
  completed: "Completed",
  discontinued: "Discontinued",
  entered_in_error: "Entered in error",
};

export const PLAN_STATUS_TONE: Record<CarePlanStatus, Tone> = {
  draft: "neutral",
  proposed: "info",
  active: "success",
  on_hold: "warning",
  completed: "neutral",
  discontinued: "neutral",
  entered_in_error: "danger",
};

export const ACHIEVEMENT_LABEL: Record<GoalAchievement, string> = {
  on_track: "On track",
  at_risk: "At risk",
  improving: "Improving",
  unchanged: "Unchanged",
  worsening: "Worsening",
  achieved: "Achieved",
  partially_achieved: "Partially achieved",
  not_achieved: "Not achieved",
  not_assessable: "Not assessable",
};

export const ACHIEVEMENT_TONE: Record<GoalAchievement, Tone> = {
  on_track: "success",
  at_risk: "warning",
  improving: "info",
  unchanged: "neutral",
  worsening: "danger",
  achieved: "success",
  partially_achieved: "warning",
  not_achieved: "danger",
  not_assessable: "neutral",
};

export const INTERVENTION_STATUS_LABEL: Record<InterventionStatus, string> = {
  planned: "Planned",
  due: "Due",
  in_progress: "In progress",
  overdue: "Overdue",
  completed: "Completed",
  blocked: "Blocked",
  declined: "Declined",
};

export const INTERVENTION_STATUS_TONE: Record<InterventionStatus, Tone> = {
  planned: "neutral",
  due: "info",
  in_progress: "info",
  overdue: "warning",
  completed: "success",
  blocked: "danger",
  declined: "neutral",
};

export const AGREEMENT_LABEL: Record<AgreementState, string> = {
  not_shared: "Not shared",
  shared: "Shared",
  viewed: "Viewed",
  discussed: "Discussed",
  agreed: "Agreed",
  partially_agreed: "Partially agreed",
  declined: "Declined",
};

export const INTERVENTION_KIND_LABEL: Record<InterventionKind, string> = {
  monitoring: "Monitoring",
  lab: "Lab test",
  imaging: "Imaging",
  consultation: "Consultation",
  referral: "Referral",
  education: "Education",
  lifestyle: "Lifestyle",
  medication_review: "Medication review",
  procedure: "Procedure",
  home_measurement: "Home measurement",
  follow_up: "Follow-up",
  insurance: "Authorization",
};

/* Order in which statuses are grouped in the plan list + which read as "open". */
export const OPEN_STATUSES: CarePlanStatus[] = ["active", "draft", "proposed", "on_hold"];

export function isAtRisk(plan: CarePlan): boolean {
  return plan.goals.some(
    (g) => g.lifecycle === "active" && (g.achievement === "at_risk" || g.achievement === "worsening"),
  );
}

export function overdueCount(plan: CarePlan): number {
  return plan.interventions.filter((i) => i.status === "overdue" || i.status === "blocked").length;
}

export type CarePlanSummary = {
  hasPlan: boolean;
  activeCount: number;
  overdue: number;
  atRisk: boolean;
  nextReview?: string;
  activeTitle?: string;
};

/* Read-only roll-up for surfaces OUTSIDE the Care plan tab — the chart Summary
   card, the Patients worklist next-action, Home "Needs attention". Reads the
   store directly (lazily seeds, never emits), so other tabs see the same truth
   the tab manages. `ensure` is hoisted, so this is safe above its definition. */
export function carePlanSummaryFor(patientId: string): CarePlanSummary {
  const active = ensure(patientId).filter((plan) => plan.status === "active");
  if (active.length === 0) return { hasPlan: false, activeCount: 0, overdue: 0, atRisk: false };
  return {
    hasPlan: true,
    activeCount: active.length,
    overdue: active.reduce((sum, plan) => sum + overdueCount(plan), 0),
    atRisk: active.some(isAtRisk),
    nextReview: active.map((plan) => plan.nextReview).filter(Boolean).sort()[0],
    activeTitle: active[0].title,
  };
}

/* --------------------------------- seed ------------------------------------ */
/* Sokha Chan — the spec's worked example. HbA1c lab key matches deltaLabResults. */

const HBA1C_KEY = "GLYCOSYLATED HAEMOGLOBIN (Roche)||Hb A1c % (DCCT/NGSP)";
const CREATININE_KEY = "BIOCHEMISTRY||Creatinine";
const ACR_KEY = "URINE BIOCHEMISTRY (Microalbumin Roche)||Microalbumin/Cre Ratio";

function seedSokha(patientId: string): CarePlan[] {
  return [
    {
      id: "cp-dm",
      patientId,
      title: "Diabetes control",
      type: "Chronic disease",
      rationale: "Type 2 diabetes with suboptimal glycaemic control; reduce HbA1c and protect renal function.",
      primary: true,
      status: "active",
      priority: "warning",
      focuses: [
        {
          id: "f-dm",
          label: "Type 2 diabetes — suboptimal control",
          coded: "E11.65",
          status: "Active",
          evidence: "HbA1c 9.1% (15 Jan), latest 8.3% (21 May)",
          reason: "Glycaemic control above target; albuminuria present.",
        },
      ],
      goals: [
        {
          id: "g-hba1c",
          label: "Lower HbA1c below 7.5%",
          type: "quantitative",
          baseline: "9.1%",
          target: "< 7.5%",
          unit: "%",
          latest: "8.3%",
          latestDate: "21 May 2026",
          trendKey: HBA1C_KEY,
          targetDate: "Nov 2026",
          owner: "Dr Dara",
          lifecycle: "active",
          achievement: "improving",
          priority: true,
          source: "Kura Lab · verified",
        },
        {
          id: "g-understand",
          label: "Sokha understands the test + follow-up schedule",
          type: "patient_stated",
          owner: "Sokha",
          lifecycle: "active",
          achievement: "on_track",
        },
      ],
      interventions: [
        {
          id: "i-hba1c",
          kind: "lab",
          label: "Repeat HbA1c after 3 months",
          detail: "Confirm trend before adjusting therapy.",
          goalId: "g-hba1c",
          focusId: "f-dm",
          owner: "Dr Dara",
          due: "21 Aug 2026",
          frequency: "Every 3 months",
          status: "due",
          agreement: "agreed",
          coverage: "covered",
          order: { labKeys: [HBA1C_KEY], rationale: "Diabetes control · repeat HbA1c to confirm trend (baseline 9.1%)." },
        },
        {
          id: "i-nutrition",
          kind: "education",
          label: "Nutrition counselling",
          detail: "Carbohydrate management session.",
          goalId: "g-hba1c",
          owner: "Clinic nurse",
          due: "6 Jun 2026",
          status: "declined",
          agreement: "declined",
          declineReason: "Patient deferred — will reconsider next visit",
        },
        {
          id: "i-followup",
          kind: "follow_up",
          label: "Follow-up consultation after results",
          goalId: "g-hba1c",
          owner: "Dr Dara",
          due: "28 Aug 2026",
          status: "planned",
          precondition: "After repeat HbA1c result is back",
        },
      ],
      monitoring: [
        {
          id: "m-hba1c",
          label: "HbA1c",
          trendKey: HBA1C_KEY,
          baseline: "9.1%",
          target: "< 7.5%",
          unit: "%",
          frequency: "Every 3 months",
          latest: "8.3%",
          latestDate: "21 May 2026",
          source: "Kura Lab · verified",
          alert: "Review early if > 8.5%",
        },
      ],
      reviews: [
        {
          id: "r-dm-1",
          date: "21 May 2026",
          reviewer: "Dr Dara",
          assessment: "HbA1c improving 9.1% → 8.3%. Not yet at target. Continue plan; repeat in 3 months.",
          changes: "Next review set; nutrition counselling kept open.",
          version: 2,
        },
      ],
      team: { responsible: "Dr Dara", author: "Dr Dara", patient: "Sokha Chan" },
      startDate: "15 Jan 2026",
      nextReview: "21 Aug 2026",
      lastReviewedBy: "Dr Dara",
      lastReviewedAt: "21 May 2026",
      version: 2,
      source: "Consultation · 21 May 2026",
      agreement: "agreed",
      createdAt: "15 Jan 2026",
      history: [
        { id: "h1", at: "15 Jan 2026", actor: "Dr Dara", event: "Plan created" },
        { id: "h2", at: "15 Jan 2026", actor: "Dr Dara", event: "Plan activated" },
        { id: "h3", at: "21 May 2026", actor: "Dr Dara", event: "Review completed", detail: "v1 → v2" },
      ],
    },
    {
      id: "cp-renal",
      patientId,
      title: "Renal risk monitoring",
      type: "Chronic disease",
      rationale: "CKD stage 3 with albuminuria; monitor renal function and slow progression.",
      status: "active",
      priority: "danger",
      focuses: [
        {
          id: "f-ckd",
          label: "CKD stage 3 with albuminuria",
          coded: "N18.3",
          status: "Active",
          evidence: "Creatinine 3.86 mg/dL ↑ · Microalbumin/Cr 155.5 mg/g ↑ (21 May)",
          reason: "Renal markers above reference; diabetic nephropathy risk.",
        },
      ],
      goals: [
        {
          id: "g-egfr",
          label: "Keep eGFR from declining past the agreed threshold",
          type: "maintenance",
          baseline: "eGFR 38",
          target: "No decline > 5/yr",
          unit: "mL/min",
          latest: "Creatinine 3.86 ↑",
          latestDate: "21 May 2026",
          trendKey: CREATININE_KEY,
          owner: "Dr Dara",
          lifecycle: "active",
          achievement: "at_risk",
          priority: true,
          source: "Kura Lab · verified",
        },
        {
          id: "g-renal-screen",
          label: "Complete renal screening within 8 weeks",
          type: "milestone",
          target: "Creatinine + urine albumin",
          targetDate: "18 Jul 2026",
          owner: "Dr Dara",
          lifecycle: "active",
          achievement: "not_assessable",
        },
      ],
      interventions: [
        {
          id: "i-renal-labs",
          kind: "lab",
          label: "Creatinine + urine albumin",
          detail: "Repeat renal panel to confirm trajectory.",
          goalId: "g-renal-screen",
          focusId: "f-ckd",
          owner: "Dr Dara",
          due: "18 Jul 2026",
          status: "blocked",
          blockReason: "Blocked by coverage decision — Forte denied urine albumin",
          coverage: "denied",
          agreement: "agreed",
          order: {
            labKeys: [CREATININE_KEY, ACR_KEY],
            rationale: "Renal risk · creatinine + urine albumin to confirm CKD trajectory.",
          },
        },
        {
          id: "i-nephro",
          kind: "referral",
          label: "Nephrology referral",
          detail: "If eGFR falls below the agreed threshold.",
          goalId: "g-egfr",
          owner: "Dr Dara",
          status: "planned",
          precondition: "Trigger if eGFR < 30 or rapid decline",
        },
      ],
      monitoring: [
        {
          id: "m-creat",
          label: "Creatinine",
          trendKey: CREATININE_KEY,
          baseline: "—",
          target: "Stable",
          unit: "mg/dL",
          latest: "3.86 ↑",
          latestDate: "21 May 2026",
          source: "Kura Lab · verified",
          alert: "Critical workflow runs independently of plan review",
        },
        {
          id: "m-acr",
          label: "Microalbumin/Cr ratio",
          trendKey: ACR_KEY,
          target: "< 30 mg/g",
          unit: "mg/g",
          latest: "155.5 ↑",
          latestDate: "21 May 2026",
          source: "Kura Lab · verified",
        },
      ],
      reviews: [
        {
          id: "r-renal-1",
          date: "21 May 2026",
          reviewer: "Dr Dara",
          assessment: "Renal markers elevated; albuminuria significant. Repeat panel; consider nephrology if worsening.",
          version: 1,
        },
      ],
      team: { responsible: "Dr Dara", author: "Dr Dara", patient: "Sokha Chan" },
      startDate: "21 May 2026",
      nextReview: "18 Jul 2026",
      lastReviewedBy: "Dr Dara",
      lastReviewedAt: "21 May 2026",
      version: 1,
      source: "Consultation · 21 May 2026",
      agreement: "partially_agreed",
      createdAt: "21 May 2026",
      history: [
        { id: "h1", at: "21 May 2026", actor: "Dr Dara", event: "Plan created" },
        { id: "h2", at: "21 May 2026", actor: "Dr Dara", event: "Plan activated" },
        { id: "h3", at: "21 May 2026", actor: "System", event: "Coverage denied", detail: "Urine albumin — Forte" },
      ],
    },
    {
      id: "cp-htn",
      patientId,
      title: "Hypertension monitoring",
      type: "Chronic disease",
      rationale: "Blood pressure above target; establish home monitoring and review medication.",
      status: "draft",
      priority: "warning",
      focuses: [
        {
          id: "f-htn",
          label: "Hypertension — above target",
          coded: "I10",
          status: "Active",
          evidence: "Recent average 152/94",
          reason: "BP above target; cardiovascular risk with diabetes.",
        },
      ],
      goals: [
        {
          id: "g-bp",
          label: "Blood pressure in target range",
          type: "maintenance",
          baseline: "152/94",
          target: "< 140/90",
          owner: "Dr Dara",
          lifecycle: "planned",
          achievement: "not_assessable",
        },
      ],
      interventions: [
        {
          id: "i-home-bp",
          kind: "home_measurement",
          label: "Home blood-pressure log",
          owner: "Sokha",
          status: "planned",
          agreement: "not_shared",
        },
        {
          id: "i-med-review",
          kind: "medication_review",
          label: "Review antihypertensive at next visit",
          owner: "Dr Dara",
          status: "planned",
        },
      ],
      monitoring: [],
      reviews: [],
      team: { responsible: "Dr Dara", author: "Dr Dara", patient: "Sokha Chan" },
      version: 1,
      source: "Consultation · 21 May 2026",
      agreement: "not_shared",
      createdAt: "21 May 2026",
      history: [{ id: "h1", at: "21 May 2026", actor: "Dr Dara", event: "Draft created" }],
    },
    {
      id: "cp-postop",
      patientId,
      title: "Post-op knee recovery",
      type: "Post-procedure",
      rationale: "Recovery pathway after arthroscopic knee surgery.",
      status: "completed",
      focuses: [
        { id: "f-postop", label: "Post-arthroscopy recovery", status: "Resolved", reason: "6-week recovery pathway." },
      ],
      goals: [
        {
          id: "g-infection",
          label: "No surgical-site infection in 30 days",
          type: "avoidance",
          lifecycle: "completed",
          achievement: "achieved",
          owner: "Dr Dara",
        },
        {
          id: "g-walk",
          label: "Walk 20 minutes without difficulty",
          type: "functional",
          lifecycle: "completed",
          achievement: "achieved",
          owner: "Physiotherapy",
        },
      ],
      interventions: [
        { id: "i-wound", kind: "monitoring", label: "Wound check at 1 + 2 weeks", owner: "Clinic nurse", status: "completed" },
        { id: "i-physio", kind: "consultation", label: "Physiotherapy sessions", owner: "Physiotherapy", status: "completed" },
      ],
      monitoring: [],
      reviews: [
        {
          id: "r-postop",
          date: "10 Dec 2025",
          reviewer: "Dr Dara",
          assessment: "Recovery complete; goals achieved. Closing plan.",
          version: 3,
        },
      ],
      team: { responsible: "Dr Dara", author: "Dr Dara", patient: "Sokha Chan" },
      startDate: "1 Nov 2025",
      version: 3,
      source: "Consultation · 1 Nov 2025",
      agreement: "agreed",
      completionOutcome: "Goals achieved",
      createdAt: "1 Nov 2025",
      history: [
        { id: "h1", at: "1 Nov 2025", actor: "Dr Dara", event: "Plan created" },
        { id: "h2", at: "10 Dec 2025", actor: "Dr Dara", event: "Plan completed", detail: "Goals achieved" },
      ],
    },
  ];
}

function seedCarePlans(patientId: string): CarePlan[] {
  if (patientId === "sokha-chan") return seedSokha(patientId);
  return [];
}

/* ------------------------------- store ------------------------------------- */

const stores = new Map<string, CarePlan[]>();
const listeners = new Set<() => void>();

function ensure(patientId: string): CarePlan[] {
  let plans = stores.get(patientId);
  if (!plans) {
    plans = seedCarePlans(patientId);
    stores.set(patientId, plans);
  }
  return plans;
}

function emit() {
  for (const l of listeners) l();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function nowLabel(): string {
  try {
    return new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return "Today";
  }
}

function hid(): string {
  return `h${Math.round(performance.now())}-${listeners.size}`;
}

function update(patientId: string, planId: string, fn: (plan: CarePlan) => CarePlan) {
  const plans = ensure(patientId).map((p) => (p.id === planId ? fn(p) : p));
  stores.set(patientId, plans);
  emit();
}

function withHistory(plan: CarePlan, event: string, detail?: string, actor = "Dr Dara"): CarePlan {
  return { ...plan, history: [...plan.history, { id: hid(), at: nowLabel(), actor, event, detail }] };
}

export type CarePlanActions = {
  activate: (planId: string) => void;
  pause: (planId: string, reason: string, resumeCondition?: string) => void;
  resume: (planId: string) => void;
  complete: (planId: string, outcome: string) => void;
  discontinue: (planId: string, reason: string) => void;
  markError: (planId: string) => void;
  recordReview: (planId: string, assessment: string) => void;
  setInterventionStatus: (planId: string, interventionId: string, status: InterventionStatus) => void;
  linkOrder: (planId: string, interventionId: string, ref: string) => void;
};

export function useCarePlans(patientId: string): { plans: CarePlan[]; actions: CarePlanActions } {
  const getSnapshot = useCallback(() => ensure(patientId), [patientId]);
  const plans = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const activate = useCallback(
    (planId: string) =>
      update(patientId, planId, (p) =>
        withHistory(
          { ...p, status: "active", startDate: p.startDate ?? nowLabel() },
          "Plan activated",
          `v${p.version}`,
        ),
      ),
    [patientId],
  );

  const pause = useCallback(
    (planId: string, reason: string, resumeCondition?: string) =>
      update(patientId, planId, (p) =>
        withHistory({ ...p, status: "on_hold", holdReason: reason, resumeCondition }, "Plan paused", reason),
      ),
    [patientId],
  );

  const resume = useCallback(
    (planId: string) =>
      update(patientId, planId, (p) =>
        withHistory({ ...p, status: "active", holdReason: undefined, resumeCondition: undefined }, "Plan resumed"),
      ),
    [patientId],
  );

  const complete = useCallback(
    (planId: string, outcome: string) =>
      update(patientId, planId, (p) =>
        withHistory({ ...p, status: "completed", completionOutcome: outcome }, "Plan completed", outcome),
      ),
    [patientId],
  );

  const discontinue = useCallback(
    (planId: string, reason: string) =>
      update(patientId, planId, (p) =>
        withHistory({ ...p, status: "discontinued", completionOutcome: reason }, "Plan discontinued", reason),
      ),
    [patientId],
  );

  const markError = useCallback(
    (planId: string) =>
      update(patientId, planId, (p) => withHistory({ ...p, status: "entered_in_error" }, "Marked entered in error")),
    [patientId],
  );

  const recordReview = useCallback(
    (planId: string, assessment: string) =>
      update(patientId, planId, (p) => {
        const version = p.version + 1;
        const review: Review = {
          id: `r-${version}-${hid()}`,
          date: nowLabel(),
          reviewer: p.team.responsible,
          assessment,
          version,
        };
        return withHistory(
          {
            ...p,
            version,
            reviews: [review, ...p.reviews],
            lastReviewedAt: nowLabel(),
            lastReviewedBy: p.team.responsible,
          },
          "Review completed",
          `v${p.version} → v${version}`,
        );
      }),
    [patientId],
  );

  const setInterventionStatus = useCallback(
    (planId: string, interventionId: string, status: InterventionStatus) =>
      update(patientId, planId, (p) => ({
        ...p,
        interventions: p.interventions.map((i) => (i.id === interventionId ? { ...i, status } : i)),
      })),
    [patientId],
  );

  const linkOrder = useCallback(
    (planId: string, interventionId: string, ref: string) =>
      update(patientId, planId, (p) =>
        withHistory(
          {
            ...p,
            interventions: p.interventions.map((i) =>
              i.id === interventionId
                ? { ...i, status: "in_progress", execution: { kind: "order", ref, placedAt: nowLabel() } }
                : i,
            ),
          },
          "Order created from intervention",
          ref,
        ),
      ),
    [patientId],
  );

  return {
    plans,
    actions: {
      activate,
      pause,
      resume,
      complete,
      discontinue,
      markError,
      recordReview,
      setInterventionStatus,
      linkOrder,
    },
  };
}
