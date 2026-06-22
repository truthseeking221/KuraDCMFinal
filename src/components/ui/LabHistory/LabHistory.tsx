"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type {
  CSSProperties,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
  RefObject,
} from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  BloodDrop,
  Calendar,
  Catalog,
  ChevronDown,
  ChevronRight,
  Collapse1,
  Expand1,
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
  X,
} from "@/icons";
import { Badge } from "../Badge";
import { Button } from "../Button";
import { Card } from "../Card";
import { Checkbox } from "../Checkbox";
import { Chip } from "../Chip";
import { Counter } from "../Counter";
import { IconButton } from "../IconButton";
import { Search } from "../Search";
import { deltaLabDates, deltaLabResultsCsv } from "@/data/deltaLabResults";
import { mapLabKeyToItemId } from "@/components/OrderDraft/labMapping";
import { orderItemById } from "@/components/OrderDraft/catalog";
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

const ALL_DATES = deltaLabDates;
const RAW_CSV = deltaLabResultsCsv;

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
  /* structured form of `reason` for rows that need a lead/sub grammar instead
     of a compressed sentence */
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

function previousFlagLabel(sev: Severity, raw: string): string {
  if (sev === "qpos") return raw;
  if (sev === "crit_high") return "markedly above reference";
  if (sev === "crit_low") return "markedly below reference";
  if (sev === "high") return "above reference";
  if (sev === "low") return "below reference";
  return "outside reference";
}

