"use client";

/* CalendarView — visit & sample-collection scheduling for the clinic day.

   Implements the mastersource business model, not a generic calendar:
   • §6.3 / §6.4 — a BOOKING is a promise that a patient will receive services;
     a VISIT is the patient actually showing up. They are not the same object,
     and the UI keeps them legibly distinct (booking code + promise vs. live
     visit state).
   • §13.1 — lab collection is a time WINDOW (start–end), never a single point.
     Collection events render their full window and never collapse to one time.
   • §14 / §16 — reception/PSC work is identity-then-service; "confirm" = patient
     showed up, identity checked, visit begins; "draw" = specimen actually taken.
     Walk-in is a different origination than a doctor booking (§14.3).
   • §37.3 — the VISIT state machine: Created → Checked in → In service →
     Completed. Drawer actions advance exactly one step; the agenda badge
     updates live. We intentionally do NOT mutate booking/economic state here.
   • §41 / economic invariants — a doctor share only exists for an authenticated
     doctor-originated booking; a walk-in has no doctor originator and therefore
     no doctor spread. We surface this as read-only context, never an editor.

   Self-contained prototype: two seeded Phnom Penh clinic days (today with a
   live mix of states, and yesterday fully completed), local state, sonner
   toasts for cross-surface acknowledgements. No backend. */

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Avatar, Badge, Button, Calendar, Drawer, SegmentedToggle } from "@/components/ui";
import {
  Bell,
  BloodDrop,
  Booking as BookingIcon,
  Calendar as CalendarIcon,
  Check,
  CheckCircle,
  ChevronRight,
  Flask,
  Home,
  Pin,
  Plus,
  TeleConsultation,
  Tube,
  Warning,
} from "@/icons/components";
import type { IconProps } from "@/icons/components";
import { cx } from "@/lib/cx";
import "./CalendarView.css";

/* ----------------------------------------------------------------------------
   Domain types
   ------------------------------------------------------------------------- */

type Tone = "info" | "neutral" | "warning" | "success" | "danger" | "brand";

/* The four event kinds the brief asks for — each gets a distinct tone + icon. */
type EventKind = "collection" | "telehealth" | "followup" | "walkin";

/* §37.3 visit state machine. Follow-up reminders have no visit yet (the patient
   hasn't been booked back in) — they carry "reminder" as a non-visit state. */
type VisitState = "created" | "checked_in" | "in_service" | "completed" | "reminder";

type Origin = "doctor" | "walkin";

type ClinicEvent = {
  id: string;
  kind: EventKind;
  /* minutes from midnight — start anchors the agenda ordering */
  start: number;
  /* collection is a WINDOW (§13.1): end > start. Point events have end === start. */
  end: number;
  patient: string;
  initials: string;
  patientMeta: string;
  /* a booking is a promise (§6.3) — only doctor/PSC bookings have a code */
  bookingCode?: string;
  origin: Origin;
  tests: string;
  /* where the draw happens — PSC branch or the doctor's own clinic (§8.1) */
  site: string;
  /* initial visit state for the day */
  state: VisitState;
  /* one calm "why" line shown in the drawer */
  note: string;
  /* doctor share context, read-only (§41) */
  doctorShare?: string;
};

/* ----------------------------------------------------------------------------
   Per-kind presentation

   Four clearly-distinct tone+icon pairs. Collection is info (blue), telehealth
   neutral (grey), follow-up warning (amber), walk-in brand — and walk-in also
   carries a dashed spine + "off-schedule" treatment so its origination reads
   distinct from a booked collection at a glance, even though both sit in the
   blue family. (brand maps to --color-brand, which is blue — NOT green; green
   is reserved for the "completed" success state only.)
   ------------------------------------------------------------------------- */

const KIND_META: Record<
  EventKind,
  { label: string; tone: Tone; Icon: (props: IconProps) => React.ReactElement }
> = {
  collection: { label: "Lab collection", tone: "info", Icon: BloodDrop },
  telehealth: { label: "Telehealth", tone: "neutral", Icon: TeleConsultation },
  followup: { label: "Follow-up", tone: "warning", Icon: Bell },
  walkin: { label: "Walk-in", tone: "brand", Icon: Home },
};

/* §37.3 — visit state labels + the tone/icon each carries. "reminder" sits
   outside the machine: a follow-up has no visit until the patient is booked. */
const STATE_META: Record<
  VisitState,
  { label: string; tone: Tone; Icon: (props: IconProps) => React.ReactElement }
> = {
  reminder: { label: "Reminder", tone: "warning", Icon: Bell },
  created: { label: "Booked", tone: "neutral", Icon: BookingIcon },
  checked_in: { label: "Checked in", tone: "info", Icon: Pin },
  in_service: { label: "In service", tone: "info", Icon: Flask },
  completed: { label: "Completed", tone: "success", Icon: CheckCircle },
};

