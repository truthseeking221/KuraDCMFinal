"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Avatar, Badge, Button, Drawer } from "@/components/ui";
import type { BadgeTone } from "@/components/ui";
import { Pagination } from "@/components/pagination";
import {
  Bell as BellIcon,
  CheckCircle as CheckCircleIcon,
  ChevronRight as ChevronRightIcon,
  Close as CloseIcon,
  Clock as ClockIcon,
  CreditCard as CreditCardIcon,
  Flask as FlaskIcon,
  Info as InfoIcon,
  Lock as LockIcon,
  Patient as PatientIcon,
  Pin as PinIcon,
  Receipt as ReceiptIcon,
  Scan as ScanIcon,
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
  getDoctorAction,
  getDoctorActionLabel,
  getLockReason,
  getOrderSummary,
  getPaymentSummary,
  isBookingAwaitingVisit,
} from "@/components/OrderDraft/bookingShared";
import type { BookingListItem, OrderDraftLine, PlacedOrderSummary } from "@/components/OrderDraft/types";
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
  composerSeed?: { key: number; itemIds: string[]; patient?: BookingPatient | null } | null;
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

function getEditPolicy(order: PlacedOrderSummary): string {
  if (order.cancelled) return "Tests cannot be changed. Booking cancelled.";
  if (order.bookingStatus === "results-back") return "Tests cannot be changed. Results are back.";
  return "Tests can be changed until results are back.";
}

function getResendPolicy(order: PlacedOrderSummary): string {
  if (order.route !== "psc") return "No patient slip is needed for clinic draw.";
  if (order.cancelled) return "Slip cannot be sent. Booking cancelled.";
  if (order.bookingStatus === "results-back") return "Slip cannot be sent. Results are back.";
  return "Slip can be sent again by Telegram and SMS.";
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
  return resultFixtures[line.itemId ?? line.lineId] ?? { label: "Result back", tone: "success" };
}

