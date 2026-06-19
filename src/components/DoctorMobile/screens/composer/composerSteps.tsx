"use client";

/* Composer step bodies — Tests, Payment, Confirm. These are presentational:
   they receive the working itemIds set + payment choice + cash-gate state from
   the parent flow and render the borderless picker / radio stack / review. The
   parent owns all mutation and the sticky footer. */

import { useMemo, useState } from "react";
import { Check, CreditCard, Flask, Plus, Warning } from "@/icons";
import { cx } from "@/lib/cx";
import {
  formatMoney,
  orderBundles,
  orderCategories,
  orderItemById,
  orderItems,
  type OrderItem,
} from "@/components/OrderDraft/catalog";
import type { BookingPatient } from "@/components/OrderDraft/bookingSeeds";
import type { PscPayChoice } from "@/components/OrderDraft/types";
import base from "@/components/DoctorMobile/DoctorMobileApp.module.css";
import {
  ChipRail,
  ListRow,
  Money,
  Pill,
  SectionHeader,
} from "@/components/DoctorMobile/components/primitives";
import styles from "./composer.module.css";

/* shared pricing helper over a working set of catalog itemIds */
export function priceSet(itemIds: ReadonlySet<string>) {
  let known = 0;
  let unpricedCount = 0;
  for (const id of itemIds) {
    const item = orderItemById.get(id);
    if (!item) {
      unpricedCount += 1;
      continue;
    }
    known += item.price;
  }
  return { known, unpricedCount };
}

/* ----------------------------------------------------------- Tests step ---- */

