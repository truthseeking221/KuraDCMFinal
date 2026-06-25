"use client";

/* =============================================================================
   Care Plan domain — STORE (in-session module store + React hooks + writers).

   No backend — a module store keyed by patientId, surviving tab mount/unmount
   within the session. Seeds are deterministic (fixed dates) so SSR and first client
   render match. The store owns ALL nondeterminism (nowLabel / hid / sequence) so the
   selector + status + protocol layers can stay pure.

   This file keeps the original imperative writers (appendPlanDelta, addMedicationFor,
   setMedVerificationFor) and the hooks (useCarePlans, useMedications). The richer
   command layer (commands.ts) is built on the low-level mutators re-exported here.
   ============================================================================= */

import { useCallback, useSyncExternalStore } from "react";

import { PROTOCOLS, type ProtocolDefinition, type ProtocolKey } from "./protocol";
import {
  carePlanSummaryFrom,
  livingPlanOf,
  selectCrossPatientPlanWorkFrom,
  selectNextPlanActionFrom,
  selectPlanChangesSinceLastReviewFrom,
  selectProgramCohortFrom,
  type CarePlanSummary,
  type CrossPatientPlanItem,
  type NextPlanAction,
  type PlanChangesSinceReview,
  type ProgramCohortMember,
} from "./selectors";
import { nextDueFromCadence } from "./status";
import type {
  CarePlan,
  ClinicalFocus,
  Goal,
  GoalAchievement,
  HistoryEntry,
  Intervention,
  InterventionStatus,
  Medication,
  MedVerification,
  PlanDelta,
  Review,
} from "./types";

/* --------------------------------- seed ------------------------------------ */
/* Sokha Chann — the spec's worked example. HbA1c lab key matches deltaLabResults. */

const HBA1C_KEY = "GLYCOSYLATED HAEMOGLOBIN (Roche)||Hb A1c % (DCCT/NGSP)";
const CREATININE_KEY = "BIOCHEMISTRY||Creatinine";
const ACR_KEY = "URINE BIOCHEMISTRY (Microalbumin Roche)||Microalbumin/Cre Ratio";

