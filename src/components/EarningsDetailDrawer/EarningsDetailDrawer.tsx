"use client";

/* Doctor earnings — Details drawer off the Home earnings card.

   Earnings are the doctor's SPREAD (commission), not a patient discount: the
   patient pays full list price, the doctor keeps DOCTOR_COMMISSION_RATE, Kura
   keeps the rest (mastersource §19-26). A share only FREEZES once the line is
   paid AND served — until then it is "pending"; cash-at-clinic creates a Kura
   settlement balance. This drawer shows the period summary, per-booking ledger, and payout
   destination, then hands off to the booking detail or to Banking. It is a
   read view onto the same `ledgerImpact` the order rail computes, so the numbers
   never drift. */

import { useMemo, useState } from "react";
import { Badge, Button, Drawer } from "@/components/ui";
import type { BadgeTone } from "@/components/ui";
import {
  ChevronRight as ChevronRightIcon,
  CreditCard as CreditCardIcon,
} from "@/icons/components";
import { cx } from "@/lib/cx";
import { formatMoney } from "@/components/OrderDraft/catalog";
import { deriveOrderLedgerImpact } from "@/components/OrderDraft/ledger";
import { getBookingAnchor } from "@/components/OrderDraft/bookingShared";
import type { BookingListItem, OrderLedgerImpact } from "@/components/OrderDraft/types";
import "./EarningsDetailDrawer.css";

type Period = "today" | "month";

export type EarningsDetailDrawerProps = {
  open: boolean;
  onClose: () => void;
  bookings: BookingListItem[];
  /* Masked ABA account from Settings → Billing, for the banking row. */
  bankMasked?: string;
  nextStatementLabel: string;
  onOpenBooking: (code: string) => void;
  onOpenBanking: () => void;
};

const KIND_BADGE: Record<OrderLedgerImpact["kind"], { tone: BadgeTone; label: string }> = {
  "earning-pending": { tone: "warning", label: "Pending" },
  "earning-confirmed": { tone: "success", label: "Available" },
  "doctor-owes-kura": { tone: "warning", label: "Settlement pending" },
};

function isTodayPlaced(placedAt?: string): boolean {
  const s = (placedAt ?? "").toLowerCase();
  return s === "today" || s.startsWith("today") || /^\d+\s*m\s*ago$/.test(s) || /^\d+\s*h\s*ago$/.test(s);
}

