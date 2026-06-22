"use client";

import { useMemo, useState } from "react";
import {
  ACHIEVEMENT_LABEL,
  ACHIEVEMENT_TONE,
  activeFocuses,
  episodesOf,
  focusActionStatus,
  focusIsAtRisk,
  goalsForFocus,
  interventionsForFocus,
  INTERVENTION_KIND_LABEL,
  INTERVENTION_STATUS_LABEL,
  INTERVENTION_STATUS_TONE,
  livingPlanOf,
  MED_SOURCE_LABEL,
  MED_SOURCE_TONE,
  MED_VERIFICATION_LABEL,
  MED_VERIFICATION_TONE,
  OPEN_LOOP_STATUSES,
  overdueCount,
  PLAN_DELTA_LABEL,
  PLAN_DELTA_TONE,
  PLAN_STATUS_LABEL,
  PLAN_STATUS_TONE,
  planOpenLoopCount,
  useCarePlans,
  useMedications,
  type CarePlan,
  type CarePlanActions,
  type ClinicalFocus,
  type Goal,
  type Intervention,
  type InterventionStatus,
  type Medication,
  type MedVerification,
  type MonitoringRule,
  type PatientInstruction,
  type PlanDelta,
} from "./carePlanModel";
import {
  ChevronRight as ChevronRightIcon,
  Clock as ClockIcon,
  Catalog as CatalogIcon,
  Flask as FlaskIcon,
  Heart as HeartIcon,
  Note as NoteIcon,
  Plus as PlusIcon,
  Warning as WarningIcon,
} from "@/icons/components";
import { cx } from "@/lib/cx";
import "./CarePlan.css";

export type CarePlanOrderRequest = {
  planId: string;
  planVersion: number;
  focusId?: string;
  goalId?: string;
  interventionId: string;
  interventionLabel: string;
  labKeys: string[];
  rationale: string;
};

export type CarePlanTabProps = {
  patientId: string;
  /* Opens the real order flow seeded with the tests + clinical rationale and
     returns a backlink ref. Never auto-bills — the doctor confirms in the flow. */
  onCreateOrder: (req: CarePlanOrderRequest) => string | void;
};

/* The Care Plan tab navigates ONE Living Care Plan by Care Focus — not a list of
   competing plans. The left rail is Overview + each active focus + archived
   episodes; the detail is scoped to the selected focus. Selection key is
   "overview" | "<focusId>" | "ep:<episodePlanId>". */
type SelectionKey = string;

