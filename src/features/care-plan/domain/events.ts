/* =============================================================================
   Care Plan domain — DOMAIN EVENTS.

   A DomainEvent is the structured record of a clinical action that happened
   ELSEWHERE in the product (order flow, Rx flow, results, scheduling, referrals,
   instructions, medication reconciliation, protocol enrolment, plan commits). The
   care plan accumulates from these events — the doctor never re-types the change
   into the plan.

   These are the typed, serializable inputs the command layer consumes. They are
   distinct from PlanDelta (the patient-facing "what changed" line) and from
   HistoryEntry (the system audit): an event may produce zero, one, or several of
   those. Pure types only — no store, no behavior here.
   ============================================================================= */

import type { MedSource } from "./types";

/* Common envelope. `at`/`actor` are display strings (the prototype has no real
   timestamp model); commands fill them deterministically when omitted. */
export type DomainEventBase = {
  patientId: string;
  at?: string;
  actor?: string;
};

export type LabOrderPlacedEvent = DomainEventBase & {
  type: "LabOrderPlaced";
  focusId?: string;
  interventionId?: string;
  labKeys: string[];
  orderRef?: string;
  rationale?: string;
};

export type ResultFinalizedEvent = DomainEventBase & {
  type: "ResultFinalized";
  focusId?: string;
  interventionId?: string;
  trendKey: string;
  value: string;
  resultRef?: string;
};

export type ResultReviewedEvent = DomainEventBase & {
  type: "ResultReviewed";
  focusId?: string;
  interventionId?: string;
  resultRef?: string;
  note?: string;
};

export type PrescriptionSignedEvent = DomainEventBase & {
  type: "PrescriptionSigned";
  focusId?: string;
  drug: string;
  dose?: string;
  frequency?: string;
  route?: string;
  indication?: string;
  rxRef?: string;
};

export type AppointmentScheduledEvent = DomainEventBase & {
  type: "AppointmentScheduled";
  focusId?: string;
  interventionId?: string;
  whenLabel: string; // e.g. "in 3 months"
  reason?: string;
};

export type ReferralCreatedEvent = DomainEventBase & {
  type: "ReferralCreated";
  focusId?: string;
  interventionId?: string;
  service: string;
  destination?: string;
  urgency?: string;
  referralRef?: string;
};

export type InstructionSharedEvent = DomainEventBase & {
  type: "InstructionShared";
  focusId?: string;
  interventionId?: string;
  label: string;
  whenToContact?: string;
};

export type ExternalMedicationVerifiedEvent = DomainEventBase & {
  type: "ExternalMedicationVerified";
  focusId?: string;
  medId?: string;
  drug: string;
  source: MedSource;
};

export type CareFocusEnrolledEvent = DomainEventBase & {
  type: "CareFocusEnrolled";
  focusId: string;
  protocolKey?: string;
  protocolName?: string;
  enrolledVia: "consultation" | "protocol";
};

export type PlanChangeSetCommittedEvent = DomainEventBase & {
  type: "PlanChangeSetCommitted";
  planId: string;
  fromVersion: number;
  toVersion: number;
  changeCount: number;
};

export type DomainEvent =
  | LabOrderPlacedEvent
  | ResultFinalizedEvent
  | ResultReviewedEvent
  | PrescriptionSignedEvent
  | AppointmentScheduledEvent
  | ReferralCreatedEvent
  | InstructionSharedEvent
  | ExternalMedicationVerifiedEvent
  | CareFocusEnrolledEvent
  | PlanChangeSetCommittedEvent;

export type DomainEventType = DomainEvent["type"];
