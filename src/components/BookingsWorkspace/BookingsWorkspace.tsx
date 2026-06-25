"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Avatar, Badge, Button } from "@/components/ui";
import type { BadgeTone } from "@/components/ui";
import { Pagination } from "@/components/pagination";
import {
  CheckCircle as CheckCircleIcon,
  Close as CloseIcon,
  Clock as ClockIcon,
  Flask as FlaskIcon,
  Info as InfoIcon,
  Patient as PatientIcon,
  Search as SearchIcon,
  Share as ShareIcon,
  Tube as TubeIcon,
  Warning as WarningIcon,
} from "@/icons/components";
import { cx } from "@/lib/cx";
import { formatMoney } from "@/components/OrderDraft/catalog";
import type { BookingPatient } from "@/components/OrderDraft/bookingSeeds";
import { useOrderDraft } from "@/components/OrderDraft/OrderDraftContext";
import {
  BookingActions,
  bookingHasDoctorAction,
  bookingMatchesCode,
  getBookingAnchor,
  getBookingEta,
  getBookingLifecycle,
  getBookingNextStepCard,
  getBookingSearchKeywords,
  getBookingTestSummary,
  getBookingTime,
  getCollectionPlan,
  getCollectionRoute,
  getPaymentSummary,
  isBookingAwaitingVisit,
} from "@/components/OrderDraft/bookingShared";
import type {
  BookingListItem,
  DoctorIdentityDecision,
  DoctorPatientAssurance,
  OrderDraftLine,
  PlacedOrderSummary,
} from "@/components/OrderDraft/types";
import { BookingComposer } from "./BookingComposer";
import "./BookingsWorkspace.css";

type BookingScopeId = "today" | "upcoming" | "past" | "all";

/* Work axis = booking lifecycle (the single status) + one needs-action overlay.
   Route, claim/payment, and time scope live on their own axes, never here. */
type BookingWorkFilterId =
  | "all-active"
  | "needs-action"
  | "awaiting-collection"
  | "sample-collected"
  | "results-ready"
  | "cancelled";
type WorkspaceState = "ready" | "loading" | "error" | "permission" | "offline" | "read-only";

/* External navigation handoff into the workspace. `code` selects a specific
   booking; `filter`/`scope` land on a lane (Home KPI / needs-attention cards).
   At least one of code/filter is set. `key` bumps so repeat clicks re-fire. */
export type BookingFocus = {
  code?: string;
  filter?: BookingWorkFilterId;
  scope?: BookingScopeId;
  key: number;
};

export type BookingsWorkspaceProps = {
  focus: BookingFocus | null;
  onOpenPatient: (patientId: string) => void;
  onReviewLabs: (patientId: string, bookingCode: string) => void;
  /* New booking wizard — replaces the queue with the in-page composer. */
  composerOpen: boolean;
  composerSeed?: {
    key: number;
    itemIds: string[];
    patient?: BookingPatient | null;
    identityDecision?: DoctorIdentityDecision | null;
    patientAssurance?: DoctorPatientAssurance | null;
  } | null;
  onComposerClose: () => void;
};

const bookingScopeIds = ["today", "upcoming", "past", "all"] as const satisfies readonly BookingScopeId[];
const bookingWorkFilterIds = [
  "all-active",
  "needs-action",
  "awaiting-collection",
  "sample-collected",
  "results-ready",
  "cancelled",
] as const satisfies readonly BookingWorkFilterId[];
const visibleBookingWorkFilterIds = bookingWorkFilterIds.filter((filter) => filter !== "all-active");

const scopeLabels: Record<BookingScopeId, string> = {
  today: "Today",
  upcoming: "Upcoming",
  past: "Past",
  all: "All",
};

const workFilterLabels: Record<BookingWorkFilterId, string> = {
  "all-active": "Active",
  "needs-action": "Needs you",
  "awaiting-collection": "Waiting for sample",
  "sample-collected": "Sample at lab",
  "results-ready": "Results back",
  cancelled: "Cancelled",
};

function getBookingWorkFilterTone(filter: BookingWorkFilterId): "neutral" | "brand" | "danger" | "warning" | "ai" {
  if (filter === "needs-action" || filter === "awaiting-collection") return "warning";
  if (filter === "sample-collected" || filter === "results-ready") return "brand";
  return "neutral";
}

/* Per-filter empty copy — a worklist should say WHY a lane is clear, not just
   "no results". Keyed by work filter; scope narrows but keeps the same voice. */
const workEmptyCopy: Record<BookingWorkFilterId, { title: string; body: string }> = {
  "all-active": { title: "No active bookings", body: "Nothing is in progress for this time period. Create a booking or widen the view." },
  "needs-action": { title: "Nothing needs you right now", body: "Every booking is with the patient, PSC, or lab." },
  "awaiting-collection": { title: "No samples waiting", body: "No booking is waiting for the patient, clinic, or PSC to collect a sample." },
  "sample-collected": { title: "No samples at the lab", body: "No collected sample is waiting on results." },
  "results-ready": { title: "No results back yet", body: "Results are still being processed. Nothing needs review." },
  cancelled: { title: "No cancelled bookings", body: "Nothing has been cancelled in this time scope." },
};

