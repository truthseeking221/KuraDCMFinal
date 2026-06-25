"use client";

/* =============================================================================
   Care Plan domain — COMMANDS (imperative writers).

   The command layer is the ONLY place that mutates the living plan from clinical
   work. It re-exports the original low-level writers (appendPlanDelta,
   addMedicationFor, setMedVerificationFor) and adds the batch / protocol / coverage
   commands later PRs need. Each command:
     - reads the live store via the store layer,
     - applies a deterministic transformation (the store owns all nondeterminism),
     - appends the matching PlanDelta(s),
     - bumps plan version where the change is structural,
     - emits once.

   Commands are "pure-ish over the store": given the same store state + inputs they
   produce the same plan shape (ids/timestamps come from the store's single id
   source, the only nondeterminism, exactly as the original module did).
   ============================================================================= */

import {
  LDL_KEY,
  PROTOCOLS,
  protocolByKey,
  type ProtocolDefinition,
  type ProtocolKey,
} from "./protocol";
import { livingPlanOf } from "./selectors";
import {
  addMedicationFor,
  appendPlanDelta,
  emit,
  ensure,
  ensureMeds,
  freshLivingPlan,
  getProtocolDefinition,
  nextSeqId,
  nowLabel,
  setMedVerificationFor,
  setPlans,
  withHistory,
} from "./store";
import { nextDueFromCadence } from "./status";
import type {
  ClinicalFocus,
  Goal,
  Intervention,
  InterventionStatus,
  MedSource,
  MonitoringRule,
  PatientInstruction,
  PlanDelta,
  PlanDeltaAction,
} from "./types";

/* Re-export the original imperative writers so the command layer is the single
   import site for "things that mutate the plan from clinical work". */
export { addMedicationFor, appendPlanDelta, setMedVerificationFor };

/* ----------------------------- plan change sets ---------------------------- */

/* A single proposed change to the living plan. Each variant carries exactly the
   payload the commit needs; commit derives the PlanDelta + version bump. */
export type PlanChange =
  | { kind: "med_add"; drug: string; dose?: string; frequency?: string; route?: string; indication?: string; focusId?: string; source?: MedSource }
  | { kind: "med_stop"; medId: string; reason?: string }
  | { kind: "intervention_add"; intervention: Omit<Intervention, "id">; focusId?: string }
  | { kind: "goal_update"; goalId: string; patch: Partial<Pick<Goal, "target" | "latest" | "latestDate" | "achievement" | "lifecycle">> }
  | { kind: "follow_up"; label: string; focusId?: string; due?: string }
  | { kind: "instruction"; label: string; focusId?: string; whenToContact?: string };

/* A batch of proposed changes the doctor can review before committing. Building it
   is free (no store write); commitPlanChangeSet applies it atomically. */
export type PlanChangeSet = {
  patientId: string;
  changes: PlanChange[];
};

export function proposePlanChange(patientId: string, changes: PlanChange[]): PlanChangeSet {
  return { patientId, changes };
}

export type CommitResult = {
  committed: boolean;
  version: number; // the new plan version (unchanged if nothing committed)
  appliedCount: number;
};

/* Commit applies every change to the living plan, appends a PlanDelta per change,
   bumps the plan version once, writes history, and returns the new version.
   No-ops (returns the current version) when there is no active living plan. */
