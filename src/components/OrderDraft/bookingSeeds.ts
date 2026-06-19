/* Cross-patient booking seeds.

   The order draft (cart) is patient-scoped, but the global Bookings workspace
   needs a clinic-wide queue. The provider seeds one draft per patient below,
   each carrying its already-placed bookings, so the workspace, global search,
   and the per-patient "Recent bookings" rail all read the SAME records and the
   SAME lifecycle actions (cancel / edit / advance / reorder).

   Codes are authored in a reserved range (ORD-2031, KO-…) that the runtime
   sequence never reaches, so seeds never collide with live placed orders. */

import { deltaLabFacts } from "@/data/deltaLabResults";
import { SWEEP_WINDOW } from "./constants";
import type { OrderDraftLine, PhoneHolderRelationship, PlacedOrderSummary } from "./types";

export type BookingPatient = {
  id: string;
  name: string;
  mrn: string;
  phoneMasked: string;
  /* Demo-only fields captured by the New booking wizard when registering a new
     patient. Seeded patients leave these undefined. */
  phone?: string;
  dobOrAge?: string;
  yearOfBirth?: string;
  sex?: "female" | "male" | "other";
  /* "panel" = full current-panel record; "phone_unconfirmed" = quick-registered;
     "phone_verified" = OTP verified in a quick identity gate. */
  identityTier?: "phone_unconfirmed" | "phone_verified" | "panel";
  relationship?: "current_panel" | "kura_known" | "new";
};

/* First entry is the active patient (the open chart). The rest populate the
   operational queue — they mirror the identities used by global search. */
export const BOOKING_PATIENTS: BookingPatient[] = [
  { id: "sokha-chan", name: "Sokha Chann", mrn: "P-9134", phoneMasked: "070 ••• 496" },
  { id: "dara-pich", name: "Dara Pich", mrn: "MRN-1002", phoneMasked: "012 ••• 778" },
  { id: "bopha-lim", name: "Bopha Lim", mrn: "MRN-1005", phoneMasked: "096 ••• 233" },
  { id: "sovann-tep", name: "Sovann Tep", mrn: "MRN-1008", phoneMasked: "017 ••• 540" },
  { id: "sreymom-sok", name: "Sreymom Sok", mrn: "MRN-1011", phoneMasked: "078 ••• 119" },
  { id: "vichea-nuon", name: "Vichea Nuon", mrn: "MRN-1014", phoneMasked: "011 ••• 902" },
  { id: "kosal-mao", name: "Kosal Mao", mrn: "MRN-1017", phoneMasked: "016 ••• 583" },
  { id: "sophea-chea", name: "Sophea Chea", mrn: "MRN-1020", phoneMasked: "010 ••• 410" },
  { id: "rithy-kong", name: "Rithy Kong", mrn: "MRN-1023", phoneMasked: "010 ••• 367" },
  { id: "malis-keo", name: "Malis Keo", mrn: "MRN-1026", phoneMasked: "015 ••• 891" },
  { id: "piseth-long", name: "Piseth Long", mrn: "MRN-1029", phoneMasked: "070 ••• 965" },
  { id: "visal-heng", name: "Visal Heng", mrn: "MRN-1032", phoneMasked: "010 ••• 250" },
  { id: "sothea-ouk", name: "Sothea Ouk", mrn: "MRN-1035", phoneMasked: "069 ••• 287" },
  { id: "sophal-touch", name: "Sophal Touch", mrn: "MRN-1038", phoneMasked: "070 ••• 435" },
  { id: "channary-pen", name: "Channary Pen", mrn: "MRN-1041", phoneMasked: "012 ••• 644" },
  { id: "dara-som", name: "Dara Som", mrn: "MRN-1044", phoneMasked: "088 ••• 209" },
  { id: "nimol-sok", name: "Nimol Sok", mrn: "MRN-1047", phoneMasked: "077 ••• 512" },
  { id: "veasna-chan", name: "Veasna Chan", mrn: "MRN-1050", phoneMasked: "092 ••• 879" },
  { id: "ratha-meas", name: "Ratha Meas", mrn: "MRN-1053", phoneMasked: "098 ••• 314" },
  { id: "chenda-ny", name: "Chenda Ny", mrn: "MRN-1056", phoneMasked: "012 ••• 770" },
  { id: "sopheak-rin", name: "Sopheak Rin", mrn: "MRN-1059", phoneMasked: "070 ••• 188" },
  { id: "davy-chhun", name: "Davy Chhun", mrn: "MRN-1062", phoneMasked: "016 ••• 425" },
];

export const bookingPatientById = new Map(BOOKING_PATIENTS.map((patient) => [patient.id, patient]));

