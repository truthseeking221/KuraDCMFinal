"use client";

import { useMemo } from "react";
import { Avatar, Badge, Button } from "@/components/ui";
import {
  resultReviewOf,
  resultSeverityOf,
  useOrderDraft,
  type BookingListItem,
  type ResultSeverity,
} from "@/components/OrderDraft";
import { getBookingTestSummary } from "@/components/OrderDraft/bookingShared";
import {
  Bell as BellIcon,
  CheckCircle as CheckCircleIcon,
  ChevronRight as ChevronRightIcon,
  Flask as FlaskIcon,
} from "@/icons/components";
import { cx } from "@/lib/cx";
import "./ResultsWorkspace.css";

/* The Results destination — the close-the-loop work queue the app was missing.
   results-back is only the operational fact; this queue is the doctor's action
   layer: unreviewed → reviewed → notified → closed. Grouped by urgency so the
   doctor always knows what to touch first; one primary action per row. */

const SEVERITY_BADGE: Record<ResultSeverity, { tone: "danger" | "warning" | "neutral"; label: string }> = {
  critical: { tone: "danger", label: "Critical" },
  abnormal: { tone: "warning", label: "Abnormal" },
  normal: { tone: "neutral", label: "Normal" },
};

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function ResultsWorkspace({ onReview }: { onReview: (booking: BookingListItem) => void }) {
  const { allBookings, notifyPatient, closeResultLoop } = useOrderDraft();

  const groups = useMemo(() => {
    const open = allBookings.filter((b) => resultReviewOf(b) !== null);
    const stateOf = (b: BookingListItem) => resultReviewOf(b);
    return {
      critical: open.filter((b) => stateOf(b) === "unreviewed" && resultSeverityOf(b) === "critical"),
      review: open.filter((b) => stateOf(b) === "unreviewed" && resultSeverityOf(b) !== "critical"),
      notify: open.filter((b) => stateOf(b) === "reviewed"),
      done: open.filter((b) => stateOf(b) === "notified" || stateOf(b) === "closed"),
    };
  }, [allBookings]);

  const openCount = groups.critical.length + groups.review.length + groups.notify.length;

  const row = (booking: BookingListItem) => {
    const state = resultReviewOf(booking);
    const severity = resultSeverityOf(booking);
    const badge = SEVERITY_BADGE[severity];
    const closed = state === "closed";
    return (
      <li className={cx("rw-row", `sev-${severity}`, closed && "is-closed")} key={booking.code}>
        <span className="rw-row-av">
          <Avatar initials={initialsOf(booking.patientName)} name={booking.patientName} size="sm" />
        </span>
        <span className="rw-row-copy">
          <strong>{booking.patientName}</strong>
          <small>
            {getBookingTestSummary(booking)} · {booking.bookingCode ?? booking.code}
            {booking.placedAt ? ` · ${booking.placedAt}` : ""}
          </small>
          {booking.interpretation && <span className="rw-row-interp">“{booking.interpretation}”</span>}
        </span>
        <Badge tone={badge.tone} appearance="subtle">
          {badge.label}
        </Badge>
        <span className="rw-row-actions">
          {state === "unreviewed" && (
            <Button
              size="sm"
              intent={severity === "critical" ? "destructive" : "primary"}
              trailingIcon={<ChevronRightIcon size={14} variant="stroke" />}
              onClick={() => onReview(booking)}
            >
              Review
            </Button>
          )}
          {state === "reviewed" && (
            <>
              <button type="button" className="rw-link" onClick={() => closeResultLoop(booking.code)}>
                Close
              </button>
              <Button size="sm" intent="primary" leadingIcon={<BellIcon size={13} variant="stroke" />} onClick={() => notifyPatient(booking.code)}>
                Notify patient
              </Button>
            </>
          )}
          {state === "notified" && (
            <Button size="sm" intent="secondary" onClick={() => closeResultLoop(booking.code)}>
              Close loop
            </Button>
          )}
          {state === "closed" && (
            <span className="rw-row-done">
              <CheckCircleIcon size={14} variant="stroke" /> Closed
            </span>
          )}
        </span>
      </li>
    );
  };

  const section = (title: string, hint: string, items: BookingListItem[], tone?: "danger") =>
    items.length === 0 ? null : (
      <section className={cx("rw-section", tone && `tone-${tone}`)} aria-label={title}>
        <header className="rw-section-head">
          <h2>{title}</h2>
          <span className="rw-section-count">{items.length}</span>
          <p>{hint}</p>
        </header>
        <ul className="rw-list">{items.map(row)}</ul>
      </section>
    );

  return (
    <div className="rw" aria-label="Results review queue">
      <p className="rw-lede">
        {openCount === 0
          ? "No results waiting — every result is reviewed and the loop is closed."
          : `${openCount} result${openCount === 1 ? "" : "s"} need you. Review, then notify the patient and close the loop.`}
      </p>

      {openCount === 0 && groups.done.length === 0 && (
        <div className="rw-empty">
          <span className="rw-empty-ic" aria-hidden>
            <FlaskIcon size={20} variant="stroke" />
          </span>
          <strong>All caught up</strong>
          <span>Results land here the moment the lab sends them back.</span>
        </div>
      )}

      {section("Critical now", "Abnormal with a danger signal — act first.", groups.critical, "danger")}
      {section("Review today", "Results back and not yet reviewed.", groups.review)}
      {section("Notify pending", "Reviewed — let the patient know, then close.", groups.notify)}
      {section("Recently closed", "Loop complete.", groups.done)}
    </div>
  );
}
