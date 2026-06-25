/* =============================================================================
   Care Plan domain — RESULT REVIEW (pure, shared by desktop + mobile).

   The flagship PR5 helper. A result comes back; the doctor reviews "what changed /
   why it matters / relevant current treatment" and signs ONE change-set seeded from
   the result. Desktop (PlanReviewDrawer) and mobile (EncounterContext) BOTH consume
   the helpers here so the two surfaces never drift.

   This module is PURE: every function derives its output from the living plan + the
   result passed in. No store access, no I/O, no clock — exactly like selectors.ts.
   ids/timestamps for the ACTUAL write are minted later by commitPlanChangeSet (the
   only nondeterminism), so the suggested change-set this module returns carries no
   ids and no dates beyond what the caller supplies.

   It reuses the domain's living-plan / goal / intervention / medication model and
   emits valid PlanChange objects that commitPlanChangeSet already accepts — it never
   duplicates or forks the commit logic.
   ============================================================================= */

import type { PlanChange, PlanChangeSet } from "./commands";
import { goalsForFocus, livingPlanOf } from "./selectors";
import type { CarePlan, Goal, GoalAchievement, Tone } from "./types";

/* ----------------------------- result input shape -------------------------- */

/* Triage tier mirrored from the order/result surfaces (OrderDraft ResultSeverity),
   re-declared here so the domain stays dependency-free. critical = abnormal + a
   danger-tone signal; normal = in range. */
export type ResultSeverity = "critical" | "abnormal" | "normal";

/* One measured analyte in a result. `trendKey` is the SAME key goals/monitoring use
   (Goal.trendKey / MonitoringRule.trendKey, e.g. "BIOCHEMISTRY||HbA1c"), so a result
   value can be matched to the goal it serves without any string parsing here. */
export type ResultAnalyte = {
  trendKey?: string;
  label: string; // human label at result time, e.g. "HbA1c"
  value?: string; // measured value as displayed, e.g. "8.1"
  unit?: string;
  flag?: "high" | "low" | "normal" | "critical";
};

/* The minimal, structural result a review needs. Both desktop (mapped from a placed
   booking + its result lines) and mobile (mapped from the encounter result) can
   satisfy this — neither imports the other's types. */
export type ResultReviewInput = {
  /* order/result ref the loop closes on (PlacedOrderSummary.code / booking code). */
  code: string;
  label?: string; // panel/test name, e.g. "HbA1c"
  severity: ResultSeverity;
  analytes?: ResultAnalyte[];
  /* doctor's free-text reading, if already captured at review open. */
  interpretation?: string;
};

/* --------------------------------- summary --------------------------------- */

export type ResultReviewSummary = {
  /* "What changed" — the result, stated against its goal/baseline when one matches. */
  whatChanged: string;
  /* "Why it matters" — the clinical consequence, tone-carried for the surface. */
  whyItMatters: string;
  whyTone: Tone;
  /* "Relevant current treatment" — the medications + interventions this focus is
     already running, so the doctor reads it without a second trip to Care Plan. */
  relevantTreatment: RelevantTreatment;
  /* the focus this result was read against, if resolved. */
  focusId?: string;
  focusLabel?: string;
};

export type RelevantTreatment = {
  /* current medications attached to the focus (by indication / focusId). */
  medications: TreatmentMed[];
  /* the goal this result speaks to, if matched. */
  goalLabel?: string;
  goalTarget?: string;
  goalLatest?: string;
  /* open interventions on the focus, named (e.g. "Repeat HbA1c", "Dietitian"). */
  openInterventions: string[];
};

export type TreatmentMed = {
  drug: string;
  dose?: string;
  frequency?: string;
};

/* The plan REFERENCES medications by id and the drug fields live in the medication
   store, not on the plan. To keep this helper pure (no store), the caller passes the
   patient's current medications alongside the plan. Desktop/mobile both already hold
   them (useMedications). */
export type MedicationLike = {
  drug: string;
  dose?: string;
  frequency?: string;
  focusId?: string;
  indication?: string;
  verification?: string;
};

