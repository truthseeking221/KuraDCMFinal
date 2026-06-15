"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Badge, Button, Counter, Drawer, Search } from "@/components/ui";
import {
  CheckCircle as CheckCircleIcon,
  Clock as ClockIcon,
  CreditCard as CreditCardIcon,
  Edit as EditIcon,
  Flask as FlaskIcon,
  Info as InfoIcon,
  Lock as LockIcon,
  Patient as PatientIcon,
  Plus as PlusIcon,
  Refresh as RefreshIcon,
  Share as ShareIcon,
  Tube as TubeIcon,
  Warning as WarningIcon,
} from "@/icons/components";
import { cx } from "@/lib/cx";
import { decorateActiveBooking, initialBookingQueue } from "@/data/bookings";
import { formatMoney, orderItems } from "@/components/OrderDraft/catalog";
import {
  bookingCancelLocked,
  bookingEditsLocked,
  useOrderDraft,
} from "@/components/OrderDraft/OrderDraftContext";
import {
  bookingMatchesCode,
  canOrderAgain,
  getBookingAnchor,
  getBookingNextStep,
  getBookingTestSummary,
  getDetailNextStep,
  getEditLockReason,
  getLockReason,
  getOperationalBookingStatus,
  getPaymentSummary,
  getResendUnavailableReason,
  getRouteLabel,
} from "@/components/OrderDraft/bookingUtils";
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
type DetailMode = "overview" | "editing" | "cancelling" | "resending";
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
    return !order.cancelled && order.route === "psc" && order.bookingStatus === "scheduled";
  }
  if (filter === "scheduled") return !order.cancelled && order.bookingStatus === "scheduled";
  if (filter === "in-progress") return !order.cancelled && order.bookingStatus === "in-progress";
  return !order.cancelled && order.bookingStatus === "results-back";
}

function matchesQuery(order: BookingListItem, query: string): boolean {
  const token = normalize(query);
  if (!token) return true;
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
      getOperationalBookingStatus(order).label,
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
  if (order.bookingStatus === "in-progress") return <TubeIcon size={13} variant="stroke" />;
  return <ClockIcon size={13} variant="stroke" />;
}