export function EarningsDetailDrawer({
  open,
  onClose,
  bookings,
  bankMasked,
  nextStatementLabel,
  onOpenBooking,
  onOpenBanking,
}: EarningsDetailDrawerProps) {
  const [period, setPeriod] = useState<Period>("today");
  const [showAllRows, setShowAllRows] = useState(false);

  const rows = useMemo(() => {
    return bookings
      .filter((booking) => !booking.cancelled && (period === "month" || isTodayPlaced(booking.placedAt)))
      .map((booking) => ({ booking, ledger: booking.ledgerImpact ?? deriveOrderLedgerImpact(booking) }))
      .sort((a, b) => b.ledger.doctorEarns - a.ledger.doctorEarns);
  }, [bookings, period]);
  const visibleRows = showAllRows ? rows : rows.slice(0, 6);
  const hiddenRowCount = rows.length - visibleRows.length;
  const periodLabel = period === "today" ? "today" : "this month";

  /* Period roll-up: net earned excludes clinic-cash settlement lines, which are
     handled with Kura after pickup rather than counted as doctor income. */
  const summary = useMemo(() => {
    let pending = 0;
    let confirmed = 0;
    let owed = 0;
    let pendingCount = 0;
    for (const { ledger } of rows) {
      if (ledger.kind === "doctor-owes-kura") {
        owed += ledger.doctorOwes;
      } else {
        if (ledger.kind === "earning-pending") {
          pending += ledger.doctorEarns;
          pendingCount += 1;
        } else {
          confirmed += ledger.doctorEarns;
        }
      }
    }
    return { pending, confirmed, owed, pendingCount, count: rows.length };
  }, [rows]);
  const payoutCopy = bankMasked
    ? `Pays to ${bankMasked} on ${nextStatementLabel}.`
    : "Add a bank account to receive payouts.";
  const owedCopy = summary.owed > 0
    ? "Clinic cash orders created a Kura balance."
    : "No Kura balance for this period.";

  const selectPeriod = (nextPeriod: Period) => {
    setPeriod(nextPeriod);
    setShowAllRows(false);
  };

  return (
    <Drawer
      className="earnings-drawer"
      open={open}
      onClose={onClose}
      width={440}
      title={period === "today" ? "Today's earnings" : "Monthly earnings"}
      subtitle="Available, pending, and settlement amounts"
      footer={
        <div className="ed-foot">
          <span className="ed-foot-copy">
            <span className="ed-foot-label">Payout account</span>
            <span className="ed-foot-bank">
              <CreditCardIcon aria-hidden size={15} variant="stroke" />
              <span>{bankMasked ?? "No bank account on file"}</span>
            </span>
            <span className="ed-foot-note">
              {bankMasked ? `Next statement ${nextStatementLabel}` : "Add an account to receive payouts"}
            </span>
          </span>
          <Button intent="secondary" size="sm" onClick={onOpenBanking}>
            {bankMasked ? "Banking" : "Add account"}
          </Button>
        </div>
      }
    >
      <div className="ed-period" role="radiogroup" aria-label="Earnings period">
        <button
          type="button"
          role="radio"
          aria-checked={period === "today"}
          className={cx("ed-period-btn", period === "today" && "is-selected")}
          onClick={() => selectPeriod("today")}
        >
          Today
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={period === "month"}
          className={cx("ed-period-btn", period === "month" && "is-selected")}
          onClick={() => selectPeriod("month")}
        >
          This month
        </button>
      </div>

      <section className="ed-summary" aria-label="Period summary">
        <div className="ed-summary-head">
          <span className="ed-summary-label">Available now</span>
          <span className="ed-summary-sub">
            {summary.count} order{summary.count === 1 ? "" : "s"} {periodLabel}
          </span>
        </div>
        <strong className="ed-summary-total">{formatMoney(summary.confirmed)}</strong>
        <p className="ed-summary-copy">{payoutCopy}</p>
        <dl className="ed-split" aria-label="Earnings breakdown">
          <div>
            <dt>Pending</dt>
            <dd className="tone-warning">{formatMoney(summary.pending)}</dd>
            <span>{summary.pendingCount > 0 ? "Waiting on payment or sample collection" : "Nothing pending"}</span>
          </div>
          <div>
            <dt>To settle with Kura</dt>
            <dd className={cx(summary.owed > 0 && "tone-warning")}>{formatMoney(summary.owed)}</dd>
            <span>{owedCopy}</span>
          </div>
        </dl>
      </section>

      <section className="ed-list" aria-label="Earnings by booking">
        <div className="ed-list-head">
          <h3>Latest orders</h3>
          <span>
            {rows.length} in {periodLabel}
          </span>
        </div>
        {rows.length === 0 ? (
          <p className="ed-empty">No orders in this period yet.</p>
        ) : (
          <>
            <ul>
              {visibleRows.map(({ booking, ledger }) => {
              const badge = KIND_BADGE[ledger.kind];
              const value = ledger.kind === "doctor-owes-kura" ? ledger.doctorOwes : ledger.doctorEarns;
              const anchor = getBookingAnchor(booking);
              return (
                <li key={`${booking.patientId}-${booking.code}`}>
                  <button
                    type="button"
                    className="ed-row"
                    aria-label={`${anchor}, ${badge.label}, ${formatMoney(value)}`}
                    onClick={() => onOpenBooking(booking.code)}
                  >
                    <span className="ed-row-main">
                      <span className="ed-row-top">
                        <strong>{anchor}</strong>
                      </span>
                      <small>{booking.placedAt ?? "Today"}</small>
                    </span>
                    <span className="ed-row-money">
                      <strong className={cx(ledger.kind === "doctor-owes-kura" && "is-settlement")}>
                        {ledger.kind === "doctor-owes-kura" ? "" : "+"}
                        {formatMoney(value)}
                      </strong>
                      <Badge tone={badge.tone}>{badge.label}</Badge>
                    </span>
                    <ChevronRightIcon aria-hidden size={16} variant="stroke" />
                  </button>
                </li>
              );
              })}
            </ul>
            {hiddenRowCount > 0 || showAllRows ? (
              <button
                aria-expanded={showAllRows}
                className="ed-show-more"
                onClick={() => setShowAllRows((value) => !value)}
                type="button"
              >
                {showAllRows ? "Show fewer orders" : `Show all ${rows.length} orders`}
              </button>
            ) : null}
          </>
        )}
      </section>
    </Drawer>
  );
}

export default EarningsDetailDrawer;
