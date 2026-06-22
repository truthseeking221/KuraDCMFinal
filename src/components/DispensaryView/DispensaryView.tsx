"use client";

/* DispensaryView — in-clinic medication dispensing & stock (doctor persona).

   OUT OF MODEL — read this first. Kura is a lab-coordination platform: ordering,
   catalog, booking, payment. §35/§36 scope medication, pharmacy and dispensing
   OUT of the product entirely, and the app's prescription is a signed PDF the
   patient takes to ANY pharmacy (Write-prescription drawer), not back to a
   clinic cabinet. This page is therefore a speculative extrapolation, not a
   canonical fulfilment path. It does NOT author or sign prescriptions; it only
   handles the subset of signed Rx a patient has chosen to fill in-clinic.

   Product extrapolations made here (no mastersource invariant requires them):
   • Stock-origin tag: some stock is pharma-rep sample stock, tagged on the row
     for provenance — by loose analogy to the app's provenance discipline, not a
     cited custody invariant. (Distinct from §6.6 "Sample", a lab specimen.)
   • Formulary is the realistic diabetes / CKD / hypertension set the chart
     fixtures use (Empagliflozin, Atorvastatin, Lisinopril, Metformin, Losartan).

   Three sections (Tabs):
     A. To dispense — Rx the patient is filling in-clinic. "Dispense" decrements
        stock, writes a dispense-log entry, toasts, and removes the row.
     B. Stock — inventory rows with on-hand vs par and expiry; low-stock (warning)
        and expiring-soon (danger) carry tone + matching icon. "Reorder" toasts.
     C. Dispense log — append-only record (patient, drug, qty, time, by whom).

   Self-contained: local fixtures, local state, no backend. Dispensing actually
   mutates on-hand quantity in state, and an out-of-stock Rx is blocked. */

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { Avatar, Badge, Banner, Button, Drawer, Search, Tabs, Tooltip } from "@/components/ui";
import {
  Booking as RxIcon,
  CheckCircle as CheckCircleIcon,
  ChevronRight as ChevronRightIcon,
  Clock as ClockIcon,
  Note as NoteIcon,
  Pill as PillIcon,
  Refresh as RefreshIcon,
  Tube as SampleIcon,
  Warning as WarningIcon,
} from "@/icons/components";
import type { IconProps } from "@/icons/components";
import { cx } from "@/lib/cx";
import "./DispensaryView.css";

/* ---- types --------------------------------------------------------------- */

type Tone = "danger" | "warning" | "info" | "success" | "neutral";
type TabId = "dispense" | "stock" | "log";
type Origin = "wholesale" | "sample";

type DrugClass = "SGLT2i" | "Statin" | "ACEi" | "Biguanide" | "ARB";

type StockRow = {
  id: string;
  drug: string;
  strength: string;
  drugClass: DrugClass;
  onHand: number; // mutable — the live source of truth
  par: number;
  unit: string; // e.g. "tablets"
  batch: string;
  expiry: string; // display string
  expiringSoon: boolean;
  origin: Origin;
  originNote?: string; // for samples: which pharma call
};

type RxRow = {
  id: string;
  rxCode: string;
  patient: string;
  initials: string;
  patientMeta: string;
  stockId: string; // links to a StockRow
  doseLabel: string; // "10 mg once daily"
  qty: number;
  prescriber: string;
  signedAt: string;
  indication: string;
};

type LogRow = {
  id: string;
  patient: string;
  drug: string;
  qty: number;
  unit: string;
  by: string;
  when: string;
};

/* ---- tone → icon (status is never colour alone) -------------------------- */

const TONE_ICON: Record<Tone, (props: IconProps) => React.ReactElement> = {
  danger: WarningIcon,
  warning: ClockIcon,
  info: RefreshIcon,
  success: CheckCircleIcon,
  neutral: PillIcon,
};

/* ---- fixtures ------------------------------------------------------------ */

const ME = "Dr. Phong Tuy";

