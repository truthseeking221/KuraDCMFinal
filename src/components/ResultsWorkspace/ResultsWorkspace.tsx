"use client";

import { useEffect, useMemo, useState } from "react";
import { Avatar, Badge, Button, type BadgeTone } from "@/components/ui";
import {
  resultReviewOf,
  resultSeverityOf,
  useOrderDraft,
  type BookingListItem,
  type ResultReviewState,
  type ResultSeverity,
} from "@/components/OrderDraft";
import {
  getBookingAnchor,
  getBookingTestSummary,
} from "@/components/OrderDraft/bookingShared";
import {
  Bell as BellIcon,
  CheckCircle as CheckCircleIcon,
  ChevronRight as ChevronRightIcon,
  Flask as FlaskIcon,
  Warning as WarningIcon,
} from "@/icons/components";
import { cx } from "@/lib/cx";
import "./ResultsWorkspace.css";

/* The Results destination is a review workspace, not a parked list. The queue is
   for scanning; the detail pane is where the doctor sees enough context to
   decide the next action without losing the existing Labs review flow. */

const SEVERITY_BADGE: Record<ResultSeverity, { tone: "danger" | "warning" | "neutral"; label: string }> = {
  critical: { tone: "danger", label: "Critical" },
  abnormal: { tone: "warning", label: "Abnormal" },
  normal: { tone: "neutral", label: "Normal" },
};

const SEV_RANK: Record<ResultSeverity, number> = { critical: 0, abnormal: 1, normal: 2 };

const LOOP_STEPS = [
  { label: "Review result", detail: "Doctor interpretation" },
  { label: "Notify patient", detail: "Send result message" },
  { label: "Close loop", detail: "No open follow-up" },
] as const;

const STATE_COPY: Record<ResultReviewState, { label: string; tone: BadgeTone; detail: string }> = {
  unreviewed: {
    label: "Needs review",
    tone: "warning",
    detail: "Open Labs, review the values, then record the interpretation.",
  },
  reviewed: {
    label: "Ready to notify",
    tone: "info",
    detail: "Doctor review is recorded. Send the result to the patient next.",
  },
  notified: {
    label: "Patient notified",
    tone: "success",
    detail: "The patient has been notified. Close the loop once no follow-up is pending.",
  },
  closed: {
    label: "Closed",
    tone: "success",
    detail: "The result loop is complete.",
  },
};

type ResultQueueItem = {
  key: string;
  booking: BookingListItem;
  state: ResultReviewState;
  severity: ResultSeverity;
};

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function routeLabelOf(booking: BookingListItem): string {
  if (booking.route === "psc") return "PSC";
  return booking.stat ? "Tubes to Kura · STAT" : "Tubes to Kura";
}

function itemKeyOf(booking: BookingListItem, duplicateIndex: number): string {
  const lineSignature = booking.lines.map((line) => line.lineId).join("|");
  const base = [
    booking.patientId,
    booking.code,
    booking.bookingCode ?? "",
    booking.handoverCode ?? "",
    booking.placedAt ?? "",
    lineSignature,
  ].join(":");
  return duplicateIndex === 0 ? base : `${base}:${duplicateIndex + 1}`;
}

function resultItemsOf(bookings: BookingListItem[]): ResultQueueItem[] {
  const seen = new Map<string, number>();
  return bookings.flatMap((booking) => {
    const state = resultReviewOf(booking);
    if (!state) return [];

    const lineSignature = booking.lines.map((line) => line.lineId).join("|");
    const duplicateBase = [booking.patientId, booking.code, booking.bookingCode ?? "", lineSignature].join(":");
    const duplicateIndex = seen.get(duplicateBase) ?? 0;
    seen.set(duplicateBase, duplicateIndex + 1);

    return [
      {
        key: itemKeyOf(booking, duplicateIndex),
        booking,
        state,
        severity: resultSeverityOf(booking),
      },
    ];
  });
}

function stateBadgeFor(item: ResultQueueItem): { label: string; tone: BadgeTone } {
  if (item.state === "unreviewed") {
    if (item.severity === "normal") return { label: "Review", tone: "info" };
    return SEVERITY_BADGE[item.severity];
  }
  return STATE_COPY[item.state];
}

