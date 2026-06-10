"use client";

import { useMemo, useState } from "react";
import { Search as SearchIcon, Close, ChevronRight } from "@/icons";
import "./LabHistory.css";

/* =================================================================================
   Kura DCM — Lab history
   3 tabs (Overview / All tests / Table), one-tap status chips, quiet rows with a
   reason line only when there is a reason, and an inline expansion per test row
   (result history timeline + full-size trend + notes + component results).
   A filter is a lens, never a deletion: counts stay global, search runs across
   the full dataset, missing cells are never read as normal or zero.
   ================================================================================= */

/* ----------------------------------- DATA ---------------------------------------- */

const DATES = ["2026-05-21", "2026-04-20", "2026-03-20", "2026-02-18", "2026-01-15"];
const LATEST = "2026-05-21";

const RAW_CSV = `Section,Test,Unit,Reference,2026-05-21,2026-04-20,2026-03-20,2026-02-18,2026-01-15
HEMATOLOGY,Erythrocyte Sedimentation Rate 1 hour,mm,N: < 20,33,30,42,26,53
CELL BLOOD COUNT,White blood cell,10^3/uL,4.0-10,7.4,7.7,7.9,7.4,7.3
CELL BLOOD COUNT,Red blood cell,10^6/uL,3.8-5.3,3.7,3.6,3.6,3.0,3.3
CELL BLOOD COUNT,Haemoglobin,g/dL,12-16,11.0,10.6,10.9,9.2,10.3
CELL BLOOD COUNT,Hematocrit,%,38-47,33.3,32.6,32.6,27.2,30.7
CELL BLOOD COUNT,M.C.V,fL,80-95,90.2,91.8,91.6,91.6,92.2
CELL BLOOD COUNT,M.C.H,pg,27-32,29.8,29.9,30.6,31.0,30.9
CELL BLOOD COUNT,M.C.H.C,g/dL,32-36,33.0,32.5,33.4,33.8,33.6
CELL BLOOD COUNT,Platelet count,10^3/uL,150-400,189,195,239,217,205
DIFFERENTIAL COUNT,Neutrophils,%,40-74,62.6,74.4,59.4,60.6,68.1
DIFFERENTIAL COUNT,Eosinophils,%,0.0-7.0,2.7,1.0,2.8,3.9,3.2
DIFFERENTIAL COUNT,Basophils,%,0.0-1.5,0.5,0.4,0.6,0.4,0.5
DIFFERENTIAL COUNT,Lymphocytes,%,20-50,26.6,17.9,28.1,25.7,19.4
DIFFERENTIAL COUNT,Monocytes,%,0.0-11,7.6,6.3,9.1,9.4,8.8
BIOCHEMISTRY,Albumin,g/dL,3.5-5.2,4.7,4.5,4.8,4.5,4.7
BIOCHEMISTRY,Glucose,mg/dL,74-109,105,124,95,113,116
BIOCHEMISTRY,Total Cholesterol,mg/dL,< 200,89,120,,81,86
BIOCHEMISTRY,LDL-Cholesterol,mg/dL,< 100,27,43,,26,24
BIOCHEMISTRY,Magnesium,mg/dL,1.6-2.6,3.0,3.1,2.6,2.9,2.6
BIOCHEMISTRY,Triglyceride,mg/dL,< 200,167,147,,128,135
BIOCHEMISTRY,Uric Acid,mg/dL,2.4-5.7,3.2,8.6,3.6,6.3,11.4
BIOCHEMISTRY,Creatinine,mg/dL,0.51-0.95,3.86,3.65,4.75,5.08,3.89
BIOCHEMISTRY,Calcium,mg/dL,8.6-10,9.3,8.9,9.8,9.3,9.4
BIOCHEMISTRY,Phosphorus,mg/dL,2.5-4.5,,,4.9,5.0,
BIOCHEMISTRY,Urea Nitrogen (BUN),mg/dL,N: 6-20,38,46,53,88,55
GLYCOSYLATED HAEMOGLOBIN (Roche),Hb A1c % (DCCT/NGSP),%,4.0-6.0,,,,,6.5
GLYCOSYLATED HAEMOGLOBIN (Roche),Hb A1c (acc to IFCC),mmol/mol,20-42,,,,,47.4
URINE BIOCHEMISTRY,pH,,,6.0,6.0,6.0,6.0,6.0
URINE BIOCHEMISTRY,Specific Gravity,,,,,,1.010,
URINE BIOCHEMISTRY,Protein,,,Absence,POSITIVE ++,POSITIVE +,POSITIVE +,Trace
URINE BIOCHEMISTRY,Glucose,,,Trace,Absence,Absence,Absence,Absence
URINE BIOCHEMISTRY,Ketone,,,,,,Absence,
URINE BIOCHEMISTRY,Blood,,,,,,Absence,
URINE BIOCHEMISTRY,Nitrite,,,,,,Absence,
URINE BIOCHEMISTRY,Urobilinogen,,,,,,Absence,
URINE BIOCHEMISTRY,Bilirubin,,,,,,Absence,
URINE CYTOLOGY,Color,,,Yellow,Yellow,Yellow,Yellow,Yellow
URINE CYTOLOGY,Transparency,,,Clear,Clear,Cloudy,Clear,Clear
CYTOLOGY EXAMEN,White Blood Cells,/Champ,N:0-10,06,06,30,05,06
CYTOLOGY EXAMEN,Red Blood Cells,/Champ,N:0-10,03,03,05,03,03
CYTOLOGY EXAMEN,Epithelial cells,,,Rare,Rare,Rare,Rare,Rare
CYTOLOGY EXAMEN,Vessical/Bladder cells,,,Absence,Absence,Absence,Absence,Absence
CYTOLOGY EXAMEN,Renal cells,,,Absence,Absence,Absence,Absence,Absence
CYTOLOGY EXAMEN,Cast,,,Absence,Absence,Absence,Absence,Absence
CYTOLOGY EXAMEN,Cristals/Crystals,,,Absence,Absence,Absence,Absence,Absence
CYTOLOGY EXAMEN,Bacteries/Bacteria,,,Absence,Absence,Presence +,Absence,Absence
CYTOLOGY EXAMEN,Yeast,,,Absence,Absence,Absence,Absence,Absence
CYTOLOGY EXAMEN,Trichomonas,,,Absence,Absence,Absence,Absence,Absence
URINE BIOCHEMISTRY (Microalbumin Roche),Urine Creatinine,mg/dL,29-226,126.67,104.16,124.52,113.67,38.69
URINE BIOCHEMISTRY (Microalbumin Roche),Urine Microalbumin,mg/L,0.0-20,197,250,169,246,491
URINE BIOCHEMISTRY (Microalbumin Roche),Microalbumin/Cre Ratio,mg/g,0.0-30,155.52,240.01,135.72,216.42,1269.06
ENZYMOLOGY,AST (Aspartate Aminotrans.),U/L,0-32,18,17,18,24,17
ENZYMOLOGY,ALT (Alanine Aminotrans.),U/L,0-33,8,10,8,10,12
ELECTROLYTES,Sodium (Na+),mmol/L,135-145,141,138,138,141,143
ELECTROLYTES,Potassium (K+),mmol/L,3.5-5.5,5.2,5.4,5.1,5.2,5.4
ELECTROLYTES,Chlorures (Cl-),mmol/L,98-107,105,107,102,107,105
SEROLOGY,Anti-Streptolysine O (ASO),UI/ML,NR: < 200,,,,91.5,
SEROLOGY,C-Reactive Protein (CRP),mg/L,N: < 6,,,,2.86,
SEROLOGY,Rheumatoid Factors,UI/ML,N: < 20,,,,14.30,
THYROIDS,TSH (Thyreotrope),uIU/ml,0.27-4.20,3.950,,,,`;

/* --------------------------------- TYPES ----------------------------------------- */

interface RefInfo {
  raw: string;
  kind: "none" | "upper" | "lower" | "range" | "unparsable";
  low?: number;
  high?: number;
  parsable: boolean;
}
interface ValInfo {
  raw: string;
  type: "missing" | "numeric" | "qualitative";
  num: number | null;
}
type CellStatus =
  | "missing"
  | "qualitative"
  | "no_structured_reference"
  | "below_reference"
  | "above_reference"
  | "in_range";