function makeClone(source: BookingListItem, sequence: number): BookingListItem {
  const code = `ORD-${sequence}`;
  return {
    ...source,
    code,
    bookingCode: source.route === "psc" ? `KO-${sequence}` : undefined,
    handoverCode: source.route === "clinic" && source.stat ? source.handoverCode : undefined,
    sweep: source.route === "clinic" && !source.stat ? source.sweep : undefined,
    payment:
      source.route === "clinic"
        ? { label: "Insurance · Forte", status: "pending-claim" }
        : { label: "At PSC counter", status: "pending" },
    bookingStatus: "scheduled",
    cancelled: false,
    flagged: false,
    placedAt: "Today",
    lines: source.lines.map((line, index) => ({ ...line, addedAt: sequence + index })),
  };
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

function BookingEditPanel({
  booking,
  onCancel,
  onSave,
}: {
  booking: BookingListItem;
  onCancel: () => void;
  onSave: (lines: OrderDraftLine[]) => void;
}) {
  const { mintLineForItem } = useOrderDraft();
  const [removedIds, setRemovedIds] = useState<Set<string>>(() => new Set());
  const [added, setAdded] = useState<OrderDraftLine[]>([]);
  const [query, setQuery] = useState("");

  const keptCount = booking.lines.length - removedIds.size + added.length;
  const dirty = removedIds.size > 0 || added.length > 0;
  const presentIds = useMemo(
    () => new Set([...booking.lines.map((line) => line.lineId), ...added.map((line) => line.lineId)]),
    [added, booking.lines],
  );
  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return [];
    return orderItems
      .filter(
        (item) =>
          !item.unavailable &&
          !presentIds.has(item.id) &&
          (item.name.toLowerCase().includes(normalized) || item.code.toLowerCase().includes(normalized)),
      )
      .slice(0, 5);
  }, [presentIds, query]);

  const liveTotal =
    booking.lines.reduce((sum, line) => sum + (removedIds.has(line.lineId) ? 0 : (line.price ?? 0)), 0) +
    added.reduce((sum, line) => sum + (line.price ?? 0), 0) +
    booking.statFee;

  return (
    <div className="booking-edit">
      {booking.lines.map((line) => {
        const removed = removedIds.has(line.lineId);
        return (
          <div className={cx("booking-edit-line", removed && "is-removed")} key={line.lineId}>
            <span className="booking-edit-name">{line.displayName}</span>
            {removed && <span className="booking-edit-tag">Removed</span>}
            <span className="booking-edit-price">{line.price === null ? "$--" : formatMoney(line.price)}</span>
            <button
              className="booking-edit-action"
              onClick={() =>
                setRemovedIds((current) => {
                  const next = new Set(current);
                  if (removed) next.delete(line.lineId);
                  else next.add(line.lineId);
                  return next;
                })
              }
              type="button"
            >
              {removed ? "Undo" : "Remove"}
            </button>
          </div>
        );
      })}

      {added.map((line) => (
        <div className="booking-edit-line" key={line.lineId}>
          <span className="booking-edit-name">{line.displayName}</span>
          <span className="booking-edit-tag is-new">New</span>
          <span className="booking-edit-price">{line.price === null ? "$--" : formatMoney(line.price)}</span>
          <button
            className="booking-edit-action"
            onClick={() => setAdded((current) => current.filter((entry) => entry.lineId !== line.lineId))}
            type="button"
          >
            Remove
          </button>
        </div>
      ))}

      <Search
        aria-label="Add a test"
        containerClassName="booking-edit-search"
        density="compact"
        onChange={(event) => setQuery(event.target.value)}
        onClear={() => setQuery("")}
        placeholder="Add a test..."
        value={query}
      />
      {results.map((item) => (
        <button
          className="booking-edit-result"
          key={item.id}
          onClick={() => {
            const line = mintLineForItem(item.id);
            if (line) setAdded((current) => [...current, line]);
            setQuery("");
          }}
          type="button"
        >
          <PlusIcon size={13} variant="stroke" />
          <span>{item.name}</span>
          <span>{formatMoney(item.price)}</span>
        </button>
      ))}

      <div className="booking-edit-footer">
        <span>{formatMoney(liveTotal)}</span>
        <Button intent="ghost" onClick={onCancel} size="sm">
          Discard
        </Button>
        <Button
          disabled={!dirty || keptCount === 0}
          intent="primary"
          onClick={() => onSave([...booking.lines.filter((line) => !removedIds.has(line.lineId)), ...added])}
          size="sm"
        >
          {keptCount === 0 ? "Order can't be empty" : dirty ? "Save changes" : "No changes yet"}
        </Button>
      </div>
    </div>
  );
}

function ProgressStrip({ booking }: { booking: BookingListItem }) {
  const resultsBack = booking.bookingStatus === "results-back";
  const sampleStarted = booking.bookingStatus === "in-progress" || resultsBack;
  const steps = [
    { id: "created", label: "Created", complete: true },
    { id: "scheduled", label: "Scheduled", complete: !booking.cancelled },
    { id: "sample", label: "Sample", complete: sampleStarted },
    { id: "results", label: "Results", complete: resultsBack },
    { id: "reported", label: "Reported", complete: resultsBack && !booking.flagged },
  ];

  return (
    <ol className="booking-progress" aria-label="Booking progress">
      {steps.map((step) => (
        <li className={cx(step.complete && "is-complete")} key={step.id}>
          <span aria-hidden>{step.complete ? <CheckCircleIcon size={14} variant="stroke" /> : null}</span>
          <strong>{step.label}</strong>
        </li>
      ))}
    </ol>
  );
}

