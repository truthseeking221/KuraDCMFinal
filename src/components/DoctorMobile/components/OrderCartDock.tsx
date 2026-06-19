"use client";

/* Persistent mini-cart dock — sits above the bottom nav, shows only when the
   draft is non-empty. State label (Selected / Preparing / Placed) + line count
   + subtotal; tap → openCart(). Binds useOrderDraft; the shell mounts it, never
   a screen. */

import { useOrderDraft } from "@/components/OrderDraft";
import { Cart, ChevronRight } from "@/icons/components";
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

  if (lineCount === 0) return null;

  const stateLabel = STATUS_LABEL[draft.status] ?? "Selected";
  const countLabel = `${lineCount} ${lineCount === 1 ? "test" : "tests"}`;
  const due = totals.due;
  const dueLabel = totals.unpricedCount > 0 ? `$${due.toFixed(2)} + ${totals.unpricedCount} unpriced` : `$${due.toFixed(2)}`;

  return (
    <button className={styles.dock} type="button" onClick={openCart} aria-label={`Open order draft — ${countLabel}`}>
      <span className={styles.icon} aria-hidden="true">
        <Cart size={18} variant="stroke" />
        <span className={styles.badge}>{lineCount}</span>
      </span>
      <span className={styles.body}>
        <span className={styles.state}>{stateLabel}</span>
        <span className={styles.meta}>{countLabel}</span>
      </span>
      <span className={styles.total}>{dueLabel}</span>
      <ChevronRight size={16} variant="stroke" aria-hidden="true" />
    </button>
  );
}