interface Cell {
  date: string;
  val: ValInfo;
  status: CellStatus;
}
type Severity =
  | "normal"
  | "low"
  | "high"
  | "crit_high"
  | "crit_low"
  | "qnorm"
  | "qpos"
  | "none"
  | "missing";
type Group = "out" | "watch" | "resolved" | "stale" | "noref" | "ok";

interface RawRow {
  idx: number;
  section: string;
  test: string;
  unit: string;
  reference: string;
  values: Record<string, string>;
}
interface BaseRow {
  key: string;
  section: string;
  test: string;
  displayName: string;
  unit: string;
  reference: RefInfo;
  domain: string;
  parentKey: string | null;
  isComponent: boolean;
  cells: Cell[];
  availDesc: Cell[];
  numericAvail: Cell[];
  valueType: "numeric" | "qualitative" | "missing";
  isPresentInLatest: boolean;
  latestResult: Cell | null;
}
interface RowStateInfo {
  group: Group;
  sev: Severity;
  reason: string;
  basedOn?: string;
}
type RowModel = BaseRow & RowStateInfo & { blob: string };

/* ------------------------------- PURE LOGIC -------------------------------------- */

function parseCsv(raw: string): RawRow[] {
  const lines = raw.trim().split(/\r?\n/);
  const header = lines[0].split(",");
  const dateCols = header.slice(4);
  return lines.slice(1).map((line, i) => {
    const cells = line.split(",");
    const values: Record<string, string> = {};
    dateCols.forEach((d, j) => {
      values[d] = (cells[4 + j] ?? "").trim();
    });
    return {
      idx: i,
      section: (cells[0] ?? "").trim(),
      test: (cells[1] ?? "").trim(),
      unit: (cells[2] ?? "").trim(),
      reference: (cells[3] ?? "").trim(),
      values,
    };
  });
}

function parseReference(raw: string): RefInfo {
  const rawTrim = (raw || "").trim();
  if (!rawTrim) return { raw: rawTrim, kind: "none", parsable: false };
  const s = rawTrim.replace(/^[A-Za-z]+\s*:\s*/, "").trim();
  let m: RegExpMatchArray | null;
  if ((m = s.match(/^<\s*(\d+(?:\.\d+)?)$/)))
    return { raw: rawTrim, kind: "upper", high: parseFloat(m[1]), parsable: true };
  if ((m = s.match(/^>\s*(\d+(?:\.\d+)?)$/)))
    return { raw: rawTrim, kind: "lower", low: parseFloat(m[1]), parsable: true };
  if ((m = s.match(/^(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)$/)))
    return { raw: rawTrim, kind: "range", low: parseFloat(m[1]), high: parseFloat(m[2]), parsable: true };
  return { raw: rawTrim, kind: "unparsable", parsable: false };
}

function parseValue(raw: string): ValInfo {
  const t = (raw || "").trim();
  if (!t) return { raw: t, type: "missing", num: null };
  if (/^\d+(?:\.\d+)?$/.test(t)) return { raw: t, type: "numeric", num: parseFloat(t) };
  return { raw: t, type: "qualitative", num: null };
}

function classifyCell(val: ValInfo, ref: RefInfo): CellStatus {
  if (val.type === "missing") return "missing";
  if (val.type === "qualitative") return "qualitative";
  if (!ref.parsable) return "no_structured_reference";
  const v = val.num as number;
  if (ref.kind === "range") {
    if (v < (ref.low as number)) return "below_reference";
    if (v > (ref.high as number)) return "above_reference";
    return "in_range";
  }
  if (ref.kind === "upper") return v <= (ref.high as number) ? "in_range" : "above_reference";
  if (ref.kind === "lower") return v >= (ref.low as number) ? "in_range" : "below_reference";
  return "no_structured_reference";
}

function distToBound(num: number, ref: RefInfo): number {
  if (ref.kind === "range")
    return num > (ref.high as number) ? num - (ref.high as number) : (ref.low as number) - num;
  if (ref.kind === "upper") return num - (ref.high as number);
  if (ref.kind === "lower") return (ref.low as number) - num;
  return 0;
}

function qualLevel(raw: string): number {
  const t = (raw || "").toLowerCase();
  if (!t) return -1;
  if (/(positive|presence|cloudy|turbid)/.test(t)) {
    const plus = (t.match(/\+/g) || []).length;
    return 2 + Math.min(plus, 2);
  }
  if (/trace/.test(t)) return 1;
  return 0;
}

/* ----------------------------- SEVERITY (COLOUR) SCALE ---------------------------
   green=in range · yellow=below ref · orange=above ref / finding · red=markedly
   outside · grey=missing / no machine-readable reference. "Markedly outside" is a
   transparent display heuristic only (no validated critical-value cutoffs).        */
const MARKED_RANGE_WIDTHS = 1;
const MARKED_UPPER_MULT = 1.5;
const MARKED_LOWER_MULT = 0.5;

function markedlyOut(val: ValInfo, ref: RefInfo, status: CellStatus): boolean {
  if (!val || val.type !== "numeric" || !ref || !ref.parsable) return false;
  if (status !== "above_reference" && status !== "below_reference") return false;
  const v = val.num as number;
  if (ref.kind === "range") {
    const w = (ref.high as number) - (ref.low as number);
    if (!(w > 0)) return false;
    if (status === "above_reference") return v > (ref.high as number) + w * MARKED_RANGE_WIDTHS;
    return v < (ref.low as number) - w * MARKED_RANGE_WIDTHS;
  }
  if (ref.kind === "upper") return v > (ref.high as number) * MARKED_UPPER_MULT;
  if (ref.kind === "lower") return v < (ref.low as number) * MARKED_LOWER_MULT;
  return false;
}

function severityOf(cell: Cell | null | undefined, ref: RefInfo): Severity {
  if (!cell) return "missing";
  const s = cell.status;
  if (s === "missing") return "missing";
  if (s === "no_structured_reference") return "none";
  if (s === "qualitative") return qualLevel(cell.val.raw) >= 1 ? "qpos" : "qnorm";
  if (s === "in_range") return "normal";
  const marked = markedlyOut(cell.val, ref, s);
  if (s === "above_reference") return marked ? "crit_high" : "high";
  if (s === "below_reference") return marked ? "crit_low" : "low";
  return "none";
}

const SEV_TEXT: Record<Severity, string> = {
  normal: "var(--green)", low: "var(--yellow)", high: "var(--orange)",
  crit_high: "var(--red)", crit_low: "var(--red)",
  qnorm: "var(--green)", qpos: "var(--orange)", none: "var(--ink2)", missing: "var(--faint)",
};
const SEV_DOT: Record<Severity, string> = {
  normal: "var(--green-dot)", low: "var(--yellow-dot)", high: "var(--orange-dot)",
  crit_high: "var(--red-dot)", crit_low: "var(--red-dot)",
  qnorm: "var(--green-dot)", qpos: "var(--orange-dot)", none: "var(--neutral-dot)", missing: "var(--line)",
};
const SEV_LABEL: Record<Severity, string> = {
  normal: "In range", low: "Below reference", high: "Above reference",
  crit_high: "Markedly above reference", crit_low: "Markedly below reference",
  qnorm: "Unremarkable", qpos: "Finding", none: "No reference", missing: "No structured result",
};
const OUT_SEVS = new Set<Severity>(["high", "low", "crit_high", "crit_low"]);
const FLAG_SEVS = new Set<Severity>(["high", "low", "crit_high", "crit_low", "qpos"]);
const SEV_RANK: Partial<Record<Severity, number>> = { crit_high: 0, crit_low: 0, high: 1, low: 1, qpos: 2 };

const valColor = (cell: Cell | null | undefined, ref: RefInfo): string =>
  cell && cell.val.type !== "missing" ? SEV_TEXT[severityOf(cell, ref)] : "var(--faint)";

/* ------------------------------ CLINICAL GROUPING -------------------------------- */

const DOMAINS = [
  { id: "inflammation", label: "Inflammation and immunology" },
  { id: "kidney", label: "Kidney and albuminuria" },
  { id: "cbc", label: "CBC and anemia" },
  { id: "glycemic", label: "Glycemic control" },
  { id: "electrolytes", label: "Electrolytes and minerals" },
  { id: "liver", label: "Liver and proteins" },
  { id: "lipids", label: "Lipids" },
  { id: "urinalysis", label: "Urinalysis" },
  { id: "thyroid", label: "Thyroid" },
  { id: "other", label: "Other" },
];
const DOMAIN_LABEL: Record<string, string> = Object.fromEntries(DOMAINS.map((d) => [d.id, d.label]));

