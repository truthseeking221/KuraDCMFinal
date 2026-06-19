"use client";

/* Mobile chart + roster fixtures — real-shaped, coherent with the desktop chart.

   The roster decorates BOOKING_PATIENTS with worklist columns (identity,
   attention, context, last activity, next action) and urgency-sorts. Chart
   HEADERS resolve per patient (getChartHeader); the chart BODY is the canonical
   rich fixture (documented desktop convention — every chart resolves to the
   one canonical body so the demo stays coherent). Care-gap rows reference
   deltaLabFacts; lab preview rows derive from getLabHistoryPreview. */

import {
  BOOKING_PATIENTS,
  bookingPatientById,
  type BookingPatient,
} from "@/components/OrderDraft/bookingSeeds";
import { LOOKUP_DEMOGRAPHICS } from "@/components/OrderDraft/identityGraph";
import { getLabHistoryPreview, type LabPreviewEntry } from "@/components/ui/LabHistory";
import { deltaLabFacts } from "@/data/deltaLabResults";
import type { Tone } from "../components/primitives";

/* ---------------------------------------------------------------- Badge ---- */

export type Badge = {
  label: string;
  tone?: Tone;
  dashed?: boolean;
  icon?: "self-reported" | "verified" | "alert";
};

/* --------------------------------------------------------------- Roster ---- */

export type Acuity = "urgent" | "watch" | "stable";

export type RosterPatient = {
  id: string;
  name: string;
  khmerName?: string;
  identity: string; /* "54F · P-9134" */
  attention: string; /* "Recent abnormal labs" */
  attentionTone: Tone;
  context: string; /* "T2DM · HTN · CKD stage 3" */
  lastActivity: string; /* "Seen 12d ago" */
  nextAction: string; /* "Review abnormal result" */
  labsBack: boolean;
  acuity: Acuity;
  conditionCodes: string[];
};

/* Per-patient clinical decoration. Patients not listed get a stable default so
   the whole BOOKING_PATIENTS queue renders coherently. */
type RosterDecoration = {
  attention: string;
  attentionTone: Tone;
  context: string;
  lastActivity: string;
  nextAction: string;
  labsBack: boolean;
  acuity: Acuity;
  conditionCodes: string[];
  khmerName?: string;
};

const ROSTER_DECORATIONS: Record<string, RosterDecoration> = {
  "sokha-chan": {
    attention: "Recent abnormal labs",
    attentionTone: "danger",
    context: "T2DM · HTN · CKD stage 3",
    lastActivity: "Seen 12d ago",
    nextAction: "Review abnormal result",
    labsBack: true,
    acuity: "urgent",
    conditionCodes: ["E11.65", "I10", "N18.3"],
    khmerName: "សុខា ចាន់",
  },
  "sreymom-sok": {
    attention: "Recent abnormal labs",
    attentionTone: "danger",
    context: "Pregnancy · Gestational diabetes",
    lastActivity: "Seen 1d ago",
    nextAction: "Review abnormal result",
    labsBack: true,
    acuity: "urgent",
    conditionCodes: ["O24.4", "Z34"],
  },
  "sothea-ouk": {
    attention: "Flagged result to review",
    attentionTone: "danger",
    context: "T2DM · Iron deficiency",
    lastActivity: "Seen 3d ago",
    nextAction: "Review flagged ferritin",
    labsBack: true,
    acuity: "urgent",
    conditionCodes: ["E11.9", "D50.9"],
  },
  "dara-pich": {
    attention: "Awaiting collection",
    attentionTone: "warning",
    context: "Hypertension · Hyperlipidemia",
    lastActivity: "Seen 3d ago",
    nextAction: "Patient to visit PSC",
    labsBack: false,
    acuity: "watch",
    conditionCodes: ["I10", "E78.5"],
  },
  "sovann-tep": {
    attention: "Sample at lab",
    attentionTone: "info",
    context: "CKD risk · Electrolyte watch",
    lastActivity: "Seen today",
    nextAction: "Results pending",
    labsBack: false,
    acuity: "watch",
    conditionCodes: ["N18.9"],
  },
  "sophea-chea": {
    attention: "Sample at lab",
    attentionTone: "info",
    context: "T2DM monitoring",
    lastActivity: "Seen today",
    nextAction: "Results pending",
    labsBack: false,
    acuity: "watch",
    conditionCodes: ["E11.9"],
  },
  "malis-keo": {
    attention: "Follow-up overdue",
    attentionTone: "neutral",
    context: "T2DM · CKD stage 3",
    lastActivity: "Seen 28d ago",
    nextAction: "Schedule follow-up",
    labsBack: true,
    acuity: "stable",
    conditionCodes: ["E11.9", "N18.3"],
  },
  "kosal-mao": {
    attention: "Follow-up overdue",
    attentionTone: "neutral",
    context: "Asthma · Allergic rhinitis",
    lastActivity: "Seen 31d ago",
    nextAction: "Schedule follow-up",
    labsBack: false,
    acuity: "stable",
    conditionCodes: ["J45.9", "J30.9"],
  },
};