export function TestsStep({
  selectedIds,
  onToggle,
}: {
  selectedIds: ReadonlySet<string>;
  onToggle: (itemId: string) => void;
}) {
  const [category, setCategory] = useState<string>("all");
  const [query, setQuery] = useState("");

  const categoryChips = useMemo(
    () => [{ id: "all", label: "All" }, ...orderCategories.map((c) => ({ id: c.id, label: c.label }))],
    [],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orderItems.filter((item) => {
      if (category !== "all" && item.categoryId !== category) return false;
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q) ||
        (item.fullName?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [category, query]);

  function applyBundle(memberItemIds: string[]) {
    for (const id of memberItemIds) {
      if (!selectedIds.has(id)) onToggle(id);
    }
  }

  function bundleSelected(memberItemIds: string[]) {
    return memberItemIds.length > 0 && memberItemIds.every((id) => selectedIds.has(id));
  }

  return (
    <div className={base.tabPanel}>
      <SectionHeader title="Bundles" meta={`${orderBundles.length} sets`} />
      <div className={styles.bundleGrid}>
        {orderBundles.map((bundle) => {
          const active = bundleSelected(bundle.memberItemIds);
          return (
            <button
              key={bundle.id}
              type="button"
              className={cx(styles.bundleTile, active && styles.bundleTileActive)}
              onClick={() => applyBundle(bundle.memberItemIds)}
            >
              <strong>{bundle.name}</strong>
              <small>{bundle.testCount} tests · {formatMoney(bundle.price)}</small>
            </button>
          );
        })}
      </div>

      <div className={base.searchBox}>
        <Flask size={16} variant="stroke" aria-hidden="true" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tests by name or code"
          aria-label="Search tests"
        />
      </div>

      <ChipRail items={categoryChips} activeId={category} onSelect={setCategory} />

      <div className={base.cardGroup}>
        {filtered.length === 0 ? (
          <p className={cx(base.muted, styles.emptyState)}>
            No tests match &ldquo;{query}&rdquo;.
          </p>
        ) : (
          filtered.map((item) => (
            <TestRow
              key={item.id}
              item={item}
              selected={selectedIds.has(item.id)}
              onToggle={() => onToggle(item.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function TestRow({
  item,
  selected,
  onToggle,
}: {
  item: OrderItem;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <ListRow
      title={item.name}
      meta={`${item.code} · ${item.tat}`}
      selected={selected}
      onClick={onToggle}
      trailing={
        <span className={base.priceStack}>
          <span>{formatMoney(item.price)}</span>
          <span className={cx(base.addChip, selected && base.addChipActive)}>
            {selected ? (
              <>
                <Check size={13} variant="stroke" aria-hidden="true" /> Added
              </>
            ) : (
              <>
                <Plus size={13} variant="stroke" aria-hidden="true" /> Add
              </>
            )}
          </span>
        </span>
      }
    />
  );
}

/* --------------------------------------------------------- Payment step ---- */

const PAY_OPTIONS: Array<{ id: PscPayChoice; label: string; sub: string }> = [
  { id: "later", label: "Pay at PSC", sub: "Patient settles at the collection counter" },
  { id: "cash", label: "Cash now", sub: "Doctor collects cash in hand — confirmed at place" },
  { id: "khqr", label: "KHQR", sub: "Send a QR to the patient via Telegram" },
];

export function PaymentStep({
  selectedIds,
  pscPay,
  onChange,
}: {
  selectedIds: ReadonlySet<string>;
  pscPay: PscPayChoice;
  onChange: (choice: PscPayChoice) => void;
}) {
  const { known, unpricedCount } = priceSet(selectedIds);
  return (
    <div className={base.tabPanel}>
      <SectionHeader title="Payment" />
      <div className={base.cardGroup}>
        {PAY_OPTIONS.map((option) => {
          const active = pscPay === option.id;
          return (
            <ListRow
              key={option.id}
              leading={<CreditCard size={16} variant="stroke" aria-hidden="true" />}
              title={option.label}
              meta={option.sub}
              selected={active}
              onClick={() => onChange(option.id)}
              trailing={active ? <Check size={16} variant="stroke" aria-hidden="true" /> : null}
            />
          );
        })}
      </div>

      <div className={base.reviewBlock}>
        <div className={base.reviewRow}>
          <span>Tests</span>
          <strong>{selectedIds.size}</strong>
        </div>
        <div className={base.reviewRow}>
          <span>Estimated total</span>
          <strong>
            <Money usd={known} />
            {unpricedCount > 0 ? ` · +${unpricedCount} priced at PSC` : ""}
          </strong>
        </div>
      </div>
    </div>
  );
}

/* --------------------------------------------------------- Confirm step ---- */

export function ConfirmStep({
  patient,
  selectedIds,
  pscPay,
  cashReceived,
  onToggleCash,
}: {
  patient: BookingPatient;
  selectedIds: ReadonlySet<string>;
  pscPay: PscPayChoice;
  cashReceived: boolean;
  onToggleCash: () => void;
}) {
  const { known, unpricedCount } = priceSet(selectedIds);
  const items = [...selectedIds].map((id) => orderItemById.get(id)).filter(Boolean) as OrderItem[];
  const payLabel =
    pscPay === "cash" ? "Cash now" : pscPay === "khqr" ? "KHQR via Telegram" : "Pay at PSC counter";

  return (
    <div className={base.tabPanel}>
      <SectionHeader title="Review booking" />

      <div className={base.reviewBlock}>
        <div className={base.reviewRow}>
          <span>Patient</span>
          <strong>{patient.name}</strong>
        </div>
        <div className={base.reviewRow}>
          <span>Identity</span>
          <strong>
            {patient.relationship === "new" ? (
              <Pill tone="warning">Provisional</Pill>
            ) : (
              <Pill tone="success">Confirmed</Pill>
            )}
          </strong>
        </div>
        <div className={base.reviewRow}>
          <span>Contact</span>
          <strong>{patient.phone ?? patient.phoneMasked}</strong>
        </div>
        <div className={base.reviewRow}>
          <span>Collection</span>
          <strong>At PSC</strong>
        </div>
        <div className={base.reviewRow}>
          <span>Payment</span>
          <strong>{payLabel}</strong>
        </div>
      </div>

      <SectionHeader title="Tests" meta={`${items.length}`} />
      <div className={base.cardGroup}>
        {items.map((item) => (
          <ListRow
            key={item.id}
            title={item.name}
            meta={item.code}
            trailing={<Money usd={item.price} />}
          />
        ))}
      </div>

      <div className={base.reviewBlock}>
        <div className={base.reviewRow}>
          <span>Estimated total</span>
          <strong>
            <Money usd={known} />
            {unpricedCount > 0 ? ` · +${unpricedCount} at PSC` : ""}
          </strong>
        </div>
      </div>

      {pscPay === "cash" && (
        <button
          type="button"
          className={cx(styles.cashGate, cashReceived && styles.cashGateArmed)}
          onClick={onToggleCash}
          aria-pressed={cashReceived}
        >
          <span className={cx(styles.cashBox, cashReceived && styles.cashBoxArmed)}>
            {cashReceived ? <Check size={14} variant="stroke" aria-hidden="true" /> : null}
          </span>
          <span>
            <strong>Cash received: {formatMoney(known)}</strong>
            <span>Tick to confirm you collected the cash before placing.</span>
          </span>
          {!cashReceived ? <Warning size={16} variant="stroke" aria-hidden="true" /> : null}
        </button>
      )}
    </div>
  );
}
