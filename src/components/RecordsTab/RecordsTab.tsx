"use client";

import type { ComponentType } from "react";
import { useMemo, useRef, useState } from "react";
import { Badge, Button, Counter } from "@/components/ui";
import { deltaLabFacts } from "@/data/deltaLabResults";
import { cx } from "@/lib/cx";
import {
  CheckCircle as CheckCircleIcon,
  CheckShield as CheckShieldIcon,
  Flask as FlaskIcon,
  More as MoreIcon,
  Receipt as ReceiptIcon,
  Scan as ScanIcon,
  Share as ShareIcon,
  Tube as TubeIcon,
  Upload as UploadIcon,
} from "@/icons/components";
import type { IconProps } from "@/icons/components";
import "./RecordsTab.css";

type RecordsGroupId = "imaging" | "labReports" | "prescriptions";
type RecordFormat = "PDF" | "DICOM";
type Tone = "brand" | "danger" | "neutral" | "success";
type RecordsIcon = ComponentType<IconProps>;

type RecordDocument = {
  id: string;
  groupId: RecordsGroupId;
  title: string;
  meta: string;
  format: RecordFormat;
  Icon: RecordsIcon;
  tone: Tone;
  signed?: boolean;
};

type RecordActivity = {
  id: string;
  title: string;
  time: string;
  Icon: RecordsIcon;
  tone: Tone;
};

const documentGroups = [
  { id: "imaging", label: "Imaging" },
  { id: "labReports", label: "Lab reports" },
  { id: "prescriptions", label: "Prescriptions & letters" },
] satisfies Array<{ id: RecordsGroupId; label: string }>;

const initialDocuments: RecordDocument[] = [
  {
    id: "ecg-12-lead",
    groupId: "imaging",
    title: "ECG - 12 Lead",
    meta: "Generated · Dr. Chann · 4 days ago",
    format: "PDF",
    Icon: ScanIcon,
    tone: "brand",
  },
  {
    id: "chest-xray",
    groupId: "imaging",
    title: "Chest X-ray",
    meta: "Generated · Dr. Chann · 1 week ago",
    format: "DICOM",
    Icon: ScanIcon,
    tone: "brand",
  },
  {
    id: "abdominal-ultrasound",
    groupId: "imaging",
    title: "Abdominal ultrasound",
    meta: "Generated · Dr. Chann · 2 weeks ago",
    format: "PDF",
    Icon: ScanIcon,
    tone: "brand",
  },
  {
    id: "hba1c-report",
    groupId: "labReports",
    title: `Lab report - ${deltaLabFacts.hba1c.label} ${deltaLabFacts.hba1c.value}`,
    meta: `Kura Lab · ${deltaLabFacts.hba1c.date}`,
    format: "PDF",
    Icon: TubeIcon,
    tone: "neutral",
  },
  {
    id: "full-panel-report",
    groupId: "labReports",
    title: "Full panel report",
    meta: "Kura Lab · 2 days ago",
    format: "PDF",
    Icon: FlaskIcon,
    tone: "success",
  },
  {
    id: "diagnostic-prescription",
    groupId: "prescriptions",
    title: "Diagnostic prescription",
    meta: "Dr. Chann · e-signed · 2 days ago",
    format: "PDF",
    Icon: ReceiptIcon,
    tone: "brand",
    signed: true,
  },
  {
    id: "rx-metformin-sglt2i",
    groupId: "prescriptions",
    title: "Rx - Metformin + SGLT2i",
    meta: "Dr. Chann · e-signed · 2 days ago",
    format: "PDF",
    Icon: ReceiptIcon,
    tone: "brand",
    signed: true,
  },
  {
    id: "endocrinology-referral",
    groupId: "prescriptions",
    title: "Hospital referral - Endocrinology",
    meta: "To Calmette Hospital · 1 month ago",
    format: "PDF",
    Icon: ShareIcon,
    tone: "neutral",
  },
];

