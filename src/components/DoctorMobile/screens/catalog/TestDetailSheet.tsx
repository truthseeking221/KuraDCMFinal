"use client";

/* TestDetailSheet — the full prep / handling / analytes / reference-range /
   coverage detail for one catalog orderable, rendered inside a bottom Sheet.
   Toggling add/remove binds the shared order draft. EXPORTED so the chart
   OrdersTab can reuse the exact same detail surface.

   Render it from an imperative sheet:
     openSheet((close) => <TestDetailSheet itemId={id} onClose={close} />); */

import {
  COVERAGE_LABEL,
  formatKhr,
  formatMoney,
  orderCategories,
  orderItemById,
  useOrderDraft,
} from "@/components/OrderDraft";
import type { OrderItem } from "@/components/OrderDraft/catalog";
import { Check, Flask, Heart, Plus, Warning } from "@/icons/components";
import { useFavoriteOrderItems } from "@/components/OrderDraft/favorites";
import { cx } from "@/lib/cx";
import { Sheet } from "../../components/Sheet";
import { Pill } from "../../components/primitives";
import base from "../../DoctorMobileApp.module.css";
import styles from "./CatalogScreen.module.css";

const CATEGORY_LABEL = new Map(orderCategories.map((c) => [c.id, c.label]));
const SPECIMEN_LABEL: Record<string, string> = {
  blood: "Blood",
  urine: "Urine",
  saliva: "Saliva",
  swab: "Swab",
};

type DetailRow = { label: string; value: string };

function handlingRows(item: OrderItem): DetailRow[] {
  const rows: DetailRow[] = [];
  if (item.sample) rows.push({ label: "Sample", value: item.sample });
  if (item.container) rows.push({ label: "Container", value: item.container });
  if (item.volume) rows.push({ label: "Volume", value: item.volume });
  if (item.prep) rows.push({ label: "Preparation", value: item.prep });
  if (item.stability) rows.push({ label: "Stability", value: item.stability });
  if (item.transport) rows.push({ label: "Transport", value: item.transport });
  if (item.method) rows.push({ label: "Method", value: item.method });
  if (item.analyzer) rows.push({ label: "Analyzer", value: item.analyzer });
  return rows;
}

