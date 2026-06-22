/* Order draft (cart) types — one draft per patient, shared by every ordering
   surface: Labs rail, Orders tab, header popover, dock. */

export type OrderLineKind = "test" | "bundle" | "unlisted";

export type OrderLineSource =
  | "labs-followup" /* "Add follow up" on an out-of-range lab row */
  | "labs-suggested" /* "Suggested: repeat X" on a follow-up-due lab row */
  | "catalog-standalone" /* sidebar Lab Catalog cart, patient selected after tests */
  | "orders-catalog" /* checkbox / bundle toggle in the Orders catalog */
  | "reorder-from-booking" /* lines pulled from a placed booking back into the building draft */
  | "suggested"; /* seeded or suggested-tile additions */

export type SeverityTone = "danger" | "warning" | "info";

export type LabProvenance = {
  labKey: string; /* LabHistory row key, e.g. "BIOCHEMISTRY||Creatinine" */
  labName: string; /* row display name at add time, e.g. "Creatinine" */
  reasonText?: string; /* "Above range · persistent" */
  severityTone?: SeverityTone;
  source: OrderLineSource;
};

export type OrderDraftLine = {
  /* catalog itemId for test/bundle lines; `unlisted:${labKey}` otherwise */
  lineId: string;
  kind: OrderLineKind;
  itemId?: string;
  displayName: string;
  /* null renders "$—" (unlisted tests are priced at the front desk) */
  price: number | null;
  /* lab rows that motivated this line (n > 1 when e.g. Hgb + Hct → one CBC) */
  labRefs: LabProvenance[];
  source: OrderLineSource;
  /* monotonic sequence — NOT a timestamp (SSR-deterministic) */
  addedAt: number;
};

export type OrderRouteId = "clinic" | "psc";

/* PSC charge decision: pay now (cash in hand / KHQR via Telegram) or at the
   PSC counter. Clinic-route orders bill the insurer automatically. */
export type PscPayChoice = "cash" | "khqr" | "later";

export type OrderCheckout = {
  route: OrderRouteId | null;
  stat: boolean;
  pscPay: PscPayChoice | null;
  doctorFee: number;
};

export type OrderLedgerImpactKind = "earning-pending" | "earning-confirmed" | "doctor-owes-kura";

export type OrderLedgerImpact = {
  kind: OrderLedgerImpactKind;
  patientTotal: number;
  kuraShare: number;
  doctorCommission: number;
  doctorFee: number;
  doctorEarns: number;
  doctorOwes: number;
  balanceDelta: number;
  settlementCopy: string;
};

export type PaymentStatus =
  | "pending" /* PSC reorder etc. — settles at draw */
  | "collected"
  | "waiting" /* KHQR sent, not yet confirmed */
  | "deferred" /* pay later at the PSC counter */
  | "pending-claim" /* clinic route, insurer billed */
  | "claimed" /* claim settled once results are back */
  | "refunded" /* cancelled after money was taken (PSC) */
  | "voided"; /* cancelled before settlement / clinic claim */

export type OrderPayment = {
  label: string; /* "Cash", "KHQR via Telegram", "At PSC counter" */
  status: PaymentStatus;
};

export type BookingOrigin = "doctor-order" | "catalog-onramp" | "reorder";
export type DoctorPatientAssurance = "known-reused" | "provisional";

/* Who the verified phone belongs to relative to the patient being tested. A
   phone is a contact key, not an identity: only "self" makes it the patient's
   own primary phone. The rest mean the phone holder is NOT the patient. */
export type PhoneHolderRelationship =
  | "self"
  | "parent"
  | "child"
  | "guardian"
  | "guarantor"
  | "dependent"
  | "caregiver";

export type DoctorIdentityDecision = {
  /* known-confirmed       = phone resolved to one Kura patient, doctor confirmed
     dependent-confirmed   = phone holder is a guarantor/guardian; patient is an
                             existing dependent the doctor picked
     unknown-phone-provisional = no record on this phone; created after dedup
     shared-phone-provisional  = phone active on another patient; this is a
                                 different, not-yet-in-Kura person
     guarantor-provisional = new dependent minted under a verified holder phone */
  kind:
    | "known-confirmed"
    | "dependent-confirmed"
    | "unknown-phone-provisional"
    | "shared-phone-provisional"
    | "guarantor-provisional";
  verifiedPhone: string;
  candidateIds: string[];
  confirmedPatientId?: string;
  /* Identity-graph context (demo): set when the phone holder is not the patient,
     or when a duplicate preflight ran before a provisional was minted. */
  relationshipToPhoneHolder?: PhoneHolderRelationship;
  phoneHolderId?: string;
  phoneHolderName?: string;
  /* true once the no-match / shared-phone path ran the duplicate preflight */
  dedupChecked?: boolean;
};

/* In-clinic draws are legacy/prototype-only. Doctor Booking v1 is patient-in:
   doctor mints a PSC booking code, and internal reception confirms draw later. */
