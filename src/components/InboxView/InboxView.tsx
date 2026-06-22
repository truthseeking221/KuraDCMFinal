"use client";

/* InboxView — the doctor's unified NOTIFICATION center: "what happened" across
   the practice. This is informational, not a worklist; anything the doctor must
   *complete* (with a done-state) lives in Tasks. The Inbox tells the story and
   offers a deep-link, acknowledged via toast since this page is self-contained.

   Mastersource grounding:
   - §29 result product boundary -> doctor notification on result release;
     §40 step 27-28 (assurance-gated release -> patient + doctor notified).
   - §16 / §37.2 booking lifecycle: JUST_CREATED -> SAMPLE_DRAWN -> RESULTS_BACK,
     each a distinct event the doctor sees here.
   - §17 payment/receipt and §24 settlement (half-month netting cadence:
     1-15, 16-end-of-month; settlement is per doctor person). Money is awareness
     only here; the ledger is immutable (§41) so the Inbox never edits it.
   - §27 insurance claims are per LINE with state PENDING/APPROVED/REJECTED.
   - §15 provisional -> verified identity: NID collision merge queue,
     provisional duplicate found, assurance gate for sensitive actions.
   - §13.2 / §31 patient auth: KYD/verification and patient phone-control state.

   Layout: a category filter rail + message list (left) and a reading pane
   (right). On a narrow main column the reading pane collapses and the selected
   message opens in a Drawer instead. */

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Avatar, Badge, Button, Checkbox, Drawer, SegmentedToggle } from "@/components/ui";
import {
  Bell,
  Booking as BookingIcon,
  Cash,
  CheckCircle,
  ChevronRight,
  Clock,
  Flask,
  IDCard,
  Info,
  Receipt,
  Setting,
  Warning,
} from "@/icons/components";
import type { IconProps } from "@/icons/components";
import { cx } from "@/lib/cx";
import "./InboxView.css";

/* ----------------------------------- model --------------------------------- */

type Tone = "danger" | "warning" | "info" | "success" | "neutral";

/* Category drives the filter rail. "system" rolls up under no tab of its own —
   it lives in All, intentionally low-priority. */
type Category = "results" | "bookings" | "billing" | "claims" | "identity" | "system";

type EvidenceRow = { label: string; value: string };

type InboxItem = {
  id: string;
  category: Category;
  tone: Tone;
  title: string;
  /* the source entity — patient name and/or booking code */
  source: string;
  /* one-line context shown in the list */
  preview: string;
  /* absolute, deterministic timestamp + relative label for the list */
  when: string;
  ago: string;
  read: boolean;
  /* optional patient avatar initials */
  initials?: string;
  /* reading-pane body */
  body: string;
  evidence: EvidenceRow[];
  /* the single primary deep-link action (self-contained -> toast) */
  action: { label: string; toast: string };
};

const CATEGORY_LABEL: Record<Category, string> = {
  results: "Results",
  bookings: "Bookings",
  billing: "Billing",
  claims: "Claims",
  identity: "Identity",
  system: "System",
};

const CATEGORY_ICON: Record<Category, (props: IconProps) => React.ReactElement> = {
  results: Flask,
  bookings: BookingIcon,
  billing: Cash,
  claims: Receipt,
  identity: IDCard,
  system: Setting,
};

/* Status is never colour alone — every tone carries a matching icon. */
const TONE_ICON: Record<Tone, (props: IconProps) => React.ReactElement> = {
  danger: Warning,
  warning: Clock,
  info: Info,
  success: CheckCircle,
  neutral: Bell,
};

/* System notices live in All but get no tab of their own — intentionally
   low-priority. So FilterKey omits "system". */
type TabCategory = Exclude<Category, "system">;
type FilterKey = "all" | "unread" | TabCategory;

const FILTER_ORDER: FilterKey[] = [
  "all",
  "unread",
  "results",
  "bookings",
  "billing",
  "claims",
  "identity",
];

const FILTER_LABEL: Record<FilterKey, string> = {
  all: "All",
  unread: "Unread",
  results: "Results",
  bookings: "Bookings",
  billing: "Billing",
  claims: "Claims",
  identity: "Identity",
};

