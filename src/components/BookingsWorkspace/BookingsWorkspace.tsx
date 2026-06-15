"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Chip, Drawer, Search } from "@/components/ui";
import type { BadgeTone } from "@/components/ui";
import {
  Bell as BellIcon,
  CheckCircle as CheckCircleIcon,
  Clock as ClockIcon,
  CreditCard as CreditCardIcon,
  Flask as FlaskIcon,
  Info as InfoIcon,
  Lock as LockIcon,
  Patient as PatientIcon,
  Pin as PinIcon,
  Plus as PlusIcon,
  Receipt as ReceiptIcon,
  Scan as ScanIcon,
  Share as ShareIcon,
  Tube as TubeIcon,
  Warning as WarningIcon,
} from "@/icons/components";
import { cx } from "@/lib/cx";
import { formatMoney } from "@/components/OrderDraft/catalog";
import { useOrderDraft } from "@/components/OrderDraft/OrderDraftContext";
import {
  BookingActions,
  bookingMatchesCode,
  bookingStatusView,
  getBookingEta,
  getBookingAnchor,
  getBookingNextStepCard,
  getBookingTestSummary,
  getLockReason,
  getPaymentSummary,
  getRouteLabel,
  isBookingAwaitingVisit,
} from "@/components/OrderDraft/bookingShared";
import type { BookingListItem, OrderDraftLine, PlacedOrderSummary } from "@/components/OrderDraft/types";
import "./BookingsWorkspace.css";

type BookingFilterId =
  | "all"
  | "today"
  | "scheduled"
  | "awaiting-visit"
  | "in-progress"
  | "results-back"
  | "cancelled";
type WorkspaceState = "ready" | "loading" | "error" | "permission" | "offline" | "read-only";

export type BookingFocus = {
  code: string;
  key: number;
};

export type BookingsWorkspaceProps = {
  focus: BookingFocus | null;
  onNewBooking: () => void;
  onOpenPatient: (patientId: string) => void;
  onReviewLabs: (patientId: string, bookingCode: string) => void;
};

const filterLabels: Record<BookingFilterId, string> = {
  all: "All",
  today: "Today",
  scheduled: "Scheduled",
  "awaiting-visit": "Awaiting visit",
  "in-progress": "In progress",
  "results-back": "Results back",
  cancelled: "Cancelled",
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

function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2);
}

function isTodayBooking(order: PlacedOrderSummary): boolean {
  return normalize(order.placedAt ?? "") === "today" || normalize(order.placedAt ?? "").startsWith("today");
}

function matchesFilter(order: BookingListItem, filter: BookingFilterId): boolean {
  if (filter === "all") return true;
  if (filter === "today") return isTodayBooking(order);
  if (filter === "cancelled") return order.cancelled;
  if (filter === "awaiting-visit") {
    return isBookingAwaitingVisit(order);
  }
  if (filter === "scheduled") return !order.cancelled && order.bookingStatus === "scheduled";
  if (filter === "in-progress") return !order.cancelled && order.bookingStatus === "in-progress";
  return !order.cancelled && order.bookingStatus === "results-back";
}

function matchesQuery(order: BookingListItem, query: string): boolean {
  const token = normalize(query);
  if (!token) return true;
  const status = bookingStatusView(order);
  const haystack = normalize(
    [
      order.patientName,
      order.mrn,
      order.phoneMasked,
      order.code,
      order.bookingCode,
      order.handoverCode,
      getBookingAnchor(order),
      getRouteLabel(order),
      status.label,
      getPaymentSummary(order),
      ...order.lines.flatMap((line) => [line.displayName, line.itemId ?? ""]),
    ]
      .filter(Boolean)
      .join(" "),
  );
  return haystack.includes(token);
}