function previousResolvedLabel(sev: Severity, raw: string): string {
  if (sev === "high" || sev === "crit_high") return "high";
  if (sev === "low" || sev === "crit_low") return "low";
  if (sev !== "qpos") return previousFlagLabel(sev, raw);

  const clean = raw.trim().toLowerCase();
  const plus = (clean.match(/\+/g) || []).join("");
  if (/cloudy|turbid/.test(clean)) return "cloudy";
  if (/positive|presence|present|detected|reactive/.test(clean)) return plus ? `positive ${plus}` : "positive";
  if (/trace/.test(clean)) return "trace";
  return clean || "finding";
}

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
        group: "out",
        sev,
        reason: `${latest.val.raw} this draw${extra}`,
        reasonParts: { lead: `${latest.val.raw} this draw`, sub: extra ? `was ${prevRaw}` : undefined },
      };
    }

    if (sev === "none") return { group: "noref", sev, reason: "No reference range" };

    const earlierFlag = avail.slice(1).find((c) => FLAG_SEVS.has(severityOf(c, ref)));
    if (earlierFlag) {
      const es = severityOf(earlierFlag, ref);
      const lead = es === "qpos" ? `Cleared ${fmtDate(latest.date)}` : `Resolved ${fmtDate(latest.date)}`;
      const sub = `was ${previousResolvedLabel(es, earlierFlag.val.raw)} ${fmtDate(earlierFlag.date)}`;
      return { group: "resolved", sev, reason: `${lead} · ${sub}`, reasonParts: { lead, sub } };
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
  resolved: "var(--faint)",
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

let labHistoryChildrenCache: Record<string, RowModel[]> | null = null;

/* parent key → its component rows, from the default model. Lets standalone
   consumers (e.g. the Summary hover card) render the same component line the
   Labs tab shows without rebuilding the model. */
function getDefaultChildrenByParent(): Record<string, RowModel[]> {
  if (!labHistoryChildrenCache) {
    const m: Record<string, RowModel[]> = {};
    getDefaultLabHistoryModel().forEach((r) => {
      if (r.parentKey) (m[r.parentKey] = m[r.parentKey] || []).push(r);
    });
    labHistoryChildrenCache = m;
  }

  return labHistoryChildrenCache;
}

/* ----------------------- UNBREAKABLE PANELS (orderable unit) ----------------------
   A verified clinical rule: you can't order a CBC constituent (Haemoglobin, etc.)
   on its own — the orderable unit is the panel. labMapping already encodes this
   (every CBC constituent maps to the single `cbc` item). A panel here = any order
   item that two or more lab rows map to (cbc, electrolytes-panel, microalbumin).
   Single analytes map 1:1 and stay individually orderable. The Labs view groups
   panel constituents under one panel band so the action lands on the panel, not
   the analyte — while each constituent stays fully reviewable. */
let panelItemIdsCache: Set<string> | null = null;
function getPanelItemIds(): Set<string> {
  if (!panelItemIdsCache) {
    const counts = new Map<string, number>();
    getDefaultLabHistoryModel().forEach((row) => {
      const id = mapLabKeyToItemId(row.key);
      if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
    });
    panelItemIdsCache = new Set([...counts.entries()].filter(([, n]) => n >= 2).map(([id]) => id));
  }
  return panelItemIdsCache;
}

/* The panel item id a row belongs to, or null when the row is individually
   orderable (a single analyte). */
function panelIdFor(row: RowModel): string | null {
  const id = mapLabKeyToItemId(row.key);
  return id && getPanelItemIds().has(id) ? id : null;
}

function panelNameForId(panelId: string): string {
  return orderItemById.get(panelId)?.name ?? "Panel";
}

/* Worst-status constituent — drives the band's severity bar, the follow-up /
   repeat action wording, and which row's reason rides the order line. Reuses the
   shared GROUP_RANK (out is worst). */
function worstRow(rows: RowModel[]): RowModel {
  return rows.reduce((worst, row) => (GROUP_RANK[row.group] < GROUP_RANK[worst.group] ? row : worst), rows[0]);
}

/* Split a domain's rows into ordered segments: unbreakable panels (2+ constituent
   rows present) become one band; everything else stays an individually orderable
   row. Segment order follows each group's first appearance, preserving the
   severity sort. */
type LabSegment = { kind: "panel"; panelId: string; rows: RowModel[] } | { kind: "single"; row: RowModel };
function segmentRowsByPanel(list: RowModel[]): LabSegment[] {
  const groups = new Map<string, RowModel[]>();
  const firstIdx = new Map<string, number>();
  list.forEach((row, idx) => {
    const pid = panelIdFor(row);
    if (!pid) return;
    if (!groups.has(pid)) {
      groups.set(pid, []);
      firstIdx.set(pid, idx);
    }
    groups.get(pid)!.push(row);
  });
  const ordered: Array<{ idx: number; seg: LabSegment }> = [];
  list.forEach((row, idx) => {
    const pid = panelIdFor(row);
    if (pid) {
      /* emit the panel segment once, at its first constituent's position; a lone
         constituent (filtered view) falls back to a single row */
      if (firstIdx.get(pid) === idx) {
        const rows = groups.get(pid)!;
        ordered.push({ idx, seg: rows.length >= 2 ? { kind: "panel", panelId: pid, rows } : { kind: "single", row: rows[0] } });
      }
    } else {
      ordered.push({ idx, seg: { kind: "single", row } });
    }
  });
  return ordered.sort((a, b) => a.idx - b.idx).map((o) => o.seg);
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

const HBA1C_PREVIEW_KEY = "GLYCOSYLATED HAEMOGLOBIN (Roche)||Hb A1c % (DCCT/NGSP)";

const PREVIEW_TESTS: Array<{ group: string; key: string; metaKey?: string }> = [
  { group: "Glycemic control", key: HBA1C_PREVIEW_KEY },
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
  clinicalNote?: string;
  actionLabel?: string;
  orderStateLabel?: string;
  plannedStateLabel?: string;
  drawCount: number;
};

export type LabPreviewEntry = {
  key: string;
  group: string;
  groupMeta?: string;
  /** Transitional flat string — new consumers should render the structured
      latestLabel / latestValue / latestUnit fields instead. */
  latest: string;
  latestLabel: string;
  latestValue: string | null;
  latestUnit: string;
  latestTone: "danger" | "warning" | "success" | "neutral";
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

    const isHba1cRepeatDue = t.key === HBA1C_PREVIEW_KEY && r.group === "watch" && !!r.basedOn && !!lr;

    /* Repeat-due rows lead with the clinical action and the gap, not an
       internal-log phrase: "Above range · no repeat since Jan 15". */
    const watchPosition =
      r.sev === "high" || r.sev === "crit_high"
        ? "Above range"
        : r.sev === "low" || r.sev === "crit_low"
          ? "Below range"
          : lr && lr.val.type === "qualitative"
            ? lr.val.raw
            : "Abnormal";
    const isWatch = r.group === "watch";
    const reasonText = isHba1cRepeatDue
      ? "HbA1c repeat due"
      : isWatch && r.basedOn
        ? `${watchPosition} · no repeat since ${fmtDate(r.basedOn)}`
        : r.reason || SEV_LABEL[r.sev] || "In range";
    const drawsOnFile = `${r.availDesc.length} ${r.availDesc.length === 1 ? "draw" : "draws"} on file`;
    const evidenceText = isHba1cRepeatDue
      ? `Last HbA1c ${lr.val.raw}${r.unit} on ${fmtDate(lr.date)} · target <7.0%`
      : isWatch
        ? drawsOnFile
        : evidence || undefined;

    /* Structured latest — the value anchors the Summary cell. Tone follows the
       same severity reading as the Labs tab: danger stays reserved for
       critical results, in-range reads success, no result / no reference
       stays neutral. */
    const latestTone: LabPreviewEntry["latestTone"] = !lr
      ? "neutral"
      : r.sev === "crit_high" || r.sev === "crit_low"
        ? "danger"
        : r.sev === "high" || r.sev === "low" || r.sev === "qpos"
          ? "warning"
          : r.sev === "normal" || r.sev === "qnorm"
            ? "success"
            : "neutral";

    return [
      {
        key: r.key,
        group: t.group,
        groupMeta:
          metaRow && metaRow.latestResult
            ? `${metaRow.displayName} ${metaRow.latestResult.val.raw}${metaRow.unit ? ` ${metaRow.unit}` : ""}`
            : undefined,
        latest: lr ? `${r.displayName} ${lr.val.raw}${r.unit ? ` ${r.unit}` : ""}` : `${r.displayName} — no result`,
        /* "HbA1c (%)" → "HbA1c" — the unit renders beside the value, so the
           parenthetical would just repeat it */
        latestLabel: r.displayName.replace(/\s*\(.*\)$/, ""),
        latestValue: lr ? lr.val.raw : null,
        latestUnit: r.unit,
        latestTone,
        reference: refDisplay(r.reference) ? `ref ${refDisplay(r.reference)}` : r.valueType === "qualitative" ? "qualitative result" : "no reference",
        status,
        lastResult: lr ? fmtDate(lr.date) : "—",
        detail: {
          labName: r.displayName,
          reasonText,
          /* danger is reserved for critical results; above range / repeat due
             read as warning so red keeps its meaning */
          severityTone:
            r.sev === "crit_high" || r.sev === "crit_low"
              ? "danger"
              : r.sev === "high" || r.sev === "low" || r.sev === "qpos"
                ? "warning"
                : undefined,
          group: r.group,
          evidence: evidenceText,
          clinicalNote: isHba1cRepeatDue ? "CKD and anemia can affect HbA1c interpretation; compare with symptoms or glucose logs if discordant." : undefined,
          actionLabel: isHba1cRepeatDue ? "Order HbA1c" : undefined,
          orderStateLabel: isHba1cRepeatDue ? "No active HbA1c order" : undefined,
          plannedStateLabel: isHba1cRepeatDue ? "HbA1c in order draft" : undefined,
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

function singleResultRangePercent(row: RowModel, cell: Cell): number {
  if (cell.val.type !== "numeric") return 50;
  const num = cell.val.num as number;
  const ref = row.reference;

  if (ref.kind === "range" && typeof ref.low === "number" && typeof ref.high === "number") {
    const span = Math.max(ref.high - ref.low, 1e-9);
    if (num < ref.low) return Math.max(0, 40 - ((ref.low - num) / span) * 20);
    if (num > ref.high) return Math.min(100, 60 + ((num - ref.high) / span) * 20);
    return 40 + ((num - ref.low) / span) * 20;
  }

  if (ref.kind === "upper" && typeof ref.high === "number") {
    return Math.max(0, Math.min(100, (num / Math.max(ref.high, 1e-9)) * 50));
  }

  if (ref.kind === "lower" && typeof ref.low === "number") {
    return Math.max(0, Math.min(100, 100 - (num / Math.max(ref.low, 1e-9)) * 50));
  }

  return 50;
}

function SingleResultRange({ row }: { row: RowModel }) {
  const clipId = `kl-single-range-${useId().replace(/:/g, "")}`;
  const cell = row.numericAvail[0] || null;
  if (!cell) return <span className="kl-flat" aria-hidden />;

  const W = 196;
  const H = 16;
  const markerR = 6.5;
  const markerX = Math.max(markerR, Math.min(W - markerR, (singleResultRangePercent(row, cell) / 100) * W));
  const sev = severityOf(cell, row.reference);
  const aria = `${row.displayName}: first result ${cell.val.raw}${row.unit ? ` ${row.unit}` : ""}. No trend yet.`;

  return (
    <svg className="kl-single-range" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={aria} preserveAspectRatio="xMidYMid meet">
      <defs>
        <clipPath id={clipId}>
          <rect x="0" y="4" width={W} height="8" rx="4" />
        </clipPath>
      </defs>
      <g className="kl-single-range-bar" clipPath={`url(#${clipId})`} aria-hidden="true">
        <rect className="tone-danger" x="0" y="4" width="39.7" height="8" />
        <rect className="tone-warning" x="39.2" y="4" width="39.7" height="8" />
        <rect className="tone-success" x="78.4" y="4" width="39.7" height="8" />
        <rect className="tone-warning" x="117.6" y="4" width="39.7" height="8" />
        <rect className="tone-danger" x="156.8" y="4" width="39.7" height="8" />
      </g>
      <circle className="kl-single-range-marker" cx={markerX} cy="8" r={markerR} fill={SEV_DOT[sev]} />
    </svg>
  );
}

function Spark({ row }: { row: RowModel }) {
  const asc = [...rowDates(row)].sort();
  const pts = asc.map((d) => {
    const cell = row.cells.find((c) => c.date === d);
    return { date: d, num: cell && cell.val.type === "numeric" ? (cell.val.num as number) : null, cell };
  });
  const nums = pts.filter((p) => p.num != null).map((p) => p.num as number);
  if (nums.length === 0) return <span className="kl-flat" aria-hidden />;

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

  const W = 100, H = 26, padX = 8, padY = 5;
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
        <rect
          className="kl-spark-band"
          x="0"
          y={Math.min(band[0], band[1])}
          width={W}
          height={Math.abs(band[1] - band[0])}
          fill="var(--green-dot)"
          opacity="0.10"
        />
      )}
      {segs.map((s, k) => (
        <polyline
          className="kl-spark-line"
          key={k}
          pathLength={1}
          points={s.map((p) => p.join(",")).join(" ")}
          fill="none"
          stroke="var(--ink2)"
          strokeWidth="1.3"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      ))}
      {pts.map((p, i) => {
        if (p.num == null) return null;
        const isClip = clipped.includes(p.num);
        const isLast = i === lastIdx;
        const y = isClip ? padY + 1 : yOf(p.num);
        const fill = isLast ? SEV_DOT[severityOf(p.cell, row.reference)] : "var(--ink2)";
        /* dot pops exactly when the line front reaches its x — left to right */
        const dotDelay = `${((xOf(i) / W) * 0.7).toFixed(2)}s`;
        return (
          <g key={i}>
            <circle
              className="kl-spark-dot"
              style={{ animationDelay: dotDelay }}
              cx={xOf(i)}
              cy={y}
              r={isLast ? 2.5 : 1.7}
              fill={fill}
            />
          </g>
        );
      })}
    </svg>
  );
}

/* Detailed trend chart for the hover card: left zone legend (Above / In /
   Below Range bars + labels), shaded zone bands, value labels on every point,
   drop guides, and a dated x-axis. Replaces the bare sparkline + draw strip. */
function LabTrendChart({ row }: { row: RowModel }) {
  const asc = [...rowDates(row)].sort();
  const pts = asc.map((d) => {
    const cell = row.cells.find((c) => c.date === d);
    return { date: d, num: cell && cell.val.type === "numeric" ? (cell.val.num as number) : null, cell };
  });
  const nums = pts.filter((p) => p.num != null).map((p) => p.num as number);
  if (nums.length === 0) return null;

  /* Clip extreme outliers from the scale (same rule as Spark) so one huge early
     value doesn't flatten the rest — clipped points pin to the top with a ▲. */
  const sorted = [...nums].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  let normalVals = nums;
  const clipped = new Set<number>();
  if (nums.length >= 3) {
    const thr = median * 3;
    const outs = nums.filter((v) => v > thr);
    if (outs.length) {
      normalVals = nums.filter((v) => v <= thr);
      outs.forEach((v) => clipped.add(v));
    }
  }

  const ref = row.reference;
  let lo = Math.min(...normalVals);
  let hi = Math.max(...normalVals);
  if (ref.kind === "range") {
    lo = Math.min(lo, ref.low as number);
    hi = Math.max(hi, ref.high as number);
  } else if (ref.kind === "upper") {
    hi = Math.max(hi, ref.high as number);
  } else if (ref.kind === "lower") {
    lo = Math.min(lo, ref.low as number);
  }
  if (lo === hi) {
    lo -= 1;
    hi += 1;
  }
  const span = hi - lo;
  lo -= span * 0.12;
  hi += span * 0.16;

  const W = 392, H = 190, plotL = 126, plotR = 18, plotT = 40, plotB = 30;
  const baseY = H - plotB;
  const xOf = (i: number) => plotL + (asc.length === 1 ? (W - plotL - plotR) / 2 : (i * (W - plotL - plotR)) / (asc.length - 1));
  const yOf = (v: number) => {
    const c = Math.max(lo, Math.min(hi, v));
    return plotT + (baseY - plotT) * (1 - (c - lo) / (hi - lo));
  };

  type Zone = { top: number; bottom: number; color: string; label: string };
  const zones: Zone[] = [];
  const ABOVE = { color: "var(--orange-dot)", label: "Above range" };
  const IN = { color: "var(--green-dot)", label: "In range" };
  const BELOW = { color: "var(--yellow-dot)", label: "Below range" };
  if (ref.kind === "range") {
    const yHi = yOf(ref.high as number);
    const yLo = yOf(ref.low as number);
    if (yHi > plotT + 2) zones.push({ top: plotT, bottom: yHi, ...ABOVE });
    zones.push({ top: yHi, bottom: yLo, ...IN });
    /* skip a "Below Range" sliver when 0 is the natural floor (nothing is below 0) */
    if (yLo < baseY - 2 && (ref.low as number) > 0) zones.push({ top: yLo, bottom: baseY, ...BELOW });
  } else if (ref.kind === "upper") {
    const yHi = yOf(ref.high as number);
    if (yHi > plotT + 2) zones.push({ top: plotT, bottom: yHi, ...ABOVE });
    zones.push({ top: yHi, bottom: baseY, ...IN });
  } else if (ref.kind === "lower") {
    const yLo = yOf(ref.low as number);
    zones.push({ top: plotT, bottom: yLo, ...IN });
    if (yLo < baseY - 2) zones.push({ top: yLo, bottom: baseY, ...BELOW });
  } else {
    zones.push({ top: plotT, bottom: baseY, color: "var(--neutral-dot)", label: "Range" });
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
    `${row.displayName} trend: ` +
    pts.map((p) => `${monShort(p.date)} ${p.num != null ? p.num : "no result"}`).join(", ");

  return (
    <svg className="kl-trend" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={aria} preserveAspectRatio="xMidYMid meet">
      {/* shaded zone bands across the plot */}
      {zones.map((z, k) => (
        <rect
          key={`zt${k}`}
          className="kl-trend-band"
          x={plotL}
          y={z.top}
          width={W - plotL - plotR}
          height={Math.max(0, z.bottom - z.top)}
          fill={z.color}
          opacity="0.07"
          style={{ animationDelay: `${40 + k * 70}ms` }}
        />
      ))}
      {/* left zone legend: a bar sized to the zone + its label */}
      {zones.map((z, k) => {
        const h = Math.max(3, z.bottom - z.top);
        const showLabel = h >= 24;
        return (
          <g key={`zl${k}`} className="kl-trend-zone-item" style={{ animationDelay: `${120 + k * 75}ms` }}>
            <rect className="kl-trend-zone-bar" x={8} y={z.top} width={5} height={h} fill={z.color} />
            {showLabel ? (
              <text x={22} y={z.top + h / 2} className="kl-trend-zone" dominantBaseline="central">{z.label}</text>
            ) : null}
          </g>
        );
      })}
      {/* baseline only — per-point drop guides removed for a calmer plot */}
      <line className="kl-trend-base" x1={plotL} y1={baseY} x2={W - plotR} y2={baseY} stroke="var(--line)" strokeWidth="1" pathLength={1} />
      {/* connector */}
      {segs.map((s, k) => (
        <polyline
          key={`s${k}`}
          className="kl-trend-line"
          points={s.map((p) => p.join(",")).join(" ")}
          fill="none"
          stroke="var(--ink2)"
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          pathLength={1}
          style={{ animationDelay: `${210 + k * 90}ms` }}
        />
      ))}
      {/* points: value label, dot, x-axis date */}
      {pts.map((p, i) => {
        if (p.num == null) {
          return <text key={`x${i}`} x={xOf(i)} y={H - 9} className="kl-trend-x" textAnchor="middle">{monShort(p.date)}</text>;
        }
        const isClip = clipped.has(p.num);
        const y = isClip ? plotT - 2 : yOf(p.num);
        const sev = severityOf(p.cell, row.reference);
        const isLast = i === lastIdx;
        const pointDelay = 360 + i * 95;
        return (
          <g key={`pt${i}`} className="kl-trend-point" style={{ "--kl-point-delay": `${pointDelay}ms` } as CSSProperties}>
            <text x={xOf(i)} y={Math.max(14, y - 12)} className="kl-trend-val" textAnchor="middle" style={{ fill: SEV_TEXT[sev] }}>
              {p.num}{isClip ? " ▲" : ""}
            </text>
            {isLast && !isClip ? (
              <circle
                className="kl-trend-pulse"
                cx={xOf(i)}
                cy={y}
                r={6}
                fill="none"
                stroke={SEV_DOT[sev]}
                strokeWidth="1.5"
                aria-hidden="true"
                style={{ animationDelay: `${pointDelay + 180}ms` }}
              />
            ) : null}
            <circle
              className={isLast ? "kl-trend-dot is-latest" : "kl-trend-dot"}
              cx={xOf(i)}
              cy={y}
              r={isLast ? 5.5 : 3.5}
              fill={SEV_DOT[sev]}
              stroke="var(--color-surface)"
              strokeWidth="1.5"
            />
            <text x={xOf(i)} y={H - 9} className="kl-trend-x" textAnchor="middle">{monShort(p.date)}</text>
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
  if (row.valueType === "numeric" && row.numericAvail.length === 1) return <SingleResultRange row={row} />;
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

/* Full band trend chart (In/Below-range zones + dated points) resolved by labKey
   — same graph the Labs hover shows. Returns null when the patient has no series
   for that key, so callers can gate cleanly. Reused by the catalog test popover. */
export function LabKeyTrendChart({ labKey }: { labKey: string }) {
  const row = getDefaultLabHistoryModelByKey().get(labKey);
  if (!row) return null;
  if (row.valueType === "numeric" && row.numericAvail.length === 1) return <SingleResultRange row={row} />;
  return <LabTrendChart row={row} />;
}

/* ------------------------------- COMPACT BRIEF ----------------------------------- */

/* All draws in one compact strip — date · value · status dot, oldest → newest,
   latest emphasised. A missing draw reads as an explicit gap, never zero. */
function DrawStrip({ row }: { row: RowModel }) {
  const ref = row.reference;
  const asc = [...row.cells].reverse();
  const latestDate = row.cells[0].date;
  return (
    <div
      className="kl-hc-strip"
      style={{ gridTemplateColumns: `repeat(${asc.length}, minmax(0, 1fr))` }}
      role="group"
      aria-label={`${row.displayName} by draw`}
    >
      {asc.map((c) => {
        const has = c.val.type !== "missing";
        const sev = has ? severityOf(c, ref) : "missing";
        const isLatest = c.date === latestDate;
        const display = has ? (c.val.type === "qualitative" ? qualAbbrev(c.val.raw) : c.val.raw) : "—";
        return (
          <div
            key={c.date}
            className={`kl-hc-draw${isLatest ? " is-latest" : ""}${has ? "" : " is-missing"}`}
            title={`${fmtDate(c.date)}: ${has ? c.val.raw : "No result"}`}
          >
            <span className="kl-hc-draw-date">{monShort(c.date)}</span>
            <span className="kl-hc-draw-val kl-num" style={has ? { color: valColor(c, ref) } : undefined}>
              {display}
            </span>
            <span
              className={`kl-hc-draw-dot${has ? "" : " is-missing"}`}
              style={has ? { background: SEV_DOT[sev] } : undefined}
              aria-hidden="true"
            />
          </div>
        );
      })}
    </div>
  );
}

/* Parent rows summarise their components on one line — latest child values, not
   a full section. */
function ComponentLine({ kids }: { kids: RowModel[] }) {
  return (
    <div className="kl-hc-comp">
      <span className="kl-hc-comp-k">Components</span>
      {kids.map((k) => {
        const lr = k.latestResult;
        return (
          <span key={k.key} className="kl-hc-comp-item">
            <span className="kl-hc-comp-name">{k.displayName}</span>
            <span
              className="kl-num kl-hc-comp-val"
              style={{ color: lr ? valColor(lr, k.reference) : "var(--faint)" }}
            >
              {lr ? lr.val.raw : "—"}
              {lr && k.unit ? <span className="kl-hc-comp-unit"> {k.unit}</span> : null}
            </span>
          </span>
        );
      })}
    </div>
  );
}

/* The brief body: all-draws strip, an optional detailed trend chart, one status
   note, and (for parents) a single component line. This is shared by the Labs
   tab and the Summary preview, so both hovers stay visually identical. */
function LabHoverBrief({ row, kids }: { row: RowModel; kids: RowModel[] }) {
  const ref = row.reference;
  const numeric = row.valueType === "numeric";
  const showSpark = numeric && row.numericAvail.length >= 2;
  const note = !row.isPresentInLatest
    ? "No result in this draw — absence is not read as normal."
    : numeric && !ref.parsable && row.numericAvail.length > 0
      ? "Values shown, not scored — no reference range."
      : numeric && row.numericAvail.length === 1
        ? "Only one result so far — nothing to trend yet."
        : "";
  return (
    <div className="kl-hc-brief">
      {showSpark ? <LabTrendChart row={row} /> : <DrawStrip row={row} />}
      {note ? <p className="kl-hc-note">{note}</p> : null}
      {kids.length > 0 ? <ComponentLine kids={kids} /> : null}
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

function ReasonText({ reason, parts }: { reason: string; parts?: RowStateInfo["reasonParts"] }) {
  if (!parts) return <>{reason}</>;

  return (
    <>
      <span className="kl-reason-lead">{parts.lead}</span>
      {parts.sub ? <span className="kl-reason-sub">{" · "}{parts.sub}</span> : null}
    </>
  );
}

function MidReasonTrend({ row, color }: { row: RowModel; color: string }) {
  const isRepeatDue = row.group === "watch" && !!row.basedOn;
  const lead = isRepeatDue ? "Repeat due" : row.reasonParts?.lead || row.reason;
  const sub = isRepeatDue && row.basedOn
    ? `since ${fmtMonYear(row.basedOn)}`
    : row.reasonParts?.sub;
  const Icon = isRepeatDue || row.group === "stale" ? Calendar : ArrowUpRight;

  return (
    <div className="kl-midreason">
      <span className="kl-trend-dir" style={{ color }}>
        <Icon size={14} variant="stroke" />
        {lead}
      </span>
      {sub ? <span className="kl-trend-vs">{sub}</span> : null}
    </div>
  );
}

/* One floating card is live at a time; these ids wire row → card semantics. */
const HOVER_CARD_ID = "kl-hover-card";
const HOVER_CARD_TITLE_ID = "kl-hover-card-title";
const HOVER_OPEN_DELAY_MS = 220;
const HOVER_CLOSE_DELAY_MS = 150;
type HoverOpenSource = "mouse" | "focus";
type HoverCardPlacement = "top" | "bottom" | "right" | "left";

/* Adaptive ordering action — the only place rows reach the order draft. Planned
   rows offer removal; out/watch rows offer the relevant order; every other flat
   row offers a quiet Reorder (see FollowUpAction). This gate now only decides
   whether a PANEL BAND surfaces an action — in-range panels stay quiet so the
   band header does not nag; individual flat rows always show one. */
function hasFollowUp(group: Group, planned: boolean): boolean {
  return planned || group === "out" || group === "watch";
}

function FollowUpAction({
  row,
  planned,
  onAction,
  panelName,
}: {
  row: RowModel;
  planned: boolean;
  onAction: () => void;
  /* When the row belongs to an unbreakable panel, the action orders the PANEL,
     not the analyte. Keep that target in the accessible label while the visible
     CTA stays generic so the action column does not crowd or wrap. */
  panelName?: string;
}) {
  const actionName = row.displayName.replace(/\s*\(.*\)$/, "");
  const orderName = panelName ?? actionName;
  const handleClick = (e: ReactMouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    onAction();
  };
  if (planned) {
    return (
      <Button
        intent="ghost"
        size="sm"
        className="kl-remove"
        leadingIcon={<Minus size={14} variant="stroke" />}
        aria-label={`Remove ${orderName} from lab order`}
        onClick={handleClick}
        onKeyDown={(e) => e.stopPropagation()}
      >
        Remove
      </Button>
    );
  }
  if (row.group === "out") {
    return (
      <button
        type="button"
        className="kl-suggest"
        aria-label={`Add ${orderName} follow-up to lab order`}
        onClick={handleClick}
        onKeyDown={(e) => e.stopPropagation()}
        onMouseEnter={trackSuggestGlow}
        onMouseMove={trackSuggestGlow}
        onPointerDown={trackSuggestGlow}
      >
        <span className="kl-suggest-glow" aria-hidden="true" />
        <span className="kl-suggest-label">Follow up</span>
        <Plus size={13} variant="stroke" />
      </button>
    );
  }
  if (row.group === "watch") {
    return (
      <button
        type="button"
        className="kl-suggest"
        aria-label={`Add repeat ${orderName} to lab order`}
        onClick={handleClick}
        onKeyDown={(e) => e.stopPropagation()}
        onMouseEnter={trackSuggestGlow}
        onMouseMove={trackSuggestGlow}
        onPointerDown={trackSuggestGlow}
      >
        <span className="kl-suggest-glow" aria-hidden="true" />
        <span className="kl-suggest-label">Repeat</span>
        <Plus size={13} variant="stroke" />
      </button>
    );
  }
  /* Every other row (normal / resolved / qualitative / stale) is orderable too —
     a quiet outline "Reorder" so the doctor can re-run any test, not only the
     flagged ones. Repeat/Follow-up stay filled (recommended); Reorder is outline
     (available, not urgent). */
  return (
    <Button
      intent="outline"
      size="sm"
      className="kl-reorder"
      trailingIcon={<Plus size={14} variant="stroke" />}
      aria-label={`Reorder ${orderName}`}
      onClick={handleClick}
      onKeyDown={(e) => e.stopPropagation()}
    >
      Reorder
    </Button>
  );
}

/* Floating clinical brief — adaptive by group, anchored to the active row by
   the layer in LabHistory. A tight decision card: what the result is, what
   changed, what to do. Reuses the row model, severity language, sparkline, and
   child results, so Summary, Labs, and the Order Draft never drift. The footer
   carries the only ordering CTA; the close button shows only when pinned. */
function LabHoverCard({
  row,
  childrenByParent,
  pinned,
  placement,
  pos,
  sheet,
  cardRef,
  onPointerEnter,
  onPointerLeave,
  onClose,
}: {
  row: RowModel;
  childrenByParent: Record<string, RowModel[]>;
  pinned: boolean;
  placement: HoverCardPlacement;
  pos: { left: number; top: number } | null;
  sheet: boolean;
  cardRef: RefObject<HTMLDivElement | null>;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
  onClose: () => void;
}) {
  const ref = row.reference;
  const lr = row.latestResult;
  const dim = !!row.basedOn;
  const refDisp = refDisplay(ref);
  const valueRefLabel = refDisp ? `Ref ${refDisp}` : row.valueType === "qualitative" ? "Qualitative result" : "No reference";
  const reasonColor = row.group === "out" ? SEV_TEXT[row.sev] : GROUP_REASON_COLOR[row.group] || "var(--faint)";
  /* one reason line: the status reason, with the trend's anchor folded in for
     out rows ("Above range · improving vs Apr draw") — never the direction word
     twice. */
  const trendVs = row.group === "out" && row.trend ? row.trend.vsLabel : null;
  const kids = childrenByParent[row.key] || [];

  const style: CSSProperties = sheet || !pos ? {} : { left: pos.left, top: pos.top };

  return (
    <div
      ref={cardRef}
      id={HOVER_CARD_ID}
      role="dialog"
      aria-labelledby={HOVER_CARD_TITLE_ID}
      className={`kl-hover-card kl-hc-${sheet ? "sheet" : placement}${pos || sheet ? " is-placed" : ""}`}
      style={style}
      tabIndex={-1}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
    >
      <header className="kl-hc-head">
        <div className="kl-hc-titrow">
          <h3 id={HOVER_CARD_TITLE_ID} className="kl-hc-name">{row.displayName}</h3>
          {pinned ? (
            <IconButton
              variant="tertiary"
              size="micro"
              aria-label={`Close ${row.displayName} details`}
              icon={<X size={16} variant="stroke" />}
              onClick={onClose}
            />
          ) : null}
        </div>
        <div className="kl-hc-statusline">
          {lr ? (
            <span className="kl-hc-value">
              <span className="kl-num kl-hc-num" style={{ color: valColor(lr, ref) }}>{lr.val.raw}</span>
              {row.unit ? <span className="kl-hc-unit">{row.unit}</span> : null}
              {sevBadge(severityOf(lr, ref))}
              {dim ? <span className="kl-hc-when">{fmtDate(lr.date)}</span> : null}
            </span>
          ) : (
            <span className="kl-faint kl-hc-noresult">No result in this draw</span>
          )}
          <span className="kl-hc-ref">{valueRefLabel}</span>
        </div>
        {row.reason ? (
          <div className="kl-hc-reason" style={{ color: reasonColor }}>
            <ReasonText reason={row.reason} parts={row.reasonParts} />
            {trendVs ? <span className="kl-hc-reason-vs"> vs {trendVs} draw</span> : null}
          </div>
        ) : null}
      </header>

      <div className="kl-hc-body">
        <LabHoverBrief row={row} kids={kids} />
      </div>
    </div>
  );
}

/* Standalone hover/focus trigger that floats the same clinical brief the Labs
   tab shows, anchored to whatever it wraps. Lets other surfaces (the Summary
   lab preview) drop their bespoke inline expansion and reuse one detail card.
   Self-contained: own open/close intent timing, viewport placement, scroll
   re-anchoring, and Escape/scroll-out dismissal. Informational only — no pin,
   no ordering CTA (those live in the full Labs tab). */
export function LabHoverTrigger({
  labKey,
  className,
  placementAnchorSelector,
  placementBoundsSelector,
  children,
}: {
  labKey: string;
  className?: string;
  placementAnchorSelector?: string;
  placementBoundsSelector?: string;
  children: ReactNode;
}) {
  const row = getDefaultLabHistoryModelByKey().get(labKey);
  const childrenByParent = getDefaultChildrenByParent();
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const openTimer = useRef<number | null>(null);
  const closeTimer = useRef<number | null>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const [placement, setPlacement] = useState<HoverCardPlacement>("top");

  const clearOpenTimer = () => {
    if (openTimer.current != null) {
      window.clearTimeout(openTimer.current);
      openTimer.current = null;
    }
  };
  const clearCloseTimer = () => {
    if (closeTimer.current != null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };
  const requestOpen = (immediate: boolean) => {
    clearCloseTimer();
    clearOpenTimer();
    if (immediate) {
      setOpen(true);
      return;
    }
    openTimer.current = window.setTimeout(() => {
      openTimer.current = null;
      setOpen(true);
    }, HOVER_OPEN_DELAY_MS);
  };
  const scheduleClose = () => {
    clearOpenTimer();
    clearCloseTimer();
    closeTimer.current = window.setTimeout(() => {
      closeTimer.current = null;
      setOpen(false);
    }, HOVER_CLOSE_DELAY_MS);
  };
  const cancelClose = () => clearCloseTimer();

  useEffect(() => () => {
    clearOpenTimer();
    clearCloseTimer();
  }, []);

  /* place before paint, then keep glued while the page scrolls; drop the card
     once its anchor leaves the viewport. */
  useLayoutEffect(() => {
    if (!open) return;
    const measure = () => {
      const anchor = anchorRef.current;
      const card = cardRef.current;
      if (!anchor || !card) return;
      const a = anchor.getBoundingClientRect();
      if (a.bottom < 0 || a.top > window.innerHeight) {
        setOpen(false);
        return;
      }
      const hAnchor = placementAnchorSelector
        ? anchor.querySelector<HTMLElement>(placementAnchorSelector)?.getBoundingClientRect()
        : a;
      const bounds = placementBoundsSelector
        ? anchor.closest<HTMLElement>(placementBoundsSelector)?.getBoundingClientRect()
        : getHoverPlacementBounds(anchor);
      const next = computeCardPlacement(a, card, hAnchor, bounds);
      setPlacement(next.placement);
      setPos({ left: next.left, top: next.top });
    };
    measure();
    let raf = 0;
    const onScrollResize = () => {
      window.cancelAnimationFrame(raf);
      raf = window.requestAnimationFrame(measure);
    };
    window.addEventListener("scroll", onScrollResize, true);
    window.addEventListener("resize", onScrollResize);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScrollResize, true);
      window.removeEventListener("resize", onScrollResize);
    };
  }, [open, placementAnchorSelector, placementBoundsSelector]);

  /* Escape dismisses the floating brief */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (!row) return <span className={className}>{children}</span>;

  return (
    <div
      ref={anchorRef}
      className={className}
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse") requestOpen(false);
      }}
      onPointerLeave={(e) => {
        if (e.pointerType === "mouse") scheduleClose();
      }}
      onFocusCapture={() => requestOpen(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) scheduleClose();
      }}
    >
      {children}
      {open
        ? createPortal(
            <LabHoverCard
              row={row}
              childrenByParent={childrenByParent}
              pinned={false}
              placement={placement}
              pos={pos}
              sheet={false}
              cardRef={cardRef}
              onPointerEnter={cancelClose}
              onPointerLeave={scheduleClose}
              onClose={() => setOpen(false)}
            />,
            document.body,
          )
        : null}
    </div>
  );
}

interface LabRowProps {
  row: RowModel;
  open: boolean;
  planned: boolean;
  onHoverOpen: (source: HoverOpenSource) => void;
  onHoverClose: () => void;
  onPin: (focusCard: boolean) => void;
  onAction: () => void;
  flash?: boolean;
  /* Constituent of a panel band: the panel carries the order action, so the row
     itself shows none (review-only). */
  inPanel?: boolean;
  /* Panel-aware action label for a panel constituent shown outside a band. */
  actionPanelName?: string;
}

function LabRow({ row, open, planned, onHoverOpen, onHoverClose, onPin, onAction, flash, inPanel, actionPanelName }: LabRowProps) {
  const ref = row.reference;
  const lr = row.latestResult;
  const dim = !!row.basedOn; // status reflects an older draw
  const refDisp = refDisplay(ref);
  const valueRefLabel = refDisp ? `Ref ${refDisp}` : row.valueType === "qualitative" ? "Qualitative result" : "No reference";
  const reasonColor = row.group === "out" ? SEV_TEXT[row.sev] : GROUP_REASON_COLOR[row.group];
  const showTrend = !!row.trend && (row.group === "out" || row.group === "resolved");
  const midReason = !showTrend && !!row.reason && (row.group === "watch" || row.group === "stale");
  const aria = `${row.displayName}. ${lr ? `${lr.val.raw} ${row.unit || ""} on ${fmtDate(lr.date)}.` : "No result."} ${row.reason || "In range."}${planned ? " Planned in lab order." : ""}`;

  /* mouse hover/focus previews; click or Enter/Space pins; touch falls through
     to click so it pins on first tap (no hover dependency). */
  const handlePointerEnter = (e: ReactPointerEvent) => {
    if (e.pointerType === "mouse") onHoverOpen("mouse");
  };
  const handlePointerLeave = (e: ReactPointerEvent) => {
    if (e.pointerType === "mouse") onHoverClose();
  };

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
    <div className={`kl-rowwrap${flash ? " kl-row-flash" : ""}${open ? " kl-row-open" : ""}`} id={labRowDomId(row.key)}>
      <div
        className="kl-row"
        role="button"
        tabIndex={0}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? HOVER_CARD_ID : undefined}
        aria-label={aria}
        onClick={() => onPin(false)}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        onFocus={() => onHoverOpen("focus")}
        onBlur={onHoverClose}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onPin(true);
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
            <span
              className={`kl-namesub${row.reasonParts ? " kl-namesub-structured" : ""}`}
              style={{ color: reasonColor || "var(--faint)" }}
            >
              <ReasonText reason={row.reason} parts={row.reasonParts} />
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
              <span className="kl-vref">{valueRefLabel}</span>
            </>
          ) : (
            <span className="kl-faint">No result</span>
          )}
        </div>
        {midReason ? (
          <MidReasonTrend row={row} color={reasonColor || "var(--ink2)"} />
        ) : (
          <>
            <div className="kl-sparkcell">
              <MiniTrend row={row} />
            </div>
            <div className="kl-trendcell">{trendNode}</div>
          </>
        )}
        <div className="kl-actcell" aria-hidden={inPanel ? true : undefined}>
          {!inPanel ? (
            <FollowUpAction row={row} planned={planned} onAction={onAction} panelName={actionPanelName} />
          ) : (
            <span className="kl-actcell-empty" />
          )}
        </div>
      </div>
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
  { id: "all", label: "All tests", icon: <Catalog size={16} variant="stroke" /> },
  { id: "overview", label: "Overview", icon: <Home size={16} variant="stroke" /> },
  { id: "table", label: "Table", icon: <Receipt size={16} variant="stroke" /> },
];

const SIGNALS: Array<{ id: SignalId; label: string; sub: string }> = [
  { id: "out", label: "Needs review", sub: "Out of range results that need attention" },
  { id: "watch", label: "Follow up due", sub: "Abnormal in the past, not yet repeated" },
  { id: "resolved", label: "Recently resolved", sub: "Returned to normal after an earlier flag" },
];

const RESULT_STATUSES: Array<{ id: ResultStatusId; label: string }> = [
  { id: "stale", label: "Not in this draw" },
  { id: "noref", label: "No reference" },
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
          <span className={`kl-side-check-label${icon ? "" : " kl-side-check-label--plain"}`}>
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

/* Above-by-default placement for the hover card, horizontally centered over the
   row's mini trend graph (the sparkline the clinician is reading). Placement is
   clamped to the lab content pane before the row's action column, so the card
   does not cover Reorder/Follow-up buttons. `hAnchor` is the sparkline cell's
   rect; without it we fall back to the row's left edge. Coords are
   viewport-relative (position:fixed, measured via getBoundingClientRect). */
function computeCardPlacement(
  a: DOMRect,
  card: HTMLElement,
  hAnchor?: DOMRect,
  bounds?: DOMRect,
): { placement: HoverCardPlacement; left: number; top: number } {
  const cw = card.offsetWidth;
  const ch = card.offsetHeight;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const GAP = 10;
  const M = 12;
  const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), Math.max(lo, hi));
  const safeLeft = Math.max(M, bounds?.left ?? M);
  const safeRight = Math.min(vw - M, bounds?.right ?? vw - M);
  const safeTop = Math.max(M, bounds?.top ?? M);
  const safeBottom = vh - M;
  const safeWidth = Math.max(0, safeRight - safeLeft);
  const safeMaxLeft = safeLeft + Math.max(0, safeWidth - cw);
  /* horizontal: center on the mini trend graph when we have its rect, else
     align to the row's left edge */
  const h = hAnchor ?? a;
  const overTrend = clamp(h.left + h.width / 2 - cw / 2, safeLeft, safeMaxLeft);
  const aboveTop = a.top - GAP - ch;
  const belowTop = a.bottom + GAP;
  /* preferred: sit above the row, centered over its trend graph */
  if (aboveTop >= safeTop) return { placement: "top", left: overTrend, top: aboveTop };
  /* no room above — side placement is allowed only inside the lab content pane */
  const sideTop = clamp(a.top, safeTop, safeBottom - ch);
  if (a.right + GAP + cw <= safeRight) return { placement: "right", left: a.right + GAP, top: sideTop };
  if (a.left - GAP - cw >= safeLeft) return { placement: "left", left: a.left - GAP - cw, top: sideTop };
  if (belowTop + ch <= safeBottom) return { placement: "bottom", left: overTrend, top: belowTop };
  /* last resort: stay in the lab pane and clamp vertically within the viewport */
  return { placement: "top", left: overTrend, top: clamp(aboveTop, safeTop, safeBottom - ch) };
}

function getHoverPlacementBounds(el: HTMLElement): DOMRect | undefined {
  const scope = (el.closest(".kl-main") ?? el.closest(".kura-lab")) as HTMLElement | null;
  const scopeRect = scope?.getBoundingClientRect();
  if (!scopeRect) return undefined;

  const actionRect = el.querySelector<HTMLElement>(".kl-actcell")?.getBoundingClientRect();
  if (!actionRect) return scopeRect;

  const right = Math.min(scopeRect.right, actionRect.left - 12);
  return right - scopeRect.left >= 360
    ? new DOMRect(scopeRect.left, scopeRect.top, right - scopeRect.left, scopeRect.height)
    : scopeRect;
}

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

  const [view, setView] = useState<ViewId>("all");
  const [signalFilters, setSignalFilters] = useState<Set<SignalId>>(() => new Set());
  const [resultStatusFilters, setResultStatusFilters] = useState<Set<ResultStatusId>>(() => new Set());
  const [systemFilters, setSystemFilters] = useState<Set<string>>(() => new Set());
  const [scope, setScope] = useState<"all" | "latest">("all");
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<{ key: string; mode: "hover" | "pinned" } | null>(null);
  const [cardPos, setCardPos] = useState<{ left: number; top: number } | null>(null);
  const [cardPlacement, setCardPlacement] = useState<HoverCardPlacement>("top");
  const [viewportW, setViewportW] = useState(0);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const openTimer = useRef<number | null>(null);
  const closeTimer = useRef<number | null>(null);
  const pendingFocusRef = useRef(false);
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
      setFlashKey(focusKey);

      window.setTimeout(() => {
        document.getElementById(labRowDomId(focusKey))?.scrollIntoView({ behavior: "smooth", block: "center" });
        onFocusHandled?.();
        /* pin once the smooth scroll has settled so the anchor rect is final */
        window.setTimeout(() => setActive({ key: focusKey, mode: "pinned" }), 320);
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
    bodyRef.current?.scrollTo({ top: 0, left: 0 });
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

  const clearOpenTimer = () => {
    if (openTimer.current != null) {
      window.clearTimeout(openTimer.current);
      openTimer.current = null;
    }
  };
  const clearCloseTimer = () => {
    if (closeTimer.current != null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (openTimer.current != null) {
        window.clearTimeout(openTimer.current);
        openTimer.current = null;
      }
      if (closeTimer.current != null) {
        window.clearTimeout(closeTimer.current);
        closeTimer.current = null;
      }
    };
  }, []);

  const setHoverActive = (key: string) => {
    setActive((a) =>
      a && a.mode === "pinned" && rows.some((r) => r.key === a.key) ? a : { key, mode: "hover" },
    );
  };

  /* Mouse opens after hover-intent delay (prevents drive-by popovers while
     scanning rows); keyboard focus opens immediately for predictable tabbing.
     Click or Enter/Space pins. A live pin is sticky — hover never overrides it
     — but a pin whose row was filtered out self-heals so the next hover takes
     over (covers keyboard filter changes with no outside press). */
  const openHover = (key: string, source: HoverOpenSource) => {
    clearCloseTimer();
    clearOpenTimer();
    if (source === "focus") {
      setHoverActive(key);
      return;
    }
    openTimer.current = window.setTimeout(() => {
      openTimer.current = null;
      setHoverActive(key);
    }, HOVER_OPEN_DELAY_MS);
  };
  const scheduleClose = () => {
    clearOpenTimer();
    clearCloseTimer();
    closeTimer.current = window.setTimeout(() => {
      closeTimer.current = null;
      setActive((a) => (a && a.mode === "pinned" ? a : null));
    }, HOVER_CLOSE_DELAY_MS);
  };
  const cancelClose = () => clearCloseTimer();
  const closeNow = () => {
    clearOpenTimer();
    clearCloseTimer();
    setActive(null);
  };
  const focusRow = (key: string) => {
    document.getElementById(labRowDomId(key))?.querySelector<HTMLElement>(".kl-row")?.focus();
  };
  const closeAndReturnFocus = () => {
    const key = active?.key;
    closeNow();
    if (key) focusRow(key);
  };
  const pin = (key: string, focusCard: boolean) => {
    clearOpenTimer();
    clearCloseTimer();
    if (focusCard) pendingFocusRef.current = true;
    setActive((a) => (a && a.key === key && a.mode === "pinned" ? null : { key, mode: "pinned" }));
  };

  /* viewport width drives the bottom-sheet variant + placement re-clamping */
  useEffect(() => {
    const onResize = () => setViewportW(window.innerWidth);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const isSheet = viewportW > 0 && viewportW <= 700;

  /* place the card before paint on open / viewport-mode change: right by
     default, flip left, fall below when constrained */
  useLayoutEffect(() => {
    if (!active || isSheet || !cardRef.current) return;
    const el = document.getElementById(labRowDomId(active.key));
    if (!el) return;
    const spark = el.querySelector<HTMLElement>(".kl-sparkcell");
    const { placement, left, top } = computeCardPlacement(
      el.getBoundingClientRect(),
      cardRef.current,
      spark?.getBoundingClientRect(),
      getHoverPlacementBounds(el),
    );
    setCardPlacement(placement);
    setCardPos({ left, top });
  }, [active, isSheet]);

  /* keep the fixed card glued to its row while the list scrolls or resizes;
     drop it once the anchor scrolls out of view */
  useEffect(() => {
    if (!active) return;
    let raf = 0;
    const update = () => {
      window.cancelAnimationFrame(raf);
      raf = window.requestAnimationFrame(() => {
        const el = document.getElementById(labRowDomId(active.key));
        if (!el) {
          closeNow();
          return;
        }
        const a = el.getBoundingClientRect();
        if (a.bottom < 0 || a.top > window.innerHeight) {
          closeNow();
          return;
        }
        if (isSheet || !cardRef.current) return;
        const spark = el.querySelector<HTMLElement>(".kl-sparkcell");
        const { placement, left, top } = computeCardPlacement(
          a,
          cardRef.current,
          spark?.getBoundingClientRect(),
          getHoverPlacementBounds(el),
        );
        setCardPlacement(placement);
        setCardPos({ left, top });
      });
    };
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, isSheet]);

  /* keyboard pin moves focus into the dialog so the CTA is reachable next Tab */
  useLayoutEffect(() => {
    if (active?.mode === "pinned" && (cardPos || isSheet) && pendingFocusRef.current) {
      pendingFocusRef.current = false;
      cardRef.current?.focus();
    }
  }, [active, cardPos, isSheet]);

  /* Escape closes + returns focus to the row; an outside press dismisses a pin */
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeAndReturnFocus();
      }
    };
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node | null;
      if (!t) return;
      if (cardRef.current?.contains(t)) return;
      if (document.getElementById(labRowDomId(active.key))?.contains(t)) return;
      closeNow();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown, true);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

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

  const panelLabelFor = (r: RowModel) => {
    const pid = panelIdFor(r);
    return pid ? panelNameForId(pid) : undefined;
  };

  const labRow = (r: RowModel) => (
    <LabRow
      key={r.key}
      row={r}
      open={active?.key === r.key}
      planned={isPlanned(r.key)}
      onHoverOpen={(source) => openHover(r.key, source)}
      onHoverClose={scheduleClose}
      onPin={(focusCard) => pin(r.key, focusCard)}
      onAction={() => handleFollowUp(r)}
      flash={flashKey === r.key}
      actionPanelName={panelLabelFor(r)}
    />
  );

  /* A panel constituent inside a band: fully reviewable (value, trend, hover
     card) but no order action — the band carries the single order. */
  const constituentRow = (r: RowModel) => (
    <LabRow
      key={r.key}
      row={r}
      open={active?.key === r.key}
      planned={isPlanned(r.key)}
      onHoverOpen={(source) => openHover(r.key, source)}
      onHoverClose={scheduleClose}
      onPin={(focusCard) => pin(r.key, focusCard)}
      onAction={() => handleFollowUp(r)}
      flash={flashKey === r.key}
      inPanel
    />
  );

  /* Unbreakable panel band: constituents you can't order alone, grouped under one
     status-aware action. The header stays visually neutral; severity flags live
     only on the actual constituent results underneath. */
  const panelBand = (panelId: string, rows: RowModel[], domainKey: string) => {
    const bandKey = `${domainKey}::panel::${panelId}`;
    const bandClosed = closed.has(bandKey);
    const panelName = panelNameForId(panelId);
    const rep = worstRow(rows);
    const planned = isPlanned(rep.key);
    const onBand = () => handleFollowUp(rep);
    return (
      <div className="kl-panel" key={bandKey}>
        <div className="kl-panel-head">
          <button
            type="button"
            className="kl-panel-toggle"
            aria-expanded={!bandClosed}
            aria-label={`${bandClosed ? "Expand" : "Collapse"} ${panelName}`}
            onClick={() => toggleGroup(bandKey)}
          >
            <ChevronDown size={14} variant="stroke" className="kl-chev" style={{ transform: bandClosed ? "rotate(-90deg)" : "none" }} />
            <span className="kl-panel-name">{panelName}</span>
            <span className="kl-panel-tag">Panel</span>
          </button>
          <span className="kl-panel-meta">
            {rows.length} {rows.length === 1 ? "result" : "results"}
          </span>
          <span className="kl-panel-act">
            {hasFollowUp(rep.group, planned) ? <FollowUpAction row={rep} planned={planned} onAction={onBand} panelName={panelName} /> : null}
          </span>
        </div>
        {!bandClosed && <div className="kl-panel-rows">{rows.map(constituentRow)}</div>}
      </div>
    );
  };

  /* Render a domain's rows as ordered segments: unbreakable panels become bands,
     single analytes stay individually orderable rows. */
  const renderDomainBody = (list: RowModel[], domainKey: string) =>
    segmentRowsByPanel(list).map((seg) =>
      seg.kind === "panel" ? panelBand(seg.panelId, seg.rows, domainKey) : labRow(seg.row),
    );

  const collapsibleCardTitle = ({
    icon,
    label,
    count,
    summary,
    isClosed,
    onToggle,
  }: {
    icon?: ReactNode;
    label: string;
    count: number;
    summary?: string;
    isClosed: boolean;
    onToggle: () => void;
  }) => (
    <button
      type="button"
      className="kl-card-toggle"
      aria-label={`${isClosed ? "Expand" : "Collapse"} ${label}`}
      aria-expanded={!isClosed}
      onClick={onToggle}
    >
      <span className="kl-card-t">
        {icon ? <span className="kl-card-ic" aria-hidden="true">{icon}</span> : null}
        <span>{label}</span>
        <Counter count={count} />
        {summary ? <span className="kl-card-sum">{summary}</span> : null}
      </span>
      <ChevronDown
        size={16}
        variant="stroke"
        className="kl-chev"
        style={{ transform: isClosed ? "rotate(-90deg)" : "none" }}
        aria-hidden="true"
      />
    </button>
  );

  const domainCard = (dom: (typeof DOMAINS)[number], list: RowModel[], key: string, sum?: string) => {
    const isClosed = closed.has(key);
    return (
      <Card
        key={key}
        className="kl-card"
        padded={false}
        title={collapsibleCardTitle({
          icon: dom.icon,
          label: dom.label,
          count: list.length,
          summary: sum,
          isClosed,
          onToggle: () => toggleGroup(key),
        })}
      >
        {!isClosed && renderDomainBody(list, key)}
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
        <button
          className="kl-quiet"
          onClick={() => goView("all")}
          aria-label={`View all tests. ${counts.ok} ${counts.ok === 1 ? "test" : "tests"} in range with no flags${counts.stale ? `, ${counts.stale} not in this draw` : ""}${counts.noref ? `, ${counts.noref} without a reference range` : ""}.`}
        >
          <span className="kl-quiet-summary">
            {counts.ok} {counts.ok === 1 ? "test" : "tests"} in range with no flags
            {counts.stale ? ` · ${counts.stale} not in this draw` : ""}
            {counts.noref ? ` · ${counts.noref} without a reference range` : ""}
          </span>
          <span className="kl-quiet-action">View all tests</span>
        </button>
      )}
    </div>
  );

  /* ---- All tests ---- */
  const renderAll = () => {
    const visibleAll = topRows.filter((r) => inScope(r) && passesSideFilters(r)).length;
    const narrowed = scope === "latest" || sideFiltersActive;
    const visibleDomainCards = DOMAINS.map((dom) => {
      const inDom = topRows.filter(
        (r) => r.domain === dom.id && passesSignalFilters(r) && passesResultStatusFilters(r) && passesSystemFilters(r),
      );
      const vis = sortRows(inDom.filter(inScope));
      return { dom, inDom, vis, key: `dom:${dom.id}` };
    }).filter(({ vis }) => vis.length > 0);
    const visibleDomainKeys = visibleDomainCards.map(({ key }) => key);
    const allVisibleCategoriesClosed =
      visibleDomainKeys.length > 0 && visibleDomainKeys.every((key) => closed.has(key));
    const bulkActionLabel = allVisibleCategoriesClosed ? "Expand all" : "Collapse all";
    const toggleAllVisibleCategories = () => {
      setClosed((s) => {
        const n = new Set(s);
        visibleDomainKeys.forEach((key) => {
          if (allVisibleCategoriesClosed) n.delete(key);
          else n.add(key);
        });
        return n;
      });
    };

    return (
      <section className="kl-sec" aria-label="All tests">
        <header className="kl-sec-h kl-sec-h--with-action">
          <div className="kl-sec-trow kl-sec-trow--with-action">
            <span className="kl-sec-title">All tests</span>
            <Counter count={visibleAll} />
            {visibleDomainKeys.length > 0 ? (
              <button
                type="button"
                className="kl-sec-action"
                aria-label={`${bulkActionLabel} visible test categories`}
                aria-expanded={!allVisibleCategoriesClosed}
                onClick={toggleAllVisibleCategories}
              >
                <span className="kl-sec-action-ic" aria-hidden="true">
                  {allVisibleCategoriesClosed ? <Expand1 size={14} variant="stroke" /> : <Collapse1 size={14} variant="stroke" />}
                </span>
                <span>{bulkActionLabel}</span>
              </button>
            ) : null}
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
        {visibleDomainCards.map(({ dom, inDom, vis, key }) => {
          const flagged = domStats[dom.id].flagged;
          return domainCard(
            dom,
            vis,
            key,
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
              title={collapsibleCardTitle({
                label: sectionShort(sec),
                count: list.length,
                summary: sec,
                isClosed,
                onToggle: () => toggleGroup(key),
              })}
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
  const activeRow = active ? rows.find((r) => r.key === active.key) ?? null : null;

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

      {activeRow && (
        <LabHoverCard
          key={activeRow.key}
          row={activeRow}
          childrenByParent={childrenByParent}
          pinned={active?.mode === "pinned"}
          placement={cardPlacement}
          pos={cardPos}
          sheet={isSheet}
          cardRef={cardRef}
          onPointerEnter={cancelClose}
          onPointerLeave={scheduleClose}
          onClose={closeAndReturnFocus}
        />
      )}
    </div>
  );
}
