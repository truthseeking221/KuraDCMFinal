/* =============================================================================
   Care Plan domain — CARE LOOP DRAFT (the AI suggestion surface).

   A CareLoopDraft is what the doctor reviews BEFORE signing: ONE grouped clinical
   issue (evidence joined into a single problem) plus an editable, visibly-draft AI
   plan. It is pure authored/derived content — no store, no commit. Signing is a
   SEPARATE step (startCholesterolLoop in commands.ts), so the draft can never
   auto-commit anything.

   Pure data + types only.
   ============================================================================= */

import type { Tone } from "./types";

/* One measured analyte shown as evidence for the grouped issue. flagLabel carries
   the abnormal meaning in TEXT (never colour alone). */
export type CareLoopEvidence = {
  label: string; // "LDL cholesterol"
  value: string; // "168 mg/dL"
  reference: string; // "< 100"
  flagLabel: string; // "High" | "Borderline" | "Normal"
  flagTone: Tone;
};

export type CareLoopProposalKind =
  | "diagnosis"
  | "medication"
  | "goal"
  | "repeat_lab"
  | "follow_up"
  | "reminder";

/* One AI-drafted plan item the doctor can keep or drop before signing. */
export type CareLoopProposal = {
  id: string;
  kind: CareLoopProposalKind;
  label: string; // "Atorvastatin 10 mg"
  detail?: string; // "Nightly"
  /* false = part of the loop's spine; cannot be removed (focus/diagnosis/goal/repeat). */
  optional: boolean;
};

export type CareLoopDraft = {
  loop: "cholesterol";
  patientId: string;
  /* the result/booking ref the review loop closes on, when one exists. */
  bookingCode?: string;
  issueTitle: string; // "Cholesterol needs review"
  statusLabel: string; // "Off target"
  statusTone: Tone;
  evidence: CareLoopEvidence[];
  proposals: CareLoopProposal[];
  primaryActionLabel: string; // "Start cholesterol plan"
};

/* The doctor's edited selection → the include flags startCholesterolLoop accepts.
   Only the optional proposals are toggleable; the spine always commits. */
export function loopIncludeFromKept(keptProposalIds: ReadonlySet<string>, draft: CareLoopDraft) {
  const kept = (kind: CareLoopProposalKind) =>
    draft.proposals.some((p) => p.kind === kind && (!p.optional || keptProposalIds.has(p.id)));
  return {
    medication: kept("medication"),
    followUp: kept("follow_up"),
    reminder: kept("reminder"),
  };
}

/* Dara Pich — the authored AI-suggestion case. First lipid panel back: LDL + total
   cholesterol high, triglycerides borderline; the rest normal. Grouped into one
   issue with the drafted statin plan. */
export const DARA_CHOLESTEROL_DRAFT: CareLoopDraft = {
  loop: "cholesterol",
  patientId: "dara-pich",
  bookingCode: "KO-2031-LIPID",
  issueTitle: "Cholesterol needs review",
  statusLabel: "Off target",
  statusTone: "warning",
  evidence: [
    { label: "LDL cholesterol", value: "168 mg/dL", reference: "< 100", flagLabel: "High", flagTone: "danger" },
    { label: "Total cholesterol", value: "232 mg/dL", reference: "< 200", flagLabel: "High", flagTone: "danger" },
    { label: "Triglycerides", value: "180 mg/dL", reference: "< 150", flagLabel: "Borderline", flagTone: "warning" },
  ],
  proposals: [
    { id: "dx", kind: "diagnosis", label: "E78.5 Hyperlipidaemia", optional: false },
    { id: "med", kind: "medication", label: "Atorvastatin 10 mg", detail: "Nightly", optional: true },
    { id: "goal", kind: "goal", label: "LDL below 100 mg/dL", detail: "From 168 mg/dL", optional: false },
    { id: "repeat", kind: "repeat_lab", label: "Repeat lipid panel in 3 months", optional: false },
    { id: "followup", kind: "follow_up", label: "Review cholesterol plan after repeat lipids", detail: "Tue 24 Sep 2026", optional: true },
    { id: "reminder-pt", kind: "reminder", label: "Patient: Telegram reminder 1 week before repeat blood test", optional: true },
  ],
  primaryActionLabel: "Start cholesterol plan",
};
