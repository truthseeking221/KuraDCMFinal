/* =============================================================================
   Care Plan domain — PROTOCOL definitions.

   A ProtocolDefinition is the canonical clinical content for a managed condition:
   eligibility, the goals/targets it tracks, the monitoring steps (with cadence),
   and the review cadence. This is the FUTURE single source of protocol content.

   CarePlansView (desktop Care Programs) will migrate onto these in PR4 — it is NOT
   touched now. addFocusFromProtocol() in commands.ts already reads these to build a
   ClinicalFocus enrolledVia 'protocol' + its interventions.

   Pure data + types only. No store, no I/O, no nondeterminism.
   ============================================================================= */

import type { GoalAchievement, GoalType, InterventionKind } from "./types";

export type ProtocolKey = "t2dm" | "ckd" | "htn" | "lipid_cvd";

/* A target the protocol tracks — becomes a Goal when a focus is enrolled. */
export type ProtocolTarget = {
  key: string; // stable key within the protocol, e.g. "hba1c"
  label: string;
  goalType: GoalType;
  target?: string;
  unit?: string;
  trendKey?: string; // links to a deltaLabFacts analyte for the spine sparkline
  /* Initial achievement when freshly enrolled and not yet measured. */
  initialAchievement?: GoalAchievement;
  priority?: boolean;
};

/* A monitoring step the protocol mandates — becomes an Intervention (and optionally
   a MonitoringRule) when a focus is enrolled. */
export type ProtocolStep = {
  key: string; // stable key within the protocol, e.g. "repeat-hba1c"
  kind: InterventionKind;
  label: string;
  detail?: string;
  targetKey?: string; // which ProtocolTarget / Goal this step serves
  cadence?: string; // human cadence, e.g. "Every 3 months"
  /* Default owner role for the step when not overridden by the caller. */
  owner?: string;
  /* Seed for an order deep-link when the step is a lab/imaging order. */
  order?: { labKeys: string[]; rationale: string };
  /* A monitored analyte (drives a MonitoringRule when enrolled). */
  monitor?: { trendKey?: string; target?: string; unit?: string; alert?: string };
};

export type ProtocolDefinition = {
  key: ProtocolKey;
  name: string;
  shortLabel: string; // nav label, e.g. "Diabetes"
  coded?: string; // representative ICD-10
  /* Plain-language eligibility — who this protocol is for. */
  eligibility: string;
  targets: ProtocolTarget[];
  steps: ProtocolStep[];
  reviewCadence: string; // e.g. "Every 3 months"
};

const HBA1C_KEY = "GLYCOSYLATED HAEMOGLOBIN (Roche)||Hb A1c % (DCCT/NGSP)";
const CREATININE_KEY = "BIOCHEMISTRY||Creatinine";
const ACR_KEY = "URINE BIOCHEMISTRY (Microalbumin Roche)||Microalbumin/Cre Ratio";
/* Shared so the cholesterol care-loop goal + result match on the same analyte key. */
export const LDL_KEY = "LIPID PROFILE||LDL Cholesterol";

export const PROTOCOL_T2DM: ProtocolDefinition = {
  key: "t2dm",
  name: "Type 2 diabetes",
  shortLabel: "Diabetes",
  coded: "E11.9",
  eligibility: "Confirmed type 2 diabetes (HbA1c ≥ 6.5% or on glucose-lowering therapy).",
  targets: [
    {
      key: "hba1c",
      label: "Lower HbA1c below 7.5%",
      goalType: "quantitative",
      target: "< 7.5%",
      unit: "%",
      trendKey: HBA1C_KEY,
      initialAchievement: "not_assessable",
      priority: true,
    },
  ],
  steps: [
    {
      key: "repeat-hba1c",
      kind: "lab",
      label: "Repeat HbA1c",
      detail: "Confirm trend before adjusting therapy.",
      targetKey: "hba1c",
      cadence: "Every 3 months",
      owner: "Responsible clinician",
      order: { labKeys: [HBA1C_KEY], rationale: "Diabetes control · repeat HbA1c to confirm trend." },
      monitor: { trendKey: HBA1C_KEY, target: "< 7.5%", unit: "%", alert: "Review early if > 8.5%" },
    },
    {
      key: "foot-check",
      kind: "monitoring",
      label: "Annual diabetic foot check",
      targetKey: "hba1c",
      cadence: "Yearly",
      owner: "Clinic nurse",
    },
    {
      key: "nutrition",
      kind: "education",
      label: "Nutrition counselling",
      detail: "Carbohydrate management session.",
      targetKey: "hba1c",
      owner: "Clinic nurse",
    },
  ],
  reviewCadence: "Every 3 months",
};

