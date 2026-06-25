"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import type { CSSProperties, HTMLAttributes, KeyboardEvent, RefObject } from "react";
import { Check as CheckIcon, Clock as ClockIcon, Plus as PlusIcon, Tube as TubeIcon } from "@/icons/components";
import {
  formatMoney,
  getItemPatientContext,
  specimenFilters,
} from "@/components/OrderDraft";
import type { OrderItem } from "@/components/OrderDraft";
import { cx } from "@/lib/cx";

const SPECIMEN_LABEL = new Map(specimenFilters.map((s) => [s.id, s.label]));

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

/* Figma TestCard v3: 716px two-column surface. The estimate only seeds the
   first flip-placement pass before the real height is measured. */
const CARD_WIDTH = 716;
const CARD_EST_HEIGHT = 330;
const GAP = 8;
const VIEWPORT_PAD = 12;

function toneClass(item: OrderItem, patientTone?: "danger" | "warning") {
  if (item.unavailable) return "warning";
  return patientTone ?? "success";
}

/* Anchored, viewport-fixed so it never clips inside the catalog's scroll
   container; flips above the row when there isn't room below. Ordering actions
   stay on the row / right rail, but the card keeps hover alive for inspection. */
export function TestContextPopover({
  item,
  anchorRef,
  guardRef,
  hoverProps,
  selected = false,
  onToggle,
}: {
  item: OrderItem;
  anchorRef: RefObject<HTMLElement | null>;
  /* Optional row element whose action controls (Add / remove ✕ / favorite ♥)
     the card must never cover. When provided, placement is computed against the
     FULL row band, not just the trigger, and the card is clamped flush to the
     side with more room so the row's buttons always stay uncovered. */
  guardRef?: RefObject<HTMLElement | null>;
  hoverProps?: HTMLAttributes<HTMLDivElement>;
  selected?: boolean;
  onToggle?: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const patientCtx = getItemPatientContext(item.id);
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
      /* The "keep clear" band: the full row (trigger + its action buttons) when a
         guard is given, otherwise just the trigger. The card is never allowed to
         sit inside this band, so it can never cover Add / remove / favorite. */
      const guard = guardRef?.current?.getBoundingClientRect();
      const bandTop = guard ? Math.min(guard.top, rect.top) : rect.top;
      const bandBottom = guard ? Math.max(guard.bottom, rect.bottom) : rect.bottom;
      /* real measured height once mounted; the estimate covers the first pass */
      const cardH = cardRef.current?.offsetHeight || CARD_EST_HEIGHT;
      const cardW = Math.min(CARD_WIDTH, window.innerWidth - VIEWPORT_PAD * 2);
      const left = Math.max(
        VIEWPORT_PAD,
        Math.min(rect.left + rect.width / 2 - cardW / 2, window.innerWidth - cardW - VIEWPORT_PAD),
      );
      /* Compare the room above vs below the keep-clear band; prefer below when it
         fits, otherwise take the roomier side. Placement is measured from the
         band edges (not the trigger) so the gap clears the row's buttons too. */
      const roomBelow = window.innerHeight - VIEWPORT_PAD - (bandBottom + GAP);
      const roomAbove = bandTop - GAP - VIEWPORT_PAD;
      const below = roomBelow >= cardH || roomBelow >= roomAbove;
      let top = below ? bandBottom + GAP : bandTop - cardH - GAP;
      /* clamp on-screen, then enforce the guard: if clamping dragged the card
         back over the band, pin it flush to the chosen side's band edge. */
      top = Math.max(VIEWPORT_PAD, Math.min(top, window.innerHeight - cardH - VIEWPORT_PAD));
      if (below && top < bandBottom + GAP) top = bandBottom + GAP;
      if (!below && top + cardH > bandTop - GAP) top = bandTop - GAP - cardH;
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
  }, [anchorRef, guardRef]);

  if (!pos) return null;

  const tone = toneClass(item, patientCtx?.tone);
  const specimens = item.specimens.map((s) => SPECIMEN_LABEL.get(s) ?? s).join(", ");
  const referenceText = item.referenceRange?.us ? `Ref ${item.referenceRange.us}` : item.note ?? null;
  const subtitle = item.fullName && item.fullName !== item.name ? item.fullName : null;
  const analyteCount = item.analytes?.length ?? 0;
  const sampleLabel = item.sample || item.container || specimens;
  const specimenLine = [item.container || item.sample || specimens, item.volume]
    .filter(Boolean)
    .join(" · ");
  const summary = item.unavailable
    ? `Unavailable — ${item.unavailable.reason}`
    : item.description ?? patientCtx?.reason ?? subtitle ?? null;
  const summaryTone = item.unavailable ? "warning" : summary === patientCtx?.reason ? patientCtx?.tone : null;
  const badgePrimary = patientCtx?.lastValue ?? (analyteCount > 0 ? `${analyteCount} analytes` : item.prep ?? null);
  const badgeSecondary = patientCtx?.lastOrdered ?? (patientCtx ? "latest" : item.prep ? "prep" : null);
  const baseAnalyticalRows = [
    item.analyzer ? { label: "Analyzer", value: item.analyzer } : null,
    item.method ? { label: "Method", value: item.method } : null,
  ].filter((row): row is { label: string; value: string } => Boolean(row));
  const analyticalRows = baseAnalyticalRows.length > 0
    ? baseAnalyticalRows
    : referenceText
      ? [{ label: "Reference", value: referenceText }]
      : [];
  const baseHandlingRows = [
    item.stability ? { label: "Stability", value: item.stability } : null,
    item.transport ? { label: "Transport", value: item.transport } : null,
  ].filter((row): row is { label: string; value: string } => Boolean(row));
  const handlingRows = baseHandlingRows.length > 0
    ? baseHandlingRows
    : specimenLine
      ? [{ label: "Specimen", value: specimenLine }]
      : [];
  const popoverStyle = {
    top: pos.top,
    left: pos.left,
    width: pos.width,
  } as CSSProperties;
  const actionLabel = item.unavailable ? "Unavailable" : selected ? "Remove" : "Add to order";
  const ActionIcon = selected ? CheckIcon : PlusIcon;

  return createPortal(
    <div
      ref={cardRef}
      role="dialog"
      aria-label={`${item.name} test details`}
      className={cx("orders-popover", `tone-${tone}`)}
      data-placement={pos.placement}
      style={popoverStyle}
      {...hoverProps}
    >
      <section className="opp-overview" aria-label="Test summary">
        <header className="opp-head">
          <span className="opp-head-id">
            <span className="opp-name">{item.name}</span>
            {subtitle && <span className="opp-sub">{subtitle}</span>}
          </span>
          {badgePrimary && (
            <span className={cx("opp-badge", `tone-${tone}`)}>
              <span>{badgePrimary}</span>
              {badgeSecondary && <span>{badgeSecondary}</span>}
            </span>
          )}
        </header>

        {summary ? <p className={cx("opp-summary", summaryTone && `tone-${summaryTone}`)}>{summary}</p> : null}

        <div className="opp-quick-meta" aria-label="Collection summary">
          <span className="opp-quick-meta-row">
            <span className="opp-meta-chip">
              <span aria-hidden className="opp-tube-dot" />
              <span>{sampleLabel}</span>
            </span>
            <span className="opp-meta-chip">
              <ClockIcon size={14} variant="stroke" />
              <span>{item.tat}</span>
            </span>
          </span>
          <span className="opp-meta-chip">
            <TubeIcon size={14} variant="stroke" />
            <span>{item.code}</span>
          </span>
        </div>
      </section>

      <span aria-hidden className="opp-divider" />

      <section className="opp-detail" aria-label="Test operations">
        <div className="opp-section">
          <h3>Analytical</h3>
          <dl className="opp-kv">
            {analyticalRows.length > 0 ? (
              analyticalRows.map((row) => (
                <div className="opp-kv-row" key={row.label}>
                  <dt>{row.label}</dt>
                  <dd>{row.value}</dd>
                </div>
              ))
            ) : (
              <div className="opp-kv-row">
                <dt>Code</dt>
                <dd>{item.code}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="opp-section">
          <h3>{`Specimen & handling`}</h3>
          <dl className="opp-kv">
            {handlingRows.map((row) => (
              <div className="opp-kv-row" key={row.label}>
                <dt>{row.label}</dt>
                <dd>{row.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <footer className="opp-footer">
          <span className="opp-price">
            <strong>{formatMoney(item.price)}</strong>
            <small>{`You'll earn ${formatMoney(item.price * 0.6)}`}</small>
          </span>
          {onToggle && (
            <button
              aria-label={`${actionLabel}: ${item.name}`}
              className="opp-action"
              disabled={!!item.unavailable}
              onClick={(event) => {
                event.stopPropagation();
                if (!item.unavailable) onToggle();
              }}
              type="button"
            >
              <ActionIcon size={16} variant="stroke" />
              <span>{actionLabel}</span>
            </button>
          )}
        </footer>
      </section>
    </div>,
    document.body,
  );
}