export type OrderDraftStatus = "building" | "preparing" | "placed";

export type TubeKind = "edta" | "sst" | "urine";

export type TubeSpec = {
  id: string;
  kind: TubeKind;
  name: string; /* "EDTA purple · 3 mL" */
  tests: string[]; /* display names grouped under this tube */
};

/* Doctor-facing lifecycle proxy for Bookings v1:
   scheduled    = JUST_CREATED / code sent / patient has not checked in
   in-progress  = SAMPLE_DRAWN / PSC confirmed draw
   results-back = RESULTS_BACK / doctor reviews or closes out
   Edits lock once results are back; cancellation also locks once money settles. */
export type BookingStatus = "scheduled" | "in-progress" | "results-back";

/* Doctor clinical-action state layered ON TOP of the operational results-back
   status. results-back means "the lab finished"; this means "the doctor closed
   the loop". Without it, a result can come back and silently rot.
   unreviewed → reviewed → notified → closed. */
export type ResultReviewState = "unreviewed" | "reviewed" | "notified" | "closed";

/* Triage tier for the results queue. critical = abnormal + a danger-tone signal. */
export type ResultSeverity = "critical" | "abnormal" | "normal";

export type PlacedOrderSummary = {
  code: string; /* internal ref, e.g. "ORD-0001" */
  bookingCode?: string; /* PSC friendly code the patient carries, "FZ-48210" style */
  handoverCode?: string; /* clinic STAT: read out to the courier */
  sweep?: string; /* clinic routine: "14:15–14:30 · Sok S." */
  route: OrderRouteId;
  stat: boolean;
  statFee: number;
  payment: OrderPayment;
  bookingStatus: BookingStatus;
  cancelled: boolean;
  lines: OrderDraftLine[]; /* frozen at place; editable while unlocked */
  total: number; /* patient-facing total incl. statFee + doctorFee */
  unpricedCount: number;
  ledgerImpact?: OrderLedgerImpact;
  origin?: BookingOrigin;
  doctorAttributed?: boolean;
  patientAssurance?: DoctorPatientAssurance;
  identityDecision?: DoctorIdentityDecision;
  /* relative age label ("today", "3mo ago") — display-only, SSR-deterministic */
  placedAt?: string;
  /* future visit day for a scheduled booking created today but not yet visited
     ("Tomorrow", "In 2 days") — display-only. Its presence is what makes a
     scheduled booking read as Upcoming rather than Today, so `placedAt` can stay
     honest ("today" = when it was created). */
  scheduledFor?: string;
  /* results-back with an abnormal/critical value — blocks "Reported" until a
     doctor reviews it in Labs (review is the close-out, not the result alone) */
  flagged?: boolean;
  /* doctor close-the-loop state on a results-back booking. Absent on a
     results-back booking is treated as "unreviewed" (so seeded results need
     review too). The non-results-back states leave this undefined. */
  resultReview?: ResultReviewState;
  resultSeverity?: ResultSeverity;
  /* doctor's free-text reading of the result, captured at review time */
  interpretation?: string;
  /* relative labels ("just now"), display-only, set client-side at action time */
  reviewedAt?: string;
  notifiedAt?: string;
  /* care-plan destination this order was filed under, carried from the draft at
     place time — lets a placed booking surface "· Diabetes follow-up". A
     recorded reference only; no care-plan store is mutated. Absent = standalone. */
  carePlanId?: string;
  carePlanTitle?: string;
};

/* A placed booking lifted out of its per-patient draft and decorated with the
   identity columns the global Bookings workspace renders. The patient-scoped
   rail uses PlacedOrderSummary directly; the cross-patient queue needs to name
   the patient on every row. */
export type BookingListItem = PlacedOrderSummary & {
  patientId: string;
  patientName: string;
  mrn: string;
  phoneMasked: string;
};

export type OrderDraft = {
  patientId: string;
  status: OrderDraftStatus;
  lines: OrderDraftLine[];
  checkout: OrderCheckout;
  /* real wall-clock ms of the last line change — drives "saved · updated Nm ago"
     and is the basis for interruption recovery. Absent on a freshly seeded draft
     (nothing edited yet). NOT used for sorting (lines carry monotonic addedAt). */
  updatedAt?: number;
  /* tube prep, present while status === "preparing" */
  prep: { tubes: TubeSpec[]; scanned: Record<string, string> } | null;
  lastPlaced: PlacedOrderSummary | null;
  /* archived orders, newest first — feeds "Previous orders" + Reorder */
  placedOrders: PlacedOrderSummary[];
  /* care-plan destination the doctor filed this draft under (the picker UI lives
     elsewhere; this is the recorded reference carried into the placed booking).
     Absent / cleared = standalone order. */
  carePlanId?: string;
  carePlanTitle?: string;
  goalId?: string;
};
