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
import type { OrderDraftLine, PlacedOrderSummary } from "./types";

export type BookingPatient = {
  id: string;
  name: string;
  mrn: string;
  phoneMasked: string;
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
];

export const bookingPatientById = new Map(BOOKING_PATIENTS.map((patient) => [patient.id, patient]));

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
};
