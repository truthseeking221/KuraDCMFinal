"use client";

import { Input } from "@/components/ui";
import { cx } from "@/lib/cx";
import { formatMoney } from "./catalog";
import { clampDoctorFee, getDoctorFeeMax, getLedgerImpactLabel, getLedgerImpactValue } from "./ledger";
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
  const value = getLedgerImpactValue(ledger);
  const valueLabel =
    ledger.kind === "doctor-owes-kura" ? formatMoney(value) : `+${formatMoney(value)}`;
  const owes = ledger.kind === "doctor-owes-kura";
  const patientCopy =
    ledger.doctorFee > 0
      ? `${formatMoney(ledger.patientTotal)} patient total, including ${formatMoney(ledger.doctorFee)} doctor fee.`
      : `${formatMoney(ledger.patientTotal)} patient total.`;

  /* Proportional split of what the patient pays → the doctor's cut vs Kura's.
     Floor the doctor segment so a tiny earning is still a visible sliver. */
  const total = ledger.patientTotal > 0 ? ledger.patientTotal : 1;
  const docShare = Math.max(0, ledger.doctorEarns);
  const docPct = Math.min(100, Math.max(3, Math.round((docShare / total) * 100)));
  const kuraPct = Math.max(0, 100 - docPct);
  const doctorRowLabel = owes ? "Doctor keeps" : "Your earning";
  const doctorRowValue = owes ? formatMoney(ledger.doctorEarns) : `+${formatMoney(ledger.doctorEarns)}`;

  return (
    <section className={cx("odr-ledger", `is-${ledger.kind}`, className)} aria-label="Balance impact">
      <div className="odr-ledger-head">
        <span>{getLedgerImpactLabel(ledger)}</span>
        <strong>{valueLabel}</strong>
      </div>
      <div
        className="odr-ledger-bar"
        role="img"
        aria-label={`${formatMoney(ledger.doctorEarns)} to you, ${formatMoney(ledger.kuraShare)} to Kura`}
      >
        <span className="odr-ledger-seg is-doctor" style={{ width: `${docPct}%` }} />
        <span className="odr-ledger-seg is-kura" style={{ width: `${kuraPct}%` }} />
      </div>
      <dl className="odr-ledger-rows">
        <div className="odr-ledger-row is-total">
          <dt>Patient pays</dt>
          <dd>{formatMoney(ledger.patientTotal)}</dd>
        </div>
        <div className="odr-ledger-row is-doctor">
          <dt>
            <span aria-hidden className="odr-ledger-dot" />
            {doctorRowLabel}
          </dt>
          <dd>{doctorRowValue}</dd>
        </div>
        <div className="odr-ledger-row is-kura">
          <dt>
            <span aria-hidden className="odr-ledger-dot" />
            Kura share
          </dt>
          <dd>{formatMoney(ledger.kuraShare)}</dd>
        </div>
      </dl>
      <small>
        {ledger.settlementCopy} {patientCopy}
        {unpricedCount > 0 ? ` Front desk confirms ${unpricedCount} unpriced item${unpricedCount === 1 ? "" : "s"}.` : ""}
      </small>
    </section>
  );
}
