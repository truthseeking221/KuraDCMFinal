"use client";

import { useState } from "react";
import { Button } from "@/components/button";
import { FilterPrimitives } from "@/components/filter-primitives";
import {
  ChevronDown as ChevronDownIcon,
  ChevronRight as ChevronRightIcon,
  Search as SearchIcon,
} from "@/icons/components";

import "./LabHistory.css";

type LabHistoryView = "overview" | "all" | "table";
type LabHistoryTone = "normal" | "success" | "warning" | "danger" | "muted" | "none";
type LabHistoryCategory = "normal" | "outOfRange" | "watch" | "resolved" | "notLatest" | "noReference";
type LabHistoryFilter = "all" | "flagged" | "outOfRange" | "watch" | "resolved" | "notLatest" | "noReference";
type LabHistoryResult = {
  value: string;
  tone?: LabHistoryTone;
};
type LabHistoryTest = {
  name: string;
  unit: string;
  reference: string;
  latest: string;
  latestUnit?: string;
  status: string;
  tone: LabHistoryTone;
  category: LabHistoryCategory;
  trend: LabHistoryTone[];
  values: LabHistoryResult[];
};
type LabHistoryGroup = {
  name: string;
  meta: string;
  tests: LabHistoryTest[];
};

const labHistoryDates = ["MAY 21", "APR 20", "MAR 20", "FEB 18", "JAN 15"];

