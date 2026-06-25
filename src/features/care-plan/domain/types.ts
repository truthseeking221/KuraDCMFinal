/* =============================================================================
   Care Plan domain — TYPES + display constant maps.

   A Care Plan is a longitudinal *care-coordination contract*, NOT a note, order,
   appointment, prescription, problem list, or task board. The minimal-but-correct
   spine is:

     Clinical focus → Goal → Intervention → Owner → Due date → Evidence → Review → Version

   Patient Detail holds MANY plans (episodes), grouped by status. Mutations create
   new versions + append history; clinical data is never destroyed (entered_in_error
   / superseded instead).

   This module holds ONLY type/enum definitions and the label/tone constant maps.
   It is dependency-free and safe to import from any layer (server or client).
   ============================================================================= */

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
  not_assessable: "No recent result",
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

/* =============================================================================
   Medications — TWO independent dimensions: SOURCE (who originated it) and
   VERIFICATION (how sure we are it's current). A patient-reported drug a Kura
   doctor confirms stays patient-reported + confirmed — it never becomes a Kura
   prescription. The care plan only REFERENCES medications by id; the drug fields
   live here, never copied into the plan.
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