const INITIAL_STOCK: StockRow[] = [
  {
    id: "stk-empa",
    drug: "Empagliflozin",
    strength: "10 mg",
    drugClass: "SGLT2i",
    onHand: 18,
    par: 30,
    unit: "tablets",
    batch: "EMP-2407",
    expiry: "Mar 2027",
    expiringSoon: false,
    origin: "sample",
    originNote: "Boehringer rep · Jun 12",
  },
  {
    id: "stk-atorva",
    drug: "Atorvastatin",
    strength: "40 mg",
    drugClass: "Statin",
    onHand: 120,
    par: 60,
    unit: "tablets",
    batch: "ATV-1180",
    expiry: "Nov 2027",
    expiringSoon: false,
    origin: "wholesale",
  },
  {
    id: "stk-lisin",
    drug: "Lisinopril",
    strength: "10 mg",
    drugClass: "ACEi",
    onHand: 24,
    par: 40,
    unit: "tablets",
    batch: "LIS-0925",
    expiry: "Aug 2026",
    expiringSoon: true,
    origin: "wholesale",
  },
  {
    id: "stk-metf",
    drug: "Metformin",
    strength: "1 g",
    drugClass: "Biguanide",
    onHand: 240,
    par: 120,
    unit: "tablets",
    batch: "MET-3302",
    expiry: "Feb 2028",
    expiringSoon: false,
    origin: "wholesale",
  },
  {
    id: "stk-losar",
    drug: "Losartan",
    strength: "50 mg",
    drugClass: "ARB",
    onHand: 8,
    par: 40,
    unit: "tablets",
    batch: "LOS-0712",
    expiry: "Jul 2026",
    expiringSoon: true,
    origin: "sample",
    originNote: "Sandoz rep · May 30",
  },
];

const INITIAL_RX: RxRow[] = [
  {
    id: "rx-1",
    rxCode: "RX-4821",
    patient: "Sokha Chann",
    initials: "SC",
    patientMeta: "F · 58 · T2DM, CKD G3a",
    stockId: "stk-empa",
    doseLabel: "10 mg once daily",
    qty: 30,
    prescriber: ME,
    signedAt: "Today · 09:14",
    indication: "Glycaemic + renal protection",
  },
  {
    id: "rx-2",
    rxCode: "RX-4822",
    patient: "Dara Pich",
    initials: "DP",
    patientMeta: "M · 64 · HTN, dyslipidaemia",
    stockId: "stk-atorva",
    doseLabel: "40 mg at night",
    qty: 30,
    prescriber: ME,
    signedAt: "Today · 09:31",
    indication: "Secondary prevention",
  },
  {
    id: "rx-3",
    rxCode: "RX-4823",
    patient: "Mealea Chan",
    initials: "MC",
    patientMeta: "F · 51 · Stage 1 HTN",
    stockId: "stk-losar",
    doseLabel: "50 mg once daily",
    qty: 30,
    prescriber: "Dr. Sophea Lim",
    signedAt: "Yesterday · 16:48",
    indication: "Blood-pressure control",
  },
  {
    id: "rx-4",
    rxCode: "RX-4824",
    patient: "Ratha Kim",
    initials: "RK",
    patientMeta: "M · 47 · Prediabetes",
    stockId: "stk-metf",
    doseLabel: "1 g twice daily",
    qty: 60,
    prescriber: ME,
    signedAt: "Yesterday · 11:05",
    indication: "Progression delay",
  },
];

const INITIAL_LOG: LogRow[] = [
  { id: "log-1", patient: "Visal Nuon", drug: "Metformin 1 g", qty: 60, unit: "tablets", by: ME, when: "Today · 08:52" },
  { id: "log-2", patient: "Sopheap Ros", drug: "Atorvastatin 40 mg", qty: 30, unit: "tablets", by: "Dr. Sophea Lim", when: "Yesterday · 17:20" },
  { id: "log-3", patient: "Chankrisna Em", drug: "Lisinopril 10 mg", qty: 30, unit: "tablets", by: ME, when: "Yesterday · 14:02" },
];

/* ---- stock derivations --------------------------------------------------- */