const labHistoryGroups: LabHistoryGroup[] = [
  {
    name: "Inflammation and immunology",
    meta: "4 TESTS · 1 FLAGGED",
    tests: [
      {
        name: "ESR",
        unit: "mm/hr",
        reference: "Ref 0-20 mm/hr",
        latest: "33",
        latestUnit: "mm/hr",
        status: "High - ref 0-20 mm/hr",
        tone: "danger",
        category: "outOfRange",
        trend: ["danger", "warning", "danger", "warning", "normal"],
        values: [
          { value: "33", tone: "danger" },
          { value: "25", tone: "warning" },
          { value: "30", tone: "danger" },
          { value: "28", tone: "warning" },
          { value: "20", tone: "normal" },
        ],
      },
      {
        name: "CRP",
        unit: "mg/L",
        reference: "Ref < 10 mg/L",
        latest: "—",
        status: "Not in latest draw",
        tone: "muted",
        category: "notLatest",
        trend: ["none", "warning", "danger", "warning", "normal"],
        values: [
          { value: "—", tone: "none" },
          { value: "14", tone: "warning" },
          { value: "24", tone: "danger" },
          { value: "13", tone: "warning" },
          { value: "8", tone: "normal" },
        ],
      },
      {
        name: "Rheumatoid Factors",
        unit: "IU/mL",
        reference: "Ref < 14 IU/mL",
        latest: "—",
        status: "Not in latest draw",
        tone: "muted",
        category: "notLatest",
        trend: ["none", "normal", "normal", "none", "normal"],
        values: [
          { value: "—", tone: "none" },
          { value: "8", tone: "normal" },
          { value: "9", tone: "normal" },
          { value: "—", tone: "none" },
          { value: "7", tone: "normal" },
        ],
      },
      {
        name: "ASO",
        unit: "IU/mL",
        reference: "Ref < 200 IU/mL",
        latest: "—",
        status: "Not in latest draw",
        tone: "muted",
        category: "notLatest",
        trend: ["none", "normal", "none", "normal", "normal"],
        values: [
          { value: "—", tone: "none" },
          { value: "120", tone: "normal" },
          { value: "—", tone: "none" },
          { value: "136", tone: "normal" },
          { value: "118", tone: "normal" },
        ],
      },
    ],
  },
  {
    name: "Kidney and albuminuria",
    meta: "6 TESTS · 4 FLAGGED",
    tests: [
      {
        name: "BUN",
        unit: "mg/dL",
        reference: "Ref 7-20 mg/dL",
        latest: "38",
        latestUnit: "mg/dL",
        status: "High - ref 7-20 mg/dL",
        tone: "danger",
        category: "outOfRange",
        trend: ["danger", "danger", "warning", "warning", "normal"],
        values: [
          { value: "38", tone: "danger" },
          { value: "35", tone: "danger" },
          { value: "28", tone: "warning" },
          { value: "24", tone: "warning" },
          { value: "18", tone: "normal" },
        ],
      },
      {
        name: "Creatinine",
        unit: "mg/dL",
        reference: "Ref 0.6-1.2 mg/dL",
        latest: "3.86",
        latestUnit: "mg/dL",
        status: "High - ref 0.6-1.2 mg/dL",
        tone: "danger",
        category: "outOfRange",
        trend: ["danger", "danger", "warning", "warning", "normal"],
        values: [
          { value: "3.86", tone: "danger" },
          { value: "3.24", tone: "danger" },
          { value: "2.08", tone: "warning" },
          { value: "1.64", tone: "warning" },
          { value: "1.08", tone: "normal" },
        ],
      },
      {
        name: "eGFR",
        unit: "mL/min/1.73m²",
        reference: "Ref >= 60 mL/min/1.73m²",
        latest: "64",
        latestUnit: "mL/min",
        status: "In range - near lower bound",
        tone: "normal",
        category: "normal",
        trend: ["normal", "warning", "warning", "normal", "normal"],
        values: [
          { value: "64", tone: "normal" },
          { value: "58", tone: "warning" },
          { value: "55", tone: "warning" },
          { value: "68", tone: "normal" },
          { value: "82", tone: "normal" },
        ],
      },
      {
        name: "Microalbumin / creatinine ratio",
        unit: "mg/g",
        reference: "Ref < 30 mg/g",
        latest: "155.52",
        latestUnit: "mg/g",
        status: "High - ref < 30 mg/g",
        tone: "danger",
        category: "outOfRange",
        trend: ["danger", "danger", "warning", "warning", "normal"],
        values: [
          { value: "155.52", tone: "danger" },
          { value: "128.70", tone: "danger" },
          { value: "78.40", tone: "warning" },
          { value: "44.20", tone: "warning" },
          { value: "24.10", tone: "normal" },
        ],
      },
      {
        name: "Uric Acid",
        unit: "mg/dL",
        reference: "Ref 2.4-6.0 mg/dL",
        latest: "5.8",
        latestUnit: "mg/dL",
        status: "In range now - prior finding",
        tone: "success",
        category: "resolved",
        trend: ["success", "warning", "warning", "normal", "normal"],
        values: [
          { value: "5.8", tone: "success" },
          { value: "7.4", tone: "warning" },
          { value: "6.9", tone: "warning" },
          { value: "5.6", tone: "normal" },
          { value: "5.2", tone: "normal" },
        ],
      },
      {
        name: "Urine albumin",
        unit: "mg/L",
        reference: "Ref < 20 mg/L",
        latest: "18",
        latestUnit: "mg/L",
        status: "In range - monitored",
        tone: "normal",
        category: "normal",
        trend: ["normal", "warning", "warning", "normal", "normal"],
        values: [
          { value: "18", tone: "normal" },
          { value: "32", tone: "warning" },
          { value: "36", tone: "warning" },
          { value: "16", tone: "normal" },
          { value: "12", tone: "normal" },
        ],
      },
    ],
  },
  {
    name: "CBC and anemia",
    meta: "13 TESTS · 5 FLAGGED",
    tests: [
      {
        name: "White blood cell",
        unit: "10³/uL",
        reference: "Ref 4.0-10.0 10³/uL",
        latest: "7.4",
        latestUnit: "10³/uL",
        status: "In range",
        tone: "normal",
        category: "normal",
        trend: ["normal", "normal", "normal", "normal", "normal"],
        values: [
          { value: "7.4", tone: "normal" },
          { value: "8.1", tone: "normal" },
          { value: "7.9", tone: "normal" },
          { value: "6.8", tone: "normal" },
          { value: "7.0", tone: "normal" },
        ],
      },
      {
        name: "Red blood cell",
        unit: "10⁶/uL",
        reference: "Ref 4.2-5.4 10⁶/uL",
        latest: "3.7",
        latestUnit: "10⁶/uL",
        status: "Low - ref 4.2-5.4 10⁶/uL",
        tone: "warning",
        category: "outOfRange",
        trend: ["warning", "warning", "normal", "normal", "normal"],
        values: [
          { value: "3.7", tone: "warning" },
          { value: "3.8", tone: "warning" },
          { value: "4.1", tone: "normal" },
          { value: "4.3", tone: "normal" },
          { value: "4.5", tone: "normal" },
        ],
      },
      {
        name: "Haemoglobin",
        unit: "g/dL",
        reference: "Ref 12.0-16.0 g/dL",
        latest: "11.0",
        latestUnit: "g/dL",
        status: "Low - ref 12.0-16.0 g/dL",
        tone: "danger",
        category: "outOfRange",
        trend: ["danger", "warning", "normal", "normal", "normal"],
        values: [
          { value: "11.0", tone: "danger" },
          { value: "11.6", tone: "warning" },
          { value: "12.2", tone: "normal" },
          { value: "12.7", tone: "normal" },
          { value: "12.9", tone: "normal" },
        ],
      },
      {
        name: "Haematocrit",
        unit: "%",
        reference: "Ref 36-46 %",
        latest: "33.3",
        latestUnit: "%",
        status: "Low - ref 36-46 %",
        tone: "warning",
        category: "outOfRange",
        trend: ["warning", "warning", "normal", "normal", "normal"],
        values: [
          { value: "33.3", tone: "warning" },
          { value: "34.9", tone: "warning" },
          { value: "37.1", tone: "normal" },
          { value: "38.4", tone: "normal" },
          { value: "39.2", tone: "normal" },
        ],
      },
      {
        name: "MCV",
        unit: "fL",
        reference: "Ref 80-100 fL",
        latest: "89",
        latestUnit: "fL",
        status: "In range",
        tone: "normal",
        category: "normal",
        trend: ["normal", "normal", "normal", "normal", "normal"],
        values: [
          { value: "89", tone: "normal" },
          { value: "90", tone: "normal" },
          { value: "91", tone: "normal" },
          { value: "90", tone: "normal" },
          { value: "88", tone: "normal" },
        ],
      },
      {
        name: "MCH",
        unit: "pg",
        reference: "Ref 27-33 pg",
        latest: "29",
        latestUnit: "pg",
        status: "In range",
        tone: "normal",
        category: "normal",
        trend: ["normal", "normal", "normal", "normal", "normal"],
        values: [
          { value: "29", tone: "normal" },
          { value: "30", tone: "normal" },
          { value: "30", tone: "normal" },
          { value: "29", tone: "normal" },
          { value: "29", tone: "normal" },
        ],
      },
      {
        name: "MCHC",
        unit: "g/dL",
        reference: "Ref 32-36 g/dL",
        latest: "33",
        latestUnit: "g/dL",
        status: "In range",
        tone: "normal",
        category: "normal",
        trend: ["normal", "normal", "normal", "normal", "normal"],
        values: [
          { value: "33", tone: "normal" },
          { value: "33", tone: "normal" },
          { value: "34", tone: "normal" },
          { value: "33", tone: "normal" },
          { value: "34", tone: "normal" },
        ],
      },
      {
        name: "RDW",
        unit: "%",
        reference: "Ref 11.5-14.5 %",
        latest: "14.2",
        latestUnit: "%",
        status: "Watch - near upper bound",
        tone: "warning",
        category: "normal",
        trend: ["normal", "warning", "normal", "normal", "normal"],
        values: [
          { value: "14.2", tone: "normal" },
          { value: "14.6", tone: "warning" },
          { value: "13.8", tone: "normal" },
          { value: "13.5", tone: "normal" },
          { value: "13.3", tone: "normal" },
        ],
      },
      {
        name: "Platelet",
        unit: "10³/uL",
        reference: "Ref 150-450 10³/uL",
        latest: "247",
        latestUnit: "10³/uL",
        status: "In range",
        tone: "normal",
        category: "normal",
        trend: ["normal", "normal", "normal", "normal", "normal"],
        values: [
          { value: "247", tone: "normal" },
          { value: "252", tone: "normal" },
          { value: "260", tone: "normal" },
          { value: "238", tone: "normal" },
          { value: "230", tone: "normal" },
        ],
      },
      {
        name: "Neutrophils",
        unit: "%",
        reference: "Ref 40-75 %",
        latest: "62",
        latestUnit: "%",
        status: "In range now - prior finding",
        tone: "success",
        category: "resolved",
        trend: ["success", "warning", "normal", "normal", "normal"],
        values: [
          { value: "62", tone: "success" },
          { value: "78", tone: "warning" },
          { value: "66", tone: "normal" },
          { value: "61", tone: "normal" },
          { value: "58", tone: "normal" },
        ],
      },
      {
        name: "Lymphocytes",
        unit: "%",
        reference: "Ref 20-45 %",
        latest: "29",
        latestUnit: "%",
        status: "In range now - prior finding",
        tone: "success",
        category: "resolved",
        trend: ["success", "warning", "normal", "normal", "normal"],
        values: [
          { value: "29", tone: "success" },
          { value: "16", tone: "warning" },
          { value: "25", tone: "normal" },
          { value: "31", tone: "normal" },
          { value: "33", tone: "normal" },
        ],
      },
      {
        name: "Monocytes",
        unit: "%",
        reference: "Ref 2-10 %",
        latest: "6",
        latestUnit: "%",
        status: "In range",
        tone: "normal",
        category: "normal",
        trend: ["normal", "normal", "normal", "normal", "normal"],
        values: [
          { value: "6", tone: "normal" },
          { value: "7", tone: "normal" },
          { value: "6", tone: "normal" },
          { value: "5", tone: "normal" },
          { value: "6", tone: "normal" },
        ],
      },
      {
        name: "Eosinophils",
        unit: "%",
        reference: "Ref 0-6 %",
        latest: "3",
        latestUnit: "%",
        status: "In range",
        tone: "normal",
        category: "normal",
        trend: ["normal", "normal", "normal", "normal", "normal"],
        values: [
          { value: "3", tone: "normal" },
          { value: "2", tone: "normal" },
          { value: "3", tone: "normal" },
          { value: "3", tone: "normal" },
          { value: "2", tone: "normal" },
        ],
      },
    ],
  },
  {
    name: "Glycemic control",
    meta: "3 TESTS · 2 WATCH",
    tests: [
      {
        name: "HbA1c",
        unit: "%",
        reference: "Ref < 5.7 %",
        latest: "6.1",
        latestUnit: "%",
        status: "Watch - above target range",
        tone: "warning",
        category: "watch",
        trend: ["warning", "warning", "normal", "normal", "normal"],
        values: [
          { value: "6.1", tone: "warning" },
          { value: "6.3", tone: "warning" },
          { value: "5.8", tone: "normal" },
          { value: "5.6", tone: "normal" },
          { value: "5.5", tone: "normal" },
        ],
      },
      {
        name: "Glucose",
        unit: "mg/dL",
        reference: "Ref 70-99 mg/dL",
        latest: "108",
        latestUnit: "mg/dL",
        status: "Watch - ref 70-99 mg/dL",
        tone: "warning",
        category: "watch",
        trend: ["warning", "normal", "warning", "normal", "normal"],
        values: [
          { value: "108", tone: "warning" },
          { value: "94", tone: "normal" },
          { value: "103", tone: "warning" },
          { value: "92", tone: "normal" },
          { value: "88", tone: "normal" },
        ],
      },
      {
        name: "Estimated average glucose",
        unit: "mg/dL",
        reference: "Derived from HbA1c",
        latest: "128",
        latestUnit: "mg/dL",
        status: "Tracked - derived value",
        tone: "normal",
        category: "normal",
        trend: ["normal", "warning", "normal", "normal", "normal"],
        values: [
          { value: "128", tone: "normal" },
          { value: "134", tone: "warning" },
          { value: "120", tone: "normal" },
          { value: "114", tone: "normal" },
          { value: "111", tone: "normal" },
        ],
      },
    ],
  },
  {
    name: "Electrolytes and minerals",
    meta: "8 TESTS · 2 WATCH",
    tests: [
      {
        name: "Magnesium",
        unit: "mg/dL",
        reference: "Ref 1.7-2.2 mg/dL",
        latest: "3.0",
        latestUnit: "mg/dL",
        status: "High - ref 1.7-2.2 mg/dL",
        tone: "warning",
        category: "outOfRange",
        trend: ["warning", "warning", "normal", "normal", "normal"],
        values: [
          { value: "3.0", tone: "warning" },
          { value: "2.5", tone: "warning" },
          { value: "2.1", tone: "normal" },
          { value: "2.0", tone: "normal" },
          { value: "1.9", tone: "normal" },
        ],
      },
      {
        name: "Phosphorus",
        unit: "mg/dL",
        reference: "Ref 2.5-4.5 mg/dL",
        latest: "4.6",
        latestUnit: "mg/dL",
        status: "Watch - just above range",
        tone: "warning",
        category: "watch",
        trend: ["warning", "normal", "normal", "normal", "normal"],
        values: [
          { value: "4.6", tone: "warning" },
          { value: "4.2", tone: "normal" },
          { value: "4.0", tone: "normal" },
          { value: "3.8", tone: "normal" },
          { value: "3.6", tone: "normal" },
        ],
      },
      {
        name: "Calcium",
        unit: "mg/dL",
        reference: "Ref 8.5-10.5 mg/dL",
        latest: "9.4",
        latestUnit: "mg/dL",
        status: "In range",
        tone: "normal",
        category: "normal",
        trend: ["normal", "normal", "normal", "normal", "normal"],
        values: [
          { value: "9.4", tone: "normal" },
          { value: "9.3", tone: "normal" },
          { value: "9.2", tone: "normal" },
          { value: "9.1", tone: "normal" },
          { value: "9.3", tone: "normal" },
        ],
      },
      {
        name: "Sodium",
        unit: "mmol/L",
        reference: "Ref 135-145 mmol/L",
        latest: "139",
        latestUnit: "mmol/L",
        status: "In range",
        tone: "normal",
        category: "normal",
        trend: ["normal", "normal", "normal", "normal", "normal"],
        values: [
          { value: "139", tone: "normal" },
          { value: "140", tone: "normal" },
          { value: "138", tone: "normal" },
          { value: "141", tone: "normal" },
          { value: "139", tone: "normal" },
        ],
      },
      {
        name: "Potassium",
        unit: "mmol/L",
        reference: "Ref 3.5-5.1 mmol/L",
        latest: "4.4",
        latestUnit: "mmol/L",
        status: "In range",
        tone: "normal",
        category: "normal",
        trend: ["normal", "normal", "normal", "normal", "normal"],
        values: [
          { value: "4.4", tone: "normal" },
          { value: "4.1", tone: "normal" },
          { value: "4.2", tone: "normal" },
          { value: "4.3", tone: "normal" },
          { value: "4.0", tone: "normal" },
        ],
      },
      {
        name: "Chloride",
        unit: "mmol/L",
        reference: "Ref 98-107 mmol/L",
        latest: "104",
        latestUnit: "mmol/L",
        status: "In range",
        tone: "normal",
        category: "normal",
        trend: ["normal", "warning", "normal", "normal", "normal"],
        values: [
          { value: "104", tone: "normal" },
          { value: "110", tone: "warning" },
          { value: "105", tone: "normal" },
          { value: "103", tone: "normal" },
          { value: "102", tone: "normal" },
        ],
      },
      {
        name: "CO2",
        unit: "mmol/L",
        reference: "Ref 22-29 mmol/L",
        latest: "24",
        latestUnit: "mmol/L",
        status: "In range",
        tone: "normal",
        category: "normal",
        trend: ["normal", "normal", "normal", "normal", "normal"],
        values: [
          { value: "24", tone: "normal" },
          { value: "25", tone: "normal" },
          { value: "23", tone: "normal" },
          { value: "24", tone: "normal" },
          { value: "26", tone: "normal" },
        ],
      },
      {
        name: "Anion gap",
        unit: "mmol/L",
        reference: "Ref 8-16 mmol/L",
        latest: "11",
        latestUnit: "mmol/L",
        status: "In range",
        tone: "normal",
        category: "normal",
        trend: ["normal", "normal", "normal", "normal", "normal"],
        values: [
          { value: "11", tone: "normal" },
          { value: "10", tone: "normal" },
          { value: "12", tone: "normal" },
          { value: "11", tone: "normal" },
          { value: "10", tone: "normal" },
        ],
      },
    ],
  },
  {
    name: "Liver and proteins",
    meta: "7 TESTS · 1 NO REF",
    tests: [
      {
        name: "Albumin",
        unit: "g/dL",
        reference: "Ref 3.5-5.0 g/dL",
        latest: "4.0",
        latestUnit: "g/dL",
        status: "In range",
        tone: "normal",
        category: "normal",
        trend: ["normal", "normal", "normal", "normal", "normal"],
        values: [
          { value: "4.0", tone: "normal" },
          { value: "3.9", tone: "normal" },
          { value: "4.1", tone: "normal" },
          { value: "4.0", tone: "normal" },
          { value: "4.2", tone: "normal" },
        ],
      },
      {
        name: "Total protein",
        unit: "g/dL",
        reference: "Ref 6.0-8.3 g/dL",
        latest: "7.2",
        latestUnit: "g/dL",
        status: "In range",
        tone: "normal",
        category: "normal",
        trend: ["normal", "normal", "normal", "normal", "normal"],
        values: [
          { value: "7.2", tone: "normal" },
          { value: "7.0", tone: "normal" },
          { value: "7.1", tone: "normal" },
          { value: "7.3", tone: "normal" },
          { value: "7.1", tone: "normal" },
        ],
      },
      {
        name: "Bilirubin",
        unit: "mg/dL",
        reference: "Ref 0.1-1.2 mg/dL",
        latest: "—",
        status: "Not in latest draw",
        tone: "muted",
        category: "notLatest",
        trend: ["none", "normal", "normal", "none", "normal"],
        values: [
          { value: "—", tone: "none" },
          { value: "0.7", tone: "normal" },
          { value: "0.8", tone: "normal" },
          { value: "—", tone: "none" },
          { value: "0.6", tone: "normal" },
        ],
      },
      {
        name: "AST",
        unit: "U/L",
        reference: "Ref < 35 U/L",
        latest: "28",
        latestUnit: "U/L",
        status: "In range",
        tone: "normal",
        category: "normal",
        trend: ["normal", "normal", "normal", "normal", "normal"],
        values: [
          { value: "28", tone: "normal" },
          { value: "30", tone: "normal" },
          { value: "27", tone: "normal" },
          { value: "26", tone: "normal" },
          { value: "29", tone: "normal" },
        ],
      },
      {
        name: "ALT",
        unit: "U/L",
        reference: "Ref < 40 U/L",
        latest: "32",
        latestUnit: "U/L",
        status: "In range",
        tone: "normal",
        category: "normal",
        trend: ["normal", "normal", "normal", "normal", "normal"],
        values: [
          { value: "32", tone: "normal" },
          { value: "35", tone: "normal" },
          { value: "33", tone: "normal" },
          { value: "30", tone: "normal" },
          { value: "31", tone: "normal" },
        ],
      },
      {
        name: "Alkaline phosphatase",
        unit: "U/L",
        reference: "Ref 44-147 U/L",
        latest: "86",
        latestUnit: "U/L",
        status: "In range",
        tone: "normal",
        category: "normal",
        trend: ["normal", "normal", "normal", "normal", "normal"],
        values: [
          { value: "86", tone: "normal" },
          { value: "90", tone: "normal" },
          { value: "84", tone: "normal" },
          { value: "88", tone: "normal" },
          { value: "82", tone: "normal" },
        ],
      },
      {
        name: "GGT",
        unit: "U/L",
        reference: "No printed reference range",
        latest: "42",
        latestUnit: "U/L",
        status: "No reference - source lists result without range",
        tone: "muted",
        category: "noReference",
        trend: ["muted", "muted", "muted", "muted", "muted"],
        values: [
          { value: "42", tone: "muted" },
          { value: "39", tone: "muted" },
          { value: "41", tone: "muted" },
          { value: "38", tone: "muted" },
          { value: "40", tone: "muted" },
        ],
      },
    ],
  },
  {
    name: "Lipids",
    meta: "4 TESTS · ALL IN RANGE",
    tests: [
      {
        name: "Total cholesterol",
        unit: "mg/dL",
        reference: "Ref < 200 mg/dL",
        latest: "186",
        latestUnit: "mg/dL",
        status: "In range",
        tone: "normal",
        category: "normal",
        trend: ["normal", "normal", "warning", "normal", "normal"],
        values: [
          { value: "186", tone: "normal" },
          { value: "190", tone: "normal" },
          { value: "204", tone: "warning" },
          { value: "188", tone: "normal" },
          { value: "180", tone: "normal" },
        ],
      },
      {
        name: "LDL-C",
        unit: "mg/dL",
        reference: "Ref < 100 mg/dL",
        latest: "94",
        latestUnit: "mg/dL",
        status: "In range - monitored",
        tone: "normal",
        category: "normal",
        trend: ["normal", "warning", "warning", "normal", "normal"],
        values: [
          { value: "94", tone: "normal" },
          { value: "108", tone: "warning" },
          { value: "115", tone: "warning" },
          { value: "98", tone: "normal" },
          { value: "92", tone: "normal" },
        ],
      },
      {
        name: "HDL-C",
        unit: "mg/dL",
        reference: "Ref > 40 mg/dL",
        latest: "51",
        latestUnit: "mg/dL",
        status: "In range",
        tone: "normal",
        category: "normal",
        trend: ["normal", "normal", "normal", "normal", "normal"],
        values: [
          { value: "51", tone: "normal" },
          { value: "49", tone: "normal" },
          { value: "46", tone: "normal" },
          { value: "48", tone: "normal" },
          { value: "50", tone: "normal" },
        ],
      },
      {
        name: "Triglycerides",
        unit: "mg/dL",
        reference: "Ref < 150 mg/dL",
        latest: "132",
        latestUnit: "mg/dL",
        status: "In range - monitored",
        tone: "normal",
        category: "normal",
        trend: ["normal", "normal", "warning", "normal", "normal"],
        values: [
          { value: "132", tone: "normal" },
          { value: "146", tone: "normal" },
          { value: "168", tone: "warning" },
          { value: "142", tone: "normal" },
          { value: "138", tone: "normal" },
        ],
      },
    ],
  },
  {
    name: "Urinalysis",
    meta: "11 TESTS · 8 FLAGGED",
    tests: [
      {
        name: "Specific Gravity",
        unit: "",
        reference: "Ref 1.005-1.030",
        latest: "—",
        status: "Not in latest draw",
        tone: "muted",
        category: "notLatest",
        trend: ["none", "normal", "normal", "none", "normal"],
        values: [
          { value: "—", tone: "none" },
          { value: "1.018", tone: "normal" },
          { value: "1.020", tone: "normal" },
          { value: "—", tone: "none" },
          { value: "1.016", tone: "normal" },
        ],
      },
      {
        name: "Bacteria",
        unit: "",
        reference: "Expected negative",
        latest: "Negative",
        status: "In range now - prior finding",
        tone: "success",
        category: "resolved",
        trend: ["success", "warning", "normal", "normal", "normal"],
        values: [
          { value: "Neg", tone: "success" },
          { value: "Few", tone: "warning" },
          { value: "Neg", tone: "normal" },
          { value: "Neg", tone: "normal" },
          { value: "Neg", tone: "normal" },
        ],
      },
      {
        name: "Blood",
        unit: "",
        reference: "Expected negative",
        latest: "—",
        status: "Not in latest draw",
        tone: "muted",
        category: "notLatest",
        trend: ["none", "warning", "normal", "none", "normal"],
        values: [
          { value: "—", tone: "none" },
          { value: "Trace", tone: "warning" },
          { value: "Neg", tone: "normal" },
          { value: "—", tone: "none" },
          { value: "Neg", tone: "normal" },
        ],
      },
      {
        name: "Glucose",
        unit: "",
        reference: "Expected negative",
        latest: "Negative",
        status: "In range now - prior finding",
        tone: "success",
        category: "resolved",
        trend: ["success", "warning", "normal", "normal", "normal"],
        values: [
          { value: "Neg", tone: "success" },
          { value: "1+", tone: "warning" },
          { value: "Neg", tone: "normal" },
          { value: "Neg", tone: "normal" },
          { value: "Neg", tone: "normal" },
        ],
      },
      {
        name: "Ketone",
        unit: "",
        reference: "Expected negative",
        latest: "—",
        status: "Not in latest draw",
        tone: "muted",
        category: "notLatest",
        trend: ["none", "normal", "none", "normal", "normal"],
        values: [
          { value: "—", tone: "none" },
          { value: "Neg", tone: "normal" },
          { value: "—", tone: "none" },
          { value: "Neg", tone: "normal" },
          { value: "Neg", tone: "normal" },
        ],
      },
      {
        name: "Nitrite",
        unit: "",
        reference: "Expected negative",
        latest: "—",
        status: "Not in latest draw",
        tone: "muted",
        category: "notLatest",
        trend: ["none", "normal", "none", "normal", "normal"],
        values: [
          { value: "—", tone: "none" },
          { value: "Neg", tone: "normal" },
          { value: "—", tone: "none" },
          { value: "Neg", tone: "normal" },
          { value: "Neg", tone: "normal" },
        ],
      },
      {
        name: "Protein",
        unit: "",
        reference: "Expected negative",
        latest: "Negative",
        status: "In range now - prior finding",
        tone: "success",
        category: "resolved",
        trend: ["success", "warning", "warning", "normal", "normal"],
        values: [
          { value: "Neg", tone: "success" },
          { value: "1+", tone: "warning" },
          { value: "Trace", tone: "warning" },
          { value: "Neg", tone: "normal" },
          { value: "Neg", tone: "normal" },
        ],
      },
      {
        name: "Transparency",
        unit: "",
        reference: "Expected clear",
        latest: "Clear",
        status: "In range now - prior finding",
        tone: "success",
        category: "resolved",
        trend: ["success", "warning", "normal", "normal", "normal"],
        values: [
          { value: "Clear", tone: "success" },
          { value: "Cloudy", tone: "warning" },
          { value: "Clear", tone: "normal" },
          { value: "Clear", tone: "normal" },
          { value: "Clear", tone: "normal" },
        ],
      },
      {
        name: "Urobilinogen",
        unit: "EU/dL",
        reference: "Ref 0.2-1.0 EU/dL",
        latest: "—",
        status: "Not in latest draw",
        tone: "muted",
        category: "notLatest",
        trend: ["none", "normal", "normal", "none", "normal"],
        values: [
          { value: "—", tone: "none" },
          { value: "0.4", tone: "normal" },
          { value: "0.3", tone: "normal" },
          { value: "—", tone: "none" },
          { value: "0.2", tone: "normal" },
        ],
      },
      {
        name: "White Blood Cells",
        unit: "/HPF",
        reference: "Ref 0-5 /HPF",
        latest: "3",
        latestUnit: "/HPF",
        status: "In range now - prior finding",
        tone: "success",
        category: "resolved",
        trend: ["success", "warning", "normal", "normal", "normal"],
        values: [
          { value: "3", tone: "success" },
          { value: "8", tone: "warning" },
          { value: "4", tone: "normal" },
          { value: "3", tone: "normal" },
          { value: "2", tone: "normal" },
        ],
      },
      {
        name: "Yeast",
        unit: "",
        reference: "Expected none seen",
        latest: "None",
        status: "In range",
        tone: "normal",
        category: "normal",
        trend: ["normal", "normal", "normal", "none", "normal"],
        values: [
          { value: "None", tone: "normal" },
          { value: "None", tone: "normal" },
          { value: "None", tone: "normal" },
          { value: "—", tone: "none" },
          { value: "None", tone: "normal" },
        ],
      },
    ],
  },
  {
    name: "Thyroid",
    meta: "1 TEST · ALL IN RANGE",
    tests: [
      {
        name: "TSH",
        unit: "uIU/mL",
        reference: "Ref 0.4-4.0 uIU/mL",
        latest: "2.1",
        latestUnit: "uIU/mL",
        status: "In range",
        tone: "normal",
        category: "normal",
        trend: ["normal", "normal", "normal", "normal", "normal"],
        values: [
          { value: "2.1", tone: "normal" },
          { value: "2.4", tone: "normal" },
          { value: "2.2", tone: "normal" },
          { value: "2.0", tone: "normal" },
          { value: "2.3", tone: "normal" },
        ],
      },
    ],
  },
];

