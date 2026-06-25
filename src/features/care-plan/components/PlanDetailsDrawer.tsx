"use client";

/* PlanDetailsDrawer — the reference + audit layer, off the default view.

   Holds everything the element audit pulls OUT of the focus view: owner/responsible
   clinician, plan version, source, program/protocol, care team — and the plan
   history (the auto-captured "what changed" deltas + past reviews). The default
   column links here via "Last updated <date> · View plan history" instead of
   carrying a Recent activity / Reviews section. Reference + audit only — no actions.

   Presentational: plan + focus passed in. */

import { Drawer } from "@/components/ui";
import {
  PLAN_DELTA_LABEL,
  PLAN_DELTA_TONE,
  PLAN_STATUS_LABEL,
  PROTOCOLS,
  type CarePlan,
  type ClinicalFocus,
  type ProtocolKey,
} from "@/features/care-plan/domain";

function KV({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="cp-kv">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

/* Same row as KV, but the value is a quiet link — used for the program provenance
   line so the doctor can jump from this focus to the program that started it. */
function KVLink({ label, value, onClick }: { label: string; value: string; onClick: () => void }) {
  return (
    <div className="cp-kv">
      <dt>{label}</dt>
      <dd>
        <button type="button" className="cp-kv-link" onClick={onClick}>
          {value}
        </button>
      </dd>
    </div>
  );
}

export function PlanDetailsDrawer({
  open,
  onClose,
  plan,
  focus,
  onViewProgram,
}: {
  open: boolean;
  onClose: () => void;
  plan: CarePlan;
  focus: ClinicalFocus | null;
  /* Jump to this focus's program in Care programs. */
  onViewProgram?: (protocolKey: ProtocolKey) => void;
}) {
  /* Deltas + reviews scoped to the focus when one is selected, else whole plan. */
  const deltas = (focus ? (plan.deltas ?? []).filter((d) => d.focusId === focus.id) : plan.deltas ?? []);
  const reviews = focus ? plan.reviews.filter((r) => r.focusId === focus.id) : plan.reviews;
  const protocolName = focus?.protocolName;
  /* Only a key that resolves to a real program is linkable. */
  const protocolKey =
    focus?.protocolKey && focus.protocolKey in PROTOCOLS ? (focus.protocolKey as ProtocolKey) : null;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Plan details"
      subtitle={focus ? (focus.shortLabel ?? focus.label) : plan.title}
      width={440}
    >
      <div className="cp-drawer-section">
        <p className="cp-drawer-label">About</p>
        <dl className="cp-kv-list">
          <KV label="Status" value={PLAN_STATUS_LABEL[plan.status]} />
          <KV label="Version" value={`v${plan.version}`} />
          <KV label="Responsible" value={plan.team.responsible} />
          {focus?.coded && <KV label="Coded" value={focus.coded} />}
          {protocolName &&
            (protocolKey && onViewProgram ? (
              <KVLink label="Program" value={protocolName} onClick={() => onViewProgram(protocolKey)} />
            ) : (
              <KV label="Program" value={protocolName} />
            ))}
          <KV label="Source" value={plan.source} />
          {plan.startDate && <KV label="Started" value={plan.startDate} />}
        </dl>
      </div>

      <div className="cp-drawer-section">
        <p className="cp-drawer-label">Care team</p>
        <dl className="cp-kv-list">
          <KV label="Author" value={plan.team.author} />
          <KV label="Reviewer" value={plan.team.reviewer} />
          <KV label="Nurse" value={plan.team.nurse} />
          <KV label="Coordinator" value={plan.team.coordinator} />
          <KV label="Patient" value={plan.team.patient} />
          <KV label="External" value={plan.team.external} />
        </dl>
      </div>

      {deltas.length > 0 && (
        <div className="cp-drawer-section">
          <p className="cp-drawer-label">What changed</p>
          <ol className="cp-timeline">
            {deltas.map((d) => (
              <li key={d.id} className={`tone-${PLAN_DELTA_TONE[d.action]}`}>
                <span className="cp-timeline-dot" aria-hidden />
                <span className="cp-timeline-body">
                  <strong>{d.summary}</strong>
                  <span className="cp-timeline-meta">
                    {PLAN_DELTA_LABEL[d.action]} · {d.actor} · {d.at}
                    {d.ref ? ` · ${d.ref}` : ""}
                  </span>
                  {d.detail && <span className="cp-muted">{d.detail}</span>}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {reviews.length > 0 && (
        <div className="cp-drawer-section">
          <p className="cp-drawer-label">Past reviews</p>
          <ol className="cp-timeline">
            {reviews.map((r) => (
              <li key={r.id}>
                <span className="cp-timeline-dot" aria-hidden />
                <span className="cp-timeline-body">
                  <strong>
                    {r.reviewer} · v{r.version}
                  </strong>
                  <span className="cp-timeline-meta">{r.date}</span>
                  <span className="cp-muted">{r.assessment}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </Drawer>
  );
}