/* Out-of-stock wins over everything (you literally can't dispense), then
   expiring-soon (danger), then par checks (warning). A line can be both low and
   expiring — that's surfaced as a low addendum on the expiring status. */
function stockTone(row: StockRow): Tone {
  if (row.onHand === 0) return "danger";
  if (row.expiringSoon) return "danger";
  if (row.onHand <= row.par) return "warning";
  return "success";
}

function stockStatusLabel(row: StockRow): string {
  if (row.onHand === 0) return "Out of stock";
  if (row.expiringSoon) {
    // Both expiring AND at/below par → keep danger but name the low condition.
    return row.onHand <= row.par ? "Expiring soon · low" : "Expiring soon";
  }
  if (row.onHand < row.par) return "Low stock";
  if (row.onHand === row.par) return "At par";
  return "In stock";
}

/* Is this row flagged for attention (drives the toned numeral + reorder
   prominence)? Out of stock, expiring, or at/below par. */
function stockFlagged(row: StockRow): boolean {
  return row.onHand === 0 || row.expiringSoon || row.onHand <= row.par;
}

/* Sane top-up target: bring on-hand up to 2× par, never negative. */
function reorderTarget(row: StockRow): number {
  return Math.max(row.par * 2 - row.onHand, 0);
}

/* ---- view ---------------------------------------------------------------- */

