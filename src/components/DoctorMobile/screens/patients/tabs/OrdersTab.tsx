"use client";

/* Orders tab — patient-scoped catalog. A recommended lane (suggestedOrders), a
   ChipRail of filters (Suggested / each category / each specimen), single-column
   test tiles (toggleCatalogItem, panel "N biomarkers" badge, coverage + flags),
   bundle cards, and a per-tile favorites heart. The cart lives in the shell dock
   (OrderCartDock) — this tab never mounts it. Tile tap opens an inline detail
   Sheet (Includes / indications / reference / add). */

import { useMemo, useState } from "react";
import { Check, Heart, Plus, Warning } from "@/icons/components";
import { cx } from "@/lib/cx";
import base from "@/components/DoctorMobile/DoctorMobileApp.module.css";
import { ChipRail, Money, Pill, SectionHeader } from "@/components/DoctorMobile/components/primitives";
import { useSheets, Sheet } from "@/components/DoctorMobile/components/Sheet";
import { useOrderDraft } from "@/components/OrderDraft";
import {
  COVERAGE_LABEL,
  orderBundles,
  orderCategories,
  orderItemById,
  orderItems,
  specimenFilters,
  suggestedOrders,
  type OrderItem,
} from "@/components/OrderDraft/catalog";
import { toast } from "sonner";
import styles from "../patientChart.module.css";

