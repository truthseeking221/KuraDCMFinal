"use client";

import { Input } from "@/components/ui";
import { cx } from "@/lib/cx";
import { formatMoney } from "./catalog";
import { clampDoctorFee, getDoctorFeeMax } from "./ledger";
import type { OrderLedgerImpact } from "./types";
import "./OrderDraft.css";

export function DoctorFeeField({
  doctorFee,
  subtotal,
  onChange,
}: {
  doctorFee: number;
  subtotal: number;
  onChange: (value: number) => void;
}) {
  const max = getDoctorFeeMax(subtotal);
  const help = max > 0 ? `Optional doctor fee. Max ${formatMoney(max)}.` : "No doctor fee until priced tests are selected.";

  return (
    <Input
      containerClassName="odr-doctor-fee"
      density="compact"
      disabled={max === 0}
      helpText={help}
      inputMode="decimal"
      label="Doctor fee"
      min={0}
      max={max}
      onBlur={(event) => onChange(clampDoctorFee(Number.parseFloat(event.currentTarget.value), subtotal))}
      onChange={(event) => {
        const value = event.currentTarget.value.trim();
        onChange(value ? clampDoctorFee(Number.parseFloat(value), subtotal) : 0);
      }}
      step={1}
      trailing="$"
      type="number"
      value={doctorFee > 0 ? String(doctorFee) : ""}
    />
  );
}

export function OrderLedgerPreview({
  className,
  ledger,
  unpricedCount = 0,
}: {
  className?: string;
  ledger: OrderLedgerImpact;
  unpricedCount?: number;
}) {
  const cashSettlement = ledger.kind === "doctor-owes-kura";
  const patientCopy =
    !cashSettlement && ledger.doctorFee > 0
      ? `${formatMoney(ledger.patientTotal)} patient total, including ${formatMoney(ledger.doctorFee)} doctor fee.`
      : "";
  const kuraLabel = cashSettlement ? "Kura settlement" : "Kura share";
  const kuraValue = `${formatMoney(ledger.kuraShare)}${cashSettlement ? " pending" : ""}`;
  const footerCopy = cashSettlement ? "Kura settlement is handled after pickup." : ledger.settlementCopy;

  return (
    <section className={cx("odr-ledger", `is-${ledger.kind}`, className)} aria-label="Payment split">
      <div className="odr-ledger-head">
        <span>Payment split</span>
        <strong>+{formatMoney(ledger.doctorEarns)}</strong>
      </div>
      <dl className="odr-ledger-rows">
        <div className="odr-ledger-row is-total">
          <dt>Patient total</dt>
          <dd>{formatMoney(ledger.patientTotal)}</dd>
        </div>
        <div className="odr-ledger-row is-doctor">
          <dt>
            <span aria-hidden className="odr-ledger-dot" />
            Doctor earns
          </dt>
          <dd>+{formatMoney(ledger.doctorEarns)}</dd>
        </div>
        <div className="odr-ledger-row is-kura">
          <dt>
            <span aria-hidden className="odr-ledger-dot" />
            {kuraLabel}
          </dt>
          <dd>{kuraValue}</dd>
        </div>
      </dl>
      <small>
        {footerCopy}
        {patientCopy ? ` ${patientCopy}` : ""}
        {unpricedCount > 0 ? ` Front desk confirms ${unpricedCount} unpriced item${unpricedCount === 1 ? "" : "s"}.` : ""}
      </small>
    </section>
  );
}
