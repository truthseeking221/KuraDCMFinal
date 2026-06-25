"use client";

/* Shared booking logic — ONE source for status, lifecycle copy, and the manage
   actions. The patient-scoped rail (OrderDraftHistory → BookingRow) and the
   global Bookings workspace (BookingDetailDrawer) both render these, so edit /
   cancel / resend / reorder behave identically wherever a doctor reaches them. */

import { useEffect, useMemo, useState } from "react";
import type { ComponentType } from "react";
import { Badge, Button, IconButton, Search } from "@/components/ui";
import type { BadgeTone } from "@/components/ui";
import {
  Bell as BellIcon,
  Calendar as CalendarIcon,
  CheckCircle as CheckCircleIcon,
  Clock as ClockIcon,
  Close as CloseIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Flask as FlaskIcon,
  Plus as PlusIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon,
} from "@/icons/components";
import type { IconProps } from "@/icons";
import { cx } from "@/lib/cx";
import { formatMoney, orderItems } from "./catalog";
import { deriveOrderLedgerImpact } from "./ledger";
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
  if (order.route === "psc") return order.stat ? "Send patient to PSC · urgent SMS" : "Send patient to PSC";
  return order.stat ? "Send tubes to Kura · STAT" : "Send tubes to Kura";
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
      return { id: "awaiting-collection", label: "Waiting for sample", tone: "warning", Icon: ClockIcon };
    case "in-progress":
      return { id: "sample-collected", label: "Sample at lab", tone: "info", Icon: FlaskIcon };
    case "results-back":
      return { id: "results-ready", label: "Results back", tone: "success", Icon: CheckCircleIcon };
  }
}

/* Collection plan is the route the sample takes — stable across the lifecycle, so
   it sits in its own column instead of leaking into "next step". */
