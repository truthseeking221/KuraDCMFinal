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

export type FocusStatus = "active" | "paused" | "archived";

export type ClinicalFocus = {
  id: string;
  label: string;
  shortLabel?: string; // nav label, e.g. "Diabetes"
  coded?: string; // ICD-10 etc.
  status?: string; // e.g. "Suboptimal control"
  evidence?: string; // supporting evidence line
  reason?: string; // why it's in the plan
  /* Living-plan additions — a focus is one strand of the ONE living plan, added by
     a consultation or by protocol enrolment, never a parallel plan. */
  focusStatus?: FocusStatus;
  enrolledAt?: string;
  enrolledVia?: "consultation" | "protocol";
  protocolKey?: string;
  protocolName?: string;
  nextReview?: string;
  lastReviewedAt?: string;
};

export type Goal = {
  id: string;
  focusId?: string; // which Care Focus this goal belongs to
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
  focusId?: string;
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
  focusId?: string;
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

/* A Plan Delta is a small structured change appended AUTOMATICALLY when the doctor
   completes a clinical action elsewhere (orders a lab, signs an Rx, refers, schedules
   a follow-up). The doctor never re-types it into the plan — the plan accumulates from
   the work. This is a patient-facing "what changed" stream, distinct from the system
   `history` audit. */
export type PlanDeltaAction =
  | "lab_ordered"
  | "rx_signed"
  | "referral_created"
  | "follow_up_scheduled"
  | "advice_given"
  | "external_med_confirmed"
  | "result_reviewed"
  | "icd_added";

export type PlanDelta = {
  id: string;
  at: string;
  actor: string;
  action: PlanDeltaAction;
  focusId?: string;
  goalId?: string;
  interventionId?: string;
  summary: string;
  detail?: string;
  ref?: string;
};

export const PLAN_DELTA_LABEL: Record<PlanDeltaAction, string> = {
  lab_ordered: "Lab ordered",
  rx_signed: "Rx signed",
  referral_created: "Referral",
  follow_up_scheduled: "Follow-up",
  advice_given: "Advice",
  external_med_confirmed: "External med",
  result_reviewed: "Result reviewed",
  icd_added: "Diagnosis",
};

export const PLAN_DELTA_TONE: Record<PlanDeltaAction, Tone> = {
  lab_ordered: "info",
  rx_signed: "success",
  referral_created: "info",
  follow_up_scheduled: "info",
  advice_given: "neutral",
  external_med_confirmed: "neutral",
  result_reviewed: "info",
  icd_added: "neutral",
};

/* The patient-friendly mirror of the clinical work — plain-language guidance the
   patient receives. Distinct from interventions (which stay clinical/technical). */
export type PatientInstruction = {
  id: string;
  focusId?: string;
  interventionId?: string;
  label: string; // the instruction itself, in patient words
  whenToContact?: string; // safety-netting — when to call the clinic
  source?: string;
};

export type CarePlan = {
  id: string;
  patientId: string;
  /* "living" = the single longitudinal plan that holds every active Care Focus.
     "episode" = an archived past plan (e.g. a completed post-op pathway). */
  kind?: "living" | "episode";
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
  /* Auto-captured "what changed" stream (newest first), written by clinical flows. */
  deltas?: PlanDelta[];
  /* Patient-friendly instructions, mirrored from the clinical work per focus. */
  instructions?: PatientInstruction[];
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

/* ------------------------- living-plan / focus helpers --------------------- */

/* An intervention reads as an OPEN LOOP (something the plan is still waiting on)
   when it is due, overdue, blocked, or in progress. These drive the calm
   "N items to close the loop" status that replaces any plan-strength score. */
export const OPEN_LOOP_STATUSES: InterventionStatus[] = ["due", "overdue", "blocked", "in_progress"];

/* The ONE longitudinal plan for a patient — the non-archived active plan. */
export function livingPlanOf(plans: CarePlan[]): CarePlan | null {
  return (
    plans.find((p) => p.kind !== "episode" && p.status === "active") ??
    plans.find((p) => p.kind !== "episode") ??
    null
  );
}

/* Archived past plans (completed/discontinued episodes), newest first by start. */
export function episodesOf(plans: CarePlan[]): CarePlan[] {
  return plans.filter((p) => p.kind === "episode");
}

export function activeFocuses(plan: CarePlan): ClinicalFocus[] {
  return plan.focuses.filter((f) => (f.focusStatus ?? "active") !== "archived");
}

export function goalsForFocus(plan: CarePlan, focusId: string): Goal[] {
  return plan.goals.filter((g) => g.focusId === focusId);
}

export function interventionsForFocus(plan: CarePlan, focusId: string): Intervention[] {
  return plan.interventions.filter((i) => i.focusId === focusId);
}

export function focusIsAtRisk(plan: CarePlan, focusId: string): boolean {
  return goalsForFocus(plan, focusId).some(
    (g) => g.lifecycle === "active" && (g.achievement === "at_risk" || g.achievement === "worsening"),
  );
}

export type FocusActionStatus = {
  openLoop: number;
  overdue: number;
  atRisk: number;
  /* Action-meaningful label, never a percentage: "2 items to close the loop". */
  label: string;
  tone: Tone;
};

export function focusActionStatus(plan: CarePlan, focusId: string): FocusActionStatus {
  const intvs = interventionsForFocus(plan, focusId);
  const openLoop = intvs.filter((i) => OPEN_LOOP_STATUSES.includes(i.status)).length;
  const overdue = intvs.filter((i) => i.status === "overdue" || i.status === "blocked").length;
  const atRisk = focusIsAtRisk(plan, focusId) ? 1 : 0;
  const label = openLoop === 0 ? "Up to date" : `${openLoop} item${openLoop === 1 ? "" : "s"} to close the loop`;
  const tone: Tone = overdue > 0 ? "warning" : atRisk > 0 ? "danger" : openLoop > 0 ? "info" : "success";
  return { openLoop, overdue, atRisk, label, tone };
}

/* Whole-living-plan open-loop count across every active focus. */
export function planOpenLoopCount(plan: CarePlan): number {
  return plan.interventions.filter((i) => OPEN_LOOP_STATUSES.includes(i.status)).length;
}

export type CarePlanSummary = {
  hasPlan: boolean;
  activeCount: number; // active Care Focus count
  overdue: number;
  atRisk: boolean;
  nextReview?: string;
  activeTitle?: string; // the leading focus, e.g. "Diabetes"
};

/* Read-only roll-up for surfaces OUTSIDE the Care plan tab — the chart Summary
   card, the Patients worklist next-action, Home "Needs attention". Reads the
   single Living Care Plan directly (lazily seeds, never emits), so other tabs see
   the same truth the tab manages. `ensure` is hoisted, safe above its definition. */
export function carePlanSummaryFor(patientId: string): CarePlanSummary {
  const plan = livingPlanOf(ensure(patientId));
  if (!plan || plan.status !== "active") return { hasPlan: false, activeCount: 0, overdue: 0, atRisk: false };
  const focuses = activeFocuses(plan);
  return {
    hasPlan: true,
    activeCount: focuses.length,
    overdue: overdueCount(plan),
    atRisk: isAtRisk(plan),
    nextReview: plan.nextReview,
    activeTitle: focuses[0]?.shortLabel ?? focuses[0]?.label ?? plan.title,
  };
}

/* --------------------------------- seed ------------------------------------ */
/* Sokha Chan — the spec's worked example. HbA1c lab key matches deltaLabResults. */

const HBA1C_KEY = "GLYCOSYLATED HAEMOGLOBIN (Roche)||Hb A1c % (DCCT/NGSP)";
const CREATININE_KEY = "BIOCHEMISTRY||Creatinine";
const ACR_KEY = "URINE BIOCHEMISTRY (Microalbumin Roche)||Microalbumin/Cre Ratio";

function seedSokha(patientId: string): CarePlan[] {
  return [
    /* ONE Living Care Plan — three active Care Focus strands (Diabetes, Renal,
       Hypertension). Each strand was added by a consultation, not a parallel plan. */
    {
      id: "cp-living",
      patientId,
      kind: "living",
      title: "Living care plan",
      type: "Longitudinal",
      rationale:
        "Coordinated long-term plan across Sokha's active conditions — glycaemic control, renal protection and blood-pressure management.",
      primary: true,
      status: "active",
      priority: "warning",
      focuses: [
        {
          id: "f-dm",
          label: "Type 2 diabetes — suboptimal control",
          shortLabel: "Diabetes",
          coded: "E11.65",
          status: "Active",
          evidence: "HbA1c 9.1% (15 Jan), latest 8.3% (21 May)",
          reason: "Glycaemic control above target; albuminuria present.",
          focusStatus: "active",
          enrolledAt: "15 Jan 2026",
          enrolledVia: "consultation",
          nextReview: "21 Aug 2026",
          lastReviewedAt: "21 May 2026",
        },
        {
          id: "f-ckd",
          label: "CKD stage 3 with albuminuria",
          shortLabel: "Renal",
          coded: "N18.3",
          status: "Active",
          evidence: "Creatinine 3.86 mg/dL ↑ · Microalbumin/Cr 155.5 mg/g ↑ (21 May)",
          reason: "Renal markers above reference; diabetic nephropathy risk.",
          focusStatus: "active",
          enrolledAt: "21 May 2026",
          enrolledVia: "consultation",
          nextReview: "18 Jul 2026",
          lastReviewedAt: "21 May 2026",
        },
        {
          id: "f-htn",
          label: "Hypertension — above target",
          shortLabel: "Hypertension",
          coded: "I10",
          status: "Newly added",
          evidence: "Recent average 152/94",
          reason: "BP above target; cardiovascular risk with diabetes.",
          focusStatus: "active",
          enrolledAt: "21 May 2026",
          enrolledVia: "consultation",
        },
      ],
      goals: [
        {
          id: "g-hba1c",
          focusId: "f-dm",
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
          focusId: "f-dm",
          label: "Sokha understands the test + follow-up schedule",
          type: "patient_stated",
          owner: "Sokha",
          lifecycle: "active",
          achievement: "on_track",
        },
        {
          id: "g-egfr",
          focusId: "f-ckd",
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
          focusId: "f-ckd",
          label: "Complete renal screening within 8 weeks",
          type: "milestone",
          target: "Creatinine + urine albumin",
          targetDate: "18 Jul 2026",
          owner: "Dr Dara",
          lifecycle: "active",
          achievement: "not_assessable",
        },
        {
          id: "g-bp",
          focusId: "f-htn",
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
          focusId: "f-dm",
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
          focusId: "f-dm",
          owner: "Dr Dara",
          due: "28 Aug 2026",
          status: "planned",
          precondition: "After repeat HbA1c result is back",
        },
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
          focusId: "f-ckd",
          owner: "Dr Dara",
          status: "planned",
          precondition: "Trigger if eGFR < 30 or rapid decline",
        },
        {
          id: "i-home-bp",
          kind: "home_measurement",
          label: "Home blood-pressure log",
          goalId: "g-bp",
          focusId: "f-htn",
          owner: "Sokha",
          status: "planned",
          agreement: "not_shared",
        },
        {
          id: "i-med-review",
          kind: "medication_review",
          label: "Review antihypertensive at next visit",
          goalId: "g-bp",
          focusId: "f-htn",
          owner: "Dr Dara",
          status: "planned",
        },
      ],
      monitoring: [
        {
          id: "m-hba1c",
          focusId: "f-dm",
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
        {
          id: "m-creat",
          focusId: "f-ckd",
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
          focusId: "f-ckd",
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
          id: "r-dm-1",
          focusId: "f-dm",
          date: "21 May 2026",
          reviewer: "Dr Dara",
          assessment: "HbA1c improving 9.1% → 8.3%. Not yet at target. Continue plan; repeat in 3 months.",
          changes: "Next review set; nutrition counselling kept open.",
          version: 2,
        },
        {
          id: "r-renal-1",
          focusId: "f-ckd",
          date: "21 May 2026",
          reviewer: "Dr Dara",
          assessment: "Renal markers elevated; albuminuria significant. Repeat panel; consider nephrology if worsening.",
          version: 1,
        },
      ],
      team: { responsible: "Dr Dara", author: "Dr Dara", patient: "Sokha Chan" },
      startDate: "15 Jan 2026",
      nextReview: "18 Jul 2026",
      lastReviewedBy: "Dr Dara",
      lastReviewedAt: "21 May 2026",
      version: 2,
      source: "Consultation · 21 May 2026",
      agreement: "partially_agreed",
      createdAt: "15 Jan 2026",
      history: [
        { id: "h1", at: "15 Jan 2026", actor: "Dr Dara", event: "Living care plan started", detail: "Diabetes focus added" },
        { id: "h2", at: "21 May 2026", actor: "Dr Dara", event: "Review completed", detail: "Diabetes · v1 → v2" },
        { id: "h3", at: "21 May 2026", actor: "Dr Dara", event: "Renal focus added" },
        { id: "h4", at: "21 May 2026", actor: "System", event: "Coverage denied", detail: "Urine albumin — Forte" },
        { id: "h5", at: "21 May 2026", actor: "Dr Dara", event: "Hypertension focus added" },
      ],
      deltas: [
        {
          id: "d-3",
          at: "21 May 2026",
          actor: "Dr Dara",
          action: "follow_up_scheduled",
          focusId: "f-dm",
          summary: "Follow-up consultation after results",
          detail: "Telegram reminder to the patient",
        },
        {
          id: "d-2",
          at: "21 May 2026",
          actor: "Dr Dara",
          action: "referral_created",
          focusId: "f-ckd",
          summary: "Nephrology referral prepared",
          detail: "Triggers if eGFR falls below threshold",
        },
        {
          id: "d-1",
          at: "21 May 2026",
          actor: "Dr Dara",
          action: "lab_ordered",
          focusId: "f-dm",
          interventionId: "i-hba1c",
          summary: "Repeat HbA1c ordered",
          detail: "Confirm trend before adjusting therapy",
        },
      ],
      instructions: [
        {
          id: "pi-dm-1",
          focusId: "f-dm",
          label: "Take Metformin with food, twice a day.",
          whenToContact: "Call the clinic if you have stomach upset that does not settle.",
        },
        {
          id: "pi-dm-2",
          focusId: "f-dm",
          label: "Cut down on sugary drinks and refined carbohydrates.",
        },
        {
          id: "pi-dm-3",
          focusId: "f-dm",
          label: "Return in about 3 months for your repeat HbA1c blood test.",
        },
        {
          id: "pi-ckd-1",
          focusId: "f-ckd",
          label: "Drink water through the day and avoid painkillers like ibuprofen.",
          whenToContact: "Call us if you notice swelling, much less urine, or breathlessness.",
        },
        {
          id: "pi-ckd-2",
          focusId: "f-ckd",
          label: "Keep your kidney blood and urine tests on schedule.",
        },
        {
          id: "pi-htn-1",
          focusId: "f-htn",
          label: "Check your blood pressure at home and write down the readings.",
          whenToContact: "Seek help urgently for severe headache, chest pain or vision changes.",
        },
      ],
    },
    /* Archived episode — a closed past plan kept for history, never a competing
       active plan. Shown under "Archived" in the focus rail, read-only. */
    {
      id: "cp-postop",
      patientId,
      kind: "episode",
      title: "Post-op knee recovery",
      type: "Post-procedure",
      rationale: "Recovery pathway after arthroscopic knee surgery.",
      status: "completed",
      focuses: [
        {
          id: "f-postop",
          label: "Post-arthroscopy recovery",
          shortLabel: "Post-op knee",
          status: "Resolved",
          reason: "6-week recovery pathway.",
          focusStatus: "archived",
        },
      ],
      goals: [
        {
          id: "g-infection",
          focusId: "f-postop",
          label: "No surgical-site infection in 30 days",
          type: "avoidance",
          lifecycle: "completed",
          achievement: "achieved",
          owner: "Dr Dara",
        },
        {
          id: "g-walk",
          focusId: "f-postop",
          label: "Walk 20 minutes without difficulty",
          type: "functional",
          lifecycle: "completed",
          achievement: "achieved",
          owner: "Physiotherapy",
        },
      ],
      interventions: [
        { id: "i-wound", kind: "monitoring", focusId: "f-postop", label: "Wound check at 1 + 2 weeks", owner: "Clinic nurse", status: "completed" },
        { id: "i-physio", kind: "consultation", focusId: "f-postop", label: "Physiotherapy sessions", owner: "Physiotherapy", status: "completed" },
      ],
      monitoring: [],
      reviews: [
        {
          id: "r-postop",
          focusId: "f-postop",
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

let seq = 0;
function hid(): string {
  return `h${(seq += 1)}-${Math.round(performance.now())}`;
}

function update(patientId: string, planId: string, fn: (plan: CarePlan) => CarePlan) {
  const plans = ensure(patientId).map((p) => (p.id === planId ? fn(p) : p));
  stores.set(patientId, plans);
  emit();
}

function withHistory(plan: CarePlan, event: string, detail?: string, actor = "Dr Dara"): CarePlan {
  return { ...plan, history: [...plan.history, { id: hid(), at: nowLabel(), actor, event, detail }] };
}

/* Imperative (non-hook) writer for the Plan Delta stream — called from clinical
   flows (order lab, sign Rx, refer, schedule follow-up) so the plan accumulates from
   the doctor's work, never re-typed into the plan. No-ops when the patient has no
   active living plan; never auto-creates one. Mutates the store + emits OUTSIDE the
   React render (call it from event handlers, not during render). */
export function appendPlanDelta(patientId: string, delta: Omit<PlanDelta, "id" | "at">): void {
  const plans = ensure(patientId);
  const living = livingPlanOf(plans);
  if (!living || living.status !== "active") return;
  const entry: PlanDelta = { ...delta, id: `d-${(seq += 1)}-${Math.round(performance.now())}`, at: nowLabel() };
  const next = plans.map((p) => (p.id === living.id ? { ...p, deltas: [entry, ...(p.deltas ?? [])] } : p));
  stores.set(patientId, next);
  emit();
}

/* =============================================================================
   Medications — TWO independent dimensions: SOURCE (who originated it) and
   VERIFICATION (how sure we are it's current). A patient-reported drug a Kura
   doctor confirms stays patient-reported + confirmed — it never becomes a Kura
   prescription. The care plan only REFERENCES medications by id; the drug fields
   live here, never copied into the plan. Separate module store, same patientId key.
   ============================================================================= */

export type MedSource = "kura_prescribed" | "external_clinician" | "patient_reported" | "imported";
export type MedVerification = "unverified" | "confirmed" | "disputed" | "no_longer_taking";

export type Medication = {
  id: string;
  patientId: string;
  drug: string;
  dose?: string;
  frequency?: string;
  route?: string;
  indication?: string;
  focusId?: string;
  source: MedSource;
  verification: MedVerification;
  verifiedBy?: string;
  verifiedAt?: string;
  addedAt: string;
  rxRef?: string;
};

export const MED_SOURCE_LABEL: Record<MedSource, string> = {
  kura_prescribed: "Kura Rx",
  external_clinician: "External clinician",
  patient_reported: "Patient-reported",
  imported: "Imported record",
};

export const MED_SOURCE_TONE: Record<MedSource, Tone> = {
  kura_prescribed: "info",
  external_clinician: "neutral",
  patient_reported: "neutral",
  imported: "neutral",
};

export const MED_VERIFICATION_LABEL: Record<MedVerification, string> = {
  unverified: "Unverified",
  confirmed: "Confirmed",
  disputed: "Disputed",
  no_longer_taking: "No longer taking",
};

export const MED_VERIFICATION_TONE: Record<MedVerification, Tone> = {
  unverified: "warning",
  confirmed: "success",
  disputed: "danger",
  no_longer_taking: "neutral",
};

const medStores = new Map<string, Medication[]>();

function seedMeds(patientId: string): Medication[] {
  if (patientId !== "sokha-chan") return [];
  return [
    {
      id: "med-metformin",
      patientId,
      drug: "Metformin",
      dose: "500 mg",
      frequency: "Twice daily",
      route: "Oral",
      indication: "Type 2 diabetes",
      focusId: "f-dm",
      source: "kura_prescribed",
      verification: "confirmed",
      verifiedBy: "Dr Dara",
      verifiedAt: "15 Jan 2026",
      addedAt: "15 Jan 2026",
      rxRef: "RX-DM-001",
    },
    {
      id: "med-amlodipine",
      patientId,
      drug: "Amlodipine",
      dose: "5 mg",
      frequency: "Once daily",
      route: "Oral",
      indication: "Hypertension",
      focusId: "f-htn",
      source: "external_clinician",
      verification: "confirmed",
      verifiedBy: "Dr Dara",
      verifiedAt: "21 May 2026",
      addedAt: "2024",
    },
    {
      id: "med-herbal",
      patientId,
      drug: "Traditional herbal tonic",
      frequency: "As needed",
      indication: "Patient-reported supplement",
      source: "patient_reported",
      verification: "unverified",
      addedAt: "21 May 2026",
    },
  ];
}

function ensureMeds(patientId: string): Medication[] {
  let meds = medStores.get(patientId);
  if (!meds) {
    meds = seedMeds(patientId);
    medStores.set(patientId, meds);
  }
  return meds;
}

/* Add a medication object. Dedupes on drug+dose so a re-signed Rx doesn't double. */
export function addMedicationFor(patientId: string, med: Omit<Medication, "id" | "patientId" | "addedAt"> & { addedAt?: string }): void {
  const meds = ensureMeds(patientId);
  const key = `${med.drug.toLowerCase()}|${(med.dose ?? "").toLowerCase()}`;
  if (meds.some((m) => `${m.drug.toLowerCase()}|${(m.dose ?? "").toLowerCase()}` === key)) return;
  const entry: Medication = { ...med, id: `med-${(seq += 1)}-${Math.round(performance.now())}`, patientId, addedAt: med.addedAt ?? nowLabel() };
  medStores.set(patientId, [entry, ...meds]);
  emit();
}

/* Change ONLY the verification dimension; source is immutable (a confirmed
   patient-reported med stays patient-reported). */
export function setMedVerificationFor(patientId: string, medId: string, verification: MedVerification): void {
  const meds = ensureMeds(patientId);
  const next = meds.map((m) =>
    m.id === medId ? { ...m, verification, verifiedBy: "Dr Dara", verifiedAt: nowLabel() } : m,
  );
  medStores.set(patientId, next);
  emit();
}

export function useMedications(patientId: string): {
  meds: Medication[];
  setVerification: (medId: string, verification: MedVerification) => void;
} {
  const getSnapshot = useCallback(() => ensureMeds(patientId), [patientId]);
  const meds = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const setVerification = useCallback(
    (medId: string, verification: MedVerification) => setMedVerificationFor(patientId, medId, verification),
    [patientId],
  );
  return { meds, setVerification };
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