/* --------------------------------- fixtures -------------------------------- */
/* Deterministic — fixed timestamps, no Date.now / Math.random. Khmer names,
   Phnom Penh context. Each item is one thing that *happened*, never a to-do. */

const SEED: InboxItem[] = [
  {
    id: "n-result-sokha",
    category: "results",
    tone: "success",
    title: "Results released to patient",
    source: "Sokha Chann · FZ-38245",
    initials: "SC",
    preview: "HbA1c, lipid panel and creatinine are back and shared.",
    when: "Today · 09:12",
    ago: "2h ago",
    read: false,
    body: "Lab results for this order line passed validation and identity assurance, so they were released. Sokha has been notified in the patient app. Two analytes are flagged out of range.",
    evidence: [
      { label: "Booking", value: "FZ-38245" },
      { label: "Tests", value: "HbA1c · Lipid panel · Creatinine" },
      { label: "Flagged", value: "HbA1c 8.1% (High) · LDL 162 mg/dL (High)" },
      { label: "Release gate", value: "NID verified — assurance met" },
      { label: "Released", value: "Jun 21, 2026 · 09:12" },
    ],
    action: { label: "Open result", toast: "Opening Sokha Chann's result for FZ-38245" },
  },
  {
    id: "n-claim-rejected",
    category: "claims",
    tone: "danger",
    title: "Claim rejected by insurer",
    source: "Dara Pich · Forte · line 2",
    initials: "DP",
    preview: "Thyroid panel line rejected — policy excludes screening.",
    when: "Today · 08:40",
    ago: "3h ago",
    read: false,
    body: "Forte rejected the claim on one order line. Insurance is per line, so the rest of the order is unaffected. The line falls back to self-pay at list price unless re-submitted with a diagnosis code.",
    evidence: [
      { label: "Insurer", value: "Forte" },
      { label: "Order line", value: "Thyroid panel (TSH, FT4)" },
      { label: "Claim state", value: "REJECTED" },
      { label: "Reason", value: "Screening not covered without ICD-10 code" },
      { label: "List price", value: "$24.00" },
    ],
    action: { label: "Review claim", toast: "Opening the rejected Forte claim for Dara Pich" },
  },
  {
    id: "n-merge-queue",
    category: "identity",
    tone: "warning",
    title: "Provisional duplicate found",
    source: "Chenda Ouk",
    initials: "CO",
    preview: "NID capture matched an older provisional record — in merge queue.",
    when: "Today · 08:05",
    ago: "3h ago",
    read: false,
    body: "When reception captured this patient's NID, it collided with an older provisional record sharing the same number. The merge is queued for a data steward; safe service is not blocked while it resolves.",
    evidence: [
      { label: "Patient", value: "Chenda Ouk" },
      { label: "Trigger", value: "NID captured at PSC" },
      { label: "Assurance", value: "Provisional -> NID verified (pending merge)" },
      { label: "Queue", value: "Merge queue · steward review" },
      { label: "Impact", value: "Release will hold until the merge clears (identity-assurance gate)" },
    ],
    action: { label: "View merge", toast: "Opening the merge queue entry for Chenda Ouk" },
  },
  {
    id: "n-booking-drawn",
    category: "bookings",
    tone: "info",
    title: "Sample drawn",
    source: "Vichea Sok · FZ-38260",
    initials: "VS",
    preview: "Specimen collected at PSC Toul Kork — en route to lab.",
    when: "Today · 07:51",
    ago: "4h ago",
    read: false,
    body: "The booking moved from confirmed to sample drawn. A specimen was barcoded and collected; logistics to the lab has started. Results will appear here when they are back.",
    evidence: [
      { label: "Booking", value: "FZ-38260" },
      { label: "Lifecycle", value: "JUST_CREATED -> SAMPLE_DRAWN" },
      { label: "Collector", value: "Dara Sok (phlebotomist)" },
      { label: "Collected", value: "Jun 21, 2026 · 07:48" },
      { label: "Route", value: "PP-04 courier · est. lab 11:00" },
    ],
    action: { label: "Track booking", toast: "Opening booking FZ-38260 for Vichea Sok" },
  },
  {
    id: "n-claim-approved",
    category: "claims",
    tone: "success",
    title: "Claim approved",
    source: "Sokha Chann · Forte · line 1",
    initials: "SC",
    preview: "HbA1c line approved — copay $3.00 collected.",
    when: "Yesterday · 16:20",
    ago: "Yesterday",
    read: true,
    body: "Forte approved the claim on this order line. The patient copay was recorded; the covered balance settles through the insurer pass-through at the next netting run.",
    evidence: [
      { label: "Insurer", value: "Forte" },
      { label: "Order line", value: "HbA1c" },
      { label: "Claim state", value: "APPROVED" },
      { label: "Copay", value: "$3.00 collected" },
      { label: "Covered", value: "$9.00 insurer pass-through" },
    ],
    action: { label: "View claim", toast: "Opening the approved Forte claim for Sokha Chann" },
  },
  {
    id: "n-payment",
    category: "billing",
    tone: "success",
    title: "Payment received",
    source: "Vichea Sok · FZ-38260",
    initials: "VS",
    preview: "$18.40 paid by KHQR at the cabinet — receipt issued.",
    when: "Yesterday · 14:05",
    ago: "Yesterday",
    read: true,
    body: "Cash flow recorded a payment against this booking and issued a receipt. Payment is not settlement — the doctor spread freezes only once each line is paid and served.",
    evidence: [
      { label: "Booking", value: "FZ-38260" },
      { label: "Amount", value: "$18.40" },
      { label: "Method", value: "KHQR · Bakong" },
      { label: "Receipt", value: "RC-90412" },
      { label: "Split", value: "Frozen on paid-plus-served lines only" },
    ],
    action: { label: "Open receipt", toast: "Opening receipt RC-90412" },
  },
  {
    id: "n-settlement",
    category: "billing",
    tone: "info",
    title: "Settlement statement ready",
    source: "Jun 1 – Jun 15 period",
    preview: "Net +$236.00 to you — settles to ABA on file.",
    when: "Jun 16 · 06:00",
    ago: "5 days ago",
    read: true,
    body: "The half-month ledger was netted across all your frozen rows: spreads owed to you, amounts you owe Kura, refund reversals and insurer pass-through. Settlement runs per doctor, not per clinic.",
    evidence: [
      { label: "Period", value: "Jun 1 – Jun 15" },
      { label: "Kura owes you", value: "$412.00" },
      { label: "You owe Kura", value: "$176.00 (office-collected)" },
      { label: "Net", value: "+$236.00 to you" },
      { label: "Payout", value: "ABA ···· 4102 · next run Jul 1" },
    ],
    action: { label: "Open statement", toast: "Opening the Jun 1–15 settlement statement" },
  },
  {
    id: "n-result-pending",
    category: "results",
    tone: "warning",
    title: "Results back — release on hold",
    source: "Chenda Ouk · FZ-38251",
    initials: "CO",
    preview: "Lab results returned but identity assurance is insufficient.",
    when: "Jun 19 · 11:30",
    ago: "2 days ago",
    read: true,
    body: "The lab returned results for this order line, but release will hold on patient identity assurance and this record is mid-merge. Results are intended to release once the merge clears and the assurance gate is met.",
    evidence: [
      { label: "Booking", value: "FZ-38251" },
      { label: "Lifecycle", value: "RESULTS_BACK (not released)" },
      { label: "Blocker", value: "Identity assurance — pending merge" },
      { label: "Tests", value: "CBC · Electrolytes" },
      { label: "Released", value: "—" },
    ],
    action: { label: "View result status", toast: "Opening result status for FZ-38251" },
  },
  {
    id: "n-booking-created",
    category: "bookings",
    tone: "neutral",
    title: "Booking created",
    source: "Pisey Heng · FZ-38271",
    initials: "PH",
    preview: "You booked 3 tests with a face-to-face OTP verification.",
    when: "Jun 18 · 10:14",
    ago: "3 days ago",
    read: true,
    body: "A doctor-originated booking was created from your session. Because it carries an authenticated, face-to-face origination, the doctor spread is attached to these order lines.",
    evidence: [
      { label: "Booking", value: "FZ-38271" },
      { label: "Patient", value: "Pisey Heng (provisional)" },
      { label: "Origination", value: "Doctor — face-to-face OTP" },
      { label: "Tests", value: "FBS · Lipid panel · Urinalysis" },
      { label: "Spread", value: "Attached (doctor-originated)" },
    ],
    action: { label: "Open booking", toast: "Opening booking FZ-38271 for Pisey Heng" },
  },
  {
    id: "n-kyd",
    category: "identity",
    tone: "warning",
    title: "Medical licence renews soon",
    source: "Your verification",
    preview: "CMC 048-2019 expires Jul 20 — verified, renews soon.",
    when: "Jun 17 · 08:00",
    ago: "4 days ago",
    read: true,
    body: "Your professional verification is verified and approaching its renewal window. While verified, ordering is unaffected; a lapsed licence would block real lab order creation. The renewal itself is tracked as a task.",
    evidence: [
      { label: "Licence", value: "CMC 048-2019" },
      { label: "Status", value: "Verified — renews soon" },
      { label: "Expires", value: "Jul 20, 2026" },
      { label: "If lapsed", value: "Real order creation blocked" },
    ],
    action: { label: "Open verification", toast: "Opening your licence verification" },
  },
  {
    id: "n-refund",
    category: "billing",
    tone: "neutral",
    title: "Refund reversal posted",
    source: "Dara Pich · FZ-38233",
    initials: "DP",
    preview: "A reversal row of −$12.00 was added — history is unchanged.",
    when: "Jun 15 · 15:42",
    ago: "6 days ago",
    read: true,
    body: "A refund was processed as a reversal row rather than an edit. The economic ledger is immutable, so the original payment stays and the reversal nets at settlement.",
    evidence: [
      { label: "Booking", value: "FZ-38233" },
      { label: "Reversal", value: "−$12.00" },
      { label: "Against", value: "Receipt RC-90388" },
      { label: "Ledger", value: "Immutable — reversal, not edit" },
    ],
    action: { label: "View reversal", toast: "Opening the refund reversal for FZ-38233" },
  },
  {
    id: "n-import",
    category: "system",
    tone: "info",
    title: "External result imported",
    source: "Sokha Chann · BIOMED",
    initials: "SC",
    preview: "5 BIOMED PDFs imported — kept separate from Kura-verified.",
    when: "Jun 14 · 13:20",
    ago: "7 days ago",
    read: true,
    body: "Historic BIOMED Phnom Penh reports were imported and mapped to canonical analytes. They are tagged with source and import date and are not blended with Kura-verified results.",
    evidence: [
      { label: "Source", value: "BIOMED Phnom Penh" },
      { label: "Imported", value: "246 rows · 57 auto-flagged" },
      { label: "Provenance", value: "Imported — not Kura-verified" },
      { label: "Mapping", value: "Canonical analyte · confidence shown" },
    ],
    action: { label: "View import", toast: "Opening the BIOMED import for Sokha Chann" },
  },
];

