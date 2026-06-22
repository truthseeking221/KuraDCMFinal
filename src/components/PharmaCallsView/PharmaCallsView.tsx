"use client";

/* PharmaCallsView — pharmaceutical-rep detailing log & schedule for the cabinet.
   A transparency / compliance surface (Sunshine-Act-style disclosure of industry
   interactions). This is clinic-business record-keeping, not promotion: the tone
   is neutral and administrative and it invents NO efficacy claims.

   Implements mastersource clinic-ops intent (transparency + compliance) and the
   Dispensary-samples link: recording samples received here is an immutable log
   entry, and the quantity is acknowledged as added to Dispensary stock via a
   cross-surface toast (this page cannot mutate the Dispensary directly).

   Sections:
     1. Upcoming rep visits — scheduled interactions (rep, company, products, when, purpose).
     2. Call log — completed interactions (company, products, samples qty, duration, note),
        filterable + sortable by company, expandable to read the note + full sample lots.
        Logging samples acknowledges Dispensary stock. Exportable for compliance review.
     3. Transparency summary — samples received YTD, declared interactions this quarter,
        and a calm "available for compliance review" note.

   Self-contained: local fixtures + local state, no backend, deterministic timestamps. */

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Badge,
  Button,
  Drawer,
  Input,
  SegmentedToggle,
  Select,
  Textarea,
} from "@/components/ui";
import {
  Calendar as CalendarIcon,
  Check as CheckIcon,
  CheckShield as ShieldIcon,
  ChevronDown as ChevronDownIcon,
  ChevronRight as ChevronRightIcon,
  Clock as ClockIcon,
  Info as InfoIcon,
  Note as NoteIcon,
  Pill as PillIcon,
  Plus as PlusIcon,
  Receipt as ReceiptIcon,
  Share as ShareIcon,
  SortDescending as SortIcon,
  Warning as WarningIcon,
} from "@/icons/components";
import "./PharmaCallsView.css";

/* ---- types ------------------------------------------------------------- */

type VisitPurpose = "Detailing" | "Sample drop" | "Formulary update" | "Introduction";

type UpcomingVisit = {
  id: string;
  rep: string;
  company: string;
  products: string;
  date: string; // display, deterministic
  time: string;
  purpose: VisitPurpose;
  sortKey: number; // chronological order (lower = sooner); date string is display-only
};

type SampleLot = {
  product: string;
  qty: number;
};

type CallEntry = {
  id: string;
  company: string;
  rep: string;
  products: string;
  samples: SampleLot[];
  durationMin: number; // 0 = not recorded
  note: string; // "" = not recorded
  loggedOn: string; // display
  sortKey: number; // for date sort (higher = more recent)
};

/* ---- "today" — a single fixed clock for the whole surface ---------------- */
/* Everything time-derived (sort-key roll-forward, past-date guard, quarter
   filtering, the log timestamp) reads from this one constant so the prototype
   stays deterministic and internally consistent. Today is Jun 21, 2026 (Q2). */
const TODAY = { year: 2026, month: 6, day: 21 } as const;
const TODAY_KEY = TODAY.year * 10000 + TODAY.month * 100 + TODAY.day; // 20260621
const TODAY_MMDD = TODAY.month * 100 + TODAY.day; // 621
const TODAY_DISPLAY = "Jun 21, 2026 · 14:20";

/* Quarter the fixed "today" falls in (Q2 = Apr–Jun 2026). Used to count
   interactions/samples "this quarter" honestly rather than over the whole log. */
const QUARTER = Math.floor((TODAY.month - 1) / 3); // 0-indexed; Q2 -> 1
function isThisQuarter(sortKey: number): boolean {
  const year = Math.floor(sortKey / 10000);
  const month = Math.floor((sortKey % 10000) / 100);
  if (year !== TODAY.year) return false;
  return Math.floor((month - 1) / 3) === QUARTER;
}

/* ---- fixtures ---------------------------------------------------------- */

const INITIAL_UPCOMING: UpcomingVisit[] = [
  {
    id: "v-1",
    rep: "Sopheak Meng",
    company: "Sanofi",
    products: "Lantus, Toujeo",
    date: "Mon, Jun 23",
    time: "10:30",
    purpose: "Detailing",
    sortKey: 20260623,
  },
  {
    id: "v-2",
    rep: "Vichea Phon",
    company: "Novo Nordisk",
    products: "Ozempic",
    date: "Wed, Jun 25",
    time: "14:00",
    purpose: "Formulary update",
    sortKey: 20260625,
  },
  {
    id: "v-3",
    rep: "Chanlina Sok",
    company: "Servier",
    products: "Diamicron MR",
    date: "Fri, Jun 27",
    time: "09:15",
    purpose: "Sample drop",
    sortKey: 20260627,
  },
];

