"use client";

/* Bookings list — the doctor's own cross-patient order queue. Two filter axes
   (time scope + work state) over useOrderDraft().allBookings, a worklist sort
   (needs-action → results-back → scheduled → in-progress → recency), and a
   search trigger into the global palette. Rows push the booking detail. */

import { useMemo, useState } from "react";
import { Plus as PlusIcon, Search as SearchIcon, Warning as WarningIcon } from "@/icons/components";
import { useOrderDraft } from "@/components/OrderDraft";
import type { BookingListItem } from "@/components/OrderDraft/types";
import {
  bookingStatusView,
  getBookingNeedsAction,
  getBookingTestSummary,
  getBookingTime,
  getCollectionRoute,
  getDoctorAction,
} from "@/components/OrderDraft/bookingShared";
import { useMobileApp } from "@/components/DoctorMobile/state/MobileAppContext";
import {
  ChipRail,
  Pill,
  SectionHeader,
} from "@/components/DoctorMobile/components/primitives";
import type { ChipItem, Tone } from "@/components/DoctorMobile/components/primitives";
import base from "@/components/DoctorMobile/DoctorMobileApp.module.css";
import styles from "./BookingsList.module.css";
import { cx } from "@/lib/cx";

/* ------------------------------------------------------- filter definitions - */

type TimeScopeId = "today" | "upcoming" | "past" | "all";
type WorkFilterId =
  | "active"
  | "needs-you"
  | "awaiting"
  | "at-lab"
  | "results"
  | "cancelled";

const TIME_SCOPES: Array<{ id: TimeScopeId; label: string }> = [
  { id: "today", label: "Today" },
  { id: "upcoming", label: "Upcoming" },
  { id: "past", label: "Past" },
  { id: "all", label: "All" },
];

const WORK_FILTERS: Array<{ id: WorkFilterId; label: string }> = [
  { id: "active", label: "Active" },
  { id: "needs-you", label: "Needs you" },
  { id: "awaiting", label: "Awaiting collection" },
  { id: "at-lab", label: "Sample at lab" },
  { id: "results", label: "Results back" },
  { id: "cancelled", label: "Cancelled" },
];

/* ------------------------------------------------------------ predicates ---- */

function matchesTimeScope(order: BookingListItem, scope: TimeScopeId): boolean {
  if (scope === "all") return true;
  const upcoming = order.bookingStatus === "scheduled" && Boolean(order.scheduledFor);
  const past = order.cancelled || order.bookingStatus === "results-back";
  switch (scope) {
    case "upcoming":
      return upcoming;
    case "past":
      return past;
    case "today":
      return !upcoming && !past;
  }
}

function matchesWorkFilter(order: BookingListItem, filter: WorkFilterId): boolean {
  switch (filter) {
    case "active":
      return !order.cancelled;
    case "needs-you":
      return getBookingNeedsAction(order);
    case "awaiting":
      return !order.cancelled && order.bookingStatus === "scheduled";
    case "at-lab":
      return !order.cancelled && order.bookingStatus === "in-progress";
    case "results":
      return !order.cancelled && order.bookingStatus === "results-back";
    case "cancelled":
      return order.cancelled;
  }
}

/* Worklist rank — the lower the number, the higher in the queue. */
function worklistRank(order: BookingListItem): number {
  if (order.cancelled) return 5;
  if (getBookingNeedsAction(order)) return 0;
  if (order.bookingStatus === "results-back") return 1;
  if (order.bookingStatus === "scheduled") return 2;
  if (order.bookingStatus === "in-progress") return 3;
  return 4;
}

/* ----------------------------------------------------------------- screen --- */

