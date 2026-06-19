"use client";

/* Patient chart container for view.patientId. A sticky PatientHeader
   (getChartHeader: identity + compact problem/flag pills; "more" opens a Sheet
   with grouped PROBLEMS / MONITOR / REPORTED / RECENT-ABNORMAL / DUE bands) sits
   above a sticky SegmentTabs strip (Summary / Labs / Orders / Care plan /
   Records) that really switches the body (local state, persists per mount).
   Header overflow actions open encounter sheets — Visit note (NoteSheet) and
   Finish visit (FinishVisitSheet) — with live status badges (note draft/signed,
   finish remaining count) from useEncounter. */

import { useState } from "react";
import { ArrowLeft, CheckCircle, MedicalMask, Note, Warning } from "@/icons/components";
import { cx } from "@/lib/cx";
import base from "@/components/DoctorMobile/DoctorMobileApp.module.css";
import { Pill, SegmentTabs } from "@/components/DoctorMobile/components/primitives";
import { useSheets, Sheet } from "@/components/DoctorMobile/components/Sheet";
import { useMobileApp } from "@/components/DoctorMobile/state/MobileAppContext";
import { useEncounter } from "@/components/DoctorMobile/state/EncounterContext";
import {
  careGapRows,
  chartTimeline,
  getChartHeader,
  medicalHistoryGroups,
  summarySections,
  type Badge,
} from "@/components/DoctorMobile/data/clinical";
import { FinishVisitSheet, NoteSheet } from "./encounterSheets";
import { SummaryTab } from "./tabs/SummaryTab";
import { LabsTab } from "./tabs/LabsTab";
import { OrdersTab } from "./tabs/OrdersTab";
import { CarePlanTab } from "./tabs/CarePlanTab";
import { RecordsTab } from "./tabs/RecordsTab";
import styles from "./patientChart.module.css";

const TABS = [
  { id: "summary", label: "Summary" },
  { id: "labs", label: "Labs" },
  { id: "orders", label: "Orders" },
  { id: "careplan", label: "Care plan" },
  { id: "records", label: "Records" },
];

type TabId = (typeof TABS)[number]["id"];

export function PatientChartScreen({ patientId }: { patientId: string }) {
  const { back } = useMobileApp();
  const { open } = useSheets();
  const { noteStatus, claimChecks } = useEncounter();
  const [tab, setTab] = useState<TabId>("summary");

  const header = getChartHeader(patientId);
  const remaining = claimChecks.filter((check) => !check.done).length;

  return (
    <section className={base.sectionStack} aria-label={`Chart — ${header.name}`}>
      {/* sticky header + tabs */}
      <div className={styles.sticky}>
        <div className={styles.headerTop}>
          <button type="button" className={base.iconButton} aria-label="Back" onClick={back}>
            <ArrowLeft size={18} variant="stroke" aria-hidden="true" />
          </button>
          <div className={base.chartHeader} style={{ flex: 1, minWidth: 0 }}>
            <span className={base.chartAvatar} aria-hidden="true">
              {header.initials}
            </span>
            <span className={base.chartIdentity}>
              <h2>
                {header.name}
                {header.khmerName ? <span className={base.muted}> · {header.khmerName}</span> : null}
              </h2>
              <p>{header.identity} · {header.insurance}</p>
            </span>
          </div>
          <div className={styles.headerActions}>
            <button
              type="button"
              className={base.iconButton}
              aria-label="Visit note"
              onClick={() => open((close) => <NoteSheet close={close} />)}
            >
              <Note size={18} variant="stroke" aria-hidden="true" />
              {noteStatus !== "none" ? (
                <span
                  className={cx(base.attnDot, noteStatus === "signed" ? base.text_success : base.text_warning)}
                  aria-hidden="true"
                />
              ) : null}
            </button>
            <button
              type="button"
              className={base.lightButton}
              onClick={() => open((close) => <FinishVisitSheet close={close} />)}
            >
              Finish
              {remaining > 0 ? <span className={base.eyebrow}> · {remaining}</span> : null}
            </button>
          </div>
        </div>

        {/* compact flags + problems */}
        <div className={styles.flagsRow}>
          {header.flags.map((flag) => (
            <FlagPill key={flag.label} badge={flag} />
          ))}
          {header.problems.slice(0, 2).map((problem) => (
            <span key={problem.label} className={base.flag}>
              {problem.label}
            </span>
          ))}
          <button
            type="button"
            className={styles.moreFlagsBtn}
            onClick={() => open((close) => <ChartContextSheet close={close} header={getChartHeader(patientId)} />)}
          >
            More
          </button>
        </div>

        <div>
          <SegmentTabs items={TABS} activeId={tab} onSelect={(id) => setTab(id as TabId)} />
        </div>
      </div>

      {/* body */}
      {tab === "summary" ? <SummaryTab /> : null}
      {tab === "labs" ? <LabsTab /> : null}
      {tab === "orders" ? <OrdersTab /> : null}
      {tab === "careplan" ? <CarePlanTab /> : null}
      {tab === "records" ? <RecordsTab /> : null}
    </section>
  );
}

