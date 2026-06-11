"use client";

import type { ReactNode } from "react";
import { Badge, Button, Counter } from "@/components/ui";
import { CheckCircle as CheckCircleIcon } from "@/icons/components";
import { cx } from "@/lib/cx";
import { formatKhr, formatMoney } from "./catalog";
import { NEAREST_PSC, PATIENT_PHONE_MASKED, SWEEP_WINDOW, useOrderDraft } from "./OrderDraftContext";
import { OrderDraftHistory } from "./OrderDraftHistory";
import { OrderDraftLines } from "./OrderDraftLines";
import { OrderDraftTubePrep } from "./OrderDraftTubePrep";
import type { PaymentStatus } from "./types";
import "./OrderDraft.css";

const PAYMENT_BADGE: Record<PaymentStatus, { tone: "success" | "warning" | "neutral" | "info"; label: string }> = {
  pending: { tone: "warning", label: "Pending" },
  collected: { tone: "success", label: "Collected" },
  waiting: { tone: "warning", label: "Waiting" },
  deferred: { tone: "neutral", label: "Deferred" },
  "pending-claim": { tone: "info", label: "Pending claim" },
  claimed: { tone: "success", label: "Claimed" },
  refunded: { tone: "neutral", label: "Refunded" },
  voided: { tone: "neutral", label: "Voided" },
};

/* Boarding-pass-style receipt: status moment → ticket (anchor zone + dashed
   tear + label/value rows) → action. The success tint is a single line, not
   a container; the booking code owns the anchor, internal ref is demoted. */
export function OrderDraftPlacedBlock() {
  const { draft, markKhqrReceived, startNewDraft } = useOrderDraft();
  const placed = draft.lastPlaced;
  if (!placed) return null;

  const paymentBadge = PAYMENT_BADGE[placed.payment.status];

  return (
    <div className="odr-placed">
      <div className="odr-placed-status">
        <CheckCircleIcon size={16} variant="stroke" />
        <span>Order placed</span>
      </div>

      <div className="odr-ticket">
        {placed.route === "psc" && placed.bookingCode ? (
          <div className="odr-ticket-code">
            <strong>{placed.bookingCode}</strong>
            <span>{placed.stat ? "URGENT — patient heading to the PSC now" : "Show at any Kura PSC"}</span>
          </div>
        ) : placed.handoverCode ? (
          <div className="odr-ticket-code">
            <strong>{placed.handoverCode}</strong>
            <span>Read this code to the courier · ~30 min</span>
          </div>
        ) : (
          <div className="odr-ticket-code">
            <strong className="odr-ticket-code-sm">{placed.sweep ?? SWEEP_WINDOW}</strong>
            <span>Next sweep — leave the tube bag at reception</span>
          </div>
        )}

        <div className="odr-ticket-rows">
          {placed.route === "psc" && (
            <>
              <div className="odr-ticket-row">
                <span>Sent via</span>
                <span className="odr-ticket-value">Telegram + SMS · {PATIENT_PHONE_MASKED}</span>
              </div>
              <div className="odr-ticket-row">
                <span>Nearest PSC</span>
                <span className="odr-ticket-value">{NEAREST_PSC.replace("Kura PSC · ", "")} · open now</span>
              </div>
            </>
          )}
          <div className="odr-ticket-row">
            <span>Payment</span>
            <span className="odr-ticket-value">
              {placed.payment.label}
              <Badge tone={paymentBadge.tone}>{paymentBadge.label}</Badge>
              {placed.payment.status === "waiting" && (
                <button className="odr-placed-mark" onClick={markKhqrReceived} type="button">
                  Mark received
                </button>
              )}
            </span>
          </div>
          <div className="odr-ticket-row">
            <span>Order</span>
            <span className="odr-ticket-value">
              {placed.stat ? "STAT" : "Routine"} · {placed.lines.length}{" "}
              {placed.lines.length === 1 ? "item" : "items"} · {formatMoney(placed.total)}
              {placed.statFee > 0 ? ` (incl. ${formatMoney(placed.statFee)} STAT)` : ""}
              {placed.unpricedCount > 0 ? ` · +${placed.unpricedCount} unpriced` : ""} ·{" "}
              <span className="odr-ticket-ref">{placed.code}</span>
            </span>
          </div>
        </div>
      </div>

      <Button fullWidth intent="outline" onClick={startNewDraft} size="sm">
        Start new order
      </Button>
    </div>
  );
}

export function OrderDraftSubtotal() {
  const { totals } = useOrderDraft();

  return (
    <div className="odr-subtotal">
      <div className="odr-subtotal-row">
        <span>Subtotal</span>
        <span className={cx(totals.statFee === 0 && "odr-subtotal-usd")}>{formatMoney(totals.known)}</span>
      </div>
      {totals.statFee > 0 && (
        <>
          <div className="odr-subtotal-row">
            <span>STAT dispatch</span>
            <span>+{formatMoney(totals.statFee)}</span>
          </div>
          <div className="odr-subtotal-row">
            <span>Total due</span>
            <span className="odr-subtotal-usd">{formatMoney(totals.due)}</span>
          </div>
        </>
      )}
      <div className="odr-subtotal-sub">
        <span className="odr-subtotal-khr">≈ {formatKhr(totals.due)}</span>
        {totals.unpricedCount > 0 && (
          <span className="odr-subtotal-unpriced">+{totals.unpricedCount} unpriced</span>
        )}
      </div>
    </div>
  );
}

export function OrderDraftRail({
  ctaSlot,
  emptyHint,
  frameless = false,
}: {
  /* host-specific checkout / navigation action, rendered while building */
  ctaSlot?: ReactNode;
  emptyHint?: string;
  frameless?: boolean;
}) {
  const { clearDraft, draft, lineCount } = useOrderDraft();
  const placed = draft.status === "placed";
  const preparing = draft.status === "preparing";

  return (
    <aside aria-label="Order draft" className={cx("odr-rail", frameless && "odr-rail-frameless")}>
      <header className="odr-rail-header">
        <h3>Order draft</h3>
        {lineCount > 0 && <Counter count={lineCount} tone={placed ? "success" : "brand"} />}
        {placed && <Badge tone="success">Placed</Badge>}
        {preparing && <Badge tone="warning">Not placed yet</Badge>}
        {!placed && !preparing && lineCount > 0 && (
          <button className="odr-rail-clear" onClick={clearDraft} type="button">
            Clear
          </button>
        )}
      </header>
      <div className="odr-rail-body">
        <OrderDraftLines emptyHint={emptyHint} readOnly={placed || preparing} />
        <OrderDraftHistory />
      </div>
      <footer className="odr-rail-footer">
        {!placed && <OrderDraftSubtotal />}
        {placed ? <OrderDraftPlacedBlock /> : preparing ? <OrderDraftTubePrep /> : ctaSlot}
      </footer>
    </aside>
  );
}