export function getCollectionPlan(order: PlacedOrderSummary): { label: string; detail: string | null } {
  if (order.route === "psc") {
    return { label: "Send patient to PSC", detail: order.stat ? "Urgent SMS" : null };
  }
  if (order.sweep) return { label: "Send tubes to Kura", detail: order.sweep };
  if (order.handoverCode) return { label: "Send tubes to Kura", detail: order.stat ? "STAT courier" : `Handover ${order.handoverCode}` };
  return { label: "Send tubes to Kura", detail: order.stat ? "STAT" : null };
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
    order.payment.status === "pending-claim" ? "Claim waiting" : order.payment.status === "waiting" ? "Waiting for payment" : null;

  if (order.bookingStatus === "results-back") {
    return order.flagged
      ? { title: "Review results", detail: "Abnormal results need a doctor review", tone: "danger" }
      : { title: "Results ready to share", detail: "Confirm and send from Labs", tone: "success" };
  }
  if (order.bookingStatus === "scheduled") {
    if (order.route === "psc") {
      if (order.patientAssurance === "provisional") {
        return { title: "PSC checks identity first", detail: "Sample is drawn after identity is confirmed", tone: "warning" };
      }
      return { title: "Code sent. Waiting for visit", detail: claimNote, tone: "info" };
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
            ? "Tubes to Kura"
            : "Tubes to Kura";
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
  if (order.sweep) return "Tubes";
  return "Tubes";
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
  if (order.bookingStatus === "results-back") return "Results back";
  if (order.bookingStatus === "in-progress") return "Sample at lab";
  if (order.route === "psc") return "Code sent";
  if (order.sweep) return "Pickup scheduled";
  return "Created";
}

/* Time = ONE time value. A scheduled clinic pickup shows its window start
   ("14:15"); everything else shows when it last moved ("Today", "20m ago"). */
export function getBookingTime(order: PlacedOrderSummary): string {
  /* upcoming visit day wins — the row should read as the future, not "today" */
  if (order.bookingStatus === "scheduled" && order.scheduledFor) return order.scheduledFor;
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
  const ledger = order.ledgerImpact ?? deriveOrderLedgerImpact(order);
  if (ledger.kind === "doctor-owes-kura") {
    /* State direction explicitly: the clinic OWES Kura. "received cash" alone read
       as money owed TO the clinic. */
    return `Clinic collected cash · owes Kura ${formatMoney(ledger.doctorOwes)}, settled after pickup`;
  }
  if (ledger.kind === "earning-confirmed" && (status === "collected" || status === "claimed")) {
    return `Paid · earning ${formatMoney(ledger.doctorEarns)} added`;
  }
  const byStatus: Record<PaymentStatus, string> = {
    pending: "Payment due at draw",
    collected: `Paid · ${label}`,
    waiting: `Waiting for payment · ${label}`,
    deferred: "Pay at PSC",
    "pending-claim": `Claim waiting · ${label}`,
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
      detail: order.payment.status === "refunded" ? "Payment refunded" : "No active visit",
      tone: "neutral",
    };
  }
  if (order.bookingStatus === "results-back") {
    return order.flagged
      ? { label: "Review now", detail: "Abnormal result needs review", tone: "danger" }
      : { label: "Ready to share", detail: "Confirm and send from Labs", tone: "success" };
  }
  if (order.bookingStatus === "scheduled") {
    if (order.route === "psc") {
      /* A provisional identity must be verified at the PSC before the draw — the
         queue says so instead of the plain "no check-in yet". */
      const provisional = order.patientAssurance === "provisional";
      return {
        label: "Waiting for visit",
        detail: provisional ? "PSC checks identity before draw" : "Code sent. No PSC visit yet",
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
      detail: "Tubes ready. Leave the bag at reception",
      tone: "info",
    };
  }
  if (order.bookingStatus === "in-progress" && order.route === "psc") {
    return {
      label: "Sample at lab",
      detail: "PSC collected the sample. Lab is processing",
      tone: "info",
    };
  }
  return {
    label: "At lab",
    detail: "Sample received. Results are pending today",
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
          ? "PSC checks identity, then draws the sample"
          : "Patient uses this code at the PSC"
        : order.handoverCode
          ? `Courier has handover ${order.handoverCode}`
        : order.sweep
            ? `Tubes to Kura ${order.sweep}`
            : "Tubes to Kura scheduled";
    case "in-progress":
      return order.route === "psc" ? "Sample drawn at PSC. Results pending" : "Sample at lab. Results pending";
    case "results-back":
      return order.flagged ? "Abnormal results need review in Labs" : "Results are back. Review in Labs";
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
          title: "Patient has the code",
          body: order.scheduledFor
            ? `Visit expected ${order.scheduledFor.toLowerCase()}. The PSC has not logged a visit yet.`
            : "We sent the booking by Telegram and SMS. The PSC has not logged a visit yet.",
        };
      }
      if (order.handoverCode) {
        return { title: "Courier dispatched", body: `Hand the tubes over with code ${order.handoverCode}.` };
      }
      return {
        title: "Tubes ready for next sweep",
        body: order.sweep ? `${order.sweep}. Leave the bag at reception.` : "Prepared for the next clinic sweep.",
      };
    case "in-progress":
      if (order.route === "psc") {
        return { title: "Sample drawn at PSC", body: "PSC confirmed the draw. Results are pending." };
      }
      return { title: "Sample at lab", body: "The lab has the sample. Results are expected today." };
    case "results-back": {
      /* Drive the copy off the real close-the-loop state, not just "lab finished".
         Absent resultReview on a results-back booking = unreviewed. */
      const review = order.resultReview ?? "unreviewed";
      if (review === "notified" || review === "closed") {
        return { title: "Reported to the patient", body: "Results were sent. The loop is closed." };
      }
      if (review === "reviewed") {
        return { title: "Reviewed, not sent yet", body: "Send the report to the patient to close the loop." };
      }
      return order.flagged
        ? { title: "Results need review", body: "Flagged values need a doctor review before the report is sent." }
        : { title: "Results are back", body: "Results ready. Not yet reported to the patient." };
    }
  }
}

