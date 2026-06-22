"use client";

/* CalendarView — the ONE availability calendar for the clinic day.

   This is the single shared time ledger (Layer 1). Anything that consumes a
   person, room, video channel or PSC capacity is an event here — patient visits
   (in-person + telehealth, one appointment class differing only by modality),
   in-clinic lab collections, and non-patient rep visits. It is NOT "every
   healthcare object with a date": booking lifecycle (external PSC orders) lives
   in Bookings, follow-up reminders live in the worklist — neither blocks time,
   so neither pollutes the grid.

   Three layers, one source of truth for time:
   • Layer 1 (here) — the time grid + type filters (All / Patient visits /
     Telehealth / Lab collection / Non-patient).
   • Layer 2 — click an event → its workflow runs in the drawer; the workflow
     differs by type (visit: check-in→consult→complete; telehealth: admit→
     consult→wrap-up; collection: check-in→draw→collected; rep visit: log).
   • Layer 3 — the deep tools (live consult room, rep disclosure log, lab
     lifecycle) are launched FROM an event, they are not separate calendars.

   Self-contained prototype: one seeded Phnom Penh clinic day with a live mix of
   types/states, plus a fully-completed yesterday. Local state, sonner toasts. */

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Avatar, Badge, Button, Calendar, Drawer, SegmentedToggle } from "@/components/ui";
import {
  Booking as BookingIcon,
  Calendar as CalendarIcon,
  Check,
  CheckCircle,
  ChevronRight,
  Clock,
  Corporate,
  Pin,
  Plus,
  TeleConsultation,
  Patient as PatientIcon,
  BloodDrop,
  Tube,
} from "@/icons/components";
import type { IconProps } from "@/icons/components";
import { cx } from "@/lib/cx";
import "./CalendarView.css";

type IconCmp = (props: IconProps) => React.ReactElement;
type Tone = "info" | "neutral" | "warning" | "success" | "danger" | "brand";

/* The event kinds that consume capacity. visit + telehealth are the same
   patient-appointment class (modality differs); collection is an in-clinic
   draw; repvisit is non-patient. */
type EventKind = "visit" | "telehealth" | "collection" | "repvisit";

/* The calendar's type filters — one per kind, plus All. */
type FilterKey = "all" | "patient" | "telehealth" | "collection" | "nonpatient";

/* Shared visit/draw lifecycle for patient appointments + collections. Rep
   visits sit outside it (they are logged, not progressed through service). */
type VisitState = "created" | "checked_in" | "in_service" | "completed";

type Origin = "doctor" | "walkin";

type ClinicEvent = {
  id: string;
  kind: EventKind;
  /* minutes from midnight; a collection is a WINDOW (end > start), point events end === start */
  start: number;
  end: number;
  /* for patient/collection: patient name; for repvisit: rep name */
  title: string;
  initials: string;
  /* for patient/collection: identity line; for repvisit: company */
  meta: string;
  bookingCode?: string;
  origin: Origin;
  /* for patient/collection: tests/reason; for repvisit: products/purpose */
  detail: string;
  site: string;
  state: VisitState;
  note: string;
};

/* ---- per-kind presentation ------------------------------------------------ */

const KIND_META: Record<EventKind, { label: string; tone: Tone; filter: FilterKey; Icon: IconCmp }> = {
  visit: { label: "Patient visit", tone: "brand", filter: "patient", Icon: PatientIcon },
  telehealth: { label: "Telehealth", tone: "neutral", filter: "telehealth", Icon: TeleConsultation },
  collection: { label: "Lab collection", tone: "info", filter: "collection", Icon: BloodDrop },
  repvisit: { label: "Rep visit", tone: "warning", filter: "nonpatient", Icon: Corporate },
};

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "patient", label: "Patient visits" },
  { key: "telehealth", label: "Telehealth" },
  { key: "collection", label: "Lab collection" },
  { key: "nonpatient", label: "Non-patient" },
];

/* Shared lifecycle visuals; labels are kind-flavoured so each event reads in
   its own language (a draw is "Collected", a consult is "Completed"). */