const MAP: Record<string, { domain: string; parent?: string }> = {
  "HEMATOLOGY||Erythrocyte Sedimentation Rate 1 hour": { domain: "inflammation" },
  "SEROLOGY||Anti-Streptolysine O (ASO)": { domain: "inflammation" },
  "SEROLOGY||C-Reactive Protein (CRP)": { domain: "inflammation" },
  "SEROLOGY||Rheumatoid Factors": { domain: "inflammation" },

  "BIOCHEMISTRY||Creatinine": { domain: "kidney" },
  "BIOCHEMISTRY||Urea Nitrogen (BUN)": { domain: "kidney" },
  "URINE BIOCHEMISTRY (Microalbumin Roche)||Microalbumin/Cre Ratio": { domain: "kidney" },
  "URINE BIOCHEMISTRY (Microalbumin Roche)||Urine Creatinine": { domain: "kidney", parent: "URINE BIOCHEMISTRY (Microalbumin Roche)||Microalbumin/Cre Ratio" },
  "URINE BIOCHEMISTRY (Microalbumin Roche)||Urine Microalbumin": { domain: "kidney", parent: "URINE BIOCHEMISTRY (Microalbumin Roche)||Microalbumin/Cre Ratio" },

  "CELL BLOOD COUNT||White blood cell": { domain: "cbc" },
  "CELL BLOOD COUNT||Red blood cell": { domain: "cbc" },
  "CELL BLOOD COUNT||Haemoglobin": { domain: "cbc" },
  "CELL BLOOD COUNT||Hematocrit": { domain: "cbc" },
  "CELL BLOOD COUNT||Platelet count": { domain: "cbc" },
  "CELL BLOOD COUNT||M.C.V": { domain: "cbc" },
  "CELL BLOOD COUNT||M.C.H": { domain: "cbc" },
  "CELL BLOOD COUNT||M.C.H.C": { domain: "cbc" },
  "DIFFERENTIAL COUNT||Neutrophils": { domain: "cbc" },
  "DIFFERENTIAL COUNT||Eosinophils": { domain: "cbc" },
  "DIFFERENTIAL COUNT||Basophils": { domain: "cbc" },
  "DIFFERENTIAL COUNT||Lymphocytes": { domain: "cbc" },
  "DIFFERENTIAL COUNT||Monocytes": { domain: "cbc" },

  "BIOCHEMISTRY||Glucose": { domain: "glycemic" },
  "GLYCOSYLATED HAEMOGLOBIN (Roche)||Hb A1c % (DCCT/NGSP)": { domain: "glycemic" },
  "GLYCOSYLATED HAEMOGLOBIN (Roche)||Hb A1c (acc to IFCC)": { domain: "glycemic", parent: "GLYCOSYLATED HAEMOGLOBIN (Roche)||Hb A1c % (DCCT/NGSP)" },

  "ELECTROLYTES||Sodium (Na+)": { domain: "electrolytes" },
  "ELECTROLYTES||Potassium (K+)": { domain: "electrolytes" },
  "ELECTROLYTES||Chlorures (Cl-)": { domain: "electrolytes" },
  "BIOCHEMISTRY||Magnesium": { domain: "electrolytes" },
  "BIOCHEMISTRY||Calcium": { domain: "electrolytes" },
  "BIOCHEMISTRY||Phosphorus": { domain: "electrolytes" },

  "BIOCHEMISTRY||Albumin": { domain: "liver" },
  "ENZYMOLOGY||AST (Aspartate Aminotrans.)": { domain: "liver" },
  "ENZYMOLOGY||ALT (Alanine Aminotrans.)": { domain: "liver" },

  "BIOCHEMISTRY||Total Cholesterol": { domain: "lipids" },
  "BIOCHEMISTRY||LDL-Cholesterol": { domain: "lipids" },
  "BIOCHEMISTRY||Triglyceride": { domain: "lipids" },

  "URINE BIOCHEMISTRY||pH": { domain: "urinalysis" },
  "URINE BIOCHEMISTRY||Specific Gravity": { domain: "urinalysis" },
  "URINE BIOCHEMISTRY||Protein": { domain: "urinalysis" },
  "URINE BIOCHEMISTRY||Glucose": { domain: "urinalysis" },
  "URINE BIOCHEMISTRY||Ketone": { domain: "urinalysis" },
  "URINE BIOCHEMISTRY||Blood": { domain: "urinalysis" },
  "URINE BIOCHEMISTRY||Nitrite": { domain: "urinalysis" },
  "URINE BIOCHEMISTRY||Urobilinogen": { domain: "urinalysis" },
  "URINE BIOCHEMISTRY||Bilirubin": { domain: "urinalysis" },
  "URINE CYTOLOGY||Color": { domain: "urinalysis" },
  "URINE CYTOLOGY||Transparency": { domain: "urinalysis" },
  "CYTOLOGY EXAMEN||White Blood Cells": { domain: "urinalysis" },
  "CYTOLOGY EXAMEN||Red Blood Cells": { domain: "urinalysis" },
  "CYTOLOGY EXAMEN||Epithelial cells": { domain: "urinalysis" },
  "CYTOLOGY EXAMEN||Vessical/Bladder cells": { domain: "urinalysis" },
  "CYTOLOGY EXAMEN||Renal cells": { domain: "urinalysis" },
  "CYTOLOGY EXAMEN||Cast": { domain: "urinalysis" },
  "CYTOLOGY EXAMEN||Cristals/Crystals": { domain: "urinalysis" },
  "CYTOLOGY EXAMEN||Bacteries/Bacteria": { domain: "urinalysis" },
  "CYTOLOGY EXAMEN||Yeast": { domain: "urinalysis" },
  "CYTOLOGY EXAMEN||Trichomonas": { domain: "urinalysis" },

  "THYROIDS||TSH (Thyreotrope)": { domain: "thyroid" },

  "BIOCHEMISTRY||Uric Acid": { domain: "other" },
};
const domainFor = (section: string, test: string) => MAP[`${section}||${test}`] || { domain: "other" };

const DISPLAY: Record<string, string> = {
  "Erythrocyte Sedimentation Rate 1 hour": "ESR",
  "Urea Nitrogen (BUN)": "BUN",
  "Microalbumin/Cre Ratio": "Microalbumin / creatinine ratio",
  "Hb A1c % (DCCT/NGSP)": "HbA1c (%)",
  "Hb A1c (acc to IFCC)": "HbA1c (IFCC)",
  "TSH (Thyreotrope)": "TSH",
  "Anti-Streptolysine O (ASO)": "ASO",
  "C-Reactive Protein (CRP)": "CRP",
  "AST (Aspartate Aminotrans.)": "AST",
  "ALT (Alanine Aminotrans.)": "ALT",
  "Sodium (Na+)": "Sodium",
  "Potassium (K+)": "Potassium",
  "Chlorures (Cl-)": "Chloride",
  "White blood cell": "White blood cells",
  "Red blood cell": "Red blood cells",
  "Vessical/Bladder cells": "Bladder cells",
  "Cristals/Crystals": "Crystals",
  "Bacteries/Bacteria": "Bacteria",
};
const displayName = (test: string) => DISPLAY[test] || test;

const SECTION_SHORT: Record<string, string> = {
  "CELL BLOOD COUNT": "CBC",
  "DIFFERENTIAL COUNT": "Differential",
  "CYTOLOGY EXAMEN": "Urine cytology",
  "URINE BIOCHEMISTRY": "Urine chemistry",
  "URINE BIOCHEMISTRY (Microalbumin Roche)": "Microalbumin panel",
  "URINE CYTOLOGY": "Urine appearance",
  "GLYCOSYLATED HAEMOGLOBIN (Roche)": "HbA1c panel",
};
const sectionShort = (s: string) => SECTION_SHORT[s] || s.charAt(0) + s.slice(1).toLowerCase();

/* --------------------------------- ROW MODEL -------------------------------------- */