const INITIAL_LOG: CallEntry[] = [
  {
    id: "c-1",
    company: "AstraZeneca",
    rep: "Dara Pich",
    products: "Forxiga",
    samples: [{ product: "Forxiga 10mg", qty: 14 }],
    durationMin: 20,
    note: "Reviewed dosing card. Left starter packs for clinic reference.",
    loggedOn: "Jun 18, 2026 · 11:05",
    sortKey: 20260618,
  },
  {
    id: "c-2",
    company: "Novo Nordisk",
    rep: "Vichea Phon",
    products: "Ozempic, Victoza",
    samples: [],
    durationMin: 15,
    note: "Coverage update only. No samples taken.",
    loggedOn: "Jun 12, 2026 · 15:40",
    sortKey: 20260612,
  },
  {
    id: "c-3",
    company: "Sanofi",
    rep: "Sopheak Meng",
    products: "Lantus",
    samples: [{ product: "Lantus SoloStar", qty: 6 }],
    durationMin: 25,
    note: "Pen device walkthrough for new coordinator.",
    loggedOn: "Jun 5, 2026 · 09:30",
    sortKey: 20260605,
  },
  {
    id: "c-4",
    company: "Servier",
    rep: "Chanlina Sok",
    products: "Diamicron MR",
    samples: [{ product: "Diamicron MR 60mg", qty: 30 }],
    durationMin: 18,
    note: "Patient leaflets restocked. Discussed gliclazide titration.",
    loggedOn: "May 28, 2026 · 13:20",
    sortKey: 20260528,
  },
];

const PURPOSE_OPTIONS: VisitPurpose[] = ["Detailing", "Sample drop", "Formulary update", "Introduction"];

/* Samples received before this prototype session — folded into the YTD total so
   the transparency figure reads like a real running count, not just this list. */
const SAMPLES_PRIOR_YTD = 92;

/* A sane upper bound on a single sample lot — a typo like 99999 must not sail
   into the YTD/Dispensary figure unchallenged. */
const MAX_LOT_QTY = 999;

/* ---- helpers ----------------------------------------------------------- */

function sampleTotal(samples: SampleLot[]): number {
  return samples.reduce((sum, lot) => sum + lot.qty, 0);
}

function samplesLabel(samples: SampleLot[]): string {
  const total = sampleTotal(samples);
  if (total === 0) return "None taken";
  return samples.map((lot) => `${lot.product} ×${lot.qty}`).join(", ");
}

function durationLabel(durationMin: number): string {
  return durationMin > 0 ? `${durationMin} min` : "—";
}

type SortMode = "recent" | "company";

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

type ParsedDate =
  | { ok: true; sortKey: number; display: string }
  | { ok: false; reason: "unparseable" | "past" };

/* Parse a free-text display date such as "Mon, Jun 30" or "Jun 30" into a
   chronological sort key (YYYYMMDD). A month/day earlier in the year than TODAY
   is rolled to next year so a "Jan 5" scheduled now sorts AFTER this year's
   remaining visits — not into the past where it could wrongly become next-up.
   A date on/before today (this year) is rejected as past so the compliance
   "Next:" value can never point backwards. Unparseable input is rejected too. */
function parseVisitDate(displayDate: string): ParsedDate {
  const match = displayDate.toLowerCase().match(/([a-z]{3})[a-z]*\s+(\d{1,2})/);
  if (!match) return { ok: false, reason: "unparseable" };
  const month = MONTHS[match[1]];
  const day = Number(match[2]);
  if (!month || day < 1 || day > 31) return { ok: false, reason: "unparseable" };

  const mmdd = month * 100 + day;
  // Same year if still ahead of today; otherwise it belongs to next year.
  const year = mmdd > TODAY_MMDD ? TODAY.year : TODAY.year + 1;
  if (year === TODAY.year && mmdd <= TODAY_MMDD) {
    // Defensive — the branch above keeps this from firing, but guard anyway.
    return { ok: false, reason: "past" };
  }
  const sortKey = year * 10000 + month * 100 + day;
  const normalized = `${MONTH_NAMES[month - 1]} ${day}`;
  return { ok: true, sortKey, display: normalized };
}

function csvCell(value: string): string {
  // Quote and escape so commas / quotes / newlines in notes survive.
  return `"${value.replace(/"/g, '""')}"`;
}

