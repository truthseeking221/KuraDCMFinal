"use client";

/* PharmaCallsView — the Rep disclosure log for the cabinet.
   An append-only transparency / compliance ledger (Sunshine-Act-style disclosure
   of industry interactions). This is clinic-business record-keeping, not promotion:
   the tone is neutral and administrative and it invents NO efficacy claims.

   Scheduling rep visits lives on the Calendar now — this surface is purely the
   disclosure record of completed calls. Recording samples received here is an
   immutable log entry, and the quantity is acknowledged as added to Dispensary
   stock via a cross-surface toast (this page cannot mutate the Dispensary directly).

   Sections:
     1. Transparency summary — samples received YTD / this quarter, declared
        interactions this quarter, and a calm "available for compliance review" note.
     2. Call log — completed interactions (company, products, samples qty, note),
        filterable + sortable by company, expandable to read the note + full sample
        lots. Logging samples acknowledges Dispensary stock. Exportable for review.

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
  note: string; // "" = not recorded
  loggedOn: string; // display
  sortKey: number; // for date sort (higher = more recent)
};

/* ---- "today" — a single fixed clock for the whole surface ---------------- */
/* Everything time-derived (quarter filtering, the log timestamp) reads from this
   one constant so the prototype stays deterministic. Today is Jun 21, 2026 (Q2). */
const TODAY = { year: 2026, month: 6, day: 21 } as const;
const TODAY_KEY = TODAY.year * 10000 + TODAY.month * 100 + TODAY.day; // 20260621
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

const INITIAL_LOG: CallEntry[] = [
  {
    id: "c-1",
    company: "AstraZeneca",
    rep: "Dara Pich",
    products: "Forxiga",
    samples: [{ product: "Forxiga 10mg", qty: 14 }],
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
    note: "Patient leaflets restocked. Discussed gliclazide titration.",
    loggedOn: "May 28, 2026 · 13:20",
    sortKey: 20260528,
  },
];

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

type SortMode = "recent" | "company";

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
  const [log, setLog] = useState<CallEntry[]>(INITIAL_LOG);

  const [companyFilter, setCompanyFilter] = useState<string>("all");
  const [sortMode, setSortMode] = useState<SortMode>("recent");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [logOpen, setLogOpen] = useState(false);

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

  function handleLogCall(entry: CallEntry) {
    setLog((list) => [entry, ...list]);
    setLogOpen(false);

    /* If the active company filter would hide the row we just added, clear it so
       the action visibly lands instead of silently vanishing behind the filter. */
    const hiddenByFilter = companyFilter !== "all" && entry.company !== companyFilter;
    if (hiddenByFilter) setCompanyFilter("all");

    /* Single-shot undo: removes the just-added log row, so a misclick can't add
       a permanent entry to an append-only surface. */
    const undo = () => {
      setLog((list) => list.filter((e) => e.id !== entry.id));
      setExpandedId((id) => (id === entry.id ? null : id));
      toast.success("Log entry reverted", { description: entry.company });
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

  function exportLog() {
    const header = ["Logged", "Company", "Rep", "Products", "Samples", "Sample units", "Note"];
    const rows = log.map((entry) =>
      [
        entry.loggedOn,
        entry.company,
        entry.rep,
        entry.products,
        samplesLabel(entry.samples),
        String(sampleTotal(entry.samples)),
        entry.note,
      ]
        .map(csvCell)
        .join(","),
    );
    downloadTextFile("kura-pharma-call-log.csv", [header.map(csvCell).join(","), ...rows].join("\n"), "text/csv");
    toast.success("Compliance log exported", { description: `${log.length} interaction${log.length === 1 ? "" : "s"} · CSV` });
  }

  return (
    <div className="pharma" aria-label="Rep disclosure log">
      {/* Intro band — frame the surface as the append-only disclosure record. */}
      <header className="pharma-intro">
        <div className="pharma-intro-copy">
          <p className="pharma-eyebrow">Rep disclosure log</p>
          <p className="pharma-intro-sub">
            The append-only record of completed pharmaceutical-rep calls and samples received —
            kept for compliance, not promotion.
          </p>
          <p className="pharma-intro-meta">
            <CalendarIcon size={13} variant="stroke" aria-hidden />
            Rep visits are scheduled on the Calendar.
          </p>
        </div>
        <div className="pharma-intro-actions">
          <Button
            intent="primary"
            size="sm"
            leadingIcon={<PlusIcon size={16} variant="stroke" />}
            onClick={() => setLogOpen(true)}
          >
            Log a completed call
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
        <p className="pharma-summary-note">
          <ShieldIcon size={14} variant="stroke" aria-hidden />
          This log is available for compliance review. Entries are append-only and carry the
          interaction date.
        </p>
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
              <Button intent="outline" size="sm" onClick={() => setLogOpen(true)}>
                Log a completed call
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

      {/* ---- Drawer ----------------------------------------------------- */}
      <LogCallDrawer
        open={logOpen}
        onClose={() => setLogOpen(false)}
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
          <td colSpan={5}>
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

/* ---- Log completed call drawer ---------------------------------------- */

function LogCallDrawer({
  open,
  onClose,
  onLog,
}: {
  open: boolean;
  onClose: () => void;
  onLog: (entry: CallEntry) => void;
}) {
  const [company, setCompany] = useState("");
  const [rep, setRep] = useState("");
  const [products, setProducts] = useState("");
  const [sampleProduct, setSampleProduct] = useState("");
  const [sampleQty, setSampleQty] = useState("");
  const [lots, setLots] = useState<SampleLot[]>([]);
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

    setSubmitting(true);
    window.setTimeout(() => {
      onLog({
        id: `c-${TODAY_KEY}-${Math.max(...committedLots.map((l) => l.qty), 0)}-${company.trim()}-${products.trim()}`,
        company: company.trim(),
        rep: rep.trim() || "Unnamed rep",
        products: products.trim(),
        samples: committedLots,
        note: note.trim(), // "" = not recorded; rendered as "No note recorded."
        loggedOn: TODAY_DISPLAY,
        sortKey: TODAY_KEY,
      });
    }, 650);
  }

  const pendingTotal = lots.reduce((sum, lot) => sum + lot.qty, 0);
  const showQtyHint = Boolean(sampleProduct.trim()) && (sampleQty === "" || pendingQty <= 0);

  return (
    <Drawer
      open={open}
      onClose={() => {
        if (submitting) return;
        onClose();
      }}
      title="Log a completed call"
      subtitle="Record a completed rep interaction"
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