export function DispensaryView() {
  const [stock, setStock] = useState<StockRow[]>(INITIAL_STOCK);
  const [queue, setQueue] = useState<RxRow[]>(INITIAL_RX);
  const [log, setLog] = useState<LogRow[]>(INITIAL_LOG);
  const [tab, setTab] = useState<TabId>("dispense");
  const [stockQuery, setStockQuery] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null); // Rx mid-dispense
  const [onOrder, setOnOrder] = useState<Set<string>>(new Set()); // stock ids requested
  const [reorderingId, setReorderingId] = useState<string | null>(null); // stock id mid-request

  const stockById = useMemo(() => new Map(stock.map((s) => [s.id, s])), [stock]);

  const lowOrExpiring = useMemo(
    () => stock.filter((s) => s.expiringSoon || s.onHand <= s.par).length,
    [stock],
  );

  const confirmRx = confirmId ? queue.find((r) => r.id === confirmId) ?? null : null;
  const confirmStock = confirmRx ? stockById.get(confirmRx.stockId) ?? null : null;

  /* Restore a just-dispensed Rx (undo): re-add the queue row, give the stock
     back, and drop the log entry that was prepended for it. */
  function undoDispense(rx: RxRow, logId: string) {
    setQueue((rows) => (rows.some((r) => r.id === rx.id) ? rows : [rx, ...rows]));
    setStock((rows) =>
      rows.map((s) => (s.id === rx.stockId ? { ...s, onHand: s.onHand + rx.qty } : s)),
    );
    setLog((rows) => rows.filter((r) => r.id !== logId));
    toast(`Reversed — ${rx.patient}`, {
      description: `${rx.qty} of ${rx.rxCode} returned to stock.`,
    });
  }

  /* Commit a dispense: pending → decrement on-hand, append the log, drop the Rx
     row, toast with an undo. The on-hand number is the single mutable source of
     truth — never recomputed. Guarded against a double-fire by busyId. */
  function dispense(rx: RxRow) {
    const src = stockById.get(rx.stockId);
    if (!src) return;
    if (src.onHand < rx.qty) {
      toast.error(`Not enough ${src.drug} in stock`, {
        description: `${src.onHand} ${src.unit} on hand · Rx needs ${rx.qty}. Reorder before dispensing.`,
      });
      return;
    }
    if (busyId) return;
    setBusyId(rx.id);
    const logId = `log-dispensed-${rx.id}`;
    window.setTimeout(() => {
      const after = src.onHand - rx.qty;
      setStock((rows) =>
        rows.map((s) => (s.id === rx.stockId ? { ...s, onHand: s.onHand - rx.qty } : s)),
      );
      setQueue((rows) => rows.filter((r) => r.id !== rx.id));
      setLog((rows) => [
        {
          id: logId,
          patient: rx.patient,
          drug: `${src.drug} ${src.strength}`,
          qty: rx.qty,
          unit: src.unit,
          by: ME,
          when: "Just now",
        },
        ...rows,
      ]);
      setBusyId(null);
      setConfirmId(null);
      toast.success(`Dispensed to ${rx.patient}`, {
        description: `${rx.qty} ${src.unit} of ${src.drug} ${src.strength} · ${after} left on hand`,
        action: { label: "Undo", onClick: () => undoDispense(rx, logId) },
      });
    }, 550);
  }

  /* The chart lives on another page we can't navigate to; acknowledge in-place. */
  function openPatient(rx: RxRow) {
    toast(`Open chart — ${rx.patient}`, {
      description: `${rx.patientMeta} · ${rx.rxCode}`,
    });
  }

  /* Reorder: optimistic pending → terminal 'on order'. Deduped — once a line is
     on order the action is replaced by an on-order badge and can't re-fire. */
  function reorder(row: StockRow) {
    if (onOrder.has(row.id) || reorderingId) return;
    const target = reorderTarget(row);
    setReorderingId(row.id);
    window.setTimeout(() => {
      setReorderingId(null);
      setOnOrder((prev) => {
        const next = new Set(prev);
        next.add(row.id);
        return next;
      });
      toast.success(`Reorder requested — ${row.drug} ${row.strength}`, {
        description: `Topping up to 2× par — ${target} ${row.unit} added to the next wholesale order.`,
      });
    }, 500);
  }

  /* Reorder triggered from a blocked To-dispense row: request stock, jump to the
     Stock tab so the on-order state is visible, and close the confirm drawer. */
  function reorderForRx(rx: RxRow) {
    const src = stockById.get(rx.stockId);
    if (!src) return;
    reorder(src);
    setConfirmId(null);
    setTab("stock");
  }

  const visibleStock = useMemo(() => {
    const q = stockQuery.trim().toLowerCase();
    if (!q) return stock;
    return stock.filter(
      (s) =>
        s.drug.toLowerCase().includes(q) ||
        s.drugClass.toLowerCase().includes(q) ||
        s.batch.toLowerCase().includes(q),
    );
  }, [stock, stockQuery]);

  return (
    <div className="disp" aria-label="Dispensary">
      {lowOrExpiring > 0 && (
        <Banner
          tone="warning"
          title={`${lowOrExpiring} ${lowOrExpiring === 1 ? "item needs" : "items need"} attention in stock`}
          icon={<WarningIcon size={18} variant="stroke" />}
          actions={
            <Button intent="secondary" size="sm" onClick={() => setTab("stock")}>
              Review stock
            </Button>
          }
        >
          Some lines are at or below par, or expiring soon. Reorder before they
          run out so dispensing is never blocked.
        </Banner>
      )}

      <Tabs<TabId>
        aria-label="Dispensary sections"
        value={tab}
        onChange={setTab}
        items={[
          { label: "To dispense", value: "dispense", count: queue.length },
          { label: "Stock", value: "stock", count: stock.length },
          { label: "Dispense log", value: "log", count: log.length },
        ]}
      />

      {tab === "dispense" && (
        <DispenseTab
          queue={queue}
          stockById={stockById}
          onConfirm={(id) => setConfirmId(id)}
          onOpenPatient={openPatient}
        />
      )}

      {tab === "stock" && (
        <StockTab
          rows={visibleStock}
          query={stockQuery}
          onQuery={setStockQuery}
          totalRows={stock.length}
          onReorder={reorder}
          onOrder={onOrder}
          reorderingId={reorderingId}
        />
      )}

      {tab === "log" && <LogTab rows={log} />}

      <Drawer
        open={confirmRx != null && confirmStock != null}
        onClose={() => setConfirmId(null)}
        title="Confirm dispense"
        subtitle={confirmRx ? `${confirmRx.rxCode} · ${confirmRx.patient}` : undefined}
        footer={
          confirmRx && confirmStock ? (
            confirmStock.onHand < confirmRx.qty ? (
              <div className="disp-drawer-foot">
                <Button intent="outline" size="md" onClick={() => setConfirmId(null)}>
                  Close
                </Button>
                <Button
                  intent="primary"
                  size="md"
                  loading={reorderingId === confirmStock.id}
                  disabled={onOrder.has(confirmStock.id)}
                  leadingIcon={<RefreshIcon size={16} variant="stroke" aria-hidden />}
                  onClick={() => reorderForRx(confirmRx)}
                >
                  {onOrder.has(confirmStock.id) ? "Reorder requested" : "Reorder to dispense"}
                </Button>
              </div>
            ) : (
              <div className="disp-drawer-foot">
                <Button
                  intent="outline"
                  size="md"
                  disabled={busyId === confirmRx.id}
                  onClick={() => setConfirmId(null)}
                >
                  Cancel
                </Button>
                <Button
                  intent="primary"
                  size="md"
                  loading={busyId === confirmRx.id}
                  onClick={() => dispense(confirmRx)}
                >
                  Dispense &amp; log
                </Button>
              </div>
            )
          ) : undefined
        }
      >
        {confirmRx && confirmStock && (
          <ConfirmBody rx={confirmRx} src={confirmStock} />
        )}
      </Drawer>
    </div>
  );
}

