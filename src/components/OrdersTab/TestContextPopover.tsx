"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import type { CSSProperties, HTMLAttributes, KeyboardEvent, RefObject } from "react";
import {
  Check as CheckIcon,
  Plus as PlusIcon,
  Warning as WarningIcon,
} from "@/icons/components";
import {
  formatMoney,
  getItemPatientContext,
  specimenFilters,
} from "@/components/OrderDraft";
import type { OrderItem } from "@/components/OrderDraft";
import { cx } from "@/lib/cx";

const SPECIMEN_LABEL = new Map(specimenFilters.map((s) => [s.id, s.label]));
const REFERRAL_PCT = 0.3;

/* Exactly one detail popover is open across the whole catalog. The open id
   lives in a module-level store (no provider to thread) so hover/focus on any
   row atomically claims the single slot and the previously-open row closes —
   this is what prevents two popovers showing at once when one row is hovered
   while another stays focused. Opens on pointer hover (wrapperProps, on the row
   container) or keyboard focus (triggerProps, on the trigger button); Esc and a
   selection click close it; re-hover reopens. The card itself can hold hover so
   users can move into it without collapsing the detail preview. */
let openPopoverId: string | null = null;
const popoverListeners = new Set<() => void>();
const POINTER_OPEN_DELAY_MS = 1500;
const POINTER_CLOSE_GRACE_MS = 180;
const POINTER_FOCUS_SUPPRESS_MS = 650;

function setOpenPopover(id: string | null) {
  if (openPopoverId === id) return;
  openPopoverId = id;
  popoverListeners.forEach((listener) => listener());
}

/* close only if I'm the one currently open — never stomp another row's slot */
function closePopoverIfMine(id: string) {
  if (openPopoverId === id) setOpenPopover(null);
}

function subscribePopover(listener: () => void) {
  popoverListeners.add(listener);
  return () => {
    popoverListeners.delete(listener);
  };
}

export function useHoverFocusPopover(id: string) {
  const openTimerRef = useRef<number | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const lastPointerDownRef = useRef(0);
  const activeId = useSyncExternalStore(
    subscribePopover,
    () => openPopoverId,
    () => null,
  );

  const clearOpenTimer = useCallback(() => {
    if (openTimerRef.current) {
      window.clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
  }, []);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const openNow = useCallback(() => {
    clearOpenTimer();
    clearCloseTimer();
    setOpenPopover(id);
  }, [clearCloseTimer, clearOpenTimer, id]);

  const openAfterHoverIntent = useCallback(() => {
    clearOpenTimer();
    clearCloseTimer();
    openTimerRef.current = window.setTimeout(() => {
      openTimerRef.current = null;
      setOpenPopover(id);
    }, POINTER_OPEN_DELAY_MS);
  }, [clearCloseTimer, clearOpenTimer, id]);

  const closeNow = useCallback(() => {
    clearOpenTimer();
    clearCloseTimer();
    closePopoverIfMine(id);
  }, [clearCloseTimer, clearOpenTimer, id]);

  const closeAfterHoverGrace = useCallback(() => {
    clearOpenTimer();
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => {
      closeTimerRef.current = null;
      closePopoverIfMine(id);
    }, POINTER_CLOSE_GRACE_MS);
  }, [clearCloseTimer, clearOpenTimer, id]);

  useEffect(() => {
    return () => {
      clearOpenTimer();
      clearCloseTimer();
    };
  }, [clearCloseTimer, clearOpenTimer]);

  return {
    open: activeId === id,
    /* close after a selection click — the caller invokes this in its onClick so
       the popover doesn't linger over the row the cursor is still resting on.
       Re-hover (leave then re-enter) reopens it. */
    dismiss: closeNow,
    wrapperProps: {
      onMouseEnter: openAfterHoverIntent,
      onMouseLeave: closeAfterHoverGrace,
    },
    popoverProps: {
      onMouseEnter: openNow,
      onMouseLeave: closeAfterHoverGrace,
      onFocus: openNow,
      onBlur: closeAfterHoverGrace,
    },
    triggerProps: {
      onPointerDown: () => {
        lastPointerDownRef.current = Date.now();
      },
      onFocus: () => {
        if (Date.now() - lastPointerDownRef.current < POINTER_FOCUS_SUPPRESS_MS) return;
        openNow();
      },
      onBlur: closeAfterHoverGrace,
      onKeyDown: (event: KeyboardEvent) => {
        if (event.key === "Escape") closeNow();
      },
    },
  };
}

const PANEL_WIDTH = 460;
const PANEL_COMPACT_WIDTH = 340;
/* Rough panel height used only to decide flip-above near the viewport bottom.
   Estimate the real card height on the first placement pass (before measure). */
