"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Cart as CartIcon } from "@/icons/components";
import { cx } from "@/lib/cx";
import { formatMoney } from "./catalog";
import { useOrderDraft } from "./OrderDraftContext";
import { OrderDraftRail } from "./OrderDraftRail";
import "./OrderDraft.css";

/* Fallback cart access when the side rail doesn't fit: a fixed pill that
   expands into a floating panel hosting the full rail. */
export function OrderDraftDock({ ctaSlot, emptyHint }: { ctaSlot?: ReactNode; emptyHint?: string }) {
  const { draft, lineCount, totals } = useOrderDraft();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const placed = draft.status === "placed";
  const preparing = draft.status === "preparing";

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

  return (
    <div className="odr-dock" ref={ref}>
      {open && (
        <div className="odr-dock-panel">
          <OrderDraftRail ctaSlot={ctaSlot} emptyHint={emptyHint} frameless />
        </div>
      )}
      <button
        aria-expanded={open}
        className={cx("odr-dock-pill", placed && "is-placed")}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <CartIcon size={14} variant="stroke" />
        {placed && draft.lastPlaced
          ? `Placed · ${draft.lastPlaced.bookingCode ?? draft.lastPlaced.code}`
          : preparing
            ? `Preparing · ${lineCount} · ${formatMoney(totals.due)}`
            : `Order draft · ${lineCount} · ${formatMoney(totals.due)}`}
      </button>
    </div>
  );
}