function normalizeRow(raw: RawRow): BaseRow {
  const ref = parseReference(raw.reference);
  const dom = domainFor(raw.section, raw.test);
  const cells: Cell[] = DATES.map((d) => {
    const val = parseValue(raw.values[d]);
    return { date: d, val, status: classifyCell(val, ref) };
  });
  const availDesc = cells.filter((c) => c.val.type !== "missing");
  const numericAvail = availDesc.filter((c) => c.val.type === "numeric");
  const valueType = numericAvail.length ? "numeric" : availDesc.length ? "qualitative" : "missing";
  return {
    key: `${raw.section}||${raw.test}`,
    section: raw.section,
    test: raw.test,
    displayName: displayName(raw.test),
    unit: raw.unit,
    reference: ref,
    domain: dom.domain,
    parentKey: dom.parent || null,
    isComponent: !!dom.parent,
    cells,
    availDesc,
    numericAvail,
    valueType,
    isPresentInLatest: cells[0].val.type !== "missing",
    latestResult: availDesc[0] || null,
  };
}

/* Groups: out / watch / resolved / stale / noref / ok. */
function rowState(row: BaseRow): RowStateInfo {
  const ref = row.reference;
  const latest = row.cells[0];
  const present = latest.val.type !== "missing";
  const avail = row.availDesc;

  if (present) {
    const sev = severityOf(latest, ref);
    const prev = avail[1] || null;

    if (OUT_SEVS.has(sev)) {
      const dir = sev === "high" || sev === "crit_high" ? "Above range" : "Below range";
      let qual = "";
      if (!prev) qual = "first result";
      else {
        const ps = severityOf(prev, ref);
        if (!FLAG_SEVS.has(ps)) qual = "new this draw";
        else if (latest.val.type === "numeric" && prev.val.type === "numeric" && ref.parsable) {
          const dNow = distToBound(latest.val.num as number, ref);
          const dPrev = distToBound(prev.val.num as number, ref);
          qual = dNow < dPrev ? "improving" : dNow > dPrev ? "further out" : "persistent";
        } else qual = "persistent";
      }
      return { group: "out", sev, reason: qual ? `${dir} · ${qual}` : dir };
    }

    if (sev === "qpos") {
      let extra = "";
      const prevRaw = prev && prev.val.type !== "missing" ? prev.val.raw : null;
      if (prevRaw != null && qualLevel(prevRaw) !== qualLevel(latest.val.raw)) extra = ` · was ${prevRaw}`;
      return { group: "watch", sev, reason: `${latest.val.raw} this draw${extra}` };
    }

    if (sev === "none") return { group: "noref", sev, reason: "No reference range" };

    const earlierFlag = avail.slice(1).find((c) => FLAG_SEVS.has(severityOf(c, ref)));
    if (earlierFlag) {
      const es = severityOf(earlierFlag, ref);
      const when = monShort(earlierFlag.date);
      const reason =
        es === "qpos"
          ? `${earlierFlag.val.raw} in ${when} · now ${latest.val.raw}`
          : `Out of range in ${when} · in range now`;
      return { group: "resolved", sev, reason };
    }
    return { group: "ok", sev, reason: avail.length === 1 ? "First result" : "" };
  }

  const last = avail[0] || null;
  if (!last) return { group: "stale", sev: "missing", reason: "No results" };
  const ls = severityOf(last, ref);
  if (FLAG_SEVS.has(ls)) {
    const what = ls === "qpos" ? `${last.val.raw}` : "out of range";
    return { group: "watch", sev: ls, basedOn: last.date, reason: `Last result ${what} (${monShort(last.date)}) · not repeated` };
  }
  if (avail.length === 1) return { group: "stale", sev: ls, basedOn: last.date, reason: `Single result · ${fmtDate(last.date)}` };
  return { group: "stale", sev: ls, basedOn: last.date, reason: `Not in latest draw · last ${fmtDate(last.date)}` };
}

const GROUP_RANK: Record<Group, number> = { out: 0, watch: 1, resolved: 2, stale: 3, noref: 4, ok: 5 };
const GROUP_REASON_COLOR: Record<Group, string | null> = {
  out: null, // uses severity colour
  watch: "var(--orange)",
  resolved: "var(--green)",
  stale: "var(--faint)",
  noref: "var(--faint)",
  ok: "var(--faint)",
};

function sortRows(list: RowModel[]): RowModel[] {
  return [...list].sort((a, b) => {
    const g = GROUP_RANK[a.group] - GROUP_RANK[b.group];
    if (g !== 0) return g;
    const s = (SEV_RANK[a.sev] ?? 9) - (SEV_RANK[b.sev] ?? 9);
    if (s !== 0) return s;
    return a.displayName.localeCompare(b.displayName);
  });
}

function buildModel(): RowModel[] {
  return parseCsv(RAW_CSV)
    .map(normalizeRow)
    .map((r) => {
      const st = rowState(r);
      return { ...r, ...st, blob: blobFor(r) };
    });
}

/* --------------------------- FORMAT + SEARCH HELPERS ----------------------------- */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function fmtDate(d: string): string {
  return d ? `${MONTHS[parseInt(d.slice(5, 7), 10) - 1]} ${parseInt(d.slice(8, 10), 10)}` : "";
}
function monShort(d: string): string {
  return d ? MONTHS[parseInt(d.slice(5, 7), 10) - 1] : "";
}

function refSummaryText(ref: RefInfo): string {
  if (ref.kind === "range") return `${ref.low}–${ref.high}`;
  if (ref.kind === "upper") return `< ${ref.high}`;
  if (ref.kind === "lower") return `> ${ref.low}`;
  return "";
}
function refDisplay(ref: RefInfo | null): string {
  if (!ref) return "";
  return ref.parsable ? refSummaryText(ref) : ref.raw || "";
}

function fmtDelta(now: number, prev: number): string {
  const d = now - prev;
  const a = Math.abs(d);
  let s = a >= 100 ? d.toFixed(0) : a >= 10 ? d.toFixed(1) : d.toFixed(2);
  s = s.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
  return (d > 0 ? "+" : "") + s;
}

const SYNONYMS: Record<string, string> = {
  inflammation: "inflammation esr sed rate sedimentation crp c-reactive aso streptolysine rheumatoid rf rheum immunology serology",
  kidney: "kidney renal creatinine bun urea albuminuria microalbumin nephro",
  cbc: "cbc anemia anaemia blood count haemoglobin hemoglobin hgb hematocrit hct rbc wbc platelet neutrophil lymphocyte monocyte eosinophil basophil differential",
  glycemic: "glycemic glycaemic diabetes glucose sugar a1c hba1c",
  electrolytes: "electrolyte mineral sodium na potassium k chloride cl magnesium mg calcium ca phosphorus phosphate",
  liver: "liver hepatic ast alt transaminase albumin protein enzyme",
  lipids: "lipid cholesterol ldl hdl triglyceride fat",
  urinalysis: "urine urinalysis urinary ph protein ketone nitrite blood bacteria yeast crystals cytology sediment epithelial cast appearance color transparency",
  thyroid: "thyroid tsh thyrotropin thyreotrope",
  other: "uric acid urate gout",
};
function blobFor(r: BaseRow): string {
  return [r.displayName, r.test, r.section, sectionShort(r.section), DOMAIN_LABEL[r.domain], SYNONYMS[r.domain] || ""]
    .join(" ")
    .toLowerCase();
}

function qualAbbrev(raw: string): string {
  const t = (raw || "").toLowerCase();
  if (!t) return "—";
  if (/positive\s*\+\+/.test(t)) return "++";
  if (/positive\s*\+/.test(t)) return "+";
  if (/positive/.test(t)) return "Pos";
  if (/presence\s*\+/.test(t)) return "Pr+";
  if (/presence/.test(t)) return "Pres";
  if (/trace/.test(t)) return "Tr";
  if (/absence/.test(t)) return "Abs";
  if (/cloudy/.test(t)) return "Cldy";
  if (/clear/.test(t)) return "Clr";
  if (/yellow/.test(t)) return "Yel";
  if (/rare/.test(t)) return "Rare";
  return raw.length > 5 ? raw.slice(0, 4) : raw;
}

/* --------------------------------- VISUALS --------------------------------------- */

