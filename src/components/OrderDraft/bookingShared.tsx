"use client";

/* Shared booking logic — ONE source for status, lifecycle copy, and the manage
   actions. The patient-scoped rail (OrderDraftHistory → BookingRow) and the
   global Bookings workspace (BookingDetailDrawer) both render these, so edit /
   cancel / resend / reorder behave identically wherever a doctor reaches them. */

import { useMemo, useState } from "react";
import type { ComponentType } from "react";
import { Badge, Button, IconButton, Search } from "@/components/ui";
import type { BadgeTone } from "@/components/ui";
import {
  Bell as BellIcon,
  Calendar as CalendarIcon,
  CheckCircle as CheckCircleIcon,
  Clock as ClockIcon,
  Close as CloseIcon,
  Flask as FlaskIcon,
  Plus as PlusIcon,
  Warning as WarningIcon,
} from "@/icons/components";
import type { IconProps } from "@/icons";
import { cx } from "@/lib/cx";
import { formatMoney, orderItems } from "./catalog";
import {
  bookingCancelLocked,
  bookingEditsLocked,
  bookingPaymentSettled,
  useOrderDraft,
} from "./OrderDraftContext";
import type { OrderDraftLine, PaymentStatus, PlacedOrderSummary } from "./types";

type StatusView = { label: string; tone: BadgeTone; Icon: ComponentType<IconProps> };

export type BookingEta = {
  label: string;
  detail: string;
  tone: BadgeTone;
};

export function getBookingAnchor(order: PlacedOrderSummary): string {
  if (order.bookingCode) return order.bookingCode;
  if (order.handoverCode) return `Handover ${order.handoverCode}`;
  return order.code;
}