function getBookingTestsLine(order: PlacedOrderSummary): string {
  if (order.lines.length === 0) return "—";
  return order.lines.map((line) => line.displayName).join(" · ");
}

function getConciseBookingNextLabel(label: string): string {
  if (label === "Waiting for sample") return "Await sample";
  if (label === "Sample at lab") return "At lab";
  return label;
}

function getCollectionRouteTitle(route: string) {
  if (route === "PSC") return "Patient service center";
  if (route === "Tubes") return "Doctor sends tubes";
  return "Sample at lab";
}

function BookingStateCell({ booking }: { booking: BookingListItem }) {
  const lifecycle = getBookingLifecycle(booking);
  const route = getCollectionRoute(booking);
  const time = getBookingTime(booking);

  return (
    <span
      className={cx("table-cell booking-state-cell", `tone-${lifecycle.tone}`, bookingHasDoctorAction(booking) && "needs-action")}
      title={`${lifecycle.label} · ${time} · ${getCollectionRouteTitle(route)}`}
    >
      <span className="booking-state-label">
        <span className="booking-state-dot" aria-hidden="true" />
        {getConciseBookingNextLabel(lifecycle.label)}
      </span>
      <span className="booking-state-meta">
        <span>{time}</span>
        <span aria-hidden="true">·</span>
        <span>{route}</span>
      </span>
    </span>
  );
}

function getBookingRowKey(booking: BookingListItem): string {
  return [
    booking.patientId,
    booking.code,
    booking.bookingCode ?? "",
    booking.handoverCode ?? "",
    booking.placedAt ?? "",
    booking.lines.map((line) => line.lineId).join(","),
  ].join("::");
}

function findBookingByKey(bookings: BookingListItem[], key: string | null): BookingListItem | null {
  if (!key) return null;
  return bookings.find((booking) => getBookingRowKey(booking) === key) ?? bookings.find((booking) => booking.code === key || bookingMatchesCode(booking, key)) ?? null;
}

