"use client";

import { useState } from "react";
import { Button, SegmentedToggle } from "@/components/ui";
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
  { id: "clinic", title: "Draw in clinic", sub: "Sample taken at the cabinet today", Icon: TubeIcon },
  { id: "psc", title: "Send to PSC", sub: "Patient walks into a collection point", Icon: PinIcon },
];

const PAY_CHOICES: Array<{ id: PscPayChoice; title: string; sub: string }> = [
  { id: "cash", title: "Cash · pay now", sub: "Collect in clinic — +40% show-up" },
  { id: "khqr", title: "KHQR · pay now", sub: "Sent to patient via Telegram" },
  { id: "later", title: "Pay later", sub: "Collect at the PSC counter" },
];

export function OrderDraftCheckout() {
  const { draft, lineCount, placeOrder, setPscPay, setRoute, setStat, totals } = useOrderDraft();
  const { route, stat, pscPay } = draft.checkout;
  /* PSC + pay-now + cash gets a hard confirm before placing — feeds the
     reconciliation log; every other combination places directly */
  const [confirmingCash, setConfirmingCash] = useState(false);

  const needsPay = route === "psc" && !pscPay;
  const disabled = lineCount === 0 || !route || needsPay;
  const label = !route
    ? "Pick a route to place"
    : needsPay
      ? "Pick payment to place"
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

      <div className="odr-stat-row">
        <SegmentedToggle
          aria-label="Order urgency"
          onChange={(value) => setStat(value === "stat")}
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
          <span className="odr-stat-note">URGENT SMS — patient goes to the PSC now · no fee</span>
        )}
        {stat && !route && <span className="odr-stat-note">Lab priority · results in ~2h</span>}
      </div>

      {route === "psc" && (
        <div className="odr-pay-block">
          <span className="odr-pay-label">Charge patient</span>
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

      {confirmingCash ? (
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
          intent="primary"
          leadingIcon={route === "clinic" ? <ScanIcon size={14} variant="stroke" /> : undefined}
          onClick={handlePlace}
        >
          {route === "clinic" && !disabled ? "Continue · prepare tubes" : label}
        </Button>
      )}
    </div>
  );
}