/* The forward transition for each state — drives the single drawer CTA. */
const NEXT_STATE: Partial<Record<VisitState, VisitState>> = {
  created: "checked_in",
  checked_in: "in_service",
  in_service: "completed",
};

const NEXT_LABEL: Partial<Record<VisitState, string>> = {
  created: "Check in patient",
  checked_in: "Start service",
  in_service: "Complete visit",
};

/* The booking-vs-visit line shown beside each CTA — makes §6.3/§6.4 legible. */
const TRANSITION_WHY: Partial<Record<VisitState, string>> = {
  created: "The booking is a promise. Check in once the patient is here and identity is confirmed.",
  checked_in: "Patient is in. Start service when the draw or consult actually begins.",
  in_service: "Mark complete once the specimen is collected or the consult ends.",
};

/* ----------------------------------------------------------------------------
   Time helpers — deterministic, no Date.now in fixtures
   ------------------------------------------------------------------------- */

function fmt(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  const period = h < 12 ? "am" : "pm";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m.toString().padStart(2, "0")}${period}`;
}

/* A collection window renders its span; a point event renders a single time. */
function timeRange(ev: ClinicEvent): string {
  if (ev.end > ev.start) return `${fmt(ev.start)} – ${fmt(ev.end)}`;
  return fmt(ev.start);
}

/* ----------------------------------------------------------------------------
   Seeded clinic days — Kura cabinet, Toul Kork, Phnom Penh
   ------------------------------------------------------------------------- */

/* The "selected day" the agenda opens on. June 21, 2026 (today, per workspace). */
const TODAY = new Date(2026, 5, 21);
/* Yesterday — a fully-completed day, for the "all done" state. */
const YESTERDAY = new Date(2026, 5, 20);

const TODAY_KEY = dayKey(TODAY);
const YESTERDAY_KEY = dayKey(YESTERDAY);

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/* Today — a live mix of states, including a deliberately-overlapping pair
   (ev-3 telehealth 9:30–9:50 overlaps ev-8 collection window 9:25–9:55) so the
   concurrent-events column-packing is reachable and visibly correct. */
const TODAY_EVENTS: ClinicEvent[] = [
  {
    id: "ev-1",
    kind: "collection",
    start: 8 * 60,
    end: 8 * 60 + 30,
    patient: "Sokha Chann",
    initials: "SC",
    patientMeta: "F · 54 · NID verified",
    bookingCode: "FZ-38245",
    origin: "doctor",
    tests: "HbA1c, Lipid panel, Creatinine",
    site: "Kura PSC — Toul Kork",
    state: "created",
    note: "Fasting draw. Patient confirmed she fasted from 9pm.",
    doctorShare: "Accrues per order line. Each line freezes its split once it is paid and served.",
  },
  {
    id: "ev-2",
    kind: "collection",
    start: 8 * 60 + 45,
    end: 9 * 60 + 15,
    patient: "Dara Pich",
    initials: "DP",
    patientMeta: "M · 61 · NID verified",
    bookingCode: "FZ-38251",
    origin: "doctor",
    tests: "eGFR, Urine ACR, Potassium",
    site: "Clinic draw — Dr. Phong's cabinet",
    state: "checked_in",
    note: "CKD follow-up. Draw at the cabinet, tubes couriered on route PP-04.",
    doctorShare: "Accrues per order line — clinic-collected, authenticated booking.",
  },
  {
    id: "ev-3",
    kind: "telehealth",
    start: 9 * 60 + 30,
    end: 9 * 60 + 50,
    patient: "Mealea Sok",
    initials: "MS",
    patientMeta: "F · 33 · phone verified",
    bookingCode: "TC-10477",
    origin: "doctor",
    tests: "Thyroid review — TSH results consult",
    site: "Telehealth — video",
    state: "created",
    note: "Reviewing TSH that came back last week. No draw needed. Overlaps Pisey's collection window — different rooms, both run concurrently.",
  },
  {
    id: "ev-8",
    kind: "collection",
    start: 9 * 60 + 25,
    end: 9 * 60 + 55,
    patient: "Pisey Ouk",
    initials: "PO",
    patientMeta: "F · 41 · NID verified",
    bookingCode: "FZ-38258",
    origin: "doctor",
    tests: "Fasting glucose, HbA1c",
    site: "Kura PSC — Toul Kork",
    state: "created",
    note: "Concurrent with the 9:30 telehealth — a second phlebotomist covers this draw.",
    doctorShare: "Accrues per order line. Each line freezes its split once it is paid and served.",
  },
  {
    id: "ev-4",
    kind: "collection",
    start: 10 * 60 + 15,
    end: 10 * 60 + 45,
    patient: "Visal Nuon",
    initials: "VN",
    patientMeta: "M · 47 · NID verified",
    bookingCode: "FZ-38260",
    origin: "doctor",
    tests: "CBC, CRP, Ferritin",
    site: "Kura PSC — Toul Kork",
    state: "in_service",
    note: "Anemia workup. Phlebotomist has started the draw.",
    doctorShare: "Accrues per order line. Each line freezes its split once it is paid and served.",
  },
  {
    id: "ev-5",
    kind: "walkin",
    start: 11 * 60,
    end: 11 * 60 + 20,
    patient: "Chanthou Meas",
    initials: "CM",
    patientMeta: "F · 29 · provisional",
    origin: "walkin",
    tests: "Random glucose, Urinalysis",
    site: "Kura PSC — Toul Kork",
    state: "checked_in",
    note: "Walk-in, no pre-order. Different origination than a doctor booking — no doctor share applies.",
  },
  {
    id: "ev-6",
    kind: "collection",
    start: 13 * 60 + 30,
    end: 14 * 60,
    patient: "Rithy Chea",
    initials: "RC",
    patientMeta: "M · 58 · NID verified",
    bookingCode: "FZ-38272",
    origin: "doctor",
    tests: "PSA, Testosterone",
    site: "Kura PSC — Toul Kork",
    state: "completed",
    note: "Draw done at 13:42. Tubes accepted at the lab.",
    doctorShare: "Accrues per order line — frozen on each line that is paid and served.",
  },
  {
    id: "ev-7",
    kind: "followup",
    start: 15 * 60,
    end: 15 * 60,
    patient: "Sokha Chann",
    initials: "SC",
    patientMeta: "F · 54 · NID verified",
    origin: "doctor",
    tests: "Reminder — book repeat HbA1c in 3 months",
    site: "No visit yet",
    state: "reminder",
    note: "Scheduled from the last encounter. This is a reminder, not a booking — no visit exists until you book her back in.",
  },
];

/* Yesterday — every visit completed. Drives the "fully-completed day" state. */
const YESTERDAY_EVENTS: ClinicEvent[] = [
  {
    id: "yd-1",
    kind: "collection",
    start: 8 * 60 + 30,
    end: 9 * 60,
    patient: "Bopha Lim",
    initials: "BL",
    patientMeta: "F · 49 · NID verified",
    bookingCode: "FZ-38201",
    origin: "doctor",
    tests: "Lipid panel, ALT/AST",
    site: "Kura PSC — Toul Kork",
    state: "completed",
    note: "Draw done at 08:41. Tubes accepted at the lab.",
    doctorShare: "Accrues per order line — frozen on each line that is paid and served.",
  },
  {
    id: "yd-2",
    kind: "telehealth",
    start: 10 * 60,
    end: 10 * 60 + 25,
    patient: "Sothea Kim",
    initials: "SK",
    patientMeta: "M · 37 · phone verified",
    bookingCode: "TC-10470",
    origin: "doctor",
    tests: "Hypertension review",
    site: "Telehealth — video",
    state: "completed",
    note: "Consult ended on time. BP log reviewed.",
  },
  {
    id: "yd-3",
    kind: "walkin",
    start: 11 * 60 + 30,
    end: 11 * 60 + 50,
    patient: "Nara Soun",
    initials: "NS",
    patientMeta: "M · 52 · provisional",
    origin: "walkin",
    tests: "Random glucose",
    site: "Kura PSC — Toul Kork",
    state: "completed",
    note: "Walk-in, draw completed. No doctor share applies.",
  },
];

/* ----------------------------------------------------------------------------
   Day grid bounds — centralized geometric constants
   ------------------------------------------------------------------------- */

const DAY_START = 8 * 60; // 8:00am
const DAY_END = 16 * 60; // 4:00pm
const HOUR_PX = 84; // vertical px per hour in the time grid
const MIN_EVENT_PX = 56; // compact row cards stay readable without forcing extra columns

function topFor(min: number): number {
  return ((min - DAY_START) / 60) * HOUR_PX;
}

/* Rendered height: the minute span mapped to px, clamped to MIN_EVENT_PX so a
   point/short event still fits its icon row + patient + tests + badge. */
function heightFor(ev: ClinicEvent): number {
  const span = (ev.end - ev.start) / 60;
  return Math.max(span * HOUR_PX, MIN_EVENT_PX);
}

/* A static "now" line for the today indicator — 11:25am, deterministic. */
const NOW_MIN = 11 * 60 + 25;

/* ----------------------------------------------------------------------------
   Overlap column-packing — group events by their real clinical time window,
   then lay true conflicts side-by-side. Close-but-sequential appointments stay
   full width; the CSS card is compact enough that min-height no longer needs to
   create artificial columns.
   ------------------------------------------------------------------------- */

type Placed = ClinicEvent & { col: number; cols: number };

function packEvents(list: ClinicEvent[]): Placed[] {
  const sorted = [...list].sort((a, b) => a.start - b.start || a.end - b.end);
  const realEnd = (ev: ClinicEvent) => Math.max(ev.end, ev.start + 1);

  const result: Placed[] = [];
  let cluster: ClinicEvent[] = [];

  const flush = () => {
    if (cluster.length === 0) return;
    /* greedy column assignment: place each event in the first column whose
       last event has ended */
    const colEnds: number[] = [];
    const cols: number[] = [];
    cluster.forEach((ev, i) => {
      let c = colEnds.findIndex((end) => end <= ev.start);
      if (c === -1) {
        c = colEnds.length;
        colEnds.push(realEnd(ev));
      } else {
        colEnds[c] = realEnd(ev);
      }
      cols[i] = c;
    });
    const total = colEnds.length;
    cluster.forEach((ev, i) => result.push({ ...ev, col: cols[i], cols: total }));
    cluster = [];
  };

  let clusterEnd = -Infinity;
  for (const ev of sorted) {
    if (cluster.length > 0 && ev.start >= clusterEnd) flush();
    cluster.push(ev);
    clusterEnd = Math.max(clusterEnd, realEnd(ev));
  }
  flush();
  return result;
}

/* ----------------------------------------------------------------------------
   Week helpers — Sunday-start week, matching the kit Calendar
   ------------------------------------------------------------------------- */

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/* Compare day-granularity: -1 if a is before b, 0 same, 1 after. */
function compareDay(a: Date, b: Date): number {
  const da = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const db = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  return da < db ? -1 : da > db ? 1 : 0;
}

/* The seven dates of the Sunday-start week that contains `d` (matches the kit
   Calendar's Sunday-start grid, so a day picked in the mini-calendar lands in
   the expected week-strip column). */
function weekDays(d: Date): Date[] {
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  start.setDate(start.getDate() - start.getDay()); // back to Sunday
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    return day;
  });
}

const WEEKDAY_ABBR = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/* ----------------------------------------------------------------------------
   Component
   ------------------------------------------------------------------------- */

export function CalendarView() {
  const [selectedDay, setSelectedDay] = useState<Date>(TODAY);
  const [view, setView] = useState<"day" | "week">("day");
  /* events keyed by day so each seeded day keeps its own live state */
  const [eventsByDay, setEventsByDay] = useState<Record<string, ClinicEvent[]>>({
    [TODAY_KEY]: TODAY_EVENTS,
    [YESTERDAY_KEY]: YESTERDAY_EVENTS,
  });
  const [openId, setOpenId] = useState<string | null>(null);
  /* per-event "advancing" flag — drives the pending state on the drawer CTA */
  const [advancingId, setAdvancingId] = useState<string | null>(null);

  const eventsForDay = (d: Date): ClinicEvent[] => {
    const list = eventsByDay[dayKey(d)] ?? [];
    return [...list].sort((a, b) => a.start - b.start);
  };

  const dayEvents = eventsForDay(selectedDay);

  const isToday = sameDay(selectedDay, TODAY);
  const isPast = compareDay(selectedDay, TODAY) < 0;

  const open = openId
    ? Object.values(eventsByDay)
        .flat()
        .find((e) => e.id === openId) ?? null
    : null;

  /* whether every visit on the selected day is completed (fully-done day) */
  const allDone =
    dayEvents.length > 0 &&
    dayEvents.every((e) => e.state === "completed" || e.state === "reminder") &&
    dayEvents.some((e) => e.state === "completed");

  /* §37.3 — advance exactly one step. Optimistic-but-pending: we flip an
     "advancing" flag, disable the CTA for a beat, then commit + toast. */
  const commitState = (id: string, target: VisitState) => {
    setEventsByDay((map) => {
      const next: Record<string, ClinicEvent[]> = {};
      for (const [k, list] of Object.entries(map)) {
        next[k] = list.map((ev) => (ev.id === id ? { ...ev, state: target } : ev));
      }
      return next;
    });
  };

  const advance = (id: string) => {
    const ev = Object.values(eventsByDay)
      .flat()
      .find((e) => e.id === id);
    if (!ev) return;
    const next = NEXT_STATE[ev.state];
    if (!next) return;
    const from = ev.state;
    setAdvancingId(id);
    window.setTimeout(() => {
      commitState(id, next);
      setAdvancingId(null);
      const toastOpts =
        next === "completed"
          ? {
              description: "Booking and economic split are untouched.",
              action: {
                label: "Undo",
                onClick: () => commitState(id, from),
              },
            }
          : {
              action: {
                label: "Undo",
                onClick: () => commitState(id, from),
              },
            };
      toast.success(`${ev.patient} — ${STATE_META[next].label.toLowerCase()}`, toastOpts);
    }, 420);
  };

  const bookFollowUp = (ev: ClinicEvent) => {
    toast.success(`Opening booking for ${ev.patient}`, {
      description: "A reminder becomes a real booking only when you create one.",
    });
    setOpenId(null);
  };

  const bookNew = () => {
    toast.success("New booking", {
      description: `Opening the booking flow for ${formatDay(selectedDay)}.`,
    });
  };

  const dayLabel = formatDay(selectedDay);

  /* Counts for the header summary — live, derived from current state. */
  const collectionCount = dayEvents.filter((e) => e.kind === "collection").length;
  const inServiceCount = dayEvents.filter((e) => e.state === "in_service").length;
  const completedCount = dayEvents.filter((e) => e.state === "completed").length;

  const hours = useMemo(() => {
    const out: number[] = [];
    for (let h = DAY_START; h <= DAY_END; h += 60) out.push(h);
    return out;
  }, []);

  /* The seven days of the week containing the selection. */
  const week = useMemo(() => weekDays(selectedDay), [selectedDay]);
  const countFor = (d: Date) => (eventsByDay[dayKey(d)]?.length ?? 0);

  return (
    <div className="cal" aria-label="Calendar">
      <div className="cal-layout">
        {/* ---- left rail: mini-calendar + view toggle ---- */}
        <aside className="cal-rail" aria-label="Pick a day">
          <SegmentedToggle<"day" | "week">
            aria-label="Calendar view"
            value={view}
            onChange={setView}
            options={[
              { label: "Day", value: "day" },
              { label: "Week", value: "week" },
            ]}
          />

          <div className="cal-mini">
            <Calendar mode="single" value={selectedDay} onChange={setSelectedDay} />
          </div>

          <button
            type="button"
            className="cal-today-btn"
            onClick={() => {
              setSelectedDay(TODAY);
              setView("day");
            }}
            disabled={isToday && view === "day"}
          >
            <CalendarIcon size={14} variant="stroke" aria-hidden />
            Jump to today
          </button>

          <div className="cal-legend" aria-label="Event types">
            <p className="cal-eyebrow">Event types</p>
            <ul>
              {(Object.keys(KIND_META) as EventKind[]).map((kind) => {
                const meta = KIND_META[kind];
                const Icon = meta.Icon;
                return (
                  <li key={kind} className={cx("cal-legend-row", `tone-${meta.tone}`)}>
                    <span
                      className={cx("cal-legend-dot", kind === "walkin" && "is-walkin")}
                      aria-hidden
                    >
                      <Icon size={13} variant="stroke" />
                    </span>
                    {meta.label}
                    {kind === "walkin" && <small>off-schedule</small>}
                  </li>
                );
              })}
            </ul>
            <p className="cal-legend-note">
              A booking is a promise. A visit is the patient actually here.
            </p>
          </div>
        </aside>

        {/* ---- main: agenda / time grid ---- */}
        <section className="cal-main" aria-label={`Agenda for ${dayLabel}`}>
          <header className="cal-day-head">
            <div className="cal-day-head-lede">
              <p className="cal-eyebrow">
                {isToday ? "Today" : isPast ? "Past day" : "Selected day"}
                {view === "week" && " · week"}
              </p>
              <h2>{view === "week" ? weekLabel(week) : dayLabel}</h2>
            </div>
            {view === "day" && dayEvents.length > 0 && (
              <div className="cal-day-stats" aria-label="Day summary">
                <span className="cal-stat">
                  <strong>{collectionCount}</strong>
                  <small>draws</small>
                </span>
                <span className="cal-stat">
                  <strong>{inServiceCount}</strong>
                  <small>in service</small>
                </span>
                <span className="cal-stat">
                  <strong>{completedCount}</strong>
                  <small>done</small>
                </span>
              </div>
            )}
          </header>

          {view === "week" ? (
            <WeekView
              week={week}
              selectedDay={selectedDay}
              onPickDay={(d) => {
                setSelectedDay(d);
                setView("day");
              }}
              eventsForDay={eventsForDay}
              countFor={countFor}
              onOpen={setOpenId}
            />
          ) : (
            <DayAgenda
              dayEvents={dayEvents}
              hours={hours}
              isToday={isToday}
              isPast={isPast}
              allDone={allDone}
              dayLabel={dayLabel}
              onOpen={setOpenId}
              onBookNew={bookNew}
            />
          )}
        </section>
      </div>

      {/* ---- event drawer: booking vs visit + state machine ---- */}
      {open && (
        <EventDrawer
          event={open}
          advancing={advancingId === open.id}
          onClose={() => setOpenId(null)}
          onAdvance={advance}
          onBookFollowUp={bookFollowUp}
        />
      )}
    </div>
  );
}

function formatDay(d: Date): string {
  const opts: Intl.DateTimeFormatOptions = { weekday: "long", month: "long", day: "numeric" };
  /* show the year when the day is outside the current month, so navigating
     months stays unambiguous */
  if (d.getMonth() !== TODAY.getMonth() || d.getFullYear() !== TODAY.getFullYear()) {
    opts.year = "numeric";
  }
  return d.toLocaleDateString("en-US", opts);
}

function weekLabel(week: Date[]): string {
  const first = week[0];
  const last = week[6];
  const f = first.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const l = last.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${f} – ${l}`;
}