export function commitPlanChangeSet(set: PlanChangeSet): CommitResult {
  const plans = ensure(set.patientId);
  const living = livingPlanOf(plans);
  if (!living || living.status !== "active" || set.changes.length === 0) {
    return { committed: false, version: living?.version ?? 0, appliedCount: 0 };
  }

  const newVersion = living.version + 1;
  let goals = living.goals;
  let interventions = living.interventions;
  let instructions = living.instructions ?? [];
  const deltas: PlanDelta[] = [];
  let applied = 0;

  for (const change of set.changes) {
    switch (change.kind) {
      case "med_add": {
        addMedicationFor(set.patientId, {
          drug: change.drug,
          dose: change.dose,
          frequency: change.frequency,
          route: change.route,
          indication: change.indication,
          focusId: change.focusId,
          source: change.source ?? "kura_prescribed",
          verification: "confirmed",
          verifiedBy: "Dr Dara",
        });
        deltas.push(makeDelta("rx_signed", change.focusId, `Added ${change.drug}${change.dose ? ` ${change.dose}` : ""}`));
        applied += 1;
        break;
      }
      case "med_stop": {
        setMedVerificationFor(set.patientId, change.medId, "no_longer_taking");
        deltas.push(makeDelta("rx_signed", undefined, "Medication stopped", change.reason));
        applied += 1;
        break;
      }
      case "intervention_add": {
        const intervention: Intervention = {
          ...change.intervention,
          id: nextSeqId("i"),
          focusId: change.intervention.focusId ?? change.focusId,
        };
        interventions = [...interventions, intervention];
        deltas.push(makeDelta("advice_given", intervention.focusId, intervention.label, intervention.detail));
        applied += 1;
        break;
      }
      case "goal_update": {
        goals = goals.map((g) => (g.id === change.goalId ? { ...g, ...change.patch } : g));
        const focusId = goals.find((g) => g.id === change.goalId)?.focusId;
        deltas.push(makeDelta("result_reviewed", focusId, "Goal updated"));
        applied += 1;
        break;
      }
      case "follow_up": {
        const intervention: Intervention = {
          id: nextSeqId("i"),
          kind: "follow_up",
          label: change.label,
          owner: living.team.responsible,
          focusId: change.focusId,
          due: change.due,
          status: "planned",
        };
        interventions = [...interventions, intervention];
        deltas.push(makeDelta("follow_up_scheduled", change.focusId, change.label));
        applied += 1;
        break;
      }
      case "instruction": {
        const instruction: PatientInstruction = {
          id: nextSeqId("pi"),
          focusId: change.focusId,
          label: change.label,
          whenToContact: change.whenToContact,
        };
        instructions = [...instructions, instruction];
        deltas.push(makeDelta("advice_given", change.focusId, change.label));
        applied += 1;
        break;
      }
      default: {
        /* Exhaustiveness guard — unreachable; every PlanChange kind is handled. */
        const _exhaustive: never = change;
        void _exhaustive;
        break;
      }
    }
  }

  const nextPlan = withHistory(
    {
      ...living,
      version: newVersion,
      goals,
      interventions,
      instructions,
      deltas: [...deltas.reverse(), ...(living.deltas ?? [])],
    },
    "Plan change set committed",
    `v${living.version} → v${newVersion} · ${applied} change${applied === 1 ? "" : "s"}`,
  );

  setPlans(
    set.patientId,
    plans.map((p) => (p.id === living.id ? nextPlan : p)),
  );
  return { committed: true, version: newVersion, appliedCount: applied };
}

function makeDelta(action: PlanDeltaAction, focusId: string | undefined, summary: string, detail?: string): PlanDelta {
  return { id: nextSeqId("d"), at: nowLabel(), actor: "Dr Dara", action, focusId, summary, detail };
}

/* --------------------------- protocol enrolment ---------------------------- */

export type AddFocusFromProtocolOpts = {
  /* Step keys already satisfied — those interventions are seeded 'completed' instead
     of 'due', so PR4/PR5 callers can enrol without forcing redundant work. */
  satisfiedBy?: string[];
  /* Anchor label for cadence-derived due dates (e.g. "21 May 2026"). */
  fromLabel?: string;
  /* Override the focus id (else derived from the protocol key). */
  focusId?: string;
  reason?: string;
  evidence?: string;
};

export type AddFocusResult = {
  added: boolean;
  focusId: string;
  version: number;
  reason?: "missing_protocol" | "already_enrolled";
};

