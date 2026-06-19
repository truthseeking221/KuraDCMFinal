"use client";

/* More tab — the launcher for everything that doesn't earn a bottom-nav slot.
   Top: who you are + verification status (taps into the verification view).
   Then grouped ListRows: the live Settings surface, the desktop-heavy areas
   that exist there, and the dead-but-listed roadmap items (Calendar / Care
   plans / Telehealth / Billing / Directory) shown as inert rows so the IA is
   honest about what is and isn't wired yet. Borderless, hairline-grouped. */

import {
  Bell,
  Booking,
  Calendar,
  Catalog,
  ChevronRight,
  Corporate,
  CreditCard,
  Heart,
  IDCard,
  Lock,
  Note,
  Patient,
  Setting,
  TeleConsultation,
} from "@/icons/components";
import type { IconProps } from "@/icons/components/types";
import type { ComponentType } from "react";
import { cx } from "@/lib/cx";
import base from "@/components/DoctorMobile/DoctorMobileApp.module.css";
import { ListRow, Pill, toneClass } from "@/components/DoctorMobile/components/primitives";
import { useMobileApp } from "@/components/DoctorMobile/state/MobileAppContext";
import { useKyd } from "@/components/DoctorMobile/data/kyd";
import styles from "./More.module.css";

const ME = {
  name: "Dr. Phong Tuy",
  initials: "PT",
  cabinet: "Kura Cabinet — Toul Kork",
};

type LinkRow = {
  id: string;
  label: string;
  meta: string;
  Icon: ComponentType<IconProps>;
};

/* live settings sub-areas — each deep-links into the matching Settings section */
const SETTINGS_LINKS: Array<LinkRow & { sectionId: string }> = [
  { id: "account", sectionId: "account", label: "Account & verification", meta: "Identity and license", Icon: IDCard },
  { id: "cabinet", sectionId: "cabinet", label: "Cabinet", meta: "Clinic and logistics", Icon: Corporate },
  { id: "members", sectionId: "members", label: "Members & access", meta: "Roles and invites", Icon: Patient },
  { id: "preferences", sectionId: "preferences", label: "Preferences", meta: "Units, theme, language", Icon: Setting },
  { id: "security", sectionId: "security", label: "Security & audit", meta: "Sessions and PHI log", Icon: Lock },
];

/* operations surfaces that live on desktop Settings today */
const OPERATIONS_LINKS: Array<LinkRow & { sectionId: string }> = [
  { id: "communications", sectionId: "communications", label: "Patient communications", meta: "Channels and templates", Icon: Bell },
  { id: "billing", sectionId: "billing", label: "Billing & settlement", meta: "Bank, KHQR, insurers", Icon: CreditCard },
  { id: "directory", sectionId: "directory", label: "Directory profile", meta: "Public patient listing", Icon: Catalog },
  { id: "esign", sectionId: "esign", label: "e-Signature & documents", meta: "Certificate and signed PDFs", Icon: Note },
];

/* roadmap rows — present in the IA but not yet wired. Shown as inert rows with
   a "Soon" pill so the surface is honest rather than a dead tap. */
const ROADMAP_LINKS: Array<LinkRow> = [
  { id: "calendar", label: "Calendar", meta: "Visit scheduling", Icon: Calendar },
  { id: "care-plans", label: "Care plans", meta: "Protocol templates", Icon: Heart },
  { id: "telehealth", label: "Telehealth", meta: "Video consultations", Icon: TeleConsultation },
  { id: "claims", label: "Claims center", meta: "Insurer submissions", Icon: Booking },
];

export function MoreScreen() {
  const { openSettings, openVerification } = useMobileApp();
  const { uiState, meta } = useKyd();
  const VerIcon = meta.Icon;

  return (
    <section className={base.sectionStack} aria-label="More">
      <header className={base.sectionHeader}>
        <h2>More</h2>
      </header>

      {/* identity + verification anchor */}
      <div className={styles.identityRow}>
        <span className={base.chartAvatar} aria-hidden="true">{ME.initials}</span>
        <span className={styles.identityBody}>
          <strong>{ME.name}</strong>
          <span>{ME.cabinet}</span>
        </span>
        <Pill tone={meta.tone}>{meta.label}</Pill>
      </div>

      {/* verification entry — always tappable, never blocks ordering */}
      <button
        type="button"
        className={cx(base.statusPanel, styles.verificationButton)}
        onClick={openVerification}
      >
        <span className={base.statusPanelHead}>
          <span className={cx(base.statusPanelIcon, toneClass(meta.tone))} aria-hidden="true">
            <VerIcon size={18} variant="stroke" />
          </span>
          <span>
            <h2>{meta.headline}</h2>
            <p>{meta.body}</p>
          </span>
        </span>
        {meta.cta ? (
          <span className={cx(base.taskAction, styles.verificationCta)}>
            {meta.cta}
            <ChevronRight size={14} variant="stroke" aria-hidden="true" />
          </span>
        ) : null}
        <span hidden>{uiState}</span>
      </button>

      {/* live settings */}
      <div>
        <p className={styles.groupLabel}>Workspace settings</p>
        <div className={base.cardGroup}>
          <ListRow
            leading={<Setting size={17} variant="stroke" aria-hidden="true" />}
            title="All settings"
            meta="Overview, status, and next actions"
            onClick={() => openSettings()}
          />
          {SETTINGS_LINKS.map((row) => (
            <ListRow
              key={row.id}
              leading={<row.Icon size={17} variant="stroke" aria-hidden="true" />}
              title={row.label}
              meta={row.meta}
              onClick={() => openSettings(row.sectionId)}
            />
          ))}
        </div>
      </div>

      {/* operations */}
      <div>
        <p className={styles.groupLabel}>Operations</p>
        <div className={base.cardGroup}>
          {OPERATIONS_LINKS.map((row) => (
            <ListRow
              key={row.id}
              leading={<row.Icon size={17} variant="stroke" aria-hidden="true" />}
              title={row.label}
              meta={row.meta}
              onClick={() => openSettings(row.sectionId)}
            />
          ))}
        </div>
      </div>

      {/* roadmap (inert) */}
      <div>
        <p className={styles.groupLabel}>Coming soon</p>
        <div className={base.cardGroup}>
          {ROADMAP_LINKS.map((row) => (
            <ListRow
              key={row.id}
              as="div"
              leading={<row.Icon size={17} variant="stroke" aria-hidden="true" />}
              title={<span className={base.itemMuted}>{row.label}</span>}
              meta={row.meta}
              trailing={<Pill tone="neutral">Soon</Pill>}
            />
          ))}
        </div>
      </div>

      <p className={styles.footNote}>
        Kura DCM · mobile companion. The full clinician console is available on desktop.
      </p>
    </section>
  );
}