export function OrdersTab() {
  const { open } = useSheets();
  const { hasItem, toggleCatalogItem } = useOrderDraft();
  const [filter, setFilter] = useState<string>("suggested");
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  const filterChips = useMemo(() => {
    const items = [{ id: "suggested", label: "Suggested" }];
    for (const category of orderCategories) {
      if (orderItems.some((item) => item.categoryId === category.id)) {
        items.push({ id: `cat:${category.id}`, label: category.label });
      }
    }
    for (const specimen of specimenFilters) {
      items.push({ id: `spec:${specimen.id}`, label: specimen.label });
    }
    return items;
  }, []);

  const visibleItems = useMemo(() => {
    if (filter === "suggested") {
      const ids = new Set(suggestedOrders.map((s) => s.targetId));
      return orderItems.filter((item) => ids.has(item.id) || item.popular);
    }
    if (filter.startsWith("cat:")) {
      const category = filter.slice(4);
      return orderItems.filter((item) => item.categoryId === category);
    }
    if (filter.startsWith("spec:")) {
      const specimen = filter.slice(5);
      return orderItems.filter((item) => item.specimens.includes(specimen as OrderItem["specimens"][number]));
    }
    return orderItems;
  }, [filter]);

  const toggleFavorite = (id: string) => {
    setFavorites((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const addItem = (item: OrderItem) => {
    if (item.unavailable) {
      toast.error(`${item.name} unavailable — ${item.unavailable.reason}`);
      return;
    }
    toggleCatalogItem(item.id, "orders-catalog");
    toast.success(hasItem(item.id) ? `${item.name} removed` : `${item.name} added to order`);
  };

  return (
    <div className={cx(base.sectionStack, base.tabPanel)}>
      {/* recommended lane */}
      <section className={base.sectionStack}>
        <SectionHeader title="Recommended" meta="From this chart" />
        <div className={styles.recLane}>
          {suggestedOrders.map((suggestion) => {
            const selected = hasItem(suggestion.targetId);
            const item = orderItemById.get(suggestion.targetId);
            return (
              <button
                key={suggestion.id}
                type="button"
                className={cx(styles.recCard, selected && styles.recCardSelected)}
                onClick={() => {
                  toggleCatalogItem(suggestion.targetId, "suggested");
                  toast.success(selected ? `${suggestion.title} removed` : `${suggestion.title} added to order`);
                }}
              >
                <span className={styles.recTitle}>
                  {selected ? (
                    <Check size={14} variant="stroke" aria-hidden="true" />
                  ) : (
                    <Plus size={14} variant="stroke" aria-hidden="true" />
                  )}
                  {suggestion.title}
                </span>
                <span className={styles.recDesc}>{suggestion.description}</span>
                {item ? <Money usd={item.price} /> : null}
              </button>
            );
          })}
        </div>
      </section>

      {/* filters */}
      <div className={styles.jumpRail}>
        <ChipRail items={filterChips} activeId={filter} onSelect={setFilter} />
      </div>

      {/* test tiles */}
      <section className={base.sectionStack}>
        <SectionHeader title="Tests" meta={`${visibleItems.length}`} />
        <div className={base.cardGroup} role="list">
          {visibleItems.map((item) => {
            const selected = hasItem(item.id);
            const biomarkerCount = item.analytes?.length ?? 0;
            return (
              <div key={item.id} className={styles.tile} role="listitem">
                <button
                  type="button"
                  className={cx(styles.tileBody, styles.tileBodyBtn)}
                  onClick={() => open((close) => <TestDetailSheet close={close} item={item} />)}
                >
                  <span className={styles.tileName}>
                    {item.name}
                    {biomarkerCount > 0 ? (
                      <span className={styles.panelBadge}>{biomarkerCount} biomarkers</span>
                    ) : null}
                    {item.coverage ? <Pill tone={item.coverage === "not-covered" ? "danger" : "warning"}>{COVERAGE_LABEL[item.coverage]}</Pill> : null}
                    {item.unavailable ? <Pill tone="neutral">Unavailable</Pill> : null}
                  </span>
                  <span className={styles.tileMeta}>
                    {item.code} · {item.tat}
                    {item.prep ? ` · ${item.prep}` : ""}
                  </span>
                </button>
                <span className={styles.tileAside}>
                  <button
                    type="button"
                    className={cx(styles.heartBtn, favorites.has(item.id) && styles.heartActive)}
                    aria-label={favorites.has(item.id) ? "Remove favorite" : "Add favorite"}
                    aria-pressed={favorites.has(item.id)}
                    onClick={() => toggleFavorite(item.id)}
                  >
                    <Heart size={16} variant={favorites.has(item.id) ? "solid" : "stroke"} aria-hidden="true" />
                  </button>
                  <span className={styles.tileMeta}>
                    <Money usd={item.price} />
                  </span>
                  <button
                    type="button"
                    className={selected ? base.addChipActive : base.addChip}
                    disabled={!!item.unavailable}
                    onClick={() => addItem(item)}
                  >
                    {selected ? "Added ✓" : <><Plus size={14} variant="stroke" aria-hidden="true" />Add</>}
                  </button>
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* bundles */}
      <section className={base.sectionStack}>
        <SectionHeader title="Bundles" meta={`${orderBundles.length}`} />
        <div className={base.cardGroup} role="list">
          {orderBundles.map((bundle) => {
            const selected = hasItem(bundle.id);
            return (
              <div key={bundle.id} className={styles.tile} role="listitem">
                <span className={styles.tileBody}>
                  <span className={styles.tileName}>
                    {bundle.name}
                    <span className={styles.panelBadge}>{bundle.testCount} tests</span>
                  </span>
                  <span className={styles.tileMeta}>{bundle.tags.join(" · ")}</span>
                </span>
                <span className={styles.tileAside}>
                  <span className={styles.tileMeta}>
                    <Money usd={bundle.price} />
                  </span>
                  <button
                    type="button"
                    className={selected ? base.addChipActive : base.addChip}
                    onClick={() => {
                      toggleCatalogItem(bundle.id, "orders-catalog");
                      toast.success(selected ? `${bundle.name} removed` : `${bundle.name} added to order`);
                    }}
                  >
                    {selected ? "Added ✓" : <><Plus size={14} variant="stroke" aria-hidden="true" />Add</>}
                  </button>
                </span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function TestDetailSheet({ close, item }: { close: () => void; item: OrderItem }) {
  const { hasItem, toggleCatalogItem } = useOrderDraft();
  const selected = hasItem(item.id);

  return (
    <Sheet
      title={item.name}
      onClose={close}
      footer={
        <div className={styles.sheetFooter}>
          <span className={base.muted} style={{ alignSelf: "center", marginRight: "auto" }}>
            <Money usd={item.price} />
          </span>
          <button
            type="button"
            className={selected ? base.secondaryButton : base.primaryButton}
            disabled={!!item.unavailable}
            onClick={() => {
              toggleCatalogItem(item.id, "orders-catalog");
              toast.success(selected ? `${item.name} removed` : `${item.name} added to order`);
              close();
            }}
          >
            {selected ? "Remove from order" : "Add to order"}
          </button>
        </div>
      }
    >
      <div className={base.sectionStack}>
        {item.unavailable ? (
          <div className={cx(base.safetyStrip, base.tone_warning)}>
            <Warning size={16} variant="stroke" aria-hidden="true" />
            <div>
              <strong>Currently unavailable</strong> · {item.unavailable.reason}
            </div>
          </div>
        ) : null}

        {item.fullName ? <p className={base.muted}>{item.fullName}</p> : null}
        {item.description ? <p className={base.muted}>{item.description}</p> : null}

        <div className={base.reviewBlock}>
          <div className={base.reviewRow}>
            <span>Code</span>
            <strong>{item.code}</strong>
          </div>
          <div className={base.reviewRow}>
            <span>Turnaround</span>
            <strong>{item.tat}</strong>
          </div>
          <div className={base.reviewRow}>
            <span>Specimen</span>
            <strong>{item.specimens.join(", ")}</strong>
          </div>
          {item.prep ? (
            <div className={base.reviewRow}>
              <span>Prep</span>
              <strong>{item.prep}</strong>
            </div>
          ) : null}
          {item.method ? (
            <div className={base.reviewRow}>
              <span>Method</span>
              <strong>{item.method}</strong>
            </div>
          ) : null}
          {item.coverage ? (
            <div className={base.reviewRow}>
              <span>Coverage</span>
              <strong>{COVERAGE_LABEL[item.coverage]}</strong>
            </div>
          ) : null}
        </div>

        {item.analytes && item.analytes.length > 0 ? (
          <section className={base.sectionStack}>
            <span className={base.eyebrow}>Includes {item.analytes.length} biomarkers</span>
            <div className={base.problemRow}>
              {item.analytes.map((analyte) => (
                <span key={analyte}>{analyte}</span>
              ))}
            </div>
          </section>
        ) : null}

        {item.indications && item.indications.length > 0 ? (
          <section className={base.sectionStack}>
            <span className={base.eyebrow}>Indications</span>
            <div className={base.cardGroup}>
              {item.indications.map((indication) => (
                <div key={indication} className={base.summaryRow}>
                  <strong>{indication}</strong>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {item.referenceRange ? (
          <section className={base.sectionStack}>
            <span className={base.eyebrow}>Reference range</span>
            <div className={base.reviewBlock}>
              <div className={base.reviewRow}>
                <span>Conventional</span>
                <strong>{item.referenceRange.us}</strong>
              </div>
              <div className={base.reviewRow}>
                <span>SI</span>
                <strong>{item.referenceRange.si}</strong>
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </Sheet>
  );
}

export default OrdersTab;