/* Creates a ClinicalFocus enrolledVia 'protocol' on the living plan, plus a Goal per
   protocol target and an Intervention per protocol step. Steps named in
   opts.satisfiedBy are seeded 'completed'; the rest are 'due'. Bumps the plan version,
   appends a CareFocusEnrolled-style history line, and returns the new focus id. */
export function addFocusFromProtocol(
  patientId: string,
  protocol: ProtocolDefinition | ProtocolKey,
  opts: AddFocusFromProtocolOpts = {},
): AddFocusResult {
  const def: ProtocolDefinition | null =
    typeof protocol === "string" ? getProtocolDefinition(protocol) ?? protocolByKey(protocol) ?? PROTOCOLS[protocol] ?? null : protocol;
  if (!def) return { added: false, focusId: "", version: 0, reason: "missing_protocol" };
  const plans = ensure(patientId);
  const existing = livingPlanOf(plans);
  /* Create the living plan on first focus (chart "Add care focus" / first
     clinical action), or reactivate a dormant one — never fail for "no plan". */
  const isNew = !existing;
  const base = existing ?? freshLivingPlan(patientId);
  const living = base.status === "active" ? base : { ...base, status: "active" as const };
  const existingFocus = living.focuses.find(
    (focus) => focus.protocolKey === def.key && (focus.focusStatus ?? "active") !== "archived",
  );
  if (existingFocus) {
    return {
      added: false,
      focusId: existingFocus.id,
      version: living.version,
      reason: "already_enrolled",
    };
  }

  const focusId = opts.focusId ?? `f-${def.key}-${nextSeqId("x")}`;
  const satisfied = new Set(opts.satisfiedBy ?? []);

  const focus: ClinicalFocus = {
    id: focusId,
    label: def.name,
    shortLabel: def.shortLabel,
    coded: def.coded,
    status: "Newly added",
    reason: opts.reason ?? def.eligibility,
    evidence: opts.evidence,
    focusStatus: "active",
    enrolledAt: nowLabel(),
    enrolledVia: "protocol",
    protocolKey: def.key,
    protocolName: def.name,
    nextReview: nextDueFromCadence(def.reviewCadence, opts.fromLabel),
  };

  const goalIdByTarget = new Map<string, string>();
  const newGoals: Goal[] = def.targets.map((t) => {
    const goalId = `g-${def.key}-${t.key}-${nextSeqId("x")}`;
    goalIdByTarget.set(t.key, goalId);
    return {
      id: goalId,
      focusId,
      label: t.label,
      type: t.goalType,
      target: t.target,
      unit: t.unit,
      trendKey: t.trendKey,
      owner: living.team.responsible,
      lifecycle: "active",
      achievement: t.initialAchievement ?? "not_assessable",
      priority: t.priority,
    };
  });

  const newInterventions: Intervention[] = def.steps.map((s) => {
    const status: InterventionStatus = satisfied.has(s.key) ? "completed" : "due";
    return {
      id: `i-${def.key}-${s.key}-${nextSeqId("x")}`,
      kind: s.kind,
      label: s.label,
      detail: s.detail,
      focusId,
      goalId: s.targetKey ? goalIdByTarget.get(s.targetKey) : undefined,
      owner: s.owner ?? living.team.responsible,
      due: nextDueFromCadence(s.cadence, opts.fromLabel),
      frequency: s.cadence,
      status,
      order: s.order,
    };
  });

  const newMonitoring = def.steps
    .filter((s) => s.monitor)
    .map((s) => ({
      id: `m-${def.key}-${s.key}-${nextSeqId("x")}`,
      focusId,
      label: s.label,
      trendKey: s.monitor?.trendKey,
      target: s.monitor?.target,
      unit: s.monitor?.unit,
      frequency: s.cadence,
      alert: s.monitor?.alert,
    }));

  const newVersion = living.version + 1;
  const enrolDelta = makeDelta("icd_added", focusId, `Enrolled in ${def.name} program`, def.eligibility);

  const nextPlan = withHistory(
    {
      ...living,
      version: newVersion,
      focuses: [...living.focuses, focus],
      goals: [...living.goals, ...newGoals],
      interventions: [...living.interventions, ...newInterventions],
      monitoring: [...living.monitoring, ...newMonitoring],
      deltas: [enrolDelta, ...(living.deltas ?? [])],
    },
    "Care focus enrolled from protocol",
    `${def.name} · v${living.version} → v${newVersion}`,
  );

  setPlans(
    patientId,
    isNew ? [nextPlan, ...plans] : plans.map((p) => (p.id === living.id ? nextPlan : p)),
  );
  return { added: true, focusId, version: newVersion };
}