function seedSokha(patientId: string): CarePlan[] {
  return [
    /* ONE Living Care Plan — three active Care Focus strands (Diabetes, Renal,
       Hypertension). Each strand was added by a consultation, not a parallel plan. */
    {
      id: "cp-living",
      patientId,
      kind: "living",
      title: "Living care plan",
      type: "Longitudinal",
      rationale:
        "Coordinated long-term plan across Sokha's active conditions — glycaemic control, renal protection and blood-pressure management.",
      primary: true,
      status: "active",
      priority: "warning",
      focuses: [
        {
          id: "f-dm",
          label: "Type 2 diabetes — suboptimal control",
          shortLabel: "Diabetes",
          coded: "E11.65",
          status: "Active",
          evidence: "HbA1c 9.1% (15 Jan), latest 8.3% (21 May)",
          reason: "Glycaemic control above target; albuminuria present.",
          focusStatus: "active",
          enrolledAt: "15 Jan 2026",
          enrolledVia: "consultation",
          nextReview: "21 Aug 2026",
          lastReviewedAt: "21 May 2026",
        },
        {
          id: "f-ckd",
          label: "CKD stage 3 with albuminuria",
          shortLabel: "Renal",
          coded: "N18.3",
          status: "Active",
          evidence: "Creatinine 3.86 mg/dL ↑ · Microalbumin/Cr 155.5 mg/g ↑ (21 May)",
          reason: "Renal markers above reference; diabetic nephropathy risk.",
          focusStatus: "active",
          enrolledAt: "21 May 2026",
          enrolledVia: "consultation",
          nextReview: "18 Jul 2026",
          lastReviewedAt: "21 May 2026",
        },
        {
          id: "f-htn",
          label: "Hypertension — above target",
          shortLabel: "Hypertension",
          coded: "I10",
          status: "Newly added",
          evidence: "Recent average 152/94",
          reason: "BP above target; cardiovascular risk with diabetes.",
          focusStatus: "active",
          enrolledAt: "21 May 2026",
          enrolledVia: "consultation",
        },
      ],
      goals: [
        {
          id: "g-hba1c",
          focusId: "f-dm",
          label: "Lower HbA1c below 7.5%",
          type: "quantitative",
          baseline: "9.1%",
          target: "< 7.5%",
          unit: "%",
          latest: "8.3%",
          latestDate: "21 May 2026",
          trendKey: HBA1C_KEY,
          targetDate: "Nov 2026",
          owner: "Dr Dara",
          lifecycle: "active",
          achievement: "improving",
          priority: true,
          source: "Kura Lab · verified",
        },
        {
          id: "g-understand",
          focusId: "f-dm",
          label: "Sokha understands the test + follow-up schedule",
          type: "patient_stated",
          owner: "Sokha",
          lifecycle: "active",
          achievement: "on_track",
        },
        {
          id: "g-egfr",
          focusId: "f-ckd",
          label: "Keep eGFR from declining past the agreed threshold",
          type: "maintenance",
          baseline: "eGFR 38",
          target: "No decline > 5/yr",
          unit: "mL/min",
          latest: "Creatinine 3.86 ↑",
          latestDate: "21 May 2026",
          trendKey: CREATININE_KEY,
          owner: "Dr Dara",
          lifecycle: "active",
          achievement: "at_risk",
          priority: true,
          source: "Kura Lab · verified",
        },
        {
          id: "g-renal-screen",
          focusId: "f-ckd",
          label: "Complete renal screening within 8 weeks",
          type: "milestone",
          target: "Creatinine + urine albumin",
          targetDate: "18 Jul 2026",
          owner: "Dr Dara",
          lifecycle: "active",
          achievement: "not_assessable",
        },
        {
          id: "g-bp",
          focusId: "f-htn",
          label: "Blood pressure in target range",
          type: "maintenance",
          baseline: "152/94",
          target: "< 140/90",
          owner: "Dr Dara",
          lifecycle: "planned",
          achievement: "not_assessable",
        },
      ],
      interventions: [
        {
          id: "i-hba1c",
          kind: "lab",
          label: "Repeat HbA1c after 3 months",
          detail: "Confirm trend before adjusting therapy.",
          goalId: "g-hba1c",
          focusId: "f-dm",
          owner: "Dr Dara",
          due: "21 Aug 2026",
          frequency: "Every 3 months",
          status: "due",
          agreement: "agreed",
          coverage: "covered",
          order: { labKeys: [HBA1C_KEY], rationale: "Diabetes control · repeat HbA1c to confirm trend (baseline 9.1%)." },
        },
        {
          id: "i-nutrition",
          kind: "education",
          label: "Nutrition counselling",
          detail: "Carbohydrate management session.",
          goalId: "g-hba1c",
          focusId: "f-dm",
          owner: "Clinic nurse",
          due: "6 Jun 2026",
          status: "declined",
          agreement: "declined",
          declineReason: "Patient deferred — will reconsider next visit",
        },
        {
          id: "i-followup",
          kind: "follow_up",
          label: "Follow-up consultation after results",
          goalId: "g-hba1c",
          focusId: "f-dm",
          owner: "Dr Dara",
          due: "28 Aug 2026",
          status: "planned",
          precondition: "After repeat HbA1c result is back",
        },
        {
          id: "i-renal-labs",
          kind: "lab",
          label: "Creatinine + urine albumin",
          detail: "Repeat renal panel to confirm trajectory.",
          goalId: "g-renal-screen",
          focusId: "f-ckd",
          owner: "Dr Dara",
          due: "18 Jul 2026",
          status: "blocked",
          blockReason: "Blocked by coverage decision — Forte denied urine albumin",
          coverage: "denied",
          agreement: "agreed",
          order: {
            labKeys: [CREATININE_KEY, ACR_KEY],
            rationale: "Renal risk · creatinine + urine albumin to confirm CKD trajectory.",
          },
        },
        {
          id: "i-nephro",
          kind: "referral",
          label: "Nephrology referral",
          detail: "If eGFR falls below the agreed threshold.",
          goalId: "g-egfr",
          focusId: "f-ckd",
          owner: "Dr Dara",
          status: "planned",
          precondition: "Trigger if eGFR < 30 or rapid decline",
        },
        {
          id: "i-home-bp",
          kind: "home_measurement",
          label: "Home blood-pressure log",
          goalId: "g-bp",
          focusId: "f-htn",
          owner: "Sokha",
          status: "planned",
          agreement: "not_shared",
        },
        {
          id: "i-med-review",
          kind: "medication_review",
          label: "Review antihypertensive at next visit",
          goalId: "g-bp",
          focusId: "f-htn",
          owner: "Dr Dara",
          status: "planned",
        },
      ],
      monitoring: [
        {
          id: "m-hba1c",
          focusId: "f-dm",
          label: "HbA1c",
          trendKey: HBA1C_KEY,
          baseline: "9.1%",
          target: "< 7.5%",
          unit: "%",
          frequency: "Every 3 months",
          latest: "8.3%",
          latestDate: "21 May 2026",
          source: "Kura Lab · verified",
          alert: "Review early if > 8.5%",
        },
        {
          id: "m-creat",
          focusId: "f-ckd",
          label: "Creatinine",
          trendKey: CREATININE_KEY,
          baseline: "—",
          target: "Stable",
          unit: "mg/dL",
          latest: "3.86 ↑",
          latestDate: "21 May 2026",
          source: "Kura Lab · verified",
          alert: "Critical workflow runs independently of plan review",
        },
        {
          id: "m-acr",
          focusId: "f-ckd",
          label: "Microalbumin/Cr ratio",
          trendKey: ACR_KEY,
          target: "< 30 mg/g",
          unit: "mg/g",
          latest: "155.5 ↑",
          latestDate: "21 May 2026",
          source: "Kura Lab · verified",
        },
      ],
      reviews: [
        {
          id: "r-dm-1",
          focusId: "f-dm",
          date: "21 May 2026",
          reviewer: "Dr Dara",
          assessment: "HbA1c improving 9.1% → 8.3%. Not yet at target. Continue plan; repeat in 3 months.",
          changes: "Next review set; nutrition counselling kept open.",
          version: 2,
        },
        {
          id: "r-renal-1",
          focusId: "f-ckd",
          date: "21 May 2026",
          reviewer: "Dr Dara",
          assessment: "Renal markers elevated; albuminuria significant. Repeat panel; consider nephrology if worsening.",
          version: 1,
        },
      ],
      team: { responsible: "Dr Dara", author: "Dr Dara", patient: "Sokha Chann" },
      startDate: "15 Jan 2026",
      nextReview: "18 Jul 2026",
      lastReviewedBy: "Dr Dara",
      lastReviewedAt: "21 May 2026",
      version: 2,
      source: "Consultation · 21 May 2026",
      agreement: "partially_agreed",
      createdAt: "15 Jan 2026",
      history: [
        { id: "h1", at: "15 Jan 2026", actor: "Dr Dara", event: "Living care plan started", detail: "Diabetes focus added" },
        { id: "h2", at: "21 May 2026", actor: "Dr Dara", event: "Review completed", detail: "Diabetes · v1 → v2" },
        { id: "h3", at: "21 May 2026", actor: "Dr Dara", event: "Renal focus added" },
        { id: "h4", at: "21 May 2026", actor: "System", event: "Coverage denied", detail: "Urine albumin — Forte" },
        { id: "h5", at: "21 May 2026", actor: "Dr Dara", event: "Hypertension focus added" },
      ],
      deltas: [
        {
          id: "d-3",
          at: "21 May 2026",
          actor: "Dr Dara",
          action: "follow_up_scheduled",
          focusId: "f-dm",
          summary: "Follow-up consultation after results",
          detail: "Telegram reminder to the patient",
        },
        {
          id: "d-2",
          at: "21 May 2026",
          actor: "Dr Dara",
          action: "referral_created",
          focusId: "f-ckd",
          summary: "Nephrology referral prepared",
          detail: "Triggers if eGFR falls below threshold",
        },
        {
          id: "d-1",
          at: "21 May 2026",
          actor: "Dr Dara",
          action: "lab_ordered",
          focusId: "f-dm",
          interventionId: "i-hba1c",
          summary: "Repeat HbA1c ordered",
          detail: "Confirm trend before adjusting therapy",
        },
      ],
      instructions: [
        {
          id: "pi-dm-1",
          focusId: "f-dm",
          label: "Take Metformin with food, twice a day.",
          whenToContact: "Call the clinic if you have stomach upset that does not settle.",
        },
        {
          id: "pi-dm-2",
          focusId: "f-dm",
          label: "Cut down on sugary drinks and refined carbohydrates.",
        },
        {
          id: "pi-dm-3",
          focusId: "f-dm",
          label: "Return in about 3 months for your repeat HbA1c blood test.",
        },
        {
          id: "pi-ckd-1",
          focusId: "f-ckd",
          label: "Drink water through the day and avoid painkillers like ibuprofen.",
          whenToContact: "Call us if you notice swelling, much less urine, or breathlessness.",
        },
        {
          id: "pi-ckd-2",
          focusId: "f-ckd",
          label: "Keep your kidney blood and urine tests on schedule.",
        },
        {
          id: "pi-htn-1",
          focusId: "f-htn",
          label: "Check your blood pressure at home and write down the readings.",
          whenToContact: "Seek help urgently for severe headache, chest pain or vision changes.",
        },
      ],
    },
    /* Archived episode — a closed past plan kept for history, never a competing
       active plan. Shown under "Archived" in the focus rail, read-only. */
    {
      id: "cp-postop",
      patientId,
      kind: "episode",
      title: "Post-op knee recovery",
      type: "Post-procedure",
      rationale: "Recovery pathway after arthroscopic knee surgery.",
      status: "completed",
      focuses: [
        {
          id: "f-postop",
          label: "Post-arthroscopy recovery",
          shortLabel: "Post-op knee",
          status: "Resolved",
          reason: "6-week recovery pathway.",
          focusStatus: "archived",
        },
      ],
      goals: [
        {
          id: "g-infection",
          focusId: "f-postop",
          label: "No surgical-site infection in 30 days",
          type: "avoidance",
          lifecycle: "completed",
          achievement: "achieved",
          owner: "Dr Dara",
        },
        {
          id: "g-walk",
          focusId: "f-postop",
          label: "Walk 20 minutes without difficulty",
          type: "functional",
          lifecycle: "completed",
          achievement: "achieved",
          owner: "Physiotherapy",
        },
      ],
      interventions: [
        { id: "i-wound", kind: "monitoring", focusId: "f-postop", label: "Wound check at 1 + 2 weeks", owner: "Clinic nurse", status: "completed" },
        { id: "i-physio", kind: "consultation", focusId: "f-postop", label: "Physiotherapy sessions", owner: "Physiotherapy", status: "completed" },
      ],
      monitoring: [],
      reviews: [
        {
          id: "r-postop",
          focusId: "f-postop",
          date: "10 Dec 2025",
          reviewer: "Dr Dara",
          assessment: "Recovery complete; goals achieved. Closing plan.",
          version: 3,
        },
      ],
      team: { responsible: "Dr Dara", author: "Dr Dara", patient: "Sokha Chann" },
      startDate: "1 Nov 2025",
      version: 3,
      source: "Consultation · 1 Nov 2025",
      agreement: "agreed",
      completionOutcome: "Goals achieved",
      createdAt: "1 Nov 2025",
      history: [
        { id: "h1", at: "1 Nov 2025", actor: "Dr Dara", event: "Plan created" },
        { id: "h2", at: "10 Dec 2025", actor: "Dr Dara", event: "Plan completed", detail: "Goals achieved" },
      ],
    },
  ];
}