/* ----------------------------------------------------------------------------
   Day agenda — the time grid
   ------------------------------------------------------------------------- */

function DayAgenda({
  dayEvents,
  hours,
  isToday,
  isPast,
  allDone,
  dayLabel,
  onOpen,
  onBookNew,
}: {
  dayEvents: ClinicEvent[];
  hours: number[];
  isToday: boolean;
  isPast: boolean;
  allDone: boolean;
  dayLabel: string;
  onOpen: (id: string) => void;
  onBookNew: () => void;
}) {
  const placed = useMemo(() => packEvents(dayEvents), [dayEvents]);

  if (dayEvents.length === 0) {
    return (
      <div className="cal-empty">
        <span className="cal-empty-ic" aria-hidden>
          <CalendarIcon size={22} variant="stroke" />
        </span>
        {isPast ? (
          <>
            <strong>No visits were scheduled</strong>
            <span>Nothing was booked for {dayLabel}. Past days are read-only.</span>
          </>
        ) : (
          <>
            <strong>Nothing is booked yet</strong>
            <span>
              No visits or collections for {dayLabel}. Book a visit and it will appear here as a
              time-ordered agenda.
            </span>
            <Button
              intent="secondary"
              size="sm"
              leadingIcon={<Plus size={15} variant="stroke" aria-hidden />}
              onClick={onBookNew}
            >
              Book a visit
            </Button>
          </>
        )}
      </div>
    );
  }

  return (
    <>
      {allDone && (
        <p className="cal-alldone" role="status">
          <CheckCircle size={15} variant="stroke" aria-hidden />
          All visits completed for {dayLabel}.
        </p>
      )}
      <div className={cx("cal-grid", allDone && "is-alldone")}>
        {/* hour gutter + slot lines */}
        <div className="cal-grid-lines" aria-hidden>
          {hours.map((h) => (
            <div key={h} className="cal-hour" style={{ top: topFor(h) }}>
              <span className="cal-hour-label">{fmt(h)}</span>
              <span className="cal-hour-line" />
            </div>
          ))}
        </div>

        {/* today's now-indicator — rendered relative to the grid, not gated
            on events, so it shows even on an empty today */}
        {isToday && NOW_MIN >= DAY_START && NOW_MIN <= DAY_END && (
          <div className="cal-now" style={{ top: topFor(NOW_MIN) }} aria-label="Current time">
            <span className="cal-now-dot" aria-hidden />
            <span className="cal-now-time">{fmt(NOW_MIN)}</span>
          </div>
        )}

        {/* events — positioned grid, not a semantic list */}
        <div className="cal-events">
          {placed.map((ev) => (
            <EventCard key={ev.id} ev={ev} onOpen={onOpen} />
          ))}
        </div>
      </div>
    </>
  );
}