function statusIcon(order: PlacedOrderSummary) {
  if (order.cancelled) return <InfoIcon size={13} variant="stroke" />;
  if (order.flagged && order.bookingStatus === "results-back") return <WarningIcon size={13} variant="stroke" />;
  if (order.bookingStatus === "results-back") return <CheckCircleIcon size={13} variant="stroke" />;
  if (isBookingAwaitingVisit(order)) return <ClockIcon size={13} variant="stroke" />;
  if (order.bookingStatus === "in-progress") return <TubeIcon size={13} variant="stroke" />;
  return <ClockIcon size={13} variant="stroke" />;
}

function getEditPolicy(order: PlacedOrderSummary): string {
  if (order.cancelled) return "Edit locked · booking cancelled";
  if (order.bookingStatus === "results-back") return "Edit locked · results already back";
  return "Edit tests available until results return";
}

function getResendPolicy(order: PlacedOrderSummary): string {
  if (order.route !== "psc") return "Resend unavailable · clinic draw";
  if (order.cancelled) return "Resend unavailable · booking cancelled";
  if (order.bookingStatus === "results-back") return "Resend unavailable · results already back";
  return "PSC slip can be resent by Telegram + SMS";
}

type TestResultView = {
  value: string;
  reference: string;
  label: string;
  tone: BadgeTone;
};

const resultFixtures: Record<string, TestResultView> = {
  hba1c: { value: "9.4%", reference: "Ref <= 7.0", label: "High", tone: "danger" },
  "lipid-panel": { value: "LDL 162", reference: "Goal < 100", label: "High", tone: "warning" },
  cbc: { value: "Hgb 10.2", reference: "Ref 12-16", label: "Low", tone: "warning" },
  ferritin: { value: "14 ng/mL", reference: "Ref 30-400", label: "Low", tone: "warning" },
  "creatinine-egfr": { value: "eGFR 52", reference: "CKD stage 3", label: "Watch", tone: "warning" },
};

function getLineResult(order: PlacedOrderSummary, line: OrderDraftLine): TestResultView | null {
  if (order.bookingStatus !== "results-back" || order.cancelled) return null;
  return resultFixtures[line.itemId ?? line.lineId] ?? { value: "Back", reference: "See Labs", label: "Result back", tone: "success" };
}

function getTrackingRows(order: BookingListItem): Array<{ label: string; value: string }> {
  if (order.cancelled) {
    return [
      { label: "Booking", value: "Voided" },
      { label: "Payment", value: getPaymentSummary(order) },
      { label: "Recovery", value: order.route === "psc" ? "Patient notified by Telegram + SMS" : "Courier pickup cancelled" },
    ];
  }
  if (order.bookingStatus === "results-back") {
    return [
      { label: "Lab", value: order.flagged ? "Results back · abnormal" : "Results back" },
      { label: "Report", value: order.flagged ? "Held for doctor review" : "Ready to close out" },
      { label: "Billing", value: getPaymentSummary(order) },
    ];
  }
  if (order.route === "psc") {
    return [
      { label: "Slip", value: order.bookingCode ? `${order.bookingCode} · Telegram + SMS` : "Telegram + SMS sent" },
      { label: "PSC", value: isBookingAwaitingVisit(order) ? "No check-in recorded" : "Any Kura PSC · open now" },
      { label: "Payment", value: getPaymentSummary(order) },
    ];
  }
  return [
    { label: order.handoverCode ? "Handoff" : "Sweep", value: order.handoverCode ? `Code ${order.handoverCode}` : (order.sweep ?? "Next clinic sweep") },
    { label: "Specimen", value: order.bookingStatus === "in-progress" ? "Delivered to lab" : "Tubes labelled and ready" },
    { label: "Billing", value: getPaymentSummary(order) },
  ];
}

