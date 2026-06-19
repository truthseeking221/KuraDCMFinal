"use client";

/* Labs tab — domain ChipRail selector over the patient's lab rows (from
   getLabOrderContexts, the same model the desktop Labs view renders). Each row:
   severity mark + latest value + reference reason + inline LabMiniTrend + Order
   button (or Planned badge via plannedLabKeys). Tapping a row opens a trend
   detail Sheet (LabKeyTrendChart). Order → addLabTest + toast; cancel →
   removeLabTest. */

import { useMemo, useState } from "react";
import { Plus } from "@/icons/components";
import { cx } from "@/lib/cx";
import base from "@/components/DoctorMobile/DoctorMobileApp.module.css";
import { ChipRail, Pill, SectionHeader } from "@/components/DoctorMobile/components/primitives";
import { useSheets, Sheet } from "@/components/DoctorMobile/components/Sheet";
import { useOrderDraft } from "@/components/OrderDraft";
import { mapLabKeyToItemId } from "@/components/OrderDraft/labMapping";
import {
  LabKeyTrendChart,
  LabMiniTrend,
  getLabOrderContexts,
  type LabOrderContext,
} from "@/components/ui/LabHistory";
import { toast } from "sonner";
import styles from "../patientChart.module.css";

/* Coarse clinical domain derived from the lab row's section prefix — mirrors the
   desktop Labs grouping so the chips read clinically without re-exporting the
   internal domain map. */
const DOMAIN_RULES: Array<{ id: string; label: string; test: (key: string) => boolean }> = [
  { id: "glycemic", label: "Diabetes", test: (k) => /GLYCOSYLATED|Glucose/i.test(k) },
  { id: "kidney", label: "Kidney", test: (k) => /Creatinine|BUN|Urea|Microalbumin/i.test(k) },
  { id: "lipids", label: "Lipids", test: (k) => /Cholesterol|LDL|Triglyceride/i.test(k) },
  { id: "cbc", label: "Anemia / CBC", test: (k) => /CELL BLOOD COUNT|DIFFERENTIAL|Haemoglobin/i.test(k) },
  { id: "electrolytes", label: "Electrolytes", test: (k) => /ELECTROLYTES|Sodium|Potassium|Calcium|Magnesium/i.test(k) },
  { id: "liver", label: "Liver", test: (k) => /AST|ALT|Albumin|ENZYMOLOGY/i.test(k) },
  { id: "urine", label: "Urine", test: (k) => /URINE|CYTOLOGY/i.test(k) },
];

function domainOf(key: string): string {
  return DOMAIN_RULES.find((rule) => rule.test(key))?.id ?? "other";
}