export function getRouteLabel(order: PlacedOrderSummary): string {
  if (order.route === "psc") return order.stat ? "PSC · urgent SMS" : "PSC";
  return order.stat ? "Clinic draw · STAT" : "Clinic draw";
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

export function getBookingSearchKeywords(order: PlacedOrderSummary): string[] {
  return [
    order.code,
    order.bookingCode ?? "",
    order.handoverCode ?? "",
    getBookingAnchor(order),
    getRouteLabel(order),
    bookingStatusView(order).label,
    getPaymentSummary(order),
    ...order.lines.flatMap((line) => [line.displayName, line.itemId ?? "", line.kind]),
  ].filter(Boolean);
}

/* Awaiting visit is the doctor-owned JUST_CREATED state: the booking code
   exists, but internal reception has not confirmed a PSC draw yet. */
export function isBookingAwaitingVisit(order: PlacedOrderSummary): boolean {
  return !order.cancelled && order.route === "psc" && order.bookingStatus === "scheduled";
}

/* Status as the doctor reads it — never color alone. A PSC in-progress booking
   reads as "Sample drawn"; internal "Confirm & Draw" is not exposed here. */
export function bookingStatusView(order: PlacedOrderSummary): StatusView {
  if (order.cancelled) return { label: "Cancelled", tone: "neutral", Icon: CloseIcon };
  switch (order.bookingStatus) {
    case "scheduled":
      if (isBookingAwaitingVisit(order)) {
        return { label: "Awaiting visit", tone: "warning", Icon: ClockIcon };
      }
      return { label: "Scheduled", tone: "neutral", Icon: CalendarIcon };
    case "in-progress":
      if (order.route === "psc") {
        return { label: "Sample drawn", tone: "info", Icon: FlaskIcon };
      }
      return { label: "In progress", tone: "warning", Icon: FlaskIcon };
    case "results-back":
      return order.flagged
        ? { label: "Flagged", tone: "danger", Icon: WarningIcon }
        : { label: "Results back", tone: "success", Icon: CheckCircleIcon };
  }
}

/* ----------------------------------------------------------------------------
   Worklist axes — a booking carries three ORTHOGONAL dimensions the doctor reads
   separately, never blurred into one "Status":
     1. Lifecycle      — where the order is in the lab workflow (the only status)
     2. Collection plan — how/where the sample is taken (a route, not a status)
     3. Needs action    — a work exception overlaid on any lifecycle (claim,
                          identity, abnormal review)
   Time scope is a filter, handled in the workspace, not a per-row dimension.
   ------------------------------------------------------------------------- */

export type BookingLifecycleId = "awaiting-collection" | "sample-collected" | "results-ready" | "cancelled";

/* Lifecycle is the ONE status column. Maps the backend trace
   JUST_CREATED → SAMPLE_DRAWN → RESULTS_BACK to doctor language. Claim/payment
   never appears here — it is an action overlay, not a workflow stage. */
export function getBookingLifecycle(order: PlacedOrderSummary): {
  id: BookingLifecycleId;
  label: string;
  tone: BadgeTone;
  Icon: ComponentType<IconProps>;
} {
  if (order.cancelled) return { id: "cancelled", label: "Cancelled", tone: "neutral", Icon: CloseIcon };
  switch (order.bookingStatus) {
    case "scheduled":
      return { id: "awaiting-collection", label: "Awaiting collection", tone: "warning", Icon: ClockIcon };
    case "in-progress":
      return { id: "sample-collected", label: "Sample collected", tone: "info", Icon: FlaskIcon };
    case "results-back":
      return { id: "results-ready", label: "Results ready", tone: "success", Icon: CheckCircleIcon };
  }
}

/* Collection plan is the route the sample takes — stable across the lifecycle, so
   it sits in its own column instead of leaking into "next step". */
export function getCollectionPlan(order: PlacedOrderSummary): { label: string; detail: string | null } {
  if (order.route === "psc") {
    return { label: "Patient visits PSC", detail: order.stat ? "Urgent · SMS" : null };
  }
  if (order.sweep) return { label: "Clinic pickup", detail: order.sweep };
  if (order.handoverCode) return { label: "Clinic draw", detail: order.stat ? "STAT courier" : `Handover ${order.handoverCode}` };
  return { label: "Clinic draw", detail: order.stat ? "STAT" : null };
}

/* Work-exception overlay — orthogonal to lifecycle. True when the doctor (not the
   PSC, lab, or finance desk) has something to resolve: an abnormal result to
   review, a provisional identity to clear, or a payment/claim exception. A
   booking can be "Sample collected" AND need action (claim pending) at once. */
export function getBookingNeedsAction(order: PlacedOrderSummary): boolean {
  if (order.cancelled) return false;
  if (order.flagged && order.bookingStatus === "results-back") return true;
  if (order.route === "psc" && order.bookingStatus === "scheduled" && order.patientAssurance === "provisional") return true;
  if (order.payment.status === "pending-claim" || order.payment.status === "waiting") return true;
  return false;
}

/* What THIS doctor does or waits on next — ownership framing, never an internal
   PSC/lab confirm-and-draw step. Lifecycle owns the status column; a claim/
   payment exception rides as a secondary note, not the headline, unless it is
   the only outstanding thing. */
export function getDoctorAction(order: PlacedOrderSummary): { title: string; detail: string | null; tone: BadgeTone } {
  if (order.cancelled) {
    return {
      title: "View reason",
      detail: order.payment.status === "refunded" ? "Payment refunded" : "Booking cancelled",
      tone: "neutral",
    };
  }
  const claimNote =
    order.payment.status === "pending-claim" ? "Claim pending" : order.payment.status === "waiting" ? "Payment waiting" : null;

  if (order.bookingStatus === "results-back") {
    return order.flagged
      ? { title: "Review results", detail: "Abnormal — review in Labs", tone: "danger" }
      : { title: "Review results", detail: "Ready to report in Labs", tone: "success" };
  }
  if (order.bookingStatus === "scheduled") {
    if (order.route === "psc") {
      if (order.patientAssurance === "provisional") {
        return { title: "Verify ID at PSC", detail: "PSC confirms identity, then draws", tone: "warning" };
      }
      return { title: "Code sent · waiting for PSC check-in", detail: claimNote, tone: "info" };
    }
    if (order.sweep) return { title: "Waiting for clinic pickup", detail: order.sweep, tone: "info" };
    if (order.handoverCode) return { title: "Courier dispatched", detail: claimNote ?? `Handover ${order.handoverCode}`, tone: "info" };
    return { title: "Waiting for clinic draw", detail: claimNote, tone: "info" };
  }
  return { title: "Waiting for results", detail: claimNote, tone: "info" };
}

/* Trailing time context — due time for a scheduled collection, last-update time
   otherwise — tagged with the one-word stage it belongs to. */
export function getBookingDue(order: PlacedOrderSummary): { primary: string; detail: string } {
  const primary = order.placedAt ?? "Today";
  const detail = order.cancelled
    ? "Cancelled"
    : order.bookingStatus === "results-back"
      ? "Result update"
      : order.bookingStatus === "in-progress"
        ? "At lab"
        : order.route === "psc"
          ? "PSC"
          : order.sweep
            ? "Clinic pickup"
            : "Clinic draw";
  return { primary, detail };
}

/* ----------------------------------------------------------------------------
   Atomic cell values for the doctor Bookings table. One cell = one value: the
   table is for scanning, the drawer is for reading. No "title · subtext" here.
   ------------------------------------------------------------------------- */

/* Order = ONE summary. One test → its name; a bundle → the bundle name; more
   than one line → "N tests". The full test list lives in the drawer. */
export function getOrderSummary(order: PlacedOrderSummary): string {
  const lines = order.lines;
  if (lines.length === 0) return "—";
  if (lines.length === 1) return lines[0].displayName;
  const bundle = lines.find((line) => line.kind === "bundle");
  if (bundle) return bundle.displayName;
  return `${lines.length} tests`;
}

/* Collection = ONE route word. Once the sample is drawn it sits at the lab, so
   collected/results bookings read "Lab"; pending ones read their route. The
   window + branch + courier detail live in the drawer. */
export function getCollectionRoute(order: PlacedOrderSummary): string {
  if (order.bookingStatus === "in-progress" || order.bookingStatus === "results-back") return "Lab";
  if (order.route === "psc") return "PSC";
  if (order.sweep) return "Clinic pickup";
  return "Clinic draw";
}

/* Doctor action = ONE verb, and ONLY when the doctor is the one who must act.
   Waiting on the patient / PSC / lab / finance is NOT a doctor action → "None".
   (A claim that genuinely needs the doctor lives in the drawer's Billing.) */
export function getDoctorActionLabel(order: PlacedOrderSummary): string {
  if (order.cancelled) return "None";
  if (order.bookingStatus === "results-back") return "Review";
  if (order.bookingStatus === "scheduled" && order.route === "psc" && order.patientAssurance === "provisional") return "Fix";
  return "None";
}

export function bookingHasDoctorAction(order: PlacedOrderSummary): boolean {
  return getDoctorActionLabel(order) !== "None";
}

/* Last event = ONE latest event in the booking timeline. */
export function getLastEvent(order: PlacedOrderSummary): string {
  if (order.cancelled) return "Cancelled";
  if (order.bookingStatus === "results-back") return "Results ready";
  if (order.bookingStatus === "in-progress") return "Sample received";
  if (order.route === "psc") return "Code sent";
  if (order.sweep) return "Pickup scheduled";
  return "Created";
}

/* Time = ONE time value. A scheduled clinic pickup shows its window start
   ("14:15"); everything else shows when it last moved ("Today", "20m ago"). */
export function getBookingTime(order: PlacedOrderSummary): string {
  if (order.bookingStatus === "scheduled" && order.sweep) {
    const match = order.sweep.match(/\d{1,2}:\d{2}/);
    if (match) return match[0];
  }
  const raw = order.placedAt ?? "Today";
  return raw.charAt(0).toUpperCase() + raw.slice(1);
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

/* Forward-looking ETA/work cue for the queue. This intentionally folds route,
   payment, and specimen state into one scannable line, matching the prototype's
   "what happens next?" column instead of a passive timestamp. */
export function getBookingEta(order: PlacedOrderSummary): BookingEta {
  if (order.cancelled) {
    return {
      label: "Voided",
      detail: order.payment.status === "refunded" ? "Payment refunded" : "No active collection",
      tone: "neutral",
    };
  }
  if (order.bookingStatus === "results-back") {
    return order.flagged
      ? { label: "Review now", detail: "Abnormal result holds report", tone: "danger" }
      : { label: "Reported", detail: "Results ready for close-out", tone: "success" };
  }
  if (order.bookingStatus === "scheduled") {
    if (order.route === "psc") {
      /* A provisional identity must be verified at the PSC before the draw — the
         queue says so instead of the plain "no check-in yet". */
      const provisional = order.patientAssurance === "provisional";
      return {
        label: "Awaiting visit",
        detail: provisional ? "PSC must verify identity before draw" : "Code sent; no PSC check-in yet",
        tone: "warning",
      };
    }
    if (order.handoverCode) {
      return {
        label: "Rider dispatched",
        detail: `Use handover ${order.handoverCode}`,
        tone: "info",
      };
    }
    return {
      label: order.sweep ? `Sweep ${order.sweep}` : "Clinic pickup",
      detail: "Tubes ready; leave bag at reception",
      tone: "info",
    };
  }
  if (order.bookingStatus === "in-progress" && order.route === "psc") {
    return {
      label: "Sample drawn",
      detail: "PSC collected sample; lab processing",
      tone: "info",
    };
  }
  return {
    label: "At lab",
    detail: "Sample received; results pending today",
    tone: "info",
  };
}

/* What happens next in the episode — the one line a doctor scans for (table
   column + rail). */
export function getBookingNextStep(order: PlacedOrderSummary): string | null {
  if (order.cancelled) return null;
  switch (order.bookingStatus) {
    case "scheduled":
      return order.route === "psc"
        ? order.patientAssurance === "provisional"
          ? "PSC verifies patient identity, then draws"
          : "Patient visits PSC with this code"
        : order.handoverCode
          ? `Courier dispatched · handover ${order.handoverCode}`
          : order.sweep
            ? `Clinic pickup · ${order.sweep}`
            : "Clinic draw scheduled";
    case "in-progress":
      return order.route === "psc" ? "Sample drawn at PSC — results pending" : "Sample at lab — results pending";
    case "results-back":
      return order.flagged ? "Abnormal flagged — review in Labs" : "Results back — review in Labs";
  }
}

/* The expanded, route-specific next-step card for the booking detail. */
export function getBookingNextStepCard(order: PlacedOrderSummary): { title: string; body: string } {
  if (order.cancelled) {
    return {
      title: "Booking voided",
      body:
        order.payment.status === "refunded"
          ? "Tests cancelled. Collected payment was refunded."
          : "Tests cancelled. No payment was settled.",
    };
  }
  switch (order.bookingStatus) {
    case "scheduled":
      if (order.route === "psc") {
        return {
          title: "Patient has the PSC code",
          body: "Booking code sent by Telegram + SMS. No PSC check-in is recorded yet.",
        };
      }
      if (order.handoverCode) {
        return { title: "Courier dispatched", body: `Hand the tubes over with code ${order.handoverCode}.` };
      }
      return {
        title: "Tubes ready for next sweep",
        body: order.sweep ? `${order.sweep} — leave the bag at reception.` : "Prepared for the next clinic sweep.",
      };
    case "in-progress":
      if (order.route === "psc") {
        return { title: "Sample drawn at PSC", body: "Internal reception confirmed the draw; results are pending." };
      }
      return { title: "Sample collected", body: "At the lab now — results expected today." };
    case "results-back":
      return order.flagged
        ? { title: "Results back — abnormal", body: "Flagged values need a doctor. Review in Labs to close out." }
        : { title: "Results back", body: "Review the results in Labs to close out the episode." };
  }
}

/* Why cancel is unavailable, in claim terms — shown instead of a dead button. */
export function getLockReason(order: PlacedOrderSummary): string | null {
  if (order.cancelled || !bookingCancelLocked(order)) return null;
  return bookingPaymentSettled(order) ? "Cancel locked · payment collected" : "Cancel locked · sample at lab";
}

/* Reorder is recovery, not a shortcut — only once the episode has ended. */
export function canOrderAgain(order: PlacedOrderSummary): boolean {
  return order.cancelled || order.bookingStatus === "results-back";
}

export function BookingEditPanel({
  order,
  onDone,
}: {
  order: PlacedOrderSummary;
  onDone: (note: string | null) => void;
}) {
  const { mintLineForItem, updateBookingLines } = useOrderDraft();
  const [removedIds, setRemovedIds] = useState<Set<string>>(() => new Set());
  const [added, setAdded] = useState<OrderDraftLine[]>([]);
  const [query, setQuery] = useState("");

  const keptCount = order.lines.length - removedIds.size + added.length;
  const dirty = removedIds.size > 0 || added.length > 0;
  const presentIds = useMemo(
    () => new Set([...order.lines.map((line) => line.lineId), ...added.map((line) => line.lineId)]),
    [added, order.lines],
  );
  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return [];
    return orderItems
      .filter(
        (item) =>
          !item.unavailable &&
          !presentIds.has(item.id) &&
          (item.name.toLowerCase().includes(normalized) || item.code.toLowerCase().includes(normalized)),
      )
      .slice(0, 5);
  }, [presentIds, query]);

  const liveTotal =
    order.lines.reduce((sum, line) => sum + (removedIds.has(line.lineId) ? 0 : (line.price ?? 0)), 0) +
    added.reduce((sum, line) => sum + (line.price ?? 0), 0) +
    order.statFee;

  return (
    <div className="odr-edit">
      {order.lines.map((line) => {
        const removed = removedIds.has(line.lineId);
        return (
          <div className={cx("odr-edit-line", removed && "is-removed")} key={line.lineId}>
            <span className="odr-edit-name">{line.displayName}</span>
            {removed && <span className="odr-edit-tag odr-edit-tag-removed">Removed</span>}
            <span className="odr-edit-price">{line.price === null ? "$—" : formatMoney(line.price)}</span>
            {removed ? (
              <button
                className="odr-edit-undo"
                onClick={() =>
                  setRemovedIds((current) => {
                    const next = new Set(current);
                    next.delete(line.lineId);
                    return next;
                  })
                }
                type="button"
              >
                Undo
              </button>
            ) : (
              <IconButton
                aria-label={`Remove ${line.displayName}`}
                icon={<CloseIcon size={12} variant="stroke" />}
                onClick={() => setRemovedIds((current) => new Set(current).add(line.lineId))}
                size="micro"
                variant="tertiary"
              />
            )}
          </div>
        );
      })}
      {added.map((line) => (
        <div className="odr-edit-line" key={line.lineId}>
          <span className="odr-edit-name">{line.displayName}</span>
          <span className="odr-edit-tag odr-edit-tag-new">New</span>
          <span className="odr-edit-price">{line.price === null ? "$—" : formatMoney(line.price)}</span>
          <IconButton
            aria-label={`Remove ${line.displayName}`}
            icon={<CloseIcon size={12} variant="stroke" />}
            onClick={() => setAdded((current) => current.filter((entry) => entry.lineId !== line.lineId))}
            size="micro"
            variant="tertiary"
          />
        </div>
      ))}

      <Search
        aria-label="Add a test"
        containerClassName="odr-edit-search"
        density="compact"
        onChange={(event) => setQuery(event.target.value)}
        onClear={() => setQuery("")}
        placeholder="Add a test..."
        value={query}
      />
      {results.map((item) => (
        <button
          className="odr-edit-result"
          key={item.id}
          onClick={() => {
            const line = mintLineForItem(item.id);
            if (line) setAdded((current) => [...current, line]);
            setQuery("");
          }}
          type="button"
        >
          <PlusIcon size={12} variant="stroke" />
          <span>{item.name}</span>
          <span className="odr-edit-price">{formatMoney(item.price)}</span>
        </button>
      ))}

      <div className="odr-edit-foot">
        <span className="odr-edit-total">
          <small>Total</small>
          {formatMoney(liveTotal)}
        </span>
        <Button intent="ghost" onClick={() => onDone(null)} size="sm">
          Discard
        </Button>
        <Button
          disabled={!dirty || keptCount === 0}
          intent="primary"
          onClick={() => {
            const lines = [...order.lines.filter((line) => !removedIds.has(line.lineId)), ...added];
            updateBookingLines(order.code, lines);
            onDone(`Updated ${order.bookingCode ?? order.code} · +${added.length} · −${removedIds.size}`);
          }}
          size="sm"
        >
          {keptCount === 0 ? "Order can't be empty" : dirty ? "Save changes" : "No changes yet"}
        </Button>
      </div>
    </div>
  );
}