const STATE_TONE: Record<VisitState, Tone> = {
  created: "neutral",
  checked_in: "info",
  in_service: "info",
  completed: "success",
};
const STATE_ICON: Record<VisitState, IconCmp> = {
  created: BookingIcon,
  checked_in: Pin,
  in_service: Clock,
  completed: CheckCircle,
};
const STATE_LABEL: Record<EventKind, Record<VisitState, string>> = {
  visit: { created: "Booked", checked_in: "Checked in", in_service: "In consult", completed: "Completed" },
  telehealth: { created: "Scheduled", checked_in: "Waiting room", in_service: "In consult", completed: "Completed" },
  collection: { created: "Booked", checked_in: "Checked in", in_service: "Drawing", completed: "Collected" },
  repvisit: { created: "Scheduled", checked_in: "Scheduled", in_service: "Scheduled", completed: "Logged" },
};

const NEXT_STATE: Partial<Record<VisitState, VisitState>> = {
  created: "checked_in",
  checked_in: "in_service",
  in_service: "completed",
};
const NEXT_LABEL: Record<EventKind, Partial<Record<VisitState, string>>> = {
  visit: { created: "Check in", checked_in: "Start consult", in_service: "Complete visit" },
  telehealth: { created: "Admit to consult", checked_in: "Start consult", in_service: "End & wrap up" },
  collection: { created: "Check in", checked_in: "Start draw", in_service: "Mark collected" },
  repvisit: {},
};

function stateBadge(ev: ClinicEvent): { label: string; tone: Tone; Icon: IconCmp } {
  if (ev.kind === "repvisit") {
    return { label: STATE_LABEL.repvisit[ev.state], tone: "neutral", Icon: Corporate };
  }
  return { label: STATE_LABEL[ev.kind][ev.state], tone: STATE_TONE[ev.state], Icon: STATE_ICON[ev.state] };
}

/* ---- time helpers (deterministic, no Date.now in fixtures) ---------------- */

