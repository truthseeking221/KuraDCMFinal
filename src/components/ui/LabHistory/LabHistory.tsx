"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent, ReactNode } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  BloodDrop,
  Calendar,
  Catalog,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  Flask,
  Heart,
  Home,
  Hormone,
  Kidney,
  MedicalMask,
  Minus,
  Note,
  Pill,
  Plus,
  Receipt,
  Scan,
  Tube,
  Warning,
} from "@/icons";
import { Badge } from "../Badge";
import { Button } from "../Button";
import { Card } from "../Card";
import { Checkbox } from "../Checkbox";
import { Chip } from "../Chip";
import { Counter } from "../Counter";
import { IconButton } from "../IconButton";
import { Search } from "../Search";
import "./LabHistory.css";

/* =================================================================================
   Kura DCM — Lab history
   Two-pane layout: a navigator (views / signals / systems / draws) and a content
   pane of signal sections built from system cards. Each row: severity bar, latest
   value + reference, sparkline, trend vs the prior draw, and a follow-up action.
   A filter is a lens, never a deletion: counts stay global, search runs across
   the full dataset, missing cells are never read as normal or zero. Selecting an
   older draw re-anchors every signal to what was known at that draw.
   ================================================================================= */

/* ----------------------------------- DATA ---------------------------------------- */

const ALL_DATES = ["2026-05-21", "2026-04-20", "2026-03-20", "2026-02-18", "2026-01-15"];

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
interface TrendInfo {
  dir: "improving" | "worsening" | "stable";
  vsLabel: string;
}
interface RowStateInfo {
  group: Group;
  sev: Severity;
  reason: string;
  /* structured form of `reason` for watch/stale rows — rendered with the
     same lead/sub grammar as the trend cell instead of a wrapping sentence */
  reasonParts?: { lead: string; sub?: string };
  basedOn?: string;
}
type RowModel = BaseRow & RowStateInfo & { blob: string; trend: TrendInfo | null };

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

const PARSED = parseCsv(RAW_CSV);

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

