"use client";

/* =============================================================================
   Patient Care Plan — DESKTOP tab (PR2, reductionist rebuild).

   ONE living plan, read first, navigated by Care Focus. The default focus view is
   a patient-specific program console: plan reason/evidence → next clinical move →
   program context/care map → target signals/current plan. Reference facts live in
   Plan details; cohort configuration lives in Care Programs.

   The contract is unchanged: this still renders inside the desktop record tab with
   { patientId, onCreateOrder }, still seeds the order draft via onCreateOrder, and
   never auto-bills. Coverage resolution is a SEPARATE path (resolveCoverageBlock),
   not the order handler. "Review and update plan" produces a structured
   PlanChangeSet signed once via commitPlanChangeSet.
   ============================================================================= */

import { useMemo, useState } from "react";

import { ActionList, Button, Drawer } from "@/components/ui";
import {
  CareFocusEnrollDrawer,
  type CareFocusEnrollDrawerProps,
  CareFocusNavigation,
  PlanAttentionList,
  PlanDetailsDrawer,
  PlanInterventionRow,
  PlanMedRow,
  PlanOutcomeRow,
  PlanReviewDrawer,
  PlanShareDrawer,
  goalToOutcome,
  type FocusSelection,
  type OutcomeRowData,
} from "@/features/care-plan/components";
import {
  activeFocuses,
  cadenceAnchorPhrase,
  episodesOf,
  focusActionStatus,
  goalsForFocus,
  interventionsForFocus,
  livingPlanOf,
  OPEN_LOOP_STATUSES,
  parseCadenceAnchorLabel,
  resolveCoverageBlock,
  useCarePlans,
  useMedications,
  useProtocolDefinitions,
  type CarePlan,
  type ClinicalFocus,
  type Intervention,
  type ProtocolDefinition,
  type ProtocolKey,
} from "@/features/care-plan/domain";
import { ChevronRight as ChevronRightIcon, Heart as HeartIcon, Plus as PlusIcon, Share as ShareIcon } from "@/icons/components";
import { cx } from "@/lib/cx";
import "./CarePlan.css";

/* Preserved external contract — page.tsx seeds the order draft from this. */
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
  /* Deep-link from Care programs: open the focus enrolled via this protocol.
     Search can pass a focus id for consultation-created focuses that do not have
     a protocol key. Falls back to the default focus when no focus matches. */
  initialProtocolKey?: ProtocolKey;
  initialFocusId?: string;
  /* Provenance link: jump to this focus's program in Care programs. */
  onViewProgram?: (protocolKey: ProtocolKey) => void;
};

/* Programs offered when adding a care focus from the chart. Deterministic order. */
const PROGRAM_PICK = ["t2dm", "ckd", "htn", "lipid_cvd"] as ProtocolKey[];

/* Standing, ongoing care belongs in Current plan; discrete future actions in
   Upcoming. */
const STANDING_KINDS = new Set<Intervention["kind"]>([
  "home_measurement",
  "monitoring",
  "lifestyle",
  "education",
]);

type ProgramMatch = {
  key: ProtocolKey;
  def: ProtocolDefinition;
  relation: "enrolled" | "matched";
};

function protocolForFocus(
  focus: ClinicalFocus,
  protocols: Record<ProtocolKey, ProtocolDefinition>,
): ProgramMatch | null {
  if (focus.protocolKey && focus.protocolKey in protocols) {
    const key = focus.protocolKey as ProtocolKey;
    return { key, def: protocols[key], relation: "enrolled" };
  }

  const haystack = `${focus.id} ${focus.label} ${focus.shortLabel ?? ""} ${focus.coded ?? ""}`.toLowerCase();
  const inferredKey: ProtocolKey | null =
    haystack.includes("diabetes") || haystack.includes("e11") || haystack.includes("f-dm")
      ? "t2dm"
      : haystack.includes("renal") || haystack.includes("kidney") || haystack.includes("ckd") || haystack.includes("n18")
        ? "ckd"
        : haystack.includes("hypertension") || haystack.includes("blood pressure") || haystack.includes("i10")
          ? "htn"
          : haystack.includes("lipid") || haystack.includes("cardiovascular") || haystack.includes("e78")
            ? "lipid_cvd"
            : null;

  return inferredKey ? { key: inferredKey, def: protocols[inferredKey], relation: "matched" } : null;
}

