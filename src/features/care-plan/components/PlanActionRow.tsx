"use client";

/* PlanActionRow — one row in "Current plan": either an intervention or a
   medication the focus references.

   Element audit applied:
   - The kind icon conveys the type, so no INTERVENTION_KIND label.
   - Owner shows ONLY when it isn't the responsible clinician (patient / nurse /
     lab / external) — never "Dr Dara" on the doctor's own screen.
   - At most ONE status pill, and only for a state that needs a decision: blocked,
     overdue, waiting-on-patient (declined/awaiting), or a med needing verification.
     Active-in-an-active-focus, planned and completed carry no pill.
   - Due date stays on the row; frequency/cadence is a Details concern.
   - At most ONE primary CTA (passed by the parent as `action`).
   Presentational only — all data via props, the CTA via a callback. */

import { Button } from "@/components/ui";
import {
  cadenceAnchorPhrase,
  type Intervention,
  type Medication,
} from "@/features/care-plan/domain";
import {
  Clock as ClockIcon,
  Flask as FlaskIcon,
  Heart as HeartIcon,
  Note as NoteIcon,
  Patient as PatientIcon,
  Pill as PillIcon,
  Share as ShareIcon,
  Warning as WarningIcon,
} from "@/icons/components";
import type { IconProps } from "@/icons/components";
import { cx } from "@/lib/cx";

import type { InterventionKind, Tone } from "@/features/care-plan/domain";

type RowAction = { label: string; onClick: () => void };
type IconComponent = (props: IconProps) => React.ReactElement;

/* ------------------------------ intervention ------------------------------- */

/* The kind icon conveys the type, so the row carries no INTERVENTION_KIND label.
   A static map (not a render-time factory) keeps the component identity stable. */
const KIND_ICON: Record<InterventionKind, IconComponent> = {
  lab: FlaskIcon,
  imaging: FlaskIcon,
  follow_up: ClockIcon,
  consultation: ClockIcon,
  referral: ShareIcon,
  lifestyle: HeartIcon,
  education: HeartIcon,
  home_measurement: PatientIcon,
  monitoring: PatientIcon,
  medication_review: PillIcon,
  procedure: NoteIcon,
  insurance: NoteIcon,
};

/* The only intervention states that earn a pill (need a decision / are waiting). */
function interventionPill(intv: Intervention): { label: string; tone: Tone } | null {
  switch (intv.status) {
    case "blocked":
      return { label: "Blocked", tone: "danger" };
    case "overdue":
      return { label: "Overdue", tone: "warning" };
    case "declined":
      return { label: "Declined", tone: "neutral" };
    default:
      return null;
  }
}

/* Owner shown only when the work sits with someone other than the responsible
   clinician — the patient, a nurse, the lab, an external party. */
function foreignOwner(owner: string, responsible: string): string | null {
  const o = owner.trim().toLowerCase();
  if (o === responsible.trim().toLowerCase()) return null;
  if (o === "dr dara") return null;
  return owner;
}

export function PlanInterventionRow({
  intv,
  responsible,
  action,
}: {
  intv: Intervention;
  responsible: string;
  action?: RowAction;
}) {
  const Icon = KIND_ICON[intv.kind];
  const pill = interventionPill(intv);
  const owner = foreignOwner(intv.owner, responsible);
  const meta = [owner, intv.due ? `due ${cadenceAnchorPhrase(intv.due)}` : null].filter(Boolean).join(" · ");
  const flag =
    intv.status === "blocked" && intv.blockReason
      ? intv.blockReason
      : intv.status === "declined" && intv.declineReason
        ? intv.declineReason
        : null;

  return (
    <div className="cp-row">
      <span className={cx("cp-row-ic", pill && `tone-${pill.tone}`)} aria-hidden>
        <Icon size={17} variant="stroke" />
      </span>
      <span className="cp-row-body">
        <span className="cp-row-title">{intv.label}</span>
        {meta && <span className="cp-row-meta">{meta}</span>}
        {flag && (
          <span className={cx("cp-row-flag", `tone-${pill?.tone ?? "neutral"}`)}>
            {intv.status === "blocked" && <WarningIcon size={13} variant="stroke" />}
            {flag}
          </span>
        )}
      </span>
      {(pill || action) && (
        <span className="cp-row-side">
          {pill && <span className={cx("cp-pill", `tone-${pill.tone}`)}>{pill.label}</span>}
          {action && (
            <Button intent="secondary" size="sm" onClick={action.onClick}>
              {action.label}
            </Button>
          )}
        </span>
      )}
    </div>
  );
}

/* -------------------------------- medication ------------------------------- */

/* ONE badge max. Kura-prescribed + confirmed → no badge. External confirmed →
   "External". Patient-reported unverified → "Needs verification". Disputed →
   "Disputed". No-longer-taking → "Stopped". */
function medBadge(med: Medication): { label: string; tone: Tone } | null {
  if (med.verification === "disputed") return { label: "Disputed", tone: "danger" };
  if (med.verification === "no_longer_taking") return { label: "Stopped", tone: "neutral" };
  if (med.verification === "unverified") return { label: "Needs verification", tone: "warning" };
  /* confirmed below */
  if (med.source === "external_clinician") return { label: "External", tone: "neutral" };
  if (med.source === "imported") return { label: "External", tone: "neutral" };
  if (med.source === "patient_reported") return null; /* confirmed patient-reported reads as plan-native */
  return null; /* kura_prescribed + confirmed → clean */
}

export function PlanMedRow({
  med,
  action,
}: {
  med: Medication;
  action?: RowAction;
}) {
  const badge = medBadge(med);
  const dose = [med.dose, med.frequency].filter(Boolean).join(" · ");
  return (
    <div className="cp-row">
      <span className={cx("cp-row-ic", badge && `tone-${badge.tone}`)} aria-hidden>
        <PillIcon size={17} variant="stroke" />
      </span>
      <span className="cp-row-body">
        <span className="cp-row-title">
          {med.drug}
          {dose && <span className="cp-row-value">{dose}</span>}
        </span>
      </span>
      {(badge || action) && (
        <span className="cp-row-side">
          {badge && <span className={cx("cp-pill", `tone-${badge.tone}`)}>{badge.label}</span>}
          {action && (
            <Button intent="secondary" size="sm" onClick={action.onClick}>
              {action.label}
            </Button>
          )}
        </span>
      )}
    </div>
  );
}
