/* =============================================================================
   Care Plan domain — STATUS derivation.

   A SINGLE source for InterventionStatus derivation so UIs never set status
   directly. The clinical rule that matters: a LAB intervention is NOT a checkbox —
   it may only complete when there is EVIDENCE (a finalized/verified result, or an
   audited exception). A generic "mark done" is not enough. Other kinds may complete
   operationally, but completion is still routed through here so the rule lives in
   one place.

   Pure functions only — no store, no I/O, no nondeterminism.
   ============================================================================= */

import type { Intervention, InterventionStatus } from "./types";

/* The evidence a completion attempt can present. */
export type InterventionEvidence =
  | { kind: "result_finalized"; resultRef?: string; trendKey?: string; value?: string }
  | { kind: "result_verified"; resultRef?: string; verifiedBy?: string }
  | { kind: "audited_exception"; reason: string; by: string }
  | { kind: "execution_confirmed"; ref?: string } // a non-lab action confirmed done
  | { kind: "none" };

export type CompletionCheck =
  | { ok: true; status: "completed" }
  | { ok: false; reason: string };

/* Kinds whose completion REQUIRES clinical evidence (a finalized/verified result
   or an audited exception), never a bare mark-done. */
const EVIDENCE_REQUIRED_KINDS = new Set<Intervention["kind"]>(["lab", "imaging"]);

function isResultEvidence(evidence: InterventionEvidence): boolean {
  return evidence.kind === "result_finalized" || evidence.kind === "result_verified";
}

/* Can this intervention be completed given the supplied evidence?
   - lab/imaging: require a finalized/verified result OR an audited exception.
   - everything else: an execution-confirmed (or result) evidence is enough; a bare
     "none" is rejected so completion is always something that actually happened. */
export function canCompleteIntervention(
  intervention: Intervention,
  evidence: InterventionEvidence,
): CompletionCheck {
  if (intervention.status === "completed") {
    return { ok: false, reason: "Intervention is already completed." };
  }

  if (EVIDENCE_REQUIRED_KINDS.has(intervention.kind)) {
    if (isResultEvidence(evidence) || evidence.kind === "audited_exception") {
      return { ok: true, status: "completed" };
    }
    return {
      ok: false,
      reason: `A ${intervention.kind} intervention can only be completed with a finalized/verified result or an audited exception.`,
    };
  }

  if (evidence.kind === "none") {
    return { ok: false, reason: "Completion needs evidence that the action actually happened." };
  }
  return { ok: true, status: "completed" };
}

/* Inputs a UI/flow can supply; status is DERIVED from them, never set directly. */
export type InterventionSignals = {
  hasOpenCoverageBlock?: boolean;
  blockReason?: string;
  declined?: boolean;
  declineReason?: string;
  executionStarted?: boolean; // an order/appointment/referral was placed
  isDue?: boolean; // cadence says it's time
  isOverdue?: boolean; // cadence elapsed without completion
  evidence?: InterventionEvidence; // present => completion attempt
};

/* The ONE place InterventionStatus is derived from signals. Precedence mirrors the
   existing model semantics: error-ish/operational states first, then completion
   (only if evidence permits), then due/overdue, else planned. */
export function deriveInterventionStatus(
  intervention: Intervention,
  signals: InterventionSignals,
): InterventionStatus {
  if (signals.declined) return "declined";
  if (signals.hasOpenCoverageBlock) return "blocked";

  if (signals.evidence && signals.evidence.kind !== "none") {
    const check = canCompleteIntervention(intervention, signals.evidence);
    if (check.ok) return "completed";
  }

  if (signals.executionStarted) return "in_progress";
  if (signals.isOverdue) return "overdue";
  if (signals.isDue) return "due";
  return "planned";
}

/* Cadence → next-due label. Deterministic: derives ONLY from the human cadence
   string and an explicit anchor label the caller passes in (never reads the clock).
   Returns a display string suitable for `Intervention.due`. The prototype models
   dates as display strings, so this composes a stable, readable hint rather than
   computing a real calendar date. */
export function nextDueFromCadence(cadence: string | undefined, fromLabel: string | undefined): string | undefined {
  if (!cadence) return undefined;
  const anchor = fromLabel && fromLabel.trim().length > 0 ? fromLabel : "enrolment";
  return `${cadence} (from ${anchor})`;
}

export function parseCadenceAnchorLabel(label: string): { cadence: string; anchor: string } | null {
  const match = /^(.+?) \(from (.+)\)$/.exec(label.trim());
  if (!match) return null;
  return { cadence: match[1], anchor: match[2] };
}

export function cadenceAnchorPhrase(label: string): string {
  const parsed = parseCadenceAnchorLabel(label);
  if (!parsed) return label;
  const cadence = parsed.cadence[0].toLowerCase() + parsed.cadence.slice(1);
  return parsed.anchor.toLowerCase() === "enrolment" ? `${cadence} after enrolment` : `${cadence} from ${parsed.anchor}`;
}