/* ----------------------------- cholesterol loop ---------------------------- */

export type StartCareLoopResult = {
  /* false = the loop already existed (idempotent no-op) */
  created: boolean;
  focusId: string;
  version: number;
};

/* startCholesterolLoop — the "Start cholesterol plan" sign action from the result
   review. Authors the demo's exact lipid care loop in ONE attributed event and is
   IDEMPOTENT: a re-sign finds the existing lipid focus and changes nothing (no
   duplicate focus, medication, repeat lab, or follow-up).

   It reuses the SAME store primitives addFocusFromProtocol uses (freshLivingPlan /
   setPlans / withHistory / nextSeqId / addMedicationFor), so it never forks the
   plan model — it just seeds the spec's authored content (LDL < 100, repeat in 3
   months, review 24 Sep 2026) which the generic lipid protocol (LDL < 70, 6-month
   cadence) does not match. Appends to the patient's living plan, creating one if
   the patient has none yet. */
export function startCholesterolLoop(
  patientId: string,
  opts: {
    reviewLabel?: string;
    repeatDueLabel?: string;
    ldlLatest?: string;
    /* Optional AI-drafted items the doctor can drop before signing. Core (focus,
       diagnosis, goal, repeat lab) always commits; these three are opt-out. */
    include?: { medication?: boolean; followUp?: boolean; reminder?: boolean };
  } = {},
): StartCareLoopResult {
  const reviewLabel = opts.reviewLabel ?? "24 Sep 2026";
  const repeatDueLabel = opts.repeatDueLabel ?? "in 3 months";
  const ldlLatest = opts.ldlLatest ?? "168 mg/dL";
  const withMed = opts.include?.medication ?? true;
  const withFollowUp = opts.include?.followUp ?? true;
  const withReminder = opts.include?.reminder ?? true;

  const plans = ensure(patientId);
  const existing = livingPlanOf(plans);
  const isNew = !existing;
  const base = existing ?? freshLivingPlan(patientId);
  const living = base.status === "active" ? base : { ...base, status: "active" as const };

  /* Idempotency key: a non-archived lipid focus already on the plan. */
  const already = living.focuses.find(
    (f) =>
      (f.protocolKey === "lipid_cvd" || f.coded === "E78.5") &&
      (f.focusStatus ?? "active") !== "archived",
  );
  if (already) return { created: false, focusId: already.id, version: living.version };

  const focusId = `f-lipid_cvd-${nextSeqId("x")}`;
  const goalId = `g-lipid-ldl-${nextSeqId("x")}`;
  const responsible = living.team.responsible;

  const focus: ClinicalFocus = {
    id: focusId,
    label: "Hyperlipidaemia",
    shortLabel: "Lipids",
    coded: "E78.5",
    status: "Newly added",
    reason: "LDL above target on first lipid panel.",
    evidence: "LDL 168 mg/dL · Total cholesterol 232 mg/dL · Triglycerides 180 mg/dL",
    focusStatus: "active",
    enrolledAt: nowLabel(),
    enrolledVia: "protocol",
    protocolKey: "lipid_cvd",
    protocolName: "Lipid / cardiovascular risk",
    nextReview: reviewLabel,
  };

  const goal: Goal = {
    id: goalId,
    focusId,
    label: "LDL cholesterol at target",
    type: "quantitative",
    target: "< 100 mg/dL",
    unit: "mg/dL",
    latest: ldlLatest,
    trendKey: LDL_KEY,
    owner: responsible,
    lifecycle: "active",
    achievement: "at_risk",
    priority: true,
  };

  /* Repeat lab is 'due' (not 'planned') so it surfaces in Next action, matching the
     spec's "next action: Repeat lipid panel" rather than sinking into Upcoming. */
  const repeatLab: Intervention = {
    id: `i-lipid-repeat-${nextSeqId("x")}`,
    kind: "lab",
    label: "Repeat lipid panel",
    detail: "Confirm LDL response to therapy.",
    focusId,
    goalId,
    owner: responsible,
    due: repeatDueLabel,
    frequency: "Every 3 months",
    status: "due",
    order: { labKeys: [LDL_KEY], rationale: "CVD risk · repeat lipid panel to confirm LDL response." },
  };

  const followUp: Intervention = {
    id: `i-lipid-review-${nextSeqId("x")}`,
    kind: "follow_up",
    label: "Review cholesterol plan after repeat lipids",
    focusId,
    owner: responsible,
    due: reviewLabel,
    status: "planned",
  };

  const monitoring: MonitoringRule = {
    id: `m-lipid-ldl-${nextSeqId("x")}`,
    focusId,
    label: "LDL cholesterol",
    trendKey: LDL_KEY,
    target: "< 100 mg/dL",
    unit: "mg/dL",
    latest: ldlLatest,
    frequency: "Every 3 months",
  };

  /* Patient-facing reminder mirror (the Telegram nudge), kept out of the clinical
     interventions per the domain's instruction/intervention split. */
  const instruction: PatientInstruction = {
    id: `pi-lipid-${nextSeqId("pi")}`,
    focusId,
    label: "Telegram reminder 1 week before repeat blood test",
  };

  const newVersion = living.version + 1;
  const deltas: PlanDelta[] = [
    makeDelta("icd_added", focusId, "Added E78.5 Hyperlipidaemia", "From cholesterol result review"),
    ...(withMed ? [makeDelta("rx_signed", focusId, "Prescribed Atorvastatin 10 mg", "Nightly")] : []),
    ...(withFollowUp
      ? [makeDelta("follow_up_scheduled", focusId, "Review cholesterol plan after repeat lipids", reviewLabel)]
      : []),
    makeDelta("result_reviewed", focusId, "Cholesterol plan started", "LDL 168 mg/dL · target < 100"),
  ];

  const nextPlan = withHistory(
    {
      ...living,
      version: newVersion,
      focuses: [...living.focuses, focus],
      goals: [...living.goals, goal],
      interventions: [...living.interventions, repeatLab, ...(withFollowUp ? [followUp] : [])],
      monitoring: [...living.monitoring, monitoring],
      instructions: withReminder ? [...(living.instructions ?? []), instruction] : living.instructions ?? [],
      deltas: [...deltas.reverse(), ...(living.deltas ?? [])],
    },
    "Cholesterol plan started",
    `Lipids · E78.5 · v${living.version} → v${newVersion}`,
  );

  setPlans(
    patientId,
    isNew ? [nextPlan, ...plans] : plans.map((p) => (p.id === living.id ? nextPlan : p)),
  );

  /* Medication lives in the separate med store (dedupes on drug+dose, so a re-sign
     never doubles the statin even outside the focus guard). */
  if (withMed) {
    addMedicationFor(patientId, {
      drug: "Atorvastatin",
      dose: "10 mg",
      frequency: "Nightly",
      route: "Oral",
      indication: "Hyperlipidaemia",
      focusId,
      source: "kura_prescribed",
      verification: "confirmed",
      verifiedBy: "Dr Dara",
    });
  }

  return { created: true, focusId, version: newVersion };
}

