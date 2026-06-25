"use client";

/* =============================================================================
   CarePlansView — Care PROGRAMS (population + protocol workspace).

   PR4 of the Care Plan refactor. This screen is NOT a patient chart and performs
   NO clinical treatment actions (no lab-done, no Rx, no result review, no per-step
   completion, no context rail). Those belong to the patient chart. Here a doctor
   manages PROGRAMS (protocol cohorts) and PROTOCOLS (the clinical definitions),
   on the shared care-plan domain (src/features/care-plan/domain):

     • PROGRAMS — one row per protocol with its enrolled cohort + how many need
       attention. Selecting a program opens its COHORT table (read-only state
       summaries from selectProgramCohort). "Open care plan" is real navigation.
     • PROTOCOLS — one row per protocol definition, version/status/usage, and
       an Edit drawer (ProtocolEditor) to update eligibility, review cadence and
       publish a new version note. Targets/actions stay read-only until they have
       structured editors.

   ENROLMENT is REAL: choosing a patient evaluates eligibility + existing data,
   previews steps grouped (already done / scheduled after enrolment / needs
   action now), and on confirm creates a real Care Focus in the patient's living
   plan via addFocusFromProtocol(patientId, protocol, { satisfiedBy }). No local
   ActivePlan / patient-plan model lives here any more.

   Deterministic: cohorts derive from the seeded living plans; the only
   nondeterminism (ids) lives in the domain store. No wall-clock reads. */

import { useCallback, useMemo, useReducer, useState } from "react";
import { toast } from "sonner";
import { Badge, Button, Drawer, Input, Select, Table, Textarea } from "@/components/ui";
import type { Column } from "@/components/ui";
import {
  CheckCircle as CheckCircleIcon,
  ChevronRight as ChevronRightIcon,
  Clock as ClockIcon,
  Flask as FlaskIcon,
  Heart as HeartIcon,
  Kidney as KidneyIcon,
  Note as NoteIcon,
  Patient as PatientIcon,
  Pill as PillIcon,
  Plus as PlusIcon,
  Warning as WarningIcon,
} from "@/icons/components";
import type { IconProps } from "@/icons/components";
import { CareFocusEnrollDrawer } from "@/features/care-plan/components";
import {
  ensure,
  parseCadenceAnchorLabel,
  PROGRAM_SEED_PATIENT_IDS,
  programPatientName,
  programPatientProfile,
  selectNextPlanAction,
  selectProgramCohort,
  updateProtocolDefinition,
  useProtocolDefinitions,
  type ProgramCohortMember,
  type ProtocolDefinition,
  type ProtocolKey,
} from "@/features/care-plan/domain";
import "./CarePlansView.css";

/* Pre-warm the snapshot the cohort selector reads: selectProgramCohort scans
   only the patients already in the store's Map, so seeded program patients must
   be ensure()'d before first render. ensure() lazily seeds + never emits, so this
   is safe at module load and keeps the first cohort render populated. */
for (const id of PROGRAM_SEED_PATIENT_IDS) ensure(id);

/* ------------------------------------------------------------------ types -- */

type Tone = "danger" | "warning" | "info" | "success" | "neutral";
type JustEnrolled = { patientId: string; protocolKey: ProtocolKey };

const PROGRAM_ORDER: ProtocolKey[] = ["t2dm", "ckd", "htn", "lipid_cvd"];

/* One icon per protocol — status/identity is never colour alone. */
const PROTOCOL_ICON: Record<ProtocolKey, (props: IconProps) => React.ReactElement> = {
  t2dm: PillIcon,
  ckd: KidneyIcon,
  htn: HeartIcon,
  lipid_cvd: FlaskIcon,
};

/* Protocol-authoring metadata that the shared ProtocolDefinition does not carry
   (it is pure clinical content). Version / status / last-reviewed live here as the
   workspace's editorial layer; Owner is the responsible clinician for the program. */
type ProtocolMeta = { version: string; status: ProtocolStatus; lastReviewed: string; owner: string };
type ProtocolStatus = "published" | "draft" | "in_review";
type JustPublishedProtocol = { protocolKey: ProtocolKey; version: string; note: string };
type ProtocolDraft = Pick<ProtocolDefinition, "eligibility" | "reviewCadence">;
type ProgramConfig = {
  name: string;
  condition: string;
  targetPatients: string;
  goals: string;
  cadence: string;
  owner: string;
  linkedProtocol: ProtocolKey;
};
type CreatedProgram = ProgramConfig & {
  id: string;
  createdAt: string;
};

const PROTOCOL_META: Record<ProtocolKey, ProtocolMeta> = {
  t2dm: { version: "v3.0", status: "published", lastReviewed: "12 Feb 2026", owner: "Dr Dara" },
  ckd: { version: "v2.1", status: "published", lastReviewed: "20 Jan 2026", owner: "Dr Dara" },
  htn: { version: "v1.4", status: "published", lastReviewed: "14 Feb 2026", owner: "Dr Sothea" },
  lipid_cvd: { version: "v2.0", status: "in_review", lastReviewed: "5 Mar 2026", owner: "Dr Sothea" },
};
const PROTOCOL_PUBLISH_DATE = "23 Jun 2026";
const PROGRAM_CREATED_DATE = "23 Jun 2026";
const PROGRAM_TODAY_UTC = Date.UTC(2026, 5, 23);
const DAY_MS = 24 * 60 * 60 * 1000;
const MONTH_INDEX: Record<string, number> = {
  Jan: 0,
  Feb: 1,
  Mar: 2,
  Apr: 3,
  May: 4,
  Jun: 5,
  Jul: 6,
  Aug: 7,
  Sep: 8,
  Oct: 9,
  Nov: 10,
  Dec: 11,
};

