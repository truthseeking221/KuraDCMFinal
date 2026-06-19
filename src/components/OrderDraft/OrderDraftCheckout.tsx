"use client";

import { useState } from "react";
import { Button, SegmentedToggle } from "@/components/ui";
import { OrderVerificationGate, useKyd } from "@/components/Verification";
import { Cash as CashIcon, Pin as PinIcon, Scan as ScanIcon, Tube as TubeIcon } from "@/icons/components";
import { cx } from "@/lib/cx";
import { formatMoney } from "./catalog";
import { buildOrderLedgerImpact } from "./ledger";
import { DoctorFeeField, OrderLedgerPreview } from "./OrderLedgerPreview";
import { STAT_CLINIC_FEE, useOrderDraft } from "./OrderDraftContext";
import type { OrderRouteId, PscPayChoice } from "./types";

const ROUTES: Array<{
  id: OrderRouteId;
  title: string;
  sub: string;
  Icon: typeof TubeIcon;
}> = [
  { id: "psc", title: "Send patient to PSC", sub: "Patient visits a collection point", Icon: PinIcon },
  { id: "clinic", title: "Send tubes to Kura", sub: "Clinic collects sample for pickup", Icon: TubeIcon },
];

const PAY_CHOICES_BY_ROUTE: Record<OrderRouteId, Array<{ id: PscPayChoice; title: string; sub: string }>> = {
  psc: [
    { id: "khqr", title: "KHQR before visit", sub: "Patient pays Kura before collection." },
    { id: "later", title: "Pay at PSC", sub: "Collected at the PSC counter." },
  ],
  clinic: [
    { id: "khqr", title: "KHQR before pickup", sub: "Patient pays Kura before tubes leave." },
    { id: "cash", title: "Cash at your office", sub: "Doctor records cash and settles Kura share." },
  ],
};

export function OrderDraftCheckout() {
  const { draft, lineCount, placeOrder, setDoctorFee, setPscPay, setRoute, setStat, totals } = useOrderDraft();
  const { isApproved } = useKyd();
  const { route, stat, pscPay } = draft.checkout;
  /* Cash in hand gets a hard confirm before tube prep — it creates a doctor
     balance obligation, not just a payment flag. */
  const [confirmingCash, setConfirmingCash] = useState(false);
  const [showSmsPreview, setShowSmsPreview] = useState(false);

  const needsPay = !!route && !pscPay;
  const disabled = lineCount === 0 || !route || needsPay;
  const ledger =
    route && pscPay
      ? buildOrderLedgerImpact({
          subtotal: totals.known,
          statFee: totals.statFee,
          doctorFee: totals.doctorFee,
          pscPay,
        })
      : null;
  /* CTA names the exact blocker, then the action */
  const label =
    lineCount === 0
      ? "Add at least one test"
      : !route
        ? "Choose fulfillment"
        : needsPay
          ? "Pick payment to place"
          : route === "psc" && pscPay === "khqr"
            ? "Send payment link"
            : route === "psc" && pscPay === "later"
              ? "Send booking code"
              : route === "clinic" && pscPay === "cash"
                ? "Confirm cash · prepare tubes"
                : "Send payment link · prepare tubes";

  const handlePlace = () => {
    if (disabled) return;
    if (pscPay === "cash") {
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
      <div aria-label="Fulfillment" className="odr-route-group" role="radiogroup">
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
                  URGENT — Dr. Sophea Lim needs blood work done now. Please walk into Kura PSC · BKK1
                  (1.2 km) today. Your booking code and QR follow right after this message.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
      )}

      {route && (
        <div className="odr-pay-block">
          <span className="odr-pay-label">Payment</span>
          <div aria-label="Payment" className="odr-pay-group" role="radiogroup">
            {PAY_CHOICES_BY_ROUTE[route].map(({ id, title, sub }) => {
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

      {route && pscPay && (
        <>
          <DoctorFeeField doctorFee={totals.doctorFee} subtotal={totals.known} onChange={setDoctorFee} />
          {ledger && <OrderLedgerPreview ledger={ledger} unpricedCount={totals.unpricedCount} />}
        </>
      )}

      {!isApproved ? (
        /* Order never silently fails — explain the block and route to recovery.
           The doctor can still build/route the draft (rehearsal); only the
           final commit is gated until the licence is approved. */
        <OrderVerificationGate />
      ) : confirmingCash ? (
        <div className="odr-cash-confirm" role="alertdialog" aria-label="Confirm cash collected">
          <span className="odr-cash-confirm-head">
            <CashIcon size={15} variant="stroke" />
            Did you collect the cash?
          </span>
          <span className="odr-cash-confirm-amount">
            <strong>{formatMoney(ledger?.patientTotal ?? totals.due)}</strong>
            <span>from the patient</span>
          </span>
          <span className="odr-cash-confirm-copy">
            You owe Kura {formatMoney(ledger?.doctorOwes ?? 0)} after this cash is recorded.
          </span>
          <div className="odr-cash-confirm-actions">
            <Button intent="ghost" onClick={() => setConfirmingCash(false)} size="sm">
              Not yet
            </Button>
            <Button
              intent="primary"
              onClick={() => {
                setConfirmingCash(false);
                placeOrder();
              }}
              size="sm"
            >
              Yes, collected
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
