/* Encounter fixtures for the mobile encounter loop (note / ICD / Rx / referral
   / follow-up). ICD search builds a flat index over the WHO ICD-10 2019 set +
   chart-aware candidates, ranked by getIcdSearchRank. Adapted from the desktop
   page.tsx fixtures (NOT imported from it). */

import { deltaLabFacts } from "@/data/deltaLabResults";
import { ICD10_WHO_2019_SOURCE, icd10Who2019 } from "@/data/icd10Who2019";

/* ----------------------------------------------------------------- ICD ----- */

export type IcdCandidate = {
  code: string;
  label: string;
  trigger: string;
  confidence?: "high" | "low";
  /* false = WHO non-terminal category — searchable but not codable */
  codable?: boolean;
  chapterTitle?: string;
  linkedProblem?: string;
};

/* Chart-aware AI candidates — nothing auto-adds (doctor decides). */
export const icdCandidates: IcdCandidate[] = [
  {
    code: "E11.65",
    label: "Type 2 diabetes mellitus with hyperglycemia",
    trigger: deltaLabFacts.hba1c.summary,
    confidence: "high",
    linkedProblem: "Diabetes follow-up",
  },
  {
    code: "I10",
    label: "Essential (primary) hypertension",
    trigger: "BP 146/92 · 3 visits",
    confidence: "high",
    linkedProblem: "Blood pressure",
  },
  {
    code: "N18.3",
    label: "Chronic kidney disease, stage 3",
    trigger: `${deltaLabFacts.creatinine.summary} · ${deltaLabFacts.microalbuminCreatinineRatio.summary}`,
    confidence: "high",
    linkedProblem: "Renal markers",
  },
  {
    code: "D64.9",
    label: "Anemia, unspecified",
    trigger: deltaLabFacts.hemoglobin.summary,
    confidence: "low",
    linkedProblem: "CBC signal",
  },
];

const icdExtras: IcdCandidate[] = [
  { code: "K76.0", label: "Fatty (change of) liver, not elsewhere classified", trigger: "US: hepatic steatosis · mild", confidence: "low" },
  { code: "E66.9", label: "Obesity, unspecified", trigger: "BMI 28.4", confidence: "low" },
  { code: "H36.0", label: "Diabetic retinopathy", trigger: "Reports blurred vision · screening due", confidence: "low" },
];

const localIcdEntries: IcdCandidate[] = [...icdCandidates, ...icdExtras];
const localIcdCodes = new Set(localIcdEntries.map((entry) => entry.code));

const whoIcdEntries: IcdCandidate[] = icd10Who2019
  .filter((entry) => !localIcdCodes.has(entry.code))
  .map((entry) => ({
    code: entry.code,
    label: entry.label,
    trigger: `${entry.chapterTitle} · ${ICD10_WHO_2019_SOURCE.name}`,
    codable: entry.terminal,
    chapterTitle: entry.chapterTitle,
  }));

const icdLibrary: IcdCandidate[] = [...localIcdEntries, ...whoIcdEntries];
export const icdCandidateByCode = new Map(icdLibrary.map((entry) => [entry.code, entry]));

export const ICD_SEARCH_RESULT_LIMIT = 80;