function EventCard({ ev, onOpen }: { ev: Placed; onOpen: (id: string) => void }) {
  const kind = KIND_META[ev.kind];
  const state = STATE_META[ev.state];
  const KindIcon = kind.Icon;
  const StateIcon = state.Icon;
  const isWindow = ev.end > ev.start;
  const isPoint = ev.end === ev.start;
  const widthPct = 100 / ev.cols;
  const style: React.CSSProperties = {
    top: topFor(ev.start),
    height: heightFor(ev),
    left: `calc(${ev.col * widthPct}% + ${ev.col === 0 ? "0px" : "var(--space-1)"})`,
    width: `calc(${widthPct}% - ${ev.cols > 1 ? "var(--space-1)" : "var(--space-2)"})`,
  };
  return (
    <button
      type="button"
      className={cx(
        "cal-event",
        `tone-${kind.tone}`,
        ev.kind === "walkin" && "is-walkin",
        isPoint && "is-point",
        ev.cols > 1 && "is-packed",
        ev.state === "completed" && "is-done",
      )}
      style={style}
      onClick={() => onOpen(ev.id)}
      aria-label={`${kind.label} for ${ev.patient}, ${timeRange(ev)}, ${state.label}`}
    >
      <span className="cal-event-spine" aria-hidden />
      <span className="cal-event-body">
        <span className="cal-event-top">
          <span className="cal-event-ic" aria-hidden>
            <KindIcon size={14} variant="stroke" />
          </span>
          <span className="cal-event-time">
            {timeRange(ev)}
            {isWindow && <span className="cal-window-tag">window</span>}
          </span>
        </span>
        <span className="cal-event-patient">{ev.patient}</span>
        <span className="cal-event-tests">{ev.tests}</span>
      </span>
      <span className="cal-event-badge">
        <Badge appearance="subtle" tone={state.tone} icon={<StateIcon size={11} variant="stroke" />}>
          {state.label}
        </Badge>
      </span>
    </button>
  );
}

