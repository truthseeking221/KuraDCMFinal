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
  const title =
    ledger.kind === "doctor-owes-kura"
      ? `You owe Kura ${formatMoney(ledger.doctorOwes)}`
      : ledger.kind === "earning-confirmed"
        ? `Earning ${formatMoney(ledger.doctorEarns)} added`
        : `Potential earning ${formatMoney(ledger.doctorEarns)}`;
  const patientCopy =
    ledger.doctorFee > 0
      ? `${formatMoney(ledger.patientTotal)} patient total, including ${formatMoney(ledger.doctorFee)} doctor fee.`
      : `${formatMoney(ledger.patientTotal)} patient total.`;

  return (
    <section className={cx("odr-ledger", `is-${ledger.kind}`, className)} aria-label="Balance impact">
      <div className="odr-ledger-head">
        <span>{getLedgerImpactLabel(ledger)}</span>
        <strong>{valueLabel}</strong>
      </div>
      <p>{title}</p>
      <dl className="odr-ledger-grid">
        <div>
          <dt>Patient pays</dt>
          <dd>{formatMoney(ledger.patientTotal)}</dd>
        </div>
        <div>
          <dt>{ledger.kind === "doctor-owes-kura" ? "Doctor keeps" : "Doctor earns"}</dt>
          <dd>{formatMoney(ledger.doctorEarns)}</dd>
        </div>
        <div>
          <dt>Kura share</dt>
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
