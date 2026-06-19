"use client";

/* Global directory search — a full-screen overlay (searchOpen / closeSearch).
   A scope ChipRail (Patients · Bookings · Labs · Catalog) narrows a single
   ranked query that runs across the roster, the cross-patient booking queue,
   the lab-history preview, and the order catalog. Picking a result routes:
   patient → pushPatient, booking → pushBooking, lab → its patient chart,
   catalog item → the catalog tab. Borderless: hairline rows, no boxy cards. */

import { useEffect, useMemo, useRef, useState } from "react";
import { cx } from "@/lib/cx";
import { useOrderDraft } from "@/components/OrderDraft";
import { formatMoney, orderItems } from "@/components/OrderDraft";
import { getBookingSearchKeywords, getBookingTestSummary, bookingStatusView } from "@/components/OrderDraft/bookingShared";
import { getLabHistoryPreview } from "@/components/ui/LabHistory";
import { roster } from "@/components/DoctorMobile/data/clinical";
import { Booking, Catalog, Close, Flask, Patient, Search } from "@/icons/components";
import { useMobileApp } from "@/components/DoctorMobile/state/MobileAppContext";
import { ChipRail, ListRow, Pill } from "@/components/DoctorMobile/components/primitives";
import type { Tone } from "@/components/DoctorMobile/components/primitives";
import base from "@/components/DoctorMobile/DoctorMobileApp.module.css";
import styles from "./SearchOverlay.module.css";

type ScopeId = "all" | "patients" | "bookings" | "labs" | "catalog";

const SCOPES: Array<{ id: ScopeId; label: string }> = [
  { id: "all", label: "All" },
  { id: "patients", label: "Patients" },
  { id: "bookings", label: "Bookings" },
  { id: "labs", label: "Labs" },
  { id: "catalog", label: "Catalog" },
];

type ResultKind = "patient" | "booking" | "lab" | "catalog";

type SearchResult = {
  id: string;
  kind: ResultKind;
  title: string;
  meta: string;
  sub?: string;
  tone?: Tone;
  trailing?: React.ReactNode;
  score: number;
  onSelect: () => void;
};

const KIND_ICON: Record<ResultKind, React.ReactNode> = {
  patient: <Patient size={16} variant="stroke" aria-hidden="true" />,
  booking: <Booking size={16} variant="stroke" aria-hidden="true" />,
  lab: <Flask size={16} variant="stroke" aria-hidden="true" />,
  catalog: <Catalog size={16} variant="stroke" aria-hidden="true" />,
};

const KIND_LABEL: Record<ResultKind, string> = {
  patient: "Patients",
  booking: "Bookings",
  lab: "Recent labs",
  catalog: "Catalog",
};

const KIND_ORDER: ResultKind[] = ["patient", "booking", "lab", "catalog"];

/* Substring rank: prefix on a word boundary beats mid-token; shorter haystacks
   that match rank higher. Returns null on no match. Deterministic, no fuzz. */
function rankMatch(haystack: string, query: string): number | null {
  const h = haystack.toLowerCase();
  const idx = h.indexOf(query);
  if (idx < 0) return null;
  const wordStart = idx === 0 || /[\s·|/(),-]/.test(h[idx - 1]);
  return (wordStart ? 0 : 40) + idx + h.length * 0.01;
}

/* Best rank of a query across several fields. */
function bestRank(fields: string[], query: string): number | null {
  let best: number | null = null;
  for (const field of fields) {
    const rank = rankMatch(field, query);
    if (rank != null && (best == null || rank < best)) best = rank;
  }
  return best;
}

/* The overlay is a mount gate: SearchPanel mounts fresh on each open, so query
   and scope start from their useState defaults — no reset effect (which would
   trip set-state-in-effect). */
export function SearchOverlay() {
  const { searchOpen } = useMobileApp();
  if (!searchOpen) return null;
  return <SearchPanel />;
}