/* ------------------------------ coverage block ----------------------------- */

export type ResolveCoverageOutcome = "covered" | "preauth" | "self_pay" | "denied";

/* Resolve a coverage-blocked intervention. Evidence-aware: a 'covered'/'preauth'/
   'self_pay' outcome clears the block and moves the intervention back to 'due'; a
   'denied' outcome keeps it blocked but records the audited decision. Appends a delta
   and history; does NOT bump plan version (coverage is operational, not structural). */
export function resolveCoverageBlock(
  patientId: string,
  interventionId: string,
  outcome: ResolveCoverageOutcome,
  note?: string,
): boolean {
  const plans = ensure(patientId);
  const living = livingPlanOf(plans);
  if (!living || living.status !== "active") return false;
  const target = living.interventions.find((i) => i.id === interventionId);
  if (!target) return false;

  const cleared = outcome !== "denied";
  const coverage: NonNullable<Intervention["coverage"]> =
    outcome === "covered" ? "covered" : outcome === "preauth" ? "preauth" : outcome === "self_pay" ? "self_pay" : "denied";

  const interventions = living.interventions.map((i) =>
    i.id === interventionId
      ? {
          ...i,
          coverage,
          status: cleared ? ("due" as InterventionStatus) : i.status,
          blockReason: cleared ? undefined : (note ?? i.blockReason),
        }
      : i,
  );

  const delta = makeDelta(
    "result_reviewed",
    target.focusId,
    cleared ? `Coverage resolved — ${target.label}` : `Coverage denied — ${target.label}`,
    note,
  );

  const nextPlan = withHistory(
    { ...living, interventions, deltas: [delta, ...(living.deltas ?? [])] },
    cleared ? "Coverage block resolved" : "Coverage denied",
    note ?? target.label,
    "System",
  );

  setPlans(
    patientId,
    plans.map((p) => (p.id === living.id ? nextPlan : p)),
  );
  return true;
}