/* ---- Identity graph (demo) -------------------------------------------------

   A verified phone is a contact key, not a patient identity. Some phones belong
   to a guarantor/guardian whose dependents are the actual patients. There is no
   backend, so the identity gate reads this scripted graph: when an entered phone
   matches a guarantor entry, the gate must ask WHO the patient is before
   attaching anyone — never auto-attach the phone holder.

   Demo phone: 012 777 088 → Lina Sroeun (guarantor) + two children. */
export type IdentityGraphMember = {
  id: string;
  name: string;
  mrn: string;
  sex: "female" | "male" | "other";
  ageLabel: string; /* "34", "8" — display age for the identity picker */
  /* relationship of THIS member to the phone holder: "self" = the holder */
  relationshipToHolder: PhoneHolderRelationship;
};

export type GuarantorPhoneGraph = {
  phone: string; /* dialable demo number, e.g. "012 777 088" */
  holderName: string;
  holderRelationship: PhoneHolderRelationship; /* the holder's role: "guarantor" */
  members: IdentityGraphMember[]; /* holder (self) first, then dependents */
};

export const GUARANTOR_PHONE_GRAPHS: GuarantorPhoneGraph[] = [
  {
    phone: "012 777 088",
    holderName: "Lina Sroeun",
    holderRelationship: "guarantor",
    members: [
      { id: "guar-lina-sroeun", name: "Lina Sroeun", mrn: "P-9209", sex: "female", ageLabel: "34", relationshipToHolder: "self" },
      { id: "dep-raksa-sroeun", name: "Raksa Sroeun", mrn: "P-9210", sex: "male", ageLabel: "8", relationshipToHolder: "child" },
      { id: "dep-maly-sroeun", name: "Maly Sroeun", mrn: "P-9211", sex: "female", ageLabel: "5", relationshipToHolder: "child" },
    ],
  },
];

/* Author a frozen placed line — seeds reference real catalog ids so the edit
   panel and pricing stay coherent, but the objects are self-contained. */
let seedSeq = 0;
function line(itemId: string, displayName: string, price: number | null): OrderDraftLine {
  return {
    lineId: itemId,
    kind: "test",
    itemId,
    displayName,
    price,
    labRefs: [],
    source: "orders-catalog",
    addedAt: (seedSeq += 1),
  };
}

/* The demo patient arrives with one archived booking — the HbA1c result from
   the same lab-only fixture that drives the chart. */
const SOKHA_SEED: PlacedOrderSummary = {
  code: "ORD-0000",
  bookingCode: "FZ-38245",
  route: "psc",
  stat: false,
  statFee: 0,
  payment: { label: "Cash · PSC counter", status: "collected" },
  bookingStatus: "results-back",
  cancelled: false,
  lines: [line("hba1c", "HbA1c", 8)],
  total: 8,
  unpricedCount: 0,
  placedAt: deltaLabFacts.hba1c.shortDate,
};

const SOKHA_CLINIC_IN_PROGRESS: PlacedOrderSummary = {
  code: "ORD-4604",
  sweep: SWEEP_WINDOW,
  route: "clinic",
  stat: false,
  statFee: 0,
  payment: { label: "Insurance · Forte", status: "pending-claim" },
  bookingStatus: "in-progress",
  cancelled: false,
  lines: [line("lipid-panel", "Lipid panel", 18), line("hba1c", "HbA1c", 8)],
  total: 26,
  unpricedCount: 0,
  placedAt: "20m ago",
};

/* Placed bookings keyed by patient. Together they cover every queue filter:
   Scheduled, Awaiting visit (PSC in-progress/no-show risk), Clinic pickup,
   in-lab progress, Results back (clean + flagged), and Cancelled. */