const SEVERITY_TONE: Record<ResultSeverity, Tone> = {
  critical: "danger",
  abnormal: "warning",
  normal: "success",
};

/* Resolve the focus a result belongs to: explicit focusId wins; else the focus that
   owns a goal/monitoring rule whose trendKey matches one of the result analytes;
   else undefined. Deterministic — first match in plan order. */
function resolveFocusId(plan: CarePlan, focusId: string | undefined, result: ResultReviewInput): string | undefined {
  if (focusId) return focusId;
  const keys = new Set((result.analytes ?? []).map((a) => a.trendKey).filter((k): k is string => !!k));
  if (keys.size === 0) return undefined;
  const goal = plan.goals.find((g) => g.trendKey && keys.has(g.trendKey));
  if (goal?.focusId) return goal.focusId;
  const rule = plan.monitoring.find((m) => m.trendKey && keys.has(m.trendKey));
  return rule?.focusId;
}

/* The goal a result speaks to: matched by a shared trendKey, scoped to the focus
   when one is known. Deterministic first match. */
function matchGoal(plan: CarePlan, focusId: string | undefined, result: ResultReviewInput): Goal | undefined {
  const keys = new Set((result.analytes ?? []).map((a) => a.trendKey).filter((k): k is string => !!k));
  if (keys.size === 0) return undefined;
  const scope = focusId ? goalsForFocus(plan, focusId) : plan.goals;
  return scope.find((g) => g.trendKey && keys.has(g.trendKey)) ?? plan.goals.find((g) => g.trendKey && keys.has(g.trendKey));
}

function abnormalAnalytes(result: ResultReviewInput): ResultAnalyte[] {
  return (result.analytes ?? []).filter((a) => a.flag === "high" || a.flag === "low" || a.flag === "critical");
}

function analyteText(a: ResultAnalyte): string {
  const val = [a.value, a.unit].filter(Boolean).join(" ");
  return val ? `${a.label} ${val}` : a.label;
}

/* resultReviewSummary — the "What changed · Why it matters · Relevant current
   treatment" structure the review surface renders. Pure + deterministic. */
export function resultReviewSummary(
  plan: CarePlan,
  focusId: string | undefined,
  result: ResultReviewInput,
  medications: MedicationLike[] = [],
): ResultReviewSummary {
  const resolvedFocusId = resolveFocusId(plan, focusId, result);
  const focus = resolvedFocusId ? plan.focuses.find((f) => f.id === resolvedFocusId) : undefined;
  const goal = matchGoal(plan, resolvedFocusId, result);
  const abnormal = abnormalAnalytes(result);

  /* What changed — lead with the panel, then the abnormal analytes vs the goal
     target when one is matched, else the headline value. */
  const panel = result.label ?? "Result";
  const changedParts: string[] = [];
  if (abnormal.length > 0) {
    changedParts.push(abnormal.map(analyteText).join(", "));
  } else if (result.analytes && result.analytes.length > 0) {
    changedParts.push(analyteText(result.analytes[0]));
  }
  if (goal?.target) changedParts.push(`target ${goal.target}`);
  const whatChanged = changedParts.length > 0 ? `${panel}: ${changedParts.join(" · ")}` : `${panel} returned`;

  /* Why it matters — severity-led, focus-aware, no datum repeated from whatChanged. */
  const whyTone = SEVERITY_TONE[result.severity];
  let whyItMatters: string;
  if (result.severity === "critical") {
    whyItMatters = focus ? `Critical for ${focus.shortLabel ?? focus.label} — needs action now` : "Critical — needs action now";
  } else if (result.severity === "abnormal") {
    whyItMatters = goal
      ? "Off target — the plan needs to change to get back on track"
      : focus
        ? `Out of range for ${focus.shortLabel ?? focus.label}`
        : "Out of range";
  } else {
    whyItMatters = goal ? "On target — no change needed" : "In range";
  }

  /* Relevant current treatment — meds on the focus + the matched goal state + open
     interventions, so the doctor decides without leaving the surface. */
  const focusMeds = medications.filter(
    (m) =>
      m.verification !== "no_longer_taking" &&
      (resolvedFocusId ? m.focusId === resolvedFocusId : true),
  );
  const openInterventions = (resolvedFocusId
    ? plan.interventions.filter((i) => i.focusId === resolvedFocusId)
    : plan.interventions
  )
    .filter((i) => i.status === "due" || i.status === "overdue" || i.status === "in_progress")
    .map((i) => i.label);

  const relevantTreatment: RelevantTreatment = {
    medications: focusMeds.map((m) => ({ drug: m.drug, dose: m.dose, frequency: m.frequency })),
    goalLabel: goal?.label,
    goalTarget: goal?.target,
    goalLatest: goal?.latest,
    openInterventions,
  };

  return {
    whatChanged,
    whyItMatters,
    whyTone,
    relevantTreatment,
    focusId: resolvedFocusId,
    focusLabel: focus?.shortLabel ?? focus?.label,
  };
}

