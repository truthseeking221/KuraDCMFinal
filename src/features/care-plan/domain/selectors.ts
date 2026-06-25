/* =============================================================================
   Care Plan domain — SELECTORS (pure read helpers).

   Every function here is PURE: it derives a value from CarePlan data passed in,
   with no store access, no I/O, and no nondeterminism. These are the shared read
   helpers desktop / mobile / Care Programs all consume. Store-bound conveniences
   (e.g. carePlanSummaryFor(patientId), cross-patient roll-ups) live in store.ts,
   which wires these pure cores to the live module store.
   ============================================================================= */

import type {
  CarePlan,
  CarePlanStatus,
  ClinicalFocus,
  Goal,
  Intervention,
  InterventionStatus,
  Tone,
} from "./types";

/* Order in which statuses are grouped in the plan list + which read as "open". */
export const OPEN_STATUSES: CarePlanStatus[] = ["active", "draft", "proposed", "on_hold"];

/* An intervention reads as an OPEN LOOP (something the plan is still waiting on)
   when it is due, overdue, blocked, or in progress. These drive the calm
   "N items to close the loop" status that replaces any plan-strength score. */
export const OPEN_LOOP_STATUSES: InterventionStatus[] = ["due", "overdue", "blocked", "in_progress"];

export function isAtRisk(plan: CarePlan): boolean {
  return plan.goals.some(
    (g) => g.lifecycle === "active" && (g.achievement === "at_risk" || g.achievement === "worsening"),
  );
}

export function overdueCount(plan: CarePlan): number {
  return plan.interventions.filter((i) => i.status === "overdue" || i.status === "blocked").length;
}

/* ------------------------- living-plan / focus helpers --------------------- */

/* The ONE longitudinal plan for a patient — the non-archived active plan. */
export function livingPlanOf(plans: CarePlan[]): CarePlan | null {
  return (
    plans.find((p) => p.kind !== "episode" && p.status === "active") ??
    plans.find((p) => p.kind !== "episode") ??
    null
  );
}

/* Archived past plans (completed/discontinued episodes). */
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
  const label = openLoop === 0 ? "Up to date" : `${openLoop} to do`;
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

/* Pure core of carePlanSummaryFor — derives the roll-up from a patient's plans.
   store.ts wraps this with the live store as carePlanSummaryFor(patientId), the
   public name surfaces OUTSIDE the Care plan tab consume (chart Summary card,
   Patients worklist next-action, Home "Needs attention"). */
