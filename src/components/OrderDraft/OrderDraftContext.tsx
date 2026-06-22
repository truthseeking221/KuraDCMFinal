"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { BOOKING_PATIENTS, SEEDED_BOOKINGS, bookingPatientById, type BookingPatient } from "./bookingSeeds";
import { orderBundleById, resolveOrderable } from "./catalog";
import { NEAREST_PSC, PATIENT_PHONE_MASKED, STAT_CLINIC_FEE, SWEEP_WINDOW } from "./constants";
import { LAB_TO_CATALOG, mapLabKeyToItemId } from "./labMapping";
import { logPatientActivity } from "./patientActivity";
import type { ActivityType } from "./patientActivity";
import {
  buildOrderLedgerImpact,
  clampDoctorFee,
  normalizePayChoiceForRoute,
  paymentChoiceFromOrder,
  refreshOrderLedgerImpact,
} from "./ledger";
import { tubesForLines } from "./tubes";
import type {
  BookingListItem,
  DoctorIdentityDecision,
  DoctorPatientAssurance,
  LabProvenance,
  OrderCheckout,
  OrderDraft,
  OrderDraftLine,
  OrderLineSource,
  OrderPayment,
  OrderRouteId,
  PlacedOrderSummary,
  PscPayChoice,
  SeverityTone,
} from "./types";

export type LabTestMeta = {
  labName: string;
  reasonText?: string;
  severityTone?: SeverityTone;
  source: OrderLineSource;
};

/* Re-exported so existing `from "./OrderDraftContext"` imports keep working;
   the values live in constants.ts to avoid a seed↔context cycle. */
export { NEAREST_PSC, PATIENT_PHONE_MASKED, STAT_CLINIC_FEE, SWEEP_WINDOW };

export type OrderDraftApi = {
  draft: OrderDraft;
  lines: OrderDraftLine[];
  lineCount: number;
  totals: { known: number; unpricedCount: number; statFee: number; doctorFee: number; due: number };
  /* itemIds currently in the draft — drop-in for the catalog checkboxes */
  selectedIds: ReadonlySet<string>;
  hasItem: (itemId: string) => boolean;
  /* lab row keys whose mapped test (directly, via a bundle, or as an
     unlisted line) is in the draft — "Planned" derives from membership */
  plannedLabKeys: ReadonlySet<string>;
  /* every placed booking across all patients, decorated with identity, newest
     first — feeds the global Bookings workspace. The per-patient rail reads
     `draft.placedOrders` directly; both share the same lifecycle actions. */
  allBookings: BookingListItem[];
  toggleCatalogItem: (itemId: string, source?: OrderLineSource) => void;
  addLabTest: (labKey: string, meta: LabTestMeta) => void;
  removeLabTest: (labKey: string) => void;
  removeLine: (lineId: string) => void;
  clearDraft: () => void;
  restoreLines: (lines: OrderDraftLine[]) => void;
  setRoute: (route: OrderRouteId) => void;
  setStat: (stat: boolean) => void;
  setPscPay: (choice: PscPayChoice) => void;
  setDoctorFee: (doctorFee: number) => void;
  /* building → placed (PSC) or → preparing (clinic; commits at tube confirm) */
  placeOrder: () => void;
  /* Catalog-first flow: tests first, patient later. Writes a frozen booking for
     that patient without changing the active chart's draft lines or checkout. */
  placeStandaloneOrder: (input: StandaloneOrderInput) => PlacedOrderSummary | null;
  /* Doctor-originated Booking v1: patient-in PSC booking with doctor attribution.
     This is the /orders front door; internal reception handles confirm-and-draw. */
  originateDoctorBooking: (input: DoctorBookingOriginationInput) => PlacedOrderSummary | null;
  scanTube: (tubeId: string) => void;
  unscanTube: (tubeId: string) => void;
  confirmTubesReady: () => void;
  cancelPrep: () => void;
  markKhqrReceived: () => void;
  /* instant new scheduled booking cloned from a previous order */
  reorder: (code: string) => void;
  /* booking lifecycle (post-place) */
  advanceBooking: (code: string) => void;
  cancelBooking: (code: string) => void;
  restoreBooking: (code: string) => void;
  updateBookingLines: (code: string, lines: OrderDraftLine[]) => void;
  /* mint a catalog line with a fresh sequence — used by the edit panel */
  mintLineForItem: (itemId: string) => OrderDraftLine | null;
  startNewDraft: () => void;
};

