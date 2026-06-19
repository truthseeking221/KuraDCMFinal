"use client";

/* Full-screen patient switcher — opens from the Patients top-bar search.
   Autofocus input, filtered result rows over the FULL roster (render all),
   each row selects its own patient. Reuses base overlay/searchSheet/searchBox. */

import { useEffect, useMemo, useRef, useState } from "react";
import { Close, Search } from "@/icons/components";
import { cx } from "@/lib/cx";
import base from "@/components/DoctorMobile/DoctorMobileApp.module.css";
import { toneTextClass } from "@/components/DoctorMobile/components/primitives";
import { roster, type RosterPatient } from "@/components/DoctorMobile/data/clinical";
import styles from "./PatientSwitcherOverlay.module.css";

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function matchesQuery(patient: RosterPatient, query: string): boolean {
  if (!query) return true;
  const haystack = [
    patient.name,
    patient.khmerName ?? "",
    patient.identity,
    patient.context,
    patient.attention,
    patient.conditionCodes.join(" "),
  ]
    .join(" ")
    .toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((token) => haystack.includes(token));
}

export function PatientSwitcherOverlay({
  onClose,
  onSelect,
}: {
  onClose: () => void;
  onSelect: (patientId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const results = useMemo(
    () => roster.filter((patient) => matchesQuery(patient, query.trim())),
    [query],
  );

  return (
    <div
      className={base.overlay}
      role="dialog"
      aria-modal="true"
      aria-label="Switch patient"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className={cx(base.searchSheet, styles.sheet)}>
        <div className={base.sheetHeader}>
          <h2>Switch patient</h2>
          <button type="button" className={base.iconButton} onClick={onClose} aria-label="Close">
            <Close size={18} variant="stroke" aria-hidden="true" />
          </button>
        </div>

        <div className={base.searchBox}>
          <Search size={18} variant="stroke" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            inputMode="search"
            placeholder="Name, MRN, or condition"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Search patients"
          />
        </div>

        <div className={styles.results} role="list">
          {results.length === 0 ? (
            <p className={styles.empty}>No patients match “{query.trim()}”.</p>
          ) : (
            results.map((patient) => (
              <SwitcherRow
                key={patient.id}
                patient={patient}
                onSelect={() => onSelect(patient.id)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function SwitcherRow({ patient, onSelect }: { patient: RosterPatient; onSelect: () => void }) {
  return (
    <button
      type="button"
      className={cx(base.testRow, base.patientResult)}
      role="listitem"
      onClick={onSelect}
    >
      <span className={base.avatar} aria-hidden="true">
        {initialsOf(patient.name)}
      </span>
      <span className={base.taskBody}>
        <span className={base.taskPatient}>{patient.name}</span>
        <span className={base.rosterIdentity}>{patient.identity}</span>
        <span className={styles.problemPreview}>{patient.context}</span>
      </span>
      <span
        className={cx(base.attnDot, toneTextClass(patient.attentionTone))}
        aria-hidden="true"
      />
    </button>
  );
}

export default PatientSwitcherOverlay;