export function LabsTab() {
  const { open } = useSheets();
  const { addLabTest, removeLabTest, plannedLabKeys } = useOrderDraft();
  const [domain, setDomain] = useState<string>("all");

  const rows = useMemo(() => getLabOrderContexts(), []);

  const domainChips = useMemo(() => {
    const present = new Set(rows.map((row) => domainOf(row.labKey)));
    const items = [{ id: "all", label: "All", count: rows.length }];
    for (const rule of DOMAIN_RULES) {
      if (!present.has(rule.id)) continue;
      const count = rows.filter((row) => domainOf(row.labKey) === rule.id).length;
      items.push({ id: rule.id, label: rule.label, count });
    }
    return items;
  }, [rows]);

  const visible = useMemo(
    () => (domain === "all" ? rows : rows.filter((row) => domainOf(row.labKey) === domain)),
    [rows, domain],
  );

  /* surface out-of-range rows first, then watch, then the rest — matches the
     desktop severity sort intent. */
  const sorted = useMemo(() => {
    const rank = (row: LabOrderContext) => (row.group === "out" ? 0 : row.group === "watch" ? 1 : 2);
    return [...visible].sort((a, b) => rank(a) - rank(b));
  }, [visible]);

  return (
    <div className={cx(base.sectionStack, base.tabPanel)}>
      <div className={styles.jumpRail}>
        <ChipRail items={domainChips} activeId={domain} onSelect={setDomain} />
      </div>

      <SectionHeader title="Lab results" meta={`${sorted.length} of ${rows.length}`} />

      <div className={base.cardGroup} role="list">
        {sorted.map((row) => {
          const planned = plannedLabKeys.has(row.labKey);
          const orderable = mapLabKeyToItemId(row.labKey) != null;
          return (
            <div key={row.labKey} className={styles.labRow} role="group" aria-label={row.labName}>
              <span
                className={styles.labSev}
                style={{ background: groupColor(row) }}
                aria-hidden="true"
              />
              <button
                type="button"
                className={cx(styles.labMain, styles.labMainBtn)}
                aria-label={`Trend ${row.labName}`}
                onClick={() => open((close) => <LabTrendSheet close={close} row={row} />)}
              >
                <span className={styles.labName}>{row.labName}</span>
                <span className={styles.labMeta}>{row.reasonText}</span>
              </button>
              <span className={styles.labAside}>
                <span className={cx(styles.labValue, severityTextClass(row))}>{row.latest ?? "—"}</span>
                <LabMiniTrend labKey={row.labKey} />
                {planned ? (
                  <button
                    type="button"
                    className={base.addChipActive}
                    aria-label={`Remove ${row.labName} from order`}
                    onClick={() => {
                      removeLabTest(row.labKey);
                      toast(`${row.labName} removed from order`);
                    }}
                  >
                    Planned ✕
                  </button>
                ) : orderable ? (
                  <button
                    type="button"
                    className={base.addChip}
                    aria-label={`Order ${row.labName}`}
                    onClick={() => {
                      addLabTest(row.labKey, {
                        labName: row.labName,
                        reasonText: row.reasonText,
                        severityTone: row.severityTone,
                        source: "labs-suggested",
                      });
                      toast.success(`${row.labName} added to order`);
                    }}
                  >
                    <Plus size={14} variant="stroke" aria-hidden="true" />
                    Order
                  </button>
                ) : null}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LabTrendSheet({ close, row }: { close: () => void; row: LabOrderContext }) {
  const { addLabTest, removeLabTest, plannedLabKeys } = useOrderDraft();
  const planned = plannedLabKeys.has(row.labKey);
  const orderable = mapLabKeyToItemId(row.labKey) != null;

  return (
    <Sheet
      title={row.labName}
      onClose={close}
      footer={
        orderable ? (
          <div className={styles.sheetFooter}>
            {planned ? (
              <button
                type="button"
                className={base.secondaryButton}
                onClick={() => {
                  removeLabTest(row.labKey);
                  toast(`${row.labName} removed from order`);
                  close();
                }}
              >
                Remove from order
              </button>
            ) : (
              <button
                type="button"
                className={base.primaryButton}
                onClick={() => {
                  addLabTest(row.labKey, {
                    labName: row.labName,
                    reasonText: row.reasonText,
                    severityTone: row.severityTone,
                    source: "labs-suggested",
                  });
                  toast.success(`${row.labName} added to order`);
                  close();
                }}
              >
                <Plus size={16} variant="stroke" aria-hidden="true" />
                Add to order
              </button>
            )}
          </div>
        ) : undefined
      }
    >
      <div className={base.sectionStack}>
        <div className={styles.statusInline}>
          <strong className={cx(styles.labValue, severityTextClass(row))}>{row.latest ?? "—"}</strong>
          <Pill tone={row.severityTone ?? "neutral"}>{row.reasonText}</Pill>
        </div>
        <LabKeyTrendChart labKey={row.labKey} />
      </div>
    </Sheet>
  );
}

function groupColor(row: LabOrderContext): string {
  if (row.severityTone === "danger") return "var(--color-status-danger-fg)";
  if (row.severityTone === "warning") return "var(--color-status-warning-fg)";
  if (row.group === "watch") return "var(--color-status-warning-fg)";
  if (row.group === "ok" || row.group === "resolved") return "var(--color-status-success-fg)";
  return "var(--color-status-neutral-fg)";
}

function severityTextClass(row: LabOrderContext): string {
  if (row.severityTone === "danger") return base.text_danger;
  if (row.severityTone === "warning") return base.text_warning;
  if (row.group === "ok" || row.group === "resolved") return base.text_success;
  return base.text_neutral;
}

export default LabsTab;
