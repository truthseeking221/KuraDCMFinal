"use client";

/* Persistent mini-cart dock — sits above the bottom nav across every context.
   Two calm states that share the same surface:
     • collapsed  → a compact "N tests selected" pill (chevron-up) the doctor can
       tuck away; it stays reachable but quiet.
     • expanded   → the full row (state label + count + subtotal) that opens the
       cart on tap.
   Expand/collapse happens in place; the separate cart screen is still one tap
   away via the body. Binds useOrderDraft; the shell mounts it, never a screen. */

import { useState } from "react";
import { useOrderDraft } from "@/components/OrderDraft";
import { Cart, ChevronRight, ChevronUp } from "@/icons/components";
import { useMobileApp } from "../state/MobileAppContext";
import styles from "./OrderCartDock.module.css";

const STATUS_LABEL: Record<string, string> = {
  building: "Selected",
  preparing: "Preparing tubes",
  placed: "Placed",
};

export function OrderCartDock() {
  const { draft, lineCount, totals } = useOrderDraft();
  const { openCart } = useMobileApp();
  const [collapsed, setCollapsed] = useState(false);

  if (lineCount === 0) return null;

  const stateLabel = STATUS_LABEL[draft.status] ?? "Selected";
  const countLabel = `${lineCount} ${lineCount === 1 ? "test" : "tests"}`;
  const due = totals.due;
  const dueLabel = totals.unpricedCount > 0 ? `$${due.toFixed(2)} + ${totals.unpricedCount} unpriced` : `$${due.toFixed(2)}`;

  /* collapsed: a single calm pill — tap to expand back in place */
  if (collapsed) {
    return (
      <button
        className={styles.pill}
        type="button"
        onClick={() => setCollapsed(false)}
        aria-label={`Expand order draft — ${countLabel} selected`}
        aria-expanded={false}
      >
        <span className={styles.pillIcon} aria-hidden="true">
          <Cart size={15} variant="stroke" />
          <span className={styles.badge}>{lineCount}</span>
        </span>
        <span className={styles.pillLabel}>{countLabel} selected</span>
        <ChevronUp size={15} variant="stroke" aria-hidden="true" />
      </button>
    );
  }

  return (
    <div className={styles.dock} role="group" aria-label={`Order draft — ${countLabel}`}>
      <button
        className={styles.collapse}
        type="button"
        onClick={() => setCollapsed(true)}
        aria-label="Collapse order draft"
        aria-expanded
      >
        <span className={styles.icon} aria-hidden="true">
          <Cart size={18} variant="stroke" />
          <span className={styles.badge}>{lineCount}</span>
        </span>
      </button>
      <button className={styles.body} type="button" onClick={openCart} aria-label={`Open order draft — ${countLabel}`}>
        <span className={styles.bodyCopy}>
          <span className={styles.state}>{stateLabel}</span>
          <span className={styles.meta}>{countLabel}</span>
        </span>
        <span className={styles.total}>{dueLabel}</span>
        <ChevronRight size={16} variant="stroke" aria-hidden="true" />
      </button>
    </div>
  );
}