const initialActivities: RecordActivity[] = [
  {
    id: "activity-signature",
    title: "e-Signature applied - Dx prescription",
    time: "2 days ago",
    Icon: CheckShieldIcon,
    tone: "success",
  },
  {
    id: "activity-hba1c",
    title: `Lab report received - ${deltaLabFacts.hba1c.label} ${deltaLabFacts.hba1c.value}`,
    time: deltaLabFacts.hba1c.date,
    Icon: TubeIcon,
    tone: "neutral",
  },
  {
    id: "activity-ecg",
    title: "ECG report generated",
    time: "4 days ago",
    Icon: ScanIcon,
    tone: "brand",
  },
  {
    id: "activity-ultrasound",
    title: "Abdominal ultrasound uploaded",
    time: "2 weeks ago",
    Icon: UploadIcon,
    tone: "brand",
  },
  {
    id: "activity-referral",
    title: "Referral letter sent - Calmette",
    time: "1 month ago",
    Icon: ShareIcon,
    tone: "neutral",
  },
];

function pushLimitedActivity(
  current: RecordActivity[],
  activity: RecordActivity,
) {
  return [activity, ...current].slice(0, 6);
}

function RecordsIconTile({
  Icon,
  tone,
  shape = "square",
}: {
  Icon: RecordsIcon;
  tone: Tone;
  shape?: "circle" | "square";
}) {
  return (
    <span className={cx("records-icon-tile", `tone-${tone}`, shape === "circle" && "is-circle")} aria-hidden>
      <Icon size={16} variant="twotone" />
    </span>
  );
}

function SignedStatus() {
  return (
    <span className="records-signed-status">
      <CheckCircleIcon size={12} variant="twotone" />
      <span>Signed</span>
    </span>
  );
}

function DocumentRow({
  document,
  isMenuOpen,
  onArchive,
  onCloseMenu,
  onDownload,
  onShare,
  onToggleMenu,
  onView,
}: {
  document: RecordDocument;
  isMenuOpen: boolean;
  onArchive: () => void;
  onCloseMenu: () => void;
  onDownload: () => void;
  onShare: () => void;
  onToggleMenu: () => void;
  onView: () => void;
}) {
  return (
    <article className="records-document-row">
      <RecordsIconTile Icon={document.Icon} tone={document.tone} />
      <div className="records-document-copy">
        <div className="records-document-title-row">
          <strong>{document.title}</strong>
          {document.signed && <SignedStatus />}
        </div>
        <p>{document.meta}</p>
      </div>
      <Badge className="records-format-badge" tone="neutral">
        {document.format}
      </Badge>
      <div className="records-row-actions">
        <button onClick={onView} type="button">
          View
        </button>
        <span aria-hidden />
        <button onClick={onDownload} type="button">
          Download
        </button>
      </div>
      <div
        className="records-more-menu-wrap"
        onBlur={(event) => {
          const nextTarget = event.relatedTarget;

          if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) {
            return;
          }

          onCloseMenu();
        }}
      >
        <button
          aria-expanded={isMenuOpen}
          aria-haspopup="menu"
          aria-label={`More actions for ${document.title}`}
          className="records-more-button"
          onClick={onToggleMenu}
          type="button"
        >
          <MoreIcon size={18} variant="stroke" />
        </button>
        {isMenuOpen && (
          <div className="records-more-menu" role="menu">
            <button onClick={onShare} role="menuitem" type="button">
              Share
            </button>
            <button onClick={onArchive} role="menuitem" type="button">
              Archive
            </button>
          </div>
        )}
      </div>
    </article>
  );
}

function ActivityRow({ activity }: { activity: RecordActivity }) {
  return (
    <article className="records-activity-row">
      <RecordsIconTile Icon={activity.Icon} tone={activity.tone} shape="circle" />
      <div>
        <strong>{activity.title}</strong>
        <p>{activity.time}</p>
      </div>
    </article>
  );
}

