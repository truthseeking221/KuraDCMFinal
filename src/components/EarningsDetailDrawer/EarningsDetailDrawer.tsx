"use client";

/* Doctor earnings — Details drawer off the Home earnings card.

   Earnings are the doctor's SPREAD (commission), not a patient discount: the
   patient pays full list price, the doctor keeps DOCTOR_COMMISSION_RATE, Kura
   keeps the rest (mastersource §19-26). A share only FREEZES once the line is
   paid AND served — until then it is "pending"; cash-at-clinic flips to "you owe
   Kura". This drawer shows that ledger per booking, the period total, and the
   settlement cadence, then hands off to the booking detail or to Banking. It is a
   read view onto the same `ledgerImpact` the order rail computes, so the numbers
   never drift. */

import { useMemo, useState } from "react";
import { Badge, Button, Drawer } from "@/components/ui";
import type { BadgeTone } from "@/components/ui";
import {
  ArrowDown as DownloadIcon,
  ChevronRight as ChevronRightIcon,
  CreditCard as CreditCardIcon,
  Info as InfoIcon,
} from "@/icons/components";
import { cx } from "@/lib/cx";
import { formatMoney } from "@/components/OrderDraft/catalog";
import { deriveOrderLedgerImpact } from "@/components/OrderDraft/ledger";
import { getBookingAnchor, getBookingTestSummary } from "@/components/OrderDraft/bookingShared";
import type { BookingListItem, OrderLedgerImpact } from "@/components/OrderDraft/types";
import "./EarningsDetailDrawer.css";

type Period = "today" | "month";

export type EarningsDetailDrawerProps = {
  open: boolean;
  onClose: () => void;
  bookings: BookingListItem[];
  /* Pre-formatted period figures from the Home card, shown in the summary. */
  todayLabel: string;
  monthLabel: string;
  trend?: string;
  /* Masked ABA account from Settings → Billing, for the banking row. */
  bankMasked?: string;
  nextStatementLabel: string;
  onOpenBooking: (code: string) => void;
  onOpenBanking: () => void;
};

const KIND_BADGE: Record<OrderLedgerImpact["kind"], { tone: BadgeTone; label: string }> = {
  "earning-pending": { tone: "warning", label: "Pending" },
  "earning-confirmed": { tone: "success", label: "Confirmed" },
  "doctor-owes-kura": { tone: "danger", label: "You owe Kura" },
};

function isTodayPlaced(placedAt?: string): boolean {
  const s = (placedAt ?? "").toLowerCase();
  return s === "today" || s.startsWith("today") || /^\d+\s*m\s*ago$/.test(s) || /^\d+\s*h\s*ago$/.test(s);
}

