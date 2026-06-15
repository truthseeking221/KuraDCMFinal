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

/* Status as the doctor reads it — never color alone. PSC-scheduled reads
   "Awaiting visit" (the no-show risk); clinic-scheduled reads "Scheduled".
   A flagged results-back booking is not "done" until reviewed. */
export function bookingStatusView(order: PlacedOrderSummary): StatusView {
  if (order.cancelled) return { label: "Cancelled", tone: "neutral", Icon: CloseIcon };
  switch (order.bookingStatus) {
    case "scheduled":
      return order.route === "psc"
        ? { label: "Awaiting visit", tone: "info", Icon: ClockIcon }
        : { label: "Scheduled", tone: "neutral", Icon: CalendarIcon };
    case "in-progress":
      return { label: "In progress", tone: "warning", Icon: FlaskIcon };
    case "results-back":
      return order.flagged
        ? { label: "Flagged", tone: "danger", Icon: WarningIcon }
        : { label: "Results back", tone: "success", Icon: CheckCircleIcon };
  }
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

/* What happens next in the episode — the one line a doctor scans for (table
   column + rail). */
export function getBookingNextStep(order: PlacedOrderSummary): string | null {
  if (order.cancelled) return null;
  switch (order.bookingStatus) {
    case "scheduled":
      return order.route === "psc"
        ? "Patient visits PSC with this code"
        : order.handoverCode
          ? `Courier dispatched · handover ${order.handoverCode}`
          : order.sweep
            ? `Clinic pickup · ${order.sweep}`
            : "Clinic draw scheduled";
    case "in-progress":
      return "Sample at lab — results pending";
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
          title: "Patient has not checked in yet",
          body: "Booking code sent by Telegram + SMS. Awaiting the PSC visit.",
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
        <span className="odr-edit-total">{formatMoney(liveTotal)}</span>
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
export function BookingActions({ order }: { order: PlacedOrderSummary }) {
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
        <div className="odr-cancel-confirm">
          <span className="odr-cancel-head">Cancel {order.bookingCode ?? order.code}?</span>
          <span className="odr-cancel-copy">
            {order.lines.length} {order.lines.length === 1 ? "test" : "tests"} will be voided.{" "}
            {order.route === "psc"
              ? "The patient is notified via Telegram + SMS."
              : "The courier dispatch is cancelled."}{" "}
            Collected cash must be refunded manually.
          </span>
          <div className="odr-cancel-actions">
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
        <div className="odr-cancel-confirm">
          <span className="odr-cancel-copy">
            Use sparingly — repeated pings reduce future open-rates on Telegram.
          </span>
          <div className="odr-cancel-actions">
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
          {!order.cancelled && order.bookingStatus !== "results-back" && (
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