/* =============================================================================
   ADDITIVE PR4 seed — protocol-enrolled cohorts for Care Programs.

   Sokha's focuses are enrolledVia 'consultation', so selectProgramCohort (which
   matches enrolledVia 'protocol') returns nothing for her — correct, but it would
   leave every program empty. These extra patients each carry ONE living plan with
   a focus enrolledVia 'protocol' so the cohort tables read realistically. Built
   from the shared PROTOCOLS so a seeded focus matches what addFocusFromProtocol
   would create (same protocolKey / goals-per-target / interventions-per-step).

   Purely additive: no change to the store API, the Sokha seed, or store logic. */

export type ProgramPatientProfile = {
  id: string;
  name: string;
  sex: "Male" | "Female";
  age: number;
  dob: string;
  mrn: string;
  phoneMasked: string;
  district: string;
  insurance: string;
};

export const PROGRAM_PATIENT_PROFILES: ProgramPatientProfile[] = [
  {
    id: "dara-pich",
    name: "Dara Pich",
    sex: "Male",
    age: 64,
    dob: "08 Jun 1962",
    mrn: "P-7100",
    phoneMasked: "011 ... 230",
    district: "Sen Sok",
    insurance: "Sokapheap Tep",
  },
  {
    id: "mealea-sok",
    name: "Mealea Sok",
    sex: "Female",
    age: 49,
    dob: "17 Sep 1976",
    mrn: "P-7111",
    phoneMasked: "012 ... 267",
    district: "Chamkar Mon",
    insurance: "Forte (active)",
  },
  {
    id: "visal-nuon",
    name: "Visal Nuon",
    sex: "Male",
    age: 55,
    dob: "04 Apr 1971",
    mrn: "P-7122",
    phoneMasked: "015 ... 304",
    district: "Daun Penh",
    insurance: "Infinity (active)",
  },
  {
    id: "sreymom-sok",
    name: "Sreymom Sok",
    sex: "Female",
    age: 52,
    dob: "21 Jan 1974",
    mrn: "P-7133",
    phoneMasked: "016 ... 341",
    district: "Russey Keo",
    insurance: "Sokapheap Tep",
  },
  {
    id: "sovann-tep",
    name: "Sovann Tep",
    sex: "Male",
    age: 61,
    dob: "11 Nov 1965",
    mrn: "P-7144",
    phoneMasked: "017 ... 378",
    district: "Mean Chey",
    insurance: "Self-pay",
  },
  {
    id: "chenda-lim",
    name: "Chenda Lim",
    sex: "Female",
    age: 47,
    dob: "30 Mar 1979",
    mrn: "P-7155",
    phoneMasked: "018 ... 415",
    district: "Boeng Keng Kang",
    insurance: "Forte (active)",
  },
  {
    id: "rithy-veng",
    name: "Rithy Veng",
    sex: "Male",
    age: 59,
    dob: "02 Aug 1967",
    mrn: "P-7166",
    phoneMasked: "019 ... 452",
    district: "Dangkao",
    insurance: "Infinity (active)",
  },
];

