/* =============================================================================
   Care Plan domain — PUBLIC SURFACE.

   ONE place every consumer imports from. Desktop / mobile / Care Programs all reach
   the care-plan domain through this barrel. The legacy path
   "@/components/CarePlan/carePlanModel" is now a thin re-export shim over this.

   Layering: types (pure) → protocol (pure) → events (pure) → status (pure) →
   selectors (pure) → store ("use client", owns nondeterminism) → commands
   ("use client", imperative writers). The barrel preserves the original public API
   and adds the PR1 shared capabilities.
   ============================================================================= */

/* Types + display constant maps. */
export * from "./types";

/* Pure read helpers (incl. the PR1 cross-patient selectors' pure cores). */
export * from "./selectors";

/* Protocol definitions (future single source for Care Programs). */
export * from "./protocol";

/* Domain event union (typed inputs for the command layer). */
export * from "./events";

/* Evidence-derived status helpers (single source for InterventionStatus). */
export * from "./status";

/* Store: hooks, store-bound selectors, low-level mutators, internal id source.
   The imperative writers (appendPlanDelta / addMedicationFor / setMedVerificationFor)
   are surfaced via commands below, so they are NOT re-exported from store here to
   avoid ambiguous duplicate exports. */
export {
  // hooks
  useCarePlans,
  useMedications,
  useProtocolDefinitions,
  getProtocolDefinition,
  getProtocolDefinitions,
  updateProtocolDefinition,
  // store-bound selectors / roll-ups
  carePlanSummaryFor,
  selectNextPlanAction,
  selectCrossPatientPlanWork,
  selectProgramCohort,
  selectPlanChangesSinceLastReview,
  // store internals exposed for advanced consumers / commands
  ensure,
  ensureMeds,
  emit,
  update,
  setPlans,
  withHistory,
  nowLabel,
  hid,
  nextSeqId,
  snapshotAllPlans,
  // PR4 Care Programs additive seed helpers
  programPatientName,
  programPatientProfile,
  PROGRAM_PATIENT_PROFILES,
  PROGRAM_SEED_PATIENT_IDS,
  type ProgramPatientProfile,
  // action type
  type CarePlanActions,
} from "./store";

/* Commands: imperative writers + the PR1 batch / protocol / coverage / med commands.
   This re-exports appendPlanDelta / addMedicationFor / setMedVerificationFor (the
   single canonical site for plan-mutating writers). */
export * from "./commands";

/* PR5 result-review — pure shared helper both desktop + mobile result-review use to
   derive the review summary and the suggested (pre-commit) PlanChangeSet. */
export * from "./resultReview";

/* Care loop draft — the grouped issue + editable AI plan shown before signing. */
export * from "./careLoop";