function normalizeIcdSearchText(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizeIcdCode(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export type IcdSearchEntry = IcdCandidate & {
  codable: boolean;
  compactCode: string;
  searchOrder: number;
  searchText: string;
};

export const icdSearchIndex: IcdSearchEntry[] = icdLibrary.map((entry, searchOrder) => ({
  ...entry,
  codable: entry.codable !== false,
  compactCode: normalizeIcdCode(entry.code),
  searchOrder,
  searchText: normalizeIcdSearchText(`${entry.code} ${entry.label} ${entry.chapterTitle ?? ""}`),
}));

export function getIcdSearchRank(
  entry: IcdSearchEntry,
  queryText: string,
  compactQuery: string,
  queryTokens: string[],
): number | null {
  if (compactQuery && entry.compactCode === compactQuery) return 0;
  if (compactQuery && entry.compactCode.startsWith(compactQuery)) return 10 + entry.compactCode.length / 100;
  if (queryText && entry.searchText.startsWith(queryText)) return 20;
  if (queryText && entry.searchText.includes(` ${queryText}`)) return 30;
  if (queryTokens.length > 0 && queryTokens.every((token) => entry.searchText.includes(token) || entry.compactCode.includes(token))) {
    return 40 + queryTokens.length / 100;
  }
  return null;
}

/* Convenience: rank the whole index for a raw query string, sorted + capped. */
export function searchIcd(query: string): IcdSearchEntry[] {
  const queryText = normalizeIcdSearchText(query);
  const compactQuery = normalizeIcdCode(query);
  const queryTokens = queryText.split(" ").filter(Boolean);
  if (!queryText && !compactQuery) return [];
  return icdSearchIndex
    .map((entry) => ({ entry, rank: getIcdSearchRank(entry, queryText, compactQuery, queryTokens) }))
    .filter((row): row is { entry: IcdSearchEntry; rank: number } => row.rank !== null)
    .sort((a, b) => a.rank - b.rank || a.entry.searchOrder - b.entry.searchOrder)
    .slice(0, ICD_SEARCH_RESULT_LIMIT)
    .map((row) => row.entry);
}

/* ------------------------------------------------------------------- Rx ---- */

export type RxFormularyItem = { drug: string; dose: string; class: string; defaultFreq: string };

export const rxFormulary: RxFormularyItem[] = [
  { drug: "Empagliflozin", dose: "10 mg", class: "SGLT2i", defaultFreq: "OD" },
  { drug: "Atorvastatin", dose: "40 mg", class: "High-intensity statin", defaultFreq: "OD" },
  { drug: "Lisinopril", dose: "10 mg", class: "ACE inhibitor", defaultFreq: "OD" },
  { drug: "Metformin", dose: "1 g", class: "Biguanide", defaultFreq: "BID" },
  { drug: "Losartan", dose: "50 mg", class: "ARB", defaultFreq: "OD" },
];

export const rxFrequencies = [
  { value: "OD", label: "OD — Once daily" },
  { value: "BID", label: "BID — Twice daily" },
  { value: "TID", label: "TID — Three times daily" },
  { value: "PRN", label: "PRN — As needed" },
];

/* -------------------------------------------------------------- Referral --- */

export const referralServices = ["Specialty consult", "Imaging", "Surgery", "Mental health"];

export type ReferralDestination = { name: string; distance: string; nextSlot: string; cost: string; insurance: string };

export const referralDestinations: ReferralDestination[] = [
  { name: "Calmette Hospital", distance: "2.1 km", nextSlot: "Tomorrow 14:00", cost: "$25–$60", insurance: "Forte · NSSF" },
  { name: "Khema Clinic — Ophthalmology", distance: "3.4 km", nextSlot: "Fri 09:30", cost: "$40–$90", insurance: "Forte" },
  { name: "Preah Ang Duong (public)", distance: "5.0 km", nextSlot: "Next week", cost: "$0–$30", insurance: "NSSF" },
];

/* ------------------------------------------------------------- Follow-up --- */

export const followUpOptions = [
  { id: "4w", label: "4 weeks", detail: "BP + medication tolerance check" },
  { id: "90d", label: "90 days", detail: "Repeat HbA1c · if clinically indicated", recommended: true },
  { id: "6m", label: "6 months", detail: "Stable-state review" },
];

/* ----------------------------------------------------------------- Note ---- */

export type NoteScaffold = { reason: string; s: string; o: string; a: string; p: string };

/* SOAP scaffold seeded from today's chart signals — the doctor's to edit. */
export const noteScaffold: NoteScaffold = {
  reason: "Renal marker and glycemic follow-up review",
  s: "Polyuria 2 weeks, worsening. Fatigue. Reports blurred vision (not yet verified).",
  o: `BP 146/92. Bilateral peripheral edema. ${deltaLabFacts.hba1c.summary}. ${deltaLabFacts.microalbuminCreatinineRatio.summary}. ${deltaLabFacts.creatinine.summary}.`,
  a: "T2DM with HbA1c not repeated on the latest draws. Renal markers remain above reference. Hypertension above target.",
  p: "Review renal markers and current therapy. Repeat HbA1c if clinically indicated. Ophthalmology referral for retinopathy screen.",
};

export const noteSoapSections = [
  { key: "s", label: "Subjective" },
  { key: "o", label: "Objective" },
  { key: "a", label: "Assessment" },
  { key: "p", label: "Plan" },
] as const;