export const PROTOCOL_CKD: ProtocolDefinition = {
  key: "ckd",
  name: "Chronic kidney disease",
  shortLabel: "Renal",
  coded: "N18.3",
  eligibility: "eGFR < 60 or albuminuria on two occasions ≥ 3 months apart.",
  targets: [
    {
      key: "egfr",
      label: "Keep eGFR from declining past the agreed threshold",
      goalType: "maintenance",
      target: "No decline > 5/yr",
      unit: "mL/min",
      trendKey: CREATININE_KEY,
      initialAchievement: "not_assessable",
      priority: true,
    },
  ],
  steps: [
    {
      key: "renal-panel",
      kind: "lab",
      label: "Creatinine + urine albumin",
      detail: "Repeat renal panel to confirm trajectory.",
      targetKey: "egfr",
      cadence: "Every 3 months",
      owner: "Responsible clinician",
      order: {
        labKeys: [CREATININE_KEY, ACR_KEY],
        rationale: "Renal risk · creatinine + urine albumin to confirm CKD trajectory.",
      },
      monitor: { trendKey: ACR_KEY, target: "< 30 mg/g", unit: "mg/g" },
    },
    {
      key: "nephro-referral",
      kind: "referral",
      label: "Nephrology referral",
      detail: "If eGFR falls below the agreed threshold.",
      targetKey: "egfr",
      owner: "Responsible clinician",
    },
  ],
  reviewCadence: "Every 3 months",
};

export const PROTOCOL_HTN: ProtocolDefinition = {
  key: "htn",
  name: "Hypertension",
  shortLabel: "Hypertension",
  coded: "I10",
  eligibility: "Clinic BP ≥ 140/90 confirmed, or on antihypertensive therapy.",
  targets: [
    {
      key: "bp",
      label: "Blood pressure in target range",
      goalType: "maintenance",
      target: "< 140/90",
      initialAchievement: "not_assessable",
    },
  ],
  steps: [
    {
      key: "home-bp",
      kind: "home_measurement",
      label: "Home blood-pressure log",
      targetKey: "bp",
      cadence: "Daily",
      owner: "Patient",
    },
    {
      key: "med-review",
      kind: "medication_review",
      label: "Review antihypertensive at next visit",
      targetKey: "bp",
      owner: "Responsible clinician",
    },
  ],
  reviewCadence: "Every 3 months",
};

export const PROTOCOL_LIPID_CVD: ProtocolDefinition = {
  key: "lipid_cvd",
  name: "Lipid / cardiovascular risk",
  shortLabel: "Lipids",
  coded: "E78.5",
  eligibility: "Elevated cardiovascular risk (established ASCVD, diabetes, or LDL above target).",
  targets: [
    {
      key: "ldl",
      label: "LDL cholesterol at target",
      goalType: "quantitative",
      target: "< 70 mg/dL",
      unit: "mg/dL",
      trendKey: LDL_KEY,
      initialAchievement: "not_assessable",
      priority: true,
    },
  ],
  steps: [
    {
      key: "lipid-panel",
      kind: "lab",
      label: "Repeat lipid profile",
      detail: "Confirm LDL response to therapy.",
      targetKey: "ldl",
      cadence: "Every 6 months",
      owner: "Responsible clinician",
      order: { labKeys: [LDL_KEY], rationale: "CVD risk · repeat lipid profile to confirm LDL response." },
      monitor: { trendKey: LDL_KEY, target: "< 70 mg/dL", unit: "mg/dL" },
    },
    {
      key: "statin-review",
      kind: "medication_review",
      label: "Statin therapy review",
      targetKey: "ldl",
      owner: "Responsible clinician",
    },
  ],
  reviewCadence: "Every 6 months",
};

export const PROTOCOLS: Record<ProtocolKey, ProtocolDefinition> = {
  t2dm: PROTOCOL_T2DM,
  ckd: PROTOCOL_CKD,
  htn: PROTOCOL_HTN,
  lipid_cvd: PROTOCOL_LIPID_CVD,
};

export function protocolByKey(key: string): ProtocolDefinition | null {
  return (PROTOCOLS as Record<string, ProtocolDefinition | undefined>)[key] ?? null;
}