export type StandaloneOrderInput = {
  patientId: string;
  patient?: BookingPatient;
  itemIds: string[];
  lines?: OrderDraftLine[];
  route: OrderRouteId;
  stat?: boolean;
  pscPay?: PscPayChoice | null;
  doctorFee?: number;
};

export type DoctorBookingOriginationInput = {
  patientId: string;
  patient: BookingPatient;
  itemIds: string[];
  route?: OrderRouteId;
  stat?: boolean;
  pscPay: PscPayChoice;
  doctorFee?: number;
  patientAssurance: DoctorPatientAssurance;
  identityDecision: DoctorIdentityDecision;
};

const OrderDraftContext = createContext<OrderDraftApi | null>(null);

export const ACTIVE_PATIENT_ID = "sokha-chan";

const EMPTY_CHECKOUT: OrderCheckout = { route: null, stat: false, pscPay: null, doctorFee: 0 };

/* Deterministic demo codes — derived from the order sequence, never from
   Date.now()/Math.random() (hydration-safe). Confusables I/L/O/0/1 excluded. */
const CODE_LETTERS = "ABCDEFGHJKMNPQRSTUVWXYZ";
const CODE_DIGITS = "23456789";

function friendlyBookingCode(seq: number): string {
  const l1 = CODE_LETTERS[(seq * 5) % CODE_LETTERS.length];
  const l2 = CODE_LETTERS[(seq * 11 + 7) % CODE_LETTERS.length];
  let n = (seq * 7919 + 31337) >>> 0;
  let digits = "";
  for (let i = 0; i < 5; i += 1) {
    digits += CODE_DIGITS[n % CODE_DIGITS.length];
    n = Math.floor(n / CODE_DIGITS.length);
  }
  return `${l1}${l2}-${digits}`;
}

function handoverCodeOf(seq: number): string {
  let n = (seq * 48271 + 11) >>> 0;
  let code = "";
  for (let i = 0; i < 4; i += 1) {
    code += CODE_LETTERS[n % CODE_LETTERS.length];
    n = Math.floor(n / CODE_LETTERS.length) + i;
  }
  return code;
}

function standaloneOrderCode(seq: number, patientId: string, patient?: BookingPatient): string {
  const patientKey = patient?.mrn ?? bookingPatientById.get(patientId)?.mrn ?? patientId;
  const digits = patientKey.match(/\d+/g)?.join("").slice(-4) || String(seq).padStart(4, "0");
  const suffix = String(1000 + ((seq * 7919) % 9000)).padStart(4, "0");
  return `KO-${digits}-${suffix}`;
}

function catalogLine(itemId: string, source: OrderLineSource, addedAt: number): OrderDraftLine | null {
  const resolved = resolveOrderable(itemId);
  if (!resolved) return null;
  return {
    lineId: itemId,
    kind: resolved.kind,
    itemId,
    displayName: resolved.name,
    price: resolved.price,
    labRefs: [],
    source,
    addedAt,
  };
}

function cloneOrderLine(line: OrderDraftLine): OrderDraftLine {
  return {
    ...line,
    labRefs: line.labRefs.map((ref) => ({ ...ref })),
  };
}

/* Drafts start empty — nothing enters the cart without an explicit tap
   (suggestions are one tap away, never pre-added). Already-placed bookings come
   from the cross-patient seeds in ./bookingSeeds (the demo patient arrives with
   one archived HbA1c result from the same fixture that drives the chart). */
function seedDraft(patientId: string): OrderDraft {
  return {
    patientId,
    status: "building",
    lines: [],
    checkout: { ...EMPTY_CHECKOUT },
    prep: null,
    lastPlaced: null,
    placedOrders: SEEDED_BOOKINGS[patientId] ?? [],
  };
}

/* Seed one draft per known patient so the global Bookings workspace has a
   clinic-wide queue from first render; the active chart is guaranteed present. */
function seedAllDrafts(activeId: string): Record<string, OrderDraft> {
  const all: Record<string, OrderDraft> = {};
  for (const patient of BOOKING_PATIENTS) all[patient.id] = seedDraft(patient.id);
  if (!all[activeId]) all[activeId] = seedDraft(activeId);
  return all;
}

/* Lock ladder (prototype proxy): tests editable until tubes reach the lab;
   cancellable until money settles or tubes reach the lab. */
export function bookingEditsLocked(order: PlacedOrderSummary): boolean {
  return order.bookingStatus === "results-back" || order.cancelled;
}

export function bookingPaymentSettled(order: PlacedOrderSummary): boolean {
  return order.payment.status === "collected" || order.payment.status === "claimed";
}

export function bookingCancelLocked(order: PlacedOrderSummary): boolean {
  return bookingEditsLocked(order) || bookingPaymentSettled(order);
}