/* ----------------------------------------------------------------------------
   Week view — seven stacked day-sections, each with its own mini-agenda
   ------------------------------------------------------------------------- */

function WeekView({
  week,
  selectedDay,
  onPickDay,
  eventsForDay,
  countFor,
  onOpen,
}: {
  week: Date[];
  selectedDay: Date;
  onPickDay: (d: Date) => void;
  eventsForDay: (d: Date) => ClinicEvent[];
  countFor: (d: Date) => number;
  onOpen: (id: string) => void;
}) {
  return (
    <div className="cal-week">
      {/* day-tabs row — pick a day to jump to its full day view */}
      <div className="cal-week-strip" aria-label="Days this week">
        {week.map((d, i) => {
          const count = countFor(d);
          const selected = sameDay(d, selectedDay);
          const today = sameDay(d, TODAY);
          return (
            <button
              key={dayKey(d)}
              type="button"
              aria-pressed={selected}
              aria-label={`${WEEKDAY_ABBR[i]} ${d.getDate()}, ${count} events`}
              className={cx("cal-week-day", selected && "is-selected", today && "is-today")}
              onClick={() => onPickDay(d)}
            >
              <span className="cal-week-dow">{WEEKDAY_ABBR[i]}</span>
              <span className="cal-week-date">{d.getDate()}</span>
              {count > 0 ? (
                <span className="cal-week-pips" aria-hidden>
                  <span className="cal-week-pip" />
                </span>
              ) : (
                <span className="cal-week-pips cal-week-pips--empty" aria-hidden />
              )}
            </button>
          );
        })}
      </div>

      {/* stacked day-sections — only seeded days carry events */}
      <ol className="cal-week-days">
        {week.map((d, i) => {
          const list = eventsForDay(d);
          const today = sameDay(d, TODAY);
          const past = compareDay(d, TODAY) < 0;
          return (
            <li key={dayKey(d)} className={cx("cal-wday", today && "is-today")}>
              <button
                type="button"
                className="cal-wday-head"
                onClick={() => onPickDay(d)}
                aria-label={`Open ${WEEKDAY_ABBR[i]} ${d.getDate()}`}
              >
                <span className="cal-wday-dow">{WEEKDAY_ABBR[i]}</span>
                <span className="cal-wday-date">{d.getDate()}</span>
                {list.length > 0 && (
                  <span className="cal-wday-count">{list.length}</span>
                )}
                <ChevronRight size={15} variant="stroke" aria-hidden className="cal-wday-chev" />
              </button>
              {list.length === 0 ? (
                <p className="cal-wday-empty">{past ? "No visits scheduled" : "Nothing booked"}</p>
              ) : (
                <ul className="cal-wday-list">
                  {list.map((ev) => {
                    const kind = KIND_META[ev.kind];
                    const state = STATE_META[ev.state];
                    const KindIcon = kind.Icon;
                    const StateIcon = state.Icon;
                    return (
                      <li key={ev.id}>
                        <button
                          type="button"
                          className={cx(
                            "cal-wrow",
                            `tone-${kind.tone}`,
                            ev.kind === "walkin" && "is-walkin",
                            ev.state === "completed" && "is-done",
                          )}
                          onClick={() => onOpen(ev.id)}
                          aria-label={`${kind.label} for ${ev.patient}, ${timeRange(ev)}, ${state.label}`}
                        >
                          <span className="cal-wrow-time">{timeRange(ev)}</span>
                          <span className="cal-wrow-ic" aria-hidden>
                            <KindIcon size={13} variant="stroke" />
                          </span>
                          <span className="cal-wrow-patient">{ev.patient}</span>
                          <Badge
                            appearance="subtle"
                            tone={state.tone}
                            icon={<StateIcon size={11} variant="stroke" />}
                          >
                            {state.label}
                          </Badge>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* ----------------------------------------------------------------------------
   Drawer
   ------------------------------------------------------------------------- */

function EventDrawer({
  event,
  advancing,
  onClose,
  onAdvance,
  onBookFollowUp,
}: {
  event: ClinicEvent;
  advancing: boolean;
  onClose: () => void;
  onAdvance: (id: string) => void;
  onBookFollowUp: (ev: ClinicEvent) => void;
}) {
  const kind = KIND_META[event.kind];
  const state = STATE_META[event.state];
  const StateIcon = state.Icon;
  const KindIcon = kind.Icon;
  const next = NEXT_STATE[event.state];
  const isWindow = event.end > event.start;
  const isFollowUp = event.kind === "followup";

  /* The visit state machine, rendered as a stepper so the booking→visit→done
     progression is legible (§37.3). Follow-ups have no visit track. */
  const TRACK: VisitState[] = ["created", "checked_in", "in_service", "completed"];
  const currentIndex = TRACK.indexOf(event.state);

  const footer = isFollowUp ? (
    <Button intent="primary" size="md" onClick={() => onBookFollowUp(event)}>
      Book repeat order
    </Button>
  ) : next ? (
    <div className="cal-foot">
      <p className="cal-foot-why">{TRANSITION_WHY[event.state]}</p>
      <Button
        intent="primary"
        size="md"
        loading={advancing}
        trailingIcon={advancing ? undefined : <ChevronRight size={16} variant="stroke" aria-hidden />}
        onClick={() => onAdvance(event.id)}
      >
        {advancing ? "Saving…" : NEXT_LABEL[event.state]}
      </Button>
    </div>
  ) : (
    <div className="cal-foot cal-foot--done">
      <CheckCircle size={16} variant="stroke" aria-hidden />
      <span>Visit completed. Each order line freezes its split once that line is paid and served.</span>
    </div>
  );

  return (
    <Drawer
      open
      onClose={onClose}
      width={460}
      title={event.patient}
      subtitle={
        <span className="cal-dr-sub">
          <KindIcon size={13} variant="stroke" aria-hidden />
          {kind.label} · {timeRange(event)}
        </span>
      }
      footer={footer}
    >
      <div className="cal-dr">
        {/* identity */}
        <div className="cal-dr-patient">
          <Avatar initials={event.initials} name={event.patient} size="sm" />
          <span>
            <strong>{event.patient}</strong>
            <small>{event.patientMeta}</small>
          </span>
          <Badge appearance="subtle" tone={state.tone} icon={<StateIcon size={11} variant="stroke" />}>
            {state.label}
          </Badge>
        </div>

        {/* booking vs visit — the core distinction */}
        <dl className="cal-dr-facts">
          <div>
            <dt>Booking</dt>
            <dd>
              {event.bookingCode ? (
                <span className="cal-mono">{event.bookingCode}</span>
              ) : (
                "No booking — walk-in"
              )}
              <small>
                {event.origin === "doctor"
                  ? "A promise to perform services. Created by the doctor."
                  : "No pre-order. Different origination than a doctor booking."}
              </small>
            </dd>
          </div>
          <div>
            <dt>{isWindow ? "Collection window" : "Time"}</dt>
            <dd>
              {timeRange(event)}
              {isWindow && <small>A window, not a fixed minute — arrive any time inside it.</small>}
            </dd>
          </div>
          <div>
            <dt>{isFollowUp ? "Action needed" : "Tests"}</dt>
            <dd>{event.tests}</dd>
          </div>
          <div>
            <dt>Where</dt>
            <dd>
              <span className="cal-dr-site">
                <Pin size={13} variant="stroke" aria-hidden />
                {event.site}
              </span>
            </dd>
          </div>
          {event.doctorShare && (
            <div>
              <dt>Your share (per line)</dt>
              <dd>{event.doctorShare}</dd>
            </div>
          )}
        </dl>

        {/* note */}
        <p className="cal-dr-note">
          <Tube size={14} variant="stroke" aria-hidden />
          {event.note}
        </p>

        {/* visit state track — §37.3 */}
        {!isFollowUp && (
          <div className="cal-dr-track" aria-label="Visit progress">
            <p className="cal-eyebrow">Visit progress</p>
            <ol>
              {TRACK.map((s, i) => {
                const meta = STATE_META[s];
                const done = i < currentIndex || (i === currentIndex && event.state === "completed");
                const active = i === currentIndex && event.state !== "completed";
                const StepIcon = done ? Check : meta.Icon;
                return (
                  <li key={s} className={cx("cal-step", done && "is-done", active && "is-active")}>
                    <span className="cal-step-ic" aria-hidden>
                      <StepIcon size={12} variant="stroke" />
                    </span>
                    <span className="cal-step-label">{meta.label}</span>
                  </li>
                );
              })}
            </ol>
            <p className="cal-dr-track-why">
              <Warning size={13} variant="stroke" aria-hidden />
              Advancing the visit never changes the booking or the economic split — those are
              separate records.
            </p>
          </div>
        )}
      </div>
    </Drawer>
  );
}

export default CalendarView;
