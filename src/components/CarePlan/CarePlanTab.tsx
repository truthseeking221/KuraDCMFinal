"use client";

import { useMemo, useState } from "react";
import {
  ACHIEVEMENT_LABEL,
  ACHIEVEMENT_TONE,
  AGREEMENT_LABEL,
  INTERVENTION_KIND_LABEL,
  INTERVENTION_STATUS_LABEL,
  INTERVENTION_STATUS_TONE,
  isAtRisk,
  overdueCount,
  PLAN_STATUS_LABEL,
  PLAN_STATUS_TONE,
  useCarePlans,
  type CarePlan,
  type CarePlanActions,
  type Goal,
  type Intervention,
  type InterventionStatus,
  type Tone,
} from "./carePlanModel";
import {
  ChevronRight as ChevronRightIcon,
  Clock as ClockIcon,
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

/* Status grouping order for the plan list. */
const GROUP_ORDER: { key: CarePlan["status"][]; label: string }[] = [
  { key: ["active"], label: "Active" },
  { key: ["draft", "proposed"], label: "Draft" },
  { key: ["on_hold"], label: "On hold" },
  { key: ["completed"], label: "Completed" },
  { key: ["discontinued", "entered_in_error"], label: "Closed" },
];

export function CarePlanTab({ patientId, onCreateOrder }: CarePlanTabProps) {
  const { plans, actions } = useCarePlans(patientId);

  const firstOpen = plans.find((p) => p.status === "active") ?? plans[0];
  const [selectedId, setSelectedId] = useState<string | null>(firstOpen?.id ?? null);

  if (plans.length === 0) {
    return (
      <div className="cp">
        <div className="cp-empty cp-empty--page">
          <span className="cp-empty-ic" aria-hidden>
            <HeartIcon size={22} variant="stroke" />
          </span>
          <strong>No care plan yet for this patient</strong>
          <span>Care plans coordinate goals, actions and reviews over time — start one from a consultation.</span>
          <button className="cp-btn cp-btn--primary" type="button" disabled>
            <PlusIcon size={14} variant="stroke" /> Create care plan
          </button>
        </div>
      </div>
    );
  }

  const selected = plans.find((p) => p.id === selectedId) ?? firstOpen ?? null;
  const groups = GROUP_ORDER.map((g) => ({
    label: g.label,
    plans: plans.filter((p) => g.key.includes(p.status)),
  })).filter((g) => g.plans.length > 0);

  return (
    <div className="cp">
      <CarePlanSummary plans={plans} />
      <div className="cp-split">
        <nav className="cp-list" aria-label="Care plans">
          {groups.map((group) => (
            <div className="cp-list-group" key={group.label}>
              <p className="cp-list-group-title">{group.label}</p>
              {group.plans.map((plan) => (
                <CarePlanListRow
                  key={plan.id}
                  plan={plan}
                  active={plan.id === selected?.id}
                  onSelect={() => setSelectedId(plan.id)}
                />
              ))}
            </div>
          ))}
        </nav>
        {selected ? (
          <CarePlanDetail key={selected.id} plan={selected} actions={actions} onCreateOrder={onCreateOrder} />
        ) : (
          <div className="cp-detail-empty">Select a plan to view its goals, actions and reviews.</div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------- summary ----------------------------------- */

function CarePlanSummary({ plans }: { plans: CarePlan[] }) {
  const active = plans.filter((p) => p.status === "active");
  const drafts = plans.filter((p) => p.status === "draft" || p.status === "proposed");
  const onHold = plans.filter((p) => p.status === "on_hold");
  const overdue = active.reduce((n, p) => n + overdueCount(p), 0);
  const atRisk = active.filter(isAtRisk).length;
  const owner = active[0]?.team.responsible ?? plans[0]?.team.responsible ?? "—";
  const nextReview = active
    .map((p) => p.nextReview)
    .filter((d): d is string => Boolean(d))
    .sort()[0];

  /* One calm context line — the per-plan status + flags already live on the list
     rows and the detail header, so the old 7-cell KPI dashboard was noise.
     Aggregate attention (overdue / at risk) stays, pushed to the right. */
  const plural = (n: number, one: string, many = `${one}s`) => (n === 1 ? one : many);

  return (
    <div className="cp-summary" role="group" aria-label="Care plan summary">
      <span className="cp-summary-stat">
        <strong>{active.length}</strong> active {plural(active.length, "plan")}
      </span>
      {drafts.length > 0 && (
        <span className="cp-summary-stat">
          <strong>{drafts.length}</strong> {plural(drafts.length, "draft")}
        </span>
      )}
      {onHold.length > 0 && (
        <span className="cp-summary-stat">
          <strong>{onHold.length}</strong> on hold
        </span>
      )}
      {nextReview && (
        <span className="cp-summary-stat">
          Next review <strong>{nextReview}</strong>
        </span>
      )}
      <span className="cp-summary-spacer" aria-hidden />
      {overdue > 0 && (
        <span className="cp-summary-flag tone-warning">
          {overdue} overdue {plural(overdue, "action")}
        </span>
      )}
      {atRisk > 0 && <span className="cp-summary-flag tone-danger">{atRisk} at risk</span>}
      <span className="cp-summary-owner">{owner}</span>
    </div>
  );
}

/* ------------------------------ list row ----------------------------------- */

function StatusPill({ status }: { status: CarePlan["status"] }) {
  return (
    <span className={cx("cp-pill", `tone-${PLAN_STATUS_TONE[status]}`)}>{PLAN_STATUS_LABEL[status]}</span>
  );
}

function CarePlanListRow({ plan, active, onSelect }: { plan: CarePlan; active: boolean; onSelect: () => void }) {
  const overdue = overdueCount(plan);
  const risk = isAtRisk(plan);
  return (
    <button
      aria-current={active ? "true" : undefined}
      className={cx("cp-list-row", active && "is-active")}
      onClick={onSelect}
      type="button"
    >
      <span className="cp-list-row-main">
        <span className="cp-list-row-title">
          {plan.title}
          {plan.primary && <span className="cp-tag">Primary</span>}
        </span>
        <span className="cp-list-row-sub">{plan.focuses[0]?.label ?? plan.rationale}</span>
        <span className="cp-list-row-meta">
          {plan.team.responsible}
          {plan.nextReview && plan.status === "active" ? ` · Review ${plan.nextReview}` : ""}
        </span>
      </span>
      <span className="cp-list-row-right">
        <StatusPill status={plan.status} />
        {(risk || overdue > 0) && (
          <span className="cp-list-row-flags">
            {risk && <span className="cp-flag tone-danger">At risk</span>}
            {overdue > 0 && <span className="cp-flag tone-warning">{overdue} overdue</span>}
          </span>
        )}
      </span>
    </button>
  );
}

/* ------------------------------- detail ------------------------------------ */

type ComposerKind = "review" | "pause" | "complete" | "discontinue";
const COMPOSER: Record<ComposerKind, { title: string; placeholder: string; cta: string }> = {
  review: { title: "Record review", placeholder: "Assessment — what changed, why, and the decision…", cta: "Save review" },
  pause: { title: "Put plan on hold", placeholder: "Reason for hold (e.g. patient unreachable, coverage pending)…", cta: "Put on hold" },
  complete: { title: "Complete plan", placeholder: "Completion outcome (goals achieved, transitioned, transferred…)", cta: "Complete plan" },
  discontinue: { title: "Discontinue plan", placeholder: "Reason (patient declined, strategy changed, duplicate…)", cta: "Discontinue" },
};

function CarePlanDetail({
  plan,
  actions,
  onCreateOrder,
}: {
  plan: CarePlan;
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
    if (composer !== "review" && !value) return; // reason required for hold/complete/discontinue
    if (composer === "review") actions.recordReview(plan.id, value || "Reviewed — no change.");
    if (composer === "pause") actions.pause(plan.id, value);
    if (composer === "complete") actions.complete(plan.id, value);
    if (composer === "discontinue") actions.discontinue(plan.id, value);
    setComposer(null);
    setText("");
  };

  const readOnly = plan.status === "completed" || plan.status === "discontinued" || plan.status === "entered_in_error";

  return (
    <div className="cp-detail">
      <CarePlanDetailHeader plan={plan} />
      <CarePlanActionBar plan={plan} actions={actions} onCompose={open} />

      {composer && (
        <div className="cp-composer">
          <p className="cp-composer-title">{COMPOSER[composer].title}</p>
          <textarea
            autoFocus
            className="cp-composer-input"
            onChange={(e) => setText(e.target.value)}
            placeholder={COMPOSER[composer].placeholder}
            rows={3}
            value={text}
          />
          <div className="cp-composer-actions">
            <button className="cp-btn" onClick={() => setComposer(null)} type="button">
              Cancel
            </button>
            <button className="cp-btn cp-btn--primary" onClick={submit} type="button">
              {COMPOSER[composer].cta}
            </button>
          </div>
        </div>
      )}

      <div className="cp-detail-cols">
      <div className="cp-detail-main">
      <CarePlanSection title="Care focus">
        <div className="cp-focus-list">
          {plan.focuses.map((f) => (
            <div className="cp-focus" key={f.id}>
              <div className="cp-focus-head">
                <strong>{f.label}</strong>
                {f.coded && <span className="cp-code">{f.coded}</span>}
                {f.status && <span className="cp-muted">{f.status}</span>}
              </div>
              {f.evidence && <p className="cp-focus-evidence">{f.evidence}</p>}
              {f.reason && <p className="cp-muted">{f.reason}</p>}
            </div>
          ))}
        </div>
      </CarePlanSection>

      <CarePlanSection title="Goals" count={plan.goals.length}>
        <div className="cp-goals">
          {plan.goals.map((g) => (
            <GoalRow key={g.id} goal={g} />
          ))}
        </div>
      </CarePlanSection>

      <CarePlanSection title="Actions" count={plan.interventions.length}>
        <InterventionGroups
          plan={plan}
          readOnly={readOnly}
          onCreateOrder={onCreateOrder}
          actions={actions}
        />
      </CarePlanSection>
      </div>

      <aside className="cp-detail-aside">
      <div className="cp-aside-card">
        <h4 className="cp-aside-title">Details</h4>
        <dl className="cp-kv-list">
          <div className="cp-kv"><dt>Owner</dt><dd>{plan.team.responsible}</dd></div>
          <div className="cp-kv"><dt>Started</dt><dd>{plan.startDate ?? "—"}</dd></div>
          <div className="cp-kv"><dt>Next review</dt><dd>{plan.status === "active" ? plan.nextReview ?? "—" : "—"}</dd></div>
          <div className="cp-kv"><dt>Version</dt><dd>v{plan.version}</dd></div>
          <div className="cp-kv"><dt>Agreement</dt><dd>{AGREEMENT_LABEL[plan.agreement]}</dd></div>
          <div className="cp-kv"><dt>Source</dt><dd>{plan.source}</dd></div>
        </dl>
      </div>

      {plan.monitoring.length > 0 && (
        <CarePlanSection title="Monitoring" count={plan.monitoring.length} collapsible>
          <div className="cp-monitor">
            {plan.monitoring.map((m) => (
              <div className="cp-monitor-row" key={m.id}>
                <span className="cp-monitor-name">{m.label}</span>
                <span className="cp-monitor-vals">
                  {m.target && <span className="cp-muted">Target {m.target}</span>}
                  {m.latest && (
                    <span className="cp-monitor-latest">
                      {m.latest}
                      {m.latestDate ? <em> · {m.latestDate}</em> : null}
                    </span>
                  )}
                </span>
                {m.alert && <span className="cp-monitor-alert">{m.alert}</span>}
                {m.source && <span className="cp-source">{m.source}</span>}
              </div>
            ))}
          </div>
        </CarePlanSection>
      )}

      {plan.reviews.length > 0 && (
        <CarePlanSection title="Reviews" count={plan.reviews.length} collapsible>
          <ol className="cp-reviews">
            {plan.reviews.map((r) => (
              <li className="cp-review" key={r.id}>
                <span className="cp-review-dot" aria-hidden />
                <div className="cp-review-body">
                  <div className="cp-review-head">
                    <strong>{r.reviewer}</strong>
                    <span className="cp-muted">{r.date}</span>
                    <span className="cp-tag">v{r.version}</span>
                  </div>
                  <p>{r.assessment}</p>
                  {r.changes && <p className="cp-muted">{r.changes}</p>}
                </div>
              </li>
            ))}
          </ol>
        </CarePlanSection>
      )}

      <CarePlanSection title="Care team" collapsible>
        <div className="cp-team">
          <TeamRow role="Responsible clinician" name={plan.team.responsible} />
          <TeamRow role="Author" name={plan.team.author} />
          {plan.team.nurse && <TeamRow role="Nurse" name={plan.team.nurse} />}
          {plan.team.coordinator && <TeamRow role="Care coordinator" name={plan.team.coordinator} />}
          {plan.team.patient && <TeamRow role="Patient" name={plan.team.patient} />}
        </div>
      </CarePlanSection>

      <CarePlanSection title="History" count={plan.history.length} collapsible>
        <ol className="cp-history">
          {[...plan.history].reverse().map((h) => (
            <li className="cp-history-row" key={h.id}>
              <span className="cp-history-at">{h.at}</span>
              <span className="cp-history-event">
                {h.event}
                {h.detail ? <em> · {h.detail}</em> : null}
              </span>
              <span className="cp-history-actor">{h.actor}</span>
            </li>
          ))}
        </ol>
      </CarePlanSection>
      </aside>
      </div>
    </div>
  );
}

function CarePlanDetailHeader({ plan }: { plan: CarePlan }) {
  /* identity + intent only — the reference facts (owner/started/version/…) moved
     to the right Details rail so the header stays a clean title block */
  return (
    <header className="cp-detail-head">
      <div className="cp-detail-head-top">
        <div className="cp-detail-title">
          <h3>{plan.title}</h3>
          {plan.primary && <span className="cp-tag">Primary</span>}
          <StatusPill status={plan.status} />
        </div>
      </div>
      <p className="cp-detail-rationale">{plan.rationale}</p>
    </header>
  );
}

function CarePlanActionBar({
  plan,
  actions,
  onCompose,
}: {
  plan: CarePlan;
  actions: CarePlanActions;
  onCompose: (kind: ComposerKind) => void;
}) {
  const buttons: React.ReactNode[] = [];
  if (plan.status === "draft" || plan.status === "proposed") {
    buttons.push(
      <button key="activate" className="cp-btn cp-btn--primary" onClick={() => actions.activate(plan.id)} type="button">
        Activate plan
      </button>,
    );
  }
  if (plan.status === "active") {
    buttons.push(
      <button key="review" className="cp-btn cp-btn--primary" onClick={() => onCompose("review")} type="button">
        Record review
      </button>,
      <button key="pause" className="cp-btn" onClick={() => onCompose("pause")} type="button">
        Put on hold
      </button>,
      <button key="complete" className="cp-btn" onClick={() => onCompose("complete")} type="button">
        Complete
      </button>,
      <button key="disc" className="cp-btn cp-btn--quiet" onClick={() => onCompose("discontinue")} type="button">
        Discontinue
      </button>,
    );
  }
  if (plan.status === "on_hold") {
    buttons.push(
      <button key="resume" className="cp-btn cp-btn--primary" onClick={() => actions.resume(plan.id)} type="button">
        Resume plan
      </button>,
      <button key="disc" className="cp-btn cp-btn--quiet" onClick={() => onCompose("discontinue")} type="button">
        Discontinue
      </button>,
    );
  }
  if (plan.status === "completed" || plan.status === "discontinued") {
    buttons.push(
      <span key="ro" className="cp-readonly-note">
        {plan.completionOutcome ? `${PLAN_STATUS_LABEL[plan.status]} · ${plan.completionOutcome}` : "Read only"}
      </span>,
    );
  }
  return (
    <div className="cp-actionbar">
      {buttons}
      {plan.status === "on_hold" && plan.holdReason && (
        <span className="cp-hold-note">
          <ClockIcon size={13} variant="stroke" /> On hold — {plan.holdReason}
        </span>
      )}
    </div>
  );
}

function GoalRow({ goal }: { goal: Goal }) {
  return (
    <div className="cp-goal">
      <div className="cp-goal-main">
        <span className="cp-goal-label">
          {goal.priority && <span className="cp-dot tone-danger" aria-hidden />}
          {goal.label}
        </span>
        {(goal.baseline || goal.target || goal.latest) && (
          <span className="cp-goal-track">
            {goal.baseline && (
              <span className="cp-goal-stat">
                <em>Baseline</em>
                {goal.baseline}
              </span>
            )}
            {goal.latest && (
              <span className="cp-goal-stat cp-goal-stat--latest">
                <em>Latest</em>
                {goal.latest}
              </span>
            )}
            {goal.target && (
              <span className="cp-goal-stat">
                <em>Target</em>
                {goal.target}
              </span>
            )}
          </span>
        )}
      </div>
      <div className="cp-goal-right">
        <span className={cx("cp-pill", `tone-${ACHIEVEMENT_TONE[goal.achievement]}`)}>
          {ACHIEVEMENT_LABEL[goal.achievement]}
        </span>
        {goal.targetDate && <span className="cp-muted">by {goal.targetDate}</span>}
      </div>
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
  readOnly,
  onCreateOrder,
  actions,
}: {
  plan: CarePlan;
  readOnly: boolean;
  onCreateOrder: CarePlanTabProps["onCreateOrder"];
  actions: CarePlanActions;
}) {
  const groups = useMemo(
    () =>
      INTV_GROUPS.map((g) => ({
        label: g.label,
        items: plan.interventions.filter((i) => g.key.includes(i.status)),
      })).filter((g) => g.items.length > 0),
    [plan.interventions],
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
        {intv.detail && <span className="cp-muted">{intv.detail}</span>}
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

function TeamRow({ role, name }: { role: string; name: string }) {
  return (
    <div className="cp-team-row">
      <span className="cp-team-role">{role}</span>
      <span className="cp-team-name">{name}</span>
    </div>
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
     the default view is just the clinical work: focus → goals → actions */
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