const PROGRAM_PATIENT_PROFILE_BY_ID: Record<string, ProgramPatientProfile> = Object.fromEntries(
  PROGRAM_PATIENT_PROFILES.map((profile) => [profile.id, profile]),
) as Record<string, ProgramPatientProfile>;

export function programPatientProfile(patientId: string): ProgramPatientProfile | null {
  return PROGRAM_PATIENT_PROFILE_BY_ID[patientId] ?? null;
}

/* Name lookup for cohort rows (patientId → display name). Falls back to the id
   so a not-yet-named patient still renders. */
export function programPatientName(patientId: string): string {
  return programPatientProfile(patientId)?.name ?? patientId;
}

/* How a seeded program focus reads — drives the cohort's at-risk + open-loop
   columns deterministically. */
type SeedFocusShape = "at_risk" | "due" | "on_track";

type ProgramSeedSpec = {
  patientId: string;
  protocolKey: ProtocolKey;
  enrolledAt: string;
  nextReview: string;
  shape: SeedFocusShape;
};

const ACHIEVEMENT_BY_SHAPE: Record<SeedFocusShape, GoalAchievement> = {
  at_risk: "at_risk",
  due: "improving",
  on_track: "on_track",
};

/* Intervention status for the FIRST step by shape (the rest follow as planned),
   so a cohort spans on-track / due / overdue without store-side recompute. */