const STATUS_LABEL: Record<ProtocolStatus, string> = {
  published: "Published",
  draft: "Draft",
  in_review: "In review",
};
/* New-program inputs are finite scales, not free text. The doctor picks a protocol
   and everything below derives from it; cadence and owner stay editable but are
   constrained to values the cohort/review layer understands. */
const PROGRAM_OWNER_ROLES = ["Responsible clinician", "Clinic nurse", "Care coordinator"] as const;
const PROGRAM_CADENCE_OPTIONS = ["Every month", "Every 3 months", "Every 6 months", "Every 12 months"];

/* ----------------------------------------------------------- derivations -- */

/* A cohort member needs attention when its focus is at risk or has open loops. */
function memberNeedsAttention(m: ProgramCohortMember): boolean {
  return m.atRisk || m.openLoop > 0;
}

function attentionSummary(count: number): string {
  return count === 1 ? "1 needs attention" : `${count} need attention`;
}

type CohortActionSummary = {
  status: string;
  label: string;
  detail: string;
  tone: Tone;
  sort: number;
};

type CohortReviewSummary = {
  status: string;
  date: string;
  detail: string;
  tone: Tone;
  sort: number;
};

/* Read-only next-action summary from the shared selector. This screen never
   completes it; it only routes the doctor to the patient care plan. */
function cohortNextActionSummary(m: ProgramCohortMember): CohortActionSummary {
  const next = selectNextPlanAction(m.patientId, m.focus.id);
  if (!next) {
    return {
      status: "No action",
      label: "Up to date",
      detail: "No open actions",
      tone: "success",
      sort: 4,
    };
  }

  const status: Record<NonNullable<typeof next>["reason"], string> = {
    overdue: "Overdue",
    blocked: "Blocked",
    in_progress: "In progress",
    due: "Due",
  };
  const tone: Record<NonNullable<typeof next>["reason"], Tone> = {
    overdue: "warning",
    blocked: "warning",
    in_progress: "info",
    due: "info",
  };
  const sort: Record<NonNullable<typeof next>["reason"], number> = {
    overdue: 0,
    blocked: 1,
    due: 2,
    in_progress: 3,
  };
  const detailParts = [next.intervention.owner, next.intervention.frequency].filter(Boolean);

  return {
    status: status[next.reason],
    label: next.intervention.label,
    detail: detailParts.join(" · ") || "Open action",
    tone: tone[next.reason],
    sort: sort[next.reason],
  };
}

function parseDisplayDate(label: string): number | null {
  const match = /^(\d{1,2}) ([A-Z][a-z]{2}) (\d{4})$/.exec(label.trim());
  if (!match) return null;
  const month = MONTH_INDEX[match[2]];
  if (month == null) return null;
  return Date.UTC(Number(match[3]), month, Number(match[1]));
}

function reviewSummary(nextReview?: string): CohortReviewSummary {
  if (!nextReview) {
    return {
      status: "Not scheduled",
      date: "No review date",
      detail: "Set before the next cycle",
      tone: "warning",
      sort: 0,
    };
  }

  const relative = parseCadenceAnchorLabel(nextReview);
  if (relative) {
    const fromEnrolment = relative.anchor.toLowerCase() === "enrolment";
    return {
      status: fromEnrolment ? "Starts after enrolment" : "Scheduled",
      date: fromEnrolment ? "After enrolment" : relative.anchor,
      detail: relative.cadence,
      tone: "neutral",
      sort: 3,
    };
  }

  const parsed = parseDisplayDate(nextReview);
  if (parsed == null) {
    return {
      status: "Scheduled",
      date: nextReview,
      detail: "Review date",
      tone: "neutral",
      sort: 3,
    };
  }

  const days = Math.round((parsed - PROGRAM_TODAY_UTC) / DAY_MS);
  if (days < 0) {
    return {
      status: "Review overdue",
      date: nextReview,
      detail: `${Math.abs(days)} days overdue`,
      tone: "warning",
      sort: 0,
    };
  }
  if (days === 0) {
    return {
      status: "Review today",
      date: nextReview,
      detail: "Due today",
      tone: "warning",
      sort: 1,
    };
  }
  if (days <= 14) {
    return {
      status: "Review soon",
      date: nextReview,
      detail: `In ${days} days`,
      tone: "info",
      sort: 2,
    };
  }
  return {
    status: "Scheduled",
    date: nextReview,
    detail: `In ${days} days`,
    tone: "neutral",
    sort: 3,
  };
}

function patientMeta(patientId: string): string {
  const profile = programPatientProfile(patientId);
  if (!profile) return "Patient identity unavailable";
  return `${profile.sex} · ${profile.age} · ${profile.mrn}`;
}

function cadenceSentence(cadence: string): string {
  return cadence.length > 0 ? cadence[0].toLowerCase() + cadence.slice(1) : cadence;
}

function nextProtocolVersion(version: string): string {
  const match = /^v?(\d+)\.(\d+)$/.exec(version.trim());
  if (!match) return version;
  return `v${Number(match[1])}.${Number(match[2]) + 1}`;
}

/* The protocol already owns the program's clinical content — name it, describe who
   it is for, list its goals, set its review cadence. Derive these instead of asking
   the doctor to retype them. */