function sortByPriority(a: ResultQueueItem, b: ResultQueueItem): number {
  return SEV_RANK[a.severity] - SEV_RANK[b.severity];
}

function loopIndexFor(state: ResultReviewState): number {
  if (state === "unreviewed") return 0;
  if (state === "reviewed") return 1;
  if (state === "notified") return 2;
  return LOOP_STEPS.length;
}

export function ResultsWorkspace({ onReview }: { onReview: (booking: BookingListItem) => void }) {
  const { allBookings, notifyPatient, closeResultLoop } = useOrderDraft();
  const [showClosed, setShowClosed] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const groups = useMemo(() => {
    const items = resultItemsOf(allBookings);
    return {
      critical: items.filter((item) => item.state === "unreviewed" && item.severity === "critical").sort(sortByPriority),
      review: items.filter((item) => item.state === "unreviewed" && item.severity !== "critical").sort(sortByPriority),
      notify: items.filter((item) => item.state === "reviewed").sort(sortByPriority),
      done: items.filter((item) => item.state === "notified" || item.state === "closed"),
    };
  }, [allBookings]);

  const orderedItems = useMemo(
    () => [...groups.critical, ...groups.review, ...groups.notify, ...groups.done],
    [groups],
  );
  const selectedItem = orderedItems.find((item) => item.key === selectedKey) ?? orderedItems[0] ?? null;
  const reviewCount = groups.critical.length + groups.review.length;
  const openCount = reviewCount + groups.notify.length;

  useEffect(() => {
    const firstKey = orderedItems[0]?.key ?? null;
    if (!selectedKey && firstKey) {
      setSelectedKey(firstKey);
      return;
    }
    if (selectedKey && !orderedItems.some((item) => item.key === selectedKey)) {
      setSelectedKey(firstKey);
    }
  }, [orderedItems, selectedKey]);

  const row = (item: ResultQueueItem) => {
    const { booking, state, severity } = item;
    const badge = stateBadgeFor(item);
    const selected = selectedItem?.key === item.key;
    const closed = state === "closed";
    return (
      <li className={cx("rw-row", `sev-${severity}`, `state-${state}`, selected && "is-selected", closed && "is-closed")} key={item.key}>
        <button
          type="button"
          className="rw-row-main"
          aria-current={selected ? "true" : undefined}
          onClick={() => setSelectedKey(item.key)}
        >
          <span className="rw-row-av" aria-hidden>
            <Avatar initials={initialsOf(booking.patientName)} name={booking.patientName} size="sm" />
          </span>
          <span className="rw-row-copy">
            <span className="rw-row-top">
              <strong>{booking.patientName}</strong>
              <Badge tone={badge.tone} appearance="subtle">{badge.label}</Badge>
            </span>
            <span className="rw-row-tests">{getBookingTestSummary(booking, 3)}</span>
            <small className="rw-row-meta">
              {getBookingAnchor(booking)}
              {booking.placedAt ? ` · ${booking.placedAt}` : ""}
              {` · ${routeLabelOf(booking)}`}
            </small>
          </span>
          <ChevronRightIcon className="rw-row-chev" size={15} variant="stroke" aria-hidden />
        </button>
      </li>
    );
  };

  const section = (title: string, items: ResultQueueItem[], tone?: "danger") =>
    items.length === 0 ? null : (
      <section className={cx("rw-section", tone && `tone-${tone}`)} aria-label={title} key={title}>
        <header className="rw-section-head">
          <h2>{title}</h2>
          <span className="rw-section-count">{items.length}</span>
        </header>
        <ul className="rw-list">{items.map(row)}</ul>
      </section>
    );

  return (
    <div className="rw" aria-label="Results review workspace">
      <div className="rw-toolbar">
        <div className="rw-toolbar-copy">
          <span className="rw-kicker">Clinic results</span>
          <h2>Review queue</h2>
          <p>
            {openCount > 0
              ? "Select a result to inspect the context, then open Labs when you are ready to review."
              : "No results need a doctor action right now."}
          </p>
        </div>
        <div className="rw-metrics" aria-label="Result queue counts">
          <span className={cx("rw-metric", groups.critical.length > 0 && "is-urgent")}>
            <strong>{reviewCount}</strong>
            <span>Review</span>
          </span>
          <span className="rw-metric">
            <strong>{groups.notify.length}</strong>
            <span>Notify</span>
          </span>
          <span className="rw-metric">
            <strong>{groups.done.length}</strong>
            <span>Closed</span>
          </span>
        </div>
      </div>

      {orderedItems.length === 0 ? (
        <div className="rw-empty">
          <span className="rw-empty-ic" aria-hidden>
            <FlaskIcon size={20} variant="stroke" />
          </span>
          <strong>All caught up</strong>
          <span>Results show here when the lab sends them back.</span>
        </div>
      ) : (
        <div className="rw-shell">
          <aside className="rw-queue" aria-label="Result queue">
            <div className="rw-queue-head">
              <div>
                <h3>Worklist</h3>
                <span>{orderedItems.length} result loops</span>
              </div>
              {groups.critical.length > 0 && (
                <Badge tone="danger" appearance="subtle" icon={<WarningIcon size={13} variant="stroke" />}>
                  Urgent
                </Badge>
              )}
            </div>
            <div className="rw-queue-list">
              {section("Critical", groups.critical, "danger")}
              {section("Needs review", groups.review)}
              {section("Ready to notify", groups.notify)}

              {groups.done.length > 0 && (
                <section className="rw-section rw-section-closed" aria-label="Recently closed">
                  <button
                    aria-expanded={showClosed}
                    className="rw-closed-toggle"
                    onClick={() => setShowClosed((open) => !open)}
                    type="button"
                  >
                    <ChevronRightIcon aria-hidden className="rw-closed-chev" size={13} variant="stroke" />
                    <span>Recently closed</span>
                    <span className="rw-section-count">{groups.done.length}</span>
                  </button>
                  {showClosed && <ul className="rw-list">{groups.done.map(row)}</ul>}
                </section>
              )}
            </div>
          </aside>

          <ResultDetail
            item={selectedItem}
            onReview={onReview}
            onNotify={(booking) => notifyPatient(booking.code)}
            onClose={(booking) => closeResultLoop(booking.code)}
          />
        </div>
      )}
    </div>
  );
}