const emptyStateCopy = {
  loading: {
    title: "Loading bookings",
    body: "Booking sync is still connecting. Keep the patient chart open while the queue loads.",
  },
  error: {
    title: "Bookings could not load",
    body: "Refresh the queue. If it still fails, continue from the patient chart and retry before cancelling anything.",
  },
  permission: {
    title: "Bookings unavailable",
    body: "Your clinic role does not allow viewing this operational queue. Ask an admin to update access.",
  },
  offline: {
    title: "Offline",
    body: "Existing rows are read-only until booking sync returns. Do not confirm new sample handoffs while offline.",
  },
  "read-only": {
    title: "Read-only mode",
    body: "Booking status is visible, but edits and cancellations are locked for this session.",
  },
} satisfies Record<Exclude<WorkspaceState, "ready">, { title: string; body: string }>;

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function normalizeBookingSearchText(value: string): string {
  return normalize(value).replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

function getBookingSearchTokens(query: string): string[] {
  return normalizeBookingSearchText(query).split(" ").filter(Boolean);
}

function isTodayBooking(order: PlacedOrderSummary): boolean {
  const placedAt = normalize(order.placedAt ?? "");
  return (
    placedAt === "today" ||
    placedAt.startsWith("today") ||
    /^\d+\s*m\s*ago$/.test(placedAt) ||
    /^\d+\s*h\s*ago$/.test(placedAt)
  );
}

function isUpcomingBooking(order: PlacedOrderSummary): boolean {
  if (order.cancelled || order.bookingStatus !== "scheduled") return false;
  /* future visit set (created today, not yet visited) OR a future-dated placedAt */
  return !!order.scheduledFor || !isTodayBooking(order);
}

/* Past = neither today nor a future-scheduled booking — older/closed work. */
function isPastBooking(order: PlacedOrderSummary): boolean {
  return !isTodayBooking(order) && !isUpcomingBooking(order);
}

function matchesScope(order: BookingListItem, scope: BookingScopeId): boolean {
  if (scope === "all") return true;
  if (scope === "upcoming") return isUpcomingBooking(order);
  if (scope === "past") return isPastBooking(order);
  /* a booking created today but scheduled for a future visit belongs to Upcoming,
     not Today */
  return isTodayBooking(order) && !isUpcomingBooking(order);
}

/* Work filter = lifecycle bucket OR the needs-action overlay. Lifecycle buckets
   exclude cancelled; "all-active" is everything not cancelled. */
function matchesWorkFilter(order: BookingListItem, filter: BookingWorkFilterId): boolean {
  if (filter === "all-active") return !order.cancelled;
  if (filter === "needs-action") return bookingHasDoctorAction(order);
  if (filter === "cancelled") return order.cancelled;
  if (filter === "awaiting-collection") return !order.cancelled && order.bookingStatus === "scheduled";
  if (filter === "sample-collected") return !order.cancelled && order.bookingStatus === "in-progress";
  return !order.cancelled && order.bookingStatus === "results-back";
}

function getRecencyMinutes(order: PlacedOrderSummary): number {
  const placedAt = normalize(order.placedAt ?? "today");
  const minutes = placedAt.match(/^(\d+)\s*m\s*ago$/);
  if (minutes) return Number(minutes[1]);
  const hours = placedAt.match(/^(\d+)\s*h\s*ago$/);
  if (hours) return Number(hours[1]) * 60;
  const days = placedAt.match(/^(\d+)\s*d\s*ago$/);
  if (days) return Number(days[1]) * 24 * 60;
  if (placedAt === "today" || placedAt.startsWith("today")) return 12 * 60;
  if (placedAt === "yesterday") return 24 * 60;
  return Number.MAX_SAFE_INTEGER;
}

/* Worklist order: doctor exceptions first, then ready results, then collection
   due, then samples in flight. Cancelled sinks. Lifecycle drives the rest;
   needs-action (abnormal review, identity, claim) overrides it to the top. */
function getQueuePriority(order: PlacedOrderSummary): number {
  if (order.cancelled) return 80;
  if (bookingHasDoctorAction(order)) return 0;
  if (order.bookingStatus === "results-back") return 1;
  if (order.bookingStatus === "scheduled") return 2;
  if (order.bookingStatus === "in-progress") return 3;
  return 10;
}

function sortBookingsForQueue(bookings: BookingListItem[]): BookingListItem[] {
  return [...bookings].sort((a, b) => {
    const priority = getQueuePriority(a) - getQueuePriority(b);
    if (priority !== 0) return priority;
    const recency = getRecencyMinutes(a) - getRecencyMinutes(b);
    if (recency !== 0) return recency;
    return getBookingAnchor(a).localeCompare(getBookingAnchor(b));
  });
}

function matchesBookingQuery(order: BookingListItem, query: string): boolean {
  const tokens = getBookingSearchTokens(query);
  if (tokens.length === 0) return true;
  if (bookingMatchesCode(order, query)) return true;

  const eta = getBookingEta(order);
  const searchableText = normalizeBookingSearchText(
    [
      order.patientName,
      order.patientId,
      order.mrn,
      order.phoneMasked,
      order.placedAt ?? "",
      getBookingTestSummary(order, order.lines.length),
      eta.label,
      eta.detail,
      ...getBookingSearchKeywords(order),
    ].join(" "),
  );

  return tokens.every((token) => searchableText.includes(token));
}

function normalizeUiSentence(value: string): string {
  return value.replace(/\.\s*\./g, ".");
}

function getHandoffFact(order: PlacedOrderSummary): { label: string; value: string } {
  if (order.route === "psc") return { label: "PSC code", value: order.bookingCode ?? getBookingAnchor(order) };
  if (order.handoverCode) return { label: "Handover code", value: order.handoverCode };
  return { label: "Pickup", value: order.sweep ?? "Next sweep" };
}

type TestResultView = {
  label: string;
  tone: BadgeTone;
};

const resultFixtures: Record<string, TestResultView> = {
  hba1c: { label: "High", tone: "danger" },
  "lipid-panel": { label: "High", tone: "warning" },
  cbc: { label: "Low", tone: "warning" },
  ferritin: { label: "Low", tone: "warning" },
  "creatinine-egfr": { label: "Watch", tone: "warning" },
};

function getLineResult(order: PlacedOrderSummary, line: OrderDraftLine): TestResultView | null {
  if (order.bookingStatus !== "results-back" || order.cancelled) return null;
  /* Only assert a clinical verdict (success/warning/danger) for analytes we have
     actually evaluated. An unknown analyte falls back to a NEUTRAL "Result in" so
     a green pill never implies "normal/reviewed" for an unread value. */
  return resultFixtures[line.itemId ?? line.lineId] ?? { label: "Result in", tone: "neutral" };
}

function getTimelineRows(order: BookingListItem): Array<{ label: string; value: string; state: "done" | "current" | "muted" }> {
  const resultsBack = order.bookingStatus === "results-back";
  const awaitingVisit = isBookingAwaitingVisit(order);
  const sampleDone = resultsBack || (order.bookingStatus === "in-progress" && !awaitingVisit);
  /* Close-the-loop truth: absent resultReview on a results-back booking = unreviewed. */
  const review = resultsBack ? order.resultReview ?? "unreviewed" : undefined;
  const reviewed = review === "reviewed" || review === "notified" || review === "closed";
  const reported = review === "notified" || review === "closed";

  /* A done step must read a past-tense outcome, never a "Waiting…" value. */
  const scheduledStep =
    order.route === "psc"
      ? { label: "Code sent", current: "Waiting for visit", done: "Visit logged" }
      : order.handoverCode
        ? { label: "Courier dispatched", current: "Waiting for handoff", done: "Handed to courier" }
        : { label: "Pickup scheduled", current: "Waiting for pickup", done: "Picked up" };
  const scheduledState: "done" | "current" | "muted" = order.cancelled
    ? "muted"
    : order.bookingStatus === "scheduled"
      ? "current"
      : "done";

  const rows: Array<{ label: string; value: string; state: "done" | "current" | "muted" }> = [
    { label: "Booking created", value: order.placedAt ?? "Today", state: order.cancelled ? "muted" : "done" },
    {
      label: scheduledStep.label,
      value: scheduledState === "current" ? scheduledStep.current : scheduledStep.done,
      state: scheduledState,
    },
    {
      label: "Sample at lab",
      value: awaitingVisit ? "No PSC visit yet" : sampleDone ? (order.route === "psc" ? "Collected at PSC" : "Tubes received") : "Not collected",
      state: order.cancelled ? "muted" : order.bookingStatus === "in-progress" ? "current" : sampleDone ? "done" : "muted",
    },
    {
      label: "Results back",
      value: resultsBack ? (order.flagged && !reviewed ? "Needs review" : reviewed ? "Reviewed" : "Ready to send") : "Waiting",
      state: order.cancelled ? "muted" : !resultsBack ? "muted" : reviewed ? "done" : "current",
    },
    {
      /* Only a genuine notified/closed state earns a done "Sent". Until then the
         report step stays open (current once reviewed, otherwise upcoming) so the
         timeline never claims a still-open episode is finished. */
      label: "Report sent",
      value: reported ? "Sent" : reviewed ? "Ready to send" : "Not sent yet",
      state: order.cancelled ? "muted" : reported ? "done" : reviewed ? "current" : "muted",
    },
  ];

  return rows;
}

function BookingAccessState({ state }: { state: Exclude<WorkspaceState, "ready"> }) {
  const copy = emptyStateCopy[state];
  return (
    <section className="bookings-workspace bookings-state" aria-labelledby="bookings-state-title">
      <div className="bookings-state-panel">
        <Badge tone={state === "loading" ? "info" : "warning"} icon={<InfoIcon size={13} variant="stroke" />}>
          {state}
        </Badge>
        <h2 id="bookings-state-title">{copy.title}</h2>
        <p>{copy.body}</p>
      </div>
    </section>
  );
}

type BookingStatusCardTone = "brand" | "danger" | "neutral" | "success" | "warning";
type BookingStatusCardCopy = {
  title: string;
  body: string;
  icon: typeof WarningIcon;
  tone: BookingStatusCardTone;
};
type BookingStatusFact = { label: string; value: string; mono?: boolean };

function getBookingStatusCard(booking: BookingListItem, nextCard: { title: string; body: string }): BookingStatusCardCopy {
  if (booking.flagged && booking.bookingStatus === "results-back" && !booking.cancelled) {
    return {
      title: "Doctor review required",
      body: "Abnormal results hold the booking at Results until the doctor reviews and reports them in Labs.",
      icon: WarningIcon,
      tone: "danger",
    };
  }

  if (booking.cancelled) {
    return { ...nextCard, icon: WarningIcon, tone: "danger" };
  }

  if (booking.bookingStatus === "scheduled") {
    return { ...nextCard, icon: ClockIcon, tone: "warning" };
  }

  if (booking.bookingStatus === "in-progress") {
    return { ...nextCard, icon: TubeIcon, tone: "brand" };
  }

  if (booking.bookingStatus === "results-back") {
    return { ...nextCard, icon: CheckCircleIcon, tone: "success" };
  }

  return { ...nextCard, icon: InfoIcon, tone: "neutral" };
}

function getMinimalNextStepCard(booking: BookingListItem, card: BookingStatusCardCopy): BookingStatusCardCopy {
  if (booking.cancelled || booking.bookingStatus !== "scheduled") {
    return { ...card, body: normalizeUiSentence(card.body) };
  }

  if (booking.route === "psc") {
    return {
      ...card,
      title: booking.patientAssurance === "provisional" ? "Identity check at visit" : "Waiting for visit",
      body: "No visit logged yet.",
    };
  }

  if (booking.handoverCode) {
    return {
      ...card,
      title: "Hand tubes to courier",
      body: "Use the handover code below.",
    };
  }

  return {
    ...card,
    title: "Leave tubes at reception",
    body: "Kura will pick them up.",
  };
}

function getStatusCardPayment(booking: BookingListItem): string {
  const payment = getPaymentSummary(booking);
  if (booking.route === "psc" && payment === "Pay at PSC") return "At visit";
  return payment;
}

/* The next-step card carries only the LOGISTICS a doctor needs to act on the step
   (route plan + courier handover code). Money moved to the Tests footer so the
   guidance card stops mixing "what to do next" with "what was paid". */
function getStatusCardFacts(
  booking: BookingListItem,
  collection: { label: string; detail: string | null },
): BookingStatusFact[] {
  if (booking.route === "psc") return [];

  const handoff = getHandoffFact(booking);
  return [
    { label: "Plan", value: collection.label },
    { label: handoff.label, value: handoff.value, mono: true },
  ];
}

function BookingStatusCard({
  booking,
  card,
  collection,
  note,
}: {
  booking: BookingListItem;
  card: BookingStatusCardCopy;
  collection: { label: string; detail: string | null };
  note: string | null;
}) {
  const Icon = card.icon;
  const nextStep = getMinimalNextStepCard(booking, card);
  const facts = getStatusCardFacts(booking, collection);

  return (
    <section className={cx("booking-status-card", `tone-${card.tone}`)} aria-labelledby="booking-current-status-title">
      <div className="booking-status-card-main">
        <span aria-hidden className="booking-status-card-ic">
          <Icon size={15} variant="bulk" />
        </span>
        <div className="booking-status-card-copy">
          <span className="booking-status-card-kicker">Next step</span>
          <strong id="booking-current-status-title">{nextStep.title}</strong>
          <span>{nextStep.body}</span>
          {note && (
            <span className="booking-status-card-note" role="status">
              {note}
            </span>
          )}
        </div>
      </div>
      {facts.length > 0 && (
        <dl className="booking-status-facts" aria-label="Collection plan">
          {facts.map((fact) => (
            <div key={fact.label}>
              <dt>{fact.label}</dt>
              <dd>
                <strong className={fact.mono ? "booking-status-code" : undefined}>{fact.value}</strong>
              </dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}

/* Drawer progress mirrors the calendar visit track: a vertical spine with one
   lifecycle step per row and the live booking detail as quiet secondary copy. */
function BookingTimeline({ booking }: { booking: BookingListItem }) {
  const rows = getTimelineRows(booking);
  const firstPendingIndex = rows.findIndex((row) => row.state === "muted");
  const visibleRows =
    firstPendingIndex === -1 ? rows : rows.filter((row, index) => row.state !== "muted" || index === firstPendingIndex);

  return (
    <ol className="booking-timeline" aria-label="Booking progress">
      {visibleRows.map((row) => {
        const StepIcon =
          row.state === "done"
            ? CheckCircleIcon
            : row.label === "Sample at lab" || row.label === "Results back"
              ? FlaskIcon
              : row.label === "Report sent"
                ? ShareIcon
                : ClockIcon;

        return (
          <li
            className={cx(
              "booking-timeline-step",
              row.state === "done" && "is-done",
              row.state === "current" && "is-active",
              row.state === "muted" && "is-muted",
            )}
            key={row.label}
          >
            <span aria-hidden className="booking-timeline-ic">
              <StepIcon size={12} variant="stroke" />
            </span>
            <span className="booking-timeline-copy">
              <strong className="booking-timeline-label">{row.label}</strong>
              <span className="booking-timeline-value">{row.value}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

const BOOKINGS_PAGE_SIZE = 8;
const BOOKING_PANEL_TEST_LIMIT = 6;

function BookingSearchInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="search-input table-search-input booking-search-input">
      <span aria-hidden className="table-search-icon">
        <SearchIcon size={24} variant="stroke" />
      </span>
      <input
        aria-label="Search bookings"
        autoComplete="off"
        className="search-input-field"
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search code, patient, MRN, or test"
        spellCheck={false}
        type="search"
        value={value}
      />
      {value.trim() ? (
        <button aria-label="Clear booking search" className="table-search-clear" onClick={() => onChange("")} type="button">
          <CloseIcon size={14} variant="stroke" />
        </button>
      ) : null}
    </div>
  );
}

function BookingDetailContent({
  booking,
  note,
}: {
  booking: BookingListItem;
  note: string | null;
}) {
  const collection = getCollectionPlan(booking);
  const nextCard = getBookingNextStepCard(booking);
  const statusCard = getBookingStatusCard(booking, nextCard);
  const resultsBack = booking.bookingStatus === "results-back" && !booking.cancelled;
  const showLineStatus = resultsBack;
  /* Disclosure resets per booking because the panel keys this component on
     booking.code (see BookingDetailPanel), so it remounts on selection change. */
  const [showAllTests, setShowAllTests] = useState(false);

  const visibleLines = showAllTests ? booking.lines : booking.lines.slice(0, BOOKING_PANEL_TEST_LIMIT);
  const hiddenLineCount = Math.max(0, booking.lines.length - BOOKING_PANEL_TEST_LIMIT);

  return (
    <div className="booking-detail">
      <BookingStatusCard booking={booking} card={statusCard} collection={collection} note={note} />

      <section className="booking-detail-section" aria-label="Ordered tests and payment">
        <div className={cx("booking-tests-card", showLineStatus ? "is-resulted" : "is-pending")}>
          <div className="booking-tests-card-head">
            <span>Tests</span>
            <strong>
              {booking.lines.length} {booking.lines.length === 1 ? "test" : "tests"}
            </strong>
          </div>
          <ul className="booking-tests-list">
            {visibleLines.map((line) => {
              const result = getLineResult(booking, line);
              const resultIcon =
                result?.tone === "success" ? (
                  <CheckCircleIcon size={13} variant="stroke" />
                ) : result?.tone === "neutral" ? (
                  <InfoIcon size={13} variant="stroke" />
                ) : (
                  <WarningIcon size={13} variant="stroke" />
                );
              return (
                <li key={line.lineId} className="booking-tests-row">
                  <span className="booking-tests-name">
                    <strong>{line.displayName}</strong>
                  </span>
                  {showLineStatus && (
                    <span className="booking-tests-status">
                      <Badge icon={resultIcon} tone={result?.tone ?? "neutral"}>
                        {result?.label ?? "Result in"}
                      </Badge>
                    </span>
                  )}
                  <span className="booking-tests-num">
                    <strong>{line.price === null ? "$--" : formatMoney(line.price)}</strong>
                  </span>
                </li>
              );
            })}
            {hiddenLineCount > 0 && (
              <li className="booking-tests-more">
                <button
                  type="button"
                  className="booking-tests-more-btn"
                  aria-expanded={showAllTests}
                  onClick={() => setShowAllTests((open) => !open)}
                >
                  {showAllTests ? "Show fewer tests" : `Show ${hiddenLineCount} more tests`}
                </button>
              </li>
            )}
          </ul>
          <div className="booking-tests-foot">
            <div className="booking-tests-foot-row booking-tests-foot-total">
              <span>Total</span>
              <strong>{formatMoney(booking.total)}</strong>
            </div>
            <div className="booking-tests-foot-row">
              <span>Payment</span>
              <strong>{getStatusCardPayment(booking)}</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="booking-detail-section booking-progress" aria-label="Booking progress">
        <h3 className="booking-section-label">Progress</h3>
        <BookingTimeline booking={booking} />
      </section>

      <section className="booking-actions-panel" aria-label="Booking actions">
        <BookingActions order={booking} showDemoControls={false} />
      </section>
    </div>
  );
}

function BookingDetailPanel({
  booking,
  note,
  onOpenPatient,
  onReviewLabs,
}: {
  booking: BookingListItem | null;
  note: string | null;
  onOpenPatient: (patientId: string) => void;
  onReviewLabs: (patientId: string, bookingCode: string) => void;
}) {
  if (!booking) {
    return (
      <aside className="booking-detail-panel" aria-label="Booking detail">
        <p className="bookings-next-empty">No booking in this view.</p>
      </aside>
    );
  }

  const anchor = getBookingAnchor(booking);
  const resultsBack = booking.bookingStatus === "results-back" && !booking.cancelled;
  const provisional = booking.patientAssurance === "provisional";
  const nextStep = getBookingNextStepCard(booking);
  /* The panel content swaps in place on row click; a polite live region names the
     new booking so the change is not silent to screen readers. */
  const liveSummary = `Showing ${anchor} for ${booking.patientName}. ${nextStep.title}${
    provisional ? ". Provisional identity" : ""
  }.`;

  return (
    <aside className="booking-detail-panel" aria-label="Booking detail">
      <span className="booking-sr-live" role="status" aria-live="polite">
        {liveSummary}
      </span>
      <header className="booking-detail-panel-head">
        <div className="booking-detail-panel-head-main">
          <div className="booking-detail-panel-title">
            <h2 tabIndex={-1}>{booking.patientName}</h2>
            {provisional && <Badge tone="neutral">Provisional ID</Badge>}
          </div>
          <span className="booking-code-ref">
            {anchor} · {booking.mrn} · {getCollectionRoute(booking)}
          </span>
        </div>
        {resultsBack ? (
          <Button
            intent="primary"
            leadingIcon={<FlaskIcon size={14} variant="stroke" />}
            onClick={() => onReviewLabs(booking.patientId, anchor)}
            size="sm"
          >
            Review results
          </Button>
        ) : (
          <Button
            intent="outline"
            leadingIcon={<PatientIcon size={14} variant="stroke" />}
            onClick={() => onOpenPatient(booking.patientId)}
            size="sm"
          >
            Open chart
          </Button>
        )}
      </header>
      <div className="booking-detail-panel-body">
        <BookingDetailContent key={booking.code} booking={booking} note={note} />
      </div>
    </aside>
  );
}

export function BookingsWorkspace({ focus, onOpenPatient, onReviewLabs, composerOpen, composerSeed, onComposerClose }: BookingsWorkspaceProps) {
  const { allBookings } = useOrderDraft();
  const [workspaceState] = useState<WorkspaceState>("ready");
  const [activeScope, setActiveScope] = useState<BookingScopeId>("today");
  const [activeWorkFilter, setActiveWorkFilter] = useState<BookingWorkFilterId>("all-active");
  const [bookingQuery, setBookingQuery] = useState("");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const listRef = useRef<HTMLDivElement>(null);
  const [pageSize, setPageSize] = useState(BOOKINGS_PAGE_SIZE);
  const hasBookingQuery = bookingQuery.trim().length > 0;

  const filteredBookings = useMemo(
    () =>
      sortBookingsForQueue(
        allBookings.filter(
          (booking) =>
            (hasBookingQuery || (matchesScope(booking, activeScope) && matchesWorkFilter(booking, activeWorkFilter))) &&
            matchesBookingQuery(booking, bookingQuery),
        ),
      ),
    [activeScope, activeWorkFilter, allBookings, bookingQuery, hasBookingQuery],
  );

  /* Table selection feeds the separated next-action panel. The drawer is opened
     only from an explicit Details/action intent or an external focused booking. */
  const selectedBooking = useMemo(() => {
    return findBookingByKey(allBookings, selectedKey);
  }, [allBookings, selectedKey]);

  /* Search focus is an external navigation handoff from the global command
     palette, so this effect intentionally synchronizes local drawer state. */
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!focus) return;
    /* Lane handoff (Home KPI / needs-attention card) — apply the filter/scope so
       the list narrows to exactly the bucket the doctor clicked. */
    if (focus.filter || focus.scope) {
      setActiveScope(focus.scope ?? "all");
      setActiveWorkFilter(focus.filter ?? "all-active");
    }
    /* Specific-booking handoff (search / Home lab-activity row) — widen so the
       row is always visible, then select it. */
    if (focus.code) {
      const match = allBookings.find((booking) => bookingMatchesCode(booking, focus.code!));
      if (!match) return;
      if (!focus.filter && !focus.scope) {
        setActiveScope("all");
        setActiveWorkFilter("all-active");
      }
      const matchKey = getBookingRowKey(match);
      setSelectedKey(matchKey);
      setNote(`Opened ${getBookingAnchor(match)}`);
    }
  }, [allBookings, focus]);

  useEffect(() => {
    setNote(null);
  }, [selectedBooking?.code]);

  useEffect(() => {
    setPage(1);
  }, [activeScope, activeWorkFilter]);

  // Size each page to the rows that fit the viewport without scrolling.
  // Anchored to the list's top, so changing pageSize never moves the
  // measurement point — no feedback loop. Recomputed on mount and resize.
  useEffect(() => {
    const measure = () => {
      const node = listRef.current;
      if (!node) return;
      const top = node.getBoundingClientRect().top;
      const ROW_HEIGHT = 52;
      const HEAD_HEIGHT = 36;
      const FOOTER_RESERVE = 48; // pagination row + table gap + bottom breathing room
      const available = window.innerHeight - top - HEAD_HEIGHT - FOOTER_RESERVE;
      const fit = Math.floor(available / ROW_HEIGHT);
      setPageSize(Math.max(5, Math.min(fit, 40)));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (workspaceState !== "ready") {
    return <BookingAccessState state={workspaceState} />;
  }

  /* New booking wizard replaces the queue in place; placing returns to the
     drawer for the new booking, and Back to bookings returns to the queue. */
  if (composerOpen) {
    return (
      <section className="patient-workspace bookings-workspace" aria-label="New booking">
        <BookingComposer
          key={composerSeed?.key ?? "new-booking"}
          initialItemIds={composerSeed?.itemIds ?? []}
          initialPatient={composerSeed?.patient ?? null}
          initialIdentityDecision={composerSeed?.identityDecision ?? null}
          initialPatientAssurance={composerSeed?.patientAssurance ?? null}
          onClose={onComposerClose}
          onOpenPatient={onOpenPatient}
          onOpenBooking={(code) => {
            onComposerClose();
            const match = allBookings.find((booking) => bookingMatchesCode(booking, code));
            const nextKey = match ? getBookingRowKey(match) : code;
            setSelectedKey(nextKey);
          }}
        />
      </section>
    );
  }

  const updateBookingQuery = (value: string) => {
    setBookingQuery(value);
    setPage(1);
  };

  const scopeCounts = bookingScopeIds.reduce(
    (acc, scope) => ({ ...acc, [scope]: allBookings.filter((booking) => matchesScope(booking, scope)).length }),
    {} as Record<BookingScopeId, number>,
  );
  const scopedBookings = allBookings.filter((booking) => matchesScope(booking, activeScope));
  const workCounts = bookingWorkFilterIds.reduce(
    (acc, filter) => ({ ...acc, [filter]: scopedBookings.filter((booking) => matchesWorkFilter(booking, filter)).length }),
    {} as Record<BookingWorkFilterId, number>,
  );
  const totalBookings = filteredBookings.length;
  const totalPages = Math.max(1, Math.ceil(totalBookings / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const pageBookings = filteredBookings.slice(pageStart, pageStart + pageSize);
  const selectedKeyValue = selectedBooking ? getBookingRowKey(selectedBooking) : null;
  /* Keep the explicitly-selected booking open across PAGINATION (it just moved to
     another page), but re-default to the top when it falls out of the active
     filter/scope/search. Prevents the panel silently swapping under the doctor. */
  const selectedInFilter =
    selectedBooking !== null && filteredBookings.some((booking) => getBookingRowKey(booking) === selectedKeyValue);
  const selectedIsVisible =
    selectedBooking !== null && pageBookings.some((booking) => getBookingRowKey(booking) === selectedKeyValue);
  const activeBooking = selectedInFilter ? selectedBooking : (pageBookings[0] ?? null);
  const activeBookingKey = activeBooking ? getBookingRowKey(activeBooking) : null;
  const activeNote = activeBooking && selectedIsVisible ? note : null;

  return (
    <>
      <BookingSearchInput value={bookingQuery} onChange={updateBookingQuery} />
      <div className="bookings-toolbar" aria-label="Booking filters">
        <div className="bookings-filter-chips">
          <div className="bookings-filter-cluster bookings-scope-cluster" role="group" aria-label="Time period">
            <div className="bookings-filter-group">
              {bookingScopeIds.map((scope) => (
                <button
                  aria-pressed={activeScope === scope}
                  className={cx("status-chip tone-neutral", activeScope === scope && "active")}
                  key={scope}
                  onClick={() => setActiveScope(scope)}
                  type="button"
                >
                  <span>{scopeLabels[scope]}</span>
                  <span className="chip-count">{scopeCounts[scope]}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="bookings-filter-cluster bookings-work-cluster" role="group" aria-label="Booking status">
            <div className="bookings-filter-group bookings-status-filter-rail">
              {visibleBookingWorkFilterIds.map((filter) => (
                <button
                  aria-pressed={activeWorkFilter === filter}
                  className={cx(
                    "status-chip",
                    `tone-${getBookingWorkFilterTone(filter)}`,
                    activeWorkFilter === filter && "active",
                  )}
                  key={filter}
                  onClick={() => setActiveWorkFilter(activeWorkFilter === filter ? "all-active" : filter)}
                  type="button"
                >
                  <span>{workFilterLabels[filter]}</span>
                  <span className="chip-count">{workCounts[filter]}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="bookings-workarea" role="region" aria-label="Bookings">
        <div className="bookings-table-shell">
          <div className="bookings-table patient-table patient-roster" ref={listRef} aria-label="Bookings">
            <div className="table-row table-head bookings-table-row" role="presentation">
              <span className="table-cell">Booking</span>
              <span className="table-cell">Patient</span>
              <span className="table-cell">Tests</span>
              <span className="table-cell">Status</span>
            </div>
            {pageBookings.length === 0 ? (
              <div className="bookings-master-empty">
                {hasBookingQuery ? (
                  <>
                    <strong>No booking found</strong>
                    <span>Try a code, patient name, MRN, or test.</span>
                  </>
                ) : (
                  <>
                    <strong>{workEmptyCopy[activeWorkFilter].title}</strong>
                    <span>{workEmptyCopy[activeWorkFilter].body}</span>
                  </>
                )}
              </div>
            ) : (
              pageBookings.map((booking) => {
                const anchor = getBookingAnchor(booking);
                const needsYou = bookingHasDoctorAction(booking);
                const testsLine = getBookingTestsLine(booking);
                const bookingKey = getBookingRowKey(booking);
                const isSelected = activeBookingKey === bookingKey;
                const lifecycleLabel = getConciseBookingNextLabel(getBookingLifecycle(booking).label);
                return (
                  <button
                    /* Full status + test list in the name so screen-reader users get
                       what the visual ellipsis hides. aria-current expresses single
                       selection (one row open in the panel), not a toggle. */
                    aria-label={`${booking.patientName}, booking ${anchor}. ${needsYou ? "Needs you. " : ""}${lifecycleLabel}. Tests: ${testsLine}`}
                    aria-current={isSelected ? "true" : undefined}
                    className={cx(
                      "patient-table-row table-row bookings-table-row",
                      isSelected && "is-selected",
                      needsYou && "is-flagged",
                    )}
                    key={bookingKey}
                    onClick={() => setSelectedKey(bookingKey)}
                    type="button"
                  >
                    <span className="table-cell booking-anchor-cell">
                      <strong>{anchor}</strong>
                    </span>
                    <span className="table-cell patient-cell">
                      <Avatar name={booking.patientName} size="sm" />
                      <span className="booking-patient-name">{booking.patientName}</span>
                    </span>
                    <span className="table-cell booking-order-cell" title={testsLine} aria-hidden="true">
                      <span className="booking-order-text">{testsLine}</span>
                    </span>
                    <BookingStateCell booking={booking} />
                  </button>
                );
              })
            )}
          </div>
          <Pagination
            currentPage={safePage}
            itemName="bookings"
            onPageChange={setPage}
            pageSize={pageSize}
            summaryMode="visible"
            totalItems={totalBookings}
          />
        </div>

        <BookingDetailPanel
          booking={activeBooking}
          note={activeNote}
          onOpenPatient={onOpenPatient}
          onReviewLabs={onReviewLabs}
        />
      </div>
    </>
  );
}