function fmt(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  const period = h < 12 ? "am" : "pm";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m.toString().padStart(2, "0")}${period}`;
}
function timeRange(ev: ClinicEvent): string {
  return ev.end > ev.start ? `${fmt(ev.start)} – ${fmt(ev.end)}` : fmt(ev.start);
}

/* ---- seeded clinic days — Kura cabinet, Toul Kork, Phnom Penh -------------- */

const TODAY = new Date(2026, 5, 21);
const YESTERDAY = new Date(2026, 5, 20);

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}
const TODAY_KEY = dayKey(TODAY);
const YESTERDAY_KEY = dayKey(YESTERDAY);

/* A live mix across all five filters, with one deliberate overlap (telehealth
   9:30 vs collection 9:25–9:55 — different rooms, packed side-by-side). */
const TODAY_EVENTS: ClinicEvent[] = [
  {
    id: "ev-1",
    kind: "collection",
    start: 8 * 60,
    end: 8 * 60 + 30,
    title: "Sokha Chann",
    initials: "SC",
    meta: "F · 54 · NID verified",
    bookingCode: "FZ-38245",
    origin: "doctor",
    detail: "HbA1c, Lipid panel, Creatinine",
    site: "Clinic draw — Dr. Phong's cabinet",
    state: "created",
    note: "Fasting draw. Patient confirmed she fasted from 9pm.",
  },
  {
    id: "ev-2",
    kind: "collection",
    start: 8 * 60 + 45,
    end: 9 * 60 + 15,
    title: "Dara Pich",
    initials: "DP",
    meta: "M · 61 · NID verified",
    bookingCode: "FZ-38251",
    origin: "doctor",
    detail: "eGFR, Urine ACR, Potassium",
    site: "Clinic draw — Dr. Phong's cabinet",
    state: "checked_in",
    note: "CKD follow-up. Draw at the cabinet, tubes couriered on route PP-04.",
  },
  {
    id: "ev-3",
    kind: "telehealth",
    start: 9 * 60 + 30,
    end: 9 * 60 + 50,
    title: "Mealea Sok",
    initials: "MS",
    meta: "F · 33 · phone verified",
    bookingCode: "TC-10477",
    origin: "doctor",
    detail: "Thyroid review — TSH results consult",
    site: "Video",
    state: "created",
    note: "Reviewing TSH that came back last week. No draw needed.",
  },
  {
    id: "ev-8",
    kind: "collection",
    start: 9 * 60 + 25,
    end: 9 * 60 + 55,
    title: "Pisey Ouk",
    initials: "PO",
    meta: "F · 41 · NID verified",
    bookingCode: "FZ-38258",
    origin: "doctor",
    detail: "Fasting glucose, HbA1c",
    site: "Clinic draw — Dr. Phong's cabinet",
    state: "created",
    note: "Concurrent with the 9:30 telehealth — second phlebotomist covers this draw.",
  },
  {
    id: "ev-5",
    kind: "visit",
    start: 10 * 60 + 15,
    end: 10 * 60 + 45,
    title: "Visal Nuon",
    initials: "VN",
    meta: "M · 47 · NID verified",
    bookingCode: "VS-20140",
    origin: "doctor",
    detail: "Anemia follow-up — review CBC, examine",
    site: "Consult room 2",
    state: "in_service",
    note: "In-person review of last week's CBC. Exam in progress.",
  },
  {
    id: "ev-6",
    kind: "visit",
    start: 11 * 60,
    end: 11 * 60 + 20,
    title: "Chanthou Meas",
    initials: "CM",
    meta: "F · 29 · provisional",
    origin: "walkin",
    detail: "Walk-in — fever, requests assessment",
    site: "Consult room 1",
    state: "checked_in",
    note: "Walk-in, no pre-booking. Different origination than a doctor booking.",
  },
  {
    id: "ev-9",
    kind: "repvisit",
    start: 12 * 60,
    end: 12 * 60 + 30,
    title: "Maly Chea",
    initials: "MC",
    meta: "Sanofi Cambodia",
    origin: "doctor",
    detail: "Sample drop · Atorvastatin, Metformin XR",
    site: "Front desk",
    state: "created",
    note: "Quarterly detailing call. Log samples received for compliance.",
  },
  {
    id: "ev-6b",
    kind: "collection",
    start: 13 * 60 + 30,
    end: 14 * 60,
    title: "Rithy Chea",
    initials: "RC",
    meta: "M · 58 · NID verified",
    bookingCode: "FZ-38272",
    origin: "doctor",
    detail: "PSA, Testosterone",
    site: "Clinic draw — Dr. Phong's cabinet",
    state: "completed",
    note: "Draw done at 13:42. Tubes accepted at the lab.",
  },
];

const YESTERDAY_EVENTS: ClinicEvent[] = [
  {
    id: "yd-1",
    kind: "collection",
    start: 8 * 60 + 30,
    end: 9 * 60,
    title: "Bopha Lim",
    initials: "BL",
    meta: "F · 49 · NID verified",
    bookingCode: "FZ-38201",
    origin: "doctor",
    detail: "Lipid panel, ALT/AST",
    site: "Clinic draw — Dr. Phong's cabinet",
    state: "completed",
    note: "Draw done at 08:41. Tubes accepted at the lab.",
  },
  {
    id: "yd-2",
    kind: "telehealth",
    start: 10 * 60,
    end: 10 * 60 + 25,
    title: "Sothea Kim",
    initials: "SK",
    meta: "M · 37 · phone verified",
    bookingCode: "TC-10470",
    origin: "doctor",
    detail: "Hypertension review",
    site: "Video",
    state: "completed",
    note: "Consult ended on time. BP log reviewed.",
  },
  {
    id: "yd-3",
    kind: "visit",
    start: 11 * 60 + 30,
    end: 11 * 60 + 50,
    title: "Nara Soun",
    initials: "NS",
    meta: "M · 52 · provisional",
    origin: "walkin",
    detail: "Walk-in — dressing change",
    site: "Consult room 1",
    state: "completed",
    note: "Walk-in, seen and discharged.",
  },
];

/* ---- day-grid geometry ---------------------------------------------------- */

const DAY_START = 8 * 60;
const DAY_END = 16 * 60;
const HOUR_PX = 84;
const MIN_EVENT_PX = 56;
const NOW_MIN = 11 * 60 + 25;

function topFor(min: number): number {
  return ((min - DAY_START) / 60) * HOUR_PX;
}
function heightFor(ev: ClinicEvent): number {
  return Math.max(((ev.end - ev.start) / 60) * HOUR_PX, MIN_EVENT_PX);
}

type Placed = ClinicEvent & { col: number; cols: number };

function packEvents(list: ClinicEvent[]): Placed[] {
  const sorted = [...list].sort((a, b) => a.start - b.start || a.end - b.end);
  const realEnd = (ev: ClinicEvent) => Math.max(ev.end, ev.start + 1);
  const result: Placed[] = [];
  let cluster: ClinicEvent[] = [];

  const flush = () => {
    if (cluster.length === 0) return;
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

/* ---- week helpers --------------------------------------------------------- */

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function compareDay(a: Date, b: Date): number {
  const da = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const db = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  return da < db ? -1 : da > db ? 1 : 0;
}
function weekDays(d: Date): Date[] {
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  start.setDate(start.getDate() - start.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    return day;
  });
}
const WEEKDAY_ABBR = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function matchesFilter(ev: ClinicEvent, filter: FilterKey): boolean {
  return filter === "all" || KIND_META[ev.kind].filter === filter;
}

/* ---- component ------------------------------------------------------------ */

export function CalendarView({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const [selectedDay, setSelectedDay] = useState<Date>(TODAY);
  const [view, setView] = useState<"day" | "week">("day");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [eventsByDay, setEventsByDay] = useState<Record<string, ClinicEvent[]>>({
    [TODAY_KEY]: TODAY_EVENTS,
    [YESTERDAY_KEY]: YESTERDAY_EVENTS,
  });
  const [openId, setOpenId] = useState<string | null>(null);
  const [advancingId, setAdvancingId] = useState<string | null>(null);

  const eventsForDay = (d: Date): ClinicEvent[] => {
    const list = eventsByDay[dayKey(d)] ?? [];
    return [...list].filter((e) => matchesFilter(e, filter)).sort((a, b) => a.start - b.start);
  };

  const dayEvents = eventsForDay(selectedDay);
  const isToday = sameDay(selectedDay, TODAY);
  const isPast = compareDay(selectedDay, TODAY) < 0;

  const open = openId ? Object.values(eventsByDay).flat().find((e) => e.id === openId) ?? null : null;

  const allDone =
    dayEvents.length > 0 &&
    dayEvents.every((e) => e.state === "completed") &&
    dayEvents.some((e) => e.state === "completed");

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
    const ev = Object.values(eventsByDay).flat().find((e) => e.id === id);
    if (!ev) return;
    const next = NEXT_STATE[ev.state];
    if (!next) return;
    const from = ev.state;
    setAdvancingId(id);
    window.setTimeout(() => {
      commitState(id, next);
      setAdvancingId(null);
      toast.success(`${ev.title} — ${STATE_LABEL[ev.kind][next].toLowerCase()}`, {
        action: { label: "Undo", onClick: () => commitState(id, from) },
      });
    }, 420);
  };

  /* Launch the matching Layer-3 surface from an event. */
  const launchSurface = (ev: ClinicEvent) => {
    if (ev.kind === "telehealth") {
      onNavigate?.("telehealth");
      toast.success(`Opening consult room — ${ev.title}`);
    } else if (ev.kind === "repvisit") {
      onNavigate?.("pharma-calls");
      toast.success(`Opening rep disclosure log — ${ev.title}`);
    }
    setOpenId(null);
  };

  const bookNew = () => {
    toast.success("New event", { description: `Opening the booking flow for ${formatDay(selectedDay)}.` });
  };

  const dayLabel = formatDay(selectedDay);
  const hours = useMemo(() => {
    const out: number[] = [];
    for (let h = DAY_START; h <= DAY_END; h += 60) out.push(h);
    return out;
  }, []);
  const week = useMemo(() => weekDays(selectedDay), [selectedDay]);
  const countFor = (d: Date) => eventsForDay(d).length;

  /* per-filter counts for the chip row (selected day, unfiltered base) */
  const dayBase = (eventsByDay[dayKey(selectedDay)] ?? []);
  const filterCount = (key: FilterKey) =>
    key === "all" ? dayBase.length : dayBase.filter((e) => KIND_META[e.kind].filter === key).length;

  return (
    <div className="cal" aria-label="Calendar">
      <div className="cal-layout">
        {/* ---- left rail: view toggle + mini-calendar + today ---- */}
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
        </aside>

        {/* ---- main: agenda / week ---- */}
        <section className="cal-main" aria-label={`Agenda for ${dayLabel}`}>
          <header className="cal-day-head">
            <div className="cal-day-head-lede">
              <p className="cal-eyebrow">
                {isToday ? "Today" : isPast ? "Past day" : "Selected day"}
                {view === "week" && " · week"}
              </p>
              <h2>{view === "week" ? weekLabel(week) : dayLabel}</h2>
            </div>
            <Button
              intent="primary"
              size="sm"
              leadingIcon={<Plus size={15} variant="stroke" aria-hidden />}
              onClick={bookNew}
            >
              New
            </Button>
          </header>

          {/* type filters — the one set of lanes for the whole calendar */}
          <div className="cal-filters" role="tablist" aria-label="Filter by type">
            {FILTERS.map((f) => {
              const count = filterCount(f.key);
              const tone = f.key === "all" ? null : KIND_META[(Object.keys(KIND_META) as EventKind[]).find((k) => KIND_META[k].filter === f.key)!].tone;
              return (
                <button
                  key={f.key}
                  type="button"
                  role="tab"
                  aria-selected={filter === f.key}
                  className={cx("cal-filter", tone && `tone-${tone}`, filter === f.key && "is-active")}
                  onClick={() => setFilter(f.key)}
                >
                  {tone && <span className="cal-filter-dot" aria-hidden />}
                  {f.label}
                  <span className="cal-filter-count">{count}</span>
                </button>
              );
            })}
          </div>

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
              filtered={filter !== "all"}
              onOpen={setOpenId}
              onBookNew={bookNew}
            />
          )}
        </section>
      </div>

      {open && (
        <EventDrawer
          event={open}
          advancing={advancingId === open.id}
          onClose={() => setOpenId(null)}
          onAdvance={advance}
          onLaunch={launchSurface}
        />
      )}
    </div>
  );
}

function formatDay(d: Date): string {
  const opts: Intl.DateTimeFormatOptions = { weekday: "long", month: "long", day: "numeric" };
  if (d.getMonth() !== TODAY.getMonth() || d.getFullYear() !== TODAY.getFullYear()) opts.year = "numeric";
  return d.toLocaleDateString("en-US", opts);
}
function weekLabel(week: Date[]): string {
  const f = week[0].toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const l = week[6].toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${f} – ${l}`;
}

