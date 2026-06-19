"use client";

/* Summary tab — the review surface. A sticky jump ChipRail scrolls to sections;
   AI assessment block; lab-preview rows (from labPreviewRows); grouped medical
   history; medications (AI/RX badges); allergies; care-gap rows with Order
   (addLabTest → toast) / Referral (ReferralSheet) CTAs; ICD codes section with
   add (IcdSearchSheet) + remove via useEncounter. */

import { useCallback } from "react";
import { Plus, Warning } from "@/icons/components";
import { cx } from "@/lib/cx";
import base from "@/components/DoctorMobile/DoctorMobileApp.module.css";
import {
  ChipRail,
  Pill,
  SectionHeader,
  toneTextClass,
} from "@/components/DoctorMobile/components/primitives";
import { useSheets } from "@/components/DoctorMobile/components/Sheet";
import { useEncounter } from "@/components/DoctorMobile/state/EncounterContext";
import {
  allergies,
  careGapRows,
  chartMetrics,
  labPreviewRows,
  medicalHistoryGroups,
  medications,
  summaryJumpItems,
  summarySections,
} from "@/components/DoctorMobile/data/clinical";
import { icdCandidateByCode } from "@/components/DoctorMobile/data/encounter";
import { LabMiniTrend } from "@/components/ui/LabHistory";
import { useOrderDraft } from "@/components/OrderDraft";
import { toast } from "sonner";
import { ReferralSheet, IcdSearchSheet } from "../encounterSheets";
import styles from "../patientChart.module.css";

