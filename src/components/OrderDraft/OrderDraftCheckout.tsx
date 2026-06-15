"use client";

import { useState } from "react";
import { Button, SegmentedToggle } from "@/components/ui";
import { OrderVerificationGate, useKyd } from "@/components/Verification";
import { Cash as CashIcon, Pin as PinIcon, Scan as ScanIcon, Tube as TubeIcon } from "@/icons/components";
import { cx } from "@/lib/cx";
import { formatMoney } from "./catalog";
import { STAT_CLINIC_FEE, useOrderDraft } from "./OrderDraftContext";
import type { OrderRouteId, PscPayChoice } from "./types";

const ROUTES: Array<{
  id: OrderRouteId;
  title: string;
  sub: string;
  Icon: typeof TubeIcon;
}> = [
  { id: "clinic", title: "Clinic draw", sub: "Sample taken in clinic", Icon: TubeIcon },
  { id: "psc", title: "PSC walk-in", sub: "Patient visits a collection point", Icon: PinIcon },
];

const PAY_CHOICES: Array<{ id: PscPayChoice; title: string; sub: string }> = [
  { id: "cash", title: "Cash now", sub: "Collected in clinic" },
  { id: "khqr", title: "KHQR now", sub: "Sent via Telegram" },
  { id: "later", title: "Pay at PSC", sub: "Collected at counter" },
];

export function OrderDraftCheckout() {
  const { draft, lineCount, placeOrder, setPscPay, setRoute, setStat, totals } = useOrderDraft();
  const { isApproved } = useKyd();
  const { route, stat, pscPay } = draft.checkout;
  /* PSC + pay-now + cash gets a hard confirm before placing — feeds the
     reconciliation log; every other combination places directly */
  const [confirmingCash, setConfirmingCash] = useState(false);
  const [showSmsPreview, setShowSmsPreview] = useState(false);

  const needsPay = route === "psc" && !pscPay;
  const disabled = lineCount === 0 || !route || needsPay;
  /* CTA names the exact blocker, then the action */
  const label =
    lineCount === 0
      ? "Add at least one test"
      : !route
        ? "Choose route"
        : needsPay
          ? "Pick payment to place"
          : route === "clinic"
            ? stat
              ? "Place STAT order · prepare tubes"
              : "Place order · prepare tubes"
            : stat
              ? "Place STAT order"
              : "Place order";

  const handlePlace = () => {
    if (disabled) return;
    if (route === "psc" && pscPay === "cash") {
      setConfirmingCash(true);
      return;
    }
    placeOrder();
  };

  /* Progressive disclosure: nothing to route until there is something to
     order. The rail already hides this slot at 0 tests — guard anyway. */
  if (lineCount === 0) return null;

  return (
    <div className="odr-checkout">
      <div aria-label="Sample routing" className="odr-route-group" role="radiogroup">
        {ROUTES.map(({ id, title, sub, Icon }) => {
          const selected = route === id;
          return (
            <button
              aria-checked={selected}
              className={cx("odr-route-card", selected && "is-selected")}
              key={id}
              onClick={() => {
                setRoute(id);
                setConfirmingCash(false);
                setShowSmsPreview(false);
              }}
              role="radio"
              type="button"
            >
              <span aria-hidden className="odr-route-icon">
                <Icon size={16} variant="stroke" />
              </span>
              <span className="odr-route-copy">
                <strong>{title}</strong>
                <span>{sub}</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Urgency only appears once a route exists — STAT consequences
          (fee, courier vs URGENT SMS) depend on the route */}
      {route && (
      <div className="odr-stat-row">
        <SegmentedToggle
          aria-label="Order urgency"
          onChange={(value) => {
            const nextStat = value === "stat";
            setStat(nextStat);
            if (!nextStat) setShowSmsPreview(false);
          }}
          options={[
            { label: "Routine", value: "routine" },
            { label: "STAT", value: "stat" },
          ]}
          value={stat ? "stat" : "routine"}
        />
        {stat && route === "clinic" && (
          <span className="odr-stat-note">
            Courier dispatched now (~30 min) · +{formatMoney(STAT_CLINIC_FEE)} fee · 2h TAT
          </span>
        )}
        {stat && route === "psc" && (
          <div className="odr-stat-callout">
            <span>Urgent SMS will be sent · patient goes to PSC now · no STAT fee</span>
            <button
              aria-expanded={showSmsPreview}
              className="odr-sms-toggle"
              onClick={() => setShowSmsPreview((open) => !open)}
              type="button"
            >
              {showSmsPreview ? "Hide" : "Preview"}
            </button>
            {/* the doctor sees verbatim what the patient will read */}
            {showSmsPreview && (
              <div className="odr-sms-preview">
                <span className="odr-sms-label">SMS the patient receives</span>
                <p>
                  🚨 URGENT — Dr. Sophea Lim needs blood work done now. Please walk into Kura PSC · BKK1
                  (1.2 km) today. Your booking code + QR follow right after this message.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
      )}

      {route === "psc" && (
        <div className="odr-pay-block">
          <span className="odr-pay-label">Payment at PSC</span>
          <div aria-label="Payment" className="odr-pay-group" role="radiogroup">
            {PAY_CHOICES.map(({ id, title, sub }) => {
              const selected = pscPay === id;
              return (
                <button
                  aria-checked={selected}
                  className={cx("odr-pay-row", selected && "is-selected")}
                  key={id}
                  onClick={() => {
                    setPscPay(id);
                    setConfirmingCash(false);
                  }}
                  role="radio"
                  type="button"
                >
                  <span className="odr-pay-copy">
                    <strong>{title}</strong>
                    <span>{sub}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {!isApproved ? (
        /* Order never silently fails — explain the block and route to recovery.
           The doctor can still build/route the draft (rehearsal); only the
           final commit is gated until the licence is approved. */
        <OrderVerificationGate />
      ) : confirmingCash ? (
        <div className="odr-cash-confirm">
          <span className="odr-cash-confirm-head">
            <CashIcon size={14} variant="stroke" />
            Did you collect the cash?
          </span>
          <span className="odr-cash-confirm-copy">
            Confirm you have <strong>{formatMoney(totals.due)}</strong> from Sokha Chan in your hand right now.
            Recorded in the reconciliation log.
          </span>
          <div className="odr-cash-confirm-actions">
            <Button intent="ghost" onClick={() => setConfirmingCash(false)} size="sm">
              No, not yet
            </Button>
            <Button
              intent="primary"
              onClick={() => {
                setConfirmingCash(false);
                placeOrder();
              }}
              size="sm"
            >
              Yes, I have {formatMoney(totals.due)}
            </Button>
          </div>
        </div>
      ) : (
        <Button
          disabled={disabled}
          fullWidth
          intent={stat && route ? "destructive" : "primary"}
          leadingIcon={route === "clinic" ? <ScanIcon size={14} variant="stroke" /> : undefined}
          onClick={handlePlace}
        >
          {label}
        </Button>
      )}
    </div>
  );
}