/* ---- day agenda ----------------------------------------------------------- */

function DayAgenda({
  dayEvents,
  hours,
  isToday,
  isPast,
  allDone,
  dayLabel,
  filtered,
  onOpen,
  onBookNew,
}: {
  dayEvents: ClinicEvent[];
  hours: number[];
  isToday: boolean;
  isPast: boolean;
  allDone: boolean;
  dayLabel: string;
  filtered: boolean;
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
        {filtered ? (
          <>
            <strong>Nothing of this type</strong>
            <span>No events match this filter on {dayLabel}.</span>
          </>
        ) : isPast ? (
          <>
            <strong>No visits were scheduled</strong>
            <span>Nothing was booked for {dayLabel}. Past days are read-only.</span>
          </>
        ) : (
          <>
            <strong>Nothing is booked yet</strong>
            <span>No events for {dayLabel}. Book one and it appears here as a time-ordered agenda.</span>
            <Button intent="secondary" size="sm" leadingIcon={<Plus size={15} variant="stroke" aria-hidden />} onClick={onBookNew}>
              Book an event
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
          All events completed for {dayLabel}.
        </p>
      )}
      <div className={cx("cal-grid", allDone && "is-alldone")}>
        <div className="cal-grid-lines" aria-hidden>
          {hours.map((h) => (
            <div key={h} className="cal-hour" style={{ top: topFor(h) }}>
              <span className="cal-hour-label">{fmt(h)}</span>
              <span className="cal-hour-line" />
            </div>
          ))}
        </div>
        {isToday && NOW_MIN >= DAY_START && NOW_MIN <= DAY_END && (
          <div className="cal-now" style={{ top: topFor(NOW_MIN) }} aria-label="Current time">
            <span className="cal-now-dot" aria-hidden />
            <span className="cal-now-time">{fmt(NOW_MIN)}</span>
          </div>
        )}
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
  const badge = stateBadge(ev);
  const KindIcon = kind.Icon;
  const BadgeIcon = badge.Icon;
  /* only a lab collection is a true WINDOW (arrive any time inside); a consult,
     telehealth slot or rep call is a fixed appointment, not a window */
  const isWindow = ev.kind === "collection" && ev.end > ev.start;
  const isPoint = ev.end === ev.start;
  const isWalkin = ev.origin === "walkin";
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
        isWalkin && "is-walkin",
        isPoint && "is-point",
        ev.cols > 1 && "is-packed",
        ev.state === "completed" && "is-done",
      )}
      style={style}
      onClick={() => onOpen(ev.id)}
      aria-label={`${kind.label} for ${ev.title}, ${timeRange(ev)}, ${badge.label}`}
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
        <span className="cal-event-patient">{ev.title}</span>
        <span className="cal-event-tests">{ev.detail}</span>
      </span>
      <span className="cal-event-badge">
        <Badge appearance="subtle" tone={badge.tone} icon={<BadgeIcon size={11} variant="stroke" />}>
          {badge.label}
        </Badge>
      </span>
    </button>
  );
}