const FIRST_STEP_STATUS_BY_SHAPE: Record<SeedFocusShape, InterventionStatus> = {
  at_risk: "overdue",
  due: "due",
  on_track: "completed",
};

function seedProgramPlan(spec: ProgramSeedSpec): CarePlan {
  const def = PROTOCOLS[spec.protocolKey];
  const name = programPatientName(spec.patientId);
  const focusId = `f-${def.key}`;
  const responsible = "Dr Dara";

  const goalIdByTarget = new Map<string, string>();
  const goals: Goal[] = def.targets.map((t) => {
    const goalId = `g-${def.key}-${t.key}`;
    goalIdByTarget.set(t.key, goalId);
    return {
      id: goalId,
      focusId,
      label: t.label,
      type: t.goalType,
      target: t.target,
      unit: t.unit,
      trendKey: t.trendKey,
      owner: responsible,
      lifecycle: "active",
      achievement: ACHIEVEMENT_BY_SHAPE[spec.shape],
      priority: t.priority,
    };
  });

  const interventions: Intervention[] = def.steps.map((s, i) => ({
    id: `i-${def.key}-${s.key}`,
    kind: s.kind,
    label: s.label,
    detail: s.detail,
    focusId,
    goalId: s.targetKey ? goalIdByTarget.get(s.targetKey) : undefined,
    owner: s.owner ?? responsible,
    due: nextDueFromCadence(s.cadence, spec.enrolledAt),
    frequency: s.cadence,
    status: i === 0 ? FIRST_STEP_STATUS_BY_SHAPE[spec.shape] : "planned",
    order: s.order,
  }));

  const focus: ClinicalFocus = {
    id: focusId,
    label: def.name,
    shortLabel: def.shortLabel,
    coded: def.coded,
    status: "Active",
    reason: def.eligibility,
    focusStatus: "active",
    enrolledAt: spec.enrolledAt,
    enrolledVia: "protocol",
    protocolKey: def.key,
    protocolName: def.name,
    nextReview: spec.nextReview,
    lastReviewedAt: spec.enrolledAt,
  };

  return {
    id: "cp-living",
    patientId: spec.patientId,
    kind: "living",
    title: "Living care plan",
    type: "Longitudinal",
    rationale: `Protocol-managed plan for ${name} — enrolled in the ${def.name} program.`,
    primary: true,
    status: "active",
    priority: spec.shape === "at_risk" ? "danger" : spec.shape === "due" ? "warning" : "success",
    focuses: [focus],
    goals,
    interventions,
    monitoring: [],
    reviews: [],
    team: { responsible, author: responsible, patient: name },
    startDate: spec.enrolledAt,
    nextReview: spec.nextReview,
    lastReviewedBy: responsible,
    lastReviewedAt: spec.enrolledAt,
    version: 1,
    source: `Protocol enrolment · ${spec.enrolledAt}`,
    agreement: "agreed",
    createdAt: spec.enrolledAt,
    history: [
      { id: "h1", at: spec.enrolledAt, actor: responsible, event: "Living care plan started", detail: `${def.name} program` },
    ],
  };
}

/* Mint an empty living plan for a patient who has none yet — the create-first
   path behind the chart's "Add care focus" and any first clinical action. The
   caller fills focuses/goals/interventions; this just gives a valid active shell. */