/* ------------------------------ change-set seed ---------------------------- */

/* Map a result flag to the goal achievement it implies — only used to SUGGEST a
   goal_update the doctor can remove. Deterministic. */
function achievementFor(severity: ResultSeverity): GoalAchievement {
  if (severity === "critical") return "worsening";
  if (severity === "abnormal") return "at_risk";
  return "on_track";
}

/* deriveResultReviewChangeSet — a SUGGESTED PlanChangeSet seeded from the result.
   Every change is a proposal the doctor reviews + can remove before signing ONCE.
   Each entry is a valid PlanChange that commitPlanChangeSet already accepts.

   Seeding rules (each gated so we never propose a no-op or a duplicate datum):
     - goal_update   — when a goal matches the result, patch latest + achievement.
     - follow_up     — a repeat-lab follow-up for the abnormal/critical panel.
     - instruction   — patient-facing safety-net line on a critical result.
   A med change is intentionally NOT auto-proposed (a drug start/stop is a clinical
   decision, not a derivation); the surface offers it as a manual add. */
export function deriveResultReviewChangeSet(
  plan: CarePlan,
  focusId: string | undefined,
  result: ResultReviewInput,
): PlanChangeSet {
  const changes: PlanChange[] = [];
  const resolvedFocusId = resolveFocusId(plan, focusId, result);
  const goal = matchGoal(plan, resolvedFocusId, result);
  const headline = result.analytes?.find((a) => a.flag === "critical" || a.flag === "high" || a.flag === "low") ?? result.analytes?.[0];

  /* goal_update — only when a goal matches AND there is something to change. */
  if (goal) {
    const nextAchievement = achievementFor(result.severity);
    const latest = headline ? [headline.value, headline.unit].filter(Boolean).join(" ") || undefined : undefined;
    const goalChange: PlanChange = {
      kind: "goal_update",
      goalId: goal.id,
      patch: {
        ...(latest ? { latest } : {}),
        ...(goal.achievement !== nextAchievement ? { achievement: nextAchievement } : {}),
      },
    };
    if (Object.keys(goalChange.patch).length > 0) changes.push(goalChange);
  }

  /* follow_up — repeat the panel when the result was abnormal/critical. */
  if (result.severity !== "normal") {
    const panel = result.label ?? headline?.label ?? "lab";
    changes.push({
      kind: "follow_up",
      label: `Repeat ${panel}`,
      focusId: resolvedFocusId,
    });
  }

  /* instruction — patient safety-net only on a critical result. */
  if (result.severity === "critical") {
    changes.push({
      kind: "instruction",
      label: `Review ${result.label ?? "result"} with your care team`,
      focusId: resolvedFocusId,
      whenToContact: "Contact the clinic today if you feel unwell",
    });
  }

  return { patientId: plan.patientId, changes };
}

/* Convenience for callers that hold a patient's whole plan list rather than the
   resolved living plan (mobile + desktop both go through the barrel). Returns an
   empty change-set when there is no living plan. */
export function deriveResultReviewChangeSetFromPlans(
  plans: CarePlan[],
  focusId: string | undefined,
  result: ResultReviewInput,
): PlanChangeSet {
  const living = livingPlanOf(plans);
  if (!living) return { patientId: "", changes: [] };
  return deriveResultReviewChangeSet(living, focusId, result);
}