const labHistoryEntries = labHistoryGroups.flatMap((group) =>
  group.tests.map((test) => ({
    groupName: group.name,
    test,
  })),
);

const labFlaggedCategories: LabHistoryCategory[] = ["outOfRange", "watch", "resolved"];

const labFilterOptions: { id: LabHistoryFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "flagged", label: "Ever flagged" },
  { id: "outOfRange", label: "Out of range" },
  { id: "watch", label: "Watch" },
  { id: "resolved", label: "Resolved" },
  { id: "notLatest", label: "Not in latest draw" },
  { id: "noReference", label: "No reference" },
];

const labOverviewSections: { categories: LabHistoryCategory[]; title: string }[] = [
  { title: "OUT OF RANGE", categories: ["outOfRange"] },
  { title: "WATCH", categories: ["watch"] },
  { title: "RECENTLY RESOLVED", categories: ["resolved"] },
  { title: "NOT IN THE LATEST DRAW", categories: ["notLatest"] },
];

function getLabFilterCount(filter: LabHistoryFilter) {
  if (filter === "all") return labHistoryEntries.length;
  if (filter === "flagged") {
    return labHistoryEntries.filter(({ test }) => labFlaggedCategories.includes(test.category)).length;
  }

  return labHistoryEntries.filter(({ test }) => test.category === filter).length;
}