function nextReviewLabel(label: string): string {
  const parsed = parseCadenceAnchorLabel(label);
  if (!parsed) return label;
  return parsed.anchor.toLowerCase() === "enrolment" ? "after enrolment" : cadenceAnchorPhrase(label);
}

export function CarePlanTab({
  patientId,
  onCreateOrder,
  initialProtocolKey,
  initialFocusId,
  onViewProgram,
}: CarePlanTabProps) {
  const { plans, actions } = useCarePlans(patientId);
  const { meds, setVerification } = useMedications(patientId);
  const protocols = useProtocolDefinitions();

  const living = useMemo(() => livingPlanOf(plans), [plans]);
  const episodes = useMemo(() => episodesOf(plans), [plans]);
  const focuses = useMemo(() => (living ? activeFocuses(living) : []), [living]);

  /* Selection key: "overview" | "<focusId>" | "ep:<episodeId>". A deep-link from
     Care programs opens the focus enrolled via that protocol; otherwise, with a
     single active focus we open it directly (no rail). */
  const protocolLinkedFocus = initialProtocolKey
    ? focuses.find((f) => f.protocolKey === initialProtocolKey) ?? null
    : null;
  const linkedFocus = initialFocusId
    ? focuses.find((f) => f.id === initialFocusId) ?? protocolLinkedFocus
    : protocolLinkedFocus;
  const singleFocus = focuses.length === 1 ? focuses[0] : null;
  const defaultKey: FocusSelection = linkedFocus
    ? linkedFocus.id
    : singleFocus
      ? singleFocus.id
      : living
        ? "overview"
        : episodes[0]
        ? `ep:${episodes[0].id}`
        : "overview";
  const [manualSelectedKey, setManualSelectedKey] = useState<FocusSelection | null>(null);
  const manualSelectionValid =
    manualSelectedKey === null
      ? false
      : manualSelectedKey === "overview"
        ? !!living
        : manualSelectedKey.startsWith("ep:")
          ? episodes.some((episode) => `ep:${episode.id}` === manualSelectedKey)
          : focuses.some((focus) => focus.id === manualSelectedKey);
  const selectedKey: FocusSelection =
    manualSelectionValid && manualSelectedKey !== null ? manualSelectedKey : defaultKey;

  /* Add care focus from the chart: pick a program (pickerOpen), then enrol THIS
     patient via the shared CareFocusEnrollDrawer (enrolProtocol). */
  const [pickerOpen, setPickerOpen] = useState(false);
  const [enrolProtocol, setEnrolProtocol] = useState<ProtocolKey | null>(null);

  const enrolledProtocolKeys = useMemo(
    () => new Set(focuses.map((f) => f.protocolKey).filter(Boolean) as string[]),
    [focuses],
  );

  const addFocusFlow = (
    <AddCareFocusFlow
      patientId={patientId}
      protocols={protocols}
      pickerOpen={pickerOpen}
      enrolProtocol={enrolProtocol}
      enrolledKeys={enrolledProtocolKeys}
      onClosePicker={() => setPickerOpen(false)}
      onPick={(key) => {
        setPickerOpen(false);
        setEnrolProtocol(key);
      }}
      onCloseEnrol={() => setEnrolProtocol(null)}
      onEnrolled={(_, result) => {
        setManualSelectedKey(result.focusId);
        setEnrolProtocol(null);
      }}
    />
  );

  /* Empty state — no disabled CTA. The plan emerges from clinical work, or the
     doctor can enrol the patient in a program to start a focus. */
  if (!living && episodes.length === 0) {
    return (
      <div className="cp">
        <div className="cp-empty">
          <span className="cp-empty-ic" aria-hidden>
            <HeartIcon size={22} variant="stroke" />
          </span>
          <strong>No care plan yet</strong>
          <p>
            The plan builds itself as you work. Order a test, sign an Rx, or book a follow-up and it
            appears here.
          </p>
          <Button
            intent="secondary"
            size="sm"
            leadingIcon={<PlusIcon size={14} variant="stroke" />}
            onClick={() => setPickerOpen(true)}
          >
            Add care focus
          </Button>
        </div>
        {addFocusFlow}
      </div>
    );
  }

  const episodeSel = selectedKey.startsWith("ep:")
    ? episodes.find((e) => `ep:${e.id}` === selectedKey) ?? null
    : null;
  const focusSelId = !episodeSel && selectedKey !== "overview" ? selectedKey : null;
  const detailPlan = episodeSel ?? living;

  const showNav = !!living && focuses.length >= 2;

  return (
    <div className="cp">
      <div className={cx("cp-shell", showNav && "cp-shell--with-nav")}>
        {showNav && living && (
          <CareFocusNavigation
            plan={living}
            focuses={focuses}
            episodes={episodes}
            selected={selectedKey}
            onSelect={setManualSelectedKey}
            onAddFocus={() => setPickerOpen(true)}
          />
        )}
        {detailPlan && (
          <FocusView
            key={selectedKey}
            patientId={patientId}
            plan={detailPlan}
            focusId={episodeSel ? null : focusSelId}
            meds={meds}
            protocols={protocols}
            onCreateOrder={onCreateOrder}
            onVerifyMed={(id) => setVerification(id, "confirmed")}
            onLinkOrder={(intvId, ref) => actions.linkOrder(detailPlan.id, intvId, ref)}
            onViewProgram={onViewProgram}
            onAddFocus={showNav ? undefined : () => setPickerOpen(true)}
          />
        )}
      </div>
      {addFocusFlow}
    </div>
  );
}

