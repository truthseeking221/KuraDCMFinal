"use client";

/* Presentational mobile primitives — atomic, token-driven, reusing the base
   stylesheet (DoctorMobileApp.module.css). Screen agents compose these; they
   never hand-roll the hairline row / chip rail / metric grid. */

import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import { ChevronRight } from "@/icons/components";
import base from "../DoctorMobileApp.module.css";

export type Tone = "danger" | "warning" | "info" | "success" | "neutral" | "brand";

/* Map a tone to the base tone classes. "brand" has no base tile/text class, so
   it falls back to the closest available token-driven look (info/neutral). */
export function toneClass(tone: Tone): string {
  switch (tone) {
    case "danger":
      return base.tone_danger;
    case "warning":
      return base.tone_warning;
    case "info":
      return base.tone_info;
    case "success":
      return base.tone_success;
    case "brand":
      return base.tone_info;
    case "neutral":
    default:
      return base.tone_neutral;
  }
}

export function toneTextClass(tone: Tone): string {
  switch (tone) {
    case "danger":
      return base.text_danger;
    case "warning":
      return base.text_warning;
    case "info":
      return base.text_info;
    case "success":
      return base.text_success;
    case "brand":
      return base.text_info;
    case "neutral":
    default:
      return base.text_neutral;
  }
}

/* ----------------------------------------------------------- ListRow ------- */

export function ListRow({
  leading,
  title,
  meta,
  sub,
  trailing,
  selected = false,
  tone,
  onClick,
  as = "button",
}: {
  leading?: ReactNode;
  title: ReactNode;
  meta?: ReactNode;
  sub?: ReactNode;
  trailing?: ReactNode;
  selected?: boolean;
  tone?: Tone;
  onClick?: () => void;
  as?: "button" | "div";
}) {
  const body = (
    <>
      {leading != null && <span className={cx(base.taskIcon, tone && toneClass(tone))}>{leading}</span>}
      <span className={base.taskBody}>
        <span className={base.taskPatient}>{title}</span>
        {meta != null && <span className={base.taskReason}>{meta}</span>}
        {sub != null && <span className={base.taskMeta}>{sub}</span>}
      </span>
      {trailing != null ? (
        <span className={base.priceStack}>{trailing}</span>
      ) : as === "button" && onClick ? (
        <ChevronRight size={16} variant="stroke" aria-hidden="true" />
      ) : null}
    </>
  );

  const className = cx(
    base.testRow,
    selected && base.testRowSelected,
    leading != null && base.moreRow,
  );

  /* grid columns adapt: with leading icon use the 3-col moreRow template,
     otherwise the 2-col testRow template. */
  const gridStyle = leading != null
    ? { gridTemplateColumns: "32px minmax(0, 1fr) auto" }
    : undefined;

  if (as === "div") {
    return (
      <div className={className} style={gridStyle}>
        {body}
      </div>
    );
  }
  return (
    <button className={className} style={gridStyle} type="button" onClick={onClick}>
      {body}
    </button>
  );
}

/* ----------------------------------------------------------- ChipRail ------ */

export type ChipItem = { id: string; label: string; count?: number };

export function ChipRail({
  items,
  activeId,
  onSelect,
  multi = false,
}: {
  items: ChipItem[];
  activeId: string | string[] | null;
  onSelect: (id: string) => void;
  multi?: boolean;
}) {
  const isActive = (id: string) =>
    Array.isArray(activeId) ? activeId.includes(id) : activeId === id;
  return (
    <div className={base.filterChips} role="group">
      {items.map((item) => (
        <button
          key={item.id}
          className={cx(base.filterChip, isActive(item.id) && base.filterChipActive)}
          type="button"
          aria-pressed={isActive(item.id)}
          onClick={() => onSelect(item.id)}
        >
          {item.label}
          {item.count != null ? ` · ${item.count}` : ""}
        </button>
      ))}
      {multi ? <span hidden aria-hidden="true" /> : null}
    </div>
  );
}

/* --------------------------------------------------------- SegmentTabs ----- */

export function SegmentTabs({
  items,
  activeId,
  onSelect,
}: {
  items: Array<{ id: string; label: string }>;
  activeId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className={base.segmented} role="tablist">
      {items.map((item) => (
        <button
          key={item.id}
          className={cx(base.segment, item.id === activeId && base.segmentActive)}
          type="button"
          role="tab"
          aria-selected={item.id === activeId}
          onClick={() => onSelect(item.id)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

/* -------------------------------------------------------- SectionHeader ---- */

export function SectionHeader({
  title,
  meta,
  action,
}: {
  title: ReactNode;
  meta?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className={base.sectionHeader}>
      <h2>{title}</h2>
      {action != null ? action : meta != null ? <span>{meta}</span> : null}
    </div>
  );
}

/* -------------------------------------------------------- StickyCtaDock ---- */

export function StickyCtaDock({ children }: { children: ReactNode }) {
  return <div className={base.stickyCta}>{children}</div>;
}

/* ----------------------------------------------------------- MetricGrid ---- */

export function MetricGrid({
  items,
}: {
  items: Array<{ label: string; value: ReactNode; meta?: ReactNode; tone?: Tone }>;
}) {
  return (
    <div className={base.metricsGrid}>
      {items.map((item, index) => (
        <article key={`${item.label}-${index}`} className={base.metricCard}>
          <span className={base.metricLabel}>{item.label}</span>
          <strong className={item.tone ? toneTextClass(item.tone) : undefined}>{item.value}</strong>
          {item.meta != null && <span>{item.meta}</span>}
        </article>
      ))}
    </div>
  );
}

/* ----------------------------------------------------------------- Pill ---- */

export function Pill({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={cx(base.statusPill, toneClass(tone))}>{children}</span>;
}

export function ToneDot({ tone }: { tone: Tone }) {
  return <span className={cx(base.attnDot, toneTextClass(tone))} aria-hidden="true" />;
}

export function Money({ usd }: { usd: number | null }) {
  return <span style={{ fontVariantNumeric: "tabular-nums" }}>{usd === null ? "$—" : `$${usd.toFixed(2)}`}</span>;
}