function Spark({ row }: { row: RowModel }) {
  const asc = [...DATES].sort();
  const pts = asc.map((d) => {
    const cell = row.cells.find((c) => c.date === d);
    return { date: d, num: cell && cell.val.type === "numeric" ? (cell.val.num as number) : null, cell };
  });
  const nums = pts.filter((p) => p.num != null).map((p) => p.num as number);
  if (nums.length < 2) return <span className="kl-flat">{nums.length === 1 ? "single" : ""}</span>;

  const sorted = [...nums].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  let normalVals = nums;
  const clipped: number[] = [];
  if (nums.length >= 3) {
    const thr = median * 3;
    const outs = nums.filter((v) => v > thr);
    if (outs.length) {
      normalVals = nums.filter((v) => v <= thr);
      outs.forEach((v) => clipped.push(v));
    }
  }
  let lo = Math.min(...normalVals);
  let hi = Math.max(...normalVals);
  const ref = row.reference;
  if (ref.kind === "range") {
    lo = Math.min(lo, ref.low as number);
    hi = Math.max(hi, ref.high as number);
  } else if (ref.kind === "upper") hi = Math.max(hi, ref.high as number);
  else if (ref.kind === "lower") lo = Math.min(lo, ref.low as number);
  if (lo === hi) {
    lo -= 1;
    hi += 1;
  }
  const span = hi - lo;
  lo -= span * 0.16;
  hi += span * 0.16;

  const W = 100, H = 26, padX = 4, padY = 5;
  const xOf = (i: number) => padX + (asc.length === 1 ? 0 : (i * (W - 2 * padX)) / (asc.length - 1));
  const yOf = (v: number) => {
    const c = Math.max(lo, Math.min(hi, v));
    return padY + (H - 2 * padY) * (1 - (c - lo) / (hi - lo));
  };

  let band: [number, number] | null = null;
  if (ref.kind === "range") band = [yOf(ref.high as number), yOf(ref.low as number)];
  else if (ref.kind === "upper") band = [yOf(ref.high as number), H - padY];
  else if (ref.kind === "lower") band = [padY, yOf(ref.low as number)];

  const segs: number[][][] = [];
  let cur: number[][] = [];
  pts.forEach((p, i) => {
    if (p.num == null) {
      if (cur.length > 1) segs.push(cur);
      cur = [];
    } else cur.push([xOf(i), yOf(p.num)]);
  });
  if (cur.length > 1) segs.push(cur);

  const lastIdx = (() => {
    for (let i = pts.length - 1; i >= 0; i--) if (pts[i].num != null) return i;
    return -1;
  })();

  const aria =
    `${row.displayName} trend: ` +
    pts.map((p) => `${monShort(p.date)} ${p.num != null ? p.num : "no result"}`).join(", ") +
    (clipped.length ? `. Earlier high value ${clipped.join(", ")} above chart scale.` : "");

  return (
    <svg className="kl-spark" width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={aria}>
      {band && (
        <rect x="0" y={Math.min(band[0], band[1])} width={W} height={Math.abs(band[1] - band[0])} fill="var(--green-dot)" opacity="0.10" />
      )}
      {segs.map((s, k) => (
        <polyline key={k} points={s.map((p) => p.join(",")).join(" ")} fill="none" stroke="var(--ink2)" strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round" />
      ))}
      {pts.map((p, i) => {
        if (p.num == null) return null;
        const isClip = clipped.includes(p.num);
        const isLast = i === lastIdx;
        const y = isClip ? padY + 1 : yOf(p.num);
        const fill = isLast ? SEV_DOT[severityOf(p.cell, row.reference)] : "var(--ink2)";
        return (
          <g key={i}>
            {isClip && (
              <path d={`M ${xOf(i) - 3} ${padY + 4} L ${xOf(i)} ${padY} L ${xOf(i) + 3} ${padY + 4}`} fill="none" stroke="var(--red)" strokeWidth="1.2" />
            )}
            <circle cx={xOf(i)} cy={y} r={isLast ? 2.5 : 1.7} fill={fill} />
          </g>
        );
      })}
    </svg>
  );
}

function QualStrip({ row }: { row: RowModel }) {
  const asc = [...DATES].sort();
  const aria =
    `${row.displayName}: ` +
    asc
      .map((d) => {
        const c = row.cells.find((x) => x.date === d);
        return `${fmtDate(d)} ${c && c.val.type !== "missing" ? c.val.raw : "no result"}`;
      })
      .join(", ");
  return (
    <span className="kl-qstrip" role="img" aria-label={aria}>
      {asc.map((d) => {
        const c = row.cells.find((x) => x.date === d);
        const has = !!c && c.val.type !== "missing";
        const sev = has ? severityOf(c, row.reference) : "missing";
        return (
          <span key={d} className="kl-qcell" title={`${fmtDate(d)}: ${has ? (c as Cell).val.raw : "No structured result"}`}>
            <span className="kl-qval" style={{ color: has ? SEV_TEXT[sev] : "var(--faint)" }}>
              {has ? qualAbbrev((c as Cell).val.raw) : "—"}
            </span>
            <span className="kl-qdot" style={{ background: has ? SEV_DOT[sev] : "transparent" }} />
          </span>
        );
      })}
    </span>
  );
}

function MiniTrend({ row }: { row: RowModel }) {
  if (row.valueType === "qualitative") return <QualStrip row={row} />;
  if (row.valueType === "numeric") return <Spark row={row} />;
  return null;
}

function QualTimeline({ row }: { row: RowModel }) {
  const asc = [...DATES].sort();
  return (
    <div
      className="kl-qtl"
      role="img"
      aria-label={
        `${row.displayName} timeline. ` +
        asc
          .map((d) => {
            const c = row.cells.find((x) => x.date === d);
            const has = !!c && c.val.type !== "missing";
            return `${fmtDate(d)} ${has ? (c as Cell).val.raw : "no structured result"}`;
          })
          .join("; ") +
        "."
      }
    >
      {asc.map((d) => {
        const c = row.cells.find((x) => x.date === d);
        const has = !!c && c.val.type !== "missing";
        const sev = has ? severityOf(c, row.reference) : "missing";
        return (
          <div key={d} className="kl-qtl-cell" title={`${fmtDate(d)}: ${has ? (c as Cell).val.raw : "No structured result"}`}>
            <div className="kl-qtl-date">{monShort(d)}</div>
            <div className="kl-qtl-line">
              <span className={`kl-qtl-dot${has ? "" : " kl-qtl-dot-miss"}`} style={has ? { background: SEV_DOT[sev] } : undefined} />
            </div>
            <div className={`kl-qtl-val${has ? "" : " kl-qtl-val-miss"}`}>{has ? (c as Cell).val.raw : "—"}</div>
          </div>
        );
      })}
    </div>
  );
}