export function CarePlanTab({ patientId, onCreateOrder }: CarePlanTabProps) {
  const { plans, actions } = useCarePlans(patientId);

  const living = useMemo(() => livingPlanOf(plans), [plans]);
  const episodes = useMemo(() => episodesOf(plans), [plans]);
  const focuses = useMemo(() => (living ? activeFocuses(living) : []), [living]);

  const defaultKey: SelectionKey = living ? "overview" : episodes[0] ? `ep:${episodes[0].id}` : "overview";
  const [selectedKey, setSelectedKey] = useState<SelectionKey>(defaultKey);

  if (!living && episodes.length === 0) {
    return (
      <div className="cp">
        <div className="cp-empty cp-empty--page">
          <span className="cp-empty-ic" aria-hidden>
            <HeartIcon size={22} variant="stroke" />
          </span>
          <strong>No care plan yet for this patient</strong>
          <span>The living care plan builds itself from your work — order a test, sign an Rx or schedule a follow-up and it appears here.</span>
          <button className="cp-btn cp-btn--primary" type="button" disabled>
            <PlusIcon size={14} variant="stroke" /> Start living care plan
          </button>
        </div>
      </div>
    );
  }

  /* Resolve what the detail pane should render from the selection key. */
  const episodeSel = selectedKey.startsWith("ep:") ? episodes.find((e) => `ep:${e.id}` === selectedKey) ?? null : null;
  const focusSel = !episodeSel && selectedKey !== "overview" ? selectedKey : null;
  const detailPlan = episodeSel ?? living;
  const detailFocusId = episodeSel ? null : focusSel;

  return (
    <div className="cp">
      {living && <CarePlanSummary plan={living} focuses={focuses} />}
      <div className="cp-split">
        <nav className="cp-focus-nav" aria-label="Care focus">
          {living && (
            <div className="cp-focus-nav-group">
              <button
                aria-current={selectedKey === "overview" ? "true" : undefined}
                className={cx("cp-focus-nav-row cp-focus-nav-row--overview", selectedKey === "overview" && "is-active")}
                onClick={() => setSelectedKey("overview")}
                type="button"
              >
                <span className="cp-focus-nav-ic" aria-hidden>
                  <CatalogIcon size={15} variant="stroke" />
                </span>
                <span className="cp-focus-nav-main">
                  <span className="cp-focus-nav-title">Overview</span>
                  <span className="cp-focus-nav-sub">
                    {focuses.length} {focuses.length === 1 ? "focus" : "focuses"} · whole plan
                  </span>
                </span>
              </button>
            </div>
          )}

          {living && focuses.length > 0 && (
            <div className="cp-focus-nav-group">
              <p className="cp-focus-nav-label">Care focus</p>
              {focuses.map((focus) => (
                <CareFocusNavRow
                  key={focus.id}
                  plan={living}
                  focus={focus}
                  active={selectedKey === focus.id}
                  onSelect={() => setSelectedKey(focus.id)}
                />
              ))}
            </div>
          )}

          {episodes.length > 0 && (
            <div className="cp-focus-nav-group">
              <p className="cp-focus-nav-label">Archived</p>
              {episodes.map((ep) => (
                <button
                  key={ep.id}
                  aria-current={selectedKey === `ep:${ep.id}` ? "true" : undefined}
                  className={cx("cp-focus-nav-row cp-focus-nav-row--episode", selectedKey === `ep:${ep.id}` && "is-active")}
                  onClick={() => setSelectedKey(`ep:${ep.id}`)}
                  type="button"
                >
                  <span className="cp-focus-nav-main">
                    <span className="cp-focus-nav-title">{ep.focuses[0]?.shortLabel ?? ep.title}</span>
                    <span className="cp-focus-nav-sub">{PLAN_STATUS_LABEL[ep.status]}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </nav>

        {detailPlan ? (
          <CarePlanDetail
            key={selectedKey}
            plan={detailPlan}
            focusId={detailFocusId}
            actions={actions}
            onCreateOrder={onCreateOrder}
          />
        ) : (
          <div className="cp-detail-empty">Select a focus to view its goals, actions and reviews.</div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------- summary ----------------------------------- */

function CarePlanSummary({ plan, focuses }: { plan: CarePlan; focuses: ClinicalFocus[] }) {
  const openLoop = planOpenLoopCount(plan);
  const overdue = overdueCount(plan);
  const atRisk = plan.goals.filter((g) => g.lifecycle === "active" && (g.achievement === "at_risk" || g.achievement === "worsening")).length;
  const plural = (n: number, one: string, many = `${one}s`) => (n === 1 ? one : many);

  return (
    <div className="cp-summary" role="group" aria-label="Living care plan summary">
      <span className="cp-summary-stat">
        <strong>{focuses.length}</strong> {plural(focuses.length, "focus", "focuses")}
      </span>
      <span className="cp-summary-stat">
        {openLoop > 0 ? (
          <>
            <strong>{openLoop}</strong> to close
          </>
        ) : (
          <>Up to date</>
        )}
      </span>
      <span className="cp-summary-spacer" aria-hidden />
      {overdue > 0 && (
        <span className="cp-summary-flag tone-warning">
          {overdue} overdue
        </span>
      )}
      {atRisk > 0 && <span className="cp-summary-flag tone-danger">{atRisk} at risk</span>}
    </div>
  );
}

/* ------------------------------ focus nav row ------------------------------ */

function CareFocusNavRow({
  plan,
  focus,
  active,
  onSelect,
}: {
  plan: CarePlan;
  focus: ClinicalFocus;
  active: boolean;
  onSelect: () => void;
}) {
  const status = focusActionStatus(plan, focus.id);
  const risk = focusIsAtRisk(plan, focus.id);
  return (
    <button
      aria-current={active ? "true" : undefined}
      className={cx("cp-focus-nav-row", active && "is-active")}
      onClick={onSelect}
      type="button"
    >
      <span className={cx("cp-focus-dot", `tone-${status.tone}`)} aria-hidden />
      <span className="cp-focus-nav-main">
        <span className="cp-focus-nav-title">
          {focus.shortLabel ?? focus.label}
          {focus.protocolName && <span className="cp-tag">Program</span>}
        </span>
        <span className="cp-focus-nav-sub">{status.label}</span>
      </span>
      {(risk || status.overdue > 0) && (
        <span className="cp-focus-nav-flags">
          {status.overdue > 0 && <span className="cp-flag tone-warning">{status.overdue} overdue</span>}
          {risk && <span className="cp-flag tone-danger">At risk</span>}
        </span>
      )}
    </button>
  );
}

/* ------------------------------- detail ------------------------------------ */

type ComposerKind = "review";
const COMPOSER: Record<ComposerKind, { title: string; placeholder: string; cta: string }> = {
  review: { title: "Record review", placeholder: "Assessment — what changed, why, and the decision…", cta: "Save review" },
};

function CarePlanDetail({
  plan,
  focusId,
  actions,
  onCreateOrder,
}: {
  plan: CarePlan;
  focusId: string | null;
  actions: CarePlanActions;
  onCreateOrder: CarePlanTabProps["onCreateOrder"];
}) {
  const [composer, setComposer] = useState<ComposerKind | null>(null);
  const [text, setText] = useState("");

  const open = (kind: ComposerKind) => {
    setComposer(kind);
    setText("");
  };
  const submit = () => {
    if (!composer) return;
    const value = text.trim();
    if (composer === "review") actions.recordReview(plan.id, value || "Reviewed — no change.");
    setComposer(null);
    setText("");
  };

  const readOnly = plan.status !== "active";
  const focus = focusId ? plan.focuses.find((f) => f.id === focusId) ?? null : null;

  /* Scope every section to the selected focus; overview / episode shows all. */
  const goals = focusId ? goalsForFocus(plan, focusId) : plan.goals;
  const interventions = focusId ? interventionsForFocus(plan, focusId) : plan.interventions;
  const monitoring = focusId ? plan.monitoring.filter((m) => m.focusId === focusId) : plan.monitoring;
  const reviews = focusId ? plan.reviews.filter((r) => r.focusId === focusId) : plan.reviews;
  const deltas = focusId ? (plan.deltas ?? []).filter((d) => d.focusId === focusId) : plan.deltas ?? [];

  const { meds, setVerification } = useMedications(plan.patientId);
  const treatmentMeds = focusId ? meds.filter((m) => m.focusId === focusId) : meds;
  const instructions = focusId ? (plan.instructions ?? []).filter((i) => i.focusId === focusId) : plan.instructions ?? [];

  const nowItems = interventions.filter((i) => OPEN_LOOP_STATUSES.includes(i.status));
  const laterItems = interventions.filter((i) => !OPEN_LOOP_STATUSES.includes(i.status));
  const status = focusId ? focusActionStatus(plan, focusId) : null;
  /* Fold monitoring into Goals — drop measures already shown as a goal's value. */
  const goalTrendKeys = new Set(goals.map((g) => g.trendKey).filter(Boolean));
  const extraMeasures = monitoring.filter((m) => !m.trendKey || !goalTrendKeys.has(m.trendKey));
  const nextReview = (focus?.nextReview ?? plan.nextReview) && plan.status === "active" ? (focus?.nextReview ?? plan.nextReview) : null;
  const metaLine = [
    plan.team.responsible,
    nextReview ? `review ${nextReview}` : null,
    readOnly ? (plan.completionOutcome ?? PLAN_STATUS_LABEL[plan.status]) : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="cp-detail">
      <header className="cp-detail-head">
        <div className="cp-detail-title">
          <h3>{focus ? (focus.shortLabel ?? focus.label) : plan.title}</h3>
          {status && status.openLoop > 0 && (
            <span className={cx("cp-pill", `tone-${status.tone}`)}>{status.label}</span>
          )}
          {!focus && plan.kind === "episode" && (
            <span className={cx("cp-pill", `tone-${PLAN_STATUS_TONE[plan.status]}`)}>{PLAN_STATUS_LABEL[plan.status]}</span>
          )}
        </div>
        <div className="cp-detail-head-side">
          {metaLine && <span className="cp-detail-meta">{metaLine}</span>}
          {plan.status === "active" && (
            <button className="cp-btn cp-btn--sm cp-btn--quiet" onClick={() => open("review")} type="button">
              Record review
            </button>
          )}
        </div>
      </header>

      {composer && (
        <div className="cp-composer">
          <textarea
            autoFocus
            className="cp-composer-input"
            onChange={(e) => setText(e.target.value)}
            placeholder={COMPOSER[composer].placeholder}
            rows={3}
            value={text}
          />
          <div className="cp-composer-actions">
            <button className="cp-btn cp-btn--sm" onClick={() => setComposer(null)} type="button">
              Cancel
            </button>
            <button className="cp-btn cp-btn--sm cp-btn--primary" onClick={submit} type="button">
              {COMPOSER[composer].cta}
            </button>
          </div>
        </div>
      )}

      {nowItems.length > 0 && (
        <CarePlanSection title="Now" count={nowItems.length}>
          <InterventionGroups
            plan={plan}
            interventions={nowItems}
            readOnly={readOnly}
            onCreateOrder={onCreateOrder}
            actions={actions}
          />
        </CarePlanSection>
      )}

      {(goals.length > 0 || extraMeasures.length > 0) && (
        <CarePlanSection title="Goals">
          <div className="cp-goals">
            {goals.map((g) => (
              <GoalRow key={g.id} goal={g} />
            ))}
            {extraMeasures.map((m) => (
              <MeasureRow key={m.id} measure={m} />
            ))}
          </div>
        </CarePlanSection>
      )}

      {treatmentMeds.length > 0 && (
        <CarePlanSection title="Medications">
          <div className="cp-meds">
            {treatmentMeds.map((m) => (
              <MedRow key={m.id} med={m} readOnly={readOnly} onVerify={setVerification} />
            ))}
          </div>
        </CarePlanSection>
      )}

      {instructions.length > 0 && (
        <CarePlanSection title="Patient instructions" count={instructions.length} collapsible>
          <ul className="cp-instructions">
            {instructions.map((pi) => (
              <InstructionRow key={pi.id} instruction={pi} />
            ))}
          </ul>
        </CarePlanSection>
      )}

      {deltas.length > 0 && (
        <CarePlanSection title="Recent activity" count={deltas.length} collapsible>
          <DeltaTimeline deltas={deltas} />
        </CarePlanSection>
      )}

      {reviews.length > 0 && (
        <CarePlanSection title="Reviews" count={reviews.length} collapsible>
          <ol className="cp-reviews">
            {reviews.map((r) => (
              <li className="cp-review" key={r.id}>
                <span className="cp-review-dot" aria-hidden />
                <div className="cp-review-body">
                  <div className="cp-review-head">
                    <strong>{r.reviewer}</strong>
                    <span className="cp-muted">{r.date}</span>
                    <span className="cp-tag">v{r.version}</span>
                  </div>
                  <p>{r.assessment}</p>
                </div>
              </li>
            ))}
          </ol>
        </CarePlanSection>
      )}

      {laterItems.length > 0 && (
        <CarePlanSection title="Planned" count={laterItems.length} collapsible>
          <InterventionGroups
            plan={plan}
            interventions={laterItems}
            readOnly={readOnly}
            onCreateOrder={onCreateOrder}
            actions={actions}
          />
        </CarePlanSection>
      )}
    </div>
  );
}

/* One-line goal: label + "latest → target" + achievement pill. No stat boxes. */
function GoalRow({ goal }: { goal: Goal }) {
  const value =
    goal.latest && goal.target
      ? `${goal.latest} → ${goal.target}`
      : (goal.latest ?? goal.target ?? null);
  return (
    <div className="cp-goal">
      <span className="cp-goal-main">
        <span className="cp-goal-label">{goal.label}</span>
        {value && <span className="cp-goal-value">{value}</span>}
      </span>
      <span className={cx("cp-pill", `tone-${ACHIEVEMENT_TONE[goal.achievement]}`)}>
        {ACHIEVEMENT_LABEL[goal.achievement]}
      </span>
    </div>
  );
}

/* A monitored measure that isn't already shown as a goal value. */
function MeasureRow({ measure }: { measure: MonitoringRule }) {
  const value = [measure.latest, measure.target ? `target ${measure.target}` : null].filter(Boolean).join(" · ");
  return (
    <div className="cp-goal cp-goal--measure">
      <span className="cp-goal-main">
        <span className="cp-goal-label">{measure.label}</span>
        {value && <span className="cp-goal-value">{value}</span>}
      </span>
    </div>
  );
}

/* Patient-friendly instruction — plain language + optional safety-netting line. */
function InstructionRow({ instruction }: { instruction: PatientInstruction }) {
  return (
    <li className="cp-instruction">
      <span className="cp-instruction-dot" aria-hidden />
      <span className="cp-instruction-body">
        <span className="cp-instruction-label">{instruction.label}</span>
        {instruction.whenToContact && (
          <span className="cp-instruction-contact">
            <WarningIcon size={12} variant="stroke" /> {instruction.whenToContact}
          </span>
        )}
      </span>
    </li>
  );
}

/* A medication shows TWO independent badges — source (immutable) and verification
   (doctor-editable). Confirming a patient-reported med keeps it patient-reported;
   it never becomes a Kura Rx. Badges carry text, never colour alone. */
function MedRow({
  med,
  readOnly,
  onVerify,
}: {
  med: Medication;
  readOnly: boolean;
  onVerify: (id: string, v: MedVerification) => void;
}) {
  const meta = [med.frequency, med.indication].filter(Boolean).join(" · ");
  /* Only unverified meds need an inline decision; confirmed ones stay quiet. */
  const actions: { v: MedVerification; label: string; quiet?: boolean }[] =
    med.verification === "unverified"
      ? [
          { v: "confirmed", label: "Confirm" },
          { v: "disputed", label: "Dispute", quiet: true },
        ]
      : [];

  return (
    <div className="cp-med">
      <div className="cp-med-main">
        <span className="cp-med-name">
          <strong>{med.drug}</strong>
          {med.dose && <span className="cp-med-dose">{med.dose}</span>}
        </span>
        {meta && <span className="cp-muted">{meta}</span>}
        <span className="cp-med-badges">
          <span className={cx("cp-pill", `tone-${MED_SOURCE_TONE[med.source]}`)}>{MED_SOURCE_LABEL[med.source]}</span>
          <span className={cx("cp-pill", `tone-${MED_VERIFICATION_TONE[med.verification]}`)}>
            {MED_VERIFICATION_LABEL[med.verification]}
          </span>
        </span>
      </div>
      {!readOnly && actions.length > 0 && (
        <div className="cp-med-actions">
          {actions.map((a) => (
            <button
              key={a.v}
              className={cx("cp-btn cp-btn--sm", a.quiet && "cp-btn--quiet")}
              onClick={() => onVerify(med.id, a.v)}
              type="button"
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const INTV_GROUPS: { key: InterventionStatus[]; label: string }[] = [
  { key: ["due", "in_progress"], label: "Due now" },
  { key: ["overdue"], label: "Overdue" },
  { key: ["blocked"], label: "Blocked" },
  { key: ["planned"], label: "Upcoming" },
  { key: ["declined"], label: "Declined" },
  { key: ["completed"], label: "Completed" },
];

function InterventionGroups({
  plan,
  interventions,
  readOnly,
  onCreateOrder,
  actions,
}: {
  plan: CarePlan;
  interventions: Intervention[];
  readOnly: boolean;
  onCreateOrder: CarePlanTabProps["onCreateOrder"];
  actions: CarePlanActions;
}) {
  const groups = useMemo(
    () =>
      INTV_GROUPS.map((g) => ({
        label: g.label,
        items: interventions.filter((i) => g.key.includes(i.status)),
      })).filter((g) => g.items.length > 0),
    [interventions],
  );

  return (
    <div className="cp-intv-groups">
      {groups.map((group) => (
        <div className="cp-intv-group" key={group.label}>
          <p className="cp-intv-group-title">{group.label}</p>
          {group.items.map((intv) => (
            <InterventionRow
              key={intv.id}
              plan={plan}
              intv={intv}
              readOnly={readOnly}
              onCreateOrder={onCreateOrder}
              actions={actions}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function InterventionRow({
  plan,
  intv,
  readOnly,
  onCreateOrder,
  actions,
}: {
  plan: CarePlan;
  intv: Intervention;
  readOnly: boolean;
  onCreateOrder: CarePlanTabProps["onCreateOrder"];
  actions: CarePlanActions;
}) {
  const canOrder = !readOnly && intv.kind === "lab" && intv.order && !intv.execution && intv.status !== "completed";

  const handleOrder = () => {
    if (!intv.order) return;
    const ref = onCreateOrder({
      planId: plan.id,
      planVersion: plan.version,
      focusId: intv.focusId,
      goalId: intv.goalId,
      interventionId: intv.id,
      interventionLabel: intv.label,
      labKeys: intv.order.labKeys,
      rationale: intv.order.rationale,
    });
    actions.linkOrder(plan.id, intv.id, typeof ref === "string" ? ref : "Draft order");
  };

  return (
    <div className="cp-intv">
      <span className={cx("cp-intv-icon", `tone-${INTERVENTION_STATUS_TONE[intv.status]}`)} aria-hidden>
        {intv.kind === "lab" ? (
          <FlaskIcon size={16} variant="stroke" />
        ) : intv.kind === "follow_up" || intv.kind === "consultation" ? (
          <ClockIcon size={16} variant="stroke" />
        ) : intv.kind === "referral" ? (
          <ChevronRightIcon size={16} variant="stroke" />
        ) : (
          <NoteIcon size={16} variant="stroke" />
        )}
      </span>
      <span className="cp-intv-copy">
        <span className="cp-intv-title">
          {intv.label}
          <span className="cp-intv-kind">{INTERVENTION_KIND_LABEL[intv.kind]}</span>
        </span>
        <span className="cp-intv-meta">
          {intv.owner}
          {intv.due ? ` · due ${intv.due}` : ""}
          {intv.frequency ? ` · ${intv.frequency}` : ""}
        </span>
        {intv.status === "blocked" && intv.blockReason && (
          <span className="cp-intv-flag tone-danger">
            <WarningIcon size={12} variant="stroke" /> {intv.blockReason}
          </span>
        )}
        {intv.status === "declined" && intv.declineReason && (
          <span className="cp-intv-flag tone-neutral">{intv.declineReason}</span>
        )}
        {intv.precondition && intv.status === "planned" && (
          <span className="cp-muted cp-intv-pre">{intv.precondition}</span>
        )}
        {intv.execution && (
          <span className="cp-intv-flag tone-info">Linked: draft order · {intv.execution.ref}</span>
        )}
      </span>
      <span className="cp-intv-right">
        <span className={cx("cp-pill", `tone-${INTERVENTION_STATUS_TONE[intv.status]}`)}>
          {INTERVENTION_STATUS_LABEL[intv.status]}
        </span>
        {canOrder && (
          <button className="cp-btn cp-btn--sm" onClick={handleOrder} type="button">
            Create order
          </button>
        )}
        {intv.status === "blocked" && intv.coverage === "denied" && !readOnly && (
          <button className="cp-btn cp-btn--sm cp-btn--quiet" onClick={handleOrder} type="button">
            Resolve coverage
          </button>
        )}
      </span>
    </div>
  );
}

/* Read-only Plan Delta stream — the doctor never types here; it fills itself from
   the clinical work elsewhere. Action carries a TEXT badge + dot (never colour only). */
function DeltaTimeline({ deltas }: { deltas: PlanDelta[] }) {
  return (
    <ol className="cp-deltas">
      {deltas.map((d) => (
        <li className={cx("cp-delta", `tone-${PLAN_DELTA_TONE[d.action]}`)} key={d.id}>
          <span className="cp-delta-dot" aria-hidden />
          <div className="cp-delta-body">
            <div className="cp-delta-head">
              <span className={cx("cp-pill", `tone-${PLAN_DELTA_TONE[d.action]}`)}>{PLAN_DELTA_LABEL[d.action]}</span>
              <strong>{d.summary}</strong>
            </div>
            {d.detail && <p className="cp-muted">{d.detail}</p>}
            <span className="cp-delta-meta">
              {d.actor} · {d.at}
              {d.ref ? ` · ${d.ref}` : ""}
            </span>
          </div>
        </li>
      ))}
    </ol>
  );
}

function CarePlanSection({
  title,
  count,
  children,
  collapsible = false,
  defaultOpen = false,
}: {
  title: string;
  count?: number;
  children: React.ReactNode;
  /* secondary sections (monitoring, reviews, team, history) fold by default so
     the default view is just the clinical work: now → goals */
  collapsible?: boolean;
  defaultOpen?: boolean;
}) {
  if (collapsible) {
    return (
      <details className="cp-section cp-section--fold" aria-label={title} {...(defaultOpen ? { open: true } : {})}>
        <summary className="cp-section-head">
          <h4>{title}</h4>
          {count !== undefined && <span className="cp-section-count">{count}</span>}
        </summary>
        <div className="cp-section-body">{children}</div>
      </details>
    );
  }
  return (
    <section className="cp-section" aria-label={title}>
      <div className="cp-section-head">
        <h4>{title}</h4>
        {count !== undefined && <span className="cp-section-count">{count}</span>}
      </div>
      {children}
    </section>
  );
}