function getTimelineRows(order: BookingListItem): Array<{ label: string; value: string; state: "done" | "current" | "muted" }> {
  const resultsBack = order.bookingStatus === "results-back";
  const awaitingVisit = isBookingAwaitingVisit(order);
  const sampleDone = resultsBack || (order.bookingStatus === "in-progress" && !awaitingVisit);
  return [
    { label: "Booking created", value: order.placedAt ?? "Today", state: order.cancelled ? "muted" : "done" },
    {
      label: order.route === "psc" ? "Code sent" : "Scheduled",
      value: order.route === "psc" ? "Code sent" : (order.sweep ?? order.handoverCode ?? "Tubes to Kura"),
      state: order.cancelled ? "muted" : order.bookingStatus === "scheduled" ? "current" : "done",
    },
    {
      label: "Sample at lab",
      value: awaitingVisit ? "No PSC visit yet" : sampleDone ? (order.route === "psc" ? "Collected at PSC" : "Tubes received") : "Not collected",
      state: order.cancelled ? "muted" : order.bookingStatus === "in-progress" ? "current" : sampleDone ? "done" : "muted",
    },
    {
      label: "Results back",
      value: resultsBack ? (order.flagged ? "Needs review" : "Ready to send") : "Waiting",
      state: order.cancelled ? "muted" : resultsBack ? "done" : "muted",
    },
    {
      label: "Report sent",
      value: resultsBack && !order.flagged ? "Sent" : order.flagged ? "Needs review" : "Not sent yet",
      state: order.cancelled ? "muted" : resultsBack && !order.flagged ? "done" : order.flagged ? "current" : "muted",
    },
  ];
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

function BookingStatusCard({ card, note }: { card: BookingStatusCardCopy; note: string | null }) {
  const Icon = card.icon;

  return (
    <section className={cx("booking-status-card", `tone-${card.tone}`)} aria-labelledby="booking-current-status-title">
      <span aria-hidden className="booking-status-card-ic">
        <Icon size={15} variant="bulk" />
      </span>
      <div className="booking-status-card-copy">
        <strong id="booking-current-status-title">{card.title}</strong>
        <span>{card.body}</span>
        {note && (
          <span className="booking-status-card-note" role="status">
            {note}
          </span>
        )}
      </div>
    </section>
  );
}

/* Compact progress list for the drawer — one row per lifecycle stage, label left
   and its current value right. Tone marks the current stage; done/upcoming stay
   quiet. The expanded "where is it now?" copy sits above this in BookingStatusCard. */
function BookingTimeline({ booking }: { booking: BookingListItem }) {
  const rows = getTimelineRows(booking);
  return (
    <ol className="booking-timeline" aria-label="Booking progress">
      {rows.map((row) => (
        <li
          className={cx(row.state === "current" && "is-current", row.state === "muted" && "is-muted")}
          key={row.label}
        >
          <strong>{row.label}</strong>
          <span>{row.value}</span>
        </li>
      ))}
    </ol>
  );
}

const BOOKINGS_PAGE_SIZE = 8;

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

/* Booking detail — a right slide-over Drawer holding the full record: patient
   handoff, quick facts, current-status card, ordered tests, progress timeline,
   payment + policy, PSC instructions, and the lifecycle actions. Every business
   rule the old detail pane carried lives here; the master is now a flat table. */
function BookingDetailDrawer({
  booking,
  note,
  onClose,
  onOpenPatient,
  onReviewLabs,
}: {
  booking: BookingListItem;
  note: string | null;
  onClose: () => void;
  onOpenPatient: (patientId: string) => void;
  onReviewLabs: (patientId: string, bookingCode: string) => void;
}) {
  const lifecycle = getBookingLifecycle(booking);
  const action = getDoctorAction(booking);
  const collection = getCollectionPlan(booking);
  const nextCard = getBookingNextStepCard(booking);
  const statusCard = getBookingStatusCard(booking, nextCard);
  const anchor = getBookingAnchor(booking);
  const resultsBack = booking.bookingStatus === "results-back" && !booking.cancelled;

  return (
    <Drawer
      className="booking-detail-drawer"
      open
      onClose={onClose}
      width={520}
      title={
        <span className="booking-detail-drawer-title">
          {booking.patientName}
          <Badge icon={<lifecycle.Icon size={13} variant="stroke" />} tone={lifecycle.tone}>
            {lifecycle.label}
          </Badge>
        </span>
      }
      subtitle={<span className="booking-code-ref">{anchor}</span>}
      footer={
        resultsBack ? (
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
            intent="primary"
            leadingIcon={<PatientIcon size={14} variant="stroke" />}
            onClick={() => onOpenPatient(booking.patientId)}
            size="sm"
          >
            Open chart
          </Button>
        )
      }
    >
      <div className="booking-detail">
        <div className="booking-detail-overview">
          <button className="booking-detail-patient" onClick={() => onOpenPatient(booking.patientId)} type="button">
            <Avatar name={booking.patientName} size="sm" />
            <span className="booking-detail-patient-copy">
              <strong>{booking.patientName}</strong>
              <small>
                {booking.mrn} · {getCollectionRoute(booking)}
              </small>
            </span>
            <span aria-hidden className="booking-detail-patient-go">
              <ChevronRightIcon size={16} variant="stroke" />
            </span>
          </button>
          <div className="booking-tracking-grid">
            <div>
              <span>Visit plan</span>
              <strong>{collection.label}</strong>
            </div>
            <div>
              <span>Total</span>
              <strong>{formatMoney(booking.total)}</strong>
            </div>
            <div>
              <span>Doctor action</span>
              <strong>{action.title}</strong>
            </div>
          </div>
        </div>

        <BookingStatusCard card={statusCard} note={note} />

        <section className="booking-detail-section" aria-label="Ordered tests">
          <table className="booking-tests-table">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col" className="booking-tests-status-h">
                  Status
                </th>
                <th scope="col" className="booking-tests-num">
                  Price
                </th>
              </tr>
            </thead>
            <tbody>
              {booking.lines.map((line) => {
                const result = getLineResult(booking, line);
                return (
                  <tr key={line.lineId}>
                    <td className="booking-tests-name">{line.displayName}</td>
                    <td className="booking-tests-status">
                      <Badge
                        icon={
                          result ? (
                            result.tone === "success" ? (
                              <CheckCircleIcon size={13} variant="stroke" />
                            ) : (
                              <WarningIcon size={13} variant="stroke" />
                            )
                          ) : (
                            <ClockIcon size={13} variant="stroke" />
                          )
                        }
                        tone={result?.tone ?? "neutral"}
                      >
                        {result
                          ? result.label
                          : booking.bookingStatus === "in-progress" && !isBookingAwaitingVisit(booking)
                            ? "Waiting for result"
                            : "Waiting for sample"}
                      </Badge>
                    </td>
                    <td className="booking-tests-num">
                      <strong>{line.price === null ? "$--" : formatMoney(line.price)}</strong>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        <section className="booking-meta" aria-label="Progress and policy">
          <div className="booking-meta-group">
            <h3>Progress</h3>
            <BookingTimeline booking={booking} />
          </div>
          <div className="booking-meta-group">
            <h3>Payment</h3>
            <div className="booking-policy-lines">
              <span>
                <ReceiptIcon size={13} variant="stroke" />
                {getPaymentSummary(booking)}
              </span>
              <span>
                <CreditCardIcon size={13} variant="stroke" />
                {booking.route === "clinic" ? "Claim submits after results are closed." : "PSC confirms payment at collection."}
              </span>
            </div>
          </div>
          <div className="booking-meta-group">
            <h3>What you can still do</h3>
            <div className="booking-policy-lines">
              <span>
                <LockIcon size={13} variant="stroke" />
                {getEditPolicy(booking)}
              </span>
              <span>
                <CreditCardIcon size={13} variant="stroke" />
                {getLockReason(booking) ?? "Cancel before payment or collection."}
              </span>
              <span>
                <ShareIcon size={13} variant="stroke" />
                {getResendPolicy(booking)}
              </span>
            </div>
          </div>
        </section>

        <section className="booking-handoff" aria-label="Patient instructions">
          <div className="booking-handoff-row">
            {booking.route === "psc" ? <PinIcon size={16} variant="stroke" /> : <ScanIcon size={16} variant="stroke" />}
            <span>
              <strong>{booking.route === "psc" ? "PSC code" : "Pickup code"}</strong>
              <small>
                {booking.route === "psc"
                  ? (booking.bookingCode ?? anchor)
                  : (booking.handoverCode ?? booking.sweep ?? "Next sweep")}
              </small>
            </span>
          </div>
          {!booking.cancelled && booking.route === "psc" && booking.bookingStatus !== "results-back" && (
            <div className="booking-handoff-row">
              <BellIcon size={16} variant="stroke" />
              <span>
                <strong>Reminder goes by</strong>
                <small>Telegram and SMS</small>
              </span>
            </div>
          )}
        </section>

        <section className="booking-actions-panel" aria-label="Booking actions">
          <BookingActions order={booking} showDemoControls={false} />
        </section>
      </div>
    </Drawer>
  );
}

export function BookingsWorkspace({ focus, onOpenPatient, onReviewLabs, composerOpen, composerSeed, onComposerClose }: BookingsWorkspaceProps) {
  const { allBookings } = useOrderDraft();
  const [workspaceState] = useState<WorkspaceState>("ready");
  const [activeScope, setActiveScope] = useState<BookingScopeId>("today");
  const [activeWorkFilter, setActiveWorkFilter] = useState<BookingWorkFilterId>("all-active");
  const [bookingQuery, setBookingQuery] = useState("");
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
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

  /* Table + drawer: the detail Drawer opens only for an explicitly clicked (or
     handoff-targeted) booking — no auto-select of the first row. Derived from
     selectedCode so closing the drawer (selectedCode = null) needs no effect. */
  const selectedBooking = useMemo(() => {
    if (!selectedCode) return null;
    return allBookings.find((booking) => booking.code === selectedCode || bookingMatchesCode(booking, selectedCode)) ?? null;
  }, [allBookings, selectedCode]);

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
      setSelectedCode(match.code);
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
      const ROW_HEIGHT = 56;
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
          onClose={onComposerClose}
          onOpenPatient={onOpenPatient}
          onOpenBooking={(code) => {
            onComposerClose();
            setSelectedCode(code);
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

  return (
    <section className="patient-workspace bookings-workspace" aria-label="Bookings">
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
              {bookingWorkFilterIds.map((filter) => (
                <button
                  aria-pressed={activeWorkFilter === filter}
                  className={cx(
                    "status-chip",
                    `tone-${getBookingWorkFilterTone(filter)}`,
                    activeWorkFilter === filter && "active",
                  )}
                  key={filter}
                  onClick={() => setActiveWorkFilter(filter)}
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

      <div className="bookings-table patient-table patient-roster" ref={listRef} aria-label="Bookings">
        <div className="table-row table-head bookings-table-row">
          <span className="table-cell">Code</span>
          <span className="table-cell">Patient</span>
          <span className="table-cell">Tests</span>
          <span className="table-cell">Route</span>
          <span className="table-cell">Status</span>
          <span className="table-cell">Needs you</span>
          <span className="table-cell booking-when-head">When</span>
          <span aria-hidden className="table-cell booking-row-action-head" />
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
            const lifecycle = getBookingLifecycle(booking);
            const doctorAction = getDoctorActionLabel(booking);
            const anchor = getBookingAnchor(booking);
            const needsYou = bookingHasDoctorAction(booking);
            return (
              <button
                aria-label={`Open booking ${anchor} for ${booking.patientName}`}
                aria-pressed={selectedBooking?.code === booking.code}
                className={cx(
                  "patient-table-row table-row bookings-table-row",
                  selectedBooking?.code === booking.code && "is-selected",
                  needsYou && "is-flagged",
                )}
                key={`${booking.patientId}-${booking.code}`}
                onClick={() => setSelectedCode(booking.code)}
                type="button"
              >
                <span className="table-cell booking-anchor-cell">
                  <strong>{anchor}</strong>
                </span>
                <span className="table-cell patient-cell">
                  <Avatar name={booking.patientName} size="sm" />
                  <span className="booking-patient-name">{booking.patientName}</span>
                </span>
                <span className="table-cell booking-order-cell">{getOrderSummary(booking)}</span>
                <span className="table-cell booking-collection-cell">{getCollectionRoute(booking)}</span>
                <span className="table-cell booking-status-cell">
                  <Badge icon={<lifecycle.Icon size={12} variant="stroke" />} tone={lifecycle.tone}>
                    {lifecycle.label}
                  </Badge>
                </span>
                <span className="table-cell booking-action-cell">
                  <span className={cx("booking-doctor-action", needsYou && "is-active")}>{doctorAction}</span>
                </span>
                <span className="table-cell booking-when-cell">
                  <strong>{getBookingTime(booking)}</strong>
                </span>
                <span aria-hidden className="table-cell row-chevron">
                  <ChevronRightIcon size={16} variant="stroke" />
                </span>
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

      {selectedBooking && (
        <BookingDetailDrawer
          booking={selectedBooking}
          note={note}
          onClose={() => setSelectedCode(null)}
          onOpenPatient={onOpenPatient}
          onReviewLabs={onReviewLabs}
        />
      )}
    </section>
  );
}