const PANEL_EST_HEIGHT = 290;
const PANEL_COMPACT_EST_HEIGHT = 208;
const GAP = 8;
const VIEWPORT_PAD = 12;
/* Total analyte chips shown across all groups before the long tail collapses to
   one quiet "+N more" chip. Replaces the old inner scrollbar as the overflow
   strategy — the honest total still shows in the Panel Contents headline. */
const ANALYTE_CHIP_CAP = 14;

function toneClass(item: OrderItem, patientTone?: "danger" | "warning") {
  if (item.unavailable) return "warning";
  return patientTone ?? "success";
}

function kv(label: string, value: string | undefined | null) {
  return value ? { label, value } : null;
}

function defaultAnalyteGroups(item: OrderItem) {
  if (!item.analytes?.length) return [];
  return item.analyteGroups?.length ? item.analyteGroups : [{ label: "Includes", analytes: item.analytes }];
}

/* Anchored, viewport-fixed so it never clips inside the catalog's scroll
   container; flips above the row when there isn't room below. Ordering actions
   stay on the row / right rail, but the card keeps hover alive for inspection. */
export function TestContextPopover({
  item,
  anchorRef,
  hoverProps,
  selected = false,
  onToggle,
}: {
  item: OrderItem;
  anchorRef: RefObject<HTMLElement | null>;
  hoverProps?: HTMLAttributes<HTMLDivElement>;
  selected?: boolean;
  onToggle?: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const patientCtx = getItemPatientContext(item.id);
  const analyteGroups = defaultAnalyteGroups(item);
  const compact = !patientCtx?.labKey && analyteGroups.length === 0;
  const minimal = compact && !patientCtx;
  const [pos, setPos] = useState<{
    top: number;
    left: number;
    placement: "top" | "bottom";
    width: number;
  } | null>(null);

  useLayoutEffect(() => {
    let raf = 0;
    const place = () => {
      const el = anchorRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      /* real measured height once mounted; the estimate covers the first pass */
      const cardH = cardRef.current?.offsetHeight || (compact ? PANEL_COMPACT_EST_HEIGHT : PANEL_EST_HEIGHT);
      const cardW = Math.min(compact ? PANEL_COMPACT_WIDTH : PANEL_WIDTH, window.innerWidth - VIEWPORT_PAD * 2);
      const left = Math.max(
        VIEWPORT_PAD,
        Math.min(rect.left + rect.width / 2 - cardW / 2, window.innerWidth - cardW - VIEWPORT_PAD),
      );
      const below = rect.bottom + cardH + GAP <= window.innerHeight - VIEWPORT_PAD;
      const rawTop = below ? rect.bottom + GAP : rect.top - cardH - GAP;
      /* clamp fully on-screen — a card taller than the row's free space would
         otherwise clip at the top or bottom edge */
      const top = Math.max(
        VIEWPORT_PAD,
        Math.min(rawTop, window.innerHeight - cardH - VIEWPORT_PAD),
      );
      setPos({ top, left, placement: below ? "bottom" : "top", width: cardW });
    };
    place();
    /* re-place once the real card height is known (first pass used the estimate) */
    raf = window.requestAnimationFrame(place);
    /* reposition while the catalog scrolls or the window resizes */
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [anchorRef, compact]);

  if (!pos) return null;

  const specimens = item.specimens.map((s) => SPECIMEN_LABEL.get(s) ?? s).join(", ");
  const referral = item.price > 0 ? `$${(item.price * REFERRAL_PCT).toFixed(2)} · 30%` : undefined;
  const tone = toneClass(item, patientCtx?.tone);
  const badgeMain = patientCtx?.lastValue ?? item.code;
  const badgeMeta = patientCtx?.lastOrdered ?? item.tat;
  const referenceText = item.referenceRange?.us ? `Ref ${item.referenceRange.us}` : item.note ? item.note : "Catalog reference";
  const minimalReference = item.referenceRange?.us ? `Ref ${item.referenceRange.us}` : item.note ?? null;
  const handlingFacts = [
    kv("Sample", item.sample || specimens),
    kv("Specimen", specimens),
    kv("Container", item.container),
    kv("Volume", item.volume),
    kv("Preparation", item.prep),
    kv("Stability", item.stability),
    kv("Transport", item.transport),
    kv("Turnaround", item.tat),
  ].filter((fact): fact is { label: string; value: string } => Boolean(fact));
  const buttonLabel = item.unavailable ? "Unavailable" : selected ? "Remove" : "Add to Order";
  const ActionIcon = selected ? CheckIcon : PlusIcon;

  const popoverStyle = {
    top: pos.top,
    left: pos.left,
    width: pos.width,
  } as CSSProperties;

  const footer = (
    <div className="opp-footer">
      <span className="opp-price-main">
        <strong>{formatMoney(item.price)}</strong>
        {referral && <small>Referral {referral}</small>}
      </span>
      <button
        type="button"
        className={cx("opp-action", selected && "is-selected")}
        disabled={!!item.unavailable || !onToggle}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          if (item.unavailable || !onToggle) return;
          onToggle();
          setOpenPopover(null);
        }}
      >
        <ActionIcon size={16} variant={selected ? "stroke" : "solid"} />
        <span>{buttonLabel}</span>
      </button>
    </div>
  );

  if (minimal) {
    return createPortal(
      <div
        ref={cardRef}
        role="dialog"
        aria-label={`${item.name} test details`}
        className={cx("orders-popover", "is-minimal", `tone-${tone}`)}
        data-placement={pos.placement}
        style={popoverStyle}
        {...hoverProps}
      >
        <section className="opp-minimal-main" aria-label="Test summary">
          <div className="opp-title-row">
            <span className="orders-popover-id">
              <span className="orders-popover-title">{item.name}</span>
              {item.fullName && <span className="orders-popover-sub">{item.fullName}</span>}
            </span>
            <span className="opp-result-badge">
              <span className="opp-result-value">{badgeMain}</span>
              <span className="opp-result-date">{badgeMeta}</span>
            </span>
          </div>

          {minimalReference && <p className="opp-reference">{minimalReference}</p>}

          {item.unavailable ? (
            <p className="orders-popover-signal tone-warning">
              <WarningIcon size={13} variant="bulk" />
              <span>Unavailable — {item.unavailable.reason}</span>
            </p>
          ) : null}

          <div className="opp-minimal-meta" aria-label="Specimen summary">
            <span>{item.sample || specimens}</span>
            <span>{item.tat}</span>
          </div>
        </section>

        {footer}
      </div>,
      document.body,
    );
  }

  return createPortal(
    <div
      ref={cardRef}
      role="dialog"
      aria-label={`${item.name} test details`}
      className={cx("orders-popover", `tone-${tone}`, compact && "is-compact")}
      data-placement={pos.placement}
      style={popoverStyle}
      {...hoverProps}
    >
      <div className={cx("opp-card-main", analyteGroups.length === 0 && "is-solo")}>
        <section className="opp-primary" aria-label="Test summary">
          <div className="opp-title-row">
            <span className="orders-popover-id">
              <span className="orders-popover-title">{item.name}</span>
              {item.fullName && <span className="orders-popover-sub">{item.fullName}</span>}
            </span>
            <span className="opp-result-badge">
              <span className="opp-result-value">{badgeMain}</span>
              <span className="opp-result-date">{badgeMeta}</span>
            </span>
          </div>

          {item.description ? <p className="opp-description">{item.description}</p> : null}

          <p className="opp-reference">{referenceText}</p>

          {item.unavailable ? (
            <p className="orders-popover-signal tone-warning">
              <WarningIcon size={13} variant="bulk" />
              <span>Unavailable — {item.unavailable.reason}</span>
            </p>
          ) : patientCtx ? (
            <p className={cx("orders-popover-signal", `tone-${patientCtx.tone}`)}>
              <WarningIcon size={13} variant="bulk" />
              <span>{patientCtx.reason}</span>
            </p>
          ) : null}
        </section>

        {/* Panel Contents pairs with the chart spine as the second balanced
            column. Omitted (and the card goes single-column) for single-analyte
            tests, which have no panel. Specimen lives full-width below. */}
        {analyteGroups.length > 0 && (
          <>
            <div className="opp-divider" aria-hidden />
            <section className="opp-detail" aria-label="Panel contents">
              <div className="opp-section">
                <h3>Panel Contents</h3>
                <div className="opp-panel-headline">
                  <strong>{item.analytes?.length ?? 0} analytes</strong>
                  <span>Ordered together</span>
                </div>
                {(() => {
                  const total = item.analytes?.length ?? 0;
                  let shown = 0;
                  return (
                    <div className="opp-analyte-groups">
                      {analyteGroups.map((group) => {
                        if (shown >= ANALYTE_CHIP_CAP) return null;
                        const visible = group.analytes.slice(0, ANALYTE_CHIP_CAP - shown);
                        shown += visible.length;
                        return (
                          <div className="opp-analyte-group" key={group.label}>
                            <span className="opp-analyte-group-label">{group.label}</span>
                            <div className="opp-analyte-list">
                              {visible.map((analyte) => (
                                <span className="opp-analyte-chip" key={analyte}>
                                  {analyte}
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                      {total > shown && (
                        <div className="opp-analyte-list">
                          <span className="opp-analyte-chip is-more">+{total - shown} more</span>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </section>
          </>
        )}
      </div>

      <section className="opp-handling opp-section" aria-label="Specimen and handling">
        <h3>Specimen &amp; Handling</h3>
        <div className="opp-kv-list">
          {handlingFacts.map((fact) => (
            <div className="opp-kv" key={fact.label}>
              <span>{fact.label}</span>
              <strong>{fact.value}</strong>
            </div>
          ))}
        </div>
      </section>

      {footer}
    </div>,
    document.body,
  );
}