/* Why cancel is unavailable, in claim terms — shown instead of a dead button. */
export function getLockReason(order: PlacedOrderSummary): string | null {
  if (order.cancelled || !bookingCancelLocked(order)) return null;
  return bookingPaymentSettled(order)
    ? "Payment is collected, so this booking cannot be cancelled. Refund cash at the clinic if needed."
    : "Cannot cancel after the sample reaches the lab.";
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
  const priceDelta = liveTotal - order.total;
  const editTone: BadgeTone = keptCount === 0 ? "danger" : dirty ? "warning" : "neutral";
  const editState = keptCount === 0 ? "Needs one test" : dirty ? "Unsaved changes" : "No changes";
  const testCountLabel = `${keptCount} ${keptCount === 1 ? "test" : "tests"} after save`;
  const changeLabel = dirty ? `${added.length} added · ${removedIds.size} removed` : `${order.lines.length} ordered`;
  const priceDeltaLabel = !dirty
    ? "Current booking total"
    : priceDelta === 0
      ? "No price change"
      : `${priceDelta > 0 ? "+" : "-"}${formatMoney(Math.abs(priceDelta))} vs current`;

  return (
    <div className="odr-edit">
      <div className="odr-edit-head">
        <div>
          <span className="odr-edit-kicker">Edit booking</span>
          <strong>Review tests before collection</strong>
        </div>
        <Badge tone={editTone}>{editState}</Badge>
      </div>

      <div className="odr-edit-summary" aria-label="Booking edit summary">
        <span>{testCountLabel}</span>
        <span>{changeLabel}</span>
      </div>

      <div className="odr-edit-lines" aria-label="Tests in booking" role="list">
        {order.lines.map((line) => {
          const removed = removedIds.has(line.lineId);
          return (
            <div className={cx("odr-edit-line", removed && "is-removed")} key={line.lineId} role="listitem">
              <span className="odr-edit-copy">
                <span className="odr-edit-name">{line.displayName}</span>
                <span className="odr-edit-note">{removed ? "Will be removed" : "Current"}</span>
              </span>
              {removed && <span className="odr-edit-tag odr-edit-tag-removed">Remove</span>}
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
          <div className="odr-edit-line is-new" key={line.lineId} role="listitem">
            <span className="odr-edit-copy">
              <span className="odr-edit-name">{line.displayName}</span>
              <span className="odr-edit-note">Added to booking</span>
            </span>
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
      </div>

      <div className="odr-edit-add">
        <div className="odr-edit-add-head">
          <span>Add test</span>
          <small>Active catalog</small>
        </div>
        <Search
          aria-label="Add a test"
          containerClassName="odr-edit-search"
          density="compact"
          onChange={(event) => setQuery(event.target.value)}
          onClear={() => setQuery("")}
          placeholder="Search test catalog..."
          value={query}
        />
        {query.trim() && results.length === 0 && (
          <p className="odr-edit-empty">No active test matches this search.</p>
        )}
        {results.length > 0 && (
          <div className="odr-edit-results" aria-label="Matching tests">
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
                <span className="odr-edit-result-copy">
                  <span>{item.name}</span>
                  <small>{item.code}</small>
                </span>
                <span className="odr-edit-price">{formatMoney(item.price)}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {keptCount === 0 && (
        <p className="odr-edit-warning">
          <WarningIcon size={14} variant="stroke" />
          Booking must keep at least one test.
        </p>
      )}

      <div className="odr-edit-foot">
        <span className="odr-edit-total">
          <small>Total</small>
          <strong>{formatMoney(liveTotal)}</strong>
          <span>{priceDeltaLabel}</span>
        </span>
        <div className="odr-edit-foot-actions">
          <Button intent="ghost" onClick={() => onDone(null)} size="sm">
            Discard
          </Button>
          <Button
            disabled={!dirty || keptCount === 0}
            intent="primary"
            onClick={() => {
              const lines = [...order.lines.filter((line) => !removedIds.has(line.lineId)), ...added];
              updateBookingLines(order.code, lines);
              onDone(`Updated ${order.bookingCode ?? order.code} · +${added.length} · -${removedIds.size}`);
            }}
            size="sm"
          >
            {keptCount === 0 ? "Keep one test" : dirty ? "Save changes" : "No changes"}
          </Button>
        </div>
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

  /* Confirmation auto-clears so it reads as a transient toast, not a permanent line. */
  useEffect(() => {
    if (!note) return;
    const timer = window.setTimeout(() => setNote(null), 5000);
    return () => window.clearTimeout(timer);
  }, [note]);

  const editsLocked = bookingEditsLocked(order);
  const cancelLocked = bookingCancelLocked(order);
  const canResend = order.route === "psc" && !order.cancelled && order.bookingStatus !== "results-back";
  const lockReason = getLockReason(order);

  return (
    <div className="odr-manage">
      {note && (
        <div className="odr-booking-note" role="status">
          <CheckCircleIcon size={14} variant="bulk" />
          <span>{note}</span>
          <button
            type="button"
            className="odr-booking-note-x"
            aria-label="Dismiss confirmation"
            onClick={() => setNote(null)}
          >
            <CloseIcon size={12} variant="stroke" />
          </button>
        </div>
      )}

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
            <strong>Cancel this booking?</strong>
          </div>
          <span className="odr-confirm-copy">
            This will void {order.lines.length} {order.lines.length === 1 ? "test" : "tests"}.{" "}
            {order.route === "psc"
              ? "We will notify the patient by Telegram and SMS."
              : "The courier dispatch is cancelled."}{" "}
            Refund any collected cash separately.
          </span>
          <div className="odr-confirm-actions">
            <Button intent="ghost" onClick={() => setMode("actions")} size="sm">
              Keep booking
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
              Cancel booking
            </Button>
          </div>
        </div>
      ) : mode === "resending" ? (
        <div className="odr-confirm odr-confirm--info">
          <div className="odr-confirm-head">
            <span aria-hidden className="odr-confirm-ic">
              <BellIcon size={14} variant="stroke" />
            </span>
            <strong>Send the slip again?</strong>
          </div>
          <span className="odr-confirm-copy">
            Send another Telegram and SMS reminder only if the patient may have missed the first one.
          </span>
          <div className="odr-confirm-actions">
            <Button intent="ghost" onClick={() => setMode("actions")} size="sm">
              Back
            </Button>
            <Button
              intent="primary"
              onClick={() => {
                setMode("actions");
                setNote("Slip sent again. Telegram and SMS");
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
              <Button
                intent="outline"
                leadingIcon={<EditIcon size={14} variant="stroke" />}
                onClick={() => setMode("editing")}
                size="sm"
              >
                Edit tests
              </Button>
            )}
            {canResend && (
              <Button
                intent="outline"
                leadingIcon={<BellIcon size={14} variant="stroke" />}
                onClick={() => setMode("resending")}
                size="sm"
              >
                Resend slip
              </Button>
            )}
            {order.cancelled && (
              <Button intent="outline" onClick={() => restoreBooking(order.code)} size="sm">
                Restore booking
              </Button>
            )}
            {!order.cancelled && !cancelLocked && (
              <Button
                intent="destructive"
                leadingIcon={<DeleteIcon size={14} variant="stroke" />}
                onClick={() => setMode("cancelling")}
                size="sm"
              >
                Cancel booking
              </Button>
            )}
            {canOrderAgain(order) && (
              <Button
                intent="outline"
                leadingIcon={<RefreshIcon size={14} variant="stroke" />}
                onClick={() => reorder(order.code)}
                size="sm"
              >
                Reorder these tests
              </Button>
            )}
          </div>
          {/* Terminal results-back bookings only offer reorder; a "cannot cancel"
             footnote with no nearby cancel control is orphan noise, so suppress it. */}
          {lockReason && order.bookingStatus !== "results-back" && (
            <span className="odr-lock-reason">{lockReason}</span>
          )}
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