function SearchPanel() {
  const { closeSearch, pushPatient, pushBooking, go } = useMobileApp();
  const { allBookings } = useOrderDraft();
  const [scope, setScope] = useState<ScopeId>("all");
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  /* focus on mount; Esc closes; lock body scroll while open. No setState here. */
  useEffect(() => {
    const id = window.setTimeout(() => inputRef.current?.focus(), 40);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeSearch();
    };
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [closeSearch]);

  const labPreviews = useMemo(() => getLabHistoryPreview(), []);

  const results = useMemo<SearchResult[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const out: SearchResult[] = [];

    if (scope === "all" || scope === "patients") {
      roster.forEach((patient) => {
        const rank = bestRank(
          [patient.name, patient.khmerName ?? "", patient.identity, patient.context, patient.conditionCodes.join(" ")],
          q,
        );
        if (rank == null) return;
        out.push({
          id: `patient-${patient.id}`,
          kind: "patient",
          title: patient.name,
          meta: patient.identity,
          sub: patient.context,
          tone: patient.acuity === "urgent" ? "danger" : patient.acuity === "watch" ? "warning" : "neutral",
          score: rank,
          onSelect: () => {
            closeSearch();
            pushPatient(patient.id);
          },
        });
      });
    }

    if (scope === "all" || scope === "bookings") {
      allBookings.forEach((order) => {
        const rank = bestRank([order.patientName, order.mrn, ...getBookingSearchKeywords(order)], q);
        if (rank == null) return;
        const status = bookingStatusView(order);
        const anchor = order.bookingCode ?? order.code;
        out.push({
          id: `booking-${order.code}`,
          kind: "booking",
          title: order.patientName,
          meta: `${anchor} · ${getBookingTestSummary(order)}`,
          tone: status.tone as Tone,
          trailing: (
            <Pill tone={status.tone as Tone}>
              <status.Icon size={12} variant="stroke" aria-hidden="true" />
              {status.label}
            </Pill>
          ),
          score: rank,
          onSelect: () => {
            closeSearch();
            pushBooking(order.code);
          },
        });
      });
    }

    if (scope === "all" || scope === "labs") {
      labPreviews.forEach((entry) => {
        const rank = bestRank([entry.detail.labName, entry.group, entry.latestLabel, entry.reference], q);
        if (rank == null) return;
        const tone: Tone =
          entry.status === "critical" || entry.status === "abnormal"
            ? "danger"
            : entry.status === "watch"
              ? "warning"
              : "success";
        out.push({
          id: `lab-${entry.key}`,
          kind: "lab",
          title: entry.detail.labName,
          meta: entry.detail.reasonText,
          sub: entry.latestValue ? `${entry.latestValue}${entry.latestUnit ? ` ${entry.latestUnit}` : ""} · ${entry.reference}` : entry.reference,
          tone,
          score: rank,
          onSelect: () => {
            closeSearch();
            /* labs belong to the active chart patient — open their chart */
            pushPatient(roster[0]?.id ?? "sokha-chan");
          },
        });
      });
    }

    if (scope === "all" || scope === "catalog") {
      orderItems.forEach((item) => {
        const rank = bestRank([item.name, item.code, item.fullName ?? "", item.analytes?.join(" ") ?? ""], q);
        if (rank == null) return;
        out.push({
          id: `catalog-${item.id}`,
          kind: "catalog",
          title: item.name,
          meta: `${item.code} · ${item.tat}`,
          sub: item.fullName && item.fullName !== item.name ? item.fullName : undefined,
          trailing: (
            <span style={{ fontVariantNumeric: "tabular-nums" }}>
              {item.unavailable ? "—" : formatMoney(item.price)}
            </span>
          ),
          score: rank,
          onSelect: () => {
            closeSearch();
            go("catalog");
          },
        });
      });
    }

    return out.sort((a, b) => a.score - b.score);
  }, [query, scope, allBookings, labPreviews, closeSearch, pushPatient, pushBooking, go]);

  /* group results by kind, preserving KIND_ORDER and within-group rank */
  const grouped = useMemo(() => {
    const map = new Map<ResultKind, SearchResult[]>();
    results.forEach((result) => {
      const list = map.get(result.kind) ?? [];
      list.push(result);
      map.set(result.kind, list);
    });
    return KIND_ORDER.filter((kind) => map.has(kind)).map((kind) => ({ kind, items: map.get(kind)! }));
  }, [results]);

  const trimmed = query.trim();

  return (
    <div className={base.overlay} role="dialog" aria-modal="true" aria-label="Search" onClick={closeSearch}>
      <div className={base.searchSheet} onClick={(event) => event.stopPropagation()}>
        <div className={base.sheetHeader}>
          <h2>Search</h2>
          <button className={base.iconButton} type="button" aria-label="Close search" onClick={closeSearch}>
            <Close size={18} variant="stroke" aria-hidden="true" />
          </button>
        </div>

        <label className={base.searchBox}>
          <Search size={16} variant="stroke" aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            placeholder="Patients, bookings, labs, tests…"
            aria-label="Search query"
            autoComplete="off"
            enterKeyHint="search"
          />
          {query ? (
            <button className={base.iconButton} type="button" aria-label="Clear" onClick={() => setQuery("")}>
              <Close size={14} variant="stroke" aria-hidden="true" />
            </button>
          ) : null}
        </label>

        <div className={styles.scopeRail}>
          <ChipRail items={SCOPES} activeId={scope} onSelect={(id) => setScope(id as ScopeId)} />
        </div>

        <div className={cx(base.sectionStack, styles.results)}>
          {!trimmed ? (
            <p className={base.muted}>Search across patients, bookings, recent labs, and the test catalog.</p>
          ) : results.length === 0 ? (
            <p className={base.muted}>No matches for &ldquo;{trimmed}&rdquo;.</p>
          ) : (
            grouped.map((section) => (
              <div key={section.kind} className={base.sectionStack} style={{ gap: 0 }}>
                <div className={base.sectionHeader}>
                  <h2>{KIND_LABEL[section.kind]}</h2>
                  <span>{section.items.length}</span>
                </div>
                <div className={base.cardGroup}>
                  {section.items.map((result) => (
                    <ListRow
                      key={result.id}
                      leading={KIND_ICON[result.kind]}
                      tone={result.tone}
                      title={result.title}
                      meta={result.meta}
                      sub={result.sub}
                      trailing={result.trailing}
                      onClick={result.onSelect}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default SearchOverlay;