/* --------------------------- external medication --------------------------- */

export type VerifyExternalMedicationInput = {
  /* Verify an existing med by id, OR add+confirm a newly-reconciled external med. */
  medId?: string;
  drug?: string;
  dose?: string;
  frequency?: string;
  route?: string;
  indication?: string;
  focusId?: string;
  source?: MedSource; // defaults to external_clinician for new meds
};

/* Thin, evidence-aware external-medication verification. When medId is supplied it
   flips that med to 'confirmed' (source stays immutable — a patient-reported med
   stays patient-reported). Otherwise it adds the reconciled med as confirmed. Either
   way it appends an external_med_confirmed delta so the plan reflects the
   reconciliation. */
export function verifyExternalMedication(patientId: string, input: VerifyExternalMedicationInput): boolean {
  if (input.medId) {
    const exists = ensureMeds(patientId).some((m) => m.id === input.medId);
    if (!exists) return false;
    setMedVerificationFor(patientId, input.medId, "confirmed");
  } else if (input.drug) {
    addMedicationFor(patientId, {
      drug: input.drug,
      dose: input.dose,
      frequency: input.frequency,
      route: input.route,
      indication: input.indication,
      focusId: input.focusId,
      source: input.source ?? "external_clinician",
      verification: "confirmed",
      verifiedBy: "Dr Dara",
    });
  } else {
    return false;
  }

  appendPlanDelta(patientId, {
    actor: "Dr Dara",
    action: "external_med_confirmed",
    focusId: input.focusId,
    summary: input.drug ? `Confirmed external medication — ${input.drug}` : "Confirmed external medication",
  });
  /* appendPlanDelta already emits when a living plan exists; ensure a paint even when
     only the med store changed. */
  emit();
  return true;
}