/* Add care focus from the chart — pick a program, then the shared enrolment
   drawer enrols THIS patient. Two quiet drawers, never both open at once. */
function AddCareFocusFlow({
  patientId,
  protocols,
  pickerOpen,
  enrolProtocol,
  enrolledKeys,
  onClosePicker,
  onPick,
  onCloseEnrol,
  onEnrolled,
}: {
  patientId: string;
  protocols: Record<ProtocolKey, ProtocolDefinition>;
  pickerOpen: boolean;
  enrolProtocol: ProtocolKey | null;
  enrolledKeys: Set<string>;
  onClosePicker: () => void;
  onPick: (key: ProtocolKey) => void;
  onCloseEnrol: () => void;
  onEnrolled: NonNullable<CareFocusEnrollDrawerProps["onEnrolled"]>;
}) {
  return (
    <>
      <Drawer open={pickerOpen} onClose={onClosePicker} title="Add care focus" subtitle="Choose a program" width={420}>
        <ActionList
          items={PROGRAM_PICK.map((key) => {
            const already = enrolledKeys.has(key);
            const protocol = protocols[key];
            return {
              label: (
                <span className="cp-program-pick-label">
                  <span>{protocol.name}</span>
                  {already && <small>Already in plan</small>}
                </span>
              ),
              icon: <PlusIcon size={14} variant="stroke" />,
              disabled: already,
              onClick: () => onPick(key),
            };
          })}
        />
      </Drawer>
      <CareFocusEnrollDrawer
        patientId={patientId}
        protocol={enrolProtocol ? protocols[enrolProtocol] : undefined}
        open={enrolProtocol != null}
        onClose={onCloseEnrol}
        onEnrolled={onEnrolled}
      />
    </>
  );
}

/* ---------------------------------- focus view ----------------------------- */

