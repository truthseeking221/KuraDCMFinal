"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Cart as CartIcon, ChevronRight as ChevronIcon } from "@/icons/components";
import { cx } from "@/lib/cx";
import { formatMoney } from "./catalog";
import { useOrderDraft } from "./OrderDraftContext";
import { OrderDraftRail } from "./OrderDraftRail";
import "./OrderDraft.css";

/* The floating order cart. A fixed bottom-right pill (cart icon + count +
   running total) expands in place into an anchored cart panel — the patient's
   whole order lives here instead of a fixed side rail, so the catalog / lab
   history get the full width back.

   `children` is the cart body to host in the panel. When omitted it defaults to
   the lightweight OrderDraftRail (lines + subtotal + a host-supplied CTA); the
   Orders catalog passes its richer <OrderCart/> instead. Either way the pill
   summary is read from the shared draft context, so it stays in sync. */
export function OrderDraftDock({
  ctaSlot,
  emptyHint,
  children,
}: {
  ctaSlot?: ReactNode;
  emptyHint?: string;
  children?: ReactNode;
}) {
  const { draft, lineCount, totals } = useOrderDraft();
  const [open, setOpen] = useState(false);
  const [bump, setBump] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const prevCount = useRef(lineCount);
  const placed = draft.status === "placed";
  const preparing = draft.status === "preparing";

  /* When a test lands in the cart, give the pill a quick squash so the add
     registers even if the panel is closed. */
  useEffect(() => {
    if (lineCount > prevCount.current) {
      setBump(true);
      const timer = window.setTimeout(() => setBump(false), 420);
      prevCount.current = lineCount;
      return () => window.clearTimeout(timer);
    }
    prevCount.current = lineCount;
  }, [lineCount]);

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  /* Collapsed cart reads as a clear "N tests selected · total" pill while
     building; tapping it expands the cart in place (the panel above), it never
     opens a separate screen. */
  const summary = placed && draft.lastPlaced
    ? `Placed · ${draft.lastPlaced.bookingCode ?? draft.lastPlaced.code}`
    : preparing
      ? `Preparing · ${formatMoney(totals.due)}`
      : lineCount > 0
        ? `${lineCount} ${lineCount === 1 ? "test" : "tests"} selected · ${formatMoney(totals.due)}`
        : "Order cart";

  return (
    <div className={cx("odr-dock", open && "is-open")} ref={ref}>
      <div aria-label="Order cart" className="odr-dock-panel" role="dialog">
        {children ?? <OrderDraftRail ctaSlot={ctaSlot} emptyHint={emptyHint} frameless />}
      </div>
      <button
        aria-expanded={open}
        aria-label={open ? "Hide order cart" : "Show order cart"}
        className={cx("odr-dock-pill", placed && "is-placed", bump && "is-bump")}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span aria-hidden className="odr-dock-pill-ic">
          <CartIcon size={16} variant="solid" />
        </span>
        {!open && <span className="odr-dock-pill-text">{summary}</span>}
        <ChevronIcon aria-hidden className="odr-dock-pill-chev" size={14} variant="stroke" />
      </button>
    </div>
  );
}