/* ---- Tab A: To dispense -------------------------------------------------- */

function DispenseTab({
  queue,
  stockById,
  onConfirm,
  onOpenPatient,
}: {
  queue: RxRow[];
  stockById: Map<string, StockRow>;
  onConfirm: (id: string) => void;
  onOpenPatient: (rx: RxRow) => void;
}) {
  if (queue.length === 0) {
    return (
      <EmptyState
        icon={<CheckCircleIcon size={20} variant="stroke" />}
        title="Nothing waiting to dispense"
        detail="Every signed prescription has been handed out. New ones land here as they are signed."
      />
    );
  }

  return (
    <section className="disp-section" aria-label="Prescriptions to dispense">
      <div className="disp-section-head">
        <h2>
          To dispense
          <Badge appearance="subtle" className="disp-section-count" tone="neutral">
            {queue.length}
          </Badge>
        </h2>
      </div>
      <ul className="disp-rx-list">
        {queue.map((rx) => {
          const src = stockById.get(rx.stockId);
          const short = src ? src.onHand < rx.qty : false;
          return (
            <li className={cx("disp-rx-row", short && "disp-rx-row--short")} key={rx.id}>
              <button
                type="button"
                className="disp-rx-patient"
                onClick={() => onOpenPatient(rx)}
                aria-label={`Open chart for ${rx.patient}`}
              >
                <Avatar initials={rx.initials} name={rx.patient} size="sm" />
                <span className="disp-rx-id">
                  <strong>{rx.patient}</strong>
                  <small>{rx.patientMeta}</small>
                </span>
              </button>

              <span className="disp-rx-drug">
                <strong>
                  {src ? `${src.drug} ${src.strength}` : "Unknown drug"}
                </strong>
                <small>{rx.doseLabel} · {rx.indication}</small>
              </span>

              <span
                className="disp-rx-qty"
                aria-label={`${rx.qty} ${src?.unit ?? "units"} to dispense`}
              >
                <strong aria-hidden>{rx.qty}</strong>
                <small aria-hidden>{src?.unit ?? "units"}</small>
              </span>

              <span className="disp-rx-meta">
                <span className="disp-rx-prescriber">
                  <RxIcon size={13} variant="stroke" aria-hidden />
                  {rx.prescriber}
                </span>
                <small>{rx.rxCode} · signed {rx.signedAt}</small>
              </span>

              <span className="disp-rx-action">
                {short ? (
                  <Tooltip
                    content={`Only ${src ? src.onHand : 0} on hand, Rx needs ${rx.qty}. Reorder first.`}
                  >
                    <button
                      type="button"
                      className="disp-rx-blocked"
                      onClick={() => onConfirm(rx.id)}
                      aria-label={`Short on stock — only ${src ? src.onHand : 0} on hand, Rx needs ${rx.qty}. Open to reorder.`}
                    >
                      <Badge
                        appearance="subtle"
                        tone="danger"
                        icon={<WarningIcon size={12} variant="stroke" />}
                      >
                        Short — reorder
                      </Badge>
                    </button>
                  </Tooltip>
                ) : (
                  <Button
                    intent="secondary"
                    size="sm"
                    trailingIcon={<ChevronRightIcon size={16} variant="stroke" aria-hidden />}
                    onClick={() => onConfirm(rx.id)}
                  >
                    Dispense
                  </Button>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function ConfirmBody({ rx, src }: { rx: RxRow; src: StockRow }) {
  const after = src.onHand - rx.qty;
  const short = src.onHand < rx.qty;
  return (
    <div className="disp-confirm">
      <div className="disp-confirm-patient">
        <Avatar initials={rx.initials} name={rx.patient} size="md" />
        <div>
          <strong>{rx.patient}</strong>
          <small>{rx.patientMeta}</small>
        </div>
      </div>

      <dl className="disp-confirm-grid">
        <DefRow label="Medication" value={`${src.drug} ${src.strength}`} />
        <DefRow label="Class" value={src.drugClass} />
        <DefRow label="Directions" value={rx.doseLabel} />
        <DefRow label="Quantity" value={`${rx.qty} ${src.unit}`} />
        <DefRow label="Indication" value={rx.indication} />
        <DefRow label="Prescriber" value={rx.prescriber} />
        <DefRow label="Signed" value={rx.signedAt} />
        <DefRow label="Batch / lot" value={`${src.batch} · exp ${src.expiry}`} />
      </dl>

      <div className={cx("disp-confirm-stock", short ? "tone-danger" : after <= src.par ? "tone-warning" : "tone-success")}>
        <span className="disp-tone-ic" aria-hidden>
          {short ? (
            <WarningIcon size={16} variant="stroke" />
          ) : after <= src.par ? (
            <ClockIcon size={16} variant="stroke" />
          ) : (
            <CheckCircleIcon size={16} variant="stroke" />
          )}
        </span>
        <span>
          {short
            ? `Only ${src.onHand} ${src.unit} on hand — cannot dispense ${rx.qty}. Reorder first.`
            : `${src.onHand} on hand now → ${after} ${src.unit} after dispensing${
                after === 0
                  ? " (empties the line)"
                  : after < src.par
                    ? " (below par)"
                    : after === src.par
                      ? " (at par)"
                      : ""
              }.`}
        </span>
      </div>

      {src.origin === "sample" && (
        <p className="disp-confirm-origin">
          <SampleIcon size={13} variant="stroke" aria-hidden />
          From pharma samples — {src.originNote}. Confirm the lot before hand-out.
        </p>
      )}
    </div>
  );
}

function DefRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="disp-def-row">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

/* ---- Tab B: Stock -------------------------------------------------------- */

function StockTab({
  rows,
  query,
  onQuery,
  totalRows,
  onReorder,
  onOrder,
  reorderingId,
}: {
  rows: StockRow[];
  query: string;
  onQuery: (next: string) => void;
  totalRows: number;
  onReorder: (row: StockRow) => void;
  onOrder: Set<string>;
  reorderingId: string | null;
}) {
  return (
    <section className="disp-section" aria-label="Medication stock">
      <div className="disp-section-head">
        <h2>
          Stock
          <Badge appearance="subtle" className="disp-section-count" tone="neutral">
            {totalRows}
          </Badge>
        </h2>
      </div>
      <div className="disp-toolbar">
        <Search
          density="compact"
          value={query}
          onChange={(event) => onQuery(event.currentTarget.value)}
          onClear={() => onQuery("")}
          placeholder="Search drug, class or lot"
          aria-label="Search stock"
          containerClassName="disp-search"
        />
        <span className="disp-toolbar-meta">
          {query ? `${rows.length} of ${totalRows}` : `${totalRows} medications`}
        </span>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={<PillIcon size={20} variant="stroke" />}
          title="No medications match"
          detail="Clear the search to see the full formulary."
        />
      ) : (
        <div className="disp-table-frame">
          <table className="disp-table">
            <thead>
              <tr>
                <th scope="col">Medication</th>
                <th scope="col">On hand</th>
                <th scope="col">Batch / lot</th>
                <th scope="col">Status</th>
                <th scope="col" className="disp-th-action">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const tone = stockTone(row);
                const Icon = TONE_ICON[tone];
                const flagged = stockFlagged(row);
                const ordered = onOrder.has(row.id);
                const pending = reorderingId === row.id;
                return (
                  <tr key={row.id} className={cx(`tone-${tone}`, flagged && "is-flagged-row")}>
                    <td>
                      <span className="disp-stock-drug">
                        <strong>{row.drug} {row.strength}</strong>
                        <small>
                          {row.drugClass}
                          {row.origin === "sample" && (
                            <span className="disp-origin-tag">
                              <SampleIcon size={11} variant="stroke" aria-hidden />
                              Sample · {row.originNote}
                            </span>
                          )}
                        </small>
                      </span>
                    </td>
                    <td>
                      <span className="disp-onhand">
                        <strong className={cx(flagged && "is-flagged")}>{row.onHand}</strong>
                        <small>par {row.par} · {row.unit}</small>
                      </span>
                    </td>
                    <td>
                      <span className="disp-batch">
                        <span>{row.batch}</span>
                        <small>exp {row.expiry}</small>
                      </span>
                    </td>
                    <td>
                      <Badge appearance="subtle" tone={tone} icon={<Icon size={12} variant="stroke" />}>
                        {stockStatusLabel(row)}
                      </Badge>
                    </td>
                    <td className="disp-td-action">
                      {ordered ? (
                        <Badge
                          appearance="subtle"
                          tone="neutral"
                          icon={<RefreshIcon size={12} variant="stroke" />}
                        >
                          Reorder requested
                        </Badge>
                      ) : flagged ? (
                        <Button
                          intent="secondary"
                          size="sm"
                          loading={pending}
                          leadingIcon={<RefreshIcon size={14} variant="stroke" aria-hidden />}
                          onClick={() => onReorder(row)}
                        >
                          {pending ? "Requesting…" : "Reorder"}
                        </Button>
                      ) : (
                        <span className="disp-stock-ample">Well stocked</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/* ---- Tab C: Dispense log ------------------------------------------------- */

function LogTab({ rows }: { rows: LogRow[] }) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<NoteIcon size={20} variant="stroke" />}
        title="No dispenses logged yet"
        detail="Each hand-out is recorded here with the patient, drug, quantity and who dispensed it."
      />
    );
  }
  return (
    <section className="disp-section" aria-label="Dispense log">
      <div className="disp-section-head">
        <h2>
          Dispense log
          <Badge appearance="subtle" className="disp-section-count" tone="neutral">
            {rows.length}
          </Badge>
        </h2>
      </div>
      <ul className="disp-log-list">
        {rows.map((row) => (
          <li className="disp-log-row" key={row.id}>
            <span className="disp-log-ic" aria-hidden>
              <PillIcon size={16} variant="stroke" />
            </span>
            <span className="disp-log-copy">
              <strong>{row.drug}</strong>
              <small>
                {row.qty} {row.unit} · {row.patient}
              </small>
            </span>
            <span className="disp-log-meta">
              <span>{row.by}</span>
              <small>{row.when}</small>
            </span>
          </li>
        ))}
      </ul>
      <p className="disp-foot-note">
        Dispense records are append-only. Corrections are made by a new entry,
        never by editing history.
      </p>
    </section>
  );
}

/* ---- shared -------------------------------------------------------------- */

function EmptyState({
  icon,
  title,
  detail,
}: {
  icon: ReactNode;
  title: string;
  detail: string;
}) {
  return (
    <div className="disp-empty">
      <span className="disp-empty-ic" aria-hidden>
        {icon}
      </span>
      <strong>{title}</strong>
      <span>{detail}</span>
    </div>
  );
}

export default DispensaryView;