function ResultDetail({
  item,
  onReview,
  onNotify,
  onClose,
}: {
  item: ResultQueueItem | null;
  onReview: (booking: BookingListItem) => void;
  onNotify: (booking: BookingListItem) => void;
  onClose: (booking: BookingListItem) => void;
}) {
  if (!item) {
    return (
      <section className="rw-detail rw-detail-empty" aria-label="Result detail">
        <span className="rw-empty-ic" aria-hidden>
          <FlaskIcon size={20} variant="stroke" />
        </span>
        <strong>No result selected</strong>
        <span>Select a result from the worklist.</span>
      </section>
    );
  }

  const { booking, state, severity } = item;
  const severityBadge = SEVERITY_BADGE[severity];
  const stateCopy = STATE_COPY[state];
  const labRefs = booking.lines.flatMap((line) =>
    line.labRefs.map((ref) => ({
      ...ref,
      lineName: line.displayName,
    })),
  );
  const visibleLines = booking.lines.slice(0, 6);
  const hiddenLineCount = Math.max(0, booking.lines.length - visibleLines.length);

  return (
    <section className="rw-detail" aria-label={`Result detail for ${booking.patientName}`}>
      <div className="rw-detail-scroll">
        <header className="rw-detail-head">
          <Avatar initials={initialsOf(booking.patientName)} name={booking.patientName} size="lg" />
          <div className="rw-detail-title">
            <div className="rw-detail-badges">
              <Badge tone={stateCopy.tone} appearance="subtle">{stateCopy.label}</Badge>
              {state === "unreviewed" && severity !== "normal" && (
                <Badge tone={severityBadge.tone} appearance="subtle">{severityBadge.label}</Badge>
              )}
            </div>
            <h2>{booking.patientName}</h2>
            <p>
              {booking.mrn} · {booking.phoneMasked}
            </p>
          </div>
        </header>

        <dl className="rw-meta-grid">
          <div>
            <dt>Booking</dt>
            <dd>{getBookingAnchor(booking)}</dd>
          </div>
          <div>
            <dt>Result age</dt>
            <dd>{booking.placedAt ?? "Today"}</dd>
          </div>
          <div>
            <dt>Collection</dt>
            <dd>{routeLabelOf(booking)}</dd>
          </div>
          <div>
            <dt>Tests</dt>
            <dd>{booking.lines.length}</dd>
          </div>
        </dl>

        <section className="rw-detail-section rw-detail-context">
          <header>
            <h3>Result context</h3>
            <span>{stateCopy.label}</span>
          </header>
          <p className="rw-detail-note">{stateCopy.detail}</p>
          {booking.interpretation && <p className="rw-interpretation">{booking.interpretation}</p>}
        </section>

        <section className="rw-detail-section rw-detail-loop">
          <header>
            <h3>Result loop</h3>
            <span>{stateCopy.label}</span>
          </header>
          <ol className="rw-loop-list">
            {LOOP_STEPS.map((step, index) => {
              const activeIndex = loopIndexFor(state);
              const done = state === "closed" || index < activeIndex;
              const current = state !== "closed" && index === activeIndex;
              return (
                <li className={cx(done && "is-done", current && "is-current")} key={step.label}>
                  <span className="rw-loop-dot" aria-hidden />
                  <span>
                    <strong>{step.label}</strong>
                    <small>{step.detail}</small>
                  </span>
                </li>
              );
            })}
          </ol>
        </section>

        {labRefs.length > 0 && (
          <section className="rw-detail-section rw-detail-signals">
            <header>
              <h3>Mapped signals</h3>
              <span>{getBookingTestSummary(booking, 3)}</span>
            </header>
            <ul className="rw-signal-list">
              {labRefs.map((ref) => (
                <li key={`${ref.labKey}-${ref.lineName}`}>
                  <span className={cx("rw-signal-dot", ref.severityTone && `tone-${ref.severityTone}`)} aria-hidden />
                  <span>
                    <strong>{ref.labName}</strong>
                    <small>{ref.reasonText ?? ref.lineName}</small>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className={cx("rw-detail-section rw-detail-tests", labRefs.length === 0 && "is-primary")}>
          <header>
            <h3>Returned tests</h3>
            <span>{getBookingTestSummary(booking, 3)}</span>
          </header>
          {labRefs.length > 0 ? (
            <p className="rw-detail-note">Tests returned in this booking.</p>
          ) : (
            <p className="rw-detail-note">
              Result file is back from the lab. Open Labs to read values and record the doctor interpretation.
            </p>
          )}
          <ul className="rw-test-list">
            {visibleLines.map((line) => (
              <li key={line.lineId}>
                <span>{line.displayName}</span>
                {line.kind === "bundle" && <small>Panel</small>}
              </li>
            ))}
            {hiddenLineCount > 0 && <li className="rw-test-more">+{hiddenLineCount} more</li>}
          </ul>
        </section>

        {booking.carePlanTitle && (
          <section className="rw-detail-section rw-detail-plan">
            <header>
              <h3>Care plan</h3>
              <span>Filed under</span>
            </header>
            <p className="rw-detail-note">{booking.carePlanTitle}</p>
          </section>
        )}
      </div>

      <footer className="rw-detail-actions">
        {state === "unreviewed" && (
          <Button
            fullWidth
            intent="primary"
            leadingIcon={<FlaskIcon size={15} variant="stroke" />}
            onClick={() => onReview(booking)}
          >
            Review in Labs
          </Button>
        )}
        {state === "reviewed" && (
          <>
            <Button
              fullWidth
              intent="primary"
              leadingIcon={<BellIcon size={15} variant="stroke" />}
              onClick={() => onNotify(booking)}
            >
              Notify patient
            </Button>
            <Button fullWidth intent="outline" onClick={() => onClose(booking)}>
              Close without message
            </Button>
          </>
        )}
        {state === "notified" && (
          <Button
            fullWidth
            intent="primary"
            leadingIcon={<CheckCircleIcon size={15} variant="stroke" />}
            onClick={() => onClose(booking)}
          >
            Close loop
          </Button>
        )}
        {state === "closed" && (
          <div className="rw-detail-closed">
            <CheckCircleIcon size={16} variant="stroke" />
            <span>Loop closed</span>
          </div>
        )}
      </footer>
    </section>
  );
}