export function freshLivingPlan(patientId: string, patientName?: string): CarePlan {
  const started = nowLabel();
  return {
    id: "cp-living",
    patientId,
    kind: "living",
    title: "Living care plan",
    type: "Longitudinal",
    rationale: "Plan started from the patient chart.",
    primary: true,
    status: "active",
    priority: "neutral",
    focuses: [],
    goals: [],
    interventions: [],
    monitoring: [],
    reviews: [],
    team: { responsible: "Dr Dara", author: "Dr Dara", patient: patientName ?? "Patient" },
    startDate: started,
    version: 1,
    source: `Started from chart · ${started}`,
    agreement: "agreed",
    createdAt: started,
    history: [{ id: hid(), at: started, actor: "Dr Dara", event: "Living care plan started" }],
  };
}

const PROGRAM_SEED_SPECS: ProgramSeedSpec[] = [
  { patientId: "dara-pich", protocolKey: "t2dm", enrolledAt: "12 Feb 2026", nextReview: "12 May 2026", shape: "at_risk" },
  { patientId: "sovann-tep", protocolKey: "t2dm", enrolledAt: "3 Mar 2026", nextReview: "3 Jun 2026", shape: "due" },
  { patientId: "sreymom-sok", protocolKey: "ckd", enrolledAt: "20 Jan 2026", nextReview: "20 Apr 2026", shape: "at_risk" },
  { patientId: "rithy-veng", protocolKey: "ckd", enrolledAt: "8 Apr 2026", nextReview: "8 Jul 2026", shape: "on_track" },
  { patientId: "mealea-sok", protocolKey: "htn", enrolledAt: "14 Feb 2026", nextReview: "14 May 2026", shape: "due" },
  { patientId: "visal-nuon", protocolKey: "lipid_cvd", enrolledAt: "5 Mar 2026", nextReview: "5 Sep 2026", shape: "on_track" },
  { patientId: "chenda-lim", protocolKey: "lipid_cvd", enrolledAt: "1 Apr 2026", nextReview: "1 Oct 2026", shape: "due" },
];

const PROGRAM_SEED_BY_PATIENT: Record<string, ProgramSeedSpec> = Object.fromEntries(
  PROGRAM_SEED_SPECS.map((s) => [s.patientId, s]),
);

/* Patients that have a Care Programs seed (used by CarePlansView to pre-warm the
   snapshot the cohort selector reads). Stable order for a deterministic UI. */
export const PROGRAM_SEED_PATIENT_IDS: string[] = PROGRAM_SEED_SPECS.map((s) => s.patientId);

function seedCarePlans(patientId: string): CarePlan[] {
  if (patientId === "sokha-chan") return seedSokha(patientId);
  const program = PROGRAM_SEED_BY_PATIENT[patientId];
  if (program) return [seedProgramPlan(program)];
  return [];
}

/* ------------------------------- store ------------------------------------- */

const stores = new Map<string, CarePlan[]>();
const listeners = new Set<() => void>();
let protocolDefinitions: Record<ProtocolKey, ProtocolDefinition> = { ...PROTOCOLS };

/* Lazily seeds, never emits. Exported (internal) so the command layer can read +
   write the same store without re-deriving the seeding logic. */
export function ensure(patientId: string): CarePlan[] {
  let plans = stores.get(patientId);
  if (!plans) {
    plans = seedCarePlans(patientId);
    stores.set(patientId, plans);
  }
  return plans;
}