export function SummaryTab() {
  const { open } = useSheets();
  const { icdCodes, removeIcd, addMed, meds } = useEncounter();
  const { addLabTest, plannedLabKeys } = useOrderDraft();

  const scrollTo = useCallback((id: string) => {
    const el = document.getElementById(id);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return (
    <div className={cx(base.sectionStack, base.tabPanel)}>
      {/* sticky jump rail */}
      <div className={styles.jumpRail}>
        <ChipRail
          items={summaryJumpItems.map((item) => ({ id: item.id, label: item.label }))}
          activeId={null}
          onSelect={scrollTo}
        />
      </div>

      {/* AI assessment */}
      <section id="summary-assessment" className={base.sectionStack}>
        <SectionHeader title="Assessment" meta="AI-assisted · review" />
        <div className={cx(base.reflexCard, base.tone_info)}>
          <h2>Diabetes + renal markers need attention</h2>
          <p>
            HbA1c not repeated on the latest draws and renal markers remain above reference.
            Blood pressure is above target across recent visits.
          </p>
        </div>
        <div className={base.metricsGrid}>
          {chartMetrics.map((metric) => (
            <article key={metric.label} className={base.metricCard}>
              <span className={base.metricLabel}>{metric.label}</span>
              <strong className={toneTextClass(metric.tone)}>{metric.value}</strong>
              <span>{metric.meta}</span>
            </article>
          ))}
        </div>
      </section>

      {/* lab preview */}
      <section id="summary-lab-preview" className={base.sectionStack}>
        <SectionHeader title="Lab history" meta={`${labPreviewRows.length} signals`} />
        <div className={base.cardGroup} role="list">
          {labPreviewRows.map((row) => (
            <div key={row.key} className={styles.labRow} role="listitem">
              <span
                className={styles.labSev}
                style={{ background: severityColor(row.latestTone) }}
                aria-hidden="true"
              />
              <span className={styles.labMain}>
                <span className={styles.labName}>{row.detail.labName}</span>
                <span className={styles.labMeta}>{row.detail.reasonText}</span>
                {row.groupMeta ? <span className={styles.labMeta}>{row.groupMeta}</span> : null}
              </span>
              <span className={styles.labAside}>
                <span className={cx(styles.labValue, toneTextClass(row.latestTone))}>
                  {row.latestValue ?? "—"}
                  {row.latestUnit ? <small> {row.latestUnit}</small> : null}
                </span>
                <small className={base.muted}>{row.reference}</small>
                <LabMiniTrend labKey={row.key} />
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* visit intent + symptoms (canonical summary sections) */}
      {summarySections.map((section) => (
        <section key={section.id} id={section.id} className={base.sectionStack}>
          <SectionHeader title={section.title} meta={section.badge} />
          <div className={base.cardGroup} role="list">
            {section.items.map((item) => (
              <div key={item.title} className={base.summaryRow} role="listitem">
                <strong className={item.muted ? base.itemMuted : undefined}>{item.title}</strong>
                <small>
                  {item.meta}
                  {item.selfReported ? <span className={base.selfReported}> Self-reported</span> : null}
                </small>
              </div>
            ))}
          </div>
        </section>
      ))}

      {/* medical history */}
      <section id="summary-medical-history" className={base.sectionStack}>
        <SectionHeader title="Medical history" />
        {medicalHistoryGroups.map((group) => (
          <div key={group.label} className={base.sectionStack}>
            <span className={base.eyebrow}>{group.label}</span>
            <div className={base.cardGroup} role="list">
              {group.entries.map((entry) => (
                <div key={entry.title} className={base.summaryRow} role="listitem">
                  <strong className={entry.muted ? base.itemMuted : undefined}>{entry.title}</strong>
                  <small>
                    {entry.meta} · {entry.date}
                    {entry.selfReported ? <span className={base.selfReported}> Self-reported</span> : null}
                  </small>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* medications */}
      <section id="summary-medications" className={base.sectionStack}>
        <SectionHeader title="Medications" meta={`${meds.length} active`} />
        <div className={base.cardGroup} role="list">
          {meds.map((med) => (
            <div key={med.title} className={base.summaryRow} role="listitem">
              <strong>
                {med.title}
                {med.rx ? (
                  <>
                    {" "}
                    <Pill tone="success">Rx</Pill>
                  </>
                ) : null}
                {med.ai ? (
                  <>
                    {" "}
                    <Pill tone="info">AI</Pill>
                  </>
                ) : null}
              </strong>
              <small>{med.meta}</small>
            </div>
          ))}
          {medications
            .filter((med) => !meds.some((active) => active.title === med.title))
            .map((med) => (
              <button
                key={med.title}
                type="button"
                className={base.moreRow}
                onClick={() => {
                  addMed({ title: med.title, meta: med.meta });
                  toast.success(`${med.title} added to medications`);
                }}
              >
                <strong className={base.itemMuted}>{med.title}</strong>
                <small>
                  {med.meta}
                  {med.selfReported ? <span className={base.selfReported}> Self-reported</span> : null}
                </small>
              </button>
            ))}
        </div>
      </section>

      {/* allergies */}
      <section className={base.sectionStack}>
        <SectionHeader title="Allergies" />
        <div className={cx(base.safetyStrip, base.tone_warning)}>
          <Warning size={16} variant="stroke" aria-hidden="true" />
          <div>
            {allergies.map((allergy) => (
              <div key={allergy.title}>
                <strong>{allergy.title}</strong> · {allergy.meta}
                {allergy.selfReported ? <span className={base.selfReported}> Self-reported</span> : null}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* care gaps */}
      <section className={base.sectionStack}>
        <SectionHeader title="Alerts & care gaps" />
        <div className={base.cardGroup} role="list">
          {careGapRows.map((row) => (
            <div key={row.title} className={styles.labRow} role="listitem">
              <span
                className={styles.labSev}
                style={{ background: severityColorTone(row.tone) }}
                aria-hidden="true"
              />
              <span className={styles.labMain}>
                <span className={styles.labName}>{row.title}</span>
                <span className={styles.labMeta}>{row.meta}</span>
                {row.stateLabel ? <Pill tone={row.tone}>{row.stateLabel}</Pill> : null}
              </span>
              <span className={styles.labAside}>
                {row.order ? (
                  plannedLabKeys.has(row.order.labKey) ? (
                    <Pill tone="success">Planned</Pill>
                  ) : (
                    <button
                      type="button"
                      className={base.addChip}
                      onClick={() => {
                        addLabTest(row.order!.labKey, {
                          labName: row.order!.labName,
                          reasonText: row.meta,
                          severityTone: row.order!.severityTone,
                          source: "labs-followup",
                        });
                        toast.success(`${row.order!.labName} added to order`);
                      }}
                    >
                      <Plus size={14} variant="stroke" aria-hidden="true" />
                      Order
                    </button>
                  )
                ) : row.referral ? (
                  <button
                    type="button"
                    className={base.addChip}
                    onClick={() => open((close) => <ReferralSheet close={close} presetService="Specialty consult" />)}
                  >
                    Refer
                  </button>
                ) : null}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ICD codes */}
      <section className={base.sectionStack}>
        <SectionHeader
          title="ICD-10 codes"
          action={
            <button type="button" className={base.textButton} onClick={() => open((close) => <IcdSearchSheet close={close} />)}>
              <Plus size={14} variant="stroke" aria-hidden="true" />
              Add
            </button>
          }
        />
        <div className={base.problemRow}>
          {icdCodes.length === 0 ? (
            <span className={base.muted}>No codes yet — add one to support the claim.</span>
          ) : (
            icdCodes.map((code) => {
              const entry = icdCandidateByCode.get(code);
              return (
                <button
                  key={code}
                  type="button"
                  className={base.addChipActive}
                  title={entry?.label ?? code}
                  onClick={() => {
                    removeIcd(code);
                    toast(`${code} removed`);
                  }}
                >
                  {code} ✕
                </button>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}

function severityColor(tone: "danger" | "warning" | "success" | "neutral"): string {
  switch (tone) {
    case "danger":
      return "var(--color-status-danger-fg)";
    case "warning":
      return "var(--color-status-warning-fg)";
    case "success":
      return "var(--color-status-success-fg)";
    default:
      return "var(--color-status-neutral-fg)";
  }
}

function severityColorTone(tone: "danger" | "warning" | "info" | "success" | "neutral" | "brand"): string {
  switch (tone) {
    case "danger":
      return "var(--color-status-danger-fg)";
    case "warning":
      return "var(--color-status-warning-fg)";
    case "info":
    case "brand":
      return "var(--color-status-info-fg)";
    case "success":
      return "var(--color-status-success-fg)";
    default:
      return "var(--color-status-neutral-fg)";
  }
}

export default SummaryTab;
