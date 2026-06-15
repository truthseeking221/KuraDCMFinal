"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Badge, Button, IconButton, Search } from "@/components/ui";
import { Close as CloseIcon, Plus as PlusIcon } from "@/icons/components";
import { cx } from "@/lib/cx";
import { formatMoney, orderItems } from "./catalog";
import {
  bookingCancelLocked,
  bookingEditsLocked,
  bookingPaymentSettled,
  useOrderDraft,
} from "./OrderDraftContext";
import type { BookingStatus, OrderDraftLine, PaymentStatus, PlacedOrderSummary } from "./types";

const STATUS_BADGE: Record<BookingStatus, { tone: "neutral" | "warning" | "success"; label: string }> = {
  scheduled: { tone: "neutral", label: "Scheduled" },
  "in-progress": { tone: "warning", label: "In progress" },
  "results-back": { tone: "success", label: "Results back" },
};

/* One scannable payment line — state first, method second. */
function getPaymentSummary(order: PlacedOrderSummary): string {
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
function getBookingNextStep(order: PlacedOrderSummary): string | null {
  if (order.cancelled) return null;
  switch (order.bookingStatus) {
    case "scheduled":
      return order.route === "psc"
        ? "Next: patient visits PSC with this code"
        : order.sweep
          ? `Next: clinic draw · ${order.sweep}`
          : "Next: clinic draw";
    case "in-progress":
      return "Next: sample at lab — results pending";
    case "results-back":
      return "Results back — review in Labs";
  }
}

/* Why cancel is unavailable, in claim terms — shown instead of a dead button. */
function getLockReason(order: PlacedOrderSummary): string | null {
  if (order.cancelled || !bookingCancelLocked(order)) return null;
  return bookingPaymentSettled(order) ? "Cancel locked · payment collected" : "Cancel locked · sample at lab";
}

/* Reorder is recovery, not a shortcut — only once the episode has ended. */
function canOrderAgain(order: PlacedOrderSummary): boolean {
  return order.cancelled || order.bookingStatus === "results-back";
}

function EditPanel({ order, onDone }: { order: PlacedOrderSummary; onDone: (note: string | null) => void }) {
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

function BookingRow({ isNew, order }: { isNew: boolean; order: PlacedOrderSummary }) {
  const { advanceBooking, cancelBooking, reorder, restoreBooking } = useOrderDraft();
  const [expanded, setExpanded] = useState(false);
  const [mode, setMode] = useState<"actions" | "editing" | "cancelling" | "resending">("actions");
  const [note, setNote] = useState<string | null>(null);

  const editsLocked = bookingEditsLocked(order);
  const cancelLocked = bookingCancelLocked(order);
  const statusBadge = STATUS_BADGE[order.bookingStatus];
  const canResend = order.route === "psc" && !order.cancelled && order.bookingStatus !== "results-back";
  const nextStep = getBookingNextStep(order);
  const lockReason = getLockReason(order);

  return (
    <div className={cx("odr-booking", isNew && "is-new")}>
      <button
        aria-expanded={expanded}
        className="odr-history-row"
        onClick={() => {
          setExpanded((current) => !current);
          setMode("actions");
        }}
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
        {order.cancelled ? (
          <Badge tone="neutral">Cancelled</Badge>
        ) : (
          <Badge tone={statusBadge.tone}>{statusBadge.label}</Badge>
        )}
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

          {note && <span className="odr-booking-note">{note}</span>}

          {mode === "editing" ? (
            <EditPanel
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
                    Restore order
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
      )}
    </div>
  );
}

/* Recent bookings for this patient, newest first. In "full" mode (idle rail)
   every booking renders as a compact row. In "compact" mode (mid-draft) the
   list collapses to a one-line duplicate-risk guard — open bookings count plus
   any overlap with the draft — and individual rows appear only after Review.
   Completed-only history hides entirely while drafting. */
export function OrderDraftHistory({ mode = "full" }: { mode?: "compact" | "full" }) {
  const { draft } = useOrderDraft();
  const [reviewOpen, setReviewOpen] = useState(false);
  /* each new drafting session starts from the collapsed guard —
     adjust-state-during-render, no effect needed */
  const [prevMode, setPrevMode] = useState(mode);
  if (prevMode !== mode) {
    setPrevMode(mode);
    if (mode === "compact") setReviewOpen(false);
  }
  /* glow only on rows that appear after mount (reorder / start-new) */
  const seenCodes = useRef<Set<string>>(new Set());
  const [newCodes, setNewCodes] = useState<Set<string>>(() => new Set());
  useEffect(() => {
    const codes = draft.placedOrders.map((order) => order.code);
    if (seenCodes.current.size === 0) {
      seenCodes.current = new Set(codes);
      return;
    }

    const freshCodes = codes.filter((code) => !seenCodes.current.has(code));
    if (!freshCodes.length) return;

    freshCodes.forEach((code) => seenCodes.current.add(code));
    setNewCodes(new Set(freshCodes));

    const timeoutId = window.setTimeout(() => {
      setNewCodes((current) => {
        const next = new Set(current);
        freshCodes.forEach((code) => next.delete(code));
        return next;
      });
    }, 1800);

    return () => window.clearTimeout(timeoutId);
  }, [draft.placedOrders]);

  if (draft.placedOrders.length === 0) return null;

  if (mode === "compact") {
    const active = draft.placedOrders.filter(
      (order) => !order.cancelled && order.bookingStatus !== "results-back",
    );
    /* results-back / cancelled history belongs in Labs & Orders, not here */
    if (active.length === 0) return null;

    const scheduled = active.filter((order) => order.bookingStatus === "scheduled").length;
    const inProgress = active.filter((order) => order.bookingStatus === "in-progress").length;
    const breakdown = [
      scheduled > 0 ? `${scheduled} scheduled` : null,
      inProgress > 0 ? `${inProgress} in progress` : null,
    ]
      .filter(Boolean)
      .join(" · ");

    /* duplicate guard: draft lines already present on an open booking */
    const activeLineIds = new Set(active.flatMap((order) => order.lines.map((line) => line.lineId)));
    const dupNames = [
      ...new Set(draft.lines.filter((line) => activeLineIds.has(line.lineId)).map((line) => line.displayName)),
    ];

    if (!reviewOpen) {
      return (
        <div className="odr-history odr-history-compact">
          <div className="odr-history-summary">
            <span className="odr-history-summary-copy">
              <strong>
                {active.length} open {active.length === 1 ? "booking" : "bookings"}
              </strong>
              {breakdown && <span>{breakdown}</span>}
              {dupNames.length > 0 && (
                <span className="odr-history-dup">
                  Possible duplicate · {dupNames[0]} already scheduled
                  {dupNames.length > 1 ? ` +${dupNames.length - 1} more` : ""}
                </span>
              )}
            </span>
            <button className="odr-history-review" onClick={() => setReviewOpen(true)} type="button">
              Review
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="odr-history odr-history-compact">
        <div className="odr-history-head">
          <span className="odr-group-label">Recent bookings</span>
          <button className="odr-history-review" onClick={() => setReviewOpen(false)} type="button">
            Hide
          </button>
        </div>
        {active.slice(0, 3).map((order) => (
          <BookingRow isNew={newCodes.has(order.code)} key={order.code} order={order} />
        ))}
        {active.length > 3 && <span className="odr-history-more">+{active.length - 3} more in Orders</span>}
      </div>
    );
  }

  return (
    <div className="odr-history">
      <span className="odr-group-label">Recent bookings</span>
      {draft.placedOrders.map((order) => (
        <BookingRow isNew={newCodes.has(order.code)} key={order.code} order={order} />
      ))}
    </div>
  );
}