export function BookingsListScreen() {
  const { allBookings } = useOrderDraft();
  const { pushBooking, openSearch, openComposer } = useMobileApp();
  const [scope, setScope] = useState<TimeScopeId>("today");
  const [work, setWork] = useState<WorkFilterId>("active");

  /* Live counts always reflect the current time scope so the work chips read as
     "within this window". */
  const scoped = useMemo(
    () => allBookings.filter((order) => matchesTimeScope(order, scope)),
    [allBookings, scope],
  );

  const workCounts = useMemo(() => {
    const counts: Record<WorkFilterId, number> = {
      active: 0,
      "needs-you": 0,
      awaiting: 0,
      "at-lab": 0,
      results: 0,
      cancelled: 0,
    };
    for (const order of scoped) {
      for (const filter of WORK_FILTERS) {
        if (matchesWorkFilter(order, filter.id)) counts[filter.id] += 1;
      }
    }
    return counts;
  }, [scoped]);

  const timeCounts = useMemo(() => {
    const counts: Record<TimeScopeId, number> = { today: 0, upcoming: 0, past: 0, all: 0 };
    for (const order of allBookings) {
      for (const time of TIME_SCOPES) {
        if (matchesTimeScope(order, time.id)) counts[time.id] += 1;
      }
    }
    return counts;
  }, [allBookings]);

  const visible = useMemo(() => {
    const filtered = scoped.filter((order) => matchesWorkFilter(order, work));
    return [...filtered].sort((a, b) => {
      const rankDelta = worklistRank(a) - worklistRank(b);
      if (rankDelta !== 0) return rankDelta;
      /* recency proxy — newest first; allBookings is already newest-first, so a
         stable sort keeps that order within a rank tier. */
      return 0;
    });
  }, [scoped, work]);

  const timeChips: ChipItem[] = TIME_SCOPES.map((scopeDef) => ({
    id: scopeDef.id,
    label: scopeDef.label,
    count: timeCounts[scopeDef.id],
  }));
  const workChips: ChipItem[] = WORK_FILTERS.map((filterDef) => ({
    id: filterDef.id,
    label: filterDef.label,
    count: workCounts[filterDef.id],
  }));

  return (
    <div className={base.sectionStack}>
      <SectionHeader
        title="Bookings"
        action={
          <div className={styles.headerActions}>
            <button type="button" className={base.iconButton} aria-label="Search bookings" onClick={openSearch}>
              <SearchIcon size={18} variant="stroke" aria-hidden="true" />
            </button>
            <button type="button" className={base.iconButton} aria-label="New booking" onClick={openComposer}>
              <PlusIcon size={18} variant="stroke" aria-hidden="true" />
            </button>
          </div>
        }
      />

      <ChipRail items={timeChips} activeId={scope} onSelect={(id) => setScope(id as TimeScopeId)} />
      <ChipRail items={workChips} activeId={work} onSelect={(id) => setWork(id as WorkFilterId)} />

      {visible.length === 0 ? (
        <div className={base.cardGroup}>
          <p className={styles.empty}>No bookings match this view.</p>
        </div>
      ) : (
        <div className={base.cardGroup}>
          {visible.map((order) => (
            <BookingListRow key={order.code} order={order} onOpen={() => pushBooking(order.code)} />
          ))}
        </div>
      )}
    </div>
  );
}

/* --------------------------------------------------------------- list row --- */

function BookingListRow({ order, onOpen }: { order: BookingListItem; onOpen: () => void }) {
  const status = bookingStatusView(order);
  const action = getDoctorAction(order);
  const needsAction = getBookingNeedsAction(order);
  const summary = getBookingTestSummary(order, 2);
  const route = getCollectionRoute(order);
  const code = order.bookingCode ?? order.code;

  return (
    <button
      type="button"
      className={cx(base.bookingRow, needsAction && styles.flagged)}
      onClick={onOpen}
    >
      <span className={base.bookingMain}>
        <span className={base.bookingTop}>
          <strong>{order.patientName}</strong>
          <span className={base.bookingTime}>{getBookingTime(order)}</span>
        </span>
        <small>
          {summary} · {route} · {code}
        </small>
        <span className={base.bookingStatusRow}>
          <Pill tone={status.tone as Tone}>
            <status.Icon size={12} variant="stroke" aria-hidden="true" />
            {status.label}
          </Pill>
          {needsAction ? (
            <span className={cx(base.bookingAction, base.text_danger)}>
              <WarningIcon size={12} variant="stroke" aria-hidden="true" /> {action.title}
            </span>
          ) : (
            <span className={base.bookingAction}>{action.title}</span>
          )}
        </span>
      </span>
    </button>
  );
}
