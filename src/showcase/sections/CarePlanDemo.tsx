"use client";

/* Care plan showcase — the PR2 presentational surfaces (CareFocusNavigation,
   PlanAttentionList, PlanOutcomeRow, PlanInterventionRow) driven by fixture
   CarePlan / focus / intervention / goal data, one labelled panel per state.

   These components read tone via CSS custom properties scoped under `.cp`, so each
   stage is wrapped in a `.cp` element and the section pulls in CarePlan.css. Data is
   inline + deterministic; callbacks toast so the demo is interactive but inert. */

import { toast } from "sonner";
import {
  CareFocusNavigation,
  PlanAttentionList,
  PlanOutcomeRow,
  PlanInterventionRow,
  goalToOutcome,
  type AttentionCallbacks,
} from "@/features/care-plan/components";
import type {
  CarePlan,
  ClinicalFocus,
  Goal,
  Intervention,
} from "@/features/care-plan/domain";
import { Section, Subsection, Demo, Stack } from "../DemoKit";
import "@/components/CarePlan/CarePlan.css";

/* ------------------------------- fixtures ---------------------------------- */

const RESPONSIBLE = "Dr Dara";

const callbacks: AttentionCallbacks = {
  onCreateOrder: (i) => toast.success(`Order seeded · ${i.label}`),
  onResolveCoverage: (i) => toast(`Coverage path · ${i.label}`),
};

function focus(id: string, label: string, shortLabel: string): ClinicalFocus {
  return { id, label, shortLabel, focusStatus: "active" };
}

function goal(over: Partial<Goal> & Pick<Goal, "id" | "label">): Goal {
  return { type: "quantitative", lifecycle: "active", achievement: "on_track", ...over };
}

function intervention(
  over: Partial<Intervention> & Pick<Intervention, "id" | "kind" | "label" | "status">,
): Intervention {
  return { owner: RESPONSIBLE, focusId: "dm", ...over };
}

/* A minimal-but-valid living plan; individual demos override the slices they show. */
function plan(over: Partial<CarePlan>): CarePlan {
  return {
    id: "plan-1",
    patientId: "pt-1",
    kind: "living",
    title: "Care plan",
    rationale: "",
    status: "active",
    focuses: [],
    goals: [],
    interventions: [],
    monitoring: [],
    reviews: [],
    team: { responsible: RESPONSIBLE, author: RESPONSIBLE },
    version: 1,
    source: "Consultation",
    agreement: "agreed",
    createdAt: "9 May 2026",
    history: [],
    ...over,
  };
}

/* --- focuses (nav) --- */
const DM = focus("dm", "Type 2 diabetes", "Diabetes");
const CKD = focus("ckd", "Chronic kidney disease", "Kidney");
const CVD = focus("cvd", "Cardiovascular risk", "Heart");

/* --- interventions per open-loop state --- */
const DUE: Intervention = intervention({
  id: "i-due",
  kind: "lab",
  label: "Repeat HbA1c (fasting)",
  status: "due",
  due: "21 Jun",
  order: { labKeys: ["hba1c"], rationale: "Glycemic control" },
});
const OVERDUE: Intervention = intervention({
  id: "i-over",
  kind: "imaging",
  label: "Retinopathy screen",
  status: "overdue",
  due: "12 Apr",
  order: { labKeys: ["fundus"], rationale: "Annual screen" },
});
const BLOCKED: Intervention = intervention({
  id: "i-block",
  kind: "lab",
  label: "Urine albumin:creatinine ratio",
  status: "blocked",
  blockReason: "Coverage pre-authorization needed before the lab can run.",
  coverage: "preauth",
});
const WAITING: Intervention = intervention({
  id: "i-wait",
  kind: "follow_up",
  label: "Diabetes review call",
  status: "declined",
  owner: "Patient",
  declineReason: "Patient asked to reschedule after travel.",
});
const IN_PROGRESS: Intervention = intervention({
  id: "i-prog",
  kind: "referral",
  label: "Nephrology referral",
  status: "in_progress",
  owner: "External",
  execution: { kind: "referral", ref: "REF-2204" },
});

/* --- goals / outcomes --- */
const G_ON_TRACK = goal({ id: "g1", label: "HbA1c", latest: "7.4%", target: "<7.0%", achievement: "on_track" });
const G_AT_RISK = goal({ id: "g2", label: "Blood pressure", latest: "148/92", target: "<130/80", achievement: "at_risk" });
const G_ACHIEVED = goal({ id: "g3", label: "LDL cholesterol", latest: "1.6", target: "<1.8 mmol/L", achievement: "achieved" });
const G_WORSENING = goal({ id: "g4", label: "eGFR", latest: "52", target: ">60", achievement: "worsening" });

/* ------------------------------- harnesses --------------------------------- */

/* The focus rail renders only with >=2 active focuses; the parent owns selection,
   so the demos pass a fixed selection (no state needed — they show the rail shape). */
