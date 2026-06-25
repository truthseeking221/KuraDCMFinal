"use client";

/* =============================================================================
   CareFocusEnrollDrawer — the ONE enrolment flow for a protocol-driven care focus.

   Shared by Care programs (CarePlansView) and, in the next phase, the patient
   chart. It owns the full enrolment interaction:

     • pick a patient (skipped when the caller already fixes one),
     • evaluate eligibility against the patient's existing data,
     • preview the resulting steps, grouped as
         Already done / Scheduled after enrolment / Needs action now,
     • on confirm, write a real care focus via
       addFocusFromProtocol(patientId, protocol, { satisfiedBy }).

   Pure given the domain store snapshot — the only nondeterminism (ids) lives in
   the store. No wall-clock reads here.
   ============================================================================= */

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge, Button, Drawer, Search } from "@/components/ui";
import {
  CheckCircle as CheckCircleIcon,
  Clock as ClockIcon,
  Note as NoteIcon,
  Plus as PlusIcon,
} from "@/icons/components";
import type { IconProps } from "@/icons/components";
import { cx } from "@/lib/cx";
import {
  addFocusFromProtocol,
  ensure,
  livingPlanOf,
  PROGRAM_PATIENT_PROFILES,
  programPatientProfile,
  useProtocolDefinitions,
  type AddFocusResult,
  type ProgramPatientProfile,
  type ProtocolDefinition,
  type ProtocolKey,
} from "@/features/care-plan/domain";
import "./CareFocusEnrollDrawer.css";

/* ------------------------------------------------------------------ types -- */

type GroupTone = "success" | "neutral" | "warning";

/* Candidate patients offered when the caller has not fixed one. These profiles
   are shared with the program cohort and chart header, so identity never drifts. */
const ENROL_CANDIDATES = PROGRAM_PATIENT_PROFILES;