function getTimelineRows(order: BookingListItem): Array<{ label: string; value: string; state: "done" | "current" | "muted" }> {
  const resultsBack = order.bookingStatus === "results-back";
  const awaitingVisit = isBookingAwaitingVisit(order);
  const sampleDone = resultsBack || (order.bookingStatus === "in-progress" && !awaitingVisit);
  return [
    { label: "Created", value: order.placedAt ?? "Today", state: order.cancelled ? "muted" : "done" },
    {
      label: "Scheduled",
      value: order.route === "psc" ? "Code sent" : (order.sweep ?? order.handoverCode ?? "Clinic draw"),
      state: order.cancelled ? "muted" : order.bookingStatus === "scheduled" ? "current" : "done",
    },
    {
      label: "Sample",
      value: awaitingVisit ? "Awaiting PSC check-in" : sampleDone ? (order.route === "psc" ? "PSC collected" : "Clinic draw collected") : "Not collected yet",
      state: order.cancelled ? "muted" : awaitingVisit || order.bookingStatus === "in-progress" ? "current" : sampleDone ? "done" : "muted",
    },
    {
      label: "Results",
      value: resultsBack ? (order.flagged ? "Back · flagged" : "Back · ready") : "Pending",
      state: order.cancelled ? "muted" : resultsBack ? "done" : "muted",
    },
    {
      label: "Reported",
      value: resultsBack && !order.flagged ? "Closed out" : order.flagged ? "Needs review" : "Not yet",
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

function ProgressStrip({ booking }: { booking: BookingListItem }) {
  const resultsBack = booking.bookingStatus === "results-back";
  const awaitingVisit = isBookingAwaitingVisit(booking);
  const sampleComplete = resultsBack || (booking.bookingStatus === "in-progress" && !awaitingVisit);
  const steps = [
    { id: "created", label: "Created", complete: !booking.cancelled, current: false },
    { id: "scheduled", label: "Scheduled", complete: !booking.cancelled && booking.bookingStatus !== "scheduled", current: !booking.cancelled && booking.bookingStatus === "scheduled" },
    { id: "sample", label: "Sample", complete: sampleComplete, current: !booking.cancelled && (awaitingVisit || (booking.bookingStatus === "in-progress" && !sampleComplete)) },
    { id: "results", label: "Results", complete: resultsBack, current: !booking.cancelled && resultsBack && Boolean(booking.flagged) },
    { id: "reported", label: "Reported", complete: resultsBack && !booking.flagged, current: false },
  ];

  return (
    <ol className="booking-progress" aria-label="Booking progress">
      {steps.map((step) => (
        <li className={cx(step.complete && "is-complete", step.current && "is-current")} key={step.id}>
          <span aria-hidden>{step.complete ? <CheckCircleIcon size={14} variant="stroke" /> : null}</span>
          <strong>{step.label}</strong>
        </li>
      ))}
    </ol>
  );
}

export function BookingsWorkspace({ focus, onNewBooking, onOpenPatient, onReviewLabs }: BookingsWorkspaceProps) {
  const { allBookings } = useOrderDraft();
  const [workspaceState] = useState<WorkspaceState>("ready");
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<BookingFilterId>("all");
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const filteredBookings = useMemo(
    () => allBookings.filter((booking) => matchesFilter(booking, activeFilter) && matchesQuery(booking, query)),
    [activeFilter, allBookings, query],
  );

  const selectedBooking = useMemo(() => {
    if (!selectedCode) return null;
    return allBookings.find((booking) => booking.code === selectedCode || bookingMatchesCode(booking, selectedCode)) ?? null;
  }, [allBookings, selectedCode]);

  /* Search focus is an external navigation handoff from the global command
     palette, so this effect intentionally synchronizes local drawer state. */
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!focus) return;
    const match = allBookings.find((booking) => bookingMatchesCode(booking, focus.code));
    if (!match) return;
    setActiveFilter("all");
    setQuery("");
    setSelectedCode(match.code);
    setNote(`Opened ${getBookingAnchor(match)} from search`);
  }, [allBookings, focus]);

  useEffect(() => {
    setNote(null);
  }, [selectedBooking?.code]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (workspaceState !== "ready") {
    return <BookingAccessState state={workspaceState} />;
  }

  const counts = (Object.keys(filterLabels) as BookingFilterId[]).reduce(
    (acc, filter) => ({ ...acc, [filter]: allBookings.filter((booking) => matchesFilter(booking, filter)).length }),
    {} as Record<BookingFilterId, number>,
  );
  const clinicPickup = allBookings.filter(
    (booking) => !booking.cancelled && booking.route === "clinic" && booking.bookingStatus === "scheduled",
  ).length;
  const flagged = allBookings.filter((booking) => !booking.cancelled && booking.flagged).length;
  const selectedStatus = selectedBooking ? bookingStatusView(selectedBooking) : null;
  const selectedEta = selectedBooking ? getBookingEta(selectedBooking) : null;
  const selectedNextCard = selectedBooking ? getBookingNextStepCard(selectedBooking) : null;
  const selectedTrackingRows = selectedBooking ? getTrackingRows(selectedBooking) : [];
  const selectedTimelineRows = selectedBooking ? getTimelineRows(selectedBooking) : [];

  return (
    <section className="bookings-workspace" aria-labelledby="bookings-title">
      <header className="bookings-header">
        <div>
          <h2 id="bookings-title">Bookings</h2>
          <p>Track lab bookings, samples, and results</p>
        </div>
        <Button intent="primary" leadingIcon={<PlusIcon size={15} variant="stroke" />} onClick={onNewBooking}>
          New booking
        </Button>
      </header>

      <div className="bookings-stats" aria-label="Booking queue summary">
        <div>
          <span>Awaiting visit</span>
          <strong>{counts["awaiting-visit"]}</strong>
        </div>
        <div>
          <span>Clinic pickup</span>
          <strong>{clinicPickup}</strong>
        </div>
        <div>
          <span>Results back</span>
          <strong>{counts["results-back"]}</strong>
        </div>
        <div>
          <span>Flagged</span>
          <strong>{flagged}</strong>
        </div>
      </div>

      <div className="bookings-toolbar">
        <Search
          aria-label="Search bookings"
          containerClassName="bookings-search"
          onChange={(event) => setQuery(event.target.value)}
          onClear={() => setQuery("")}
          placeholder="Search code, patient, MRN, or test..."
          value={query}
        />
        <div className="bookings-filters" aria-label="Filter bookings">
          {(Object.keys(filterLabels) as BookingFilterId[]).map((filter) => (
            <Chip
              count={counts[filter]}
              key={filter}
              onClick={() => setActiveFilter(filter)}
              selected={activeFilter === filter}
              variant="choice"
            >
              {filterLabels[filter]}
            </Chip>
          ))}
        </div>
      </div>

      <div className="bookings-table-wrap">
        <table className="bookings-table">
          <thead>
            <tr>
              <th>Booking</th>
              <th>Patient</th>
              <th>Tests</th>
              <th>Route</th>
              <th>Status</th>
              <th>ETA</th>
              <th>Payment</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredBookings.length === 0 ? (
              <tr>
                <td className="bookings-empty" colSpan={8}>
                  <strong>No matching bookings</strong>
                  <span>Try another code, patient, MRN, or test name.</span>
                </td>
              </tr>
            ) : (
              filteredBookings.map((booking) => {
                const status = bookingStatusView(booking);
                const eta = getBookingEta(booking);
                return (
                  <tr key={`${booking.patientId}-${booking.code}`}>
                    <td>
                      <button
                        className="booking-code-button"
                        onClick={() => setSelectedCode(booking.code)}
                        type="button"
                      >
                        <strong>{getBookingAnchor(booking)}</strong>
                        <span>{booking.code}</span>
                      </button>
                    </td>
                    <td>
                      <div className="booking-patient-cell">
                        <span aria-hidden>{initials(booking.patientName)}</span>
                        <div>
                          <strong>{booking.patientName}</strong>
                          <small>
                            {booking.mrn} · {booking.phoneMasked}
                          </small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="booking-tests">{getBookingTestSummary(booking, 3)}</span>
                    </td>
                    <td>{getRouteLabel(booking)}</td>
                    <td>
                      <Badge icon={statusIcon(booking)} tone={status.tone}>
                        {status.label}
                      </Badge>
                    </td>
                    <td>
                      <span className="booking-eta">
                        <Badge dot tone={eta.tone}>
                          {eta.label}
                        </Badge>
                        <small>{eta.detail}</small>
                      </span>
                    </td>
                    <td>{getPaymentSummary(booking)}</td>
                    <td>
                      <Button
                        intent="ghost"
                        onClick={() => onOpenPatient(booking.patientId)}
                        size="sm"
                        leadingIcon={<PatientIcon size={14} variant="stroke" />}
                      >
                        Open chart
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Drawer
        className="booking-detail-drawer"
        footer={
          selectedBooking ? (
            <>
              <Button
                intent="outline"
                leadingIcon={<PatientIcon size={14} variant="stroke" />}
                onClick={() => onOpenPatient(selectedBooking.patientId)}
                size="sm"
              >
                Open chart
              </Button>
              {selectedBooking.bookingStatus === "results-back" && !selectedBooking.cancelled && (
                <Button
                  intent="primary"
                  leadingIcon={<FlaskIcon size={14} variant="stroke" />}
                  onClick={() => onReviewLabs(selectedBooking.patientId, getBookingAnchor(selectedBooking))}
                  size="sm"
                >
                  Review results
                </Button>
              )}
            </>
          ) : null
        }
        onClose={() => setSelectedCode(null)}
        open={Boolean(selectedBooking)}
        subtitle={selectedBooking ? `${selectedBooking.patientName} · ${selectedBooking.mrn}` : undefined}
        title={selectedBooking ? getBookingAnchor(selectedBooking) : "Booking"}
        width={620}
      >
        {selectedBooking && selectedStatus && selectedEta && selectedNextCard && (
          <div className="booking-detail">
            <div className="booking-detail-identity">
              <div>
                <span className="booking-detail-label">Patient</span>
                <strong>{selectedBooking.patientName}</strong>
                <span>
                  {selectedBooking.mrn} · {selectedBooking.phoneMasked}
                </span>
              </div>
              <div>
                <span className="booking-detail-label">Route</span>
                <strong>{getRouteLabel(selectedBooking)}</strong>
                <span>{selectedBooking.placedAt ?? "Today"}</span>
              </div>
              <div>
                <span className="booking-detail-label">Total</span>
                <strong>{formatMoney(selectedBooking.total)}</strong>
                <span>{getPaymentSummary(selectedBooking)}</span>
              </div>
            </div>

            <ProgressStrip booking={selectedBooking} />

            <div className="booking-next-card">
              <div className="booking-next-card-head">
                <Badge icon={statusIcon(selectedBooking)} tone={selectedStatus.tone}>
                  {selectedStatus.label}
                </Badge>
                {selectedEta.label !== selectedStatus.label && (
                  <Badge dot tone={selectedEta.tone}>
                    {selectedEta.label}
                  </Badge>
                )}
              </div>
              <p>
                <strong>{selectedNextCard.title}</strong>
                <span>{selectedNextCard.body}</span>
                <span>{selectedEta.detail}</span>
              </p>
              {note && <span role="status">{note}</span>}
            </div>

            <section className="booking-detail-section" aria-labelledby="booking-tracking-title">
              <div className="booking-detail-section-head">
                <h3 id="booking-tracking-title">Live tracking</h3>
                <span>{getRouteLabel(selectedBooking)}</span>
              </div>
              <div className="booking-tracking-grid">
                {selectedTrackingRows.map((row) => (
                  <div key={row.label}>
                    <span>{row.label}</span>
                    <strong>{row.value}</strong>
                  </div>
                ))}
              </div>
            </section>

            <section className="booking-detail-section" aria-labelledby="booking-tests-title">
              <div className="booking-detail-section-head">
                <h3 id="booking-tests-title">Tests</h3>
                <span>{selectedBooking.lines.length} ordered</span>
              </div>
              <div className="booking-tests-list">
                {selectedBooking.lines.map((line) => {
                  const result = getLineResult(selectedBooking, line);
                  return (
                    <div className="booking-test-row" key={line.lineId}>
                      <span>{line.displayName}</span>
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
                          : selectedBooking.bookingStatus === "in-progress" && !isBookingAwaitingVisit(selectedBooking)
                            ? "Awaiting result"
                            : "Awaiting sample"}
                      </Badge>
                      <span className="booking-test-result">
                        <strong>{result?.value ?? (line.price === null ? "$--" : formatMoney(line.price))}</strong>
                        {result && <small>{result.reference}</small>}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>

            {selectedBooking.flagged && selectedBooking.bookingStatus === "results-back" && !selectedBooking.cancelled && (
              <section className="booking-safety-card" aria-labelledby="booking-safety-title">
                <Badge icon={<WarningIcon size={13} variant="stroke" />} tone="danger">
                  Flagged
                </Badge>
                <p>
                  <strong id="booking-safety-title">Doctor review required</strong>
                  <span>Abnormal results hold the booking at Results until the doctor reviews and reports them in Labs.</span>
                </p>
              </section>
            )}

            <section className="booking-detail-grid" aria-label="Timeline, billing, and policy">
              <div>
                <h3>Timeline</h3>
                <ol className="booking-timeline">
                  {selectedTimelineRows.map((row) => (
                    <li className={`is-${row.state}`} key={row.label}>
                      <strong>{row.label}</strong>
                      <span>{row.value}</span>
                    </li>
                  ))}
                </ol>
              </div>
              <div>
                <h3>Billing</h3>
                <div className="booking-policy-lines">
                  <span>
                    <ReceiptIcon size={13} variant="stroke" />
                    {getPaymentSummary(selectedBooking)}
                  </span>
                  <span>
                    <CreditCardIcon size={13} variant="stroke" />
                    {selectedBooking.route === "clinic" ? "Insurance claim follows result close-out" : "PSC payment reconciles at collection"}
                  </span>
                </div>
              </div>
              <div>
                <h3>Policy</h3>
                <div className="booking-policy-lines">
                  <span>
                    <LockIcon size={13} variant="stroke" />
                    {getEditPolicy(selectedBooking)}
                  </span>
                  <span>
                    <CreditCardIcon size={13} variant="stroke" />
                    {getLockReason(selectedBooking) ?? "Cancel available until payment/sample lock"}
                  </span>
                  <span>
                    <ShareIcon size={13} variant="stroke" />
                    {getResendPolicy(selectedBooking)}
                  </span>
                </div>
              </div>
            </section>

            <section className="booking-related" aria-label="Related records">
              <button onClick={() => onOpenPatient(selectedBooking.patientId)} type="button">
                <PatientIcon size={14} variant="stroke" />
                <span>
                  <strong>Patient chart</strong>
                  <small>{selectedBooking.mrn}</small>
                </span>
              </button>
              <div>
                {selectedBooking.route === "psc" ? <PinIcon size={14} variant="stroke" /> : <ScanIcon size={14} variant="stroke" />}
                <span>
                  <strong>{selectedBooking.route === "psc" ? "Patient slip" : "Pickup handoff"}</strong>
                  <small>{selectedBooking.route === "psc" ? (selectedBooking.bookingCode ?? getBookingAnchor(selectedBooking)) : (selectedBooking.handoverCode ?? selectedBooking.sweep ?? "Next sweep")}</small>
                </span>
              </div>
              {!selectedBooking.cancelled && selectedBooking.route === "psc" && selectedBooking.bookingStatus !== "results-back" && (
                <div>
                  <BellIcon size={14} variant="stroke" />
                  <span>
                    <strong>Reminder channel</strong>
                    <small>Telegram + SMS</small>
                  </span>
                </div>
              )}
            </section>

            <BookingActions order={selectedBooking} />
          </div>
        )}
      </Drawer>
    </section>
  );
}
