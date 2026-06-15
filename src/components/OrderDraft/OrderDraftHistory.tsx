"use client";

import { useEffect, useRef, useState } from "react";
import { BookingRow } from "./bookingShared";
import { useOrderDraft } from "./OrderDraftContext";

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