function downloadTextFile(filename: string, content: string, mime: string) {
  if (typeof window === "undefined") return;
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* ---- component --------------------------------------------------------- */

export function PharmaCallsView() {
  const [upcoming, setUpcoming] = useState<UpcomingVisit[]>(INITIAL_UPCOMING);
  const [log, setLog] = useState<CallEntry[]>(INITIAL_LOG);

  const [companyFilter, setCompanyFilter] = useState<string>("all");
  const [sortMode, setSortMode] = useState<SortMode>("recent");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  /* When a scheduled visit is "logged", we prefill the log drawer from it and
     drop it from the upcoming list once saved. */
  const [logFrom, setLogFrom] = useState<UpcomingVisit | null>(null);

  const companies = useMemo(() => {
    const set = new Set<string>();
    log.forEach((entry) => set.add(entry.company));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [log]);

  const visibleLog = useMemo(() => {
    const filtered =
      companyFilter === "all" ? log : log.filter((entry) => entry.company === companyFilter);
    const sorted = [...filtered].sort((a, b) =>
      sortMode === "company"
        ? a.company.localeCompare(b.company) || b.sortKey - a.sortKey
        : b.sortKey - a.sortKey,
    );
    return sorted;
  }, [log, companyFilter, sortMode]);

  /* Transparency figures — derived, never hand-maintained. The "this quarter"
     figures count only entries whose interaction date falls in TODAY's quarter,
     so the label is a promise the logic actually keeps. */
  const samplesQuarter = useMemo(
    () =>
      log.reduce(
        (sum, entry) => (isThisQuarter(entry.sortKey) ? sum + sampleTotal(entry.samples) : sum),
        0,
      ),
    [log],
  );
  const samplesYtd = useMemo(
    () => SAMPLES_PRIOR_YTD + log.reduce((sum, entry) => sum + sampleTotal(entry.samples), 0),
    [log],
  );
  const interactionsThisQuarter = useMemo(
    () => log.filter((entry) => isThisQuarter(entry.sortKey)).length,
    [log],
  );
  const declaredCompanies = companies.length;

  /* ---- actions --------------------------------------------------------- */

  function handleSchedule(visit: UpcomingVisit) {
    setUpcoming((list) => [...list, visit].sort((a, b) => a.sortKey - b.sortKey));
    setScheduleOpen(false);
    toast.success("Visit scheduled", {
      description: `${visit.rep} · ${visit.company} · ${visit.date}`,
    });
  }

  function handleLogCall(entry: CallEntry, fromVisit?: UpcomingVisit) {
    setLog((list) => [entry, ...list]);
    if (fromVisit) {
      setUpcoming((list) => list.filter((v) => v.id !== fromVisit.id));
    }
    setLogOpen(false);
    setLogFrom(null);

    /* If the active company filter would hide the row we just added, clear it so
       the action visibly lands instead of silently vanishing behind the filter. */
    const hiddenByFilter = companyFilter !== "all" && entry.company !== companyFilter;
    if (hiddenByFilter) setCompanyFilter("all");

    /* Single-shot undo: re-inserts the cleared visit (if any) and removes the
       just-added log row, so "Log this visit" can't lose a scheduled row by
       mistake on an append-only surface. */
    const undo = () => {
      setLog((list) => list.filter((e) => e.id !== entry.id));
      if (fromVisit) {
        setUpcoming((list) => [...list, fromVisit].sort((a, b) => a.sortKey - b.sortKey));
      }
      setExpandedId((id) => (id === entry.id ? null : id));
      toast.success("Log entry reverted", {
        description: fromVisit ? `${fromVisit.company} restored to upcoming visits` : entry.company,
      });
    };

    const total = sampleTotal(entry.samples);
    if (total > 0) {
      /* Cross-surface acknowledgement: this page cannot mutate Dispensary stock,
         so we record the immutable log row here and toast the stock effect. */
      toast.success("Call logged", {
        description: `${total} sample${total === 1 ? "" : "s"} added to Dispensary stock`,
        action: { label: "Undo", onClick: undo },
      });
    } else {
      toast.success("Call logged", {
        description: `${entry.company} · no samples taken`,
        action: { label: "Undo", onClick: undo },
      });
    }
  }

  function openLogForVisit(visit: UpcomingVisit) {
    setLogFrom(visit);
    setLogOpen(true);
  }

  function openBlankLog() {
    setLogFrom(null);
    setLogOpen(true);
  }

  function exportLog() {
    const header = ["Logged", "Company", "Rep", "Products", "Samples", "Sample units", "Duration (min)", "Note"];
    const rows = log.map((entry) =>
      [
        entry.loggedOn,
        entry.company,
        entry.rep,
        entry.products,
        samplesLabel(entry.samples),
        String(sampleTotal(entry.samples)),
        entry.durationMin > 0 ? String(entry.durationMin) : "",
        entry.note,
      ]
        .map(csvCell)
        .join(","),
    );
    downloadTextFile("kura-pharma-call-log.csv", [header.map(csvCell).join(","), ...rows].join("\n"), "text/csv");
    toast.success("Compliance log exported", { description: `${log.length} interaction${log.length === 1 ? "" : "s"} · CSV` });
  }

  return (
    <div className="pharma" aria-label="Pharma calls">
      {/* Intro band — frame the surface as record-keeping, set the two actions. */}
      <header className="pharma-intro">
        <div className="pharma-intro-copy">
          <p className="pharma-eyebrow">Clinic operations · transparency</p>
          <p className="pharma-intro-sub">
            A record of every pharmaceutical-rep interaction at this cabinet — scheduled visits,
            completed calls, and samples received. Kept for compliance, not promotion.
          </p>
        </div>
        <div className="pharma-intro-actions">
          <Button
            intent="outline"
            size="sm"
            leadingIcon={<CalendarIcon size={16} variant="stroke" />}
            onClick={() => setScheduleOpen(true)}
          >
            Schedule a call
          </Button>
          <Button
            intent="primary"
            size="sm"
            leadingIcon={<PlusIcon size={16} variant="stroke" />}
            onClick={openBlankLog}
          >
            Log completed call
          </Button>
        </div>
      </header>

      {/* ---- Transparency summary ---------------------------------------- */}
      <section className="pharma-summary" aria-label="Transparency summary">
        <div className="pharma-stat">
          <span className="pharma-stat-ic" aria-hidden>
            <PillIcon size={18} variant="stroke" />
          </span>
          <span className="pharma-stat-body">
            <strong>{samplesYtd}</strong>
            <span>Samples received YTD</span>
            <small>{samplesQuarter} logged this quarter</small>
          </span>
        </div>
        <div className="pharma-stat">
          <span className="pharma-stat-ic" aria-hidden>
            <NoteIcon size={18} variant="stroke" />
          </span>
          <span className="pharma-stat-body">
            <strong>{interactionsThisQuarter}</strong>
            <span>Declared interactions, this quarter</span>
            <small>Across {declaredCompanies} {declaredCompanies === 1 ? "company" : "companies"}</small>
          </span>
        </div>
        <div className="pharma-stat">
          <span className="pharma-stat-ic" aria-hidden>
            <CalendarIcon size={18} variant="stroke" />
          </span>
          <span className="pharma-stat-body">
            <strong>{upcoming.length}</strong>
            <span>Visits scheduled</span>
            <small>Next: {upcoming[0] ? `${upcoming[0].date} · ${upcoming[0].company}` : "none"}</small>
          </span>
        </div>
        <p className="pharma-summary-note">
          <ShieldIcon size={14} variant="stroke" aria-hidden />
          This log is available for compliance review. Entries are append-only and carry the
          interaction date.
        </p>
      </section>

      {/* ---- Upcoming rep visits ---------------------------------------- */}
      <section className="pharma-section" aria-label="Upcoming rep visits">
        <div className="pharma-section-head">
          <h2>
            Upcoming rep visits
            {upcoming.length > 0 && (
              <Badge appearance="subtle" tone="neutral" className="pharma-count">
                {upcoming.length}
              </Badge>
            )}
          </h2>
          <Button
            intent="secondary"
            size="sm"
            leadingIcon={<CalendarIcon size={15} variant="stroke" />}
            onClick={() => setScheduleOpen(true)}
          >
            Schedule
          </Button>
        </div>

        {upcoming.length === 0 ? (
          <div className="pharma-empty">
            <span className="pharma-empty-ic" aria-hidden>
              <CalendarIcon size={18} variant="stroke" />
            </span>
            <span>No visits scheduled. Add one to keep the disclosure log current.</span>
            <Button intent="outline" size="sm" onClick={() => setScheduleOpen(true)}>
              Schedule a call
            </Button>
          </div>
        ) : (
          <ul className="pharma-upcoming">
            {upcoming.map((visit) => (
              <li
                className="pharma-upcoming-row"
                key={visit.id}
                aria-label={`Visit, ${visit.company}, ${visit.date} at ${visit.time}, ${visit.purpose}`}
              >
                <span className="pharma-when">
                  <strong>{visit.date}</strong>
                  <small>{visit.time}</small>
                </span>
                <span className="pharma-upcoming-copy">
                  <strong>
                    {visit.company}
                    <Badge appearance="subtle" tone="neutral" className="pharma-purpose">
                      {visit.purpose}
                    </Badge>
                  </strong>
                  <span className="pharma-rep">{visit.rep}</span>
                  <span className="pharma-products">{visit.products}</span>
                </span>
                <Button
                  className="pharma-row-cta"
                  intent="secondary"
                  size="sm"
                  trailingIcon={<ChevronRightIcon size={16} variant="stroke" />}
                  onClick={() => openLogForVisit(visit)}
                >
                  Log this visit
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ---- Call log --------------------------------------------------- */}
      <section className="pharma-section" aria-label="Call log">
        <div className="pharma-section-head">
          <h2>
            Call log
            <Badge appearance="subtle" tone="neutral" className="pharma-count">
              {visibleLog.length}
            </Badge>
          </h2>
          <div className="pharma-controls">
            <label className="pharma-control">
              <span className="pharma-control-label">Company</span>
              <Select
                aria-label="Filter by company"
                containerClassName="pharma-company-filter"
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.currentTarget.value)}
              >
                <option value="all">All companies</option>
                {companies.map((company) => (
                  <option key={company} value={company}>
                    {company}
                  </option>
                ))}
              </Select>
            </label>
            <label className="pharma-control">
              <span className="pharma-control-label">Sort</span>
              <SegmentedToggle<SortMode>
                aria-label="Sort call log"
                value={sortMode}
                onChange={setSortMode}
                options={[
                  { label: "Most recent", value: "recent" },
                  { label: "By company", value: "company" },
                ]}
              />
            </label>
            <Button
              intent="ghost"
              size="sm"
              leadingIcon={<ShareIcon size={15} variant="stroke" />}
              disabled={log.length === 0}
              onClick={exportLog}
            >
              Export log
            </Button>
          </div>
        </div>

        {visibleLog.length === 0 ? (
          <div className="pharma-empty">
            <span className="pharma-empty-ic" aria-hidden>
              <SortIcon size={18} variant="stroke" />
            </span>
            <span>
              {log.length === 0
                ? "No calls logged yet. Log a completed interaction to start the disclosure record."
                : `No calls logged for ${companyFilter} yet.`}
            </span>
            {log.length === 0 ? (
              <Button intent="outline" size="sm" onClick={openBlankLog}>
                Log completed call
              </Button>
            ) : (
              <Button intent="outline" size="sm" onClick={() => setCompanyFilter("all")}>
                Show all companies
              </Button>
            )}
          </div>
        ) : (
          <div className="pharma-log-frame">
            <table className="pharma-log-table">
              <thead>
                <tr>
                  <th scope="col">Company</th>
                  <th scope="col">Products discussed</th>
                  <th scope="col">Samples received</th>
                  <th scope="col">Duration</th>
                  <th scope="col">Logged</th>
                  <th scope="col" className="pharma-col-expand">
                    <span className="pharma-vh">Details</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleLog.map((entry) => {
                  const total = sampleTotal(entry.samples);
                  const isOpen = expandedId === entry.id;
                  return (
                    <ExpandableRow
                      key={entry.id}
                      entry={entry}
                      total={total}
                      isOpen={isOpen}
                      onToggle={() => setExpandedId((id) => (id === entry.id ? null : entry.id))}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ---- Drawers ---------------------------------------------------- */}
      <ScheduleDrawer
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        onSchedule={handleSchedule}
      />
      <LogCallDrawer
        open={logOpen}
        fromVisit={logFrom}
        onClose={() => {
          setLogOpen(false);
          setLogFrom(null);
        }}
        onLog={handleLogCall}
      />
    </div>
  );
}

/* ---- expandable log row ------------------------------------------------ */

function ExpandableRow({
  entry,
  total,
  isOpen,
  onToggle,
}: {
  entry: CallEntry;
  total: number;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr
        className="pharma-log-row"
        data-open={isOpen || undefined}
        onClick={onToggle}
        aria-expanded={isOpen}
      >
        <td>
          <span className="pharma-log-company">
            <strong>{entry.company}</strong>
            <small>{entry.rep}</small>
          </span>
        </td>
        <td className="pharma-log-products">{entry.products}</td>
        <td>
          {total === 0 ? (
            <span className="pharma-none">None taken</span>
          ) : (
            <Badge appearance="subtle" tone="success" icon={<CheckIcon size={12} variant="stroke" />}>
              {total} unit{total === 1 ? "" : "s"}
            </Badge>
          )}
        </td>
        <td className="pharma-log-meta">{durationLabel(entry.durationMin)}</td>
        <td className="pharma-log-meta">{entry.loggedOn}</td>
        <td className="pharma-col-expand">
          <button
            type="button"
            className="pharma-expand-btn"
            data-open={isOpen || undefined}
            aria-label={isOpen ? "Hide details" : "Show details"}
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
          >
            <ChevronDownIcon size={16} variant="stroke" />
          </button>
        </td>
      </tr>
      {isOpen && (
        <tr className="pharma-detail-row">
          <td colSpan={6}>
            <div className="pharma-detail">
              <div className="pharma-detail-block">
                <span className="pharma-detail-label">Samples received</span>
                {total === 0 ? (
                  <span className="pharma-detail-value pharma-detail-value--muted">
                    None taken on this visit.
                  </span>
                ) : (
                  <ul className="pharma-detail-lots">
                    {entry.samples.map((lot, index) => (
                      <li key={`${lot.product}-${index}`}>
                        <PillIcon size={13} variant="stroke" aria-hidden />
                        {lot.product} · {lot.qty} units
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="pharma-detail-block">
                <span className="pharma-detail-label">Note</span>
                <span
                  className={
                    entry.note
                      ? "pharma-detail-value"
                      : "pharma-detail-value pharma-detail-value--muted"
                  }
                >
                  {entry.note || "No note recorded."}
                </span>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

/* ---- Schedule drawer --------------------------------------------------- */

function ScheduleDrawer({
  open,
  onClose,
  onSchedule,
}: {
  open: boolean;
  onClose: () => void;
  onSchedule: (visit: UpcomingVisit) => void;
}) {
  const [company, setCompany] = useState("");
  const [rep, setRep] = useState("");
  const [products, setProducts] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [purpose, setPurpose] = useState<VisitPurpose>("Detailing");
  const [touched, setTouched] = useState(false);
  const [dateError, setDateError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const valid = company.trim() && rep.trim() && date.trim();

  function reset() {
    setCompany("");
    setRep("");
    setProducts("");
    setDate("");
    setTime("");
    setPurpose("Detailing");
    setTouched(false);
    setDateError(null);
    setSubmitting(false);
  }

  function close() {
    if (submitting) return;
    reset();
    onClose();
  }

  function submit() {
    if (submitting) return;
    if (!valid) {
      setTouched(true);
      return;
    }
    const trimmedDate = date.trim();
    const parsed = parseVisitDate(trimmedDate);
    if (!parsed.ok) {
      setDateError(
        parsed.reason === "past"
          ? "That date is in the past — schedule a future visit."
          : 'Use a format like "Mon, Jun 30".',
      );
      return;
    }
    setDateError(null);
    setSubmitting(true);
    /* Simulate the write so the trigger shows a real pending -> success transition. */
    window.setTimeout(() => {
      onSchedule({
        id: `v-${parsed.sortKey}-${company.trim()}`,
        company: company.trim(),
        rep: rep.trim(),
        products: products.trim() || "Not specified",
        date: trimmedDate,
        time: time.trim() || "Time TBC",
        purpose,
        sortKey: parsed.sortKey,
      });
      reset();
    }, 600);
  }

  return (
    <Drawer
      open={open}
      onClose={close}
      title="Schedule a call"
      subtitle="Record an upcoming rep visit for disclosure"
      footer={
        <div className="pharma-foot">
          <Button intent="ghost" size="sm" disabled={submitting} onClick={close}>
            Cancel
          </Button>
          <Button intent="primary" size="sm" loading={submitting} onClick={submit}>
            Schedule visit
          </Button>
        </div>
      }
    >
      <div className="pharma-form">
        <Input
          label="Company"
          required
          placeholder="e.g. Sanofi"
          value={company}
          onChange={(e) => setCompany(e.currentTarget.value)}
          error={touched && !company.trim() ? "Company is required" : undefined}
        />
        <Input
          label="Rep name"
          required
          placeholder="e.g. Sopheak Meng"
          value={rep}
          onChange={(e) => setRep(e.currentTarget.value)}
          error={touched && !rep.trim() ? "Rep name is required" : undefined}
        />
        <Input
          label="Product(s)"
          placeholder="Comma-separated, e.g. Lantus, Toujeo"
          helpText="Optional — what the visit will cover"
          value={products}
          onChange={(e) => setProducts(e.currentTarget.value)}
        />
        <div className="pharma-form-grid">
          <Input
            label="Date"
            required
            placeholder="e.g. Mon, Jun 30"
            helpText="A future date — rolls to next year if earlier than today"
            value={date}
            onChange={(e) => {
              setDate(e.currentTarget.value);
              if (dateError) setDateError(null);
            }}
            error={dateError ?? (touched && !date.trim() ? "Required" : undefined)}
          />
          <Input
            label="Time"
            placeholder="e.g. 10:30"
            value={time}
            onChange={(e) => setTime(e.currentTarget.value)}
          />
        </div>
        <Select
          label="Purpose"
          value={purpose}
          onChange={(e) => setPurpose(e.currentTarget.value as VisitPurpose)}
        >
          {PURPOSE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </Select>
        <p className="pharma-form-note">
          <InfoIcon size={13} variant="stroke" aria-hidden />
          Scheduling only records the visit. You confirm what happened — and any samples — when you
          log the completed call.
        </p>
      </div>
    </Drawer>
  );
}

/* ---- Log completed call drawer ---------------------------------------- */

function LogCallDrawer({
  open,
  fromVisit,
  onClose,
  onLog,
}: {
  open: boolean;
  fromVisit: UpcomingVisit | null;
  onClose: () => void;
  onLog: (entry: CallEntry, fromVisit?: UpcomingVisit) => void;
}) {
  /* Prefill identity from a scheduled visit when logging it; reset whenever the
     source visit changes. Keyed remount (below) keeps this honest without effects. */
  const [company, setCompany] = useState(fromVisit?.company ?? "");
  const [rep, setRep] = useState(fromVisit?.rep ?? "");
  const [products, setProducts] = useState(fromVisit?.products ?? "");
  const [sampleProduct, setSampleProduct] = useState("");
  const [sampleQty, setSampleQty] = useState("");
  const [lots, setLots] = useState<SampleLot[]>([]);
  const [duration, setDuration] = useState("");
  const [note, setNote] = useState("");
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const valid = company.trim() && products.trim();
  const pendingQty = Number(sampleQty);
  const qtyOverMax = sampleQty !== "" && Number.isFinite(pendingQty) && pendingQty > MAX_LOT_QTY;
  const canAddLot =
    Boolean(sampleProduct.trim()) && Number.isFinite(pendingQty) && pendingQty > 0 && !qtyOverMax;

  function addLot(): boolean {
    if (!canAddLot) return false;
    setLots((list) => [...list, { product: sampleProduct.trim(), qty: pendingQty }]);
    setSampleProduct("");
    setSampleQty("");
    return true;
  }

  function removeLot(index: number) {
    setLots((list) => list.filter((_, i) => i !== index));
  }

  function submit() {
    if (submitting) return;
    if (!valid) {
      setTouched(true);
      return;
    }
    /* Don't silently drop a half-entered lot: commit a complete pending lot
       before building the entry so its units are not lost. */
    const committedLots = canAddLot
      ? [...lots, { product: sampleProduct.trim(), qty: pendingQty }]
      : lots;

    const durMin = Number(duration);
    const enteredDuration = Number.isFinite(durMin) && durMin > 0 ? durMin : 0;

    setSubmitting(true);
    window.setTimeout(() => {
      onLog(
        {
          id: `c-${TODAY_KEY}-${Math.max(...committedLots.map((l) => l.qty), 0)}-${company.trim()}-${products.trim()}`,
          company: company.trim(),
          rep: rep.trim() || "Unnamed rep",
          products: products.trim(),
          samples: committedLots,
          durationMin: enteredDuration, // 0 = not recorded; never fabricate a number
          note: note.trim(), // "" = not recorded; rendered as "No note recorded."
          loggedOn: TODAY_DISPLAY,
          sortKey: TODAY_KEY,
        },
        fromVisit ?? undefined,
      );
    }, 650);
  }

  const pendingTotal = lots.reduce((sum, lot) => sum + lot.qty, 0);
  const showQtyHint = Boolean(sampleProduct.trim()) && (sampleQty === "" || pendingQty <= 0);

  return (
    <Drawer
      key={fromVisit?.id ?? "blank"}
      open={open}
      onClose={() => {
        if (submitting) return;
        onClose();
      }}
      title="Log completed call"
      subtitle={fromVisit ? `From scheduled visit · ${fromVisit.company}` : "Record a completed rep interaction"}
      footer={
        <div className="pharma-foot">
          <Button intent="ghost" size="sm" disabled={submitting} onClick={onClose}>
            Cancel
          </Button>
          <Button intent="primary" size="sm" loading={submitting} onClick={submit}>
            Save to log
          </Button>
        </div>
      }
    >
      <div className="pharma-form">
        {fromVisit && (
          <p className="pharma-form-note pharma-form-note--info">
            <CheckIcon size={13} variant="stroke" aria-hidden />
            Logging this clears the scheduled visit and adds an append-only record. You can undo
            right after saving.
          </p>
        )}
        <Input
          label="Company"
          required
          placeholder="e.g. AstraZeneca"
          value={company}
          onChange={(e) => setCompany(e.currentTarget.value)}
          error={touched && !company.trim() ? "Company is required" : undefined}
        />
        <Input
          label="Rep name"
          placeholder="e.g. Dara Pich"
          value={rep}
          onChange={(e) => setRep(e.currentTarget.value)}
        />
        <Input
          label="Products discussed"
          required
          placeholder="Comma-separated, e.g. Forxiga"
          value={products}
          onChange={(e) => setProducts(e.currentTarget.value)}
          error={touched && !products.trim() ? "List at least one product" : undefined}
        />

        <div className="pharma-fieldset">
          <span className="pharma-fieldset-label">Samples received</span>
          {lots.length > 0 && (
            <ul className="pharma-lot-list">
              {lots.map((lot, index) => (
                <li className="pharma-lot" key={`${lot.product}-${index}`}>
                  <span className="pharma-lot-ic" aria-hidden>
                    <PillIcon size={14} variant="stroke" />
                  </span>
                  <span className="pharma-lot-copy">
                    <strong>{lot.product}</strong>
                    <small>{lot.qty} units</small>
                  </span>
                  <button
                    type="button"
                    className="pharma-lot-remove"
                    aria-label={`Remove ${lot.product}`}
                    onClick={() => removeLot(index)}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="pharma-lot-add">
            <Input
              containerClassName="pharma-lot-add-name"
              aria-label="Sample product"
              placeholder="Product, e.g. Forxiga 10mg"
              value={sampleProduct}
              onChange={(e) => setSampleProduct(e.currentTarget.value)}
            />
            <Input
              containerClassName="pharma-lot-add-qty"
              aria-label="Quantity"
              inputMode="numeric"
              placeholder="Qty"
              value={sampleQty}
              onChange={(e) => setSampleQty(e.currentTarget.value.replace(/\D/g, "").slice(0, 4))}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addLot();
                }
              }}
            />
            <Button intent="outline" size="sm" disabled={!canAddLot} onClick={addLot}>
              Add
            </Button>
          </div>
          {qtyOverMax ? (
            <p className="pharma-form-note pharma-form-note--warn">
              <WarningIcon size={13} variant="stroke" aria-hidden />
              Max {MAX_LOT_QTY} units per lot. Split a larger drop into separate lots.
            </p>
          ) : showQtyHint ? (
            <p className="pharma-form-note">
              <InfoIcon size={13} variant="stroke" aria-hidden />
              Enter a quantity to add this sample.
            </p>
          ) : pendingTotal > 0 ? (
            <p className="pharma-form-note pharma-form-note--ok">
              <ReceiptIcon size={13} variant="stroke" aria-hidden />
              {pendingTotal} unit{pendingTotal === 1 ? "" : "s"} will be added to Dispensary stock on save.
            </p>
          ) : (
            <p className="pharma-form-note">
              <InfoIcon size={13} variant="stroke" aria-hidden />
              Leave empty if no samples were taken. Quantities flow to Dispensary stock.
            </p>
          )}
        </div>

        <div className="pharma-form-grid">
          <Input
            label="Duration (min)"
            inputMode="numeric"
            placeholder="e.g. 20"
            helpText="Optional — left blank shows as “—”"
            value={duration}
            onChange={(e) => setDuration(e.currentTarget.value.replace(/\D/g, "").slice(0, 3))}
          />
        </div>

        <Textarea
          label="Note"
          rows={3}
          placeholder="Brief, factual note — what was covered. No efficacy claims."
          value={note}
          onChange={(e) => setNote(e.currentTarget.value)}
        />
        <p className="pharma-form-note">
          <ClockIcon size={13} variant="stroke" aria-hidden />
          Saved entries are append-only — correct a mistake with a new entry, never an edit.
        </p>
      </div>
    </Drawer>
  );
}

export default PharmaCallsView;