const DEFAULT_DECORATION: RosterDecoration = {
  attention: "Routine follow-up",
  attentionTone: "neutral",
  context: "General medicine",
  lastActivity: "Seen recently",
  nextAction: "Review chart",
  labsBack: false,
  acuity: "stable",
  conditionCodes: [],
};

const ACUITY_RANK: Record<Acuity, number> = { urgent: 0, watch: 1, stable: 2 };

function identityFor(patient: BookingPatient): string {
  const demo = LOOKUP_DEMOGRAPHICS[patient.id];
  if (demo) {
    const sexLetter = demo.sex === "female" ? "F" : demo.sex === "male" ? "M" : "X";
    return `${demo.ageLabel}${sexLetter} · ${patient.mrn}`;
  }
  return patient.mrn;
}

function decoratePatient(patient: BookingPatient): RosterPatient {
  const decoration = ROSTER_DECORATIONS[patient.id] ?? DEFAULT_DECORATION;
  return {
    id: patient.id,
    name: patient.name,
    khmerName: decoration.khmerName,
    identity: identityFor(patient),
    attention: decoration.attention,
    attentionTone: decoration.attentionTone,
    context: decoration.context,
    lastActivity: decoration.lastActivity,
    nextAction: decoration.nextAction,
    labsBack: decoration.labsBack,
    acuity: decoration.acuity,
    conditionCodes: decoration.conditionCodes,
  };
}

/* Urgency-sorted worklist: urgent first, then watch, then stable. Stable across
   renders (no Date.now / random). */
export const roster: RosterPatient[] = BOOKING_PATIENTS.map(decoratePatient).sort(
  (a, b) => ACUITY_RANK[a.acuity] - ACUITY_RANK[b.acuity],
);

export const rosterById = new Map(roster.map((patient) => [patient.id, patient]));

/* ---------------------------------------------------------------- Filters -- */

export const patientScopeFilters = [
  { id: "all", label: "All" },
  { id: "recent", label: "Recently active" },
  { id: "attention", label: "Needs attention" },
] as const;

export type PatientScopeId = (typeof patientScopeFilters)[number]["id"];

export const patientClinicalFilters = [
  { id: "needs-review", label: "Needs review" },
  { id: "abnormal", label: "Abnormal labs" },
  { id: "overdue", label: "Overdue follow-up" },
  { id: "screening", label: "Screening due" },
] as const;

export type PatientClinicalId = (typeof patientClinicalFilters)[number]["id"];

export function matchesScope(patient: RosterPatient, scope: PatientScopeId): boolean {
  if (scope === "all") return true;
  if (scope === "recent") return patient.lastActivity.includes("today") || patient.lastActivity.includes("1d") || patient.lastActivity.includes("3d");
  if (scope === "attention") return patient.acuity !== "stable";
  return true;
}