function matchesLabFilter(test: LabHistoryTest, filter: LabHistoryFilter) {
  if (filter === "all") return true;
  if (filter === "flagged") return labFlaggedCategories.includes(test.category);
  return test.category === filter;
}

function matchesLabSearch(test: LabHistoryTest, groupName: string, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;

  return [
    groupName,
    test.name,
    test.unit,
    test.reference,
    test.latest,
    test.latestUnit,
    test.status,
    test.values.map((value) => value.value).join(" "),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(normalizedQuery);
}

function getFilteredLabGroups(query: string, filter: LabHistoryFilter = "all") {
  return labHistoryGroups
    .map((group) => ({
      ...group,
      tests: group.tests.filter((test) => matchesLabFilter(test, filter) && matchesLabSearch(test, group.name, query)),
    }))
    .filter((group) => group.tests.length > 0);
}

function getFilteredLabEntries(query: string, categories: LabHistoryCategory[]) {
  return labHistoryEntries.filter(
    ({ groupName, test }) => categories.includes(test.category) && matchesLabSearch(test, groupName, query),
  );
}

function LabReportSearch({
  query,
  setQuery,
}: {
  query: string;
  setQuery: (query: string) => void;
}) {
  return (
    <label className="kl-report-search">
      <SearchIcon size={16} variant="stroke" />
      <input
        aria-label="Search this report"
        placeholder="Search this report"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
    </label>
  );
}

function LabHistoryTabs({
  activeView,
  setActiveView,
}: {
  activeView: LabHistoryView;
  setActiveView: (view: LabHistoryView) => void;
}) {
  const tabs: { id: LabHistoryView; label: string; count?: number }[] = [
    { id: "overview", label: "Overview", count: getLabFilterCount("outOfRange") },
    { id: "all", label: "All tests" },
    { id: "table", label: "Table" },
  ];

  return (
    <div className="kl-history-tabs" role="tablist" aria-label="Lab history views">
      {tabs.map((tab) => (
        <button
          aria-selected={activeView === tab.id}
          className={`kl-history-tab${activeView === tab.id ? " active" : ""}`}
          key={tab.id}
          onClick={() => setActiveView(tab.id)}
          role="tab"
          type="button"
        >
          <span>{tab.label}</span>
          {typeof tab.count === "number" && (
            <FilterPrimitives.Count className="kl-tab-count" selected={activeView === tab.id}>
              {tab.count}
            </FilterPrimitives.Count>
          )}
        </button>
      ))}
    </div>
  );
}

type LabTrendLatest = "Normal" | "Borderline" | "High" | "Low" | "None";
type LabTrendToneClass = "normal" | "warning" | "danger" | "low" | "none";
type LabTrendPoint = {
  x: number;
  y: number;
  size: 10 | 12;
  latest: LabTrendLatest;
};

const labTrendToneClass: Record<LabTrendLatest, LabTrendToneClass> = {
  Normal: "normal",
  Borderline: "warning",
  High: "danger",
  Low: "low",
  None: "none",
};

const labTrendPointStatus: Record<LabTrendLatest, LabTrendLatest[]> = {
  Normal: ["Normal", "Normal", "Normal", "Normal", "Normal"],
  Borderline: ["Normal", "Normal", "Normal", "Borderline", "Borderline"],
  High: ["Normal", "Normal", "Borderline", "High", "High"],
  Low: ["Normal", "Normal", "Borderline", "Low", "Low"],
  None: ["None", "None", "None", "None", "None"],
};

const labTrendPointY: Record<LabTrendLatest, number[]> = {
  Normal: [14, 13, 15, 13, 14],
  Borderline: [16, 15, 14, 12, 11],
  High: [20, 18, 13, 8, 4],
  Low: [8, 10, 14, 19, 22],
  None: [14, 14, 14, 14, 14],
};

const labTrendPointX = [6, 20, 34, 48, 64];

function getLabTrendLatest(test: LabHistoryTest): LabTrendLatest {
  if (test.latest === "—" || test.tone === "muted" || test.tone === "none") {
    return "None";
  }

  const normalizedStatus = test.status.toLowerCase();

  if (normalizedStatus.includes("low")) {
    return "Low";
  }

  if (test.tone === "warning") {
    return "Borderline";
  }

  if (test.tone === "danger" || normalizedStatus.includes("high")) {
    return "High";
  }

  return "Normal";
}

function getLabTrendPoints(latest: LabTrendLatest): LabTrendPoint[] {
  return labTrendPointX.map((x, index) => ({
    x,
    y: labTrendPointY[latest][index],
    size: index === labTrendPointX.length - 1 ? 12 : 10,
    latest: labTrendPointStatus[latest][index],
  }));
}

function LabTrend({ test }: { test: LabHistoryTest }) {
  const latest = getLabTrendLatest(test);
  const points = getLabTrendPoints(latest);

  return (
    <span className={`kl-trend trend-${latest.toLowerCase()}`} aria-hidden>
      <svg className="kl-trend-svg" focusable="false" viewBox="0 0 70 28">
        {points.slice(1).map((point, index) => {
          const start = points[index];
          const toneClass = labTrendToneClass[point.latest];

          return (
            <line
              className={`kl-trend-segment tone-${toneClass}`}
              key={`${start.x}-${point.x}`}
              x1={start.x}
              x2={point.x}
              y1={start.y}
              y2={point.y}
            />
          );
        })}
        {points.map((point) => {
          const toneClass = labTrendToneClass[point.latest];
          const shellRadius = point.size === 12 ? 5.5 : 4.5;

          return (
            <g key={`${point.x}-${point.y}`}>
              <circle className="kl-trend-point-shell" cx={point.x} cy={point.y} r={shellRadius} />
              <circle className={`kl-trend-point-core tone-${toneClass}`} cx={point.x} cy={point.y} r="2.9" />
            </g>
          );
        })}
      </svg>
    </span>
  );
}

function LabLegend() {
  const items: { label: string; tone: LabHistoryTone }[] = [
    { label: "In range", tone: "normal" },
    { label: "Outside reference/finding", tone: "warning" },
    { label: "Markedly outside", tone: "danger" },
    { label: "No result/no reference", tone: "muted" },
  ];

  return (
    <div className="kl-history-legend" aria-label="Lab history legend">
      {items.map((item) => (
        <span key={item.label}>
          <span className={`kl-status-dot tone-${item.tone}`} />
          {item.label}
        </span>
      ))}
    </div>
  );
}

function LabLatestValue({ test }: { test: LabHistoryTest }) {
  return (
    <span className={`kl-latest-value tone-${test.tone}`}>
      <strong>{test.latest}</strong>
      {test.latest !== "—" && test.latestUnit && <span>{test.latestUnit}</span>}
    </span>
  );
}

function LabHistoryListRow({ groupName, test }: { groupName: string; test: LabHistoryTest }) {
  return (
    <article className="kl-list-row">
      <span className={`kl-status-dot tone-${test.tone}`} />
      <div className="kl-list-row-copy">
        <div className="kl-list-row-main">
          <strong>{test.name}</strong>
          <LabTrend test={test} />
          <LabLatestValue test={test} />
          <ChevronRightIcon size={16} variant="stroke" />
        </div>
        <p>
          <span>{test.status}</span>
          <span>{groupName}</span>
          <span>{test.reference}</span>
        </p>
      </div>
    </article>
  );
}

function LabHistoryEmptyState({ query }: { query: string }) {
  return (
    <div className="kl-history-empty">
      <strong>No tests found</strong>
      <span>{query ? `No lab results match "${query}".` : "Try a different lab filter."}</span>
    </div>
  );
}

function LabOverviewQuietSummary({
  setActiveFilter,
  setActiveView,
}: {
  setActiveFilter: (filter: LabHistoryFilter) => void;
  setActiveView: (view: LabHistoryView) => void;
}) {
  const quietCount = getLabFilterCount("all") - getLabFilterCount("flagged") - getLabFilterCount("notLatest") - getLabFilterCount("noReference");
  const noReferenceCount = getLabFilterCount("noReference");

  return (
    <div className="kl-overview-quiet-summary">
      <span>{quietCount} tests with no flags and {noReferenceCount} without a reference range</span>
      <span className="kl-overview-summary-separator"> · </span>
      <Button
        className="kl-inline-action"
        onClick={() => {
          setActiveFilter("all");
          setActiveView("all");
        }}
        shape="rounded"
        size="sm"
        type="button"
      >
        view in All tests
      </Button>
    </div>
  );
}

function LabOverviewView({
  query,
  setActiveFilter,
  setActiveView,
}: {
  query: string;
  setActiveFilter: (filter: LabHistoryFilter) => void;
  setActiveView: (view: LabHistoryView) => void;
}) {
  const hasAnyResult = labOverviewSections.some((section) => getFilteredLabEntries(query, section.categories).length > 0);

  if (!hasAnyResult) return <LabHistoryEmptyState query={query} />;

  return (
    <div className="kl-overview-view">
      {labOverviewSections.map((section) => {
        const entries = getFilteredLabEntries(query, section.categories);
        if (entries.length === 0) return null;

        return (
          <section className="kl-summary-section" key={section.title}>
            <div className="kl-summary-section-title">
              <span>{section.title}</span>
              <span>{entries.length}</span>
            </div>
            <div className="kl-list">
              {entries.map(({ groupName, test }) => (
                <LabHistoryListRow groupName={groupName} key={`${groupName}-${test.name}`} test={test} />
              ))}
            </div>
          </section>
        );
      })}
      <LabLegend />
      {!query.trim() && <LabOverviewQuietSummary setActiveFilter={setActiveFilter} setActiveView={setActiveView} />}
    </div>
  );
}

function LabFilterChips({
  activeFilter,
  setActiveFilter,
}: {
  activeFilter: LabHistoryFilter;
  setActiveFilter: (filter: LabHistoryFilter) => void;
}) {
  return (
    <div className="kl-filter-chips" aria-label="Lab result filters">
      {labFilterOptions.map((filter) => (
        <button
          className={`kl-filter-chip${activeFilter === filter.id ? " active" : ""}`}
          key={filter.id}
          onClick={() => setActiveFilter(filter.id)}
          type="button"
        >
          <span>{filter.label}</span>
          <FilterPrimitives.Count selected={activeFilter === filter.id}>{getLabFilterCount(filter.id)}</FilterPrimitives.Count>
        </button>
      ))}
    </div>
  );
}

function LabAllTestsView({
  activeFilter,
  query,
  setActiveFilter,
}: {
  activeFilter: LabHistoryFilter;
  query: string;
  setActiveFilter: (filter: LabHistoryFilter) => void;
}) {
  const groups = getFilteredLabGroups(query, activeFilter);

  return (
    <div className="kl-all-tests-view">
      <LabFilterChips activeFilter={activeFilter} setActiveFilter={setActiveFilter} />
      {groups.length === 0 ? (
        <LabHistoryEmptyState query={query} />
      ) : (
        <div className="kl-group-list">
          {groups.map((group) => (
            <section className="kl-list-group" key={group.name}>
              <div className="kl-list-group-title">
                <span>{group.name}</span>
                <span>{group.meta}</span>
              </div>
              <div className="kl-list">
                {group.tests.map((test) => (
                  <LabHistoryListRow groupName={group.name} key={`${group.name}-${test.name}`} test={test} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
      <LabLegend />
    </div>
  );
}

function LabTableSection({ group }: { group: LabHistoryGroup }) {
  return (
    <section className="kl-table-section">
      <div className="kl-table-group-title">
        <span>
          <ChevronDownIcon size={14} variant="stroke" />
          {group.name}
        </span>
        <span>{group.meta}</span>
      </div>
      <div className="kl-table-grid" role="table" aria-label={`${group.name} lab history`}>
        <div className="kl-table-header-row" role="row">
          <span role="columnheader">TEST</span>
          {labHistoryDates.map((date) => (
            <span key={date} role="columnheader">
              {date}
            </span>
          ))}
        </div>
        {group.tests.map((test) => (
          <div className="kl-table-row" key={`${group.name}-${test.name}`} role="row">
            <div className="kl-table-test-cell" role="cell">
              <strong>{test.name}</strong>
              <span>
                {test.unit ? `${test.unit} · ` : ""}
                {test.reference}
              </span>
            </div>
            {test.values.map((result, index) => (
              <span className={`kl-table-result tone-${result.tone ?? "normal"}`} key={`${test.name}-${index}`} role="cell">
                {result.value}
              </span>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

function LabTableView({ query }: { query: string }) {
  const groups = getFilteredLabGroups(query);

  if (groups.length === 0) return <LabHistoryEmptyState query={query} />;

  return (
    <div className="kl-table-view">
      <div className="kl-table-scroll">
        {groups.map((group) => (
          <LabTableSection group={group} key={group.name} />
        ))}
      </div>
    </div>
  );
}

export function LabHistory() {
  const [activeView, setActiveView] = useState<LabHistoryView>("overview");
  const [activeFilter, setActiveFilter] = useState<LabHistoryFilter>("all");
  const [query, setQuery] = useState("");

  const footnote =
    activeView === "table"
      ? "Raw source view for traceability. Em dash = no structured result for that date; never read as normal or zero."
      : activeView === "all"
        ? "History only. No diagnosis or treatment guidance. Filters are a lens, not a deletion: hidden rows stay counted and search covers the whole dataset."
      : "History only. No diagnosis or treatment guidance. Reference status reflects each lab's printed range; missing cells are never read as normal or zero, and filtered tests stay counted.";

  return (
    <section className="kura-lab" aria-label="Lab history">
      <div className="kl-history-header">
        <h2>Lab history</h2>
      </div>
      <div className="kl-history-controls">
        <LabHistoryTabs activeView={activeView} setActiveView={setActiveView} />
        <LabReportSearch query={query} setQuery={setQuery} />
      </div>
      {activeView === "overview" && (
        <LabOverviewView query={query} setActiveFilter={setActiveFilter} setActiveView={setActiveView} />
      )}
      {activeView === "all" && <LabAllTestsView activeFilter={activeFilter} query={query} setActiveFilter={setActiveFilter} />}
      {activeView === "table" && <LabTableView query={query} />}
      <p className="kl-history-footnote">{footnote}</p>
    </section>
  );
}