export function TestDetailSheet({ itemId, onClose }: { itemId: string; onClose: () => void }) {
  const { hasItem, toggleCatalogItem } = useOrderDraft();
  const { favoriteIdSet, toggleFavorite } = useFavoriteOrderItems();

  const item = orderItemById.get(itemId);
  const selected = item ? hasItem(item.id) : false;
  const isFav = item ? favoriteIdSet.has(item.id) : false;

  if (!item) {
    return (
      <Sheet title="Test" onClose={onClose}>
        <div className={styles.empty}>
          <strong>Test not found</strong>
          <span>This catalog item is no longer available.</span>
        </div>
      </Sheet>
    );
  }

  const unavailable = item.unavailable;
  const categoryLabel = CATEGORY_LABEL.get(item.categoryId) ?? item.categoryId;
  const specimenLabel = item.specimens.map((s) => SPECIMEN_LABEL[s] ?? s).join(" · ");
  const analyteCount = item.analytes?.length ?? 0;
  const coverageKey: "covered" | "not-covered" | "unconfirmed" = item.coverage ?? "covered";
  const handling = handlingRows(item);

  const footer = (
    <div className={base.stickyCta} style={{ position: "static", margin: 0 }}>
      <button
        type="button"
        className={cx(base.primaryButton, selected && base.secondaryButton)}
        disabled={!!unavailable}
        onClick={() => {
          toggleCatalogItem(item.id, "catalog-standalone");
        }}
      >
        {selected ? (
          <>
            <Check size={16} variant="stroke" aria-hidden="true" /> In order — remove
          </>
        ) : (
          <>
            <Plus size={16} variant="stroke" aria-hidden="true" /> Add to order · {formatMoney(item.price)}
          </>
        )}
      </button>
      <button type="button" className={base.iconButton} aria-label={isFav ? "Remove favorite" : "Add favorite"} onClick={() => toggleFavorite(item.id)}>
        <Heart size={18} variant={isFav ? "solid" : "stroke"} aria-hidden="true" className={cx(isFav && styles.favOn)} />
      </button>
    </div>
  );

  return (
    <Sheet title={item.name} onClose={onClose} footer={footer} size="full">
      <div className={styles.detailHead}>
        <div className={styles.detailTitleRow}>
          <h3>{item.fullName ?? item.name}</h3>
          <span className={styles.detailCode}>{item.code}</span>
          {analyteCount > 0 && (
            <span className={styles.panelBadge}>
              <Flask size={11} variant="stroke" aria-hidden="true" /> {analyteCount} biomarkers
            </span>
          )}
        </div>
        {item.description && <p className={styles.detailDesc}>{item.description}</p>}
        <div className={base.patientTags}>
          <span>{categoryLabel}</span>
          <span>{specimenLabel}</span>
          <span>{item.tat}</span>
          {item.popular && <span>Popular</span>}
        </div>
        {unavailable && (
          <div className={cx(base.banner, base.tone_warning)} role="status">
            <Warning size={15} variant="stroke" aria-hidden="true" />
            <span>Temporarily unavailable · {unavailable.reason}</span>
          </div>
        )}
      </div>

      {/* pricing + coverage */}
      <div className={styles.detailGroup}>
        <span className={styles.detailGroupLabel}>Pricing & coverage</span>
        <div className={base.reviewBlock}>
          <div className={base.reviewRow}>
            <span>List price</span>
            <strong>
              {formatMoney(item.price)} · {formatKhr(item.price)}
            </strong>
          </div>
          <div className={base.reviewRow}>
            <span>Turnaround</span>
            <strong>{item.tat}</strong>
          </div>
          <div className={base.reviewRow}>
            <span>Coverage</span>
            <strong>{COVERAGE_LABEL[coverageKey]}</strong>
          </div>
        </div>
        {coverageKey !== "covered" && (
          <div className={cx(base.banner, coverageKey === "not-covered" ? base.tone_danger : base.tone_warning)} role="status">
            <Warning size={15} variant="stroke" aria-hidden="true" />
            <span>
              {coverageKey === "not-covered"
                ? "Not covered by Forte — patient pays the full list price."
                : "Coverage not yet confirmed for this plan — patient may be billed."}
            </span>
          </div>
        )}
      </div>

      {/* indications */}
      {item.indications && item.indications.length > 0 && (
        <div className={styles.detailGroup}>
          <span className={styles.detailGroupLabel}>Common indications</span>
          {item.indications.map((indication) => (
            <span key={indication} className={styles.indication}>
              <span>{indication}</span>
            </span>
          ))}
        </div>
      )}

      {/* analytes */}
      {analyteCount > 0 && (
        <div className={styles.detailGroup}>
          <span className={styles.detailGroupLabel}>Includes {analyteCount} biomarkers</span>
          {item.analyteGroups && item.analyteGroups.length > 0 ? (
            item.analyteGroups.map((group) => (
              <div key={group.label}>
                <span className={styles.analyteSub}>{group.label}</span>
                <div className={styles.detailChips}>
                  {group.analytes.map((analyte) => (
                    <span key={analyte} className={styles.analyteChip}>
                      {analyte}
                    </span>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className={styles.detailChips}>
              {item.analytes?.map((analyte) => (
                <span key={analyte} className={styles.analyteChip}>
                  {analyte}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* reference range */}
      {item.referenceRange && (
        <div className={styles.detailGroup}>
          <span className={styles.detailGroupLabel}>Reference range</span>
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
        </div>
      )}

      {/* prep / handling */}
      {handling.length > 0 && (
        <div className={styles.detailGroup}>
          <span className={styles.detailGroupLabel}>Sample & handling</span>
          <div className={base.reviewBlock}>
            {handling.map((row) => (
              <div key={row.label} className={base.reviewRow}>
                <span>{row.label}</span>
                <strong>{row.value}</strong>
              </div>
            ))}
          </div>
        </div>
      )}

      {item.alert && (
        <div className={styles.detailGroup}>
          <span className={styles.detailGroupLabel}>Latest result context</span>
          <div className={cx(base.banner, base.tone_info)} role="status">
            <Pill tone="info">Trend</Pill>
            <span>{item.alert}</span>
          </div>
        </div>
      )}
    </Sheet>
  );
}