function BigChart({ row }: { row: RowModel }) {
  const asc = [...DATES].sort();
  const ref = row.reference;
  const pts = asc.map((d) => {
    const cell = row.cells.find((c) => c.date === d);
    return { date: d, num: cell && cell.val.type === "numeric" ? (cell.val.num as number) : null, cell };
  });
  const nums = pts.filter((p) => p.num != null).map((p) => p.num as number);
  const sorted = [...nums].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  let shown = nums;
  const clipped: number[] = [];
  if (nums.length >= 3) {
    const thr = median * 3;
    const outs = nums.filter((v) => v > thr);
    if (outs.length) {
      shown = nums.filter((v) => v <= thr);
      outs.forEach((v) => clipped.push(v));
    }
  }
  let lo = Math.min(...shown);
  let hi = Math.max(...shown);
  if (ref.kind === "range") {
    lo = Math.min(lo, ref.low as number);
    hi = Math.max(hi, ref.high as number);
  } else if (ref.kind === "upper") hi = Math.max(hi, ref.high as number);
  else if (ref.kind === "lower") lo = Math.min(lo, ref.low as number);
  if (lo === hi) {
    lo -= 1;
    hi += 1;
  }
  const span = hi - lo;
  lo -= span * 0.14;
  hi += span * 0.14;

  const W = 320, H = 150, L = 8, Rg = 36, T = 18, B = 24;
  const plotW = W - L - Rg, plotH = H - T - B;
  const xOf = (i: number) => L + (asc.length === 1 ? plotW / 2 : (i * plotW) / (asc.length - 1));
  const yOf = (v: number) => {
    const c = Math.max(lo, Math.min(hi, v));
    return T + plotH * (1 - (c - lo) / (hi - lo));
  };

  let band: [number, number] | null = null;
  let bandLabels: Array<[number, number]> = [];
  if (ref.kind === "range") {
    band = [yOf(ref.high as number), yOf(ref.low as number)];
    bandLabels = [
      [ref.high as number, yOf(ref.high as number)],
      [ref.low as number, yOf(ref.low as number)],
    ];
  } else if (ref.kind === "upper") {
    band = [yOf(ref.high as number), T + plotH];
    bandLabels = [[ref.high as number, yOf(ref.high as number)]];
  } else if (ref.kind === "lower") {
    band = [T, yOf(ref.low as number)];
    bandLabels = [[ref.low as number, yOf(ref.low as number)]];
  }

  const segs: number[][][] = [];
  let cur: number[][] = [];
  pts.forEach((p, i) => {
    if (p.num == null) {
      if (cur.length > 1) segs.push(cur);
      cur = [];
    } else cur.push([xOf(i), yOf(p.num)]);
  });
  if (cur.length > 1) segs.push(cur);
  const lastIdx = (() => {
    for (let i = pts.length - 1; i >= 0; i--) if (pts[i].num != null) return i;
    return -1;
  })();

  const aria =
    `${row.displayName} trend${row.unit ? `, ${row.unit}` : ""}. ` +
    pts.map((p) => `${fmtDate(p.date)} ${p.num != null ? p.num : "no result"}`).join("; ") +
    (band ? `. Reference ${refSummaryText(ref)}` : "") +
    (clipped.length ? `. Earlier value ${clipped.join(", ")} above the chart scale` : "") +
    ".";

  return (
    <svg className="kl-bigspark" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label={aria}>
      {band && (
        <rect x={L} y={Math.min(band[0], band[1])} width={plotW} height={Math.abs(band[1] - band[0])} fill="var(--green-dot)" opacity="0.12" />
      )}
      {bandLabels.map(([val, y], k) => (
        <g key={`b${k}`}>
          <line x1={L} y1={y} x2={L + plotW} y2={y} stroke="var(--green)" strokeWidth="0.7" strokeDasharray="3 3" opacity="0.5" />
          <text x={L + plotW + 5} y={y + 3.2} className="kl-axis-t">{val}</text>
        </g>
      ))}
      {segs.map((s, k) => (
        <polyline key={`s${k}`} points={s.map((p) => p.join(",")).join(" ")} fill="none" stroke="var(--ink2)" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
      ))}
      {pts.map((p, i) => {
        if (p.num == null)
          return (
            <text key={i} x={xOf(i)} y={H - 8} textAnchor="middle" className="kl-axis-d kl-axis-d-faint">
              {monShort(p.date)}
            </text>
          );
        const isClip = clipped.includes(p.num);
        const isLast = i === lastIdx;
        const y = isClip ? T - 2 : yOf(p.num);
        const sev = severityOf(p.cell, ref);
        const fill = isLast ? SEV_DOT[sev] : "var(--ink2)";
        const labelY = y - 8 < T ? y + 13 : y - 8;
        return (
          <g key={i}>
            {isClip && (
              <path d={`M ${xOf(i) - 4} ${T + 2} L ${xOf(i)} ${T - 3} L ${xOf(i) + 4} ${T + 2}`} fill="none" stroke="var(--red-dot)" strokeWidth="1.4" />
            )}
            <circle cx={xOf(i)} cy={y} r={isLast ? 3.4 : 2.4} fill={fill} stroke="#fff" strokeWidth={isLast ? 1 : 0} />
            {isLast && !isClip && (
              <text x={xOf(i)} y={labelY} textAnchor="middle" className="kl-pt-last" style={{ fill: SEV_TEXT[sev] }}>
                {p.num}
              </text>
            )}
            <text x={xOf(i)} y={H - 8} textAnchor="middle" className="kl-axis-d">{monShort(p.date)}</text>
          </g>
        );
      })}
    </svg>
  );
}

function DetailTrend({ row }: { row: RowModel }) {
  if (row.valueType === "qualitative") return <QualTimeline row={row} />;
  if (row.valueType === "numeric") {
    if (row.numericAvail.length >= 2) return <BigChart row={row} />;
    if (row.numericAvail.length === 1) {
      const c = row.numericAvail[0];
      const ref = row.reference;
      const sev = severityOf(c, ref);
      const refDisp = refDisplay(ref);
      return (
        <div className="kl-trend-single">
          <div className="kl-ts-val kl-num" style={{ color: valColor(c, ref) }}>
            {c.val.raw}
            {row.unit ? <span className="kl-ts-unit">{row.unit}</span> : null}
          </div>
          <div className="kl-ts-sub">
            {fmtDate(c.date)}
            {ref.parsable && SEV_LABEL[sev] ? ` · ${SEV_LABEL[sev]}` : ""}
          </div>
          {refDisp ? <div className="kl-ts-ref">ref {refDisp}</div> : <div className="kl-ts-ref">no structured reference</div>}
          <div className="kl-ts-note">Only one result so far, nothing to plot yet.</div>
        </div>
      );
    }
    return <div className="kl-trend-none">No numeric results to plot.</div>;
  }
  return <div className="kl-trend-none">No results to plot.</div>;
}

/* ------------------------------- ROW + DETAIL ------------------------------------ */