export function carePlanSummaryFrom(plans: CarePlan[]): CarePlanSummary {
  const plan = livingPlanOf(plans);
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

/* =============================================================================
   Shared selectors added in PR1 for later PRs (Home/Today/Tasks, Care Programs).
   All pure: cross-patient roll-ups take the full store snapshot as input so the
   store layer can wire them without coupling selectors to the live Map.
   ============================================================================= */

/* The single next action a focus is waiting on — the most-urgent open-loop
   intervention (overdue/blocked before due/in_progress), else null. Deterministic:
   ties break on the intervention's existing array order, never on time. */
export type NextPlanAction = {
  intervention: Intervention;
  reason: "overdue" | "blocked" | "due" | "in_progress";
} | null;

const NEXT_ACTION_PRIORITY: Record<"overdue" | "blocked" | "due" | "in_progress", number> = {
  overdue: 0,
  blocked: 1,
  due: 2,
  in_progress: 3,
};

function nextPlanActionFromInterventions(intvs: Intervention[]): NextPlanAction {
  let best: NextPlanAction = null;
  for (const intervention of intvs) {
    if (!OPEN_LOOP_STATUSES.includes(intervention.status)) continue;
    const reason = intervention.status as "overdue" | "blocked" | "due" | "in_progress";
    if (best === null || NEXT_ACTION_PRIORITY[reason] < NEXT_ACTION_PRIORITY[best.reason]) {
      best = { intervention, reason };
    }
  }
  return best;
}

/* selectNextPlanAction(patientId, focusId) — pure core taking the patient's plans.
   store.ts exposes the (patientId, focusId) signature wired to the live store. */
export function selectNextPlanActionFrom(plans: CarePlan[], focusId: string): NextPlanAction {
  const plan = livingPlanOf(plans);
  if (!plan) return null;
  return nextPlanActionFromInterventions(interventionsForFocus(plan, focusId));
}

/* Open-loop interventions across ALL patients' living plans — for Home/Today/Tasks.
   Input is the full store snapshot keyed by patientId. */
export type CrossPatientPlanItem = {
  patientId: string;
  planId: string;
  focusId?: string;
  intervention: Intervention;
  reason: "overdue" | "blocked" | "due" | "in_progress";
};

export function selectCrossPatientPlanWorkFrom(byPatient: ReadonlyMap<string, CarePlan[]>): CrossPatientPlanItem[] {
  const out: CrossPatientPlanItem[] = [];
  for (const [patientId, plans] of byPatient) {
    const plan = livingPlanOf(plans);
    if (!plan || plan.status !== "active") continue;
    for (const intervention of plan.interventions) {
      if (!OPEN_LOOP_STATUSES.includes(intervention.status)) continue;
      out.push({
        patientId,
        planId: plan.id,
        focusId: intervention.focusId,
        intervention,
        reason: intervention.status as "overdue" | "blocked" | "due" | "in_progress",
      });
    }
  }
  /* Deterministic ordering: most-urgent reason first, then stable insertion order. */
  return out
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const byReason = NEXT_ACTION_PRIORITY[a.item.reason] - NEXT_ACTION_PRIORITY[b.item.reason];
      return byReason !== 0 ? byReason : a.index - b.index;
    })
    .map(({ item }) => item);
}

/* Care Programs cohort — patients whose living plan has a focus enrolledVia the
   given protocol, with their current focus state + nextReview. For Care Programs PR4. */
export type ProgramCohortMember = {
  patientId: string;
  planId: string;
  focus: ClinicalFocus;
  focusStatus: NonNullable<ClinicalFocus["focusStatus"]>;
  atRisk: boolean;
  openLoop: number;
  nextReview?: string;
};

export function selectProgramCohortFrom(
  byPatient: ReadonlyMap<string, CarePlan[]>,
  protocolKey: string,
): ProgramCohortMember[] {
  const out: ProgramCohortMember[] = [];
  for (const [patientId, plans] of byPatient) {
    const plan = livingPlanOf(plans);
    if (!plan) continue;
    for (const focus of plan.focuses) {
      if (focus.enrolledVia !== "protocol" || focus.protocolKey !== protocolKey) continue;
      out.push({
        patientId,
        planId: plan.id,
        focus,
        focusStatus: focus.focusStatus ?? "active",
        atRisk: focusIsAtRisk(plan, focus.id),
        openLoop: interventionsForFocus(plan, focus.id).filter((i) => OPEN_LOOP_STATUSES.includes(i.status)).length,
        nextReview: focus.nextReview ?? plan.nextReview,
      });
    }
  }
  return out;
}

/* Plan deltas appended since the most-recent review on the living plan — the
   "what changed since we last looked" stream for a review prompt. Reviews carry no
   wall-clock comparator here (dates are display strings), so "since last review" is
   defined positionally: deltas live newest-first, reviews live newest-first, and a
   delta counts as "since" until we have a real timestamp model. We surface ALL
   current deltas plus the latest review version as the comparison anchor — callers
   in PR-later can refine once a timestamp model lands. */
export type PlanChangesSinceReview = {
  sinceVersion: number; // version of the latest review (anchor), 0 if none
  deltas: CarePlan["deltas"];
};

export function selectPlanChangesSinceLastReviewFrom(plans: CarePlan[]): PlanChangesSinceReview {
  const plan = livingPlanOf(plans);
  if (!plan) return { sinceVersion: 0, deltas: [] };
  const latestReviewVersion = plan.reviews.reduce((max, r) => (r.version > max ? r.version : max), 0);
  return { sinceVersion: latestReviewVersion, deltas: plan.deltas ?? [] };
}
