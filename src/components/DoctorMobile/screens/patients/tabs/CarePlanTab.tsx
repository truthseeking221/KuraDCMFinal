"use client";

/* Care plan tab (mobile) — the plan-of-action surface, on the SAME care-plan
   domain selectors as desktop (PR2). Reductionist per Principal-UX §9: read the
   ONE living plan, navigate by Care Focus, and show at most

     Focus switcher (only when >1 active focus)
       → Next action (open-loop interventions: what + why-now + due)
       → Outcome   (goal label + latest→target + trend / achievement pill)
       → Current plan (focus meds + standing interventions)
       → sticky primary CTA

   Everything secondary — Upcoming, Instructions, Details, History, Past care —
   lives behind ONE overflow sheet. Context that the chart header / Summary /
   Finish Visit already carry (condition chips, allergies, self-reported decisions,
   after-visit block, full instruction text) is NOT repeated here. Status is always
   DERIVED from the domain, never set in the UI. */

import { useMemo, useState } from "react";
import { Clock, Flask, Heart, Note, Patient, Pill as PillIcon, Share, Warning } from "@/icons/components";
import type { IconProps } from "@/icons/components";
import { cx } from "@/lib/cx";
import base from "@/components/DoctorMobile/DoctorMobileApp.module.css";
import { ListRow, Pill, SectionHeader, SegmentTabs, toneClass } from "@/components/DoctorMobile/components/primitives";
import { Sheet, useSheets } from "@/components/DoctorMobile/components/Sheet";
import { useMobileApp } from "@/components/DoctorMobile/state/MobileAppContext";
import { useOrderDraft } from "@/components/OrderDraft";
import { LabMiniTrend } from "@/components/ui/LabHistory";
import {
  activeFocuses,
  episodesOf,
  goalsForFocus,
  interventionsForFocus,
  livingPlanOf,
  OPEN_LOOP_STATUSES,
  PLAN_DELTA_LABEL,
  resolveCoverageBlock,
  selectNextPlanAction,
  useCarePlans,
  useMedications,
  type CarePlan,
  type ClinicalFocus,
  type Intervention,
  type InterventionKind,
  type Medication,
} from "@/features/care-plan/domain";
import { toast } from "sonner";
import styles from "../patientChart.module.css";
import {
  achievementPill,
  goalToOutcome,
  medBadge,
  nextActionCta,
  nextActionIntervention,
  orderOpenLoop,
  whyNow,
  type OutcomeRowData,
} from "./carePlanView";

type IconComponent = (props: IconProps) => React.ReactElement;

/* The kind icon conveys the type, so rows carry no kind label (mirrors desktop). */
const KIND_ICON: Record<InterventionKind, IconComponent> = {
  lab: Flask,
  imaging: Flask,
  follow_up: Clock,
  consultation: Clock,
  referral: Share,
  lifestyle: Heart,
  education: Heart,
  home_measurement: Patient,
  monitoring: Patient,
  medication_review: PillIcon,
  procedure: Note,
  insurance: Note,
};

/* Standing, ongoing care belongs in Current plan; discrete future actions go to
   Upcoming (in the overflow sheet) — same split as desktop. */
const STANDING_KINDS = new Set<InterventionKind>(["home_measurement", "monitoring", "lifestyle", "education"]);

