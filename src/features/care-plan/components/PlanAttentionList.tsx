"use client";

/* PlanAttentionList — the "Next action" surface. The single most important block,
   shown only when a real open loop exists.

   For each open-loop intervention (overdue → blocked → due → in_progress): what to
   do + why now + due/urgency + ONE primary CTA (secondary actions go in overflow).
   A coverage-blocked item routes to a SEPARATE coverage path (onResolveCoverage),
   never the order handler. When nothing is open we render a quiet "Up to date ·
   next review <date>" line — no success card, no celebration icon, no badges.

   Presentational: interventions + callbacks come from the tab. */

import {
  cadenceAnchorPhrase,
  INTERVENTION_STATUS_TONE,
  OPEN_LOOP_STATUSES,
  type Intervention,
  type InterventionKind,
} from "@/features/care-plan/domain";
import { Button } from "@/components/ui";
import {
  CheckCircle as CheckCircleIcon,
  Clock as ClockIcon,
  Flask as FlaskIcon,
  Note as NoteIcon,
  Share as ShareIcon,
  Warning as WarningIcon,
} from "@/icons/components";
import type { IconProps } from "@/icons/components";
import { cx } from "@/lib/cx";

type IconComponent = (props: IconProps) => React.ReactElement;

const PRIORITY: Record<Intervention["status"], number> = {
  overdue: 0,
  blocked: 1,
  due: 2,
  in_progress: 3,
  planned: 9,
  completed: 9,
  declined: 9,
};

/* Leading status word — the pill carries priority by colour AND text, so the row
   scans at a glance; the "why" line then drops the redundant status word. */
const STATUS_LABEL: Partial<Record<Intervention["status"], string>> = {
  overdue: "Overdue",
  blocked: "Blocked",
  due: "Due now",
  in_progress: "In progress",
};

/* Static kind→icon map (not a render-time factory) keeps component identity
   stable; a blocked item overrides to the warning glyph at the call site. */
const KIND_ICON: Record<InterventionKind, IconComponent> = {
  lab: FlaskIcon,
  imaging: FlaskIcon,
  follow_up: ClockIcon,
  consultation: ClockIcon,
  referral: ShareIcon,
  lifestyle: NoteIcon,
  education: NoteIcon,
  home_measurement: NoteIcon,
  monitoring: NoteIcon,
  medication_review: NoteIcon,
  procedure: NoteIcon,
  insurance: NoteIcon,
};

/* Why this is surfaced now, in plain words. */
function whyNow(intv: Intervention): string {
  switch (intv.status) {
    case "overdue":
      return intv.due ? `Was due ${cadenceAnchorPhrase(intv.due)}` : "";
    case "blocked":
      return intv.blockReason ?? "Resolve before it can proceed";
    case "due":
      return intv.due ? `Due ${cadenceAnchorPhrase(intv.due)}` : "";
    case "in_progress":
      return intv.execution?.ref ? intv.execution.ref : "";
    default:
      return "";
  }
}

export type AttentionCallbacks = {
  /* Order the lab/imaging behind this intervention (seeds the order draft). */
  onCreateOrder: (intv: Intervention) => void;
  /* Resolve a coverage block — a DISTINCT path from ordering. */
  onResolveCoverage: (intv: Intervention) => void;
};

/* Pick the one primary CTA for an open-loop item. Coverage uses its own path. */
function primaryCta(
  intv: Intervention,
  cb: AttentionCallbacks,
): { label: string; onClick: () => void } | null {
  if (intv.status === "blocked") {
    return { label: "Resolve coverage", onClick: () => cb.onResolveCoverage(intv) };
  }
  if ((intv.kind === "lab" || intv.kind === "imaging") && intv.order && !intv.execution) {
    return { label: "Create order", onClick: () => cb.onCreateOrder(intv) };
  }
  return null;
}

export function PlanAttentionList({
  interventions,
  callbacks,
  upToDateReview,
}: {
  interventions: Intervention[];
  callbacks: AttentionCallbacks;
  /* next-review label for the quiet up-to-date line, if any */
  upToDateReview?: string;
}) {
  const open = interventions
    .filter((i) => OPEN_LOOP_STATUSES.includes(i.status))
    .slice()
    .sort((a, b) => PRIORITY[a.status] - PRIORITY[b.status]);

  if (open.length === 0) {
    return (
      <p className="cp-uptodate">
        <CheckCircleIcon size={17} variant="stroke" aria-hidden />
        Up to date
        {upToDateReview && <em>· next review {upToDateReview}</em>}
      </p>
    );
  }

  return (
    <div className="cp-next">
      {open.map((intv, index) => {
        const Icon = intv.status === "blocked" ? WarningIcon : KIND_ICON[intv.kind];
        const tone = INTERVENTION_STATUS_TONE[intv.status];
        const attention = intv.status === "overdue" || intv.status === "blocked";
        const cta = primaryCta(intv, callbacks);
        const why = whyNow(intv);
        const primary = index === 0;
        return (
          <div
            key={intv.id}
            className={cx("cp-next-item", attention && "cp-next-item--attention", `tone-${tone}`)}
          >
            <span className="cp-next-ic" aria-hidden>
              <Icon size={16} variant="stroke" />
            </span>
            <span className="cp-next-body">
              <span className="cp-next-top">
                <span className="cp-next-title">{intv.label}</span>
                <span className={cx("cp-next-status", `tone-${tone}`)}>
                  {STATUS_LABEL[intv.status] ?? "Open"}
                </span>
              </span>
              {why && <span className="cp-next-why">{why}</span>}
            </span>
            {cta && (
              <span className="cp-next-actions">
                <Button intent={primary ? "primary" : "secondary"} size="sm" onClick={cta.onClick}>
                  {cta.label}
                </Button>
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