/* The manage-booking action machine: edit / cancel / resend / restore / reorder,
   the lock reason in place of a dead button, and the prototype-only status
   advance behind a disclosure. Rendered identically by the rail row and the
   workspace detail drawer. */
export function BookingActions({
  order,
  showDemoControls = false,
}: {
  order: PlacedOrderSummary;
  showDemoControls?: boolean;
}) {
  const { advanceBooking, cancelBooking, reorder, restoreBooking } = useOrderDraft();
  const [mode, setMode] = useState<"actions" | "editing" | "cancelling" | "resending">("actions");
  const [note, setNote] = useState<string | null>(null);

  const editsLocked = bookingEditsLocked(order);
  const cancelLocked = bookingCancelLocked(order);
  const canResend = order.route === "psc" && !order.cancelled && order.bookingStatus !== "results-back";
  const lockReason = getLockReason(order);

  return (
    <div className="odr-manage">
      {note && <span className="odr-booking-note">{note}</span>}

      {mode === "editing" ? (
        <BookingEditPanel
          onDone={(result) => {
            setMode("actions");
            if (result) setNote(result);
          }}
          order={order}
        />
      ) : mode === "cancelling" ? (
        <div className="odr-confirm odr-confirm--danger">
          <div className="odr-confirm-head">
            <span aria-hidden className="odr-confirm-ic">
              <WarningIcon size={14} variant="stroke" />
            </span>
            <strong>Cancel {order.bookingCode ?? order.code}?</strong>
          </div>
          <span className="odr-confirm-copy">
            {order.lines.length} {order.lines.length === 1 ? "test" : "tests"} will be voided.{" "}
            {order.route === "psc"
              ? "The patient is notified via Telegram + SMS."
              : "The courier dispatch is cancelled."}{" "}
            Collected cash must be refunded manually.
          </span>
          <div className="odr-confirm-actions">
            <Button intent="ghost" onClick={() => setMode("actions")} size="sm">
              Keep order
            </Button>
            <Button
              intent="destructive"
              onClick={() => {
                cancelBooking(order.code);
                setMode("actions");
                setNote(null);
              }}
              size="sm"
            >
              Cancel order
            </Button>
          </div>
        </div>
      ) : mode === "resending" ? (
        <div className="odr-confirm odr-confirm--info">
          <div className="odr-confirm-head">
            <span aria-hidden className="odr-confirm-ic">
              <BellIcon size={14} variant="stroke" />
            </span>
            <strong>Resend booking slip?</strong>
          </div>
          <span className="odr-confirm-copy">
            Use sparingly — repeated pings reduce future open-rates on Telegram.
          </span>
          <div className="odr-confirm-actions">
            <Button intent="ghost" onClick={() => setMode("actions")} size="sm">
              Back
            </Button>
            <Button
              intent="primary"
              onClick={() => {
                setMode("actions");
                setNote(`Resent ${order.bookingCode ?? order.code} · Telegram + SMS`);
              }}
              size="sm"
            >
              Resend slip
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="odr-booking-actions">
            {!editsLocked && (
              <Button intent="outline" onClick={() => setMode("editing")} size="sm">
                Edit tests
              </Button>
            )}
            {canResend && (
              <Button intent="outline" onClick={() => setMode("resending")} size="sm">
                Resend slip
              </Button>
            )}
            {order.cancelled && (
              <Button intent="outline" onClick={() => restoreBooking(order.code)} size="sm">
                Restore booking
              </Button>
            )}
            {!order.cancelled && !cancelLocked && (
              <Button intent="outline" onClick={() => setMode("cancelling")} size="sm">
                Cancel booking
              </Button>
            )}
            {canOrderAgain(order) && (
              <Button intent="outline" onClick={() => reorder(order.code)} size="sm">
                Order again
              </Button>
            )}
          </div>
          {lockReason && <span className="odr-lock-reason">{lockReason}</span>}
          {/* prototype-only lifecycle controls — out of the doctor UX */}
          {showDemoControls && !order.cancelled && order.bookingStatus !== "results-back" && (
            <details className="odr-demo-disclosure">
              <summary>Demo status controls</summary>
              <button className="odr-demo-advance" onClick={() => advanceBooking(order.code)} type="button">
                {order.bookingStatus === "scheduled"
                  ? "Mark sample collected (demo)"
                  : "Mark results back (demo)"}
              </button>
            </details>
          )}
        </>
      )}
    </div>
  );
}