export function matchesClinical(patient: RosterPatient, clinical: PatientClinicalId | null): boolean {
  if (!clinical) return true;
  if (clinical === "needs-review") return patient.labsBack;
  if (clinical === "abnormal") return patient.attentionTone === "danger";
  if (clinical === "overdue") return patient.attention.toLowerCase().includes("follow-up");
  if (clinical === "screening") return patient.attention.toLowerCase().includes("screening");
  return true;
}

/* ------------------------------------------------------------ Chart head --- */

export type ChartHeader = {
  name: string;
  khmerName?: string;
  initials: string;
  identity: string; /* "54F · MRN P-9134" */
  age: string;
  sex: string;
  dob: string;
  mrn: string;
  phone: string;
  insurance: string;
  problems: Badge[];
  flags: Badge[];
};

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/* Header identity per patient; the BODY content below is the canonical fixture. */
export function getChartHeader(patientId: string): ChartHeader {
  const patient = bookingPatientById.get(patientId) ?? bookingPatientById.get("sokha-chan")!;
  const roster = rosterById.get(patientId);
  const demo = LOOKUP_DEMOGRAPHICS[patientId];
  const sex = demo?.sex === "female" ? "Female" : demo?.sex === "male" ? "Male" : "—";
  const sexLetter = demo?.sex === "female" ? "F" : demo?.sex === "male" ? "M" : "";
  const age = demo?.ageLabel ?? "—";
  const dob = demo?.yearOfBirth ? `DOB ${demo.yearOfBirth}` : "DOB —";

  const problems: Badge[] = (roster?.context ?? "General medicine")
    .split(" · ")
    .map((label) => ({ label }));

  /* Sokha is the canonical chart — she carries the safety flags the body shows. */
  const flags: Badge[] =
    patientId === "sokha-chan"
      ? [
          { label: "Allergy unknown", tone: "warning", dashed: true },
          { label: "Phone confirmed", tone: "success", icon: "verified" },
          { label: "Open abnormal A1c", tone: "danger", icon: "alert" },
        ]
      : roster?.labsBack
        ? [{ label: "New labs back", tone: "warning", icon: "alert" }]
        : [{ label: "Phone confirmed", tone: "success", icon: "verified" }];

  return {
    name: patient.name,
    khmerName: roster?.khmerName,
    initials: initialsOf(patient.name),
    identity: `${age}${sexLetter} · MRN ${patient.mrn}`,
    age,
    sex,
    dob,
    mrn: patient.mrn,
    phone: patient.phoneMasked,
    insurance: "Forte · active",
    problems,
    flags,
  };
}

/* ----------------------------------------------------- Canonical body ------ */

export type ChartMetric = { label: string; value: string; meta: string; tone: Tone };

export const chartMetrics: ChartMetric[] = [
  { label: "HbA1c", value: deltaLabFacts.hba1c.value, meta: `${deltaLabFacts.hba1c.status} · ${deltaLabFacts.hba1c.shortDate}`, tone: "warning" },
  { label: "BP", value: "146/92", meta: "Above target", tone: "warning" },
  { label: "Creatinine", value: deltaLabFacts.creatinine.value, meta: deltaLabFacts.creatinine.status, tone: "danger" },
  { label: "uACR", value: deltaLabFacts.microalbuminCreatinineRatio.value, meta: deltaLabFacts.microalbuminCreatinineRatio.status, tone: "danger" },
];

export const summaryJumpItems = [
  { id: "summary-assessment", label: "Summary" },
  { id: "summary-lab-preview", label: "Lab history", alert: true },
  { id: "summary-visit-intent", label: "Visit intent" },
  { id: "summary-symptoms", label: "Symptoms" },
  { id: "summary-medical-history", label: "Medical history" },
  { id: "summary-medications", label: "Medications" },
] as const;

export type SummaryItem = { title: string; meta: string; selfReported?: boolean; muted?: boolean };

export type SummarySection = {
  id: string;
  title: string;
  badge?: string;
  items: SummaryItem[];
};

