"use client";

import { useLayoutEffect, useState, useSyncExternalStore } from "react";
import type { KeyboardEvent, RefObject } from "react";
import {
  Clock as ClockIcon,
  CreditCard as CreditCardIcon,
  Tube as TubeIcon,
  Warning as WarningIcon,
} from "@/icons/components";
import {
  COVERAGE_LABEL,
  getItemLabContexts,
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
   selection click close it; re-hover reopens. Read-only — the row click stays
   dedicated to selection. */
let openPopoverId: string | null = null;
const popoverListeners = new Set<() => void>();

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
  const activeId = useSyncExternalStore(
    subscribePopover,
    () => openPopoverId,
    () => null,
  );

  return {
    open: activeId === id,
    /* close after a selection click — the caller invokes this in its onClick so
       the popover doesn't linger over the row the cursor is still resting on.
       Re-hover (leave then re-enter) reopens it. */
    dismiss: () => closePopoverIfMine(id),
    wrapperProps: {
      onMouseEnter: () => setOpenPopover(id),
      onMouseLeave: () => closePopoverIfMine(id),
    },
    triggerProps: {
      onFocus: () => setOpenPopover(id),
      onBlur: () => closePopoverIfMine(id),
      onKeyDown: (event: KeyboardEvent) => {
        if (event.key === "Escape") closePopoverIfMine(id);
      },
    },
  };
}

const PANEL_WIDTH = 268;
/* rough panel height used only to decide flip-above near the viewport bottom */
const PANEL_EST_HEIGHT = 196;
const GAP = 6;
const VIEWPORT_PAD = 10;

/* Anchored, viewport-fixed so it never clips inside the catalog's scroll
   container; flips above the row when there isn't room below. Read-only: all
   ordering actions stay on the row / right rail. */
export function TestContextPopover({
  item,
  anchorRef,
}: {
  item: OrderItem;
  anchorRef: RefObject<HTMLElement | null>;
}) {
  const [pos, setPos] = useState<{
    top: number;
    left: number;
    placement: "top" | "bottom";
  } | null>(null);

  useLayoutEffect(() => {
    const place = () => {
      const el = anchorRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const left = Math.max(
        VIEWPORT_PAD,
        Math.min(rect.left, window.innerWidth - PANEL_WIDTH - VIEWPORT_PAD),
      );
      const below =
        rect.bottom + PANEL_EST_HEIGHT + GAP <= window.innerHeight;
      const top = below ? rect.bottom + GAP : rect.top - GAP;
      setPos({ top, left, placement: below ? "bottom" : "top" });
    };
    place();
    /* reposition while the catalog scrolls or the window resizes */
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [anchorRef]);

  if (!pos) return null;

  const labCtx = getItemLabContexts().get(item.id);
  const specimens = item.specimens
    .map((s) => SPECIMEN_LABEL.get(s) ?? s)
    .join(", ");
  const coverage = COVERAGE_LABEL[item.coverage ?? "covered"];
  const coverageWarn = item.coverage === "unconfirmed";

  return (
    <div
      role="tooltip"
      className="orders-popover"
      style={{
        top: pos.top,
        left: pos.left,
        width: PANEL_WIDTH,
        transform: pos.placement === "top" ? "translateY(-100%)" : undefined,
      }}
    >
      <div className="orders-popover-head">
        <span className="orders-popover-title">{item.name}</span>
        {item.code && <span className="orders-popover-code">{item.code}</span>}
      </div>

      {/* hero: the clinical reason this test matters for the patient, as a tinted
          callout rather than a labelled row — absence stays quiet */}
      {item.unavailable ? (
        <p className="orders-popover-signal tone-warning">
          <WarningIcon size={13} variant="bulk" />
          <span>Unavailable — {item.unavailable.reason}</span>
        </p>
      ) : labCtx ? (
        <p className={cx("orders-popover-signal", `tone-${labCtx.tone}`)}>
          <WarningIcon size={13} variant="bulk" />
          <span>{labCtx.text}</span>
        </p>
      ) : null}

      <div className="orders-popover-meta">
        {specimens && (
          <span className="orders-popover-meta-item">
            <TubeIcon size={12} variant="bulk" />
            {specimens}
          </span>
        )}
        {item.tat && (
          <span className="orders-popover-meta-item">
            <ClockIcon size={12} variant="bulk" />
            {item.tat}
          </span>
        )}
        {item.prep && (
          <span className="orders-popover-meta-item">
            <ClockIcon size={12} variant="bulk" />
            {item.prep}
          </span>
        )}
      </div>

      <div className={cx("orders-popover-coverage", coverageWarn && "is-warn")}>
        <CreditCardIcon size={12} variant="bulk" />
        {coverage}
      </div>
    </div>
  );
}