export function EarningsDetailDrawer({
  open,
  onClose,
  bookings,
  todayLabel,
  monthLabel,
  trend,
  bankMasked,
  nextStatementLabel,
  onOpenBooking,
  onOpenBanking,
}: EarningsDetailDrawerProps) {
  const [period, setPeriod] = useState<Period>("today");

  const rows = useMemo(() => {
    return bookings
      .filter((booking) => !booking.cancelled && (period === "month" || isTodayPlaced(booking.placedAt)))
      .map((booking) => ({ booking, ledger: booking.ledgerImpact ?? deriveOrderLedgerImpact(booking) }))
      .sort((a, b) => b.ledger.doctorEarns - a.ledger.doctorEarns);
  }, [bookings, period]);

  /* Period roll-up: net earned excludes the cash-owed lines (those are a debt the
     doctor settles to Kura, not income). */
  const summary = useMemo(() => {
    let earned = 0;
    let pending = 0;
    let confirmed = 0;
    let owed = 0;
    let pendingCount = 0;
    for (const { ledger } of rows) {
      if (ledger.kind === "doctor-owes-kura") {
        owed += ledger.doctorOwes;
      } else {
        earned += ledger.doctorEarns;
        if (ledger.kind === "earning-pending") {
          pending += ledger.doctorEarns;
          pendingCount += 1;
        } else {
          confirmed += ledger.doctorEarns;
        }
      }
    }
    return { earned, pending, confirmed, owed, pendingCount, count: rows.length };
  }, [rows]);

  return (
    <Drawer
      className="earnings-drawer"
      open={open}
      onClose={onClose}
      width={480}
      title="Your earnings"
      subtitle="Your spread on the lab orders you place"
      footer={
        <div className="ed-foot">
          <span className="ed-foot-bank">
            <CreditCardIcon aria-hidden size={15} variant="stroke" />
            <span>{bankMasked ? `Paid to ${bankMasked}` : "No bank account on file"}</span>
          </span>
          <Button intent="secondary" size="sm" onClick={onOpenBanking}>
            {bankMasked ? "Manage banking" : "Add account"}
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
          onClick={() => setPeriod("today")}
        >
          Today
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={period === "month"}
          className={cx("ed-period-btn", period === "month" && "is-selected")}
          onClick={() => setPeriod("month")}
        >
          This month
        </button>
      </div>

      <section className="ed-summary" aria-label="Period summary">
        <div className="ed-summary-head">
          <strong className="ed-summary-total">{period === "today" ? todayLabel : monthLabel}</strong>
          <span className="ed-summary-sub">
            {summary.count} order{summary.count === 1 ? "" : "s"}
            {trend && period === "today" ? ` · ${trend}` : ""}
          </span>
        </div>
        <dl className="ed-split">
          <div>
            <dt>Confirmed</dt>
            <dd className="tone-success">{formatMoney(summary.confirmed)}</dd>
          </div>
          <div>
            <dt>Pending</dt>
            <dd className="tone-warning">{formatMoney(summary.pending)}</dd>
          </div>
          {summary.owed > 0 && (
            <div>
              <dt>You owe Kura</dt>
              <dd className="tone-danger">{formatMoney(summary.owed)}</dd>
            </div>
          )}
        </dl>
        {summary.pendingCount > 0 && (
          <p className="ed-note">
            <InfoIcon aria-hidden size={13} variant="stroke" />
            <span>
              Pending earnings freeze once the order is paid <strong>and</strong> the sample is collected.
            </span>
          </p>
        )}
      </section>

      <section className="ed-list" aria-label="Earnings by booking">
        <div className="ed-list-head">
          <h3>By booking</h3>
        </div>
        {rows.length === 0 ? (
          <p className="ed-empty">No orders in this period yet.</p>
        ) : (
          <ul>
            {rows.map(({ booking, ledger }) => {
              const badge = KIND_BADGE[ledger.kind];
              const value = ledger.kind === "doctor-owes-kura" ? ledger.doctorOwes : ledger.doctorEarns;
              const anchor = getBookingAnchor(booking);
              return (
                <li key={`${booking.patientId}-${booking.code}`}>
                  <button type="button" className="ed-row" onClick={() => onOpenBooking(booking.code)}>
                    <span className="ed-row-main">
                      <span className="ed-row-top">
                        <strong>{booking.patientName}</strong>
                        <span className="ed-row-code">{anchor}</span>
                      </span>
                      <small>{getBookingTestSummary(booking, 2)}</small>
                    </span>
                    <span className="ed-row-money">
                      <strong className={cx(ledger.kind === "doctor-owes-kura" && "is-owed")}>
                        {ledger.kind === "doctor-owes-kura" ? "−" : "+"}
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
        )}
      </section>

      <section className="ed-settle" aria-label="Settlement">
        <div className="ed-settle-copy">
          <strong>Settlement</strong>
          <span>
            Earnings net twice a month (1–15 and 16–end). Next statement <strong>{nextStatementLabel}</strong>, paid to
            your account on file.
          </span>
        </div>
        <Button
          intent="secondary"
          size="sm"
          leadingIcon={<DownloadIcon size={14} variant="stroke" />}
          onClick={onOpenBanking}
        >
          Statements
        </Button>
      </section>
    </Drawer>
  );
}

export default EarningsDetailDrawer;