export const SEEDED_BOOKINGS: Record<string, PlacedOrderSummary[]> = {
  "sokha-chan": [SOKHA_CLINIC_IN_PROGRESS, SOKHA_SEED],
  "dara-pich": [
    {
      code: "ORD-2031",
      bookingCode: "KO-2031",
      route: "psc",
      stat: false,
      statFee: 0,
      payment: { label: "At PSC counter", status: "deferred" },
      bookingStatus: "scheduled",
      cancelled: false,
      lines: [line("lipid-panel", "Lipid panel", 18), line("creatinine-egfr", "Creatinine + eGFR", 8)],
      total: 26,
      unpricedCount: 0,
      placedAt: "today",
    },
  ],
  "bopha-lim": [
    {
      code: "ORD-5512",
      sweep: SWEEP_WINDOW,
      route: "clinic",
      stat: false,
      statFee: 0,
      payment: { label: "Insurance · Forte", status: "pending-claim" },
      bookingStatus: "scheduled",
      cancelled: false,
      lines: [line("cbc", "Complete blood count", 9)],
      total: 9,
      unpricedCount: 0,
      placedAt: "today",
    },
  ],
  "sovann-tep": [
    {
      code: "ORD-7740",
      bookingCode: "KO-7740",
      route: "psc",
      stat: false,
      statFee: 0,
      payment: { label: "KHQR via Telegram", status: "collected" },
      bookingStatus: "in-progress",
      cancelled: false,
      lines: [
        line("creatinine-egfr", "Creatinine + eGFR", 8),
        line("urea-bun", "Urea (BUN)", 7),
        line("electrolytes-panel", "Electrolytes panel", 13),
      ],
      total: 28,
      unpricedCount: 0,
      placedAt: "today",
    },
  ],
  "sreymom-sok": [
    {
      code: "ORD-6050",
      bookingCode: "KO-6050",
      route: "psc",
      stat: false,
      statFee: 0,
      payment: { label: "Cash · PSC counter", status: "collected" },
      bookingStatus: "results-back",
      cancelled: false,
      flagged: true,
      lines: [line("cbc", "Complete blood count", 9), line("ferritin", "Ferritin", 14)],
      total: 23,
      unpricedCount: 0,
      placedAt: "2d ago",
    },
  ],
  "vichea-nuon": [
    {
      code: "ORD-4120",
      route: "clinic",
      stat: false,
      statFee: 0,
      payment: { label: "Insurance · Forte", status: "voided" },
      bookingStatus: "scheduled",
      cancelled: true,
      lines: [line("esr", "ESR", 7), line("crp", "CRP", 7)],
      total: 14,
      unpricedCount: 0,
      placedAt: "Yesterday",
    },
  ],
  "kosal-mao": [
    {
      code: "ORD-4710",
      bookingCode: "KO-4710",
      route: "psc",
      stat: false,
      statFee: 0,
      payment: { label: "At PSC counter", status: "deferred" },
      bookingStatus: "scheduled",
      cancelled: false,
      lines: [line("cbc", "Complete blood count", 9)],
      total: 9,
      unpricedCount: 0,
      placedAt: "today",
    },
  ],
  "sophea-chea": [
    {
      code: "ORD-4720",
      bookingCode: "KO-4720",
      route: "psc",
      stat: false,
      statFee: 0,
      payment: { label: "KHQR via Telegram", status: "collected" },
      bookingStatus: "in-progress",
      cancelled: false,
      lines: [line("lipid-panel", "Lipid panel", 18), line("hba1c", "HbA1c", 8)],
      total: 26,
      unpricedCount: 0,
      placedAt: "1h ago",
    },
  ],
  "rithy-kong": [
    {
      code: "ORD-4730",
      sweep: SWEEP_WINDOW,
      route: "clinic",
      stat: false,
      statFee: 0,
      payment: { label: "Insurance · Forte", status: "pending-claim" },
      bookingStatus: "scheduled",
      cancelled: false,
      lines: [line("creatinine-egfr", "Creatinine + eGFR", 8)],
      total: 8,
      unpricedCount: 0,
      placedAt: "today",
    },
  ],
  "malis-keo": [
    {
      code: "ORD-4740",
      bookingCode: "KO-4740",
      route: "psc",
      stat: false,
      statFee: 0,
      payment: { label: "Cash · PSC counter", status: "collected" },
      bookingStatus: "results-back",
      cancelled: false,
      lines: [line("hba1c", "HbA1c", 8)],
      total: 8,
      unpricedCount: 0,
      placedAt: "2d ago",
    },
  ],
  "piseth-long": [
    {
      code: "ORD-4750",
      sweep: SWEEP_WINDOW,
      route: "clinic",
      stat: false,
      statFee: 0,
      payment: { label: "Insurance · Forte", status: "pending-claim" },
      bookingStatus: "in-progress",
      cancelled: false,
      lines: [line("electrolytes-panel", "Electrolytes panel", 13)],
      total: 13,
      unpricedCount: 0,
      placedAt: "30m ago",
    },
  ],
  "visal-heng": [
    {
      code: "ORD-4760",
      bookingCode: "KO-4760",
      route: "psc",
      stat: false,
      statFee: 0,
      payment: { label: "At PSC counter", status: "deferred" },
      bookingStatus: "scheduled",
      cancelled: false,
      lines: [line("esr", "ESR", 7), line("crp", "CRP", 7)],
      total: 14,
      unpricedCount: 0,
      placedAt: "today",
    },
  ],
  "sothea-ouk": [
    {
      code: "ORD-4770",
      bookingCode: "KO-4770",
      route: "psc",
      stat: false,
      statFee: 0,
      payment: { label: "Cash · PSC counter", status: "collected" },
      bookingStatus: "results-back",
      cancelled: false,
      flagged: true,
      lines: [line("ferritin", "Ferritin", 14)],
      total: 14,
      unpricedCount: 0,
      placedAt: "3d ago",
    },
  ],
  "sophal-touch": [
    {
      code: "ORD-4780",
      sweep: SWEEP_WINDOW,
      route: "clinic",
      stat: false,
      statFee: 0,
      payment: { label: "Insurance · Forte", status: "pending-claim" },
      bookingStatus: "scheduled",
      cancelled: false,
      lines: [line("cbc", "Complete blood count", 9)],
      total: 9,
      unpricedCount: 0,
      placedAt: "today",
    },
  ],
  "channary-pen": [
    {
      code: "ORD-4790",
      bookingCode: "KO-4790",
      route: "psc",
      stat: false,
      statFee: 0,
      payment: { label: "KHQR via Telegram", status: "collected" },
      bookingStatus: "in-progress",
      cancelled: false,
      lines: [line("urea-bun", "Urea (BUN)", 7), line("creatinine-egfr", "Creatinine + eGFR", 8)],
      total: 15,
      unpricedCount: 0,
      placedAt: "45m ago",
    },
  ],
  "dara-som": [
    {
      code: "ORD-4800",
      sweep: SWEEP_WINDOW,
      route: "clinic",
      stat: false,
      statFee: 0,
      payment: { label: "Insurance · Forte", status: "pending-claim" },
      bookingStatus: "results-back",
      cancelled: false,
      lines: [line("lipid-panel", "Lipid panel", 18)],
      total: 18,
      unpricedCount: 0,
      placedAt: "Yesterday",
    },
  ],
  "nimol-sok": [
    {
      code: "ORD-4810",
      bookingCode: "KO-4810",
      route: "psc",
      stat: false,
      statFee: 0,
      payment: { label: "At PSC counter", status: "deferred" },
      bookingStatus: "scheduled",
      cancelled: false,
      lines: [line("hba1c", "HbA1c", 8)],
      total: 8,
      unpricedCount: 0,
      placedAt: "today",
    },
  ],
  "veasna-chan": [
    {
      code: "ORD-4820",
      sweep: SWEEP_WINDOW,
      route: "clinic",
      stat: false,
      statFee: 0,
      payment: { label: "Insurance · Forte", status: "voided" },
      bookingStatus: "scheduled",
      cancelled: true,
      lines: [line("crp", "CRP", 7)],
      total: 7,
      unpricedCount: 0,
      placedAt: "Yesterday",
    },
  ],
  /* Upcoming: created today, code sent, patient visits a later day. scheduledFor
     buckets these into Upcoming (not Today) while placedAt stays honest. */
  "ratha-meas": [
    {
      code: "ORD-4910",
      bookingCode: "KO-4910",
      route: "psc",
      stat: false,
      statFee: 0,
      payment: { label: "At PSC counter", status: "deferred" },
      bookingStatus: "scheduled",
      cancelled: false,
      lines: [line("hba1c", "HbA1c", 8), line("fasting-glucose", "Fasting glucose", 5)],
      total: 13,
      unpricedCount: 0,
      placedAt: "today",
      scheduledFor: "Tomorrow",
    },
  ],
  "chenda-ny": [
    {
      code: "ORD-4920",
      bookingCode: "KO-4920",
      route: "psc",
      stat: false,
      statFee: 0,
      payment: { label: "KHQR via Telegram", status: "collected" },
      bookingStatus: "scheduled",
      cancelled: false,
      lines: [line("lipid-panel", "Lipid panel", 18), line("creatinine-egfr", "Creatinine + eGFR", 8)],
      total: 26,
      unpricedCount: 0,
      placedAt: "today",
      scheduledFor: "In 2 days",
    },
  ],
  /* Results back same-day: one clean (ready to send), one flagged (needs review).
     placedAt is a today label so they sit in the Today scope's Results back. */
  "sopheak-rin": [
    {
      code: "ORD-4930",
      bookingCode: "KO-4930",
      route: "psc",
      stat: false,
      statFee: 0,
      payment: { label: "Cash · PSC counter", status: "collected" },
      bookingStatus: "results-back",
      cancelled: false,
      lines: [line("fasting-glucose", "Fasting glucose", 5), line("urea-bun", "Urea (BUN)", 7)],
      total: 12,
      unpricedCount: 0,
      placedAt: "2h ago",
    },
  ],
  "davy-chhun": [
    {
      code: "ORD-4940",
      bookingCode: "KO-4940",
      route: "psc",
      stat: false,
      statFee: 0,
      payment: { label: "Cash · PSC counter", status: "collected" },
      bookingStatus: "results-back",
      cancelled: false,
      flagged: true,
      lines: [line("cbc", "Complete blood count", 9), line("ferritin", "Ferritin", 14)],
      total: 23,
      unpricedCount: 0,
      placedAt: "4h ago",
    },
  ],
};
