"use client";

/* Settings root (pushed view) — the mobile equivalent of the desktop Settings
   left rail. A grouped index of sections; tapping one pushes the matching
   SettingsSection form. When opened deep-linked (openSettings(sectionId)) the
   shell renders SettingsSection directly; this index is the bare entry. */

import {
  Bell,
  Catalog,
  Corporate,
  CreditCard,
  Home,
  IDCard,
  Lock,
  Note,
  Patient,
  Setting,
} from "@/icons/components";
import type { IconProps } from "@/icons/components/types";
import type { ComponentType } from "react";
import base from "@/components/DoctorMobile/DoctorMobileApp.module.css";
import { ListRow, Pill } from "@/components/DoctorMobile/components/primitives";
import { useMobileApp } from "@/components/DoctorMobile/state/MobileAppContext";
import { useKyd } from "@/components/DoctorMobile/data/kyd";
import { SETTINGS_SECTIONS } from "./SettingsSection";
import styles from "./More.module.css";

const ICONS: Record<string, ComponentType<IconProps>> = {
  overview: Home,
  account: IDCard,
  cabinet: Corporate,
  members: Patient,
  preferences: Setting,
  communications: Bell,
  billing: CreditCard,
  directory: Catalog,
  esign: Note,
  security: Lock,
};

const GROUP_ORDER = ["Workspace", "Operations", "Trust"] as const;

export function SettingsScreen() {
  const { openSettings } = useMobileApp();
  const { meta } = useKyd();

  return (
    <section className={base.sectionStack} aria-label="Settings">
      <header className={base.sectionHeader}>
        <h2>Settings</h2>
      </header>

      <div className={styles.identityRow}>
        <span className={base.chartAvatar} aria-hidden="true">PT</span>
        <span className={styles.identityBody}>
          <strong>Dr. Phong Tuy</strong>
          <span>Kura Cabinet, Toul Kork</span>
        </span>
        <Pill tone={meta.tone}>{meta.label}</Pill>
      </div>

      {GROUP_ORDER.map((group) => {
        const rows = SETTINGS_SECTIONS.filter((section) => section.group === group);
        if (rows.length === 0) return null;
        return (
          <div key={group}>
            <p className={styles.groupLabel}>{group}</p>
            <div className={base.cardGroup}>
              {rows.map((section) => {
                const Icon = ICONS[section.id] ?? Setting;
                return (
                  <ListRow
                    key={section.id}
                    leading={<Icon size={17} variant="stroke" aria-hidden="true" />}
                    title={section.label}
                    meta={section.detail}
                    onClick={() => openSettings(section.id)}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </section>
  );
}