function FocusView({
  patientId,
  plan,
  focusId,
  meds,
  protocols,
  onCreateOrder,
  onVerifyMed,
  onLinkOrder,
  onViewProgram,
  onAddFocus,
}: {
  patientId: string;
  plan: CarePlan;
  focusId: string | null;
  meds: ReturnType<typeof useMedications>["meds"];
  protocols: Record<ProtocolKey, ProtocolDefinition>;
  onCreateOrder: CarePlanTabProps["onCreateOrder"];
  onVerifyMed: (medId: string) => void;
  onLinkOrder: (interventionId: string, ref: string) => void;
  onViewProgram?: (protocolKey: ProtocolKey) => void;
  /* Provided only when the focus rail is hidden (single focus / overview); the rail
     owns this entry otherwise. */
  onAddFocus?: () => void;
}) {
  const [reviewOpen, setReviewOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  /* Sharing isn't persisted in the domain; track the act for this session so the
     prompt disappears once shared (audit lives in plan activity). */
  const [shared, setShared] = useState(false);

  const focus: ClinicalFocus | null = focusId ? plan.focuses.find((f) => f.id === focusId) ?? null : null;
  const isEpisode = plan.kind === "episode";
  const active = plan.status === "active" && !isEpisode;

  /* Scope every section to the selected focus; whole-plan / episode shows all. */
  const goals = focusId ? goalsForFocus(plan, focusId) : plan.goals;
  const interventions = focusId ? interventionsForFocus(plan, focusId) : plan.interventions;
  const monitoring = focusId ? plan.monitoring.filter((m) => m.focusId === focusId) : plan.monitoring;
  const focusMeds = focusId ? meds.filter((m) => m.focusId === focusId) : meds;
  const instructions = focusId
    ? (plan.instructions ?? []).filter((i) => i.focusId === focusId)
    : plan.instructions ?? [];

  /* Outcomes: goals + monitored measures not already shown as a goal value. */
  const goalTrendKeys = new Set(goals.map((g) => g.trendKey).filter(Boolean));
  const extraOutcomes: OutcomeRowData[] = monitoring
    .filter((m) => !m.trendKey || !goalTrendKeys.has(m.trendKey))
    .map((m) => ({ id: m.id, label: m.label, latest: m.latest, target: m.target }));
  const outcomes: OutcomeRowData[] = [...goals.map(goalToOutcome), ...extraOutcomes];

  /* Current plan vs Upcoming. Open loops go to Next action; completed / declined
     drop to history. Standing planned care stays in Current plan; discrete future
     actions collapse into Upcoming. */
  const openLoop = interventions.filter((i) => OPEN_LOOP_STATUSES.includes(i.status));
  const standing = interventions.filter((i) => i.status === "planned" && STANDING_KINDS.has(i.kind));
  const upcoming = interventions.filter((i) => i.status === "planned" && !STANDING_KINDS.has(i.kind));

  const responsible = plan.team.responsible;

  const handleCreateOrder = (intv: Intervention) => {
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
    onLinkOrder(intv.id, typeof ref === "string" ? ref : "Draft order");
  };

  /* Coverage resolution is a DISTINCT path — never the order handler. */
  const handleResolveCoverage = (intv: Intervention) => {
    resolveCoverageBlock(patientId, intv.id, "preauth", "Coverage re-checked from plan review");
  };

  const nextReview = active ? (focus?.nextReview ?? plan.nextReview) : undefined;
  const displayNextReview = nextReview ? nextReviewLabel(nextReview) : null;
  const focusReviewedAfterEnrolment = Boolean(
    focus?.lastReviewedAt && focus.lastReviewedAt !== focus.enrolledAt,
  );
  const lastActivityVerb = focus && !focusReviewedAfterEnrolment && focus.enrolledAt ? "Added" : "Updated";
  const lastActivityDate = focus
    ? focusReviewedAfterEnrolment
      ? focus.lastReviewedAt
      : focus.enrolledAt ?? focus.lastReviewedAt ?? plan.lastReviewedAt ?? plan.startDate
    : plan.lastReviewedAt ?? plan.startDate;
  const lastBy = plan.lastReviewedBy ?? responsible;
  const protocolKey =
    focus?.protocolKey && focus.protocolKey in protocols ? (focus.protocolKey as ProtocolKey) : null;
  const focusProgram = focus ? protocolForFocus(focus, protocols) : null;
  const protocolKeyForAction = focusProgram?.key ?? protocolKey;
  const protocolDef = focusProgram?.def ?? (protocolKey ? protocols[protocolKey] : null);
  const protocolName = focusProgram?.def.name ?? focus?.protocolName;

  const unsharedInstructions = active && !shared && instructions.length > 0;

  const title = focus ? (focus.shortLabel ?? focus.label) : plan.title;
  const visibleFocuses = isEpisode ? plan.focuses : activeFocuses(plan);
  const focusMap = visibleFocuses.map((f) => ({
    focus: f,
    status: focusActionStatus(plan, f.id),
    program: protocolForFocus(f, protocols),
  }));
  const hasUrgentLoop = openLoop.some((i) => i.status === "blocked" || i.status === "overdue");
  const decisionTone = hasUrgentLoop ? "tone-warning" : openLoop.length > 0 ? "tone-info" : "tone-success";
  const evidenceLine =
    focus?.evidence ??
    (focusMap.length > 0
      ? focusMap
          .slice(0, 3)
          .map((item) => `${item.focus.shortLabel ?? item.focus.label}: ${item.status.label.toLowerCase()}`)
          .join(" · ")
      : plan.rationale);
  const reviewSummary = displayNextReview ? `Next review ${displayNextReview}` : "Review when new evidence arrives";

  return (
    <div className="cp-column">
      <header className="cp-hero">
        <div className="cp-hero-main">
          <div className="cp-hero-kicker">Patient care plan</div>
          <h2>{title}</h2>
          <p className="cp-hero-reason">{focus?.reason ?? plan.rationale}</p>
          {evidenceLine && <p className="cp-hero-evidence">{evidenceLine}</p>}
          <div className="cp-hero-meta">
            <span>{reviewSummary}</span>
            <span className="cp-dot" aria-hidden />
            <span>{lastActivityVerb} {lastActivityDate} by {lastBy}</span>
            <span className="cp-dot" aria-hidden />
            <button type="button" onClick={() => setDetailsOpen(true)}>
              Plan details
            </button>
            {onAddFocus && (
              <>
                <span className="cp-dot" aria-hidden />
                <button type="button" onClick={onAddFocus}>
                  Add care focus
                </button>
              </>
            )}
          </div>
        </div>
        {active && (
          <div className="cp-hero-actions">
            <Button intent="secondary" size="sm" onClick={() => setReviewOpen(true)}>
              Review plan
            </Button>
          </div>
        )}
      </header>

      <div className="cp-workbench">
        <section className="cp-card cp-decision-card" aria-label="Next clinical move">
          <div className="cp-card-head">
            <div>
              <p className="cp-card-label">Next clinical move</p>
              <h3>
                {openLoop.length === 0
                  ? "No open clinical action"
                  : hasUrgentLoop
                    ? "Close the blocker first"
                    : "Close the next due step"}
              </h3>
            </div>
            {active && (
              <span className={cx("cp-status-chip", decisionTone)}>
                {openLoop.length === 0 ? "Up to date" : `${openLoop.length} open`}
              </span>
            )}
          </div>
          {active ? (
            <PlanAttentionList
              interventions={openLoop}
              upToDateReview={displayNextReview ?? undefined}
              callbacks={{ onCreateOrder: handleCreateOrder, onResolveCoverage: handleResolveCoverage }}
            />
          ) : (
            <p className="cp-muted">This care episode is closed.</p>
          )}
          {unsharedInstructions && (
            <div className="cp-share-prompt">
              <span className="cp-share-prompt-ic" aria-hidden>
                <ShareIcon size={16} variant="stroke" />
              </span>
              <span>Patient instructions not shared yet.</span>
              <Button intent="secondary" size="sm" onClick={() => setShareOpen(true)}>
                Share
              </Button>
            </div>
          )}
        </section>

        <aside className="cp-card cp-program-card" aria-label={focus ? "Program context" : "Care map"}>
          {focus ? (
            <>
              <p className="cp-card-label">Program context</p>
              {focusProgram && protocolName ? (
                <>
                  <div className="cp-program-title">
                    <span className="cp-program-ic" aria-hidden>
                      <HeartIcon size={16} variant="stroke" />
                    </span>
                    <strong>{protocolName}</strong>
                  </div>
                  {focusProgram.relation === "enrolled" && (
                    <p className="cp-program-copy">Enrolled from this care program.</p>
                  )}
                  <dl className="cp-mini-kv">
                    <div>
                      <dt>Review</dt>
                      <dd>{protocolDef?.reviewCadence ?? "Set by clinician"}</dd>
                    </div>
                    <div>
                      <dt>Targets</dt>
                      <dd>{protocolDef?.targets.length ?? outcomes.length}</dd>
                    </div>
                    <div>
                      <dt>Steps</dt>
                      <dd>{protocolDef?.steps.length ?? interventions.length}</dd>
                    </div>
                  </dl>
                  {onViewProgram && protocolKeyForAction && (
                    <button
                      type="button"
                      className="cp-program-open"
                      onClick={() => onViewProgram(protocolKeyForAction)}
                    >
                      Open program
                      <ChevronRightIcon size={14} variant="stroke" aria-hidden />
                    </button>
                  )}
                </>
              ) : (
                <p className="cp-program-copy">
                  This focus is managed from the patient chart. Add it to a care program when the workflow
                  should be shared across the cohort.
                </p>
              )}
            </>
          ) : (
            <>
              <div className="cp-card-head cp-card-head--compact">
                <div>
                  <p className="cp-card-label">Care map</p>
                  <h3>{focusMap.length} active focus{focusMap.length === 1 ? "" : "es"}</h3>
                </div>
              </div>
              <div className="cp-focus-map">
                {focusMap.map(({ focus: f, status, program }) => (
                  <div className={cx("cp-focus-map-row", `tone-${status.tone}`)} key={f.id}>
                    <span className="cp-focus-map-main">
                      <strong>{f.shortLabel ?? f.label}</strong>
                      <span>{status.label}</span>
                    </span>
                    {program && onViewProgram ? (
                      <button type="button" onClick={() => onViewProgram(program.key)}>
                        Program
                        <ChevronRightIcon size={13} variant="stroke" aria-hidden />
                      </button>
                    ) : (
                      program && <span className="cp-focus-map-program">{program.def.shortLabel}</span>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </aside>
      </div>

      <div className="cp-plan-grid">
        {outcomes.length > 0 && (
          <section className="cp-card" aria-label="Target signals">
            <div className="cp-card-head cp-card-head--compact">
              <div>
                <p className="cp-card-label">Target signals</p>
                <h3>{outcomes.length} target{outcomes.length === 1 ? "" : "s"}</h3>
              </div>
            </div>
            <div className="cp-rows">
              {outcomes.map((o) => (
                <PlanOutcomeRow key={o.id} outcome={o} />
              ))}
            </div>
          </section>
        )}

        {(focusMeds.length > 0 || standing.length > 0) && (
          <section className="cp-card" aria-label="Current plan">
            <div className="cp-card-head cp-card-head--compact">
              <div>
                <p className="cp-card-label">Current plan</p>
                <h3>Treatment and routine care</h3>
              </div>
            </div>
            <div className="cp-rows">
              {focusMeds.map((m) => (
                <PlanMedRow
                  key={m.id}
                  med={m}
                  action={
                    active && m.verification === "unverified"
                      ? { label: "Confirm", onClick: () => onVerifyMed(m.id) }
                      : undefined
                  }
                />
              ))}
              {standing.map((i) => (
                <PlanInterventionRow key={i.id} intv={i} responsible={responsible} />
              ))}
            </div>
          </section>
        )}
      </div>

      {upcoming.length > 0 && (
        <details className="cp-fold">
          <summary>Upcoming · {upcoming.length}</summary>
          <div className="cp-fold-body cp-rows">
            {upcoming.map((i) => (
              <PlanInterventionRow key={i.id} intv={i} responsible={responsible} />
            ))}
          </div>
        </details>
      )}

      {/* drawers */}
      {active && (
        <>
          <PlanReviewDrawer
            open={reviewOpen}
            onClose={() => setReviewOpen(false)}
            patientId={patientId}
            focus={focus}
            onCommitted={() => setReviewOpen(false)}
          />
          <PlanShareDrawer
            open={shareOpen}
            onClose={() => setShareOpen(false)}
            focusLabel={title}
            instructions={instructions}
            onShare={() => setShared(true)}
          />
        </>
      )}
      <PlanDetailsDrawer
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        plan={plan}
        focus={focus}
        onViewProgram={onViewProgram}
      />
    </div>
  );
}