export function BookingsWorkspace({ focus, onNewBooking, onOpenPatient, onReviewLabs }: BookingsWorkspaceProps) {
  const {
    draft,
    cancelBooking,
    reorder,
    restoreBooking,
    updateBookingLines,
  } = useOrderDraft();
  const [workspaceState] = useState<WorkspaceState>("ready");
  const [queue, setQueue] = useState<BookingListItem[]>(() => initialBookingQueue);
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<BookingFilterId>("all");
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [detailMode, setDetailMode] = useState<DetailMode>("overview");
  const [note, setNote] = useState<string | null>(null);
  const reorderSeqRef = useRef(8200);

  const activeBookings = useMemo(() => {
    const orders = [draft.lastPlaced, ...draft.placedOrders].filter((order): order is PlacedOrderSummary =>
      Boolean(order),
    );
    return orders.map(decorateActiveBooking);
  }, [draft.lastPlaced, draft.placedOrders]);

  const activeCodes = useMemo(() => new Set(activeBookings.map((booking) => booking.code)), [activeBookings]);
  const bookings = useMemo(() => [...activeBookings, ...queue], [activeBookings, queue]);

  const filteredBookings = useMemo(
    () => bookings.filter((booking) => matchesFilter(booking, activeFilter) && matchesQuery(booking, query)),
    [activeFilter, bookings, query],
  );

  const selectedBooking = useMemo(() => {
    if (!selectedCode) return null;
    return bookings.find((booking) => booking.code === selectedCode || bookingMatchesCode(booking, selectedCode)) ?? null;
  }, [bookings, selectedCode]);

  /* Search focus is an external navigation handoff from the global command
     palette, so this effect intentionally synchronizes local drawer state. */
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!focus) return;
    const match = bookings.find((booking) => bookingMatchesCode(booking, focus.code));
    if (!match) return;
    setActiveFilter("all");
    setQuery("");
    setSelectedCode(match.code);
    setDetailMode("overview");
    setNote(`Opened ${getBookingAnchor(match)} from search`);
  }, [bookings, focus]);

  useEffect(() => {
    setDetailMode("overview");
    setNote(null);
  }, [selectedBooking?.code]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (workspaceState !== "ready") {
    return <BookingAccessState state={workspaceState} />;
  }

  const updateLocalBooking = (code: string, fn: (booking: BookingListItem) => BookingListItem) => {
    setQueue((current) => current.map((booking) => (booking.code === code ? fn(booking) : booking)));
  };

  const saveLines = (booking: BookingListItem, lines: OrderDraftLine[]) => {
    if (activeCodes.has(booking.code)) {
      updateBookingLines(booking.code, lines);
    } else {
      updateLocalBooking(booking.code, (current) => {
        const known = lines.reduce((sum, line) => sum + (line.price ?? 0), 0);
        return {
          ...current,
          lines,
          total: known + current.statFee,
          unpricedCount: lines.filter((line) => line.price === null).length,
        };
      });
    }
    setDetailMode("overview");
    setNote(`Updated ${getBookingAnchor(booking)} · ${lines.length} tests`);
  };

  const cancelSelected = (booking: BookingListItem) => {
    if (activeCodes.has(booking.code)) {
      cancelBooking(booking.code);
    } else if (!bookingCancelLocked(booking)) {
      updateLocalBooking(booking.code, (current) => ({
        ...current,
        cancelled: true,
        payment: {
          ...current.payment,
          status: current.route === "psc" && current.payment.status === "collected" ? "refunded" : "voided",
        },
      }));
    }
    setDetailMode("overview");
    setNote(`Cancelled ${getBookingAnchor(booking)}`);
  };

  const restoreSelected = (booking: BookingListItem) => {
    if (activeCodes.has(booking.code)) {
      restoreBooking(booking.code);
    } else {
      updateLocalBooking(booking.code, (current) => ({
        ...current,
        cancelled: false,
        payment:
          current.route === "clinic"
            ? { label: "Insurance · Forte", status: "pending-claim" }
            : { label: "At PSC counter", status: "pending" },
      }));
    }
    setNote(`Restored ${getBookingAnchor(booking)}`);
  };

  const reorderSelected = (booking: BookingListItem) => {
    if (activeCodes.has(booking.code)) {
      reorder(booking.code);
    } else {
      reorderSeqRef.current += 1;
      const clone = makeClone(booking, reorderSeqRef.current);
      setQueue((current) => [clone, ...current]);
      setSelectedCode(clone.code);
    }
    setNote(`Ordered again from ${getBookingAnchor(booking)}`);
  };

  const counts = (Object.keys(filterLabels) as BookingFilterId[]).reduce(
    (acc, filter) => ({ ...acc, [filter]: bookings.filter((booking) => matchesFilter(booking, filter)).length }),
    {} as Record<BookingFilterId, number>,
  );
  const clinicPickup = bookings.filter(
    (booking) => !booking.cancelled && booking.route === "clinic" && booking.bookingStatus === "scheduled",
  ).length;
  const flagged = bookings.filter((booking) => !booking.cancelled && booking.flagged).length;

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
            <button
              aria-pressed={activeFilter === filter}
              className={cx("bookings-filter", activeFilter === filter && "is-active")}
              key={filter}
              onClick={() => setActiveFilter(filter)}
              type="button"
            >
              <span>{filterLabels[filter]}</span>
              <Counter count={counts[filter]} tone={activeFilter === filter ? "brand" : "neutral"} />
            </button>
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
              <th>Next step</th>
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
                const status = getOperationalBookingStatus(booking);
                const nextStep = getBookingNextStep(booking) ?? "No further action";
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
                      <span className="booking-next-step">{nextStep}</span>
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
        {selectedBooking && (
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
              <Badge
                icon={statusIcon(selectedBooking)}
                tone={getOperationalBookingStatus(selectedBooking).tone}
              >
                {getOperationalBookingStatus(selectedBooking).label}
              </Badge>
              <p>{getDetailNextStep(selectedBooking)}</p>
              {note && <span role="status">{note}</span>}
            </div>

            <section className="booking-detail-section" aria-labelledby="booking-tests-title">
              <div className="booking-detail-section-head">
                <h3 id="booking-tests-title">Tests</h3>
                <span>{selectedBooking.lines.length} ordered</span>
              </div>
              <div className="booking-tests-list">
                {selectedBooking.lines.map((line) => (
                  <div className="booking-test-row" key={line.lineId}>
                    <span>{line.displayName}</span>
                    <Badge
                      icon={selectedBooking.bookingStatus === "results-back" ? <CheckCircleIcon size={13} variant="stroke" /> : <ClockIcon size={13} variant="stroke" />}
                      tone={selectedBooking.bookingStatus === "results-back" ? "success" : "neutral"}
                    >
                      {selectedBooking.bookingStatus === "results-back" ? "Result back" : selectedBooking.bookingStatus === "in-progress" ? "Awaiting result" : "Awaiting sample"}
                    </Badge>
                    <strong>{line.price === null ? "$--" : formatMoney(line.price)}</strong>
                  </div>
                ))}
              </div>
            </section>

            <section className="booking-detail-grid" aria-label="Timeline and policy">
              <div>
                <h3>Timeline</h3>
                <ol className="booking-timeline">
                  <li>
                    <strong>Created</strong>
                    <span>{selectedBooking.placedAt ?? "Today"}</span>
                  </li>
                  {!selectedBooking.cancelled && selectedBooking.bookingStatus !== "scheduled" && (
                    <li>
                      <strong>Sample</strong>
                      <span>{selectedBooking.route === "psc" ? "PSC collected" : "Clinic draw collected"}</span>
                    </li>
                  )}
                  {selectedBooking.bookingStatus === "results-back" && (
                    <li>
                      <strong>Results</strong>
                      <span>{selectedBooking.flagged ? "Back · flagged for review" : "Back · ready to report"}</span>
                    </li>
                  )}
                  {selectedBooking.cancelled && (
                    <li>
                      <strong>Cancelled</strong>
                      <span>{getPaymentSummary(selectedBooking)}</span>
                    </li>
                  )}
                </ol>
              </div>
              <div>
                <h3>Policy</h3>
                <div className="booking-policy-lines">
                  <span>
                    <LockIcon size={13} variant="stroke" />
                    {getEditLockReason(selectedBooking) ?? "Edit tests available until results return"}
                  </span>
                  <span>
                    <CreditCardIcon size={13} variant="stroke" />
                    {getLockReason(selectedBooking) ?? "Cancel available until payment/sample lock"}
                  </span>
                  <span>
                    <ShareIcon size={13} variant="stroke" />
                    {getResendUnavailableReason(selectedBooking) ?? "PSC slip can be resent by Telegram + SMS"}
                  </span>
                </div>
              </div>
            </section>

            {detailMode === "editing" ? (
              <BookingEditPanel
                booking={selectedBooking}
                onCancel={() => setDetailMode("overview")}
                onSave={(lines) => saveLines(selectedBooking, lines)}
              />
            ) : detailMode === "cancelling" ? (
              <div className="booking-confirm">
                <strong>Cancel {getBookingAnchor(selectedBooking)}?</strong>
                <span>
                  {selectedBooking.lines.length} tests will be voided.{" "}
                  {selectedBooking.route === "psc"
                    ? "The patient is notified by Telegram + SMS."
                    : "The courier dispatch is cancelled."}
                </span>
                <div>
                  <Button intent="ghost" onClick={() => setDetailMode("overview")} size="sm">
                    Keep booking
                  </Button>
                  <Button intent="destructive" onClick={() => cancelSelected(selectedBooking)} size="sm">
                    Cancel booking
                  </Button>
                </div>
              </div>
            ) : detailMode === "resending" ? (
              <div className="booking-confirm">
                <strong>Resend {getBookingAnchor(selectedBooking)}?</strong>
                <span>Use this when the patient cannot find the PSC code or instructions.</span>
                <div>
                  <Button intent="ghost" onClick={() => setDetailMode("overview")} size="sm">
                    Back
                  </Button>
                  <Button
                    intent="primary"
                    onClick={() => {
                      setDetailMode("overview");
                      setNote(`Resent ${getBookingAnchor(selectedBooking)} · Telegram + SMS`);
                    }}
                    size="sm"
                  >
                    Resend slip
                  </Button>
                </div>
              </div>
            ) : (
              <div className="booking-detail-actions">
                {!bookingEditsLocked(selectedBooking) && (
                  <Button
                    intent="outline"
                    leadingIcon={<EditIcon size={14} variant="stroke" />}
                    onClick={() => setDetailMode("editing")}
                    size="sm"
                  >
                    Edit tests
                  </Button>
                )}
                {!getResendUnavailableReason(selectedBooking) && (
                  <Button
                    intent="outline"
                    leadingIcon={<ShareIcon size={14} variant="stroke" />}
                    onClick={() => setDetailMode("resending")}
                    size="sm"
                  >
                    Resend slip
                  </Button>
                )}
                {selectedBooking.cancelled && (
                  <Button
                    intent="outline"
                    leadingIcon={<RefreshIcon size={14} variant="stroke" />}
                    onClick={() => restoreSelected(selectedBooking)}
                    size="sm"
                  >
                    Restore booking
                  </Button>
                )}
                {!selectedBooking.cancelled && !bookingCancelLocked(selectedBooking) && (
                  <Button intent="outline" onClick={() => setDetailMode("cancelling")} size="sm">
                    Cancel booking
                  </Button>
                )}
                {canOrderAgain(selectedBooking) && (
                  <Button
                    intent="outline"
                    leadingIcon={<RefreshIcon size={14} variant="stroke" />}
                    onClick={() => reorderSelected(selectedBooking)}
                    size="sm"
                  >
                    Order again
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </Drawer>
    </section>
  );
}
