"use client";

/* Patients tab — doctor worklist. Two ChipRails (scope + clinical attention)
   that actually filter the urgency-sorted roster via matchesScope/matchesClinical.
   Each roster row pushes its OWN patient (pushPatient(p.id)) — never a fixed id.
   A top-bar search trigger opens the full-screen PatientSwitcherOverlay. */

import { useMemo, useState } from "react";
import { ArrowRight, ChevronRight, Search } from "@/icons/components";
import { cx } from "@/lib/cx";
import base from "@/components/DoctorMobile/DoctorMobileApp.module.css";
import { ChipRail, toneTextClass } from "@/components/DoctorMobile/components/primitives";
import { useMobileApp } from "@/components/DoctorMobile/state/MobileAppContext";
import {
  roster,
  patientScopeFilters,
  patientClinicalFilters,
  matchesScope,
  matchesClinical,
  type RosterPatient,
  type PatientScopeId,
  type PatientClinicalId,
} from "@/components/DoctorMobile/data/clinical";
import { PatientSwitcherOverlay } from "./PatientSwitcherOverlay";

export function PatientsRosterScreen() {
  const { pushPatient } = useMobileApp();
  const [scope, setScope] = useState<PatientScopeId>("all");
  const [clinical, setClinical] = useState<PatientClinicalId | null>(null);
  const [switcherOpen, setSwitcherOpen] = useState(false);

  const scopeItems = useMemo(
    () => patientScopeFilters.map((f) => ({ id: f.id, label: f.label })),
    [],
  );
  const clinicalItems = useMemo(
    () => patientClinicalFilters.map((f) => ({ id: f.id, label: f.label })),
    [],
  );

  const visible = useMemo(
    () =>
      roster.filter(
        (patient) => matchesScope(patient, scope) && matchesClinical(patient, clinical),
      ),
    [scope, clinical],
  );

  return (
    <section className={base.sectionStack} aria-label="Patient worklist">
      <header className={base.sectionHeader}>
        <h2>Patients</h2>
        <span>{visible.length} of {roster.length}</span>
      </header>

      <button
        type="button"
        className={base.searchBox}
        onClick={() => setSwitcherOpen(true)}
      >
        <Search size={18} variant="stroke" aria-hidden="true" />
        <span className={base.searchBoxPlaceholder}>Search all patients</span>
      </button>

      <ChipRail
        items={scopeItems}
        activeId={scope}
        onSelect={(id) => setScope(id as PatientScopeId)}
      />
      <ChipRail
        items={clinicalItems}
        activeId={clinical}
        onSelect={(id) =>
          setClinical((current) => (current === id ? null : (id as PatientClinicalId)))
        }
        multi
      />

      <div className={base.cardGroup} role="list">
        {visible.length === 0 ? (
          <p className={base.muted} style={{ padding: "var(--space-4) 0" }}>
            No patients match these filters.
          </p>
        ) : (
          visible.map((patient) => (
            <RosterRow key={patient.id} patient={patient} onOpen={() => pushPatient(patient.id)} />
          ))
        )}
      </div>

      {switcherOpen ? (
        <PatientSwitcherOverlay
          onClose={() => setSwitcherOpen(false)}
          onSelect={(id) => {
            setSwitcherOpen(false);
            pushPatient(id);
          }}
        />
      ) : null}
    </section>
  );
}

function RosterRow({ patient, onOpen }: { patient: RosterPatient; onOpen: () => void }) {
  return (
    <button type="button" className={base.rosterRow} role="listitem" onClick={onOpen}>
      <span className={base.rosterMain}>
        <span className={base.rosterTopline}>
          <span className={base.rosterName}>
            <span className={cx(base.attnDot, toneTextClass(patient.attentionTone))} aria-hidden="true" />
            <span>{patient.name}</span>
          </span>
          <span className={base.rosterWhen}>{patient.lastActivity}</span>
        </span>
        <span className={base.rosterIdentity}>{patient.identity}</span>
        <span className={cx(base.rosterAttention, toneTextClass(patient.attentionTone))}>
          {patient.attention}
        </span>
        <span className={base.rosterContext}>{patient.context}</span>
        <span className={base.rosterActions}>
          <span className={base.rosterNext}>
            {patient.nextAction}
            <ArrowRight size={13} variant="stroke" aria-hidden="true" />
          </span>
          {patient.labsBack ? (
            <span className={cx(base.miniPill, base.tone_warning)}>New labs back</span>
          ) : null}
        </span>
      </span>
      <ChevronRight size={16} variant="stroke" aria-hidden="true" />
    </button>
  );
}

export default PatientsRosterScreen;