export const summarySections: SummarySection[] = [
  {
    id: "summary-visit-intent",
    title: "Visit intent",
    badge: "Today",
    items: [
      { title: "Renal markers and glycemic follow-up", meta: "Review renal markers · HbA1c not repeated on latest draws" },
      { title: "Reports blurred vision", meta: "Not yet demonstrated by platform", selfReported: true },
    ],
  },
  {
    id: "summary-symptoms",
    title: "Symptoms",
    items: [
      { title: "Peripheral edema", meta: "Bilateral · observed" },
      { title: "Polyuria", meta: "2 weeks · worsening", selfReported: true },
      { title: "Fatigue", meta: "Reported today", selfReported: true },
    ],
  },
];

export type MedicalHistoryGroup = {
  label: string;
  entries: Array<{ title: string; meta: string; date: string; selfReported?: boolean; muted?: boolean }>;
};

export const medicalHistoryGroups: MedicalHistoryGroup[] = [
  {
    label: "Active",
    entries: [
      { title: "Type 2 diabetes mellitus", meta: "Poor control", date: "2019–now" },
      { title: "Chronic kidney disease", meta: "Stage 3 · albuminuria", date: "ongoing" },
      { title: "Diabetic nephropathy", meta: "Secondary to diabetes", date: "ongoing" },
      { title: "Hypertension", meta: "Stage 2", date: "—", selfReported: true },
      { title: "HIV", meta: "Serology pending", date: "pending", selfReported: true },
      { title: "Hepatitis B", meta: "Serology pending", date: "pending", selfReported: true },
    ],
  },
  {
    label: "Past / resolved",
    entries: [
      { title: "Gestational diabetes", meta: "Resolved", date: "2018", muted: true },
      { title: "Syphilis", meta: "Treated · RPR non-reactive", date: "2023", muted: true },
      { title: "H. pylori", meta: "Eradicated", date: "2024", muted: true },
    ],
  },
  {
    label: "Surgical",
    entries: [
      { title: "Appendectomy", meta: "Confirmed by platform", date: "2010" },
      { title: "Cesarean section", meta: "Patient record", date: "2018", selfReported: true },
    ],
  },
];

export const medications: SummaryItem[] = [
  { title: "Metformin 1 g", meta: "Twice daily" },
  { title: "Lisinopril 10 mg", meta: "Once daily", selfReported: true },
  { title: "Insulin glargine", meta: "Stopped 2021", muted: true },
];

export const allergies: SummaryItem[] = [{ title: "Penicillin", meta: "Rash, moderate", selfReported: true }];

/* Alerts & care gaps — orderable gaps carry the LabHistory row key so "Order"
   adds a provenance-rich line to the shared order draft. */
export type CareGapRow = {
  title: string;
  meta: string;
  tone: Tone;
  stateLabel?: string;
  order?: { labKey: string; labName: string; severityTone: "danger" | "warning" | "info" };
  referral?: boolean;
};

export const careGapRows: CareGapRow[] = [
  {
    title: "HbA1c repeat due",
    meta: `Last ${deltaLabFacts.hba1c.value} on ${deltaLabFacts.hba1c.shortDate} · no active order`,
    tone: "warning",
    stateLabel: "Repeat due",
    order: { labKey: "GLYCOSYLATED HAEMOGLOBIN (Roche)||Hb A1c % (DCCT/NGSP)", labName: "HbA1c", severityTone: "warning" },
  },
  {
    title: "Microalbumin/Cr follow-up",
    meta: `${deltaLabFacts.microalbuminCreatinineRatio.value} · ${deltaLabFacts.microalbuminCreatinineRatio.status}`,
    tone: "warning",
    order: { labKey: "URINE BIOCHEMISTRY (Microalbumin Roche)||Microalbumin/Cre Ratio", labName: "Microalbumin / creatinine ratio", severityTone: "warning" },
  },
  { title: "Creatinine remains above reference", meta: `${deltaLabFacts.creatinine.value} · ${deltaLabFacts.creatinine.shortDate}`, tone: "danger" },
  { title: "Annual eye exam overdue", meta: "Refer ophthalmology", tone: "warning", referral: true },
  { title: "Repeat HbA1c (fasting)", meta: `Last result ${deltaLabFacts.hba1c.shortDate}`, tone: "neutral" },
];