/* ---- week view ------------------------------------------------------------ */

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

      <ol className="cal-week-days">
        {week.map((d, i) => {
          const list = eventsForDay(d);
          const today = sameDay(d, TODAY);
          const past = compareDay(d, TODAY) < 0;
          return (
            <li key={dayKey(d)} className={cx("cal-wday", today && "is-today")}>
              <button type="button" className="cal-wday-head" onClick={() => onPickDay(d)} aria-label={`Open ${WEEKDAY_ABBR[i]} ${d.getDate()}`}>
                <span className="cal-wday-dow">{WEEKDAY_ABBR[i]}</span>
                <span className="cal-wday-date">{d.getDate()}</span>
                {list.length > 0 && <span className="cal-wday-count">{list.length}</span>}
                <ChevronRight size={15} variant="stroke" aria-hidden className="cal-wday-chev" />
              </button>
              {list.length === 0 ? (
                <p className="cal-wday-empty">{past ? "No events" : "Nothing booked"}</p>
              ) : (
                <ul className="cal-wday-list">
                  {list.map((ev) => {
                    const kind = KIND_META[ev.kind];
                    const badge = stateBadge(ev);
                    const KindIcon = kind.Icon;
                    const BadgeIcon = badge.Icon;
                    return (
                      <li key={ev.id}>
                        <button
                          type="button"
                          className={cx("cal-wrow", `tone-${kind.tone}`, ev.origin === "walkin" && "is-walkin", ev.state === "completed" && "is-done")}
                          onClick={() => onOpen(ev.id)}
                          aria-label={`${kind.label} for ${ev.title}, ${timeRange(ev)}, ${badge.label}`}
                        >
                          <span className="cal-wrow-time">{timeRange(ev)}</span>
                          <span className="cal-wrow-ic" aria-hidden>
                            <KindIcon size={13} variant="stroke" />
                          </span>
                          <span className="cal-wrow-patient">{ev.title}</span>
                          <Badge appearance="subtle" tone={badge.tone} icon={<BadgeIcon size={11} variant="stroke" />}>
                            {badge.label}
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

/* ---- drawer (Layer 2 — the per-type workflow) ----------------------------- */

function EventDrawer({
  event,
  advancing,
  onClose,
  onAdvance,
  onLaunch,
}: {
  event: ClinicEvent;
  advancing: boolean;
  onClose: () => void;
  onAdvance: (id: string) => void;
  onLaunch: (ev: ClinicEvent) => void;
}) {
  const kind = KIND_META[event.kind];
  const badge = stateBadge(event);
  const BadgeIcon = badge.Icon;
  const KindIcon = kind.Icon;
  const next = NEXT_STATE[event.state];
  const isWindow = event.kind === "collection" && event.end > event.start;
  const isRep = event.kind === "repvisit";
  const isTele = event.kind === "telehealth";
  const canLaunch = isTele || isRep;

  const TRACK: VisitState[] = ["created", "checked_in", "in_service", "completed"];
  const currentIndex = TRACK.indexOf(event.state);

  /* Footer = the one primary workflow action for this event type. */
  const footer = isRep ? (
    <Button intent="primary" size="md" onClick={() => onLaunch(event)} trailingIcon={<ChevronRight size={16} variant="stroke" aria-hidden />}>
      Log this visit
    </Button>
  ) : next ? (
    <div className="cal-foot">
      {isTele && (
        <Button intent="secondary" size="md" onClick={() => onLaunch(event)} leadingIcon={<TeleConsultation size={15} variant="stroke" aria-hidden />}>
          Open consult room
        </Button>
      )}
      <Button
        intent="primary"
        size="md"
        loading={advancing}
        trailingIcon={advancing ? undefined : <ChevronRight size={16} variant="stroke" aria-hidden />}
        onClick={() => onAdvance(event.id)}
      >
        {advancing ? "Saving…" : NEXT_LABEL[event.kind][event.state]}
      </Button>
    </div>
  ) : (
    <div className="cal-foot--done">
      <CheckCircle size={16} variant="stroke" aria-hidden />
      <span>{isTele ? "Consult completed." : event.kind === "collection" ? "Specimen collected." : "Visit completed."}</span>
    </div>
  );

  return (
    <Drawer
      open
      onClose={onClose}
      width={460}
      title={event.title}
      subtitle={
        <span className="cal-dr-sub">
          <KindIcon size={13} variant="stroke" aria-hidden />
          {kind.label} · {timeRange(event)}
        </span>
      }
      footer={footer}
    >
      <div className="cal-dr">
        <div className="cal-dr-patient">
          <Avatar initials={event.initials} name={event.title} size="sm" />
          <span>
            <strong>{event.title}</strong>
            <small>{event.meta}</small>
          </span>
          <Badge appearance="subtle" tone={badge.tone} icon={<BadgeIcon size={11} variant="stroke" />}>
            {badge.label}
          </Badge>
        </div>

        <dl className="cal-dr-facts">
          {isRep ? (
            <div>
              <dt>Company</dt>
              <dd>{event.meta}</dd>
            </div>
          ) : (
            <div>
              <dt>Booking</dt>
              <dd>{event.bookingCode ? <span className="cal-mono">{event.bookingCode}</span> : "No booking — walk-in"}</dd>
            </div>
          )}
          <div>
            <dt>{isWindow ? "Window" : "Time"}</dt>
            <dd>{timeRange(event)}</dd>
          </div>
          <div>
            <dt>{isRep ? "Purpose" : event.kind === "collection" ? "Tests" : "Reason"}</dt>
            <dd>{event.detail}</dd>
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
        </dl>

        <p className="cal-dr-note">
          <Tube size={14} variant="stroke" aria-hidden />
          {event.note}
        </p>

        {!isRep && (
          <div className="cal-dr-track" aria-label="Progress">
            <p className="cal-eyebrow">{event.kind === "collection" ? "Collection" : "Visit"} progress</p>
            <ol>
              {TRACK.map((s, i) => {
                const done = i < currentIndex || (i === currentIndex && event.state === "completed");
                const active = i === currentIndex && event.state !== "completed";
                const StepIcon = done ? Check : STATE_ICON[s];
                return (
                  <li key={s} className={cx("cal-step", done && "is-done", active && "is-active")}>
                    <span className="cal-step-ic" aria-hidden>
                      <StepIcon size={12} variant="stroke" />
                    </span>
                    <span className="cal-step-label">{STATE_LABEL[event.kind][s]}</span>
                  </li>
                );
              })}
            </ol>
          </div>
        )}

        {isRep && (
          <p className="cal-dr-track-why">
            <BookingIcon size={13} variant="stroke" aria-hidden />
            Logging opens the append-only disclosure record. Samples received post to Dispensary stock.
          </p>
        )}
      </div>
    </Drawer>
  );
}

export default CalendarView;
