"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { orderBundleById, resolveOrderable } from "./catalog";
import { LAB_TO_CATALOG, mapLabKeyToItemId } from "./labMapping";
import { tubesForLines } from "./tubes";
import type {
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

/* STAT on the clinic route dispatches a courier immediately — fee applies.
   STAT on the PSC route is an URGENT SMS; the patient transports themselves. */
export const STAT_CLINIC_FEE = 15;

export const SWEEP_WINDOW = "14:15–14:30 · Sok S.";
export const NEAREST_PSC = "Kura PSC · BKK1 · 1.2 km";
export const PATIENT_PHONE_MASKED = "070 ••• 496";

export type OrderDraftApi = {
  draft: OrderDraft;
  lines: OrderDraftLine[];
  lineCount: number;
  totals: { known: number; unpricedCount: number; statFee: number; due: number };
  /* itemIds currently in the draft — drop-in for the catalog checkboxes */
  selectedIds: ReadonlySet<string>;
  hasItem: (itemId: string) => boolean;
  /* lab row keys whose mapped test (directly, via a bundle, or as an
     unlisted line) is in the draft — "Planned" derives from membership */
  plannedLabKeys: ReadonlySet<string>;
  toggleCatalogItem: (itemId: string, source?: OrderLineSource) => void;
  addLabTest: (labKey: string, meta: LabTestMeta) => void;
  removeLabTest: (labKey: string) => void;
  removeLine: (lineId: string) => void;
  clearDraft: () => void;
  setRoute: (route: OrderRouteId) => void;
  setStat: (stat: boolean) => void;
  setPscPay: (choice: PscPayChoice) => void;
  /* building → placed (PSC) or → preparing (clinic; commits at tube confirm) */
  placeOrder: () => void;
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

const OrderDraftContext = createContext<OrderDraftApi | null>(null);

export const ACTIVE_PATIENT_ID = "sokha-chan";

const EMPTY_CHECKOUT: OrderCheckout = { route: null, stat: false, pscPay: null };

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

/* Drafts start empty — nothing enters the cart without an explicit tap
   (suggestions are one tap away, never pre-added). */
function seedDraft(patientId: string): OrderDraft {
  return {
    patientId,
    status: "building",
    lines: [],
    checkout: { ...EMPTY_CHECKOUT },
    prep: null,
    lastPlaced: null,
    placedOrders: [],
  };
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
  if (route === "clinic") return { label: "Insurance · Forte", status: "pending-claim" };
  if (pscPay === "cash") return { label: "Cash · collected at clinic", status: "collected" };
  if (pscPay === "khqr") return { label: "KHQR via Telegram", status: "waiting" };
  return { label: "At PSC counter", status: "deferred" };
}

export function OrderDraftProvider({ patientId, children }: { patientId: string; children: ReactNode }) {
  const [drafts, setDrafts] = useState<Record<string, OrderDraft>>(() => ({
    [patientId]: seedDraft(patientId),
  }));
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

  const setCheckout = useCallback(
    (patch: Partial<OrderCheckout>) => {
      mutate((current) => ({ ...current, checkout: { ...current.checkout, ...patch } }));
    },
    [mutate],
  );

  const setRoute = useCallback((route: OrderRouteId) => setCheckout({ route }), [setCheckout]);
  const setStat = useCallback((stat: boolean) => setCheckout({ stat }), [setCheckout]);
  const setPscPay = useCallback((pscPay: PscPayChoice) => setCheckout({ pscPay }), [setCheckout]);

  const buildSummary = useCallback((current: OrderDraft): PlacedOrderSummary => {
    orderSeqRef.current += 1;
    const seq = orderSeqRef.current;
    const route = current.checkout.route as OrderRouteId;
    const stat = current.checkout.stat;
    const statFee = route === "clinic" && stat ? STAT_CLINIC_FEE : 0;
    const known = current.lines.reduce((total, line) => total + (line.price ?? 0), 0);
    return {
      code: `ORD-${String(seq).padStart(4, "0")}`,
      bookingCode: route === "psc" ? friendlyBookingCode(seq) : undefined,
      handoverCode: route === "clinic" && stat ? handoverCodeOf(seq) : undefined,
      sweep: route === "clinic" && !stat ? SWEEP_WINDOW : undefined,
      route,
      stat,
      statFee,
      payment: paymentFor(route, current.checkout.pscPay),
      bookingStatus: "scheduled",
      cancelled: false,
      lines: current.lines,
      total: known + statFee,
      unpricedCount: current.lines.filter((line) => line.price === null).length,
    };
  }, []);

  /* Apply fn to the booking with this code, wherever it lives
     (the fresh lastPlaced receipt or the archived history). */
  const updateBooking = useCallback(
    (code: string, fn: (order: PlacedOrderSummary) => PlacedOrderSummary) => {
      setDrafts((all) => {
        const current = all[patientId];
        if (!current) return all;
        if (current.lastPlaced?.code === code) {
          return { ...all, [patientId]: { ...current, lastPlaced: fn(current.lastPlaced) } };
        }
        if (current.placedOrders.some((order) => order.code === code)) {
          return {
            ...all,
            [patientId]: {
              ...current,
              placedOrders: current.placedOrders.map((order) => (order.code === code ? fn(order) : order)),
            },
          };
        }
        return all;
      });
    },
    [patientId],
  );

  const placeOrder = useCallback(() => {
    setDrafts((all) => {
      const current = all[patientId] ?? seedDraft(patientId);
      const { route, pscPay } = current.checkout;
      if (current.status !== "building" || current.lines.length === 0 || !route) return all;
      if (route === "psc" && !pscPay) return all;
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
      return { ...all, [patientId]: { ...current, status: "placed", prep: null, lastPlaced: buildSummary(current) } };
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
      return { ...all, [patientId]: { ...current, status: "placed", prep: null, lastPlaced: buildSummary(current) } };
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
      return {
        ...all,
        [patientId]: {
          ...current,
          lastPlaced: {
            ...current.lastPlaced,
            payment: { label: "KHQR via Telegram", status: "collected" },
          },
        },
      };
    });
  }, [patientId]);

  /* Reorder = instant new scheduled booking (same tests/route/STAT, new
     codes, payment settles at draw) — the current draft is untouched.
     Adjustments happen through Edit tests while the booking is scheduled. */
  const reorder = useCallback(
    (code: string) => {
      setDrafts((all) => {
        const current = all[patientId] ?? seedDraft(patientId);
        const source =
          current.lastPlaced?.code === code
            ? current.lastPlaced
            : current.placedOrders.find((order) => order.code === code);
        if (!source) return all;
        orderSeqRef.current += 1;
        const seq = orderSeqRef.current;
        const lines = source.lines.map((line) => ({ ...line, addedAt: seqRef.current++ }));
        const known = lines.reduce((sum, line) => sum + (line.price ?? 0), 0);
        const statFee = source.route === "clinic" && source.stat ? STAT_CLINIC_FEE : 0;
        const clone: PlacedOrderSummary = {
          code: `ORD-${String(seq).padStart(4, "0")}`,
          bookingCode: source.route === "psc" ? friendlyBookingCode(seq) : undefined,
          handoverCode: source.route === "clinic" && source.stat ? handoverCodeOf(seq) : undefined,
          sweep: source.route === "clinic" && !source.stat ? SWEEP_WINDOW : undefined,
          route: source.route,
          stat: source.stat,
          statFee,
          payment:
            source.route === "clinic"
              ? { label: "Insurance · Forte", status: "pending-claim" }
              : { label: "At PSC counter", status: "pending" },
          bookingStatus: "scheduled",
          cancelled: false,
          lines,
          total: known + statFee,
          unpricedCount: lines.filter((line) => line.price === null).length,
        };
        return { ...all, [patientId]: { ...current, placedOrders: [clone, ...current.placedOrders] } };
      });
    },
    [patientId],
  );

  /* Demo lifecycle advance: scheduled → in-progress (sample collected; PSC
     money settles at draw) → results-back (clinic claim settles). */
  const advanceBooking = useCallback(
    (code: string) => {
      updateBooking(code, (order) => {
        if (order.cancelled) return order;
        if (order.bookingStatus === "scheduled") {
          const settles = ["pending", "deferred", "waiting"].includes(order.payment.status);
          return {
            ...order,
            bookingStatus: "in-progress",
            payment: settles ? { ...order.payment, status: "collected" } : order.payment,
          };
        }
        if (order.bookingStatus === "in-progress") {
          return {
            ...order,
            bookingStatus: "results-back",
            payment:
              order.payment.status === "pending-claim" ? { ...order.payment, status: "claimed" } : order.payment,
          };
        }
        return order;
      });
    },
    [updateBooking],
  );

  const cancelBooking = useCallback(
    (code: string) => {
      updateBooking(code, (order) => {
        if (bookingCancelLocked(order)) return order;
        return {
          ...order,
          cancelled: true,
          payment: {
            ...order.payment,
            status: order.route === "psc" && order.payment.status === "collected" ? "refunded" : "voided",
          },
        };
      });
    },
    [updateBooking],
  );

  const restoreBooking = useCallback(
    (code: string) => {
      updateBooking(code, (order) => {
        if (!order.cancelled) return order;
        return {
          ...order,
          cancelled: false,
          payment:
            order.route === "clinic"
              ? { label: "Insurance · Forte", status: "pending-claim" }
              : { label: "At PSC counter", status: "pending" },
        };
      });
    },
    [updateBooking],
  );

  /* Edit-tests save (F5): allowed until tubes reach the lab */
  const updateBookingLines = useCallback(
    (code: string, lines: OrderDraftLine[]) => {
      updateBooking(code, (order) => {
        if (bookingEditsLocked(order) || lines.length === 0) return order;
        const known = lines.reduce((sum, line) => sum + (line.price ?? 0), 0);
        return {
          ...order,
          lines,
          total: known + order.statFee,
          unpricedCount: lines.filter((line) => line.price === null).length,
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
    return {
      draft,
      lines,
      lineCount: lines.length,
      totals: { known, unpricedCount, statFee, due: known + statFee },
      selectedIds,
      hasItem: (itemId: string) => selectedIds.has(itemId),
      plannedLabKeys,
      toggleCatalogItem,
      addLabTest,
      removeLabTest,
      removeLine,
      clearDraft,
      setRoute,
      setStat,
      setPscPay,
      placeOrder,
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
    toggleCatalogItem,
    addLabTest,
    removeLabTest,
    removeLine,
    clearDraft,
    setRoute,
    setStat,
    setPscPay,
    placeOrder,
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
