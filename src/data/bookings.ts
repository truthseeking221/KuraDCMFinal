import { orderItemById } from "@/components/OrderDraft/catalog";
import type { BookingListItem, OrderDraftLine, PlacedOrderSummary } from "@/components/OrderDraft/types";

type BookingSeed = Omit<BookingListItem, "lines" | "total" | "unpricedCount"> & {
  itemIds: string[];
};

function lineFor(itemId: string, addedAt: number): OrderDraftLine {
  const item = orderItemById.get(itemId);
  if (!item) {
    return {
      lineId: `unlisted:${itemId}`,
      kind: "unlisted",
      displayName: itemId,
      price: null,
      labRefs: [],
      source: "suggested",
      addedAt,
    };
  }

  return {
    lineId: item.id,
    kind: "test",
    itemId: item.id,
    displayName: item.name,
    price: item.price,
    labRefs: [],
    source: "suggested",
    addedAt,
  };
}

function hydrateBooking(seed: BookingSeed, index: number): BookingListItem {
  const lines = seed.itemIds.map((itemId, offset) => lineFor(itemId, index * 10 + offset));
  const known = lines.reduce((sum, line) => sum + (line.price ?? 0), 0);
  return {
    ...seed,
    lines,
    total: known + seed.statFee,
    unpricedCount: lines.filter((line) => line.price === null).length,
  };
}

export const ACTIVE_PATIENT_BOOKING_IDENTITY = {
  patientId: "sokha-chan",
  patientName: "Sokha Chann",
  mrn: "P-9134",
  phoneMasked: "070 ... 496",
};

const bookingSeeds: BookingSeed[] = [
  {
    code: "ORD-9134",
    bookingCode: "KO-9134",
    patientId: "sokha-chan",
    patientName: "Sokha Chann",
    mrn: "P-9134",
    phoneMasked: "070 ... 496",
    route: "psc",
    stat: false,
    statFee: 0,
    payment: { label: "Cash · PSC counter", status: "collected" },
    bookingStatus: "results-back",
    cancelled: false,
    flagged: true,
    placedAt: "Today 10:30",
    itemIds: ["hba1c", "creatinine-egfr", "microalbumin"],
  },
  {
    code: "ORD-2031",
    bookingCode: "KO-2031",
    patientId: "dara-pich",
    patientName: "Dara Pich",
    mrn: "MRN-1002",
    phoneMasked: "012 ... 773",
    route: "psc",
    stat: false,
    statFee: 0,
    payment: { label: "At PSC counter", status: "deferred" },
    bookingStatus: "scheduled",
    cancelled: false,
    placedAt: "Today 13:00",
    itemIds: ["creatinine-egfr", "urea-bun"],
  },
  {
    code: "ORD-5512",
    patientId: "bopha-lim",
    patientName: "Bopha Lim",
    mrn: "MRN-1005",
    phoneMasked: "096 ... 331",
    route: "clinic",
    stat: false,
    statFee: 0,
    sweep: "09:15-09:30 · Reaksa N.",
    payment: { label: "Insurance · Forte", status: "pending-claim" },
    bookingStatus: "scheduled",
    cancelled: false,
    placedAt: "Tomorrow 09:15",
    itemIds: ["cbc", "esr"],
  },
  {
    code: "ORD-7740",
    patientId: "sovann-tep",
    patientName: "Sovann Tep",
    mrn: "MRN-1008",
    phoneMasked: "088 ... 219",
    route: "clinic",
    stat: true,
    statFee: 15,
    handoverCode: "KXJD",
    payment: { label: "Insurance · Forte", status: "pending-claim" },
    bookingStatus: "in-progress",
    cancelled: false,
    placedAt: "Today 14:45",
    itemIds: ["lipid-panel", "cbc"],
  },
  {
    code: "ORD-1187",
    bookingCode: "KO-1187",
    patientId: "phally-mey",
    patientName: "Phally Mey",
    mrn: "MRN-1014",
    phoneMasked: "010 ... 604",
    route: "psc",
    stat: false,
    statFee: 0,
    payment: { label: "At PSC counter", status: "voided" },
    bookingStatus: "scheduled",
    cancelled: true,
    placedAt: "Yesterday 16:20",
    itemIds: ["tsh", "free-t4"],
  },
];

export const initialBookingQueue: BookingListItem[] = bookingSeeds.map(hydrateBooking);

export function decorateActiveBooking(order: PlacedOrderSummary): BookingListItem {
  return {
    ...order,
    ...ACTIVE_PATIENT_BOOKING_IDENTITY,
  };
}