export function RecordsTab() {
  const [documents, setDocuments] = useState<RecordDocument[]>(initialDocuments);
  const [activities, setActivities] = useState<RecordActivity[]>(initialActivities);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const uploadCountRef = useRef(0);
  const activityCountRef = useRef(0);

  const groupedDocuments = useMemo(
    () =>
      documentGroups.map((group) => ({
        ...group,
        documents: documents.filter((document) => document.groupId === group.id),
      })),
    [documents],
  );

  const addActivity = (activity: Omit<RecordActivity, "id">) => {
    activityCountRef.current += 1;
    setActivities((current) =>
      pushLimitedActivity(current, {
        id: `activity-live-${activityCountRef.current}`,
        ...activity,
      }),
    );
  };

  const announceDocumentAction = (action: string, document: RecordDocument) => {
    setAnnouncement(`${action}: ${document.title}`);
    setOpenMenuId(null);
  };

  const uploadDocument = () => {
    uploadCountRef.current += 1;
    const uploadNumber = uploadCountRef.current;
    const uploadedDocument: RecordDocument = {
      id: `uploaded-attachment-${uploadNumber}`,
      groupId: "imaging",
      title: uploadNumber === 1 ? "Uploaded clinical attachment" : `Uploaded clinical attachment ${uploadNumber}`,
      meta: "Uploaded by Dr. Chann · just now",
      format: "PDF",
      Icon: UploadIcon,
      tone: "brand",
    };

    setDocuments((current) => [uploadedDocument, ...current]);
    setAnnouncement(`Uploaded: ${uploadedDocument.title}`);
    addActivity({
      title: "Document uploaded - clinical attachment",
      time: "just now",
      Icon: UploadIcon,
      tone: "brand",
    });
  };

  const archiveDocument = (document: RecordDocument) => {
    setDocuments((current) => current.filter((item) => item.id !== document.id));
    setAnnouncement(`Archived: ${document.title}`);
    setOpenMenuId(null);
    addActivity({
      title: `Document archived - ${document.title}`,
      time: "just now",
      Icon: ReceiptIcon,
      tone: "neutral",
    });
  };

  return (
    <section
      aria-labelledby="record-tab-records"
      className="records-tab"
      id="record-panel-records"
      role="tabpanel"
    >
      <main className="records-main" aria-label="Patient documents">
        <section className="records-doc-card" aria-labelledby="records-documents-title">
          <div className="records-doc-card-header">
            <h2 id="records-documents-title">Documents</h2>
            <Button
              className="records-upload-button"
              intent="ghost"
              leadingIcon={<UploadIcon size={14} variant="stroke" />}
              onClick={uploadDocument}
              size="sm"
            >
              Upload
            </Button>
          </div>

          {groupedDocuments.map((group) => {
            if (group.documents.length === 0) {
              return null;
            }

            return (
              <section className="records-document-group" key={group.id} aria-labelledby={`records-group-${group.id}`}>
                <div className="records-group-heading">
                  <h3 id={`records-group-${group.id}`}>{group.label}</h3>
                  <Counter count={group.documents.length} />
                </div>
                <div className="records-document-list">
                  {group.documents.map((document) => (
                    <DocumentRow
                      document={document}
                      isMenuOpen={openMenuId === document.id}
                      key={document.id}
                      onArchive={() => archiveDocument(document)}
                      onCloseMenu={() => setOpenMenuId(null)}
                      onDownload={() => announceDocumentAction("Downloaded", document)}
                      onShare={() => {
                        announceDocumentAction("Shared", document);
                        addActivity({
                          title: `Document shared - ${document.title}`,
                          time: "just now",
                          Icon: ShareIcon,
                          tone: "neutral",
                        });
                      }}
                      onToggleMenu={() => setOpenMenuId((current) => (current === document.id ? null : document.id))}
                      onView={() => announceDocumentAction("Opened", document)}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </section>

        <p className="records-document-count">
          Showing {documents.length} of {documents.length} documents
        </p>
        <p className="records-live-region" aria-live="polite">
          {announcement}
        </p>
      </main>

      <aside className="records-activity-panel" aria-label="Recent record activity">
        <h2>Recent activity</h2>
        <div className="records-activity-list">
          {activities.map((activity) => (
            <ActivityRow activity={activity} key={activity.id} />
          ))}
        </div>
      </aside>
    </section>
  );
}
