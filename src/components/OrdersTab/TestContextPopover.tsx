"use client";

import { useLayoutEffect, useState } from "react";
import type { KeyboardEvent, RefObject } from "react";
import {
  COVERAGE_LABEL,
  getItemLabContexts,
  specimenFilters,
} from "@/components/OrderDraft";
import type { OrderItem } from "@/components/OrderDraft";
import { cx } from "@/lib/cx";

const SPECIMEN_LABEL = new Map(specimenFilters.map((s) => [s.id, s.label]));

/* Shared open-state for the read-only detail popover. Opens on pointer hover
   (wrapperProps, on the row container so moving across it keeps it open) AND on
   keyboard focus of the trigger (triggerProps, on the row button). Esc
   dismisses without losing focus; leaving / blurring clears the dismissal so it
   can reopen. No pinning — the row click stays dedicated to selection. */
export function useHoverFocusPopover() {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const open = (hovered || focused) && !dismissed;

  return {
    open,
    wrapperProps: {
      onMouseEnter: () => setHovered(true),
      onMouseLeave: () => {
        setHovered(false);
        setDismissed(false);
      },
    },
    triggerProps: {
      onFocus: () => setFocused(true),
      onBlur: () => {
        setFocused(false);
        setDismissed(false);
      },
      onKeyDown: (event: KeyboardEvent) => {
        if (event.key === "Escape" && (hovered || focused)) setDismissed(true);
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
  const details = [item.code, item.tat, specimens, item.prep]
    .filter(Boolean)
    .join(" · ");
  const coverage = COVERAGE_LABEL[item.coverage ?? "covered"];

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
      <div className="orders-popover-title">{item.name}</div>

      {item.unavailable && (
        <div className="orders-popover-section">
          <span className="orders-popover-key tone-warning">Unavailable</span>
          <span className="orders-popover-val">{item.unavailable.reason}</span>
        </div>
      )}

      {labCtx && (
        <div className="orders-popover-section">
          <span className="orders-popover-key">Patient signal</span>
          <span className={cx("orders-popover-val", `tone-${labCtx.tone}`)}>
            {labCtx.text}
          </span>
        </div>
      )}

      <div className="orders-popover-section">
        <span className="orders-popover-key">Test details</span>
        <span className="orders-popover-val">{details}</span>
      </div>

      <div className="orders-popover-section">
        <span className="orders-popover-key">Coverage</span>
        <span className="orders-popover-val">{coverage}</span>
      </div>
    </div>
  );
}