/* Archive whatever is currently placed and return a fresh building draft. */
function freshDraft(current: OrderDraft, lines: OrderDraftLine[] = []): OrderDraft {
  return {
    ...current,
    status: "building",
    lines,
    checkout: { ...EMPTY_CHECKOUT },
    prep: null,
    lastPlaced: null,
    placedOrders: current.lastPlaced ? [current.lastPlaced, ...current.placedOrders] : current.placedOrders,
  };
}

function paymentFor(route: OrderRouteId, pscPay: PscPayChoice | null): OrderPayment {
  if (pscPay === "cash") return { label: "Cash · doctor office", status: "collected" };
  if (pscPay === "khqr") return { label: "KHQR via Telegram", status: "waiting" };
  return route === "psc" ? { label: "At PSC counter", status: "deferred" } : { label: "KHQR via Telegram", status: "waiting" };
}

function buildPlacedSummary({
  checkout,
  code,
  doctorAttributed,
  identityDecision,
  origin,
  patientAssurance,
  lines,
  seq,
}: {
  checkout: OrderCheckout;
  code: string;
  doctorAttributed?: boolean;
  identityDecision?: PlacedOrderSummary["identityDecision"];
  origin?: PlacedOrderSummary["origin"];
  patientAssurance?: PlacedOrderSummary["patientAssurance"];
  lines: OrderDraftLine[];
  seq: number;
}): PlacedOrderSummary {
  const route = checkout.route as OrderRouteId;
  const stat = checkout.stat;
  const statFee = route === "clinic" && stat ? STAT_CLINIC_FEE : 0;
  const known = lines.reduce((total, line) => total + (line.price ?? 0), 0);
  const doctorFee = clampDoctorFee(checkout.doctorFee, known);
  const payment = paymentFor(route, checkout.pscPay);
  const ledgerImpact = buildOrderLedgerImpact({
    subtotal: known,
    statFee,
    doctorFee,
    pscPay: checkout.pscPay,
    paymentStatus: payment.status,
  });
  return {
    code,
    bookingCode: route === "psc" ? friendlyBookingCode(seq) : undefined,
    handoverCode: route === "clinic" && stat ? handoverCodeOf(seq) : undefined,
    sweep: route === "clinic" && !stat ? SWEEP_WINDOW : undefined,
    route,
    stat,
    statFee,
    payment,
    bookingStatus: "scheduled",
    cancelled: false,
    lines,
    total: ledgerImpact.patientTotal,
    unpricedCount: lines.filter((line) => line.price === null).length,
    ledgerImpact,
    origin,
    doctorAttributed,
    patientAssurance,
    identityDecision,
    placedAt: "today",
  };
}