function RowDetail({ row, childrenByParent }: { row: RowModel; childrenByParent: Record<string, RowModel[]> }) {
  const kids = childrenByParent[row.key] || [];
  const ref = row.reference;

  // neutral change vs the previous available numeric result
  let delta: { zero: boolean; text: string; vs: string } | null = null;
  const lr = row.latestResult;
  if (lr && lr.val.type === "numeric") {
    const prev = row.availDesc[1];
    if (prev && prev.val.type === "numeric") {
      delta = {
        zero: lr.val.num === prev.val.num,
        text: fmtDelta(lr.val.num as number, prev.val.num as number),
        vs: fmtDate(prev.date),
      };
    }
  }

  const notes: string[] = [];
  if (!row.isPresentInLatest)
    notes.push(`No result recorded on ${fmtDate(LATEST)}, 2026. Earlier values are shown; absence is never read as normal.`);
  if (row.valueType === "numeric" && !ref.parsable && row.availDesc.length > 0)
    notes.push("No machine-readable reference range. Values are listed but not scored.");
  if (row.availDesc.length === 1) notes.push("Single result so far. No trend yet.");
  if (row.valueType === "qualitative") notes.push("Qualitative result. Shown as a labelled timeline, not a numeric trend.");

  const refDisp = refDisplay(ref);

  return (
    <div className="kl-detail">
      <div className="kl-detail-meta">
        <span>
          <span className="kl-k">Source</span> {sectionShort(row.section)}
        </span>
        {row.unit && (
          <span>
            <span className="kl-k">Unit</span> {row.unit}
          </span>
        )}
        {delta && (
          <span>
            <span className="kl-k">Change</span> {delta.zero ? "no change" : <span className="kl-num">{delta.text}</span>} vs {delta.vs}
          </span>
        )}
      </div>

      <div className="kl-detail-grid">
        <div className="kl-detail-left">
          <div className="kl-hist-h">
            <span>Result history</span>
            {refDisp && (
              <span className="kl-hist-ref" title={ref.raw && ref.raw !== refDisp ? `Reference as reported: ${ref.raw}` : undefined}>
                ref {refDisp}
                {row.unit ? ` ${row.unit}` : ""}
              </span>
            )}
          </div>
          <div className="kl-hist">
            {row.cells.map((c) => {
              const has = c.val.type !== "missing";
              const sev = has ? severityOf(c, ref) : "missing";
              const label = has ? SEV_LABEL[sev] : "No structured result";
              return (
                <div key={c.date} className={`kl-hist-row${c.date === LATEST ? " kl-hist-latest" : ""}${has ? "" : " kl-hist-missing"}`}>
                  <span className="kl-hist-node">
                    <span className={`kl-hist-pt${has ? "" : " kl-hist-pt-miss"}`} style={has ? { background: SEV_DOT[sev] } : undefined} />
                  </span>
                  <span className="kl-hist-date">
                    {fmtDate(c.date)}
                    {c.date === LATEST ? " · latest" : ""}
                  </span>
                  <span className="kl-hist-val kl-num" style={has ? { color: valColor(c, ref) } : undefined}>
                    {has ? c.val.raw : "—"}
                  </span>
                  <span className="kl-hist-status">{label}</span>
                </div>
              );
            })}
          </div>
          {notes.length > 0 && (
            <div className="kl-notes">
              {notes.map((n, i) => (
                <p key={i} className="kl-notes-line">{n}</p>
              ))}
            </div>
          )}
        </div>

        <div className="kl-detail-right">
          <div className="kl-trend-h">
            Trend{row.unit ? <span className="kl-trend-h-u">{" · "}{row.unit}</span> : null}
          </div>
          <div className="kl-trend-box">
            <DetailTrend row={row} />
          </div>
          {row.valueType === "numeric" && ref.parsable && row.numericAvail.length >= 2 && (
            <div className="kl-trend-cap">Shaded band marks the reference range.</div>
          )}
        </div>
      </div>

      {kids.length > 0 && (
        <div className="kl-kids">
          <div className="kl-kids-h">Component results</div>
          {kids.map((k) => (
            <div key={k.key} className="kl-kid">
              <div className="kl-kid-name">
                {k.displayName}
                <span
                  className="kl-kid-meta"
                  title={k.reference.raw && k.reference.raw !== refDisplay(k.reference) ? `Reference as reported: ${k.reference.raw}` : undefined}
                >
                  {k.unit}
                  {refDisplay(k.reference) ? ` · ref ${refDisplay(k.reference)}` : ""}
                </span>
              </div>
              <div className="kl-kid-seq">
                {[...DATES].sort().map((d) => {
                  const c = k.cells.find((x) => x.date === d);
                  const has = !!c && c.val.type !== "missing";
                  return (
                    <span key={d} className="kl-kid-pt" title={`${fmtDate(d)}: ${has ? (c as Cell).val.raw : "No structured result"}`}>
                      <span className="kl-kid-d">{monShort(d)}</span>
                      <span className="kl-num" style={{ color: valColor(c, k.reference) }}>
                        {has ? (c as Cell).val.raw : "—"}
                      </span>
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LabRow({
  row,
  expanded,
  onToggle,
  childrenByParent,
}: {
  row: RowModel;
  expanded: boolean;
  onToggle: () => void;
  childrenByParent: Record<string, RowModel[]>;
}) {
  const dim = !!row.basedOn; // status reflects an older draw
  const dotTitle = dim ? `${SEV_LABEL[row.sev] || ""} · from ${fmtDate(row.basedOn as string)}` : SEV_LABEL[row.sev] || "";
  const lr = row.latestResult;
  const reasonColor = row.group === "out" ? SEV_TEXT[row.sev] : GROUP_REASON_COLOR[row.group];
  const aria = `${row.displayName}. ${lr ? `${lr.val.raw} ${row.unit || ""} on ${fmtDate(lr.date)}.` : "No result."} ${row.reason || "In range."}`;

  return (
    <div className="kl-rowwrap">
      <div
        className="kl-row"
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        aria-label={aria}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle();
          }
        }}
      >
        <div className="kl-l1">
          <span className="kl-dot" title={dotTitle} style={{ background: SEV_DOT[row.sev] || "var(--neutral-dot)", opacity: dim ? 0.5 : 1 }} aria-hidden="true" />
          <span className="kl-name">{row.displayName}</span>
          <span className="kl-spacer" />
          <span className="kl-mini">
            <MiniTrend row={row} />
          </span>
          <span className="kl-val">
            {lr ? (
              <>
                <span className="kl-num" style={{ color: valColor(lr, row.reference) }}>{lr.val.raw}</span>
                {row.unit ? <span className="kl-unit">{row.unit}</span> : null}
                {dim ? <span className="kl-when">{monShort(lr.date)}</span> : null}
              </>
            ) : (
              <span className="kl-faint">no result</span>
            )}
          </span>
          <ChevronRight size={14} variant="stroke" className="kl-chev" style={{ transform: expanded ? "rotate(90deg)" : "none" }} />
        </div>
        {row.reason ? (
          <div className="kl-l2">
            <span className="kl-reason" style={{ color: reasonColor || "var(--ink2)" }}>{row.reason}</span>
            {refDisplay(row.reference) ? (
              <span
                className="kl-ref"
                title={row.reference.raw && row.reference.raw !== refDisplay(row.reference) ? `Reference as reported: ${row.reference.raw}` : undefined}
              >
                ref {refDisplay(row.reference)}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
      {expanded && <RowDetail row={row} childrenByParent={childrenByParent} />}
    </div>
  );
}

/* --------------------------------- SOURCE TABLE ---------------------------------- */

function SourceTable({ rows }: { rows: RowModel[] }) {
  return (
    <div className="kl-src-scroll">
      <table className="kl-src">
        <thead>
          <tr>
            <th className="kl-src-th kl-src-sticky">Test</th>
            {DATES.map((d) => (
              <th key={d} className="kl-src-th kl-num kl-src-dcol">{fmtDate(d)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className="kl-src-row">
              <td className="kl-src-name kl-src-sticky">
                <div>{r.displayName}</div>
                <div className="kl-src-sub">
                  {r.unit || "no unit"}
                  {r.reference.raw ? ` · ${r.reference.raw}` : ""}
                </div>
              </td>
              {DATES.map((d) => {
                const c = r.cells.find((x) => x.date === d);
                const has = !!c && c.val.type !== "missing";
                return (
                  <td
                    key={d}
                    className="kl-src-cell kl-num"
                    title={has ? `${fmtDate(d)}: ${(c as Cell).val.raw}` : "No structured result"}
                    style={{ color: valColor(c, r.reference) }}
                  >
                    {has ? (c as Cell).val.raw : "—"}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ----------------------------------- PAGE ---------------------------------------- */

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "all", label: "All tests" },
  { id: "table", label: "Table" },
];

const CHIPS: Array<{ id: string; label: string; groups: Group[] | null }> = [
  { id: "all", label: "All", groups: null },
  { id: "ever", label: "Ever flagged", groups: ["out", "watch", "resolved"] },
  { id: "out", label: "Out of range", groups: ["out"] },
  { id: "watch", label: "Watch", groups: ["watch"] },
  { id: "resolved", label: "Resolved", groups: ["resolved"] },
  { id: "stale", label: "Not in latest draw", groups: ["stale"] },
  { id: "noref", label: "No reference", groups: ["noref"] },
];

const OVERVIEW_SECTIONS: Array<{ id: Group; label: string }> = [
  { id: "out", label: "Out of range" },
  { id: "watch", label: "Watch" },
  { id: "resolved", label: "Recently resolved" },
  { id: "stale", label: "Not in the latest draw" },
];

export function LabHistory() {
  const rows = useMemo(() => buildModel(), []);
  const topRows = useMemo(() => rows.filter((r) => !r.isComponent), [rows]);
  const childrenByParent = useMemo(() => {
    const m: Record<string, RowModel[]> = {};
    rows.forEach((r) => {
      if (r.parentKey) (m[r.parentKey] = m[r.parentKey] || []).push(r);
    });
    return m;
  }, [rows]);

  const [view, setView] = useState("overview");
  const [query, setQuery] = useState("");
  const [chip, setChip] = useState("all");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(() => new Set());
  const [closed, setClosed] = useState<Set<string>>(() => new Set());

  const toggleRow = (k: string) =>
    setExpandedRows((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });
  const toggleGroup = (k: string) =>
    setClosed((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  const q = query.trim().toLowerCase();
  const searching = q.length > 0;
  const tokens = q.split(/\s+/).filter(Boolean);
  const matchesSearch = (r: RowModel) => tokens.every((t) => r.blob.includes(t));

  const counts = useMemo(() => {
    const c: Record<Group, number> = { out: 0, watch: 0, resolved: 0, stale: 0, noref: 0, ok: 0 };
    topRows.forEach((r) => {
      c[r.group] += 1;
    });
    return c;
  }, [topRows]);
  const resulted = topRows.filter((r) => r.isPresentInLatest).length;

  /* ---- Overview ---- */
  const renderOverview = () => (
    <div>
      {OVERVIEW_SECTIONS.map((sec) => {
        const list = sortRows(topRows.filter((r) => r.group === sec.id));
        if (!list.length) return null;
        return (
          <section key={sec.id} className="kl-section">
            <div className="kl-section-h">
              <span className="kl-section-title">{sec.label}</span>
              <span className="kl-section-count">{list.length}</span>
            </div>
            {list.map((r) => (
              <LabRow key={r.key} row={r} expanded={expandedRows.has(r.key)} onToggle={() => toggleRow(r.key)} childrenByParent={childrenByParent} />
            ))}
          </section>
        );
      })}
      <button
        className="kl-quiet"
        onClick={() => {
          setView("all");
          setChip("all");
        }}
      >
        {counts.ok} {counts.ok === 1 ? "test" : "tests"} with no flags
        {counts.noref ? ` and ${counts.noref} without a reference range` : ""} · view in All tests
      </button>
    </div>
  );

  /* ---- All tests ---- */
  const activeChip = CHIPS.find((c) => c.id === chip) || CHIPS[0];
  const passChip = (r: RowModel) => !activeChip.groups || activeChip.groups.includes(r.group);
  const chipCount = (c: (typeof CHIPS)[number]) => (c.groups ? c.groups.reduce((s, g) => s + counts[g], 0) : topRows.length);
  const visibleAll = topRows.filter(passChip).length;
  const renderAll = () => (
    <div>
      <div className="kl-chips" role="group" aria-label="Filter by status">
        {CHIPS.map((c) => {
          const n = chipCount(c);
          return (
            <button key={c.id} className={`kl-chip${chip === c.id ? " kl-chip-on" : ""}`} aria-pressed={chip === c.id} onClick={() => setChip(c.id)}>
              {c.label}
              <span className="kl-chip-n">{n}</span>
            </button>
          );
        })}
      </div>
      {chip !== "all" && (
        <div className="kl-hiddenline">
          Showing {visibleAll} of {topRows.length} · the rest are hidden by this filter, still counted ·{" "}
          <button className="kl-inline-link" onClick={() => setChip("all")}>Show all</button>
        </div>
      )}
      {DOMAINS.map((dom) => {
        const inDom = topRows.filter((r) => r.domain === dom.id);
        const vis = sortRows(inDom.filter(passChip));
        if (!vis.length) return null;
        const isClosed = closed.has(`dom:${dom.id}`);
        const flagged = inDom.filter((r) => r.group === "out" || r.group === "watch").length;
        return (
          <section key={dom.id} className="kl-section">
            <button className="kl-group-h" onClick={() => toggleGroup(`dom:${dom.id}`)} aria-expanded={!isClosed}>
              <ChevronRight size={14} variant="stroke" className="kl-chev" style={{ transform: isClosed ? "none" : "rotate(90deg)" }} />
              <span className="kl-group-title">{dom.label}</span>
              <span className="kl-group-sum">
                {inDom.length} {inDom.length === 1 ? "test" : "tests"}
                {flagged ? ` · ${flagged} flagged` : ""}
              </span>
            </button>
            {!isClosed &&
              vis.map((r) => (
                <LabRow key={r.key} row={r} expanded={expandedRows.has(r.key)} onToggle={() => toggleRow(r.key)} childrenByParent={childrenByParent} />
              ))}
          </section>
        );
      })}
    </div>
  );

  /* ---- Table ---- */
  const renderTable = () => {
    const order: string[] = [];
    const bySection = new Map<string, RowModel[]>();
    rows.forEach((r) => {
      if (!bySection.has(r.section)) {
        bySection.set(r.section, []);
        order.push(r.section);
      }
      (bySection.get(r.section) as RowModel[]).push(r);
    });
    return (
      <div>
        <div className="kl-src-intro">
          Original lab sections, raw test names, units, references, and every recorded value. Search and filters do not narrow this view.
        </div>
        {order.map((sec) => {
          const isClosed = closed.has(`src:${sec}`);
          const list = bySection.get(sec) as RowModel[];
          return (
            <section key={sec} className="kl-section">
              <button className="kl-group-h" onClick={() => toggleGroup(`src:${sec}`)} aria-expanded={!isClosed}>
                <ChevronRight size={14} variant="stroke" className="kl-chev" style={{ transform: isClosed ? "none" : "rotate(90deg)" }} />
                <span className="kl-group-title">{sectionShort(sec)}</span>
                <span className="kl-group-sum">
                  {sec} · {list.length} {list.length === 1 ? "test" : "tests"}
                </span>
              </button>
              {!isClosed && <SourceTable rows={list} />}
            </section>
          );
        })}
      </div>
    );
  };

  /* ---- Search ---- */
  const renderSearch = () => {
    const matches = rows.filter(matchesSearch);
    const sorted = [...matches].sort((a, b) => {
      const da = DOMAINS.findIndex((d) => d.id === a.domain);
      const db = DOMAINS.findIndex((d) => d.id === b.domain);
      if (da !== db) return da - db;
      const g = GROUP_RANK[a.group] - GROUP_RANK[b.group];
      if (g !== 0) return g;
      return a.displayName.localeCompare(b.displayName);
    });
    if (!sorted.length) {
      return (
        <div className="kl-empty">
          No tests match “{query}”.{" "}
          <button className="kl-inline-link" onClick={() => setQuery("")}>Clear search</button>
        </div>
      );
    }
    return (
      <section className="kl-section">
        <div className="kl-section-h">
          <span className="kl-section-title">Search results</span>
          <span className="kl-section-count">{sorted.length} · all draws searched</span>
        </div>
        {sorted.map((r) => {
          const parent = r.parentKey ? rows.find((x) => x.key === r.parentKey) : null;
          return (
            <div key={r.key}>
              <div className="kl-searchcap">
                {DOMAIN_LABEL[r.domain]}
                {parent ? ` · component of ${parent.displayName}` : ""}
                {activeChip.groups && !passChip(r) ? ` · hidden by the “${activeChip.label}” filter` : ""}
              </div>
              <LabRow row={r} expanded={expandedRows.has(r.key)} onToggle={() => toggleRow(r.key)} childrenByParent={childrenByParent} />
            </div>
          );
        })}
      </section>
    );
  };

  return (
    <div className="kura-lab">
      <header className="kl-head">
        <h1 className="kl-title">Lab history</h1>
        <p className="kl-digest">
          Latest draw {fmtDate(LATEST)}, 2026 · {resulted} of {topRows.length} tests resulted ·{" "}
          <span style={{ color: counts.out ? "var(--red)" : "var(--green)", fontWeight: 500 }}>{counts.out} out of range</span>
        </p>
      </header>

      <div className="kl-bar">
        <nav className="kl-tabs" role="tablist" aria-label="Views">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={view === t.id && !searching}
              className={`kl-tab${view === t.id && !searching ? " kl-tab-on" : ""}`}
              onClick={() => {
                setView(t.id);
                setQuery("");
              }}
            >
              {t.label}
              {t.id === "overview" && counts.out > 0 ? <span className="kl-badge">{counts.out}</span> : null}
            </button>
          ))}
        </nav>
        <div className="kl-search">
          <SearchIcon size={14} variant="stroke" className="kl-search-ico" />
          <input
            className="kl-search-in"
            placeholder="Search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search lab results"
          />
          {query && (
            <button className="kl-search-x" onClick={() => setQuery("")} aria-label="Clear search">
              <Close size={13} variant="stroke" />
            </button>
          )}
        </div>
      </div>

      <main className="kl-main">
        {searching ? renderSearch() : view === "overview" ? renderOverview() : view === "all" ? renderAll() : renderTable()}
      </main>

      <div className="kl-legend" aria-label="Colour key">
        <span className="kl-leg"><span className="kl-dot kl-dot-sm" style={{ background: "var(--green-dot)" }} />In range</span>
        <span className="kl-leg"><span className="kl-dot kl-dot-sm" style={{ background: "var(--yellow-dot)" }} />Below reference</span>
        <span className="kl-leg"><span className="kl-dot kl-dot-sm" style={{ background: "var(--orange-dot)" }} />Above reference / finding</span>
        <span className="kl-leg"><span className="kl-dot kl-dot-sm" style={{ background: "var(--red-dot)" }} />Markedly outside</span>
        <span className="kl-leg"><span className="kl-dot kl-dot-sm" style={{ background: "var(--neutral-dot)" }} />No result / no reference</span>
      </div>

      <footer className="kl-foot">
        History only. No diagnosis or treatment guidance. Reference status reflects each lab&apos;s printed range; missing cells are never read as
        normal or zero, and filtered tests stay counted.
      </footer>
    </div>
  );
}