function normalizePatientQuery(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function profileMeta(profile: ProgramPatientProfile) {
  return `${profile.sex[0]} · ${profile.age} · ${profile.mrn} · ${profile.district}`;
}

function profileSearchText(profile: ProgramPatientProfile) {
  return normalizePatientQuery(
    `${profile.name} ${profile.sex} ${profile.age} ${profile.mrn} ${profile.phoneMasked} ${profile.district} ${profile.insurance}`,
  );
}

/* Deterministic eligibility evaluation: which protocol steps the patient's
   existing data already covers. We read the seeded living plan as their record —
   a step whose label matches a completed intervention on any active focus is
   "already on file"; uncovered lab/imaging steps are "do now"; the rest are
   "will be scheduled". Pure given the store snapshot. */
type PreviewGroups = {
  satisfiedKeys: string[];
  satisfied: { key: string; label: string }[];
  scheduled: { key: string; label: string }[];
  needsAction: { key: string; label: string }[];
};

function evaluateEnrolment(patientId: string, protocol: ProtocolDefinition): PreviewGroups {
  const plans = ensure(patientId);
  const completedLabels = new Set<string>();
  for (const plan of plans) {
    if (plan.status !== "active") continue;
    for (const intv of plan.interventions) {
      if (intv.status === "completed") completedLabels.add(intv.label.toLowerCase());
    }
  }

  const groups: PreviewGroups = { satisfiedKeys: [], satisfied: [], scheduled: [], needsAction: [] };
  for (const step of protocol.steps) {
    if (completedLabels.has(step.label.toLowerCase())) {
      groups.satisfiedKeys.push(step.key);
      groups.satisfied.push({ key: step.key, label: step.label });
    } else if (step.kind === "lab" || step.kind === "imaging") {
      groups.needsAction.push({ key: step.key, label: step.label });
    } else {
      groups.scheduled.push({ key: step.key, label: step.label });
    }
  }
  return groups;
}

function patientHasProtocolFocus(patientId: string, protocolKey: ProtocolKey): boolean {
  const living = livingPlanOf(ensure(patientId));
  return (
    living?.focuses.some(
      (focus) => focus.protocolKey === protocolKey && (focus.focusStatus ?? "active") !== "archived",
    ) ?? false
  );
}

/* ============================================================== component == */

export type CareFocusEnrollDrawerProps = {
  /* Patient to enrol. When omitted, the drawer shows a patient picker. */
  patientId?: string;
  /* Pass a definition or a key — exactly the protocol to enrol into. */
  protocol?: ProtocolDefinition;
  protocolKey?: ProtocolKey;
  open: boolean;
  onClose: () => void;
  /* Fires after a focus is written. Receives the enrolled patient id. */
  onEnrolled?: (patientId: string, result: AddFocusResult) => void;
  /* Patients already in this program — shown as "Enrolled" and not selectable.
     Ignored when patientId is fixed. */
  enrolledIds?: Set<string>;
};

export function CareFocusEnrollDrawer({
  patientId,
  protocol,
  protocolKey,
  open,
  onClose,
  onEnrolled,
  enrolledIds,
}: CareFocusEnrollDrawerProps) {
  const protocols = useProtocolDefinitions();
  const def = protocol ?? (protocolKey ? protocols[protocolKey] ?? null : null);
  return (
    <Drawer
      open={open && def != null}
      onClose={onClose}
      title="Enrol in program"
      subtitle={def ? def.name : undefined}
      width={460}
    >
      {def && (
        <EnrollBody
          key={def.key + (patientId ?? "")}
          protocol={def}
          fixedPatientId={patientId}
          enrolledIds={enrolledIds ?? EMPTY_SET}
          onClose={onClose}
          onEnrolled={onEnrolled}
        />
      )}
    </Drawer>
  );
}

const EMPTY_SET: Set<string> = new Set();

/* ---------------------------------------------------------------- body ----- */

function EnrollBody({
  protocol,
  fixedPatientId,
  enrolledIds,
  onClose,
  onEnrolled,
}: {
  protocol: ProtocolDefinition;
  fixedPatientId?: string;
  enrolledIds: Set<string>;
  onClose: () => void;
  onEnrolled?: (patientId: string, result: AddFocusResult) => void;
}) {
  const [picked, setPicked] = useState<string | null>(fixedPatientId ?? null);
  const [query, setQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const selected = fixedPatientId ?? picked;
  const selectedProfile = selected ? programPatientProfile(selected) : null;
  const selectedAlreadyInPlan = selected ? patientHasProtocolFocus(selected, protocol.key) : false;

  const visibleCandidates = useMemo(() => {
    const normalized = normalizePatientQuery(query);
    if (!normalized) return ENROL_CANDIDATES;
    return ENROL_CANDIDATES.filter((profile) => profileSearchText(profile).includes(normalized));
  }, [query]);

  /* Eligibility + existing-data preview for the chosen patient. */
  const preview = useMemo(
    () => (selected ? evaluateEnrolment(selected, protocol) : null),
    [selected, protocol],
  );

  const previewGroups = preview
    ? [
        { tone: "success" as const, title: "Already done", items: preview.satisfied },
        { tone: "neutral" as const, title: "Scheduled after enrolment", items: preview.scheduled },
        { tone: "warning" as const, title: "Needs action now", items: preview.needsAction },
      ].filter((group) => group.items.length > 0)
    : [];

  const confirm = () => {
    if (!selected || !preview || selectedAlreadyInPlan || submitting) return;
    setSubmitting(true);
    const result = addFocusFromProtocol(selected, protocol, {
      satisfiedBy: preview.satisfiedKeys,
      fromLabel: "enrolment",
    });
    if (!result.added) {
      setSubmitting(false);
      if (result.reason === "already_enrolled") {
        toast.info("Already in plan", {
          description: "This program is already attached to the patient's care plan.",
        });
        return;
      }
      toast.error("Couldn't enrol", { description: "Try again." });
      return;
    }
    onEnrolled?.(selected, result);
  };

  return (
    <div className="cfe-body">
      {!fixedPatientId && (
        <section className="cfe-block">
          <p className="cfe-label">Patient</p>
          {picked ? (
            /* Picked: collapse the roster to the chosen patient so the plan
               preview and confirm sit right where the click happened. */
            <div className="cfe-selected">
              <span className="cfe-roster-id">
                <strong>{selectedProfile?.name}</strong>
                {selectedProfile && <small>{profileMeta(selectedProfile)}</small>}
              </span>
              <button type="button" className="cfe-change" onClick={() => setPicked(null)}>
                Change
              </button>
            </div>
          ) : (
            <>
              <Search
                aria-label="Search patients"
                data-autofocus="true"
                density="compact"
                placeholder="Search patients"
                value={query}
                onChange={(event) => setQuery(event.currentTarget.value)}
                onClear={() => setQuery("")}
              />
              <ul className="cfe-roster">
                {visibleCandidates.map((profile) => {
                  const enrolledInProgram = enrolledIds.has(profile.id);
                  const already = enrolledInProgram || patientHasProtocolFocus(profile.id, protocol.key);
                  return (
                    <li key={profile.id}>
                      <button
                        type="button"
                        className={cx("cfe-roster-row", already && "cfe-roster-row--disabled")}
                        disabled={already}
                        onClick={() => setPicked(profile.id)}
                      >
                        <span className="cfe-roster-id">
                          <strong>{profile.name}</strong>
                          <small>{profileMeta(profile)}</small>
                        </span>
                        {already ? (
                          <Badge appearance="subtle" tone="success" icon={<CheckCircleIcon size={11} variant="stroke" />}>
                            {enrolledInProgram ? "Enrolled" : "In plan"}
                          </Badge>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
              {visibleCandidates.length === 0 && <p className="cfe-empty">No patients found.</p>}
            </>
          )}
        </section>
      )}

      {preview && (
        <section className="cfe-block" aria-label="What enrolling adds">
          <p className="cfe-label">
            Plan preview
            {selectedProfile && <span>{selectedProfile.mrn}</span>}
          </p>
          {previewGroups.length > 0 ? (
            previewGroups.map((group) => (
              <PreviewGroup
                key={group.title}
                tone={group.tone}
                title={group.title}
                items={group.items}
              />
            ))
          ) : (
            <p className="cfe-empty">No new steps will be added.</p>
          )}
        </section>
      )}

      {selectedAlreadyInPlan && (
        <p className="cfe-existing" role="status">
          This program is already in the care plan.
        </p>
      )}

      <div className="cfe-foot">
        <Button intent="secondary" size="sm" onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button
          intent="primary"
          size="sm"
          disabled={!selected || selectedAlreadyInPlan}
          loading={submitting}
          leadingIcon={<PlusIcon size={14} variant="stroke" />}
          onClick={confirm}
        >
          {submitting ? "Enrolling" : "Enrol in program"}
        </Button>
      </div>
    </div>
  );
}

const GROUP_ICON: Record<GroupTone, (props: IconProps) => React.ReactElement> = {
  success: CheckCircleIcon,
  neutral: NoteIcon,
  warning: ClockIcon,
};

function PreviewGroup({
  tone,
  title,
  items,
}: {
  tone: GroupTone;
  title: string;
  items: { key: string; label: string }[];
}) {
  const Icon = GROUP_ICON[tone];
  return (
    <div className="cfe-group">
      <p className={cx("cfe-group-title", `cfe-tone-${tone}`)}>
        <Icon size={13} variant="stroke" aria-hidden />
        {title}
        <span className="cfe-group-count">{items.length}</span>
      </p>
      <ul className="cfe-group-list">
        {items.map((item) => (
          <li key={item.key}>{item.label}</li>
        ))}
      </ul>
    </div>
  );
}

export default CareFocusEnrollDrawer;
