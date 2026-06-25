"use client";

/* Mobile Care Plan view-model — the SAME presentational rules the desktop PR2
   surface applies (PlanOutcomeRow's pill-gating, PlanActionRow's med badge,
   PlanAttentionList's urgency order + why-now), re-expressed here only because
   those helpers are internal to the desktop components. Every input is a domain
   value; nothing is set in the UI, so mobile can never drift from desktop.

   The shared, already-exported shaping (goalToOutcome) is imported directly from
   the domain — this file does NOT re-derive it. */

import {
  ACHIEVEMENT_LABEL,
  ACHIEVEMENT_TONE,
  type Goal,
  type GoalAchievement,
  type Intervention,
  type Medication,
  type NextPlanAction,
  type Tone,
} from "@/features/care-plan/domain";

/* ------------------------------ goal → outcome ----------------------------- */

/* The shared goal→outcome shaping (identical to the desktop PlanOutcomeRow's
   goalToOutcome, which is internal to that component): label + latest→target +
   the achievement signal. Baseline / source / owner / type / target date are
   Details concerns and never reach the row. */
export type OutcomeRowData = {
  id: string;
  label: string;
  latest?: string;
  target?: string;
  achievement?: GoalAchievement;
  trendKey?: string;
};

export function goalToOutcome(goal: Goal): OutcomeRowData {
  return {
    id: goal.id,
    label: goal.label,
    latest: goal.latest,
    target: goal.target,
    achievement: goal.achievement,
    trendKey: goal.trendKey,
  };
}

/* --------------------------- outcome achievement --------------------------- */

/* Mirrors PlanOutcomeRow.PILL_ACHIEVEMENTS — an achievement earns a pill ONLY
   when it carries a real signal (an exception or a closed result), never for the
   quiet happy-path states (on_track / improving / unchanged). */
const PILL_ACHIEVEMENTS = new Set<GoalAchievement>([
  "at_risk",
  "worsening",
  "not_assessable",
  "achieved",
  "partially_achieved",
  "not_achieved",
]);

export function achievementPill(
  achievement: GoalAchievement | undefined,
): { label: string; tone: Tone } | null {
  if (!achievement || !PILL_ACHIEVEMENTS.has(achievement)) return null;
  return { label: ACHIEVEMENT_LABEL[achievement], tone: ACHIEVEMENT_TONE[achievement] };
}

/* ----------------------------- next-action order --------------------------- */

/* Urgency-priority is the canonical concern of selectNextPlanAction in the
   domain (overdue → blocked → due → in_progress over OPEN_LOOP_STATUSES). We do
   NOT re-derive that decision here: the single primary action comes from
   selectNextPlanAction, and the Next-action LIST is ordered around it — primary
   pinned first, then the remaining open loops in stable order. The only ordering
   contract this file relies on is the domain's NextPlanAction["reason"] union,
   so a future change to the canonical priority can never silently desync mobile.

   `primary` is the NextPlanAction.intervention from the canonical selector (or
   null). Non-open-loop interventions never reach this; callers pre-filter on
   OPEN_LOOP_STATUSES. */
export function orderOpenLoop(openLoop: Intervention[], primary: Intervention | null): Intervention[] {
  if (!primary) return openLoop;
  const rest = openLoop.filter((i) => i.id !== primary.id);
  return [primary, ...rest];
}

/* Type guard: narrows the domain's NextPlanAction to its non-null shape, so the
   tab can pull the canonical primary intervention without re-deriving urgency. */
export function nextActionIntervention(action: NextPlanAction): Intervention | null {
  return action ? action.intervention : null;
}

/* Plain-language "why now" for an open-loop intervention — mirrors
   PlanAttentionList.whyNow. */
export function whyNow(intv: Intervention): string {
  switch (intv.status) {
    case "overdue":
      return intv.due ? `Overdue · was due ${intv.due}` : "Overdue";
    case "blocked":
      return intv.blockReason ?? "Blocked — resolve before it can proceed";
    case "due":
      return intv.due ? `Due ${intv.due}` : "Due now";
    case "in_progress":
      return intv.execution?.ref ? `In progress · ${intv.execution.ref}` : "In progress";
    default:
      return intv.due ? `Due ${intv.due}` : "";
  }
}

/* The single primary CTA an open-loop intervention earns. Coverage uses its OWN
   path (never the order handler) — mirrors PlanAttentionList.primaryCta. */
export type NextActionCta =
  | { kind: "order"; label: string }
  | { kind: "resolve-coverage"; label: string }
  | null;

export function nextActionCta(intv: Intervention): NextActionCta {
  if (intv.status === "blocked") return { kind: "resolve-coverage", label: "Resolve coverage" };
  if ((intv.kind === "lab" || intv.kind === "imaging") && intv.order && !intv.execution) {
    return { kind: "order", label: "Create order" };
  }
  return null;
}

/* ------------------------------- med badge --------------------------------- */

/* ONE badge max, exactly as PlanActionRow.medBadge: Kura-prescribed + confirmed
   → none; external/imported confirmed → "External"; unverified →
   "Needs verification"; disputed → "Disputed"; no-longer-taking → "Stopped".
   Confirmed patient-reported reads as plan-native (no badge). */
export function medBadge(med: Medication): { label: string; tone: Tone } | null {
  if (med.verification === "disputed") return { label: "Disputed", tone: "danger" };
  if (med.verification === "no_longer_taking") return { label: "Stopped", tone: "neutral" };
  if (med.verification === "unverified") return { label: "Needs verification", tone: "warning" };
  if (med.source === "external_clinician" || med.source === "imported") {
    return { label: "External", tone: "neutral" };
  }
  return null;
}
