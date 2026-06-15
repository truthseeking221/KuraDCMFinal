/* Order draft (cart) types — one draft per patient, shared by every ordering
   surface: Labs rail, Orders tab, header popover, dock. */

export type OrderLineKind = "test" | "bundle" | "unlisted";

export type OrderLineSource =
  | "labs-followup" /* "Add follow up" on an out-of-range lab row */
  | "labs-suggested" /* "Suggested: repeat X" on a follow-up-due lab row */
  | "orders-catalog" /* checkbox / bundle toggle in the Orders catalog */
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
  label: string; /* "Cash", "KHQR via Telegram", "At PSC counter", "Insurance · Forte" */
  status: PaymentStatus;
};

/* In-clinic draws hold at "preparing" until the doctor confirms tubes are
   ready — Bookings never shows samples that don't physically exist. */
export type OrderDraftStatus = "building" | "preparing" | "placed";

export type TubeKind = "edta" | "sst" | "urine";

export type TubeSpec = {
  id: string;
  kind: TubeKind;
  name: string; /* "EDTA purple · 3 mL" */
  tests: string[]; /* display names grouped under this tube */
};

/* Post-place lifecycle. "results-back" is the prototype proxy for
   tubes-at-lab: edits lock there; cancellation also locks once money
   settles (collected/claimed). */
export type BookingStatus = "scheduled" | "in-progress" | "results-back";

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
  total: number; /* incl. statFee */
  unpricedCount: number;
  /* relative age label ("today", "3mo ago") — display-only, SSR-deterministic */
  placedAt?: string;
};

export type OrderDraft = {
  patientId: string;
  status: OrderDraftStatus;
  lines: OrderDraftLine[];
  checkout: OrderCheckout;
  /* tube prep, present while status === "preparing" */
  prep: { tubes: TubeSpec[]; scanned: Record<string, string> } | null;
  lastPlaced: PlacedOrderSummary | null;
  /* archived orders, newest first — feeds "Previous orders" + Reorder */
  placedOrders: PlacedOrderSummary[];
};