export function CarePlanTab() {
  const { activePatientId } = useMobileApp();
  const { open } = useSheets();
  const { plans } = useCarePlans(activePatientId);
  const { meds, setVerification } = useMedications(activePatientId);
  const { addLabTest, plannedLabKeys } = useOrderDraft();

  const living = useMemo(() => livingPlanOf(plans), [plans]);
  const episodes = useMemo(() => episodesOf(plans), [plans]);
  const focuses = useMemo(() => (living ? activeFocuses(living) : []), [living]);

  /* Single focus opens directly (no switcher); >1 focus shows the segmented
     switcher. "" = whole-plan overview is never the default — a living plan always
     has at least one focus. */
  const [focusId, setFocusId] = useState<string>(() => focuses[0]?.id ?? "");

  if (!living) {
    return (
      <div className={cx(base.sectionStack, base.tabPanel)}>
        <div className={base.banner}>
          <Heart size={16} variant="stroke" aria-hidden="true" />
          <div>
            <strong>No care plan yet</strong>
            <span> It builds itself as you work — order a test, sign an Rx, or book a follow-up.</span>
          </div>
        </div>
      </div>
    );
  }

  const selectedId = focuses.some((f) => f.id === focusId) ? focusId : focuses[0]?.id ?? "";
  const focus: ClinicalFocus | null = focuses.find((f) => f.id === selectedId) ?? null;

  /* Scope every section to the selected focus. */
  const goals = selectedId ? goalsForFocus(living, selectedId) : living.goals;
  const interventions = selectedId ? interventionsForFocus(living, selectedId) : living.interventions;
  const monitoring = selectedId ? living.monitoring.filter((m) => m.focusId === selectedId) : living.monitoring;
  const focusMeds = selectedId ? meds.filter((m) => m.focusId === selectedId) : meds;

  /* Next action: the SINGLE most-urgent open loop comes from the canonical
     domain selector (selectNextPlanAction), so the sticky-CTA / primary-action
     decision is never re-derived on mobile. The list then pins that primary
     first and trails the remaining open loops in stable order. */
  const primary = nextActionIntervention(selectNextPlanAction(activePatientId, selectedId));
  const openLoop = orderOpenLoop(
    interventions.filter((i) => OPEN_LOOP_STATUSES.includes(i.status)),
    primary,
  );

  /* Current plan: meds + standing interventions. Upcoming (discrete future) and
     everything else falls behind the overflow sheet. */
  const standing = interventions.filter((i) => i.status === "planned" && STANDING_KINDS.has(i.kind));
  const upcoming = interventions.filter((i) => i.status === "planned" && !STANDING_KINDS.has(i.kind));

  /* Outcomes: goals (shared goalToOutcome shaping) + monitored measures not
     already shown as a goal value. */
  const goalTrendKeys = new Set(goals.map((g) => g.trendKey).filter(Boolean));
  const outcomes: OutcomeRowData[] = [
    ...goals.map(goalToOutcome),
    ...monitoring
      .filter((m) => !m.trendKey || !goalTrendKeys.has(m.trendKey))
      .map((m) => ({ id: m.id, label: m.label, latest: m.latest, target: m.target, trendKey: m.trendKey })),
  ];

  const createOrder = (intv: Intervention) => {
    if (!intv.order) return;
    for (const labKey of intv.order.labKeys) {
      if (plannedLabKeys.has(labKey)) continue;
      addLabTest(labKey, {
        labName: intv.label,
        reasonText: intv.order.rationale,
        severityTone: intv.status === "overdue" ? "warning" : "info",
        source: "labs-followup",
      });
    }
    toast.success(`${intv.label} added to order`);
  };

  const resolveCoverage = (intv: Intervention) => {
    const ok = resolveCoverageBlock(activePatientId, intv.id, "preauth", "Coverage re-checked from plan review");
    toast[ok ? "success" : "error"](ok ? "Coverage block resolved" : "Could not resolve coverage");
  };

  const runCta = (intv: Intervention) => {
    const cta = nextActionCta(intv);
    if (cta?.kind === "order") createOrder(intv);
    else if (cta?.kind === "resolve-coverage") resolveCoverage(intv);
  };

  const openMore = () =>
    open((close) => (
      <CarePlanMoreSheet
        close={close}
        plan={living}
        focus={focus}
        upcoming={upcoming}
        episodes={episodes}
      />
    ));

  const stickyLabel = primary ? (nextActionCta(primary)?.label ?? "Review plan") : "Review plan";
  const stickyAction = primary && nextActionCta(primary) ? () => runCta(primary) : openMore;

  return (
    <div className={cx(base.sectionStack, base.tabPanel)}>
      {/* 1 — Focus switcher (only with >1 active focus) */}
      {focuses.length > 1 ? (
        <SegmentTabs
          items={focuses.map((f) => ({ id: f.id, label: f.shortLabel ?? f.label }))}
          activeId={selectedId}
          onSelect={setFocusId}
        />
      ) : null}

      {/* 2 — Next action */}
      <section className={base.sectionStack}>
        <SectionHeader
          title="Next action"
          meta={openLoop.length > 0 ? `${openLoop.length} open` : "All done"}
        />
        {openLoop.length === 0 ? (
          focus?.nextReview || living.nextReview ? (
            <p className={base.muted}>Next review {focus?.nextReview ?? living.nextReview}</p>
          ) : null
        ) : (
          <div className={base.cardGroup}>
            {openLoop.map((intv) => (
              <NextActionRow key={intv.id} intv={intv} onCta={() => runCta(intv)} />
            ))}
          </div>
        )}
      </section>

      {/* 3 — Outcome */}
      {outcomes.length > 0 ? (
        <section className={base.sectionStack}>
          <SectionHeader title="Outcome" />
          <div className={base.cardGroup} role="list">
            {outcomes.map((o) => {
              const pill = achievementPill(o.achievement);
              return (
                <div key={o.id} className={cx(styles.cpRow, styles.cpRowFlat)} role="listitem">
                  <span className={styles.cpRowMain}>
                    <span className={styles.cpRowTitle}>
                      {o.label}
                      {o.latest || o.target ? (
                        <span className={styles.cpRowValue}>
                          {o.latest ? <strong>{o.latest}</strong> : null}
                          {o.latest && o.target ? " → " : ""}
                          {o.target}
                        </span>
                      ) : null}
                    </span>
                  </span>
                  <span className={styles.cpRowAside}>
                    {pill ? <Pill tone={pill.tone}>{pill.label}</Pill> : null}
                    {o.trendKey ? <LabMiniTrend labKey={o.trendKey} /> : null}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* 4 — Current plan */}
      {focusMeds.length > 0 || standing.length > 0 ? (
        <section className={base.sectionStack}>
          <SectionHeader title="Current plan" />
          <div className={base.cardGroup}>
            {focusMeds.map((m) => (
              <MedRow key={m.id} med={m} onConfirm={() => setVerification(m.id, "confirmed")} />
            ))}
            {standing.map((i) => (
              <StandingRow key={i.id} intv={i} />
            ))}
          </div>
        </section>
      ) : null}

      {/* 5 — sticky primary CTA + overflow */}
      <div className={base.stickyCta}>
        <button type="button" className={base.primaryButton} onClick={stickyAction}>
          {stickyLabel}
        </button>
        <button type="button" className={base.secondaryButton} onClick={openMore} aria-label="More care-plan detail">
          More
        </button>
      </div>
    </div>
  );
}

/* --------------------------------- rows ------------------------------------ */

function NextActionRow({ intv, onCta }: { intv: Intervention; onCta: () => void }) {
  const Icon = intv.status === "blocked" ? Warning : KIND_ICON[intv.kind];
  const tone = intv.status === "blocked" ? "danger" : intv.status === "overdue" ? "warning" : "info";
  const cta = nextActionCta(intv);
  return (
    <div className={styles.cpRow}>
      <span className={cx(base.taskIcon, toneClass(tone))}>
        <Icon size={16} variant="stroke" aria-hidden="true" />
      </span>
      <span className={styles.cpRowMain}>
        <span className={styles.cpRowTitle}>{intv.label}</span>
        <span className={styles.cpRowMeta}>{whyNow(intv)}</span>
      </span>
      <span className={styles.cpRowAside}>
        {cta ? (
          <button type="button" className={base.addChip} onClick={onCta}>
            {cta.label}
          </button>
        ) : null}
      </span>
    </div>
  );
}

function MedRow({ med, onConfirm }: { med: Medication; onConfirm: () => void }) {
  const badge = medBadge(med);
  const dose = [med.dose, med.frequency].filter(Boolean).join(" · ");
  const needsConfirm = med.verification === "unverified";
  return (
    <div className={styles.cpRow}>
      <span className={cx(base.taskIcon, toneClass(badge?.tone ?? "neutral"))}>
        <PillIcon size={16} variant="stroke" aria-hidden="true" />
      </span>
      <span className={styles.cpRowMain}>
        <span className={styles.cpRowTitle}>
          {med.drug}
          {dose ? <span className={styles.cpRowValue}>{dose}</span> : null}
        </span>
      </span>
      <span className={styles.cpRowAside}>
        {needsConfirm ? (
          <button type="button" className={base.addChip} onClick={onConfirm}>
            Confirm
          </button>
        ) : badge ? (
          <Pill tone={badge.tone}>{badge.label}</Pill>
        ) : null}
      </span>
    </div>
  );
}

function StandingRow({ intv }: { intv: Intervention }) {
  const Icon = KIND_ICON[intv.kind];
  const owner = intv.owner && intv.owner.toLowerCase() !== "dr dara" ? intv.owner : null;
  const meta = [owner, intv.frequency].filter(Boolean).join(" · ");
  return (
    <div className={styles.cpRow}>
      <span className={cx(base.taskIcon, toneClass("neutral"))}>
        <Icon size={16} variant="stroke" aria-hidden="true" />
      </span>
      <span className={styles.cpRowMain}>
        <span className={styles.cpRowTitle}>{intv.label}</span>
        {meta ? <span className={styles.cpRowMeta}>{meta}</span> : null}
      </span>
      <span className={styles.cpRowAside} aria-hidden="true" />
    </div>
  );
}

/* ----------------------------- overflow sheet ------------------------------ */

/* Everything secondary lives here: Upcoming, Instructions, Details (focus
   evidence / next review / monitoring), History (plan deltas), Past care. */
function CarePlanMoreSheet({
  close,
  plan,
  focus,
  upcoming,
  episodes,
}: {
  close: () => void;
  plan: CarePlan;
  focus: ClinicalFocus | null;
  upcoming: Intervention[];
  episodes: CarePlan[];
}) {
  const instructions = (plan.instructions ?? []).filter((i) => !focus || i.focusId === focus.id);
  const monitoring = focus ? plan.monitoring.filter((m) => m.focusId === focus.id) : plan.monitoring;
  const deltas = plan.deltas ?? [];
  const title = focus ? (focus.shortLabel ?? focus.label) : plan.title;

  return (
    <Sheet title={`${title} · details`} onClose={close} size="full">
      <div className={base.sectionStack}>
        {upcoming.length > 0 ? (
          <section className={base.sectionStack}>
            <span className={base.eyebrow}>Upcoming</span>
            <div className={base.cardGroup}>
              {upcoming.map((i) => (
                <div key={i.id} className={base.summaryRow}>
                  <strong>{i.label}</strong>
                  <small>{[i.precondition, i.due ? `due ${i.due}` : null].filter(Boolean).join(" · ")}</small>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {monitoring.length > 0 ? (
          <section className={base.sectionStack}>
            <span className={base.eyebrow}>Monitoring</span>
            <div className={base.cardGroup}>
              {monitoring.map((m) => (
                <div key={m.id} className={base.summaryRow}>
                  <strong>{m.label}</strong>
                  <small>
                    {[m.latest ? `latest ${m.latest}` : null, m.target ? `target ${m.target}` : null, m.frequency]
                      .filter(Boolean)
                      .join(" · ")}
                  </small>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {instructions.length > 0 ? (
          <section className={base.sectionStack}>
            <span className={base.eyebrow}>Instructions</span>
            <div className={base.cardGroup}>
              {instructions.map((pi) => (
                <div key={pi.id} className={base.summaryRow}>
                  <strong>{pi.label}</strong>
                  {pi.whenToContact ? <small>{pi.whenToContact}</small> : null}
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {focus ? (
          <section className={base.sectionStack}>
            <span className={base.eyebrow}>Details</span>
            <div className={base.cardGroup}>
              {focus.evidence ? (
                <div className={base.summaryRow}>
                  <strong>Evidence</strong>
                  <small>{focus.evidence}</small>
                </div>
              ) : null}
              {focus.reason ? (
                <div className={base.summaryRow}>
                  <strong>Why in plan</strong>
                  <small>{focus.reason}</small>
                </div>
              ) : null}
              {(focus.nextReview ?? plan.nextReview) ? (
                <div className={base.summaryRow}>
                  <strong>Next review</strong>
                  <small>{focus.nextReview ?? plan.nextReview}</small>
                </div>
              ) : null}
              {plan.lastReviewedAt ? (
                <div className={base.summaryRow}>
                  <strong>Last updated</strong>
                  <small>
                    {plan.lastReviewedAt}
                    {plan.lastReviewedBy ? ` by ${plan.lastReviewedBy}` : ""}
                  </small>
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

        {deltas.length > 0 ? (
          <section className={base.sectionStack}>
            <span className={base.eyebrow}>History</span>
            <div className={base.cardGroup}>
              {deltas.map((d) => (
                <div key={d.id} className={base.summaryRow}>
                  <strong>{PLAN_DELTA_LABEL[d.action]} · {d.summary}</strong>
                  <small>{[d.at, d.actor].filter(Boolean).join(" · ")}</small>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {episodes.length > 0 ? (
          <section className={base.sectionStack}>
            <span className={base.eyebrow}>Past care</span>
            <div className={base.cardGroup}>
              {episodes.map((ep) => (
                <ListRow
                  key={ep.id}
                  as="div"
                  title={ep.title}
                  meta={[ep.completionOutcome, ep.source].filter(Boolean).join(" · ")}
                />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </Sheet>
  );
}

export default CarePlanTab;