function Nav({ focuses, episodes = [], selected }: {
  focuses: ClinicalFocus[];
  episodes?: CarePlan[];
  selected: string;
}) {
  const p = plan({ focuses });
  return (
    <div className="cp" style={{ width: 280, padding: 0, gap: 0 }}>
      <CareFocusNavigation
        plan={p}
        focuses={focuses}
        episodes={episodes}
        selected={selected}
        onSelect={(k) => toast(`Select · ${k}`)}
      />
    </div>
  );
}

function Attention({ interventions, upToDateReview }: { interventions: Intervention[]; upToDateReview?: string }) {
  return (
    <div className="cp" style={{ width: 520, maxWidth: "100%", padding: 0, gap: 0 }}>
      <PlanAttentionList interventions={interventions} callbacks={callbacks} upToDateReview={upToDateReview} />
    </div>
  );
}

function Outcomes({ goals }: { goals: Goal[] }) {
  return (
    <div className="cp" style={{ width: 520, maxWidth: "100%", padding: 0, gap: 0 }}>
      {goals.map((g) => (
        <PlanOutcomeRow key={g.id} outcome={goalToOutcome(g)} />
      ))}
    </div>
  );
}

function PlanRows({ interventions }: { interventions: Intervention[] }) {
  return (
    <div className="cp" style={{ width: 520, maxWidth: "100%", padding: 0, gap: 0 }}>
      {interventions.map((i) => (
        <PlanInterventionRow
          key={i.id}
          intv={i}
          responsible={RESPONSIBLE}
          action={i.status === "due" ? { label: "Order", onClick: () => toast(`Order · ${i.label}`) } : undefined}
        />
      ))}
    </div>
  );
}

/* Archived episode for the "Past care" rail group. */
const EPISODE: CarePlan = plan({
  id: "ep-1",
  kind: "episode",
  title: "Post-op recovery",
  status: "completed",
  completionOutcome: "Resolved · discharged",
  focuses: [{ ...focus("ep-knee", "Knee arthroplasty recovery", "Knee op"), focusStatus: "archived" }],
});

/* ------------------------------- section ----------------------------------- */

export function CarePlanSection() {
  return (
    <Section
      id="careplan"
      title="Care plan"
      description="The desktop Patient Care Plan surfaces (PR2), driven by fixture data. The focus rail appears only with two or more active focuses; the Next action surface shows one row per open loop (overdue → blocked → due → in progress) and collapses to a quiet 'Up to date' line when nothing is open. Outcome rows pill only on a real signal; plan rows carry at most one status pill."
    >
      <Subsection title="Focus rail (CareFocusNavigation)">
        <Stack gap={20}>
          <Demo label="One focus — nav hidden (the tab opens the single focus directly)">
            <span className="text-13-regular" style={{ color: "var(--text-tertiary)" }}>
              With a single active focus the rail is not rendered; the focus opens directly.
            </span>
          </Demo>
          <Demo label="Multiple focuses — compact rail, single signal per row">
            <Nav focuses={[DM, CKD, CVD]} selected="dm" />
          </Demo>
          <Demo label="Archived / Past care — episode grouped under 'Past care'">
            <Nav focuses={[DM, CKD]} episodes={[EPISODE]} selected="overview" />
          </Demo>
        </Stack>
      </Subsection>

      <Subsection title="Next action (PlanAttentionList)">
        <Stack gap={20}>
          <Demo label="Default focus — a representative mix of open loops">
            <Attention interventions={[OVERDUE, BLOCKED, DUE, IN_PROGRESS]} />
          </Demo>
          <Demo label="Due">
            <Attention interventions={[DUE]} />
          </Demo>
          <Demo label="Overdue">
            <Attention interventions={[OVERDUE]} />
          </Demo>
          <Demo label="Blocked — routes to the coverage path, not ordering">
            <Attention interventions={[BLOCKED]} />
          </Demo>
          <Demo label="Waiting on patient — declined item carries no CTA here">
            <Attention interventions={[WAITING]} />
          </Demo>
          <Demo label="Up to date — quiet line with next review">
            <Attention interventions={[]} upToDateReview="Sep 2026" />
          </Demo>
          <Demo label="Empty — no interventions, no next review">
            <Attention interventions={[]} />
          </Demo>
        </Stack>
      </Subsection>

      <Subsection title="Outcomes (PlanOutcomeRow)">
        <Stack gap={20}>
          <Demo label="Mixed — pill only on a real signal (on-track stays quiet)">
            <Outcomes goals={[G_ON_TRACK, G_AT_RISK, G_WORSENING, G_ACHIEVED]} />
          </Demo>
        </Stack>
      </Subsection>

      <Subsection title="Current plan rows (PlanInterventionRow)">
        <Stack gap={20}>
          <Demo label="One status pill max — foreign owner shown, due CTA on due rows">
            <PlanRows interventions={[DUE, OVERDUE, BLOCKED, WAITING, IN_PROGRESS]} />
          </Demo>
        </Stack>
      </Subsection>
    </Section>
  );
}