/* Derived from the same model the Labs tab renders — single source of truth. */
export const labPreviewRows: LabPreviewEntry[] = getLabHistoryPreview();

export type CarePlanGoal = {
  id: string;
  title: string;
  meta: string;
  status: "due" | "planned" | "met";
  labKey?: string;
};

export const carePlanGoals: CarePlanGoal[] = [
  { id: "glycemic", title: "Glycemic control", meta: "Repeat HbA1c · target <7.0%", status: "due", labKey: "GLYCOSYLATED HAEMOGLOBIN (Roche)||Hb A1c % (DCCT/NGSP)" },
  { id: "kidney", title: "Kidney protection", meta: "Confirm uACR trend · maintain ACEi", status: "due", labKey: "URINE BIOCHEMISTRY (Microalbumin Roche)||Microalbumin/Cre Ratio" },
  { id: "bp", title: "Blood pressure", meta: "Target <130/80 · recheck in 4 weeks", status: "due" },
  { id: "eye", title: "Retinopathy screen", meta: "Ophthalmology referral overdue", status: "due" },
  { id: "lipids", title: "Lipid management", meta: `LDL in range · ${deltaLabFacts.ldl.shortDate}`, status: "met" },
];

export type ChartTimelineEntry = { id: string; kind: "lab" | "booking" | "note" | "rx" | "referral"; title: string; meta: string };

export const chartTimeline: ChartTimelineEntry[] = [
  { id: "t1", kind: "lab", title: `HbA1c ${deltaLabFacts.hba1c.value} · ${deltaLabFacts.hba1c.status}`, meta: `${deltaLabFacts.hba1c.date} · unread` },
  { id: "t2", kind: "booking", title: "PSC order completed", meta: "Yesterday · KO-3819" },
  { id: "t3", kind: "note", title: "Diabetes follow-up note", meta: "3 months ago · signed" },
  { id: "t4", kind: "rx", title: "Metformin 1 g refill", meta: "3 months ago" },
];

export type RecordDocument = { id: string; title: string; meta: string; kind: "lab" | "referral" | "note" | "imaging" };

export const recordDocuments: RecordDocument[] = [
  { id: "d1", title: "Lab report · FZ-38245", meta: `HbA1c · ${deltaLabFacts.hba1c.shortDate}`, kind: "lab" },
  { id: "d2", title: "Renal panel results", meta: "Creatinine · BUN · eGFR", kind: "lab" },
  { id: "d3", title: "Ophthalmology referral", meta: "Pending · retinopathy screen", kind: "referral" },
  { id: "d4", title: "Diabetes follow-up note", meta: "3 months ago · signed", kind: "note" },
];

/* ------------------------------------------------------- Home attention ---- */

export type NeedsAttentionItem = {
  id: string;
  label: string;
  detail: string;
  context: string;
  action: string;
  tone: Tone;
  target: "home" | "patients" | "bookings" | "catalog" | "more";
};

export const needsAttention: NeedsAttentionItem[] = [
  {
    id: "flagged",
    label: "2 flagged results to review",
    detail: "Abnormal or critical — review before reporting",
    context: "Sreymom Sok, Sothea Ouk",
    action: "Review",
    tone: "danger",
    target: "patients",
  },
  {
    id: "ready",
    label: "3 results returned",
    detail: "Ready to confirm and send to patients",
    context: "Sokha Chann, Malis Keo +1",
    action: "Open bookings",
    tone: "success",
    target: "bookings",
  },
  {
    id: "await",
    label: "4 orders awaiting collection",
    detail: "Booking code sent · no PSC check-in yet",
    context: "Dara Pich, Kosal Mao +2",
    action: "Open bookings",
    tone: "warning",
    target: "bookings",
  },
];

export function getNeedsAttentionItems(): NeedsAttentionItem[] {
  return needsAttention;
}