/* danger first, then warning -> info -> success -> neutral; stable within tone. */
const TONE_PRIORITY: Record<Tone, number> = {
  danger: 0,
  warning: 1,
  info: 2,
  success: 3,
  neutral: 4,
};

/* The reading pane folds away below this width; rows open the drawer instead.
   Kept in sync with the @media breakpoint in InboxView.css. */
const NARROW_QUERY = "(max-width: 1024px)";

/* matchMedia-backed width signal. The drawer is driven from this in JS, not
   from component-scoped CSS — the Drawer portals to <body>, so a `.inbox`
   selector can never reach it. SSR-safe: defaults to false until mounted. */
function useIsNarrow(): boolean {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia(NARROW_QUERY);
    const sync = () => setNarrow(mql.matches);
    sync();
    mql.addEventListener("change", sync);
    return () => mql.removeEventListener("change", sync);
  }, []);
  return narrow;
}

/* --------------------------------- component ------------------------------- */

export function InboxView() {
  const [items, setItems] = useState<InboxItem[]>(SEED);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [selectedId, setSelectedId] = useState<string>(SEED[0]?.id ?? "");
  const [selected, setSelectedIds] = useState<Set<string>>(() => new Set());
  /* On narrow widths the reading pane is hidden and the row opens this drawer. */
  const [drawerOpen, setDrawerOpen] = useState(false);
  /* the deep-link action that is currently "resolving" (simulated async) */
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);
  /* true while a bulk archive is briefly resolving before the rows leave */
  const [archiving, setArchiving] = useState(false);
  const isNarrow = useIsNarrow();

  const unreadCount = useMemo(() => items.filter((it) => !it.read).length, [items]);

  /* per-category unread counts for the filter pills */
  const unreadByCategory = useMemo(() => {
    const map: Record<FilterKey, number> = {
      all: 0,
      unread: 0,
      results: 0,
      bookings: 0,
      billing: 0,
      claims: 0,
      identity: 0,
    };
    for (const it of items) {
      if (it.read) continue;
      map.all += 1;
      map.unread += 1;
      if (it.category !== "system") map[it.category] += 1;
    }
    return map;
  }, [items]);

  /* which filter segments currently hold a danger-tone unread item — only these
     earn a red count pill (Home's "count earns its red" rule). */
  const dangerByCategory = useMemo(() => {
    const map: Record<FilterKey, boolean> = {
      all: false,
      unread: false,
      results: false,
      bookings: false,
      billing: false,
      claims: false,
      identity: false,
    };
    for (const it of items) {
      if (it.read || it.tone !== "danger") continue;
      map.all = true;
      map.unread = true;
      if (it.category !== "system") map[it.category] = true;
    }
    return map;
  }, [items]);

  const visible = useMemo(() => {
    const list = items.filter((it) => {
      if (filter === "all") return true;
      if (filter === "unread") return !it.read;
      return it.category === filter;
    });
    return [...list].sort((a, b) => {
      /* unread floats above read, then worst tone first; seed order breaks ties */
      if (a.read !== b.read) return a.read ? 1 : -1;
      return TONE_PRIORITY[a.tone] - TONE_PRIORITY[b.tone];
    });
  }, [items, filter]);

  const selectedItem = useMemo(
    () => items.find((it) => it.id === selectedId) ?? null,
    [items, selectedId],
  );

  /* selection only counts within the currently visible list */
  const visibleIds = useMemo(() => visible.map((it) => it.id), [visible]);
  const selectedVisibleCount = visibleIds.filter((id) => selected.has(id)).length;
  const allVisibleSelected = visibleIds.length > 0 && selectedVisibleCount === visibleIds.length;

  function markRead(ids: string[], read = true) {
    const set = new Set(ids);
    setItems((prev) => prev.map((it) => (set.has(it.id) ? { ...it, read } : it)));
  }

  function openItem(id: string) {
    setSelectedId(id);
    markRead([id], true);
    /* Desktop shows the reading pane in place; only the narrow fallback needs
       the portaled drawer. Opening it on desktop would stack a focus-trapped
       modal over the pane. */
    if (isNarrow) setDrawerOpen(true);
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds((prev) => {
      if (allVisibleSelected) {
        const next = new Set(prev);
        for (const id of visibleIds) next.delete(id);
        return next;
      }
      return new Set([...prev, ...visibleIds]);
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  function markSelectedRead() {
    const ids = visibleIds.filter((id) => selected.has(id));
    if (ids.length === 0) return;
    markRead(ids, true);
    toast.success(`Marked ${ids.length} ${ids.length === 1 ? "message" : "messages"} read`);
    clearSelection();
  }

  function archiveSelected() {
    const idList = visibleIds.filter((id) => selected.has(id));
    if (idList.length === 0 || archiving) return;
    const ids = new Set(idList);
    const count = ids.size;
    /* brief pending so a multi-row removal isn't an instant flicker */
    setArchiving(true);
    setTimeout(() => {
      /* snapshot for undo: removed items in their original order + prior selection */
      const removed = items.filter((it) => ids.has(it.id));
      const priorSelectedId = selectedId;
      setItems((prev) => {
        const next = prev.filter((it) => !ids.has(it.id));
        if (ids.has(selectedId)) setSelectedId(next[0]?.id ?? "");
        return next;
      });
      clearSelection();
      setArchiving(false);
      toast.success(`Archived ${count} ${count === 1 ? "message" : "messages"}`, {
        action: {
          label: "Undo",
          onClick: () => {
            /* restore preserving the original SEED order */
            const order = new Map(SEED.map((it, i) => [it.id, i]));
            setItems((prev) =>
              [...prev, ...removed].sort(
                (a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0),
              ),
            );
            if (priorSelectedId && ids.has(priorSelectedId)) setSelectedId(priorSelectedId);
          },
        },
      });
    }, 420);
  }

  function markAllRead() {
    if (unreadCount === 0) return;
    markRead(items.map((it) => it.id), true);
    clearSelection();
    toast.success("All messages marked read");
  }

  function runAction(item: InboxItem) {
    if (pendingActionId) return;
    setPendingActionId(item.id);
    setTimeout(() => {
      setPendingActionId((cur) => (cur === item.id ? null : cur));
      toast(item.action.toast);
    }, 500);
  }

  /* key the whole selection bar off the visible subset so it can never show 0 */
  const selectionActive = selectedVisibleCount > 0;

  return (
    <div className="inbox">
      {/* ---- toolbar ---------------------------------------------------- */}
      <div className="inbox-toolbar">
        <p className="inbox-eyebrow">Notification center</p>
        <div className="inbox-toolbar-row">
          <SegmentedToggle<FilterKey>
            className="inbox-filters"
            aria-label="Filter notifications"
            value={filter}
            onChange={(value) => {
              setFilter(value);
              clearSelection();
            }}
            options={FILTER_ORDER.map((key) => ({
              value: key,
              label: (
                <span className="inbox-filter-label">
                  {FILTER_LABEL[key]}
                  {unreadByCategory[key] > 0 && (
                    <span
                      className={cx(
                        "inbox-filter-count",
                        dangerByCategory[key] && "is-danger",
                      )}
                      aria-label={`${unreadByCategory[key]} unread`}
                    >
                      {unreadByCategory[key]}
                    </span>
                  )}
                </span>
              ),
            }))}
          />
          <Button
            className="inbox-markall"
            intent="ghost"
            size="sm"
            leadingIcon={<CheckCircle size={15} variant="stroke" />}
            disabled={unreadCount === 0}
            onClick={markAllRead}
          >
            Mark all read
          </Button>
        </div>
      </div>

      {/* ---- selection bar (only when something is checked) ------------- */}
      {selectionActive ? (
        <div className="inbox-selectionbar" role="region" aria-label="Selection actions">
          <span className="inbox-selectionbar-count">
            {selectedVisibleCount} selected
          </span>
          <button type="button" className="inbox-link" onClick={toggleSelectAll}>
            {allVisibleSelected ? "Clear all" : "Select all"}
          </button>
          <span className="inbox-selectionbar-spacer" />
          <Button
            intent="secondary"
            size="sm"
            leadingIcon={<CheckCircle size={15} variant="stroke" />}
            disabled={archiving}
            onClick={markSelectedRead}
          >
            Mark read
          </Button>
          <Button
            intent="outline"
            size="sm"
            loading={archiving}
            onClick={archiveSelected}
          >
            Archive
          </Button>
        </div>
      ) : null}

      {/* ---- two-pane workbench ---------------------------------------- */}
      <div className="inbox-panes">
        <section className="inbox-list-pane" aria-label="Messages">
          {visible.length === 0 ? (
            <EmptyList
              filter={filter}
              inboxEmpty={items.length === 0}
              onShowAll={() => setFilter("all")}
            />
          ) : (
            <ul className="inbox-list">
              <li className="inbox-list-header">
                <span
                  className="inbox-row-check"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Checkbox
                    checked={allVisibleSelected}
                    indeterminate={selectedVisibleCount > 0 && !allVisibleSelected}
                    onChange={toggleSelectAll}
                    aria-label={
                      allVisibleSelected ? "Clear selection" : "Select all messages"
                    }
                  />
                </span>
                <span className="inbox-list-header-label">
                  {visible.length} {visible.length === 1 ? "message" : "messages"}
                </span>
              </li>
              {visible.map((item) => {
                const Icon = TONE_ICON[item.tone];
                const isSelected = item.id === selectedId;
                const isChecked = selected.has(item.id);
                return (
                  <li
                    key={item.id}
                    className={cx(
                      "inbox-row",
                      `tone-${item.tone}`,
                      !item.read && "is-unread",
                      isSelected && "is-active",
                    )}
                  >
                    <span
                      className="inbox-row-check"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Checkbox
                        checked={isChecked}
                        onChange={() => toggleSelect(item.id)}
                        aria-label={`Select ${item.title}`}
                      />
                    </span>
                    <button
                      type="button"
                      className="inbox-row-main"
                      aria-label={`${item.read ? "" : "Unread: "}${item.title} — ${item.source}`}
                      onClick={() => openItem(item.id)}
                    >
                      <span className="inbox-row-mark" aria-hidden>
                        {item.initials ? (
                          <Avatar initials={item.initials} name={item.source} size="sm" />
                        ) : (
                          <span className="inbox-tone-icon">
                            <Icon size={16} variant="stroke" />
                          </span>
                        )}
                      </span>
                      <span className="inbox-row-copy">
                        <span className="inbox-row-titleline">
                          {!item.read && <span className="inbox-dot" aria-label="Unread" />}
                          <strong>{item.title}</strong>
                          <span className="inbox-row-when">{item.ago}</span>
                        </span>
                        <span className="inbox-row-source">
                          <CategoryTag category={item.category} />
                          {item.source}
                        </span>
                        <span className="inbox-row-preview">{item.preview}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* reading pane (desktop). On narrow widths CSS hides it and the
            Drawer below takes over. */}
        <section className="inbox-read-pane" aria-label="Message detail">
          {selectedItem ? (
            <ReadingContent
              item={selectedItem}
              pending={pendingActionId === selectedItem.id}
              onAction={() => runAction(selectedItem)}
              onToggleRead={() => markRead([selectedItem.id], !selectedItem.read)}
            />
          ) : (
            <div className="inbox-read-empty">
              <span className="inbox-empty-ic" aria-hidden>
                <Bell size={20} variant="stroke" />
              </span>
              <strong>Select a message</strong>
              <span>Pick a notification to see its evidence and action.</span>
            </div>
          )}
        </section>
      </div>

      {/* narrow-width fallback */}
      <Drawer
        open={isNarrow && drawerOpen && selectedItem != null}
        onClose={() => setDrawerOpen(false)}
        title={selectedItem?.title ?? ""}
        subtitle={selectedItem?.source}
        footer={
          selectedItem ? (
            <Button
              intent="primary"
              size="sm"
              fullWidth
              loading={pendingActionId === selectedItem.id}
              trailingIcon={<ChevronRight size={16} variant="stroke" />}
              onClick={() => runAction(selectedItem)}
            >
              {selectedItem.action.label}
            </Button>
          ) : undefined
        }
      >
        {selectedItem ? (
          <DrawerBody
            item={selectedItem}
            onToggleRead={() => markRead([selectedItem.id], !selectedItem.read)}
          />
        ) : null}
      </Drawer>
    </div>
  );
}

/* --------------------------------- subviews -------------------------------- */

function CategoryTag({ category }: { category: Category }) {
  const Icon = CATEGORY_ICON[category];
  return (
    <span className="inbox-cat-tag">
      <Icon size={12} variant="stroke" aria-hidden />
      {CATEGORY_LABEL[category]}
    </span>
  );
}

function badgeTone(tone: Tone): "neutral" | "info" | "success" | "warning" | "danger" {
  return tone;
}

function ReadingContent({
  item,
  pending,
  onAction,
  onToggleRead,
}: {
  item: InboxItem;
  pending: boolean;
  onAction: () => void;
  onToggleRead: () => void;
}) {
  const ToneI = TONE_ICON[item.tone];
  return (
    <article className={cx("inbox-read", `tone-${item.tone}`)}>
      <header className="inbox-read-head">
        <div className="inbox-read-headtop">
          <Badge appearance="subtle" tone={badgeTone(item.tone)} icon={<ToneI size={12} variant="stroke" />}>
            {CATEGORY_LABEL[item.category]}
          </Badge>
          <span className="inbox-read-when">{item.when}</span>
          <button
            type="button"
            className="inbox-link inbox-read-toggle"
            aria-pressed={!item.read}
            onClick={onToggleRead}
          >
            {item.read ? "Mark unread" : "Mark read"}
          </button>
        </div>
        <h2 className="inbox-read-title">{item.title}</h2>
        <p className="inbox-read-source">
          {item.initials && <Avatar initials={item.initials} name={item.source} size="sm" />}
          <span>{item.source}</span>
        </p>
      </header>

      <p className="inbox-read-body">{item.body}</p>

      <EvidenceTable rows={item.evidence} />

      <div className="inbox-read-actions">
        <Button
          intent="primary"
          size="sm"
          loading={pending}
          trailingIcon={<ChevronRight size={16} variant="stroke" />}
          onClick={onAction}
        >
          {item.action.label}
        </Button>
        <p className="inbox-read-note">
          <Info size={13} variant="stroke" aria-hidden />
          This is a notification. Anything you need to complete lives in Tasks.
        </p>
      </div>
    </article>
  );
}

function DrawerBody({
  item,
  onToggleRead,
}: {
  item: InboxItem;
  onToggleRead: () => void;
}) {
  const ToneI = TONE_ICON[item.tone];
  return (
    <div className={cx("inbox-drawer", `tone-${item.tone}`)}>
      <div className="inbox-drawer-meta">
        <Badge appearance="subtle" tone={badgeTone(item.tone)} icon={<ToneI size={12} variant="stroke" />}>
          {CATEGORY_LABEL[item.category]}
        </Badge>
        <span className="inbox-read-when">{item.when}</span>
        <button
          type="button"
          className="inbox-link inbox-read-toggle"
          aria-pressed={!item.read}
          onClick={onToggleRead}
        >
          {item.read ? "Mark unread" : "Mark read"}
        </button>
      </div>
      <p className="inbox-read-body">{item.body}</p>
      <EvidenceTable rows={item.evidence} />
      <p className="inbox-read-note">
        <Info size={13} variant="stroke" aria-hidden />
        This is a notification. Anything you need to complete lives in Tasks.
      </p>
    </div>
  );
}

/* Empty list — three distinct branches:
   (a) inbox fully emptied / no data -> neutral Bell, "Inbox empty"
   (b) the unread filter with nothing unread -> success check, "all caught up"
   (c) a specific category filter with zero matches -> neutral, that category's
       own icon + a "Show all" reset. */
function EmptyList({
  filter,
  inboxEmpty,
  onShowAll,
}: {
  filter: FilterKey;
  inboxEmpty: boolean;
  onShowAll: () => void;
}) {
  if (inboxEmpty) {
    return (
      <div className="inbox-empty">
        <span className="inbox-empty-ic is-neutral" aria-hidden>
          <Bell size={20} variant="stroke" />
        </span>
        <strong>Inbox empty</strong>
        <span>Nothing here right now. New activity across your practice lands here.</span>
      </div>
    );
  }

  if (filter === "unread") {
    return (
      <div className="inbox-empty">
        <span className="inbox-empty-ic is-success" aria-hidden>
          <CheckCircle size={20} variant="stroke" />
        </span>
        <strong>You&rsquo;re all caught up</strong>
        <span>No unread messages. New activity will appear here.</span>
      </div>
    );
  }

  if (filter === "all") {
    return (
      <div className="inbox-empty">
        <span className="inbox-empty-ic is-neutral" aria-hidden>
          <Bell size={20} variant="stroke" />
        </span>
        <strong>Nothing to show</strong>
        <span>No messages match right now. New activity will appear here.</span>
      </div>
    );
  }

  const Icon = CATEGORY_ICON[filter];
  return (
    <div className="inbox-empty">
      <span className="inbox-empty-ic is-neutral" aria-hidden>
        <Icon size={20} variant="stroke" />
      </span>
      <strong>No {CATEGORY_LABEL[filter]} notifications</strong>
      <span>Nothing in {CATEGORY_LABEL[filter]} right now.</span>
      <button type="button" className="inbox-link" onClick={onShowAll}>
        Show all
      </button>
    </div>
  );
}

function EvidenceTable({ rows }: { rows: EvidenceRow[] }) {
  return (
    <dl className="inbox-evidence">
      {rows.map((row) => (
        <div className="inbox-evidence-row" key={row.label}>
          <dt>{row.label}</dt>
          <dd>{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export default InboxView;