/* Recent-bookings row for the patient-scoped rail: an expandable summary line
   that opens the shared manage actions inline. The global workspace uses a
   table row + detail drawer instead, but both call <BookingActions />. */
export function BookingRow({ isNew, order }: { isNew: boolean; order: PlacedOrderSummary }) {
  const [expanded, setExpanded] = useState(false);
  const status = bookingStatusView(order);
  const nextStep = getBookingNextStep(order);

  return (
    <div className={cx("odr-booking", isNew && "is-new")}>
      <button
        aria-expanded={expanded}
        className="odr-history-row"
        onClick={() => setExpanded((current) => !current)}
        type="button"
      >
        <span className="odr-history-copy">
          <strong className={cx(order.cancelled && "odr-booking-cancelled")}>
            {order.bookingCode ?? order.code}
          </strong>
          <span className="odr-history-tests">
            {order.lines.map((line) => line.displayName).join(" · ")} ·{" "}
            {order.route === "psc" ? "PSC" : "Clinic"} · {formatMoney(order.total)}
            {order.stat ? " · STAT" : ""}
          </span>
        </span>
        <Badge icon={<status.Icon size={12} variant="stroke" />} tone={status.tone}>
          {status.label}
        </Badge>
      </button>

      {expanded && (
        <div className="odr-booking-detail">
          <span className="odr-manage-label">Manage booking</span>
          {!order.cancelled && (
            <div className="odr-booking-state">
              <span className="odr-booking-payline">{getPaymentSummary(order)}</span>
              {nextStep && <span className="odr-booking-next">{nextStep}</span>}
            </div>
          )}
          <BookingActions order={order} />
        </div>
      )}
    </div>
  );
}
