"use client";

/* Records tab — grouped documents (Imaging / Lab reports / Prescriptions &
   letters) from clinical.recordDocuments. Each row has a "More" action Sheet
   (View / Download / Share / Archive, each toasting), plus an Upload sheet
   (file input) and a recent-activity timeline section (chartTimeline). */

import { useMemo, useRef } from "react";
import {
  Booking,
  Flask,
  Note,
  Pill,
  Refresh,
  Scan,
  Share,
  Upload,
} from "@/icons/components";
import { cx } from "@/lib/cx";
import base from "@/components/DoctorMobile/DoctorMobileApp.module.css";
import { ListRow, SectionHeader } from "@/components/DoctorMobile/components/primitives";
import { useSheets, Sheet } from "@/components/DoctorMobile/components/Sheet";
import {
  chartTimeline,
  recordDocuments,
  type ChartTimelineEntry,
  type RecordDocument,
} from "@/components/DoctorMobile/data/clinical";
import { toast } from "sonner";
import styles from "../patientChart.module.css";

const GROUPS: Array<{ id: string; label: string; kinds: RecordDocument["kind"][] }> = [
  { id: "imaging", label: "Imaging", kinds: ["imaging"] },
  { id: "labs", label: "Lab reports", kinds: ["lab"] },
  { id: "letters", label: "Prescriptions & letters", kinds: ["note", "referral"] },
];

function kindIcon(kind: RecordDocument["kind"]) {
  switch (kind) {
    case "lab":
      return <Flask size={16} variant="stroke" aria-hidden="true" />;
    case "imaging":
      return <Scan size={16} variant="stroke" aria-hidden="true" />;
    case "referral":
      return <Share size={16} variant="stroke" aria-hidden="true" />;
    case "note":
    default:
      return <Note size={16} variant="stroke" aria-hidden="true" />;
  }
}

function timelineIcon(kind: ChartTimelineEntry["kind"]) {
  switch (kind) {
    case "lab":
      return <Flask size={14} variant="stroke" aria-hidden="true" />;
    case "booking":
      return <Booking size={14} variant="stroke" aria-hidden="true" />;
    case "rx":
      return <Pill size={14} variant="stroke" aria-hidden="true" />;
    case "referral":
      return <Share size={14} variant="stroke" aria-hidden="true" />;
    case "note":
    default:
      return <Note size={14} variant="stroke" aria-hidden="true" />;
  }
}

export function RecordsTab() {
  const { open } = useSheets();

  const grouped = useMemo(
    () =>
      GROUPS.map((group) => ({
        ...group,
        docs: recordDocuments.filter((doc) => group.kinds.includes(doc.kind)),
      })),
    [],
  );

  return (
    <div className={cx(base.sectionStack, base.tabPanel)}>
      <SectionHeader
        title="Records"
        action={
          <button type="button" className={base.textButton} onClick={() => open((close) => <UploadSheet close={close} />)}>
            <Upload size={14} variant="stroke" aria-hidden="true" />
            Upload
          </button>
        }
      />

      {grouped.map((group) => (
        <section key={group.id} className={base.sectionStack}>
          <span className={base.eyebrow}>{group.label}</span>
          <div className={base.cardGroup} role="list">
            {group.docs.length === 0 ? (
              <p className={base.muted} style={{ padding: "var(--space-3) 0" }}>
                No {group.label.toLowerCase()} on file.
              </p>
            ) : (
              group.docs.map((doc) => (
                <ListRow
                  key={doc.id}
                  leading={kindIcon(doc.kind)}
                  title={doc.title}
                  meta={doc.meta}
                  onClick={() => open((close) => <DocActionsSheet close={close} doc={doc} />)}
                />
              ))
            )}
          </div>
        </section>
      ))}

      {/* recent activity timeline */}
      <section className={base.sectionStack}>
        <SectionHeader title="Recent activity" />
        <div className={base.cardGroup} role="list">
          {chartTimeline.map((entry) => (
            <div key={entry.id} className={base.timelineItem} role="listitem">
              <span className={base.timelineIcon}>{timelineIcon(entry.kind)}</span>
              <div>
                <strong>{entry.title}</strong>
                <small>{entry.meta}</small>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function DocActionsSheet({ close, doc }: { close: () => void; doc: RecordDocument }) {
  const act = (verb: string) => {
    toast.success(`${verb} · ${doc.title}`);
    close();
  };
  return (
    <Sheet title={doc.title} onClose={close}>
      <div className={base.cleanList}>
        <ListRow title="View" onClick={() => act("Opened")} />
        <ListRow title="Download" onClick={() => act("Downloaded")} />
        <ListRow title="Share" onClick={() => act("Shared")} />
        <ListRow title="Archive" tone="danger" onClick={() => act("Archived")} />
      </div>
    </Sheet>
  );
}

function UploadSheet({ close }: { close: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);

  const onFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    toast.success(`${files.length} file${files.length === 1 ? "" : "s"} uploaded`);
    close();
  };

  return (
    <Sheet
      title="Upload document"
      onClose={close}
      footer={
        <div className={styles.sheetFooter}>
          <button type="button" className={base.secondaryButton} onClick={close}>
            Cancel
          </button>
          <button type="button" className={base.primaryButton} onClick={() => inputRef.current?.click()}>
            <Upload size={16} variant="stroke" aria-hidden="true" />
            Choose file
          </button>
        </div>
      }
    >
      <div className={base.sectionStack}>
        <div className={cx(base.banner, base.tone_info)}>
          <strong>Attach to this chart</strong>
          <span>Lab report, imaging, or a referral letter. PDF or image.</span>
        </div>
        <button
          type="button"
          className={base.moreRow}
          onClick={() => inputRef.current?.click()}
        >
          <span className={base.timelineIcon}>
            <Refresh size={14} variant="stroke" aria-hidden="true" />
          </span>
          <div>
            <strong>Select from device</strong>
            <small>Tap to browse files</small>
          </div>
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*,application/pdf"
          multiple
          hidden
          onChange={(event) => onFiles(event.target.files)}
        />
      </div>
    </Sheet>
  );
}

export default RecordsTab;
