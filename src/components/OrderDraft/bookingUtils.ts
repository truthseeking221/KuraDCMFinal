"use client";

import {
  bookingCancelLocked,
  bookingPaymentSettled,
} from "./OrderDraftContext";
import type { BookingListItem, BookingStatus, PaymentStatus, PlacedOrderSummary } from "./types";

export const BOOKING_STATUS_BADGE: Record<
  BookingStatus,
  { tone: "neutral" | "warning" | "success"; label: string }
> = {
  scheduled: { tone: "neutral", label: "Scheduled" },
  "in-progress": { tone: "warning", label: "In progress" },
  "results-back": { tone: "success", label: "Results back" },
};

export type OperationalBookingStatus = {
  label: string;
  tone: "neutral" | "info" | "success" | "warning" | "danger";
};

export function getBookingAnchor(order: PlacedOrderSummary): string {
  if (order.bookingCode) return order.bookingCode;
  if (order.handoverCode) return `Handover ${order.handoverCode}`;
  if (order.sweep) return order.code;
  return order.code;
}

export function getRouteLabel(order: PlacedOrderSummary): string {
  if (order.route === "psc") return order.stat ? "PSC · urgent SMS" : "PSC";
  return order.stat ? "Clinic draw · STAT" : "Clinic draw";
}

export function getOperationalBookingStatus(order: PlacedOrderSummary): OperationalBookingStatus {
  if (order.cancelled) return { label: "Cancelled", tone: "neutral" };
  if (order.bookingStatus === "results-back") {
    return order.flagged
      ? { label: "Results back · flagged", tone: "danger" }
      : { label: "Results back", tone: "success" };
  }
  if (order.bookingStatus === "in-progress") return { label: "In progress", tone: "warning" };
  if (order.route === "psc") return { label: "Awaiting visit", tone: "warning" };
  return { label: "Clinic pickup scheduled", tone: "info" };
}

/* One scannable payment line — state first, method second. */
export function getPaymentSummary(order: PlacedOrderSummary): string {
  const { label, status } = order.payment;
  const byStatus: Record<PaymentStatus, string> = {
    pending: "Payment due at draw",
    collected: `Payment collected · ${label}`,
    waiting: `Payment waiting · ${label}`,
    deferred: "Payment at PSC counter",
    "pending-claim": `Claim pending · ${label}`,
    claimed: `Claim settled · ${label}`,
    refunded: "Payment refunded",
    voided: "Payment voided",
  };
  return byStatus[status];
}

/* What happens next in the episode — the line a doctor scans for. */
export function getBookingNextStep(order: PlacedOrderSummary): string | null {
  if (order.cancelled) return null;
  switch (order.bookingStatus) {
    case "scheduled":
      if (order.route === "psc") return "Next: patient visits PSC with this code";
      if (order.handoverCode) return `Next: courier handoff · ${order.handoverCode}`;
      return order.sweep ? `Next: clinic draw · ${order.sweep}` : "Next: clinic draw";
    case "in-progress":
      return order.route === "psc"
        ? "Next: sample at lab — results pending"
        : "Next: sample in transit — results pending";
    case "results-back":
      return "Results back — review in Labs";
  }
}

export function getDetailNextStep(order: PlacedOrderSummary): string {
  if (order.cancelled) return "Booking voided. Payment status is shown below.";
  if (order.bookingStatus === "results-back") return "Results back — review in Labs.";
  if (order.bookingStatus === "in-progress") {
    return order.route === "psc"
      ? "Sample collected at PSC. Results expected today."
      : "Sample collected for clinic draw. Results expected today.";
  }
  if (order.route === "psc") return "Patient has not checked in yet. Code sent by Telegram + SMS.";
  if (order.stat && order.handoverCode) return `Courier dispatched. Handover code ${order.handoverCode}.`;
  return order.sweep ? `Tubes ready for next sweep · ${order.sweep}.` : "Tubes ready for clinic pickup.";
}

/* Why cancel is unavailable, in claim terms — shown instead of a dead button. */
export function getLockReason(order: PlacedOrderSummary): string | null {
  if (order.cancelled || !bookingCancelLocked(order)) return null;
  return bookingPaymentSettled(order) ? "Cancel locked · payment collected" : "Cancel locked · sample at lab";
}

export function getEditLockReason(order: PlacedOrderSummary): string | null {
  if (order.cancelled) return "Edit locked · booking cancelled";
  if (order.bookingStatus === "results-back") return "Edit locked · results already back";
  return null;
}

export function getResendUnavailableReason(order: PlacedOrderSummary): string | null {
  if (order.route !== "psc") return "Resend unavailable · clinic draw";
  if (order.cancelled) return "Resend unavailable · booking cancelled";
  if (order.bookingStatus === "results-back") return "Resend unavailable · results already back";
  return null;
}

/* Reorder is recovery, not a shortcut — only once the episode has ended. */
export function canOrderAgain(order: PlacedOrderSummary): boolean {
  return order.cancelled || order.bookingStatus === "results-back";
}

export function getBookingTestSummary(order: PlacedOrderSummary, visibleCount = 2): string {
  const visible = order.lines.slice(0, visibleCount).map((line) => line.displayName);
  const remaining = order.lines.length - visible.length;
  return `${visible.join(" · ")}${remaining > 0 ? ` +${remaining}` : ""}`;
}

export function bookingMatchesCode(order: PlacedOrderSummary, code: string): boolean {
  const normalized = code.trim().toLowerCase();
  if (!normalized) return false;
  return [order.code, order.bookingCode, order.handoverCode, getBookingAnchor(order)]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase() === normalized);
}

export function getBookingSearchKeywords(order: BookingListItem): string[] {
  return [
    order.patientName,
    order.mrn,
    order.phoneMasked,
    order.code,
    order.bookingCode ?? "",
    order.handoverCode ?? "",
    getBookingAnchor(order),
    getRouteLabel(order),
    getOperationalBookingStatus(order).label,
    getPaymentSummary(order),
    ...order.lines.flatMap((line) => [line.displayName, line.itemId ?? "", line.kind]),
  ].filter(Boolean);
}