function suggestProgramName(protocol: ProtocolDefinition): string {
  return `${protocol.shortLabel} programme`;
}

function protocolGoalsSummary(protocol: ProtocolDefinition): string {
  return protocol.targets.map((t) => t.label).join(". ");
}

function protocolDefaultOwner(protocol: ProtocolDefinition): string {
  const owner = protocol.steps
    .map((step) => step.owner)
    .find((role): role is string => !!role && (PROGRAM_OWNER_ROLES as readonly string[]).includes(role));
  return owner ?? PROGRAM_OWNER_ROLES[0];
}

const TONE_ICON: Record<Tone, (props: IconProps) => React.ReactElement> = {
  danger: WarningIcon,
  warning: ClockIcon,
  info: FlaskIcon,
  success: CheckCircleIcon,
  neutral: NoteIcon,
};

function ToneBadge({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  const Icon = TONE_ICON[tone];
  return (
    <Badge appearance="subtle" tone={tone} icon={<Icon size={12} variant="stroke" />}>
      {children}
    </Badge>
  );
}

/* ============================================================== component == */

export type CarePlansViewProps = {
  /* Real navigation to a patient chart, carrying the program so the chart can land
     on the matching care focus. When absent, opening the care plan falls back to a toast and
     the parent (page.tsx) can wire the route. */
  onOpenPatient?: (patientId: string, opts?: { protocolKey?: ProtocolKey }) => void;
  /* Deep-link from a patient's Care Plan: open this program's cohort on mount. */
  initialProgram?: ProtocolKey;
};

export function CarePlansView({ onOpenPatient, initialProgram }: CarePlansViewProps = {}) {
  /* Local re-derive tick: enrolment mutates the domain store (which emits to the
     chart), and we re-read the cohort selectors after our own write. */
  const [tick, bumpTick] = useReducer((n: number) => n + 1, 0);
  const [selectedProgram, setSelectedProgram] = useState<ProtocolKey | null>(initialProgram ?? null);
  const [editProtocol, setEditProtocol] = useState<ProtocolKey | null>(null);
  const [enrolFor, setEnrolFor] = useState<ProtocolDefinition | null>(null);
  const [justEnrolled, setJustEnrolled] = useState<JustEnrolled | null>(null);
  const [createProgramOpen, setCreateProgramOpen] = useState(false);
  const [createdPrograms, setCreatedPrograms] = useState<CreatedProgram[]>([]);
  const protocols = useProtocolDefinitions();
  const [protocolMeta, setProtocolMeta] = useState<Record<ProtocolKey, ProtocolMeta>>({ ...PROTOCOL_META });
  const [justPublished, setJustPublished] = useState<JustPublishedProtocol | null>(null);
  const [justCreatedProgram, setJustCreatedProgram] = useState<CreatedProgram | null>(null);
  const showNewProgram = selectedProgram == null;

  /* Cohort per protocol, recomputed whenever an enrolment lands (tick). */
  const cohorts = useMemo(() => {
    void tick;
    const out = {} as Record<ProtocolKey, ProgramCohortMember[]>;
    for (const key of PROGRAM_ORDER) out[key] = selectProgramCohort(key);
    return out;
  }, [tick]);

  const openChart = useCallback(
    (patientId: string, protocolKey: ProtocolKey) => {
      if (onOpenPatient) {
        setJustEnrolled(null);
        onOpenPatient(patientId, { protocolKey });
        return;
      }
      toast(`Open ${programPatientName(patientId)}'s chart`, {
        description: "Patient care happens in the chart.",
      });
    },
    [onOpenPatient],
  );

  const handleEnrolled = useCallback(
    (patientId: string, key: ProtocolKey) => {
      bumpTick();
      setSelectedProgram(key);
      setJustEnrolled({ patientId, protocolKey: key });
      setEnrolFor(null);
    },
    [],
  );

  const selectProgram = useCallback((key: ProtocolKey) => {
    setSelectedProgram(key);
    setJustCreatedProgram(null);
    setJustEnrolled(null);
  }, []);

  const leaveCohort = useCallback(() => {
    setSelectedProgram(null);
    setJustEnrolled(null);
  }, []);

  const selectCreatedProgram = useCallback((id: string) => {
    const program = createdPrograms.find((item) => item.id === id);
    if (!program) return;
    setSelectedProgram(program.linkedProtocol);
    setJustCreatedProgram(null);
    setJustEnrolled(null);
  }, [createdPrograms]);

  const openNewProgram = useCallback(() => {
    setSelectedProgram(null);
    setJustCreatedProgram(null);
    setJustEnrolled(null);
    setCreateProgramOpen(true);
  }, []);

  const handleProgramCreated = useCallback(
    (program: ProgramConfig) => {
      const next: CreatedProgram = {
        ...program,
        id: `program-${createdPrograms.length + 1}`,
        createdAt: PROGRAM_CREATED_DATE,
      };
      setCreatedPrograms((current) => [next, ...current]);
      setSelectedProgram(null);
      setJustCreatedProgram(next);
      setCreateProgramOpen(false);
      toast.success("Program created", {
        description: `${next.name} is active and linked to ${protocols[next.linkedProtocol].name}.`,
      });
    },
    [createdPrograms.length, protocols],
  );

  const handleProtocolPublished = useCallback(
    (key: ProtocolKey, note: string, draft: ProtocolDraft) => {
      const nextVersion = nextProtocolVersion(protocolMeta[key].version);
      updateProtocolDefinition(key, draft);
      setProtocolMeta((current) => ({
        ...current,
        [key]: {
          ...current[key],
          version: nextVersion,
          status: "published",
          lastReviewed: PROTOCOL_PUBLISH_DATE,
        },
      }));
      setJustPublished({ protocolKey: key, version: nextVersion, note });
      setEditProtocol(null);
    },
    [protocolMeta],
  );

  const viewPublishedCohort = useCallback((key: ProtocolKey) => {
    setSelectedProgram(key);
    setJustPublished(null);
  }, []);

  return (
    <div className="cpv" aria-label="Care programs">
      <div className="cpv-toolbar">
        <div className="cpv-toolbar-head">
          <h1 className="cpv-title">Care programs</h1>
          <span className="cpv-toolbar-summary">
            {PROGRAM_ORDER.length + createdPrograms.length} active
          </span>
        </div>
        {showNewProgram && (
          <Button
            intent="primary"
            size="sm"
            leadingIcon={<PlusIcon size={14} variant="stroke" />}
            onClick={openNewProgram}
          >
            New program
          </Button>
        )}
      </div>

      {selectedProgram ? (
        <CohortView
          protocol={protocols[selectedProgram]}
          members={cohorts[selectedProgram]}
          justEnrolled={justEnrolled?.protocolKey === selectedProgram ? justEnrolled : null}
          onBack={leaveCohort}
          onEnrol={() => setEnrolFor(protocols[selectedProgram])}
          onDismissEnrolled={() => setJustEnrolled(null)}
          onOpenChart={(patientId) => openChart(patientId, selectedProgram)}
        />
      ) : (
        <>
          {justPublished && (
            <ProtocolPublishedBanner
              protocol={protocols[justPublished.protocolKey]}
              published={justPublished}
              onDismiss={() => setJustPublished(null)}
              onViewCohort={() => viewPublishedCohort(justPublished.protocolKey)}
            />
          )}
          {justCreatedProgram && (
            <ProgramCreatedBanner
              program={justCreatedProgram}
              linkedProtocol={protocols[justCreatedProgram.linkedProtocol]}
              onDismiss={() => setJustCreatedProgram(null)}
              onViewCohort={() => selectCreatedProgram(justCreatedProgram.id)}
            />
          )}
          <ProgramsOverview
            cohorts={cohorts}
            protocols={protocols}
            meta={protocolMeta}
            created={createdPrograms}
            onSelect={selectProgram}
            onSelectCreated={selectCreatedProgram}
            onEditProtocol={setEditProtocol}
          />
        </>
      )}

      <ProtocolEditorDrawer
        protocol={editProtocol ? protocols[editProtocol] : null}
        meta={editProtocol ? protocolMeta[editProtocol] : null}
        onClose={() => setEditProtocol(null)}
        onPublished={handleProtocolPublished}
      />

      <NewProgramDrawer
        open={createProgramOpen}
        protocols={protocols}
        onClose={() => setCreateProgramOpen(false)}
        onCreate={handleProgramCreated}
      />

      <CareFocusEnrollDrawer
        open={enrolFor != null}
        protocol={enrolFor ?? undefined}
        enrolledIds={enrolFor ? new Set(cohorts[enrolFor.key].map((m) => m.patientId)) : undefined}
        onClose={() => setEnrolFor(null)}
        onEnrolled={(patientId) => enrolFor && handleEnrolled(patientId, enrolFor.key)}
      />
    </div>
  );
}

/* --------------------------------------------------- Programs overview ----- */

type ProgramRow = {
  id: string;
  kind: "active" | "created";
  key: ProtocolKey;
  name: string;
  enrolled: number;
  attention: number;
  owner: string;
  metaLine: string;
  cadence: string;
  protocolName: string;
  createdId?: string;
};

function ProgramsOverview({
  cohorts,
  protocols,
  meta,
  created,
  onSelect,
  onSelectCreated,
  onEditProtocol,
}: {
  cohorts: Record<ProtocolKey, ProgramCohortMember[]>;
  protocols: Record<ProtocolKey, ProtocolDefinition>;
  meta: Record<ProtocolKey, ProtocolMeta>;
  created: CreatedProgram[];
  onSelect: (key: ProtocolKey) => void;
  onSelectCreated: (id: string) => void;
  onEditProtocol: (key: ProtocolKey) => void;
}) {
  const rows: ProgramRow[] = [
    ...PROGRAM_ORDER.map<ProgramRow>((key) => {
      const members = cohorts[key];
      return {
        id: key,
        kind: "active" as const,
        key,
        name: protocols[key].name,
        enrolled: members.length,
        attention: members.filter(memberNeedsAttention).length,
        owner: meta[key].owner,
        metaLine: `Reviewed ${meta[key].lastReviewed}`,
        cadence: protocols[key].reviewCadence,
        protocolName: protocols[key].name,
      };
    }),
    ...created.map<ProgramRow>((program) => {
      const linkedMembers = cohorts[program.linkedProtocol];
      return {
        id: program.id,
        kind: "created" as const,
        key: program.linkedProtocol,
        name: program.name,
        enrolled: linkedMembers.length,
        attention: linkedMembers.filter(memberNeedsAttention).length,
        owner: program.owner,
        metaLine: `Created ${program.createdAt} · linked to ${protocols[program.linkedProtocol].name}`,
        cadence: program.cadence,
        protocolName: protocols[program.linkedProtocol].name,
        createdId: program.id,
      };
    }),
  ];

  return (
    <section className="cpv-section cpv-section--programs" aria-label="Programs">
      <div className="cpv-program-grid">
        {rows.map((row) => {
          const Icon = PROTOCOL_ICON[row.key];
          const attentionCopy = row.attention > 0 ? String(row.attention) : "0";
          const attentionSummary =
            row.attention === 0
              ? "No attention"
              : `${row.attention} ${row.attention === 1 ? "needs" : "need"} attention`;
          const reviewSummary = `Review ${row.cadence.replace(/^Every\b/, "every")}`;
          return (
            <article
              key={row.id}
              className="cpv-program-card"
              aria-label={
                row.kind === "created"
                  ? `${row.name}. Linked to ${row.protocolName}. ${row.enrolled} enrolled in linked cohort. ${attentionCopy} attention. Review ${row.cadence}.`
                  : `${row.name}. ${row.enrolled} enrolled. ${attentionCopy} attention. Review ${row.cadence}.`
              }
            >
              <span className="cpv-program-card-head">
                <span aria-hidden className="cpv-program-mark">
                  <Icon size={18} variant="duotone" />
                </span>
                <span className="cpv-program-title">
                  <strong>{row.name}</strong>
                  <small>
                    {row.owner} · {row.metaLine}
                  </small>
                </span>
              </span>

              <span className="cpv-program-summary">
                <span>{row.enrolled} enrolled</span>
                <span className={row.attention > 0 ? "is-warning" : undefined}>{attentionSummary}</span>
                <span>{reviewSummary}</span>
              </span>

              <span className="cpv-program-card-actions">
                {row.kind === "created" ? (
                  <Button
                    className="cpv-program-card-action-primary"
                    intent="ghost"
                    size="sm"
                    trailingIcon={<ChevronRightIcon size={14} variant="stroke" />}
                    onClick={() => row.createdId && onSelectCreated(row.createdId)}
                  >
                    Open linked cohort
                  </Button>
                ) : (
                  <>
                    <Button
                      className="cpv-program-card-action-primary"
                      intent="ghost"
                      size="sm"
                      trailingIcon={<ChevronRightIcon size={14} variant="stroke" />}
                      onClick={() => onSelect(row.key)}
                    >
                      Open cohort
                    </Button>
                    <Button
                      intent="ghost"
                      size="sm"
                      aria-label={`Edit ${row.name} protocol`}
                      onClick={() => onEditProtocol(row.key)}
                    >
                      Edit
                    </Button>
                  </>
                )}
              </span>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function ProgramCreatedBanner({
  program,
  linkedProtocol,
  onDismiss,
  onViewCohort,
}: {
  program: CreatedProgram;
  linkedProtocol: ProtocolDefinition;
  onDismiss: () => void;
  onViewCohort: () => void;
}) {
  return (
    <div className="cpv-success" role="status">
      <span className="cpv-success-icon" aria-hidden>
        <CheckCircleIcon size={16} variant="stroke" />
      </span>
      <span className="cpv-success-copy">
        <strong>{program.name} created</strong>
        <span>Active now. Enrolment and chart handoff use the {linkedProtocol.name} cohort.</span>
      </span>
      <span className="cpv-success-actions">
        <Button
          intent="primary"
          size="sm"
          trailingIcon={<ChevronRightIcon size={14} variant="stroke" />}
          onClick={onViewCohort}
        >
          Open linked cohort
        </Button>
        <Button intent="ghost" size="sm" onClick={onDismiss}>
          Done
        </Button>
      </span>
    </div>
  );
}

function ProtocolPublishedBanner({
  protocol,
  published,
  onDismiss,
  onViewCohort,
}: {
  protocol: ProtocolDefinition;
  published: JustPublishedProtocol;
  onDismiss: () => void;
  onViewCohort: () => void;
}) {
  return (
    <div className="cpv-success" role="status">
      <span className="cpv-success-icon" aria-hidden>
        <CheckCircleIcon size={16} variant="stroke" />
      </span>
      <span className="cpv-success-copy">
        <strong>{protocol.name} published</strong>
        <span>
          {published.version} · {published.note}
        </span>
        <span>New enrolments use this version. Existing plans stay unchanged.</span>
      </span>
      <span className="cpv-success-actions">
        <Button
          intent="primary"
          size="sm"
          trailingIcon={<ChevronRightIcon size={14} variant="stroke" />}
          onClick={onViewCohort}
        >
          View cohort
        </Button>
        <Button intent="ghost" size="sm" onClick={onDismiss}>
          Done
        </Button>
      </span>
    </div>
  );
}

/* ------------------------------------------------------- Cohort table ------ */

type CohortRow = {
  patientId: string;
  patient: string;
  patientMeta: string;
  action: CohortActionSummary;
  review: CohortReviewSummary;
  needsAttention: boolean;
};

function CohortView({
  protocol,
  members,
  justEnrolled,
  onBack,
  onEnrol,
  onDismissEnrolled,
  onOpenChart,
}: {
  protocol: ProtocolDefinition;
  members: ProgramCohortMember[];
  justEnrolled: JustEnrolled | null;
  onBack: () => void;
  onEnrol: () => void;
  onDismissEnrolled: () => void;
  onOpenChart: (patientId: string) => void;
}) {
  const rows: CohortRow[] = members
    .map((m) => ({
      patientId: m.patientId,
      patient: programPatientName(m.patientId),
      patientMeta: patientMeta(m.patientId),
      action: cohortNextActionSummary(m),
      review: reviewSummary(m.nextReview),
      needsAttention: memberNeedsAttention(m),
    }))
    .sort((a, b) => {
      const byAttention = Number(b.needsAttention) - Number(a.needsAttention);
      if (byAttention !== 0) return byAttention;
      const byAction = a.action.sort - b.action.sort;
      if (byAction !== 0) return byAction;
      const byReview = a.review.sort - b.review.sort;
      if (byReview !== 0) return byReview;
      return a.patient.localeCompare(b.patient);
    });

  const columns: Column<CohortRow>[] = [
    {
      key: "patient",
      header: "Patient",
      width: "24%",
      render: (row) => (
        <span className="cpv-patient-cell">
          <strong>{row.patient}</strong>
          <span>{row.patientMeta}</span>
        </span>
      ),
    },
    {
      key: "nextAction",
      header: "Next step",
      width: "44%",
      render: (row) => (
        <span className={`cpv-gap-cell cpv-gap-cell--${row.action.tone}`}>
          <span className="cpv-gap-marker" aria-hidden />
          <span className="cpv-gap-copy">
            <ToneBadge tone={row.action.tone}>{row.action.status}</ToneBadge>
            <span className="cpv-gap-text">
              <strong>{row.action.label}</strong>
              <span>{row.action.detail}</span>
            </span>
          </span>
        </span>
      ),
    },
    {
      key: "nextReview",
      header: "Next review",
      width: "20%",
      render: (row) => (
        <span className={`cpv-review-cell cpv-review-cell--${row.review.tone}`}>
          <strong>{row.review.date}</strong>
          <span>
            <span className="cpv-review-status">{row.review.status}</span>
            <span aria-hidden="true"> · </span>
            <span>{row.review.detail}</span>
          </span>
        </span>
      ),
    },
    {
      key: "open",
      header: "",
      width: "12%",
      align: "right",
      render: (row) => (
        <Button
          intent="ghost"
          size="sm"
          aria-label={`Open ${row.patient}'s ${protocol.name} care plan`}
          trailingIcon={<ChevronRightIcon size={14} variant="stroke" />}
          onClick={() => onOpenChart(row.patientId)}
        >
          Open care plan
        </Button>
      ),
    },
  ];

  const attention = members.filter(memberNeedsAttention).length;
  const enrolledCopy = `${members.length} enrolled ${members.length === 1 ? "patient" : "patients"}`;
  const sectionLabel =
    attention > 0
      ? `${protocol.name} cohort. ${enrolledCopy}. ${attentionSummary(attention)}.`
      : `${protocol.name} cohort. ${enrolledCopy}.`;

  return (
    <section className="cpv-section cpv-section--cohort" aria-label={sectionLabel}>
      <div className="cpv-cohort-head">
        <div className="cpv-cohort-title-block">
          <div className="cpv-crumbs">
            <button type="button" className="cpv-link" onClick={onBack}>
              Programs
            </button>
            <ChevronRightIcon size={13} variant="stroke" aria-hidden />
            <span className="cpv-crumb-current">{protocol.name}</span>
          </div>
          <h2>{protocol.name} cohort</h2>
          <p>
            {enrolledCopy}. Review {cadenceSentence(protocol.reviewCadence)}.
          </p>
        </div>
        <div className="cpv-cohort-actions">
          {attention > 0 && <ToneBadge tone="warning">{attentionSummary(attention)}</ToneBadge>}
          <Button
            intent="primary"
            size="sm"
            leadingIcon={<PatientIcon size={14} variant="stroke" />}
            onClick={onEnrol}
          >
            Enrol patient
          </Button>
        </div>
      </div>

      {justEnrolled && (
        <div className="cpv-success" role="status">
          <span className="cpv-success-icon" aria-hidden>
            <CheckCircleIcon size={16} variant="stroke" />
          </span>
          <span className="cpv-success-copy">
            <strong>{programPatientName(justEnrolled.patientId)} enrolled</strong>
            <span>{protocol.name} was added to their care plan.</span>
          </span>
          <span className="cpv-success-actions">
            <Button
              intent="primary"
              size="sm"
              trailingIcon={<ChevronRightIcon size={14} variant="stroke" />}
              onClick={() => onOpenChart(justEnrolled.patientId)}
            >
              Open care plan
            </Button>
            <Button intent="ghost" size="sm" onClick={onDismissEnrolled}>
              Stay here
            </Button>
          </span>
        </div>
      )}

      <Table<CohortRow>
        columns={columns}
        data={rows}
        getRowId={(row) => row.patientId}
        empty="No patients are enrolled yet."
      />
    </section>
  );
}

/* ------------------------------------------------------- Program create ---- */

function NewProgramDrawer({
  open,
  protocols,
  onClose,
  onCreate,
}: {
  open: boolean;
  protocols: Record<ProtocolKey, ProtocolDefinition>;
  onClose: () => void;
  onCreate: (program: ProgramConfig) => void;
}) {
  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="New program"
      subtitle="Choose a protocol. Defaults are applied before creation."
      width={560}
    >
      {open && (
        <NewProgramForm
          key="new-program-form"
          protocols={protocols}
          onClose={onClose}
          onCreate={onCreate}
        />
      )}
    </Drawer>
  );
}

function NewProgramForm({
  protocols,
  onClose,
  onCreate,
}: {
  protocols: Record<ProtocolKey, ProtocolDefinition>;
  onClose: () => void;
  onCreate: (program: ProgramConfig) => void;
}) {
  const [linkedProtocol, setLinkedProtocol] = useState<ProtocolKey>(PROGRAM_ORDER[0]);
  const protocol = protocols[linkedProtocol];

  /* Name, cadence, and owner are pre-filled from the chosen protocol. We re-fill
     them when the protocol changes unless the doctor has edited that field. */
  const [name, setName] = useState(() => suggestProgramName(protocols[PROGRAM_ORDER[0]]));
  const [nameTouched, setNameTouched] = useState(false);
  const [cadence, setCadence] = useState(protocols[PROGRAM_ORDER[0]].reviewCadence);
  const [cadenceTouched, setCadenceTouched] = useState(false);
  const [owner, setOwner] = useState(() => protocolDefaultOwner(protocols[PROGRAM_ORDER[0]]));
  const [ownerTouched, setOwnerTouched] = useState(false);

  const chooseProtocol = (key: ProtocolKey) => {
    const next = protocols[key];
    setLinkedProtocol(key);
    if (!nameTouched) setName(suggestProgramName(next));
    if (!cadenceTouched) setCadence(next.reviewCadence);
    if (!ownerTouched) setOwner(protocolDefaultOwner(next));
  };

  /* Keep the current value selectable even if it predates the standard set. */
  const cadenceOptions = useMemo(
    () => (PROGRAM_CADENCE_OPTIONS.includes(cadence) ? PROGRAM_CADENCE_OPTIONS : [cadence, ...PROGRAM_CADENCE_OPTIONS]),
    [cadence],
  );
  const ownerOptions = useMemo(
    () =>
      (PROGRAM_OWNER_ROLES as readonly string[]).includes(owner)
        ? [...PROGRAM_OWNER_ROLES]
        : [owner, ...PROGRAM_OWNER_ROLES],
    [owner],
  );

  const canCreate = name.trim().length > 0 && cadence.trim().length > 0 && owner.trim().length > 0;

  const createProgram = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canCreate) return;
    onCreate({
      name: name.trim(),
      condition: protocol.name,
      targetPatients: protocol.eligibility,
      goals: protocolGoalsSummary(protocol),
      cadence: cadence.trim(),
      owner: owner.trim(),
      linkedProtocol,
    });
  };

  return (
    <form className="cpv-drawer-body" onSubmit={createProgram}>
      <section className="cpv-edit-block">
        <p className="cpv-mini-label">Protocol</p>
        <div className="cpv-protocol-choices" role="radiogroup" aria-label="Protocol">
          {PROGRAM_ORDER.map((key) => {
            const option = protocols[key];
            const Icon = PROTOCOL_ICON[key];
            const selected = key === linkedProtocol;
            return (
              <button
                type="button"
                key={key}
                role="radio"
                aria-checked={selected}
                className={`cpv-protocol-choice${selected ? " is-selected" : ""}`}
                onClick={() => chooseProtocol(key)}
              >
                <span aria-hidden className="cpv-program-mark">
                  <Icon size={18} variant="duotone" />
                </span>
                <span className="cpv-protocol-choice-copy">
                  <strong>{option.name}</strong>
                  <span>{option.eligibility}</span>
                </span>
                <span aria-hidden className="cpv-protocol-choice-tick">
                  {selected && <CheckCircleIcon size={16} variant="stroke" />}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="cpv-edit-block">
        <Input
          data-autofocus="true"
          label="Program name"
          required
          value={name}
          onChange={(event) => {
            setName(event.currentTarget.value);
            setNameTouched(true);
          }}
        />
      </section>

      <section className="cpv-edit-block cpv-form-grid">
        <Select
          label="Review cadence"
          required
          value={cadence}
          onChange={(event) => {
            setCadence(event.currentTarget.value);
            setCadenceTouched(true);
          }}
        >
          {cadenceOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </Select>
        <Select
          label="Owner"
          required
          value={owner}
          onChange={(event) => {
            setOwner(event.currentTarget.value);
            setOwnerTouched(true);
          }}
        >
          {ownerOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </Select>
      </section>

      <section className="cpv-edit-block">
        <div className="cpv-edit-block-head">
          <p className="cpv-mini-label">From the protocol</p>
          <Badge appearance="subtle" tone="neutral">Auto-filled</Badge>
        </div>
        <dl className="cpv-definition-list">
          <div>
            <dt>Condition</dt>
            <dd>{protocol.name}</dd>
          </div>
          <div>
            <dt>Who it is for</dt>
            <dd>{protocol.eligibility}</dd>
          </div>
          <div>
            <dt>Care goals</dt>
            <dd>{protocolGoalsSummary(protocol)}</dd>
          </div>
        </dl>
      </section>

      <div className="cpv-drawer-foot">
        <Button intent="secondary" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button intent="primary" size="sm" type="submit" disabled={!canCreate}>
          Create program
        </Button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------ Protocol editor ---- */

function ProtocolEditorDrawer({
  protocol,
  meta,
  onClose,
  onPublished,
}: {
  protocol: ProtocolDefinition | null;
  meta: ProtocolMeta | null;
  onClose: () => void;
  onPublished: (key: ProtocolKey, note: string, draft: ProtocolDraft) => void;
}) {
  return (
    <Drawer
      open={protocol != null}
      onClose={onClose}
      title={protocol ? `Edit ${protocol.name}` : "Edit protocol"}
      subtitle={meta ? `${meta.version} · ${STATUS_LABEL[meta.status]}` : undefined}
      width={520}
    >
      {protocol && meta && (
        <ProtocolEditorBody
          key={protocol.key}
          protocol={protocol}
          onClose={onClose}
          onPublished={onPublished}
        />
      )}
    </Drawer>
  );
}

function ProtocolEditorBody({
  protocol,
  onClose,
  onPublished,
}: {
  protocol: ProtocolDefinition;
  onClose: () => void;
  onPublished: (key: ProtocolKey, note: string, draft: ProtocolDraft) => void;
}) {
  /* The drawer edits the protocol fields this workspace can truthfully apply to
     future enrolments. Targets and actions stay read-only until they have their own
     structured editor. */
  const [eligibility, setEligibility] = useState(protocol.eligibility);
  const [reviewCadence, setReviewCadence] = useState(protocol.reviewCadence);
  const [versionNote, setVersionNote] = useState("");
  const [publishing, setPublishing] = useState(false);

  const canPublish = eligibility.trim().length > 0 && reviewCadence.trim().length > 0 && versionNote.trim().length > 0;
  const publishHelp = versionNote.trim().length === 0
    ? "Add a version note to publish."
    : !canPublish
      ? "Eligibility and review cadence are required."
      : "";
  const versionNoteHelpId = `${protocol.key}-version-note-help`;

  /* Cadence is a finite scale, not free text: a Select prevents drift and keeps
     values the cohort review parser understands. The protocol's current value is
     always offered, even if it predates the standard set. */
  const cadenceOptions = useMemo(() => {
    const base = ["Every month", "Every 3 months", "Every 6 months", "Every 12 months"];
    return base.includes(protocol.reviewCadence) ? base : [protocol.reviewCadence, ...base];
  }, [protocol.reviewCadence]);

  const publish = () => {
    if (!canPublish || publishing) return;
    setPublishing(true);
    const note = versionNote.trim();
    onPublished(protocol.key, note, {
      eligibility: eligibility.trim(),
      reviewCadence: reviewCadence.trim(),
    });
  };

  return (
    <div className="cpv-drawer-body">
      {/* Editable zone — the two fields this workspace can truthfully apply to
          future enrolments. Read-only reference sits below the divider. */}
      <section className="cpv-edit-block">
        <Textarea
          label="Eligibility"
          rows={2}
          value={eligibility}
          onChange={(e) => setEligibility(e.currentTarget.value)}
        />
      </section>

      <section className="cpv-edit-block">
        <Select
          label="Review cadence"
          value={reviewCadence}
          onChange={(e) => setReviewCadence(e.currentTarget.value)}
        >
          {cadenceOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </Select>
      </section>

      <div className="cpv-edit-divider" role="presentation" />

      {/* Read-only reference — the clinical content of this version. Marked so a
          clinician never wonders whether it is editable here or simply broken. */}
      <section className="cpv-edit-block">
        <div className="cpv-edit-block-head">
          <p className="cpv-mini-label">Clinical targets</p>
          <Badge appearance="subtle" tone="neutral">Read only</Badge>
        </div>
        <ul className="cpv-edit-list">
          {protocol.targets.map((t) => (
            <li key={t.key} className="cpv-edit-row">
              <span className="cpv-edit-row-main">
                <strong>{t.label}</strong>
                {t.target && <span className="cpv-muted">{t.target}</span>}
              </span>
              {t.priority && <Badge appearance="subtle" tone="info">Priority</Badge>}
            </li>
          ))}
        </ul>
      </section>

      <section className="cpv-edit-block">
        <div className="cpv-edit-block-head">
          <p className="cpv-mini-label">Actions</p>
          <Badge appearance="subtle" tone="neutral">Read only</Badge>
        </div>
        <ul className="cpv-edit-list">
          {protocol.steps.map((s) => (
            <li key={s.key} className="cpv-edit-row">
              <span className="cpv-edit-row-main">
                <strong>{s.label}</strong>
                {s.detail && <span className="cpv-muted">{s.detail}</span>}
              </span>
              <span className="cpv-muted cpv-num">{s.cadence ?? "As needed"}</span>
            </li>
          ))}
        </ul>
        <p className="cpv-muted">Targets and actions are managed in the protocol library.</p>
      </section>

      <div className="cpv-edit-divider" role="presentation" />

      <section className="cpv-edit-block">
        <Input
          label="Version note"
          aria-describedby={publishHelp ? versionNoteHelpId : undefined}
          required
          placeholder="What changed?"
          value={versionNote}
          onChange={(e) => setVersionNote(e.currentTarget.value)}
        />
        {publishHelp && (
          <p className="cpv-muted" id={versionNoteHelpId}>
            {publishHelp}
          </p>
        )}
      </section>

      {/* Consequence shown at the decision point, not only after publishing. */}
      <p className="cpv-publish-note">
        New enrolments use this version. Existing patient plans stay unchanged.
      </p>

      <div className="cpv-drawer-foot">
        <Button intent="secondary" size="sm" onClick={onClose} disabled={publishing}>
          Cancel
        </Button>
        <Button
          intent="primary"
          size="sm"
          disabled={!canPublish}
          loading={publishing}
          onClick={publish}
          title={publishHelp || undefined}
        >
          {publishing ? "Publishing" : "Publish version"}
        </Button>
      </div>
    </div>
  );
}

export default CarePlansView;
