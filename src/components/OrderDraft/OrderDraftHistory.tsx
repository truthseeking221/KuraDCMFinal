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

const PAY_LABEL: Record<PaymentStatus, string> = {
  pending: "Pending",
  collected: "Collected",
  waiting: "Waiting",
  deferred: "Deferred",
  "pending-claim": "Pending claim",
  claimed: "Claimed",
  refunded: "Refunded",
  voided: "Voided",
};

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
          <span>
            {order.lines.length} {order.lines.length === 1 ? "item" : "items"} · {formatMoney(order.total)} ·{" "}
            {order.route === "psc" ? "PSC" : "Clinic"}
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
          <div className="odr-booking-pay">
            <span>{order.payment.label}</span>
            <span className="odr-booking-paystate">{PAY_LABEL[order.payment.status]}</span>
          </div>

          {/* lock ladder — lost rights struck through */}
          <div className="odr-policy">
            <span className={cx(editsLocked && "is-lost")}>Edit tests — until tubes reach the lab</span>
            <span className={cx(cancelLocked && "is-lost")}>Cancel — until paid or at the lab</span>
            {(editsLocked || cancelLocked) && !order.cancelled && (
              <span className="odr-policy-esc">Locked? Call Kura ops to amend.</span>
            )}
          </div>

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
                <Button
                  disabled={editsLocked}
                  intent="outline"
                  onClick={() => setMode("editing")}
                  size="sm"
                  title={
                    order.cancelled
                      ? "Cancelled — edits locked"
                      : editsLocked
                        ? "Tubes at the lab — edits locked"
                        : undefined
                  }
                >
                  Edit tests
                </Button>
                {canResend && (
                  <Button intent="outline" onClick={() => setMode("resending")} size="sm">
                    Resend slip
                  </Button>
                )}
                {order.cancelled ? (
                  <Button intent="outline" onClick={() => restoreBooking(order.code)} size="sm">
                    Restore order
                  </Button>
                ) : (
                  <Button
                    disabled={cancelLocked}
                    intent="outline"
                    onClick={() => setMode("cancelling")}
                    size="sm"
                    title={
                      cancelLocked
                        ? bookingPaymentSettled(order)
                          ? "Payment settled — cancel locked"
                          : "Tubes at the lab — cancel locked"
                        : undefined
                    }
                  >
                    Cancel
                  </Button>
                )}
                <Button intent="outline" onClick={() => reorder(order.code)} size="sm">
                  Reorder
                </Button>
              </div>
              {!order.cancelled && order.bookingStatus !== "results-back" && (
                <button className="odr-demo-advance" onClick={() => advanceBooking(order.code)} type="button">
                  {order.bookingStatus === "scheduled"
                    ? "Mark sample collected (demo)"
                    : "Mark results back (demo)"}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* Archived orders for this patient, newest first — a compact booking
   manager: status, payment, policy ladder, edit-diff, cancel, resend,
   1-click reorder (reorder works on cancelled bookings too). */
export function OrderDraftHistory() {
  const { draft } = useOrderDraft();
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

  return (
    <div className="odr-history">
      <span className="odr-group-label">Previous orders</span>
      {draft.placedOrders.map((order) => (
        <BookingRow isNew={newCodes.has(order.code)} key={order.code} order={order} />
      ))}
    </div>
  );
}