const DOMAINS: Array<{ id: string; label: string; icon: ReactNode }> = [
  { id: "kidney", label: "Kidney function", icon: <Kidney size={16} variant="stroke" /> },
  { id: "glycemic", label: "Diabetes", icon: <BloodDrop size={16} variant="stroke" /> },
  { id: "cbc", label: "Anemia", icon: <Tube size={16} variant="stroke" /> },
  { id: "electrolytes", label: "Mineral bone", icon: <Pill size={16} variant="stroke" /> },
  { id: "urinalysis", label: "Urine", icon: <Flask size={16} variant="stroke" /> },
  { id: "inflammation", label: "Inflammation", icon: <MedicalMask size={16} variant="stroke" /> },
  { id: "liver", label: "Liver", icon: <Scan size={16} variant="stroke" /> },
  { id: "lipids", label: "Lipids", icon: <Heart size={16} variant="stroke" /> },
  { id: "thyroid", label: "Thyroid", icon: <Hormone size={16} variant="stroke" /> },
  { id: "other", label: "Other", icon: <Note size={16} variant="stroke" /> },
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

function normalizeRow(raw: RawRow, dates: string[]): BaseRow {
  const ref = parseReference(raw.reference);
  const dom = domainFor(raw.section, raw.test);
  const cells: Cell[] = dates.map((d) => {
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
      return {
        group: "watch",
        sev,
        reason: `${latest.val.raw} this draw${extra}`,
        reasonParts: { lead: `${latest.val.raw} this draw`, sub: extra ? `was ${prevRaw}` : undefined },
      };
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
  if (!last) return { group: "stale", sev: "missing", reason: "No results", reasonParts: { lead: "No results" } };
  const ls = severityOf(last, ref);
  if (FLAG_SEVS.has(ls)) {
    const what = ls === "qpos" ? `${last.val.raw} ` : "";
    return {
      group: "watch",
      sev: ls,
      basedOn: last.date,
      reason: `Last abnormal ${what}in ${fmtMonYear(last.date)} · not repeated`,
      reasonParts: { lead: "Not repeated", sub: `last abnormal ${what}· ${fmtMonYear(last.date)}` },
    };
  }
  if (avail.length === 1)
    return {
      group: "stale",
      sev: ls,
      basedOn: last.date,
      reason: `Single result · ${fmtDate(last.date)}`,
      reasonParts: { lead: "Single result", sub: fmtDate(last.date) },
    };
  return {
    group: "stale",
    sev: ls,
    basedOn: last.date,
    reason: `Not in this draw · last ${fmtDate(last.date)}`,
    reasonParts: { lead: "Not in this draw", sub: `last ${fmtDate(last.date)}` },
  };
}

/* Direction of travel vs the previous available numeric draw — display heuristic:
   compares distance to the nearest reference bound, with a 2%-of-range tolerance. */
function trendOf(row: BaseRow): TrendInfo | null {
  const latest = row.cells[0];
  const ref = row.reference;
  if (latest.val.type !== "numeric" || !ref.parsable) return null;
  const prev = row.cells.slice(1).find((c) => c.val.type === "numeric");
  if (!prev) return null;
  const dNow = distToBound(latest.val.num as number, ref);
  const dPrev = distToBound(prev.val.num as number, ref);
  const span =
    ref.kind === "range"
      ? (ref.high as number) - (ref.low as number)
      : Math.abs((ref.kind === "upper" ? ref.high : ref.low) as number);
  const tol = Math.max(span, 1e-9) * 0.02;
  const dir = dNow - dPrev > tol ? "worsening" : dPrev - dNow > tol ? "improving" : "stable";
  return { dir, vsLabel: monShort(prev.date) };
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

function buildModel(dates: string[]): RowModel[] {
  return PARSED.map((raw) => normalizeRow(raw, dates)).map((r) => {
    const st = rowState(r);
    return { ...r, ...st, blob: blobFor(r), trend: trendOf(r) };
  });
}

let labHistoryModelCache: RowModel[] | null = null;
let labHistoryModelByKeyCache: Map<string, RowModel> | null = null;

function getDefaultLabHistoryModel(): RowModel[] {
  if (!labHistoryModelCache) {
    labHistoryModelCache = buildModel(ALL_DATES);
  }

  return labHistoryModelCache;
}

function getDefaultLabHistoryModelByKey(): Map<string, RowModel> {
  if (!labHistoryModelByKeyCache) {
    labHistoryModelByKeyCache = new Map(getDefaultLabHistoryModel().map((row) => [row.key, row]));
  }

  return labHistoryModelByKeyCache;
}

/* --------------------------- FORMAT + SEARCH HELPERS ----------------------------- */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function fmtDate(d: string): string {
  return d ? `${MONTHS[parseInt(d.slice(5, 7), 10) - 1]} ${parseInt(d.slice(8, 10), 10)}` : "";
}
function monShort(d: string): string {
  return d ? MONTHS[parseInt(d.slice(5, 7), 10) - 1] : "";
}
function fmtMonYear(d: string): string {
  return d ? `${monShort(d)} ${d.slice(0, 4)}` : "";
}
function fmtFull(d: string): string {
  return d ? `${fmtDate(d)}, ${d.slice(0, 4)}` : "";
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
  electrolytes: "electrolyte mineral bone sodium na potassium k chloride cl magnesium mg calcium ca phosphorus phosphate",
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

/*
 * Airbnb-style CTA glow (DLS19 "brand" variant mechanics, Kura tokens).
 * Writes unitless 0-100 cursor coords as CSS vars; CSS maps them onto a
 * 200%-sized radial gradient so the bright hotspot sits under the cursor.
 * Also records the button's px size so :active can shrink exactly 1px/side.
 * Values intentionally persist after mouseleave: the glow fades out frozen
 * at its last position (per spec — do not reset).
 */
function trackSuggestGlow(e: ReactMouseEvent<HTMLButtonElement>) {
  const btn = e.currentTarget;
  const r = btn.getBoundingClientRect();
  if (r.width === 0 || r.height === 0) return;
  btn.style.setProperty("--mouse-x", String(((e.clientX - r.left) / r.width) * 100));
  btn.style.setProperty("--mouse-y", String(((e.clientY - r.top) / r.height) * 100));
  btn.style.setProperty("--btn-w", String(r.width));
  btn.style.setProperty("--btn-h", String(r.height));
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

/* ----------------------- SUMMARY PREVIEW (shared with Summary tab) ---------------- */

const PREVIEW_TESTS: Array<{ group: string; key: string; metaKey?: string }> = [
  { group: "Glycemic control", key: "GLYCOSYLATED HAEMOGLOBIN (Roche)||Hb A1c % (DCCT/NGSP)" },
  { group: "Lipid panel", key: "BIOCHEMISTRY||LDL-Cholesterol" },
  { group: "Kidney function", key: "BIOCHEMISTRY||Creatinine", metaKey: "URINE BIOCHEMISTRY (Microalbumin Roche)||Microalbumin/Cre Ratio" },
  { group: "Anemia (CBC)", key: "CELL BLOOD COUNT||Haemoglobin" },
  { group: "Electrolytes", key: "ELECTROLYTES||Potassium (K+)" },
];

export type LabPreviewStatus = "critical" | "abnormal" | "watch" | "normal";

/* Context + action payload for the Summary preview's inline expansion */
export type LabPreviewDetail = {
  labName: string;
  reasonText: string; /* "Last abnormal in Jan 2026 · not repeated" */
  severityTone?: "danger" | "warning";
  group: "out" | "watch" | "resolved" | "stale" | "noref" | "ok";
  evidence?: string; /* "Worsening vs Apr draw · +0.21 vs Apr 20" */
  drawCount: number;
};

export type LabPreviewEntry = {
  key: string;
  group: string;
  groupMeta?: string;
  latest: string;
  reference: string;
  status: LabPreviewStatus;
  lastResult: string;
  detail: LabPreviewDetail;
};

/* Derives the Summary-tab lab preview from the same model the Labs tab renders,
   so the two views can never drift apart. */
export function getLabHistoryPreview(): LabPreviewEntry[] {
  const byKey = getDefaultLabHistoryModelByKey();
  return PREVIEW_TESTS.flatMap((t) => {
    const r = byKey.get(t.key);
    if (!r) return [];
    const lr = r.latestResult;
    const status: LabPreviewStatus =
      r.group === "out"
        ? r.sev === "crit_high" || r.sev === "crit_low"
          ? "critical"
          : "abnormal"
        : r.group === "watch"
          ? "watch"
          : "normal";
    const metaRow = t.metaKey ? byKey.get(t.metaKey) : undefined;

    const prev = r.availDesc[1];
    const evidence = [
      r.trend
        ? `${r.trend.dir === "worsening" ? "Worsening" : r.trend.dir === "improving" ? "Improving" : "Stable"} vs ${r.trend.vsLabel} draw`
        : null,
      lr && prev && lr.val.type === "numeric" && prev.val.type === "numeric"
        ? `${fmtDelta(lr.val.num as number, prev.val.num as number)} vs ${fmtDate(prev.date)}`
        : null,
    ]
      .filter(Boolean)
      .join(" · ");

    return [
      {
        key: r.key,
        group: t.group,
        groupMeta:
          metaRow && metaRow.latestResult
            ? `${metaRow.displayName} ${metaRow.latestResult.val.raw}${metaRow.unit ? ` ${metaRow.unit}` : ""}`
            : undefined,
        latest: lr ? `${r.displayName} ${lr.val.raw}${r.unit ? ` ${r.unit}` : ""}` : `${r.displayName} — no result`,
        reference: refDisplay(r.reference) ? `ref ${refDisplay(r.reference)}` : "no reference",
        status,
        lastResult: lr ? fmtDate(lr.date) : "—",
        detail: {
          labName: r.displayName,
          reasonText: r.reason || SEV_LABEL[r.sev] || "In range",
          severityTone:
            r.sev === "crit_high" || r.sev === "crit_low" || r.sev === "high"
              ? "danger"
              : r.sev === "low" || r.sev === "qpos"
                ? "warning"
                : undefined,
          group: r.group,
          evidence: evidence || undefined,
          drawCount: r.availDesc.length,
        },
      },
    ];
  });
}

/* DOM id for a lab row, used for deep links from the Summary preview */
export function labRowDomId(key: string): string {
  return `kl-row-${key.replace(/[^a-zA-Z0-9]+/g, "-")}`;
}

/* Per-test clinical context for ordering surfaces ("why re-order this?").
   One entry per top-level row, same reason strings the Labs tab renders. */
export type LabOrderContext = {
  labKey: string;
  labName: string;
  latest: string | null; /* "3.86 mg/dL" */
  reasonText: string; /* "Above range · further out" */
  severityTone?: "danger" | "warning";
  group: "out" | "watch" | "resolved" | "stale" | "noref" | "ok";
};

export function getLabOrderContexts(): LabOrderContext[] {
  return getDefaultLabHistoryModel()
    .filter((r) => !r.isComponent)
    .map((r) => ({
      labKey: r.key,
      labName: r.displayName,
      latest: r.latestResult ? `${r.latestResult.val.raw}${r.unit ? ` ${r.unit}` : ""}` : null,
      reasonText: r.reason || SEV_LABEL[r.sev] || "In range",
      severityTone:
        r.sev === "crit_high" || r.sev === "crit_low" || r.sev === "high"
          ? "danger"
          : r.sev === "low" || r.sev === "qpos"
            ? "warning"
            : undefined,
      group: r.group,
    }));
}

/* --------------------------------- VISUALS --------------------------------------- */

const rowDates = (row: RowModel) => row.cells.map((c) => c.date);

function Spark({ row }: { row: RowModel }) {
  const asc = [...rowDates(row)].sort();
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
  const asc = [...rowDates(row)].sort();
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

export function LabMiniTrend({ labKey }: { labKey: string }) {
  const row = getDefaultLabHistoryModelByKey().get(labKey);

  if (!row) return <span className="kl-mini-trend" aria-hidden />;

  return (
    <span className="kl-mini-trend">
      <MiniTrend row={row} />
    </span>
  );
}

function QualTimeline({ row }: { row: RowModel }) {
  const asc = [...rowDates(row)].sort();
  return (
    <div
      className="kl-qtl"
      style={{ gridTemplateColumns: `repeat(${asc.length}, minmax(0, 1fr))` }}
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
  const asc = [...rowDates(row)].sort();
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
    <>
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
            <circle cx={xOf(i)} cy={y} r={isLast ? 3.4 : 2.4} fill={fill} stroke="var(--color-surface)" strokeWidth={isLast ? 1 : 0} />
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
      {clipped.length > 0 && (
        <div className="kl-clip-note">
          ▲{" "}
          {pts
            .filter((p) => p.num != null && clipped.includes(p.num))
            .map((p) => `${monShort(p.date)} ${p.num}`)
            .join(" · ")}{" "}
          — above the chart scale
        </div>
      )}
    </>
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

/* One status statement per story: the latest draw carries the verdict as a
   badge; older rows carry the direction of travel (delta chips, coloured by
   movement toward/away from the reference) instead of repeating the same
   label five times. Qualitative rows speak only when the state changes. */
const HIST_BADGE_TONE: Partial<Record<Severity, "danger" | "warning" | "success" | "neutral">> = {
  crit_high: "danger", crit_low: "danger", high: "danger",
  low: "warning", qpos: "warning",
  normal: "success", qnorm: "success",
  none: "neutral",
};

function RowDetail({ row, childrenByParent }: { row: RowModel; childrenByParent: Record<string, RowModel[]> }) {
  const kids = childrenByParent[row.key] || [];
  const ref = row.reference;
  const anchorDate = row.cells[0].date;

  /* the next available (older) result for each cell — feeds delta chips */
  const nextAvailOf = (index: number): Cell | null => {
    for (let i = index + 1; i < row.cells.length; i += 1) {
      if (row.cells[i].val.type !== "missing") return row.cells[i];
    }
    return null;
  };

  const histStatusCell = (c: Cell, index: number): ReactNode => {
    const has = c.val.type !== "missing";
    if (!has) return "No structured result";
    const sev = severityOf(c, ref);
    const isLatest = c.date === anchorDate;

    if (isLatest) {
      const tone = HIST_BADGE_TONE[sev] ?? "neutral";
      const strong = sev === "crit_high" || sev === "crit_low";
      return (
        <Badge appearance={strong ? "strong" : "subtle"} tone={tone}>
          {SEV_LABEL[sev]}
        </Badge>
      );
    }

    const next = nextAvailOf(index);
    if (c.val.type === "qualitative") {
      /* speak only when the state changes (or it's the first result) */
      const nextSev = next ? severityOf(next, ref) : null;
      return nextSev === null || nextSev !== sev ? SEV_LABEL[sev] : null;
    }

    if (c.val.type === "numeric" && next?.val.type === "numeric" && ref.parsable) {
      const dNow = distToBound(c.val.num as number, ref);
      const dPrev = distToBound(next.val.num as number, ref);
      const flagged = OUT_SEVS.has(sev) || OUT_SEVS.has(severityOf(next, ref));
      const dir = dNow < dPrev ? "improving" : dNow > dPrev ? "worsening" : "flat";
      const color = !flagged || dir === "flat" ? "var(--ink2)" : dir === "improving" ? "var(--green)" : "var(--red)";
      const DirIcon = dir === "improving" ? ArrowDownRight : dir === "worsening" ? ArrowUpRight : Minus;
      return (
        <span className="kl-hist-delta kl-num" style={{ color }} title={`vs ${fmtDate(next.date)}`}>
          <DirIcon size={12} variant="stroke" />
          {fmtDelta(c.val.num as number, next.val.num as number)}
        </span>
      );
    }
    return null;
  };

  const notes: string[] = [];
  if (!row.isPresentInLatest)
    notes.push(`No result recorded on ${fmtFull(anchorDate)}. Earlier values are shown; absence is never read as normal.`);
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
            {row.cells.map((c, index) => {
              const has = c.val.type !== "missing";
              const sev = has ? severityOf(c, ref) : "missing";
              return (
                <div key={c.date} className={`kl-hist-row${c.date === anchorDate ? " kl-hist-latest" : ""}${has ? "" : " kl-hist-missing"}`}>
                  <span className="kl-hist-node">
                    <span className={`kl-hist-pt${has ? "" : " kl-hist-pt-miss"}`} style={has ? { background: SEV_DOT[sev] } : undefined} />
                  </span>
                  <span className="kl-hist-date">
                    {fmtDate(c.date)}
                    {c.date === anchorDate ? " · this draw" : ""}
                  </span>
                  <span className="kl-hist-val kl-num" style={has ? { color: valColor(c, ref) } : undefined}>
                    {has ? c.val.raw : "—"}
                  </span>
                  <span className="kl-hist-status">{histStatusCell(c, index)}</span>
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
                {[...rowDates(k)].sort().map((d) => {
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

function sevBadge(sev: Severity): ReactNode {
  if (sev === "crit_high") return <Badge tone="danger">High</Badge>;
  if (sev === "high") return <Badge tone="danger">High</Badge>;
  if (sev === "crit_low") return <Badge tone="danger">Low</Badge>;
  if (sev === "low") return <Badge tone="warning">Low</Badge>;
  if (sev === "qpos") return <Badge tone="warning">Finding</Badge>;
  return null;
}

interface LabRowProps {
  row: RowModel;
  expanded: boolean;
  onToggle: () => void;
  childrenByParent: Record<string, RowModel[]>;
  followUp: boolean;
  onFollowUp: () => void;
  flash?: boolean;
}

function LabRow({ row, expanded, onToggle, childrenByParent, followUp, onFollowUp, flash }: LabRowProps) {
  const ref = row.reference;
  const lr = row.latestResult;
  const dim = !!row.basedOn; // status reflects an older draw
  const refDisp = refDisplay(ref);
  const reasonColor = row.group === "out" ? SEV_TEXT[row.sev] : GROUP_REASON_COLOR[row.group];
  const showTrend = !!row.trend && (row.group === "out" || row.group === "resolved");
  const midReason = !showTrend && !!row.reason && (row.group === "watch" || row.group === "stale");
  const aria = `${row.displayName}. ${lr ? `${lr.val.raw} ${row.unit || ""} on ${fmtDate(lr.date)}.` : "No result."} ${row.reason || "In range."}`;

  let action: ReactNode = null;
  if (followUp) {
    action = (
      <Button
        intent="ghost"
        size="sm"
        className="kl-planned"
        leadingIcon={<Check size={14} variant="stroke" />}
        title="Follow-up planned · click to remove"
        onClick={(e) => {
          e.stopPropagation();
          onFollowUp();
        }}
      >
        Planned
      </Button>
    );
  } else if (row.group === "out") {
    action = (
      <Button
        intent="outline"
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          onFollowUp();
        }}
      >
        Add follow up
      </Button>
    );
  } else if (row.group === "watch") {
    action = (
      <button
        type="button"
        className="kl-suggest"
        onClick={(e) => {
          e.stopPropagation();
          onFollowUp();
        }}
        onMouseEnter={trackSuggestGlow}
        onMouseMove={trackSuggestGlow}
        onPointerDown={trackSuggestGlow}
      >
        <span className="kl-suggest-glow" aria-hidden="true" />
        <span className="kl-suggest-label">Repeat {row.displayName}</span>
        <Plus size={13} variant="stroke" />
      </button>
    );
  }

  let trendNode: ReactNode = null;
  if (showTrend && row.trend) {
    const t = row.trend;
    const color = valColor(row.latestResult, row.reference);
    const TrendIcon = t.dir === "worsening" ? ArrowUpRight : t.dir === "improving" ? ArrowDownRight : Minus;
    const label = t.dir === "worsening" ? "Worsening" : t.dir === "improving" ? "Improving" : "Stable";
    trendNode = (
      <>
        <span className="kl-trend-dir" style={{ color }}>
          <TrendIcon size={14} variant="stroke" />
          {label}
        </span>
        <span className="kl-trend-vs">vs {t.vsLabel} draw</span>
      </>
    );
  }

  return (
    <div className={`kl-rowwrap${flash ? " kl-row-flash" : ""}`} id={labRowDomId(row.key)}>
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
        <span
          className="kl-sevbar"
          title={dim ? `${SEV_LABEL[row.sev] || ""} · from ${fmtDate(row.basedOn as string)}` : SEV_LABEL[row.sev] || ""}
          style={{ background: SEV_DOT[row.sev] || "var(--neutral-dot)", opacity: dim ? 0.55 : 1 }}
          aria-hidden="true"
        />
        <div className="kl-namecell">
          <span className="kl-name">{row.displayName}</span>
          {(row.group === "resolved" || row.group === "noref" || (row.group === "ok" && row.reason)) && row.reason ? (
            <span className="kl-namesub" style={{ color: reasonColor || "var(--faint)" }}>
              {row.reason}
            </span>
          ) : null}
        </div>
        <div className="kl-vcell">
          {lr ? (
            <>
              <span className="kl-vmain">
                <span className="kl-num kl-vbig" style={{ color: valColor(lr, ref) }}>
                  {lr.val.raw}
                </span>
                {row.unit ? <span className="kl-vunit">{row.unit}</span> : null}
                {!dim && sevBadge(severityOf(lr, ref))}
                {dim ? <span className="kl-when">{monShort(lr.date)}</span> : null}
              </span>
              <span className="kl-vref">{refDisp ? `Ref ${refDisp}` : "No reference"}</span>
            </>
          ) : (
            <span className="kl-faint">No result</span>
          )}
        </div>
        {midReason ? (
          <div className="kl-midreason" style={{ color: reasonColor || "var(--ink2)" }}>
            {row.reason}
          </div>
        ) : (
          <>
            <div className="kl-sparkcell">
              <MiniTrend row={row} />
            </div>
            <div className="kl-trendcell">{trendNode}</div>
          </>
        )}
        <div className="kl-actcell" onClick={(e) => e.stopPropagation()}>
          {action}
        </div>
      </div>
      {expanded && <RowDetail row={row} childrenByParent={childrenByParent} />}
    </div>
  );
}

/* --------------------------------- SOURCE TABLE ---------------------------------- */

function SourceTable({ rows }: { rows: RowModel[] }) {
  const dates = rows.length ? rowDates(rows[0]) : [];
  return (
    <div className="kl-src-scroll">
      <table className="kl-src">
        <thead>
          <tr>
            <th className="kl-src-th kl-src-sticky">Test</th>
            {dates.map((d) => (
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
              {dates.map((d) => {
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

/* --------------------------------- NAVIGATION ------------------------------------ */

type ViewId = "overview" | "all" | "table";
type SignalId = "out" | "watch" | "resolved";
type ResultStatusId = "stale" | "noref";

const VIEWS: Array<{ id: ViewId; label: string; icon: ReactNode }> = [
  { id: "overview", label: "Overview", icon: <Home size={16} variant="stroke" /> },
  { id: "all", label: "All tests", icon: <Catalog size={16} variant="stroke" /> },
  { id: "table", label: "Table", icon: <Receipt size={16} variant="stroke" /> },
];

const SIGNALS: Array<{ id: SignalId; label: string; sub: string; icon: ReactNode }> = [
  { id: "out", label: "Needs review", sub: "Out of range results that need attention", icon: <Warning size={16} variant="stroke" /> },
  { id: "watch", label: "Follow up due", sub: "Abnormal in the past, not yet repeated", icon: <Clock size={16} variant="stroke" /> },
  { id: "resolved", label: "Recently resolved", sub: "Back in range after an earlier flag", icon: <CheckCircle size={16} variant="stroke" /> },
];

const RESULT_STATUSES: Array<{ id: ResultStatusId; label: string; icon: ReactNode }> = [
  { id: "stale", label: "Not in this draw", icon: <Calendar size={16} variant="stroke" /> },
  { id: "noref", label: "No reference", icon: <Note size={16} variant="stroke" /> },
];

function SideItem({
  icon,
  label,
  sub,
  count,
  active,
  onClick,
}: {
  icon?: ReactNode;
  label: ReactNode;
  sub?: string;
  count?: number;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <div className={`kl-side-item${active ? " is-active" : ""}`}>
      <Checkbox
        checked={Boolean(active)}
        label={
          <span className="kl-side-check-label">
            {icon ? (
              <span className="kl-side-check-ic" aria-hidden="true">
                {icon}
              </span>
            ) : null}
            <span className="kl-side-lab">
              <span className="kl-side-name">{label}</span>
              {sub ? <span className="kl-side-sub">{sub}</span> : null}
            </span>
          </span>
        }
        onChange={onClick}
      />
      {count != null && count > 0 ? <Counter count={count} tone="neutral" className="kl-side-count" /> : null}
    </div>
  );
}

function SideModeItem({
  label,
  sub,
  count,
  active,
  onClick,
}: {
  label: ReactNode;
  sub?: string;
  count?: number;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`kl-side-mode${active ? " is-active" : ""}`}
      aria-pressed={Boolean(active)}
      onClick={onClick}
    >
      <span className="kl-side-lab">
        <span className="kl-side-name">{label}</span>
        {sub ? <span className="kl-side-sub">{sub}</span> : null}
      </span>
      {count != null && count > 0 ? <Counter count={count} tone="neutral" className="kl-side-count" /> : null}
    </button>
  );
}

function SideAction({
  icon,
  label,
  trailing,
  onClick,
}: {
  icon: ReactNode;
  label: ReactNode;
  trailing?: ReactNode;
  onClick: () => void;
}) {
  return (
    <button type="button" className="kl-side-action" onClick={onClick}>
      <span className="kl-side-ic" aria-hidden="true">{icon}</span>
      <span className="kl-side-name">{label}</span>
      {trailing ? <span className="kl-side-trail" aria-hidden="true">{trailing}</span> : null}
    </button>
  );
}

function SideHeader({
  id,
  label,
  showClear,
  onClear,
}: {
  id: string;
  label: string;
  showClear?: boolean;
  onClear?: () => void;
}) {
  return (
    <div className={showClear && onClear ? "kl-side-hrow" : "kl-side-h"} id={id}>
      <span>{label}</span>
      {showClear && onClear ? (
        <button className="kl-side-clear" onClick={onClear} type="button" aria-label={`Clear ${label} filters`}>
          Clear
        </button>
      ) : null}
    </div>
  );
}

/* ----------------------------------- PAGE ---------------------------------------- */

export type LabOrderRequestMeta = {
  labName: string;
  reasonText?: string;
  severityTone?: "danger" | "warning";
  group: "out" | "watch" | "resolved" | "stale" | "noref" | "ok";
};

export function LabHistory({
  focusKey = null,
  onFocusHandled,
  orderedKeys,
  onOrderTest,
  onCancelOrder,
}: {
  /* Deep link from the Summary preview: row key to reveal, expand, and flash */
  focusKey?: string | null;
  onFocusHandled?: () => void;
  /* Controlled ordering: when `orderedKeys` is provided, "Planned" on a row
     derives from membership in that set and the follow-up actions delegate
     to the callbacks. When absent, the internal follow-up set is used
     (backward-compatible uncontrolled mode). */
  orderedKeys?: ReadonlySet<string>;
  onOrderTest?: (labKey: string, meta: LabOrderRequestMeta) => void;
  onCancelOrder?: (labKey: string) => void;
} = {}) {
  const [anchorIdx, setAnchorIdx] = useState(0);
  const dates = useMemo(() => ALL_DATES.slice(anchorIdx), [anchorIdx]);
  const rows = useMemo(() => buildModel(dates), [dates]);
  const topRows = useMemo(() => rows.filter((r) => !r.isComponent), [rows]);
  const childrenByParent = useMemo(() => {
    const m: Record<string, RowModel[]> = {};
    rows.forEach((r) => {
      if (r.parentKey) (m[r.parentKey] = m[r.parentKey] || []).push(r);
    });
    return m;
  }, [rows]);

  const [view, setView] = useState<ViewId>("overview");
  const [signalFilters, setSignalFilters] = useState<Set<SignalId>>(() => new Set());
  const [resultStatusFilters, setResultStatusFilters] = useState<Set<ResultStatusId>>(() => new Set());
  const [systemFilters, setSystemFilters] = useState<Set<string>>(() => new Set());
  const [scope, setScope] = useState<"all" | "latest">("all");
  const [query, setQuery] = useState("");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(() => new Set());
  const [closed, setClosed] = useState<Set<string>>(() => new Set());
  const [followUps, setFollowUps] = useState<Set<string>>(() => new Set());
  const [showOlderDraws, setShowOlderDraws] = useState(false);
  const [flashKey, setFlashKey] = useState<string | null>(null);

  useEffect(() => {
    if (!focusKey) return;
    const target = rows.find((r) => r.key === focusKey);
    if (!target) return;
    /* timers intentionally not cleared on cleanup: the parent resets focusKey
       right after handling, which would otherwise cancel the pending scroll */
    window.setTimeout(() => {
      setView("all");
      setSignalFilters(new Set());
      setResultStatusFilters(new Set());
      setSystemFilters(new Set());
      setScope("all");
      setQuery("");
      setClosed((s) => {
        const n = new Set(s);
        n.delete(`dom:${target.domain}`);
        return n;
      });
      setExpandedRows((s) => new Set(s).add(focusKey));
      setFlashKey(focusKey);

      window.setTimeout(() => {
        document.getElementById(labRowDomId(focusKey))?.scrollIntoView({ behavior: "smooth", block: "center" });
        onFocusHandled?.();
      }, 80);
      window.setTimeout(() => setFlashKey(null), 2400);
    }, 0);
  }, [focusKey, rows, onFocusHandled]);

  // bring the content pane back to its top when the navigation or draw changes
  const bodyRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(false);
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    bodyRef.current?.scrollIntoView({ block: "start" });
  }, [view, signalFilters, resultStatusFilters, systemFilters, anchorIdx]);

  const goView = (id: ViewId) => {
    setView(id);
    setQuery("");
  };

  const toggleSignalFilter = (id: SignalId) => {
    setView((v) => (v === "table" ? "all" : v));
    setQuery("");
    setSignalFilters((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const toggleSystemFilter = (id: string) => {
    setView((v) => (v === "table" ? "all" : v));
    setQuery("");
    setSystemFilters((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const toggleResultStatusFilter = (id: ResultStatusId) => {
    setView("all");
    setQuery("");
    setResultStatusFilters((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const clearSignalFilters = () => {
    setSignalFilters(new Set());
  };

  const clearSystemFilters = () => {
    setSystemFilters(new Set());
  };

  const clearResultStatusFilters = () => {
    setResultStatusFilters(new Set());
  };

  const clearDrawFilters = () => {
    setAnchorIdx(0);
    setShowOlderDraws(false);
  };

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
  const toggleFollowUp = (k: string) =>
    setFollowUps((s) => {
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
  const domStats = useMemo(() => {
    const m: Record<string, { total: number; flagged: number }> = {};
    DOMAINS.forEach((d) => {
      m[d.id] = { total: 0, flagged: 0 };
    });
    topRows.forEach((r) => {
      const s = m[r.domain];
      s.total += 1;
      if (r.group === "out" || r.group === "watch") s.flagged += 1;
    });
    return m;
  }, [topRows]);
  const inScope = (r: RowModel) => scope === "all" || r.isPresentInLatest;
  const sideFiltersActive = signalFilters.size > 0 || resultStatusFilters.size > 0 || systemFilters.size > 0;
  const passesSignalFilters = (r: RowModel) => signalFilters.size === 0 || signalFilters.has(r.group as SignalId);
  const passesResultStatusFilters = (r: RowModel) =>
    resultStatusFilters.size === 0 ||
    ((r.group === "stale" || r.group === "noref") && resultStatusFilters.has(r.group));
  const passesSystemFilters = (r: RowModel) => systemFilters.size === 0 || systemFilters.has(r.domain);
  const passesSideFilters = (r: RowModel) =>
    passesSignalFilters(r) && passesResultStatusFilters(r) && passesSystemFilters(r);

  /* Controlled ordering bridge: planned state lives in the order draft when
     `orderedKeys` is provided, so removing a cart line reverts the row. */
  const orderControlled = orderedKeys !== undefined;
  const orderToneOf = (sev: Severity): "danger" | "warning" | undefined =>
    sev === "crit_high" || sev === "crit_low" || sev === "high"
      ? "danger"
      : sev === "low" || sev === "qpos"
        ? "warning"
        : undefined;
  const isPlanned = (key: string) => (orderControlled ? !!orderedKeys?.has(key) : followUps.has(key));
  const handleFollowUp = (r: RowModel) => {
    if (!orderControlled) {
      toggleFollowUp(r.key);
      return;
    }
    if (orderedKeys?.has(r.key)) {
      onCancelOrder?.(r.key);
    } else {
      onOrderTest?.(r.key, {
        labName: r.displayName,
        reasonText: r.reason || undefined,
        severityTone: orderToneOf(r.sev),
        group: r.group,
      });
    }
  };

  const labRow = (r: RowModel) => (
    <LabRow
      key={r.key}
      row={r}
      expanded={expandedRows.has(r.key)}
      onToggle={() => toggleRow(r.key)}
      childrenByParent={childrenByParent}
      followUp={isPlanned(r.key)}
      onFollowUp={() => handleFollowUp(r)}
      flash={flashKey === r.key}
    />
  );

  const domainCard = (dom: (typeof DOMAINS)[number], list: RowModel[], key: string, sum?: string) => {
    const isClosed = closed.has(key);
    return (
      <Card
        key={key}
        className="kl-card"
        padded={false}
        title={
          <span className="kl-card-t">
            <span className="kl-card-ic" aria-hidden="true">{dom.icon}</span>
            <span>{dom.label}</span>
            <Counter count={list.length} />
            {sum ? <span className="kl-card-sum">{sum}</span> : null}
          </span>
        }
        actions={
          <IconButton
            variant="tertiary"
            size="micro"
            aria-label={`${isClosed ? "Expand" : "Collapse"} ${dom.label}`}
            aria-expanded={!isClosed}
            icon={<ChevronDown size={16} variant="stroke" className="kl-chev" style={{ transform: isClosed ? "rotate(-90deg)" : "none" }} />}
            onClick={() => toggleGroup(key)}
          />
        }
      >
        {!isClosed && list.map(labRow)}
      </Card>
    );
  };

  const scopeHiddenLine = (hidden: number) =>
    hidden > 0 ? (
      <p className="kl-hiddenline">
        {hidden} {hidden === 1 ? "test" : "tests"} without a result in this draw hidden · still counted ·{" "}
        <button className="kl-inline-link" onClick={() => setScope("all")}>Show all draws</button>
      </p>
    ) : null;

  /* ---- Signal sections (Needs review / Follow up due / Recently resolved) ---- */
  const signalSection = (def: (typeof SIGNALS)[number]) => {
    if (signalFilters.size > 0 && !signalFilters.has(def.id)) return null;
    const all = topRows.filter((r) => r.group === def.id && passesResultStatusFilters(r) && passesSystemFilters(r));
    const vis = sortRows(all.filter(inScope));
    return (
      <section key={def.id} className="kl-sec" aria-label={def.label}>
        <header className="kl-sec-h">
          <div className="kl-sec-trow">
            <span className="kl-sec-title">{def.label}</span>
            <Counter count={all.length} tone={def.id === "out" && all.length ? "danger" : "neutral"} />
          </div>
        </header>
        {scopeHiddenLine(all.length - vis.length)}
        {all.length === 0 ? (
          <p className="kl-emptyline">
            {def.id === "out" ? "Nothing out of range in this draw." : def.id === "watch" ? "No abnormal results awaiting a repeat." : "Nothing recently resolved."}
          </p>
        ) : def.id === "out" ? (
          DOMAINS.map((dom) => {
            const list = sortRows(vis.filter((r) => r.domain === dom.id));
            if (!list.length) return null;
            return domainCard(dom, list, `sig:${def.id}:${dom.id}`);
          })
        ) : vis.length > 0 ? (
          <Card className="kl-card" padded={false}>
            {vis.map(labRow)}
          </Card>
        ) : null}
      </section>
    );
  };

  /* ---- Overview: all three signal sections + a quiet line for the rest ---- */
  const renderOverview = () => (
    <div>
      {SIGNALS.map(signalSection)}
      {!sideFiltersActive && (
        <button className="kl-quiet" onClick={() => goView("all")}>
          {counts.ok} {counts.ok === 1 ? "test" : "tests"} in range with no flags
          {counts.stale ? ` · ${counts.stale} not in this draw` : ""}
          {counts.noref ? ` · ${counts.noref} without a reference range` : ""} · view in All tests
        </button>
      )}
    </div>
  );

  /* ---- All tests ---- */
  const renderAll = () => {
    const visibleAll = topRows.filter((r) => inScope(r) && passesSideFilters(r)).length;
    const narrowed = scope === "latest" || sideFiltersActive;
    return (
      <section className="kl-sec" aria-label="All tests">
        <header className="kl-sec-h">
          <div className="kl-sec-trow">
            <span className="kl-sec-title">All tests</span>
            <Counter count={visibleAll} />
          </div>
        </header>
        {narrowed && (
          <div className="kl-hiddenline">
            Showing {visibleAll} of {topRows.length} · the rest are hidden by this lens, still counted ·{" "}
            <button
              className="kl-inline-link"
              onClick={() => {
                setScope("all");
                setSignalFilters(new Set());
                setResultStatusFilters(new Set());
                setSystemFilters(new Set());
              }}
            >
              Show all
            </button>
          </div>
        )}
        {DOMAINS.map((dom) => {
          const inDom = topRows.filter(
            (r) => r.domain === dom.id && passesSignalFilters(r) && passesResultStatusFilters(r) && passesSystemFilters(r),
          );
          const vis = sortRows(inDom.filter(inScope));
          if (!vis.length) return null;
          const flagged = domStats[dom.id].flagged;
          return domainCard(
            dom,
            vis,
            `dom:${dom.id}`,
            `${inDom.length} ${inDom.length === 1 ? "test" : "tests"}${flagged ? ` · ${flagged} flagged` : ""}`,
          );
        })}
      </section>
    );
  };

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
        <header className="kl-sec-h">
          <div className="kl-sec-trow">
            <span className="kl-sec-title">Table</span>
            <Counter count={rows.length} />
          </div>
        </header>
        {order.map((sec) => {
          const key = `src:${sec}`;
          const isClosed = closed.has(key);
          const list = bySection.get(sec) as RowModel[];
          return (
            <Card
              key={key}
              className="kl-card"
              padded={false}
              title={
                <span className="kl-card-t">
                  <span>{sectionShort(sec)}</span>
                  <Counter count={list.length} />
                  <span className="kl-card-sum">{sec}</span>
                </span>
              }
              actions={
                <IconButton
                  variant="tertiary"
                  size="micro"
                  aria-label={`${isClosed ? "Expand" : "Collapse"} ${sectionShort(sec)}`}
                  aria-expanded={!isClosed}
                  icon={<ChevronDown size={16} variant="stroke" className="kl-chev" style={{ transform: isClosed ? "rotate(-90deg)" : "none" }} />}
                  onClick={() => toggleGroup(key)}
                />
              }
            >
              {!isClosed && <SourceTable rows={list} />}
            </Card>
          );
        })}
      </div>
    );
  };

  /* ---- Search ---- */
  const renderSearch = () => {
    const matches = rows.filter((r) => matchesSearch(r) && passesSideFilters(r));
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
        <section className="kl-sec kl-search-sec" aria-label="Search results">
          <header className="kl-sec-h">
            <div className="kl-sec-trow">
              <span className="kl-sec-title">Search results</span>
              <Counter count={0} />
            </div>
          </header>
          <div className="kl-search-empty" role="status">
            <p>
              No tests match “{query}”.{" "}
              <button className="kl-inline-link" onClick={() => setQuery("")}>Clear search</button>
            </p>
          </div>
        </section>
      );
    }
    return (
      <section className="kl-sec" aria-label="Search results">
        <header className="kl-sec-h">
          <div className="kl-sec-trow">
            <span className="kl-sec-title">Search results</span>
            <Counter count={sorted.length} />
          </div>
          <p className="kl-sec-sub">All draws searched, across every view.</p>
        </header>
        <Card className="kl-card" padded={false}>
          {sorted.map((r) => {
            const parent = r.parentKey ? rows.find((x) => x.key === r.parentKey) : null;
            return (
              <div key={r.key} className="kl-searchhit">
                <div className="kl-searchcap">
                  {DOMAIN_LABEL[r.domain]}
                  {parent ? ` · component of ${parent.displayName}` : ""}
                </div>
                {labRow(r)}
              </div>
            );
          })}
        </Card>
      </section>
    );
  };

  const renderMain = () => {
    if (searching) return renderSearch();
    if (view === "overview") return renderOverview();
    if (view === "all") return renderAll();
    return renderTable();
  };

  const visibleDraws = showOlderDraws ? ALL_DATES.length : Math.min(3, ALL_DATES.length);
  const hasSignalFilters = signalFilters.size > 0;
  const hasResultStatusFilters = resultStatusFilters.size > 0;
  const hasSystemFilters = systemFilters.size > 0;
  const hasDrawFilters = anchorIdx > 0 || showOlderDraws;

  return (
    <div className="kura-lab">
      <aside className="kl-side" aria-label="Lab history filters">
        <SideHeader id="kl-side-views" label="Views" />
        <nav className="kl-side-group" aria-labelledby="kl-side-views">
          {VIEWS.map((v) => (
            <SideModeItem
              key={v.id}
              label={v.label}
              count={v.id === "overview" ? counts.out : v.id === "all" ? topRows.length : rows.length}
              active={view === v.id}
              onClick={() => goView(v.id)}
            />
          ))}
        </nav>
        <div className="kl-side-divider" />
        <SideHeader id="kl-side-signals" label="Signals" showClear={hasSignalFilters} onClear={clearSignalFilters} />
        <nav className="kl-side-group" aria-labelledby="kl-side-signals">
          {SIGNALS.map((s) => (
            <SideItem
              key={s.id}
              icon={s.icon}
              label={s.label}
              count={counts[s.id]}
              active={signalFilters.has(s.id)}
              onClick={() => toggleSignalFilter(s.id)}
            />
          ))}
        </nav>
        <SideHeader
          id="kl-side-result-status"
          label="Result status"
          showClear={hasResultStatusFilters}
          onClear={clearResultStatusFilters}
        />
        <nav className="kl-side-group" aria-labelledby="kl-side-result-status">
          {RESULT_STATUSES.map((s) => (
            <SideItem
              key={s.id}
              icon={s.icon}
              label={s.label}
              count={counts[s.id]}
              active={resultStatusFilters.has(s.id)}
              onClick={() => toggleResultStatusFilter(s.id)}
            />
          ))}
        </nav>
        <SideHeader id="kl-side-systems" label="By system" showClear={hasSystemFilters} onClear={clearSystemFilters} />
        <nav className="kl-side-group" aria-labelledby="kl-side-systems">
          {DOMAINS.filter((d) => domStats[d.id].total > 0).map((d) => (
            <SideItem
              key={d.id}
              icon={d.icon}
              label={d.label}
              count={domStats[d.id].flagged}
              active={systemFilters.has(d.id)}
              onClick={() => toggleSystemFilter(d.id)}
            />
          ))}
        </nav>
        <div className="kl-side-divider" />
        <SideHeader id="kl-side-draws" label="Draws" showClear={hasDrawFilters} onClear={clearDrawFilters} />
        <nav className="kl-side-group" aria-labelledby="kl-side-draws">
          {ALL_DATES.slice(0, visibleDraws).map((d, i) => (
            <SideModeItem
              key={d}
              label={i === 0 ? "Latest draw" : fmtMonYear(d)}
              sub={i === 0 ? fmtFull(d) : undefined}
              active={anchorIdx === i}
              onClick={() => setAnchorIdx(i)}
            />
          ))}
          {!showOlderDraws && ALL_DATES.length > visibleDraws && (
            <SideAction
              icon={<Calendar size={16} variant="stroke" />}
              label="Older draws"
              trailing={<ChevronRight size={14} variant="stroke" />}
              onClick={() => setShowOlderDraws(true)}
            />
          )}
        </nav>
      </aside>

      <div className="kl-body" ref={bodyRef}>
        <div className="kl-top">
          {anchorIdx > 0 ? (
            <Chip variant="removable" selected onRemove={() => setAnchorIdx(0)}>
              Reviewing as of {fmtFull(dates[0])}
            </Chip>
          ) : null}
          <span className="kl-top-spacer" />
          <button
            className={`kl-latest-toggle${scope === "latest" ? " is-on" : ""}`}
            type="button"
            role="switch"
            aria-checked={scope === "latest"}
            onClick={() => setScope(scope === "latest" ? "all" : "latest")}
          >
            <span className="kl-latest-toggle-track" aria-hidden="true">
              <span className="kl-latest-toggle-thumb" />
            </span>
            <span>Show latest</span>
          </button>
          <Search
            containerClassName="kl-top-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            type="text"
            placeholder="Search this report"
            aria-label="Search lab results"
          />
        </div>

        <main className="kl-main">{renderMain()}</main>

        <div className="kl-legend" aria-label="Colour key">
          <span className="kl-leg"><span className="kl-dot kl-dot-sm" style={{ background: "var(--green-dot)" }} />In range</span>
          <span className="kl-leg"><span className="kl-dot kl-dot-sm" style={{ background: "var(--yellow-dot)" }} />Below reference</span>
          <span className="kl-leg"><span className="kl-dot kl-dot-sm" style={{ background: "var(--orange-dot)" }} />Above reference / finding</span>
          <span className="kl-leg"><span className="kl-dot kl-dot-sm" style={{ background: "var(--red-dot)" }} />Markedly outside</span>
          <span className="kl-leg"><span className="kl-dot kl-dot-sm" style={{ background: "var(--neutral-dot)" }} />No result / no reference</span>
        </div>

        <footer className="kl-foot">
          History only. No diagnosis or treatment guidance. Reference status reflects each lab&apos;s printed range; trend direction is a
          display heuristic, missing cells are never read as normal or zero, and filtered tests stay counted.
        </footer>
      </div>
    </div>
  );
}