export function OrderDraftProvider({ patientId, children }: { patientId: string; children: ReactNode }) {
  const [drafts, setDrafts] = useState<Record<string, OrderDraft>>(() => seedAllDrafts(patientId));
  const [extraPatients, setExtraPatients] = useState<Record<string, BookingPatient>>({});
  /* monotonic counters — deterministic, never Date.now()/Math.random() */
  const seqRef = useRef(0);
  const orderSeqRef = useRef(0);

  const draft = drafts[patientId] ?? seedDraft(patientId);

  /* Apply a line mutation to the active draft.
     - placed draft → archive it and start fresh first (the catalog never
       edits a placed order)
     - preparing draft → fall back to building (tube prep restarts) */
  const mutate = useCallback(
    (fn: (current: OrderDraft) => OrderDraft) => {
      setDrafts((all) => {
        let current = all[patientId] ?? seedDraft(patientId);
        if (current.status === "placed") {
          current = freshDraft(current);
        } else if (current.status === "preparing") {
          current = { ...current, status: "building", prep: null };
        }
        return { ...all, [patientId]: fn(current) };
      });
    },
    [patientId],
  );

  const toggleCatalogItem = useCallback(
    (itemId: string, source: OrderLineSource = "orders-catalog") => {
      mutate((current) => {
        const existing = current.lines.find((line) => line.lineId === itemId);
        if (existing) {
          return { ...current, lines: current.lines.filter((line) => line.lineId !== itemId) };
        }
        const line = catalogLine(itemId, source, seqRef.current++);
        if (!line) return current;
        return { ...current, lines: [...current.lines, line] };
      });
    },
    [mutate],
  );

  const addLabTest = useCallback(
    (labKey: string, meta: LabTestMeta) => {
      const provenance: LabProvenance = {
        labKey,
        labName: meta.labName,
        reasonText: meta.reasonText,
        severityTone: meta.severityTone,
        source: meta.source,
      };
      mutate((current) => {
        const itemId = mapLabKeyToItemId(labKey);
        const lineId = itemId ?? `unlisted:${labKey}`;
        const existing = current.lines.find((line) => line.lineId === lineId);
        if (existing) {
          if (existing.labRefs.some((ref) => ref.labKey === labKey)) return current;
          const updated = { ...existing, labRefs: [...existing.labRefs, provenance] };
          return {
            ...current,
            lines: current.lines.map((line) => (line.lineId === lineId ? updated : line)),
          };
        }
        let line: OrderDraftLine;
        if (itemId) {
          const base = catalogLine(itemId, meta.source, seqRef.current++);
          if (!base) return current;
          line = { ...base, labRefs: [provenance] };
        } else {
          line = {
            lineId,
            kind: "unlisted",
            displayName: meta.labName,
            price: null,
            labRefs: [provenance],
            source: meta.source,
            addedAt: seqRef.current++,
          };
        }
        return { ...current, lines: [...current.lines, line] };
      });
    },
    [mutate],
  );

  const removeLabTest = useCallback(
    (labKey: string) => {
      mutate((current) => {
        const itemId = mapLabKeyToItemId(labKey);
        if (itemId) {
          if (current.lines.some((line) => line.lineId === itemId)) {
            return { ...current, lines: current.lines.filter((line) => line.lineId !== itemId) };
          }
          /* planned via a bundle — un-bundle: drop the bundle line but keep
             its other members as individual tests, so un-planning one row
             never silently removes the rest */
          const covering = current.lines.find(
            (line) =>
              line.kind === "bundle" &&
              line.itemId &&
              (orderBundleById.get(line.itemId)?.memberItemIds ?? []).includes(itemId),
          );
          if (covering) {
            const remaining = (orderBundleById.get(covering.itemId as string)?.memberItemIds ?? []).filter(
              (memberId) => memberId !== itemId && !current.lines.some((line) => line.lineId === memberId),
            );
            const kept = remaining
              .map((memberId) => catalogLine(memberId, covering.source, seqRef.current++))
              .filter((line): line is OrderDraftLine => line !== null);
            return {
              ...current,
              lines: [...current.lines.filter((line) => line.lineId !== covering.lineId), ...kept],
            };
          }
          return current;
        }
        const lineId = `unlisted:${labKey}`;
        return { ...current, lines: current.lines.filter((line) => line.lineId !== lineId) };
      });
    },
    [mutate],
  );

  const removeLine = useCallback(
    (lineId: string) => {
      mutate((current) => ({ ...current, lines: current.lines.filter((line) => line.lineId !== lineId) }));
    },
    [mutate],
  );

  const clearDraft = useCallback(() => {
    mutate((current) => ({ ...current, lines: [] }));
  }, [mutate]);

  const restoreLines = useCallback(
    (lines: OrderDraftLine[]) => {
      mutate((current) => ({ ...current, lines: lines.map(cloneOrderLine) }));
    },
    [mutate],
  );

  const setCheckout = useCallback(
    (patch: Partial<OrderCheckout>) => {
      mutate((current) => {
        const known = current.lines.reduce((total, line) => total + (line.price ?? 0), 0);
        const nextCheckout = { ...current.checkout, ...patch };
        return {
          ...current,
          checkout: {
            ...nextCheckout,
            doctorFee: clampDoctorFee(nextCheckout.doctorFee, known),
          },
        };
      });
    },
    [mutate],
  );

  const setRoute = useCallback(
    (route: OrderRouteId) => {
      mutate((current) => ({
        ...current,
        checkout: {
          ...current.checkout,
          route,
          pscPay: normalizePayChoiceForRoute(route, current.checkout.pscPay),
        },
      }));
    },
    [mutate],
  );
  const setStat = useCallback((stat: boolean) => setCheckout({ stat }), [setCheckout]);
  const setPscPay = useCallback((pscPay: PscPayChoice) => setCheckout({ pscPay }), [setCheckout]);
  const setDoctorFee = useCallback((doctorFee: number) => setCheckout({ doctorFee }), [setCheckout]);

  const buildSummary = useCallback((current: OrderDraft): PlacedOrderSummary => {
    orderSeqRef.current += 1;
    const seq = orderSeqRef.current;
    return buildPlacedSummary({
      checkout: current.checkout,
      code: `ORD-${String(seq).padStart(4, "0")}`,
      lines: current.lines,
      seq,
    });
  }, []);

  const placeStandaloneOrder = useCallback((input: StandaloneOrderInput): PlacedOrderSummary | null => {
    if ((input.lines?.length ?? input.itemIds.length) === 0) return null;
    if (input.route === "psc" && !input.pscPay) return null;

    const lines = input.lines
      ? input.lines.map(cloneOrderLine)
      : input.itemIds
          .map((itemId) => catalogLine(itemId, "catalog-standalone", seqRef.current++))
          .filter((line): line is OrderDraftLine => line !== null);
    if (lines.length === 0) return null;

    orderSeqRef.current += 1;
    const seq = orderSeqRef.current;
    const patient = input.patient ?? bookingPatientById.get(input.patientId);
    const checkout: OrderCheckout = {
      route: input.route,
      stat: input.stat ?? false,
      pscPay: input.pscPay === "cash" ? "cash" : normalizePayChoiceForRoute(input.route, input.pscPay ?? null),
      doctorFee: input.doctorFee ?? 0,
    };
    const placed = buildPlacedSummary({
      checkout,
      code: standaloneOrderCode(seq, input.patientId, patient),
      origin: "catalog-onramp",
      doctorAttributed: false,
      lines,
      seq,
    });

    if (input.patient) {
      setExtraPatients((current) => ({
        ...current,
        [input.patientId]: input.patient as BookingPatient,
      }));
    }
    setDrafts((all) => {
      const current = all[input.patientId] ?? seedDraft(input.patientId);
      return {
        ...all,
        [input.patientId]: {
          ...current,
          placedOrders: [placed, ...current.placedOrders],
        },
      };
    });

    return placed;
  }, []);

  const originateDoctorBooking = useCallback((input: DoctorBookingOriginationInput): PlacedOrderSummary | null => {
    if (input.itemIds.length === 0) return null;

    const lines = input.itemIds
      .map((itemId) => catalogLine(itemId, "orders-catalog", seqRef.current++))
      .filter((line): line is OrderDraftLine => line !== null);
    if (lines.length === 0) return null;

    orderSeqRef.current += 1;
    const seq = orderSeqRef.current;
    const route = input.route ?? "psc";
    const placed = buildPlacedSummary({
      checkout: {
        route,
        stat: input.stat ?? false,
        pscPay: input.pscPay === "cash" ? "cash" : normalizePayChoiceForRoute(route, input.pscPay),
        doctorFee: input.doctorFee ?? 0,
      },
      code: `ORD-${String(seq).padStart(4, "0")}`,
      origin: "doctor-order",
      doctorAttributed: true,
      patientAssurance: input.patientAssurance,
      identityDecision: input.identityDecision,
      lines,
      seq,
    });

    setExtraPatients((current) => ({
      ...current,
      [input.patientId]: input.patient,
    }));
    setDrafts((all) => {
      const current = all[input.patientId] ?? seedDraft(input.patientId);
      return {
        ...all,
        [input.patientId]: {
          ...current,
          placedOrders: [placed, ...current.placedOrders],
        },
      };
    });

    logPatientActivity(input.patientId, {
      type: "booking",
      title: `Booking placed · ${lines.length} test${lines.length === 1 ? "" : "s"}`,
      detail: `${placed.bookingCode ?? placed.handoverCode ?? placed.code} · ${route === "psc" ? "patient visits the PSC" : "in-clinic draw"}`,
    });

    return placed;
  }, []);

  /* Apply fn to the booking with this code, wherever it lives — the fresh
     lastPlaced receipt or the archived history, in ANY patient's draft. Codes
     are globally unique, so the global Bookings workspace edits/cancels a
     booking through the same path the active patient's rail does. */
  const updateBooking = useCallback(
    (
      code: string,
      fn: (order: PlacedOrderSummary) => PlacedOrderSummary,
      /* optional activity describer — logged to the booking's OWN patient only
         when fn actually changes the order (guards that no-op never log) */
      activity?: (next: PlacedOrderSummary, prev: PlacedOrderSummary) => { type: ActivityType; title: string; detail?: string } | null,
    ) => {
      setDrafts((all) => {
        let changed = false;
        const next: Record<string, OrderDraft> = {};
        for (const [pid, current] of Object.entries(all)) {
          const target =
            current.lastPlaced?.code === code
              ? current.lastPlaced
              : current.placedOrders.find((order) => order.code === code);
          if (!target) {
            next[pid] = current;
            continue;
          }
          const updated = fn(target);
          next[pid] =
            current.lastPlaced?.code === code
              ? { ...current, lastPlaced: updated }
              : { ...current, placedOrders: current.placedOrders.map((order) => (order.code === code ? updated : order)) };
          changed = true;
          if (activity && updated !== target) {
            const a = activity(updated, target);
            if (a) queueMicrotask(() => logPatientActivity(pid, a));
          }
        }
        return changed ? next : all;
      });
    },
    [],
  );

  const placeOrder = useCallback(() => {
    setDrafts((all) => {
      const current = all[patientId] ?? seedDraft(patientId);
      const { route, pscPay } = current.checkout;
      if (current.status !== "building" || current.lines.length === 0 || !route) return all;
      if (!pscPay) return all;
      if (route === "clinic") {
        /* hold at "preparing" — the order commits when tubes are confirmed */
        return {
          ...all,
          [patientId]: {
            ...current,
            status: "preparing",
            prep: { tubes: tubesForLines(current.lines), scanned: {} },
          },
        };
      }
      const summary = buildSummary(current);
      queueMicrotask(() =>
        logPatientActivity(patientId, {
          type: "order",
          title: `Order placed · ${current.lines.length} test${current.lines.length === 1 ? "" : "s"}`,
          detail: `${summary.bookingCode ?? summary.code} · patient visits the PSC`,
        }),
      );
      return { ...all, [patientId]: { ...current, status: "placed", prep: null, lastPlaced: summary } };
    });
  }, [buildSummary, patientId]);

  const unscanTube = useCallback(
    (tubeId: string) => {
      setDrafts((all) => {
        const current = all[patientId];
        if (!current || current.status !== "preparing" || !current.prep) return all;
        if (!current.prep.scanned[tubeId]) return all;
        const scanned = { ...current.prep.scanned };
        delete scanned[tubeId];
        return { ...all, [patientId]: { ...current, prep: { ...current.prep, scanned } } };
      });
    },
    [patientId],
  );

  const mintLineForItem = useCallback((itemId: string) => catalogLine(itemId, "orders-catalog", seqRef.current++), []);

  const scanTube = useCallback(
    (tubeId: string) => {
      setDrafts((all) => {
        const current = all[patientId];
        if (!current || current.status !== "preparing" || !current.prep) return all;
        if (current.prep.scanned[tubeId]) return all;
        seqRef.current += 1;
        const sampleId = `26${String(1000000000 + seqRef.current * 7).slice(-10)}`;
        return {
          ...all,
          [patientId]: {
            ...current,
            prep: { ...current.prep, scanned: { ...current.prep.scanned, [tubeId]: sampleId } },
          },
        };
      });
    },
    [patientId],
  );

  const confirmTubesReady = useCallback(() => {
    setDrafts((all) => {
      const current = all[patientId];
      if (!current || current.status !== "preparing" || !current.prep) return all;
      if (current.prep.tubes.some((tube) => !current.prep?.scanned[tube.id])) return all;
      const tubeCount = current.prep.tubes.length;
      const summary = buildSummary(current);
      queueMicrotask(() =>
        logPatientActivity(patientId, {
          type: "tube",
          title: "Order placed · in-clinic draw",
          detail: `${tubeCount} tube${tubeCount === 1 ? "" : "s"} prepared · ${summary.handoverCode ?? summary.sweep ?? "next sweep"}`,
        }),
      );
      return { ...all, [patientId]: { ...current, status: "placed", prep: null, lastPlaced: summary } };
    });
  }, [buildSummary, patientId]);

  const cancelPrep = useCallback(() => {
    setDrafts((all) => {
      const current = all[patientId];
      if (!current || current.status !== "preparing") return all;
      return { ...all, [patientId]: { ...current, status: "building", prep: null } };
    });
  }, [patientId]);

  const markKhqrReceived = useCallback(() => {
    setDrafts((all) => {
      const current = all[patientId];
      if (!current?.lastPlaced || current.lastPlaced.payment.status !== "waiting") return all;
      queueMicrotask(() =>
        logPatientActivity(patientId, {
          type: "payment",
          title: "Payment received · KHQR",
          detail: "Patient paid Kura before pickup",
        }),
      );
      return {
        ...all,
        [patientId]: {
          ...current,
          lastPlaced: {
            ...refreshOrderLedgerImpact({
              ...current.lastPlaced,
              payment: { label: "KHQR via Telegram", status: "collected" },
            }),
          },
        },
      };
    });
  }, [patientId]);

  /* Reorder = instant new scheduled booking (same tests/route/STAT, new
     codes, payment settles at draw) — the current draft is untouched.
     Adjustments happen through Edit tests while the booking is scheduled. */
  const reorder = useCallback((code: string) => {
    setDrafts((all) => {
      /* the booking can belong to any patient in the queue — clone it back
         into its OWN history, never the active chart's */
      let ownerId: string | null = null;
      let source: PlacedOrderSummary | undefined;
      for (const [pid, patientDraft] of Object.entries(all)) {
        const found =
          patientDraft.lastPlaced?.code === code
            ? patientDraft.lastPlaced
            : patientDraft.placedOrders.find((order) => order.code === code);
        if (found) {
          ownerId = pid;
          source = found;
          break;
        }
      }
      if (!ownerId || !source) return all;
      orderSeqRef.current += 1;
      const seq = orderSeqRef.current;
      const lines = source.lines.map((line) => ({ ...line, addedAt: seqRef.current++ }));
      const pscPay = source.route === "clinic" ? "khqr" : paymentChoiceFromOrder(source);
      const clone = buildPlacedSummary({
        checkout: {
          route: source.route,
          stat: source.stat,
          pscPay,
          doctorFee: source.ledgerImpact?.doctorFee ?? 0,
        },
        code: `ORD-${String(seq).padStart(4, "0")}`,
        origin: "reorder",
        doctorAttributed: source.doctorAttributed,
        identityDecision: source.identityDecision,
        patientAssurance: source.patientAssurance,
        lines,
        seq,
      });
      const owner = all[ownerId];
      const fromCode = source.bookingCode ?? source.code;
      queueMicrotask(() =>
        logPatientActivity(ownerId as string, {
          type: "booking",
          title: "Reordered",
          detail: `${clone.bookingCode ?? clone.code} · cloned from ${fromCode}`,
        }),
      );
      return { ...all, [ownerId]: { ...owner, placedOrders: [clone, ...owner.placedOrders] } };
    });
  }, []);

  /* Demo lifecycle advance: scheduled → in-progress (sample collected; PSC
     money settles at draw) → results-back (clinic claim settles). */
  const advanceBooking = useCallback(
    (code: string) => {
      updateBooking(code, (order) => {
        if (order.cancelled) return order;
        if (order.bookingStatus === "scheduled") {
          const settles = ["pending", "deferred", "waiting"].includes(order.payment.status);
          return refreshOrderLedgerImpact({
            ...order,
            bookingStatus: "in-progress",
            payment: settles ? { ...order.payment, status: "collected" } : order.payment,
          });
        }
        if (order.bookingStatus === "in-progress") {
          return refreshOrderLedgerImpact({
            ...order,
            bookingStatus: "results-back",
            payment:
              order.payment.status === "pending-claim" ? { ...order.payment, status: "claimed" } : order.payment,
          });
        }
        return order;
      },
      (next) =>
        next.bookingStatus === "in-progress"
          ? { type: "booking", title: "Sample collected", detail: `${next.bookingCode ?? next.code} · at the lab` }
          : next.bookingStatus === "results-back"
            ? { type: "result", title: "Results back", detail: `${next.bookingCode ?? next.code} · ready to review` }
            : null,
      );
    },
    [updateBooking],
  );

  const cancelBooking = useCallback(
    (code: string) => {
      updateBooking(
        code,
        (order) => {
          if (bookingCancelLocked(order)) return order;
          return refreshOrderLedgerImpact({
            ...order,
            cancelled: true,
            payment: {
              ...order.payment,
              status: order.route === "psc" && order.payment.status === "collected" ? "refunded" : "voided",
            },
          });
        },
        (next) => ({ type: "booking", title: "Booking cancelled", detail: `${next.bookingCode ?? next.code} · payment ${next.payment.status}` }),
      );
    },
    [updateBooking],
  );

  const restoreBooking = useCallback(
    (code: string) => {
      updateBooking(
        code,
        (order) => {
          if (!order.cancelled) return order;
          return refreshOrderLedgerImpact({
            ...order,
            cancelled: false,
            payment:
              order.route === "clinic"
                ? paymentFor(order.route, "khqr")
                : paymentFor(order.route, paymentChoiceFromOrder(order)),
          });
        },
        (next) => ({ type: "booking", title: "Booking restored", detail: next.bookingCode ?? next.code }),
      );
    },
    [updateBooking],
  );

  /* Edit-tests save (F5): allowed until tubes reach the lab */
  const updateBookingLines = useCallback(
    (code: string, lines: OrderDraftLine[]) => {
      updateBooking(code, (order) => {
        if (bookingEditsLocked(order) || lines.length === 0) return order;
        const known = lines.reduce((sum, line) => sum + (line.price ?? 0), 0);
        const ledgerImpact = buildOrderLedgerImpact({
          subtotal: known,
          statFee: order.statFee,
          doctorFee: order.ledgerImpact?.doctorFee ?? 0,
          pscPay: paymentChoiceFromOrder(order),
          paymentStatus: order.payment.status,
        });
        return {
          ...order,
          lines,
          total: ledgerImpact.patientTotal,
          unpricedCount: lines.filter((line) => line.price === null).length,
          ledgerImpact,
        };
      });
    },
    [updateBooking],
  );

  const startNewDraft = useCallback(() => {
    setDrafts((all) => {
      const current = all[patientId] ?? seedDraft(patientId);
      if (current.status === "building") return all;
      return { ...all, [patientId]: freshDraft(current) };
    });
  }, [patientId]);

  const value = useMemo<OrderDraftApi>(() => {
    const lines = draft.lines;
    const selectedIds = new Set(lines.filter((line) => line.itemId).map((line) => line.itemId as string));
    /* effective coverage: direct test lines + every member of in-draft bundles */
    const coveredIds = new Set(selectedIds);
    for (const line of lines) {
      if (line.kind === "bundle" && line.itemId) {
        for (const memberId of orderBundleById.get(line.itemId)?.memberItemIds ?? []) {
          coveredIds.add(memberId);
        }
      }
    }
    const plannedLabKeys = new Set<string>();
    for (const [labKey, itemId] of Object.entries(LAB_TO_CATALOG)) {
      if (coveredIds.has(itemId)) plannedLabKeys.add(labKey);
    }
    for (const line of lines) {
      if (line.kind === "unlisted") {
        for (const ref of line.labRefs) plannedLabKeys.add(ref.labKey);
      }
    }
    const known = lines.reduce((total, line) => total + (line.price ?? 0), 0);
    const unpricedCount = lines.filter((line) => line.price === null).length;
    const statFee = draft.checkout.route === "clinic" && draft.checkout.stat ? STAT_CLINIC_FEE : 0;
    const doctorFee = clampDoctorFee(draft.checkout.doctorFee, known);
    /* flatten every patient's bookings into the cross-patient queue, decorating
       each with its identity columns; lastPlaced (the just-placed receipt)
       leads its patient's archived history */
    const allBookings: BookingListItem[] = [];
    for (const [pid, patientDraft] of Object.entries(drafts)) {
      const patient = extraPatients[pid] ?? bookingPatientById.get(pid);
      const decorate = (order: PlacedOrderSummary): BookingListItem => ({
        ...order,
        patientId: pid,
        patientName: patient?.name ?? pid,
        mrn: patient?.mrn ?? "—",
        phoneMasked: patient?.phoneMasked ?? "—",
      });
      if (patientDraft.lastPlaced) allBookings.push(decorate(patientDraft.lastPlaced));
      for (const order of patientDraft.placedOrders) allBookings.push(decorate(order));
    }
    return {
      draft,
      lines,
      lineCount: lines.length,
      totals: { known, unpricedCount, statFee, doctorFee, due: known + statFee + doctorFee },
      selectedIds,
      hasItem: (itemId: string) => selectedIds.has(itemId),
      plannedLabKeys,
      allBookings,
      toggleCatalogItem,
      addLabTest,
      removeLabTest,
      removeLine,
      clearDraft,
      restoreLines,
      setRoute,
      setStat,
      setPscPay,
      setDoctorFee,
      placeOrder,
      placeStandaloneOrder,
      originateDoctorBooking,
      scanTube,
      unscanTube,
      confirmTubesReady,
      cancelPrep,
      markKhqrReceived,
      reorder,
      advanceBooking,
      cancelBooking,
      restoreBooking,
      updateBookingLines,
      mintLineForItem,
      startNewDraft,
    };
  }, [
    draft,
    drafts,
    extraPatients,
    toggleCatalogItem,
    addLabTest,
    removeLabTest,
    removeLine,
    clearDraft,
    restoreLines,
    setRoute,
    setStat,
    setPscPay,
    setDoctorFee,
    placeOrder,
    placeStandaloneOrder,
    originateDoctorBooking,
    scanTube,
    unscanTube,
    confirmTubesReady,
    cancelPrep,
    markKhqrReceived,
    reorder,
    advanceBooking,
    cancelBooking,
    restoreBooking,
    updateBookingLines,
    mintLineForItem,
    startNewDraft,
  ]);

  return <OrderDraftContext.Provider value={value}>{children}</OrderDraftContext.Provider>;
}

export function useOrderDraft(): OrderDraftApi {
  const api = useContext(OrderDraftContext);
  if (!api) {
    throw new Error("useOrderDraft must be used inside <OrderDraftProvider>");
  }
  return api;
}