function FlagPill({ badge }: { badge: Badge }) {
  const icon =
    badge.icon === "verified" ? (
      <CheckCircle size={12} variant="stroke" aria-hidden="true" />
    ) : badge.icon === "alert" ? (
      <Warning size={12} variant="stroke" aria-hidden="true" />
    ) : badge.icon === "self-reported" ? (
      <MedicalMask size={12} variant="stroke" aria-hidden="true" />
    ) : null;
  if (badge.dashed) {
    return (
      <span className={cx(base.flag, base.flagDashed)}>
        {icon}
        {badge.label}
      </span>
    );
  }
  return <Pill tone={badge.tone ?? "neutral"}>{icon}{badge.label}</Pill>;
}

/* Grouped chart context: PROBLEMS / MONITOR / REPORTED / RECENT-ABNORMAL / DUE */
function ChartContextSheet({
  close,
  header,
}: {
  close: () => void;
  header: ReturnType<typeof getChartHeader>;
}) {
  const reported = summarySections
    .flatMap((section) => section.items)
    .filter((item) => item.selfReported);
  const recentAbnormal = careGapRows.filter((row) => row.tone === "danger");
  const due = careGapRows.filter((row) => row.tone === "warning");
  const active = medicalHistoryGroups.find((group) => group.label === "Active")?.entries ?? [];

  return (
    <Sheet title={header.name} onClose={close} size="full">
      <div className={base.sectionStack}>
        <div className={styles.flagsRow}>
          {header.flags.map((flag) => (
            <FlagPill key={flag.label} badge={flag} />
          ))}
        </div>

        <ContextBand title="Problems">
          {active.map((entry) => (
            <div key={entry.title} className={base.summaryRow}>
              <strong className={entry.muted ? base.itemMuted : undefined}>{entry.title}</strong>
              <small>
                {entry.meta} · {entry.date}
                {entry.selfReported ? <span className={base.selfReported}> Self-reported</span> : null}
              </small>
            </div>
          ))}
        </ContextBand>

        <ContextBand title="Monitor">
          {header.problems.map((problem) => (
            <div key={problem.label} className={base.summaryRow}>
              <strong>{problem.label}</strong>
            </div>
          ))}
        </ContextBand>

        {reported.length > 0 ? (
          <ContextBand title="Reported · unverified">
            {reported.map((item) => (
              <div key={item.title} className={base.summaryRow}>
                <strong>{item.title}</strong>
                <small>{item.meta}</small>
              </div>
            ))}
          </ContextBand>
        ) : null}

        {recentAbnormal.length > 0 ? (
          <ContextBand title="Recent abnormal">
            {recentAbnormal.map((row) => (
              <div key={row.title} className={base.summaryRow}>
                <strong className={base.text_danger}>{row.title}</strong>
                <small>{row.meta}</small>
              </div>
            ))}
          </ContextBand>
        ) : null}

        {due.length > 0 ? (
          <ContextBand title="Due">
            {due.map((row) => (
              <div key={row.title} className={base.summaryRow}>
                <strong className={base.text_warning}>{row.title}</strong>
                <small>{row.meta}</small>
              </div>
            ))}
          </ContextBand>
        ) : null}

        <ContextBand title="Recent activity">
          {chartTimeline.map((entry) => (
            <div key={entry.id} className={base.summaryRow}>
              <strong>{entry.title}</strong>
              <small>{entry.meta}</small>
            </div>
          ))}
        </ContextBand>
      </div>
    </Sheet>
  );
}

function ContextBand({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className={base.sectionStack}>
      <span className={base.eyebrow}>{title}</span>
      <div className={base.cardGroup}>{children}</div>
    </section>
  );
}

export default PatientChartScreen;