export function emit(): void {
  for (const l of listeners) l();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/* Protocol definitions are session-scoped domain state: Care Programs can publish
   a new draft, and patient-chart enrolment should immediately read that same
   definition. Existing enrolled plans stay unchanged. */
export function getProtocolDefinitions(): Record<ProtocolKey, ProtocolDefinition> {
  return protocolDefinitions;
}

export function getProtocolDefinition(key: ProtocolKey): ProtocolDefinition | null {
  return protocolDefinitions[key] ?? null;
}

export function updateProtocolDefinition(
  key: ProtocolKey,
  patch: Pick<ProtocolDefinition, "eligibility" | "reviewCadence">,
): void {
  protocolDefinitions = {
    ...protocolDefinitions,
    [key]: {
      ...protocolDefinitions[key],
      ...patch,
    },
  };
  emit();
}

export function useProtocolDefinitions(): Record<ProtocolKey, ProtocolDefinition> {
  return useSyncExternalStore(subscribe, getProtocolDefinitions, getProtocolDefinitions);
}

export function nowLabel(): string {
  try {
    return new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return "Today";
  }
}

let seq = 0;
/* Monotonic id source — the store's single home for nondeterminism. */
export function nextSeqId(prefix: string): string {
  return `${prefix}-${(seq += 1)}-${Math.round(performance.now())}`;
}

export function hid(): string {
  return `h${(seq += 1)}-${Math.round(performance.now())}`;
}

/* Read-only view of the full store snapshot for cross-patient selectors. */
export function snapshotAllPlans(): ReadonlyMap<string, CarePlan[]> {
  return stores;
}

/* Replace one patient's plans + emit. */
export function setPlans(patientId: string, plans: CarePlan[]): void {
  stores.set(patientId, plans);
  emit();
}

export function update(patientId: string, planId: string, fn: (plan: CarePlan) => CarePlan): void {
  const plans = ensure(patientId).map((p) => (p.id === planId ? fn(p) : p));
  stores.set(patientId, plans);
  emit();
}

export function withHistory(plan: CarePlan, event: string, detail?: string, actor = "Dr Dara"): CarePlan {
  const entry: HistoryEntry = { id: hid(), at: nowLabel(), actor, event, detail };
  return { ...plan, history: [...plan.history, entry] };
}

/* Imperative (non-hook) writer for the Plan Delta stream — called from clinical
   flows (order lab, sign Rx, refer, schedule follow-up) so the plan accumulates from
   the doctor's work, never re-typed into the plan. No-ops when the patient has no
   active living plan; never auto-creates one. Mutates the store + emits OUTSIDE the
   React render (call it from event handlers, not during render). */
export function appendPlanDelta(patientId: string, delta: Omit<PlanDelta, "id" | "at">): void {
  const plans = ensure(patientId);
  const living = livingPlanOf(plans);
  if (!living || living.status !== "active") return;
  const entry: PlanDelta = { ...delta, id: nextSeqId("d"), at: nowLabel() };
  const next = plans.map((p) => (p.id === living.id ? { ...p, deltas: [entry, ...(p.deltas ?? [])] } : p));
  stores.set(patientId, next);
  emit();
}

/* =============================================================================
   Medications — separate module store, same patientId key.
   ============================================================================= */

const medStores = new Map<string, Medication[]>();

function seedMeds(patientId: string): Medication[] {
  if (patientId !== "sokha-chan") return [];
  return [
    {
      id: "med-metformin",
      patientId,
      drug: "Metformin",
      dose: "500 mg",
      frequency: "Twice daily",
      route: "Oral",
      indication: "Type 2 diabetes",
      focusId: "f-dm",
      source: "kura_prescribed",
      verification: "confirmed",
      verifiedBy: "Dr Dara",
      verifiedAt: "15 Jan 2026",
      addedAt: "15 Jan 2026",
      rxRef: "RX-DM-001",
    },
    {
      id: "med-amlodipine",
      patientId,
      drug: "Amlodipine",
      dose: "5 mg",
      frequency: "Once daily",
      route: "Oral",
      indication: "Hypertension",
      focusId: "f-htn",
      source: "external_clinician",
      verification: "confirmed",
      verifiedBy: "Dr Dara",
      verifiedAt: "21 May 2026",
      addedAt: "2024",
    },
    {
      id: "med-herbal",
      patientId,
      drug: "Traditional herbal tonic",
      frequency: "As needed",
      indication: "Patient-reported supplement",
      source: "patient_reported",
      verification: "unverified",
      addedAt: "21 May 2026",
    },
  ];
}

/* Lazily seeds the meds store; exported (internal) for the command layer. */
export function ensureMeds(patientId: string): Medication[] {
  let meds = medStores.get(patientId);
  if (!meds) {
    meds = seedMeds(patientId);
    medStores.set(patientId, meds);
  }
  return meds;
}

/* Add a medication object. Dedupes on drug+dose so a re-signed Rx doesn't double. */
export function addMedicationFor(
  patientId: string,
  med: Omit<Medication, "id" | "patientId" | "addedAt"> & { addedAt?: string },
): void {
  const meds = ensureMeds(patientId);
  const key = `${med.drug.toLowerCase()}|${(med.dose ?? "").toLowerCase()}`;
  if (meds.some((m) => `${m.drug.toLowerCase()}|${(m.dose ?? "").toLowerCase()}` === key)) return;
  const entry: Medication = { ...med, id: nextSeqId("med"), patientId, addedAt: med.addedAt ?? nowLabel() };
  medStores.set(patientId, [entry, ...meds]);
  emit();
}

/* Change ONLY the verification dimension; source is immutable (a confirmed
   patient-reported med stays patient-reported). */
export function setMedVerificationFor(patientId: string, medId: string, verification: MedVerification): void {
  const meds = ensureMeds(patientId);
  const next = meds.map((m) =>
    m.id === medId ? { ...m, verification, verifiedBy: "Dr Dara", verifiedAt: nowLabel() } : m,
  );
  medStores.set(patientId, next);
  emit();
}

export function useMedications(patientId: string): {
  meds: Medication[];
  setVerification: (medId: string, verification: MedVerification) => void;
} {
  const getSnapshot = useCallback(() => ensureMeds(patientId), [patientId]);
  const meds = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const setVerification = useCallback(
    (medId: string, verification: MedVerification) => setMedVerificationFor(patientId, medId, verification),
    [patientId],
  );
  return { meds, setVerification };
}

/* ----------------------- store-bound selector conveniences ----------------- */

/* Read-only roll-up for surfaces OUTSIDE the Care plan tab — the chart Summary
   card, the Patients worklist next-action, Home "Needs attention". Reads the
   single Living Care Plan directly (lazily seeds, never emits), so other tabs see
   the same truth the tab manages. */
export function carePlanSummaryFor(patientId: string): CarePlanSummary {
  return carePlanSummaryFrom(ensure(patientId));
}

export function selectNextPlanAction(patientId: string, focusId: string): NextPlanAction {
  return selectNextPlanActionFrom(ensure(patientId), focusId);
}

export function selectCrossPatientPlanWork(): CrossPatientPlanItem[] {
  return selectCrossPatientPlanWorkFrom(snapshotAllPlans());
}

export function selectProgramCohort(protocolKey: string): ProgramCohortMember[] {
  return selectProgramCohortFrom(snapshotAllPlans(), protocolKey);
}

export function selectPlanChangesSinceLastReview(patientId: string): PlanChangesSinceReview {
  return selectPlanChangesSinceLastReviewFrom(ensure(patientId));
}

export type CarePlanActions = {
  activate: (planId: string) => void;
  pause: (planId: string, reason: string, resumeCondition?: string) => void;
  resume: (planId: string) => void;
  complete: (planId: string, outcome: string) => void;
  discontinue: (planId: string, reason: string) => void;
  markError: (planId: string) => void;
  recordReview: (planId: string, assessment: string) => void;
  setInterventionStatus: (planId: string, interventionId: string, status: InterventionStatus) => void;
  linkOrder: (planId: string, interventionId: string, ref: string) => void;
};

export function useCarePlans(patientId: string): { plans: CarePlan[]; actions: CarePlanActions } {
  const getSnapshot = useCallback(() => ensure(patientId), [patientId]);
  const plans = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const activate = useCallback(
    (planId: string) =>
      update(patientId, planId, (p) =>
        withHistory(
          { ...p, status: "active", startDate: p.startDate ?? nowLabel() },
          "Plan activated",
          `v${p.version}`,
        ),
      ),
    [patientId],
  );

  const pause = useCallback(
    (planId: string, reason: string, resumeCondition?: string) =>
      update(patientId, planId, (p) =>
        withHistory({ ...p, status: "on_hold", holdReason: reason, resumeCondition }, "Plan paused", reason),
      ),
    [patientId],
  );

  const resume = useCallback(
    (planId: string) =>
      update(patientId, planId, (p) =>
        withHistory({ ...p, status: "active", holdReason: undefined, resumeCondition: undefined }, "Plan resumed"),
      ),
    [patientId],
  );

  const complete = useCallback(
    (planId: string, outcome: string) =>
      update(patientId, planId, (p) =>
        withHistory({ ...p, status: "completed", completionOutcome: outcome }, "Plan completed", outcome),
      ),
    [patientId],
  );

  const discontinue = useCallback(
    (planId: string, reason: string) =>
      update(patientId, planId, (p) =>
        withHistory({ ...p, status: "discontinued", completionOutcome: reason }, "Plan discontinued", reason),
      ),
    [patientId],
  );

  const markError = useCallback(
    (planId: string) =>
      update(patientId, planId, (p) => withHistory({ ...p, status: "entered_in_error" }, "Marked entered in error")),
    [patientId],
  );

  const recordReview = useCallback(
    (planId: string, assessment: string) =>
      update(patientId, planId, (p) => {
        const version = p.version + 1;
        const review: Review = {
          id: `r-${version}-${hid()}`,
          date: nowLabel(),
          reviewer: p.team.responsible,
          assessment,
          version,
        };
        return withHistory(
          {
            ...p,
            version,
            reviews: [review, ...p.reviews],
            lastReviewedAt: nowLabel(),
            lastReviewedBy: p.team.responsible,
          },
          "Review completed",
          `v${p.version} → v${version}`,
        );
      }),
    [patientId],
  );

  const setInterventionStatus = useCallback(
    (planId: string, interventionId: string, status: InterventionStatus) =>
      update(patientId, planId, (p) => ({
        ...p,
        interventions: p.interventions.map((i) => (i.id === interventionId ? { ...i, status } : i)),
      })),
    [patientId],
  );

  const linkOrder = useCallback(
    (planId: string, interventionId: string, ref: string) =>
      update(patientId, planId, (p) =>
        withHistory(
          {
            ...p,
            interventions: p.interventions.map((i) =>
              i.id === interventionId
                ? { ...i, status: "in_progress", execution: { kind: "order", ref, placedAt: nowLabel() } }
                : i,
            ),
          },
          "Order created from intervention",
          ref,
        ),
      ),
    [patientId],
  );

  return {
    plans,
    actions: {
      activate,
      pause,
      resume,
      complete,
      discontinue,
      markError,
      recordReview,
      setInterventionStatus,
      linkOrder,
    },
  };
}
