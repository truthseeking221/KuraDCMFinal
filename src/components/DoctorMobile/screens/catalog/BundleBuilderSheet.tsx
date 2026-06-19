"use client";

/* BundleBuilderSheet — author a doctor bundle: a name + a category-grouped,
   searchable multi-select of catalog tests. Saving persists the bundle (a saved
   multi-select shortcut, NOT a priced panel) via useUserBundles and adds every
   chosen member to the shared order draft as ordinary catalog lines. */

import { useMemo, useState } from "react";
import {
  formatMoney,
  orderCategories,
  orderItems,
  useOrderDraft,
} from "@/components/OrderDraft";
import { useUserBundles } from "@/components/OrderDraft/userBundles";
import { Check, Plus, Search as SearchIcon } from "@/icons/components";
import { toast } from "sonner";
import { cx } from "@/lib/cx";
import { Sheet } from "../../components/Sheet";
import { SectionHeader } from "../../components/primitives";
import base from "../../DoctorMobileApp.module.css";
import styles from "./CatalogScreen.module.css";

const CATEGORY_LABEL = new Map(orderCategories.map((c) => [c.id, c.label]));

export function BundleBuilderSheet({ onClose }: { onClose: () => void }) {
  const { toggleCatalogItem, hasItem } = useOrderDraft();
  const { createBundle } = useUserBundles();

  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<Set<string>>(() => new Set());

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const items = q
      ? orderItems.filter((item) =>
          [item.name, item.code, CATEGORY_LABEL.get(item.categoryId) ?? "", item.fullName ?? ""]
            .join(" ")
            .toLowerCase()
            .includes(q),
        )
      : orderItems;
    return items.filter((item) => !item.unavailable);
  }, [query]);

  /* group filtered items under their category, preserving category order */
  const grouped = useMemo(() => {
    return orderCategories
      .map((category) => ({
        category,
        items: filtered.filter((item) => item.categoryId === category.id),
      }))
      .filter((group) => group.items.length > 0);
  }, [filtered]);

  const pickedItems = useMemo(
    () => orderItems.filter((item) => picked.has(item.id)),
    [picked],
  );
  const pickedTotal = pickedItems.reduce((sum, item) => sum + item.price, 0);

  const togglePick = (id: string) =>
    setPicked((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const canSave = name.trim().length > 0 && picked.size > 0;

  const handleSave = () => {
    if (!canSave) return;
    const memberIds = pickedItems.map((item) => item.id);
    createBundle(name.trim(), memberIds);
    /* add every member to the cart that isn't already there */
    memberIds.forEach((id) => {
      if (!hasItem(id)) toggleCatalogItem(id, "catalog-standalone");
    });
    toast.success(`Saved "${name.trim()}" · ${memberIds.length} tests added`);
    onClose();
  };

  const footer = (
    <div className={base.stickyCta} style={{ position: "static", margin: 0 }}>
      <button type="button" className={base.primaryButton} disabled={!canSave} onClick={handleSave}>
        <Check size={16} variant="stroke" aria-hidden="true" />
        {picked.size > 0 ? `Save bundle · add ${picked.size}` : "Save bundle"}
      </button>
      <span className={styles.builderCount}>{formatMoney(pickedTotal)}</span>
    </div>
  );

  return (
    <Sheet title="Build a bundle" onClose={onClose} footer={footer} size="full">
      <div className={styles.builderField}>
        <span className={styles.fieldLabel}>Bundle name</span>
        <input
          className={styles.builderInput}
          value={name}
          onChange={(event) => setName(event.currentTarget.value)}
          placeholder="e.g. Diabetes annual review"
          autoComplete="off"
          aria-label="Bundle name"
        />
        <p className={styles.demoHint}>
          A saved shortcut for your common multi-select. Adding it later expands to these tests at their own price.
        </p>
      </div>

      <div className={styles.builderField}>
        <span className={styles.fieldLabel}>Add tests</span>
        <label className={base.searchBox}>
          <SearchIcon size={16} variant="stroke" aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            placeholder="Search by name, code, category"
            aria-label="Search tests to add"
          />
        </label>
      </div>

      {grouped.length === 0 ? (
        <div className={styles.empty}>
          <strong>No tests match</strong>
          <span>Try a different name or code.</span>
        </div>
      ) : (
        grouped.map((group) => (
          <section key={group.category.id} className={base.sectionStack}>
            <SectionHeader title={group.category.label} meta={`${group.items.length}`} />
            <div className={base.cardGroup}>
              {group.items.map((item) => {
                const on = picked.has(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={cx(styles.tile, on && styles.tileSelected)}
                    aria-pressed={on}
                    onClick={() => togglePick(item.id)}
                    style={{ gridTemplateColumns: "minmax(0, 1fr) auto" }}
                  >
                    <span className={styles.tileBody}>
                      <span className={styles.tileTitle}>
                        <strong>{item.name}</strong>
                      </span>
                      <span className={styles.tileMeta}>
                        {item.code} · {item.tat}
                      </span>
                    </span>
                    <span className={styles.tileAside}>
                      <span className={styles.tilePrice}>{formatMoney(item.price)}</span>
                      <span className={cx(styles.addPill, on && styles.addPillActive)}>
                        {on ? (
                          <>
                            <Check size={11} variant="stroke" aria-hidden="true" /> Added
                          </>
                        ) : (
                          <>
                            <Plus size={11} variant="stroke" aria-hidden="true" /> Add
                          </>
                        )}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        ))
      )}
    </Sheet>
  );
}
