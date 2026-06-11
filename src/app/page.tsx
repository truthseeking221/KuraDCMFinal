"use client";

import type {
  ComponentType,
  CSSProperties,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
} from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { LabHistory, getLabHistoryPreview, type LabPreviewEntry } from "@/components/ui";
import { OrdersTab } from "@/components/OrdersTab";
import { RecordsTab } from "@/components/RecordsTab";
import { Button } from "@/components/button";
import { FilterPrimitives } from "@/components/filter-primitives";
import { Pagination } from "@/components/pagination";
import { Avatar } from "@/components/ui";
import {
  ArrowRight as ArrowRightIcon,
  Booking as BookingIcon,
  Calendar as CalendarIcon,
  Catalog as CatalogIcon,
  ChevronRight as ChevronRightIcon,
  Clock as ClockIcon,
  Flask as FlaskIcon,
  Home as HomeIcon,
  Info as InfoIcon,
  MedicalMask as MedicalMaskIcon,
  More as MoreIcon,
  Note as NoteIcon,
  Patient as PatientIcon,
  Pill as PillIcon,
  Plus as PlusIcon,
  Search as SearchIcon,
  Setting as SettingIcon,
  TeleConsultation as TeleConsultationIcon,
} from "@/icons/components";
import type { IconProps, IconStyle } from "@/icons/components/types";

type Patient = {
  name: string;
  khmerName: string;
  phone: string;
  age: number;
  sex: "female" | "male";
  sexTone: "brand" | "pink";
  lastSeen: string;
  lead: string;
  more: string;
  warning: string;
  conditionCodes: ConditionFilterId[];
  acuity: AcuityFilterId;
  needsReview: boolean;
  overdueFollowUp: boolean;
  abnormalLabs: boolean;
};

type FilterView = "main" | "systems" | "category";
type QuickFilterId = "all" | "needsReview" | "overdueFollowUp" | "abnormalLabs";
type ConditionFilterId =
  | "diabetes"
  | "hypertension"
  | "ckd"
  | "copd"
  | "heartDisease"
  | "heartFailure"
  | "afib"
  | "cardiomyopathy";
type AcuityFilterId = "urgent" | "watch" | "stable";
type MatchMode = "any" | "all";
type FilterState = {
  quickFilter: QuickFilterId;
  conditions: ConditionFilterId[];
  acuities: AcuityFilterId[];
  matchMode: MatchMode;
};
type PatientSeed = Omit<
  Patient,
  "conditionCodes" | "acuity" | "needsReview" | "overdueFollowUp" | "abnormalLabs"
>;
type PageId = "home" | "search" | "patients" | "bookings" | "catalog" | "more" | "settings";
type PatientView = "list" | "record";
type SearchScopeId = "patients" | "bookings" | "labs" | "invoices" | "staff";
type SearchRecord = {
  id: string;
  scope: SearchScopeId;
  title: string;
  subtitle: string;
  meta: string;
  keywords: string[];
  page?: PageId;
  initials?: string;
};
type RecordBadgeTone = "neutral" | "success" | "warning" | "danger" | "info";
type RecordBadgeData = {
  label: string;
  tone?: RecordBadgeTone;
  dashed?: boolean;
  icon?: "info" | "clock";
};
type RecordClinicalContext = "none" | "compact" | "expanded";
type RecordClinicalGroup = {
  label: string;
  badges?: RecordBadgeData[];
  due?: {
    lead: string;
    followUp: string;
  };
};
type RecordTabId = "summary" | "labs" | "orders" | "carePlan" | "records";
type NavIconComponent = ComponentType<IconProps>;
type SummaryItem = {
  title: string;
  meta: string;
  muted?: boolean;
  selfReported?: boolean;
};
type SummarySectionData = {
  id: string;
  title: string;
  Icon: NavIconComponent;
  badge?: string;
  items: SummaryItem[];
};
type MedicalHistoryEntry = SummaryItem & {
  date: string;
};
type MedicalHistoryGroup = {
  label: string;
  entries: MedicalHistoryEntry[];
};
type SummaryLabStatus = LabPreviewEntry["status"];
type SummaryRailSection = {
  title: string;
  rows: SummaryItem[];
};
type SummaryKeyValue = {
  label: string;
  value: string;
};
type NavItem = {
  id: PageId;
  label: string;
  Icon: NavIconComponent;
  activeVariant?: IconStyle;
  disabled?: boolean;
  restVariant?: IconStyle;
};

const navItems = [
  { id: "home", label: "Home", Icon: HomeIcon },
  { id: "search", label: "Search", Icon: SearchIcon },
  { id: "patients", label: "Patients", Icon: PatientIcon },
  { id: "bookings", label: "Bookings", Icon: BookingIcon },
  { id: "catalog", label: "Catalog", Icon: CatalogIcon },
  { id: "more", label: "More", Icon: MoreIcon },
] satisfies NavItem[];

const settingsItem = { id: "settings", label: "Settings", Icon: SettingIcon } satisfies NavItem;

const pageTitles: Record<PageId, string> = {
  home: "Home",
  search: "Search",
  patients: "Patient",
  bookings: "Bookings",
  catalog: "Catalog",
  more: "More",
  settings: "Settings",
};

const pageLabels: Record<PageId, string> = {
  home: "Home",
  search: "Search",
  patients: "Patients",
  bookings: "Bookings",
  catalog: "Catalog",
  more: "More",
  settings: "Settings",
};

const pageIcons: Record<PageId, NavIconComponent> = {
  home: HomeIcon,
  search: SearchIcon,
  patients: PatientIcon,
  bookings: BookingIcon,
  catalog: CatalogIcon,
  more: MoreIcon,
  settings: SettingIcon,
};

const comingSoonPages = new Set<PageId>(["home", "bookings", "catalog", "more", "settings"]);

const selectablePages = new Set<PageId>(["home", "patients", "bookings", "catalog", "more", "settings"]);

const isSelectablePage = (page: PageId) => selectablePages.has(page);

const isComingSoonPage = (page: PageId) => comingSoonPages.has(page);

const quickFilters = [
  { id: "all", label: "All patients" },
  { id: "needsReview", label: "Needs review" },
  { id: "overdueFollowUp", label: "Overdue follow-up" },
  { id: "abnormalLabs", label: "Abnormal labs" },
] satisfies Array<{ id: QuickFilterId; label: string }>;

const globalSearchScopes = [
  { id: "patients", label: "Patients" },
  { id: "bookings", label: "Bookings" },
  { id: "labs", label: "Lab orders" },
  { id: "invoices", label: "Invoices" },
  { id: "staff", label: "Staff" },
] satisfies Array<{ id: SearchScopeId; label: string }>;

const conditionFilters = [
  { id: "diabetes", label: "Type 2 Diabetes (E11)" },
  { id: "hypertension", label: "Hypertension (I10)" },
  { id: "ckd", label: "Chronic kidney disease (N18)" },
  { id: "copd", label: "COPD (J44)" },
] satisfies Array<{ id: ConditionFilterId; label: string }>;

const acuityFilters = [
  { id: "urgent", label: "Urgent" },
  { id: "watch", label: "Watch" },
  { id: "stable", label: "Stable" },
] satisfies Array<{ id: AcuityFilterId; label: string }>;

const defaultFilterState: FilterState = {
  quickFilter: "all",
  conditions: ["diabetes"],
  acuities: ["urgent"],
  matchMode: "any",
};

const bodySystems = [
  "Cardiovascular",
  "Respiratory",
  "Endocrine & metabolic",
  "Digestive",
  "Musculoskeletal",
  "Neurological",
  "Renal & urinary",
  "Mental & behavioral",
];

const cardiovascularConditions = [
  { id: "hypertension", label: "Hypertension (I10)" },
  { id: "heartDisease", label: "Ischemic heart disease (I25)" },
  { id: "heartFailure", label: "Heart failure (I50)" },
  { id: "afib", label: "Atrial fibrillation (I48)" },
  { id: "cardiomyopathy", label: "Cardiomyopathy (I42)" },
] satisfies Array<{ id: ConditionFilterId; label: string }>;

const PATIENT_PAGE_SIZE = 8;

const patientSeeds: PatientSeed[] = [
  {
    name: "Sokha Chann",
    khmerName: "ឆន សុខា",
    phone: "070 ••• 495",
    age: 54,
    sex: "female",
    sexTone: "brand",
    lastSeen: "12d ago",
    lead: "Type 2 Diabetes",
    more: "· Hypertension · CKD stage 3",
    warning: "Neuropathy · Retinopathy",
  },
  {
    name: "Dara Pich",
    khmerName: "ភិច ដារ៉ា",
    phone: "011 ••• 230",
    age: 41,
    sex: "male",
    sexTone: "pink",
    lastSeen: "3d ago",
    lead: "Hypertension",
    more: "· Hyperlipidemia",
    warning: "Obesity",
  },
  {
    name: "Sreymom Sok",
    khmerName: "សុខ ស្រីមុំ",
    phone: "092 ••• 778",
    age: 29,
    sex: "female",
    sexTone: "brand",
    lastSeen: "1d ago",
    lead: "Pregnancy",
    more: "",
    warning: "Gestational diabetes",
  },
  {
    name: "Vichea Nuon",
    khmerName: "នួន វិជា",
    phone: "088 ••• 142",
    age: 63,
    sex: "male",
    sexTone: "pink",
    lastSeen: "5d ago",
    lead: "COPD",
    more: "· Hypertension",
    warning: "OSA · Chronic bronchitis",
  },
  {
    name: "Bopha Lim",
    khmerName: "លឹម បុប្ផា",
    phone: "016 ••• 905",
    age: 7,
    sex: "female",
    sexTone: "brand",
    lastSeen: "8d ago",
    lead: "Asthma",
    more: "",
    warning: "Allergic rhinitis",
  },
  {
    name: "Rithy Kong",
    khmerName: "គង់ ឫទ្ធិ",
    phone: "010 ••• 367",
    age: 48,
    sex: "male",
    sexTone: "pink",
    lastSeen: "21d ago",
    lead: "GERD",
    more: "",
    warning: "H. pylori",
  },
  {
    name: "Channary Em",
    khmerName: "អែម ចន្នារី",
    phone: "069 ••• 514",
    age: 35,
    sex: "female",
    sexTone: "brand",
    lastSeen: "2d ago",
    lead: "Low back pain",
    more: "· Sciatica",
    warning: "Disc herniation",
  },
  {
    name: "Sovann Tep",
    khmerName: "ទេព សុវណ្ណ",
    phone: "078 ••• 889",
    age: 71,
    sex: "male",
    sexTone: "brand",
    lastSeen: "30d ago",
    lead: "Heart failure",
    more: "· CAD · AFib · CKD stage 3",
    warning: "Hyperlipidemia",
  },
];

function getConditionCodes(lead: string, more: string, warning: string, index: number): ConditionFilterId[] {
  const copy = `${lead} ${more} ${warning}`.toLowerCase();
  const codes: ConditionFilterId[] = [];

  if (copy.includes("type 2 diabetes")) codes.push("diabetes");
  if (copy.includes("hypertension")) codes.push("hypertension");
  if (copy.includes("ckd") || copy.includes("chronic kidney")) codes.push("ckd");
  if (copy.includes("copd")) codes.push("copd");
  if (copy.includes("cad")) codes.push("heartDisease");
  if (copy.includes("heart failure")) codes.push("heartFailure");
  if (copy.includes("afib")) codes.push("afib");
  if (index % 17 === 0) codes.push("cardiomyopathy");

  return Array.from(new Set(codes));
}

function getPatientAcuity(index: number): AcuityFilterId {
  if (index % 5 === 0) return "urgent";
  if (index % 3 === 0) return "watch";
  return "stable";
}

const patientNamePool = [
  "Sokha Chann",
  "Dara Pich",
  "Sreymom Sok",
  "Vichea Nuon",
  "Bopha Lim",
  "Rithy Kong",
  "Channary Em",
  "Sovann Tep",
  "Malis Keo",
  "Nita Chan",
  "Piseth Long",
  "Sophea Kim",
  "Kanha Meas",
  "Bunthan Roeun",
  "Sreyneang Yin",
  "Visal Heng",
  "Sothea Ouk",
  "Rachana Pov",
  "Dalin Chea",
  "Samnang Ly",
  "Sophal Touch",
  "Leakhena Nhem",
  "Panha Sao",
  "Sokunthy Vann",
  "Kosal Mao",
  "Sreyka Nov",
  "Vannak Phan",
  "Chantha Mok",
  "Sopheap Hor",
  "Davy Sorn",
  "Borey Prak",
  "Sokchea San",
  "Monika Khim",
  "Ravy Chhay",
  "Sotheary Lim",
  "Veasna Tep",
  "Srey Roth",
  "Chenda Phok",
  "Mony Chan",
  "Sambath Eng",
  "Sokly Pen",
  "Nary Hun",
  "Ratha Ke",
  "Chivy Sen",
  "Sovichea Kry",
  "Srey Pov",
  "Bopha Sok",
  "Chamroeun Thy",
  "Sopanha Chum",
  "Leakena Ros",
];

const khmerNamePool = [
  "ឆន សុខា",
  "ភិច ដារ៉ា",
  "សុខ ស្រីមុំ",
  "នួន វិជា",
  "លឹម បុប្ផា",
  "គង់ ឫទ្ធិ",
  "អែម ចន្នារី",
  "ទេព សុវណ្ណ",
  "កែវ ម្លិះ",
  "ចាន់ នីតា",
  "ឡុង ពិសិដ្ឋ",
  "គីម សុភា",
  "មាស កញ្ញា",
  "រឿន ប៊ុនថន",
  "យិន ស្រីនាង",
  "ហេង វិសាល",
  "អ៊ុក សុធា",
  "ពៅ រចនា",
  "ជា ដាលីន",
  "លី សំណាង",
  "ទូច សុផល",
  "ញ៉ែម លក្ខិណា",
  "សៅ បញ្ញា",
  "វ៉ាន់ សុខុនធី",
  "ម៉ៅ កុសល",
  "ណូវ ស្រីកា",
  "ផាន វណ្ណៈ",
  "ម៉ុក ចន្ធា",
  "ហោ សុភាព",
  "សន ដាវី",
  "ប្រាក់ បូរី",
  "សាន សុខជា",
  "ឃឹម ម៉ូនីកា",
  "ឆាយ រ៉ាវី",
  "លឹម សុធារី",
  "ទេព វាសនា",
  "រ័ត្ន ស្រី",
  "ភោគ ចិន្តា",
  "ចាន់ មុនី",
  "អេង សម្បត្តិ",
  "ប៉ែន សុខលី",
  "ហ៊ុន ណារី",
  "កែ រដ្ឋា",
  "សែន ជីវី",
  "គ្រី សុវិជា",
  "ពៅ ស្រី",
  "សុខ បុប្ផា",
  "ធី ចំរើន",
  "ជុំ សុបញ្ញា",
  "រស់ លក្ខិណា",
];

const patients: Patient[] = patientNamePool.map((name, index) => {
  const seed = patientSeeds[index % patientSeeds.length];
  const visibleIndex = index + 1;
  const phonePrefix = ["070", "011", "092", "088", "016", "010", "069", "078", "015", "012"][index % 10];
  const phoneSuffix = String((495 + index * 37) % 900 + 100).padStart(3, "0");
  const abnormalLabs = index < 4;

  return {
    ...seed,
    name,
    khmerName: khmerNamePool[index],
    phone: index < patientSeeds.length ? seed.phone : `${phonePrefix} ••• ${phoneSuffix}`,
    age: index < patientSeeds.length ? seed.age : 6 + ((visibleIndex * 7) % 76),
    sex: index % 3 === 1 ? "male" : "female",
    sexTone: index % 3 === 1 ? "pink" : "brand",
    lastSeen: index < patientSeeds.length ? seed.lastSeen : `${1 + ((visibleIndex * 3) % 45)}d ago`,
    warning: seed.warning,
    conditionCodes: getConditionCodes(seed.lead, seed.more, seed.warning, index),
    acuity: getPatientAcuity(index),
    needsReview: index < 12,
    overdueFollowUp: index < 23,
    abnormalLabs,
  };
});

const recordProblemBadges: RecordBadgeData[] = [
  { label: "Type 2 diabetes" },
  { label: "CKD stage 3" },
  { label: "Hypertension" },
];

const recordRecentAbnormalBadges: RecordBadgeData[] = [
  { label: "HbA1c 9.4% ↑", tone: "danger" },
  { label: "LDL 162 ↑", tone: "danger" },
  { label: "BP 146/92 ↑", tone: "warning" },
  { label: "Microalbumin 34 ↑", tone: "warning" },
];

const recordMonitorBadges: RecordBadgeData[] = [
  { label: "Syphilis", tone: "warning" },
  { label: "H. pylori", tone: "warning" },
];

const recordReportedBadges: RecordBadgeData[] = [
  { label: "HIV", tone: "info", dashed: true, icon: "info" },
  { label: "Hepatitis B", tone: "info", dashed: true, icon: "info" },
];

const recordCompactReportedBadge: RecordBadgeData = {
  label: "2 self-reported · unverified",
  tone: "info",
  dashed: true,
  icon: "info",
};

const recordCompactMonitorBadge: RecordBadgeData = { label: "2 monitor", tone: "warning" };

const recordExpandedGroups: RecordClinicalGroup[] = [
  {
    label: "PROBLEMS",
    badges: [
      ...recordProblemBadges,
      { label: "Diabetic nephropathy", tone: "warning", dashed: true, icon: "info" },
    ],
  },
  { label: "MONITOR · IN REMISSION", badges: recordMonitorBadges },
  { label: "REPORTED · UNVERIFIED", badges: recordReportedBadges },
  { label: "RECENT ABNORMAL", badges: recordRecentAbnormalBadges },
  { label: "DUE", due: { lead: "HbA1c — overdue 3 mo", followUp: "Microalbumin follow-up" } },
];

const recordTabs = [
  { id: "summary", label: "Summary" },
  { id: "labs", label: "Labs" },
  { id: "orders", label: "Orders" },
  { id: "carePlan", label: "Care plan" },
  { id: "records", label: "Records" },
] satisfies Array<{ id: RecordTabId; label: string }>;

const summaryJumpItems = [
  { id: "summary-assessment", label: "Summary" },
  { id: "summary-visit-intent", label: "Visit intent" },
  { id: "summary-symptoms", label: "Symptoms" },
  { id: "summary-medical-history", label: "Medical history" },
  { id: "summary-medications", label: "Medications" },
  { id: "summary-lab-preview", label: "Lab history", alert: true },
];

const defaultSummaryJumpId = summaryJumpItems[0].id;

function scrollToSummarySection(sectionId: string, behavior: ScrollBehavior = "smooth") {
  const target = document.getElementById(sectionId);

  if (!target) {
    return false;
  }

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const resolvedBehavior = prefersReducedMotion ? "auto" : behavior;
  const summaryScroller = target.closest(".summary-main-column") as HTMLElement | null;

  if (summaryScroller) {
    const scrollerTop = summaryScroller.getBoundingClientRect().top;
    const targetTop = target.getBoundingClientRect().top - scrollerTop + summaryScroller.scrollTop - 8;

    summaryScroller.scrollTo({
      behavior: resolvedBehavior,
      top: Math.max(targetTop, 0),
    });

    return true;
  }

  const targetTop = target.getBoundingClientRect().top + window.scrollY - 24;

  window.scrollTo({
    behavior: resolvedBehavior,
    top: Math.max(targetTop, 0),
  });

  return true;
}

const summarySections: SummarySectionData[] = [
  {
    id: "summary-visit-intent",
    title: "Visit Intent",
    Icon: TeleConsultationIcon,
    badge: "Today",
    items: [
      {
        title: "Glycemic review and titration",
        meta: "Adjust therapy · latest HbA1c + renal status",
      },
      {
        title: "Reports blurred vision",
        meta: "Not yet demonstrated by platform",
        selfReported: true,
      },
    ],
  },
  {
    id: "summary-symptoms",
    title: "Symptoms",
    Icon: MedicalMaskIcon,
    items: [
      { title: "Peripheral edema", meta: "Bilateral · observed" },
      { title: "Polyuria", meta: "2 weeks · worsening", selfReported: true },
      { title: "Fatigue", meta: "Reported today", selfReported: true },
    ],
  },
];

const medicalHistoryGroups: MedicalHistoryGroup[] = [
  {
    label: "ACTIVE",
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
    label: "PAST / RESOLVED",
    entries: [
      { title: "Gestational diabetes", meta: "Resolved", date: "2018", muted: true },
      { title: "Syphilis", meta: "Treated · RPR non-reactive", date: "2023", muted: true },
      { title: "H. pylori", meta: "Eradicated", date: "2024", muted: true },
    ],
  },
  {
    label: "SURGICAL",
    entries: [
      { title: "Appendectomy", meta: "Confirmed by platform", date: "2010" },
      { title: "Cesarean section", meta: "Patient record", date: "2018", selfReported: true },
    ],
  },
];

/* Derived from the same model the Labs tab renders — single source of truth */
const summaryLabRows: LabPreviewEntry[] = getLabHistoryPreview();

const medicationItems: SummaryItem[] = [
  { title: "Metformin 1 g", meta: "Twice daily" },
  { title: "Lisinopril 10 mg", meta: "Once daily", selfReported: true },
  { title: "Insulin glargine", meta: "Stopped 2021", muted: true },
];

const riskFactors: SummaryKeyValue[] = [
  { label: "Smoking", value: "Former · quit 2020" },
  { label: "Alcohol", value: "Occasional" },
  { label: "BMI", value: "28.4 · overweight" },
];

const summaryRailSections: SummaryRailSection[] = [
  {
    title: "Allergies",
    rows: [{ title: "Penicillin", meta: "Rash, moderate", selfReported: true }],
  },
  {
    title: "Care Gaps",
    rows: [
      { title: "HbA1c — repeat now", meta: "Overdue 3 mo · last Mar" },
      { title: "Microalbumin follow-up", meta: "Recheck · due now" },
      { title: "Repeat HbA1c (fasting)", meta: "Scheduled Jun 12" },
    ],
  },
  {
    title: "Care Team",
    rows: [
      { title: "Dr. Sophea Lim", meta: "Endocrinology · primary" },
      { title: "Ratha Kim", meta: "Care coordinator" },
    ],
  },
  {
    title: "Documents",
    rows: [
      { title: "Lab report — HbA1c", meta: "PDF · 2 days ago" },
      { title: "ECG — 12-lead", meta: "PDF · 4 days ago" },
      { title: "Chest X-ray", meta: "DICOM · 1 week ago" },
    ],
  },
];

const bookingSearchRecords: SearchRecord[] = [
  {
    id: "booking-001",
    scope: "bookings",
    title: "Sokha Chann",
    subtitle: "Follow-up visit · Today 10:30",
    meta: "Dr. Pierre · Room 2",
    keywords: ["appointment", "follow up", "booking", "today", "diabetes"],
    page: "bookings",
    initials: "SC",
  },
  {
    id: "booking-002",
    scope: "bookings",
    title: "Dara Pich",
    subtitle: "Blood pressure review · Today 13:00",
    meta: "Hypertension clinic",
    keywords: ["appointment", "booking", "blood pressure", "hypertension"],
    page: "bookings",
    initials: "DP",
  },
  {
    id: "booking-003",
    scope: "bookings",
    title: "Bopha Lim",
    subtitle: "Pediatrics check · Tomorrow 09:15",
    meta: "Asthma follow-up",
    keywords: ["booking", "pediatrics", "asthma", "tomorrow"],
    page: "bookings",
    initials: "BL",
  },
  {
    id: "booking-004",
    scope: "bookings",
    title: "Sovann Tep",
    subtitle: "Cardiology consult · Fri 14:45",
    meta: "Heart failure · AFib",
    keywords: ["booking", "cardiology", "heart failure", "afib"],
    page: "bookings",
    initials: "ST",
  },
];

const labSearchRecords: SearchRecord[] = [
  {
    id: "lab-001",
    scope: "labs",
    title: "HbA1c panel",
    subtitle: "Sokha Chann · Ordered today",
    meta: "Pending collection",
    keywords: ["lab", "order", "hba1c", "diabetes", "sokha"],
    initials: "A1",
  },
  {
    id: "lab-002",
    scope: "labs",
    title: "Renal function",
    subtitle: "Sovann Tep · Due tomorrow",
    meta: "CKD stage 3",
    keywords: ["lab", "order", "renal", "kidney", "ckd"],
    initials: "RF",
  },
  {
    id: "lab-003",
    scope: "labs",
    title: "Lipid profile",
    subtitle: "Dara Pich · Overdue",
    meta: "Hyperlipidemia",
    keywords: ["lab", "lipid", "cholesterol", "overdue"],
    initials: "LP",
  },
  {
    id: "lab-004",
    scope: "labs",
    title: "CBC",
    subtitle: "Sreymom Sok · Completed",
    meta: "Pregnancy review",
    keywords: ["lab", "cbc", "pregnancy"],
    initials: "CB",
  },
];

const invoiceSearchRecords: SearchRecord[] = [
  {
    id: "invoice-001",
    scope: "invoices",
    title: "Invoice INV-2048",
    subtitle: "Sokha Chann · $42.00",
    meta: "Unpaid · 12 May 2026",
    keywords: ["invoice", "unpaid", "payment", "sokha", "2048"],
    initials: "$",
  },
  {
    id: "invoice-002",
    scope: "invoices",
    title: "Invoice INV-2049",
    subtitle: "Dara Pich · $28.00",
    meta: "Paid · 9 May 2026",
    keywords: ["invoice", "paid", "payment", "dara", "2049"],
    initials: "$",
  },
  {
    id: "invoice-003",
    scope: "invoices",
    title: "Invoice INV-2051",
    subtitle: "Sovann Tep · $65.00",
    meta: "Needs review",
    keywords: ["invoice", "review", "payment", "sovann", "2051"],
    initials: "$",
  },
];

const staffSearchRecords: SearchRecord[] = [
  {
    id: "staff-001",
    scope: "staff",
    title: "Dr. Pierre",
    subtitle: "Family medicine",
    meta: "Available today",
    keywords: ["doctor", "provider", "physician", "pierre"],
    initials: "DP",
  },
  {
    id: "staff-002",
    scope: "staff",
    title: "Nurse Lina",
    subtitle: "Triage nurse",
    meta: "On shift",
    keywords: ["nurse", "triage", "staff", "lina"],
    initials: "NL",
  },
  {
    id: "staff-003",
    scope: "staff",
    title: "Sokun Admin",
    subtitle: "Front desk",
    meta: "Bookings and invoices",
    keywords: ["staff", "admin", "front desk", "booking", "invoice"],
    initials: "SA",
  },
];

function getPatientMrn(index: number) {
  return `MRN-${String(1001 + index).padStart(4, "0")}`;
}

function getPatientSearchRecords(): SearchRecord[] {
  return patients.map((patient, index) => ({
    id: `patient-${index + 1}`,
    scope: "patients",
    title: patient.name,
    subtitle: `${patient.khmerName} · ${patient.phone} · ${getPatientMrn(index)}`,
    meta: `${patient.age}${patient.sex === "female" ? "F" : "M"} · ${patient.lastSeen} · ${patient.lead}`,
    keywords: [
      patient.khmerName,
      patient.phone,
      getPatientMrn(index),
      patient.lead,
      patient.more,
      patient.needsReview ? "needs review" : "",
      patient.overdueFollowUp ? "overdue follow-up" : "",
      patient.abnormalLabs ? "abnormal labs" : "",
    ],
    page: "patients",
    initials: patient.name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2),
  }));
}

function getGlobalSearchRecords() {
  return [
    ...getPatientSearchRecords(),
    ...bookingSearchRecords,
    ...labSearchRecords,
    ...invoiceSearchRecords,
    ...staffSearchRecords,
  ];
}

function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function getSearchTokens(query: string) {
  return normalizeSearchText(query).split(" ").filter(Boolean);
}

function getSearchScopeLabel(scope: SearchScopeId) {
  return globalSearchScopes.find((item) => item.id === scope)?.label ?? "All";
}

function scoreSearchRecord(record: SearchRecord, tokens: string[], activeScope: SearchScopeId | null) {
  if (activeScope && record.scope !== activeScope) return 0;
  if (tokens.length === 0) return activeScope ? 1 : 0;

  const title = normalizeSearchText(record.title);
  const subtitle = normalizeSearchText(record.subtitle);
  const meta = normalizeSearchText(record.meta);
  const keywords = normalizeSearchText(record.keywords.join(" "));
  const haystack = `${title} ${subtitle} ${meta} ${keywords}`;

  if (!tokens.every((token) => haystack.includes(token))) return 0;

  return tokens.reduce((score, token) => {
    if (title.startsWith(token)) return score + 80;
    if (title.includes(token)) return score + 60;
    if (subtitle.includes(token)) return score + 40;
    if (meta.includes(token)) return score + 28;
    if (keywords.includes(token)) return score + 18;
    return score;
  }, record.scope === "patients" ? 6 : 0);
}

function getGlobalSearchResults(records: SearchRecord[], query: string, activeScope: SearchScopeId | null) {
  const tokens = getSearchTokens(query);

  return records
    .map((record, index) => ({
      record,
      index,
      score: scoreSearchRecord(record, tokens, activeScope),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, 8)
    .map((item) => item.record);
}

function countPatients(match: (patient: Patient) => boolean) {
  return patients.filter(match).length;
}

function matchesQuickFilter(patient: Patient, quickFilter: QuickFilterId) {
  if (quickFilter === "needsReview") return patient.needsReview;
  if (quickFilter === "overdueFollowUp") return patient.overdueFollowUp;
  if (quickFilter === "abnormalLabs") return patient.abnormalLabs;
  return true;
}

function matchesPanelFilters(patient: Patient, filterState: FilterState) {
  const matches = [
    ...filterState.conditions.map((condition) => patient.conditionCodes.includes(condition)),
    ...filterState.acuities.map((acuity) => patient.acuity === acuity),
  ];

  if (matches.length === 0) return true;
  return filterState.matchMode === "all" ? matches.every(Boolean) : matches.some(Boolean);
}

function getFilteredPatients(filterState: FilterState) {
  return patients.filter(
    (patient) => matchesQuickFilter(patient, filterState.quickFilter) && matchesPanelFilters(patient, filterState),
  );
}

function FigmaIcon({
  src,
  size = 16,
  className = "",
}: {
  src: string;
  size?: number;
  className?: string;
}) {
  return (
    <span className={`figma-icon ${className}`} style={{ "--icon-size": `${size}px` } as CSSProperties}>
      <Image src={src} alt="" width={size} height={size} aria-hidden />
    </span>
  );
}

function NavIcon({
  Icon,
  active = false,
  activeVariant = "bulk",
  className = "",
  restVariant = "stroke",
  size = 24,
}: {
  Icon: NavIconComponent;
  active?: boolean;
  activeVariant?: IconStyle;
  className?: string;
  restVariant?: IconStyle;
  size?: number;
}) {
  return (
    <span aria-hidden className={`nav-icon ${className}`}>
      <Icon size={size} variant={active ? activeVariant : restVariant} />
    </span>
  );
}

function Logo() {
  return (
    <div className="kura-logo" aria-label="Kura">
      <Image className="logo-mark" src="/figma/logo-mark.svg" alt="" width={20.157} height={16.81} priority />
      <Image className="logo-type" src="/figma/logo-type.svg" alt="" width={30.831} height={11.684} priority />
    </div>
  );
}

function Sidebar({
  activePage,
  onPageChange,
  onOpenSearch,
}: {
  activePage: PageId;
  onPageChange: (page: PageId) => void;
  onOpenSearch: () => void;
}) {
  return (
    <aside className="app-sidebar" aria-label="Primary navigation">
      <Logo />
      <nav className="sidebar-list">
        {navItems.map((item) => (
          <NavItemButton
            active={activePage === item.id}
            item={item}
            key={item.id}
            onOpenSearch={onOpenSearch}
            onPageChange={onPageChange}
          />
        ))}
      </nav>
      <div className="sidebar-spacer" />
      <div className="sidebar-bottom">
        <NavItemButton
          active={activePage === settingsItem.id}
          item={settingsItem}
          onOpenSearch={onOpenSearch}
          onPageChange={onPageChange}
        />
        <div className="avatar">PT</div>
      </div>
    </aside>
  );
}

function NavItemButton({
  active,
  item,
  onOpenSearch,
  onPageChange,
}: {
  active: boolean;
  item: NavItem;
  onOpenSearch: () => void;
  onPageChange: (page: PageId) => void;
}) {
  return (
    <button
      aria-current={active ? "page" : undefined}
      aria-disabled={item.disabled ? true : undefined}
      className={`rail-item${active ? " active" : ""}`}
      data-page={item.id}
      disabled={item.disabled}
      onClick={() => {
        if (item.id === "search") {
          onOpenSearch();
          return;
        }

        if (isSelectablePage(item.id)) {
          onPageChange(item.id);
        }
      }}
      type="button"
    >
      <NavIcon
        Icon={item.Icon}
        active={active}
        activeVariant={item.activeVariant}
        restVariant={item.restVariant}
      />
      <span>{item.label}</span>
    </button>
  );
}

function NewPatientButton() {
  return (
    <Button icon={<PlusIcon size={14} variant="stroke" />}>New patient</Button>
  );
}

function SearchInput({ onOpenSearch }: { onOpenSearch: () => void }) {
  return (
    <button className="search-input" onClick={onOpenSearch} type="button">
      <FigmaIcon src="/figma/icon-search.svg" size={24} />
      <span>Search Name, Khmer Name, MRN, Phone...</span>
    </button>
  );
}

function FilterButton({
  count,
  expanded,
  onClick,
}: {
  count: number;
  expanded: boolean;
  onClick: () => void;
}) {
  return <FilterPrimitives.Trigger count={count} expanded={expanded} onClick={onClick} state={count > 0 ? "active" : "rest"} />;
}

function SegmentedToggle({
  matchMode,
  onMatchModeChange,
}: {
  matchMode: MatchMode;
  onMatchModeChange: (matchMode: MatchMode) => void;
}) {
  return (
    <div className="segmented-toggle" aria-label="Filter match mode">
      <button
        aria-pressed={matchMode === "any"}
        className={`segment${matchMode === "any" ? " selected" : ""}`}
        onClick={() => onMatchModeChange("any")}
        type="button"
      >
        Match any
      </button>
      <button
        aria-pressed={matchMode === "all"}
        className={`segment${matchMode === "all" ? " selected" : ""}`}
        onClick={() => onMatchModeChange("all")}
        type="button"
      >
        Match all
      </button>
    </div>
  );
}

function FilterFooter({
  filteredCount,
  matchMode,
  onMatchModeChange,
  onShow,
}: {
  filteredCount: number;
  matchMode: MatchMode;
  onMatchModeChange: (matchMode: MatchMode) => void;
  onShow: () => void;
}) {
  return (
    <div className="filter-footer">
      <div className="filter-divider" />
      <div className="filter-footer-row">
        <SegmentedToggle matchMode={matchMode} onMatchModeChange={onMatchModeChange} />
        <FilterPrimitives.Action onClick={onShow}>
          Show {filteredCount} patients
        </FilterPrimitives.Action>
      </div>
    </div>
  );
}

function FilterPanel({
  view,
  filterState,
  conditionCounts,
  acuityCounts,
  filteredCount,
  onViewChange,
  onClose,
  onMatchModeChange,
  onResetPanelFilters,
  onToggleAcuity,
  onToggleCondition,
}: {
  view: FilterView;
  filterState: FilterState;
  conditionCounts: Record<ConditionFilterId, number>;
  acuityCounts: Record<AcuityFilterId, number>;
  filteredCount: number;
  onViewChange: (view: FilterView) => void;
  onClose: () => void;
  onMatchModeChange: (matchMode: MatchMode) => void;
  onResetPanelFilters: () => void;
  onToggleAcuity: (acuity: AcuityFilterId) => void;
  onToggleCondition: (condition: ConditionFilterId) => void;
}) {
  if (view === "systems") {
    return (
      <div className="filter-panel filter-panel-flat" role="dialog" aria-label="Filter by system">
        <div className="filter-drill-header">
          <button className="filter-back-button" type="button" onClick={() => onViewChange("main")}>
            <FilterPrimitives.Icon src="/figma/icon-chevron-left.svg" />
          </button>
          <h3>By system</h3>
        </div>
        <div className="filter-search-field">
          <FilterPrimitives.Icon src="/figma/icon-search.svg" />
          <span>Search body systems</span>
        </div>
        <div className="category-list">
          {bodySystems.map((system) => (
            <FilterPrimitives.CategoryRow
              key={system}
              label={system}
              onClick={system === "Cardiovascular" ? () => onViewChange("category") : undefined}
            />
          ))}
        </div>
      </div>
    );
  }

  if (view === "category") {
    return (
      <div className="filter-panel filter-panel-flat" role="dialog" aria-label="Cardiovascular filters">
        <div className="filter-drill-header">
          <button className="filter-back-button" type="button" onClick={() => onViewChange("systems")}>
            <FilterPrimitives.Icon src="/figma/icon-chevron-left.svg" />
          </button>
          <h3>Cardiovascular</h3>
        </div>
        <div className="filter-search-field">
          <FilterPrimitives.Icon src="/figma/icon-search.svg" />
          <span>Search conditions</span>
        </div>
        <div className="filter-option-list">
          {cardiovascularConditions.map((condition) => (
            <FilterPrimitives.Option
              key={condition.id}
              label={condition.label}
              count={conditionCounts[condition.id]}
              selected={filterState.conditions.includes(condition.id)}
              onClick={() => onToggleCondition(condition.id)}
            />
          ))}
        </div>
        <FilterFooter
          filteredCount={filteredCount}
          matchMode={filterState.matchMode}
          onMatchModeChange={onMatchModeChange}
          onShow={onClose}
        />
      </div>
    );
  }

  return (
    <div className="filter-panel filter-panel-main" role="dialog" aria-label="Filters">
      <div className="filter-panel-header">
        <h3>Filters</h3>
        <button type="button" onClick={onResetPanelFilters}>Reset</button>
      </div>
      <div className="filter-search-field">
        <FilterPrimitives.Icon src="/figma/icon-search.svg" />
        <span>Search 80+ conditions or ICD-10...</span>
      </div>
      <section className="filter-section" aria-labelledby="condition-filter-title">
        <h4 id="condition-filter-title">CONDITION</h4>
        <div className="filter-option-list">
          {conditionFilters.map((option) => (
            <FilterPrimitives.Option
              key={option.id}
              label={option.label}
              count={conditionCounts[option.id]}
              selected={filterState.conditions.includes(option.id)}
              onClick={() => onToggleCondition(option.id)}
            />
          ))}
          <button className="browse-systems-row" type="button" onClick={() => onViewChange("systems")}>
            <span>Browse all by system</span>
            <FilterPrimitives.Icon src="/figma/icon-chevron-right.svg" />
          </button>
        </div>
      </section>
      <section className="filter-section" aria-labelledby="acuity-filter-title">
        <h4 id="acuity-filter-title">ACUITY</h4>
        <div className="filter-option-list">
          {acuityFilters.map((option) => (
            <FilterPrimitives.Option
              key={option.id}
              label={option.label}
              count={acuityCounts[option.id]}
              selected={filterState.acuities.includes(option.id)}
              onClick={() => onToggleAcuity(option.id)}
            />
          ))}
        </div>
      </section>
      <FilterFooter
        filteredCount={filteredCount}
        matchMode={filterState.matchMode}
        onMatchModeChange={onMatchModeChange}
        onShow={onClose}
      />
    </div>
  );
}

function FilterControl({
  filterState,
  conditionCounts,
  acuityCounts,
  filteredCount,
  selectedFilterCount,
  onMatchModeChange,
  onResetPanelFilters,
  onToggleAcuity,
  onToggleCondition,
}: {
  filterState: FilterState;
  conditionCounts: Record<ConditionFilterId, number>;
  acuityCounts: Record<AcuityFilterId, number>;
  filteredCount: number;
  selectedFilterCount: number;
  onMatchModeChange: (matchMode: MatchMode) => void;
  onResetPanelFilters: () => void;
  onToggleAcuity: (acuity: AcuityFilterId) => void;
  onToggleCondition: (condition: ConditionFilterId) => void;
}) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<FilterView>("main");

  return (
    <div className="filter-control">
      {open && (
        <div
          aria-hidden="true"
          className="filter-backdrop"
          onClick={() => setOpen(false)}
          role="presentation"
        />
      )}
      <FilterButton
        count={selectedFilterCount}
        expanded={open}
        onClick={() => {
          setOpen((current) => !current);
          setView("main");
        }}
      />
      {open && (
        <FilterPanel
          acuityCounts={acuityCounts}
          conditionCounts={conditionCounts}
          filterState={filterState}
          filteredCount={filteredCount}
          view={view}
          onClose={() => setOpen(false)}
          onMatchModeChange={onMatchModeChange}
          onResetPanelFilters={onResetPanelFilters}
          onToggleAcuity={onToggleAcuity}
          onToggleCondition={onToggleCondition}
          onViewChange={setView}
        />
      )}
    </div>
  );
}

function StatusChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      aria-pressed={active}
      className={`status-chip${active ? " active" : ""}`}
      onClick={onClick}
      type="button"
    >
      <span>{label}</span>
      <span className="chip-count">{count}</span>
    </button>
  );
}

function ConditionBadge({ label }: { label: string }) {
  return (
    <span className="condition-badge">
      <FigmaIcon src="/figma/icon-condition.svg" />
      <span>{label}</span>
    </span>
  );
}

function WarningBadge({ label }: { label: string }) {
  return (
    <span className="warning-badge">
      <FigmaIcon src="/figma/icon-warning.svg" />
      <span>{label}</span>
    </span>
  );
}

function PatientRow({ patient, onOpenPatient }: { patient: Patient; onOpenPatient: (patient: Patient) => void }) {
  return (
    <button
      aria-label={`Open ${patient.name} record`}
      className="table-row patient-table-row"
      onClick={() => onOpenPatient(patient)}
      type="button"
    >
      <div className="table-cell patient-cell">
        <Avatar name={patient.name} size="md" />
        <div className="patient-name">
          <strong>{patient.name}</strong>
          <span>{patient.khmerName}</span>
        </div>
      </div>
      <div className="table-cell phone-cell">{patient.phone}</div>
      <div className="table-cell age-cell">
        <span>{patient.age}</span>
        <span className={`sex-symbol ${patient.sexTone}`}>{patient.sex === "female" ? "♀" : "♂"}</span>
      </div>
      <div className="table-cell last-seen-cell">{patient.lastSeen}</div>
      <div className="table-cell status-cell">
        <ConditionBadge label={patient.lead} />
        {patient.more ? <span className="condition-more">{patient.more}</span> : null}
        <WarningBadge label={patient.warning} />
      </div>
    </button>
  );
}

function PatientTable({
  currentPage,
  rows,
  onOpenPatient,
  onPageChange,
}: {
  currentPage: number;
  rows: Patient[];
  onOpenPatient: (patient: Patient) => void;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(rows.length / PATIENT_PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStart = (safeCurrentPage - 1) * PATIENT_PAGE_SIZE;
  const pagePatients = rows.slice(pageStart, pageStart + PATIENT_PAGE_SIZE);

  return (
    <div className="patient-list">
      <section className="patient-table" aria-label="Patient list">
        <div className="table-row table-head">
          <div className="table-cell">Patient</div>
          <div className="table-cell">Phone</div>
          <div className="table-cell">Age · Sex</div>
          <div className="table-cell">Last seen <span className="sort-arrow">▲</span></div>
          <div className="table-cell">Status</div>
        </div>
        {pagePatients.length > 0 ? (
          pagePatients.map((patient) => (
            <PatientRow key={patient.name} patient={patient} onOpenPatient={onOpenPatient} />
          ))
        ) : (
          <div className="table-empty">No patients match these filters</div>
        )}
      </section>
      <Pagination
        currentPage={safeCurrentPage}
        pageSize={PATIENT_PAGE_SIZE}
        totalItems={rows.length}
        onPageChange={onPageChange}
      />
    </div>
  );
}

function PatientPage({
  onOpenPatient,
  onOpenSearch,
}: {
  onOpenPatient: (patient: Patient) => void;
  onOpenSearch: () => void;
}) {
  const [filterState, setFilterState] = useState<FilterState>(defaultFilterState);
  const [currentPage, setCurrentPage] = useState(1);
  const filteredPatients = getFilteredPatients(filterState);
  const selectedFilterCount = filterState.conditions.length + filterState.acuities.length;
  const quickFilterCounts: Record<QuickFilterId, number> = {
    all: patients.length,
    needsReview: countPatients((patient) => patient.needsReview),
    overdueFollowUp: countPatients((patient) => patient.overdueFollowUp),
    abnormalLabs: countPatients((patient) => patient.abnormalLabs),
  };
  const conditionCounts = conditionFilters.reduce(
    (counts, filter) => ({
      ...counts,
      [filter.id]: countPatients((patient) => patient.conditionCodes.includes(filter.id)),
    }),
    cardiovascularConditions.reduce(
      (counts, filter) => ({
        ...counts,
        [filter.id]: countPatients((patient) => patient.conditionCodes.includes(filter.id)),
      }),
      {} as Record<ConditionFilterId, number>,
    ),
  );
  const acuityCounts = acuityFilters.reduce(
    (counts, filter) => ({
      ...counts,
      [filter.id]: countPatients((patient) => patient.acuity === filter.id),
    }),
    {} as Record<AcuityFilterId, number>,
  );
  const updateFilterState = (updater: (current: FilterState) => FilterState) => {
    setFilterState(updater);
    setCurrentPage(1);
  };
  const toggleCondition = (condition: ConditionFilterId) => {
    updateFilterState((current) => ({
      ...current,
      conditions: current.conditions.includes(condition)
        ? current.conditions.filter((item) => item !== condition)
        : [...current.conditions, condition],
    }));
  };
  const toggleAcuity = (acuity: AcuityFilterId) => {
    updateFilterState((current) => ({
      ...current,
      acuities: current.acuities.includes(acuity)
        ? current.acuities.filter((item) => item !== acuity)
        : [...current.acuities, acuity],
    }));
  };

  return (
    <>
      <div className="greeting">
        <p>Saturday, 9 May 2026</p>
        <h2>Good morning, Dr. Pierre</h2>
      </div>
      <div className="patient-workspace">
        <SearchInput onOpenSearch={onOpenSearch} />
        <div className="toolbar">
          <FilterControl
            acuityCounts={acuityCounts}
            conditionCounts={conditionCounts}
            filterState={filterState}
            filteredCount={filteredPatients.length}
            selectedFilterCount={selectedFilterCount}
            onMatchModeChange={(matchMode) => updateFilterState((current) => ({ ...current, matchMode }))}
            onResetPanelFilters={() =>
              updateFilterState((current) => ({
                ...current,
                acuities: [],
                conditions: [],
                matchMode: "any",
              }))
            }
            onToggleAcuity={toggleAcuity}
            onToggleCondition={toggleCondition}
          />
          <div className="quick-filters">
            {quickFilters.map((filter) => (
              <StatusChip
                key={filter.id}
                active={filterState.quickFilter === filter.id}
                count={quickFilterCounts[filter.id]}
                label={filter.label}
                onClick={() => updateFilterState((current) => ({ ...current, quickFilter: filter.id }))}
              />
            ))}
          </div>
        </div>
        <PatientTable
          currentPage={currentPage}
          rows={filteredPatients}
          onOpenPatient={onOpenPatient}
          onPageChange={setCurrentPage}
        />
      </div>
    </>
  );
}

function DetailIconButton({
  Icon,
  label,
}: {
  Icon: NavIconComponent;
  label: string;
}) {
  return (
    <button className="detail-icon-button" type="button" aria-label={label}>
      <Icon size={16} variant="stroke" />
    </button>
  );
}

function DetailHeader({ onBackToPatients }: { onBackToPatients: () => void }) {
  return (
    <header className="detail-header">
      <nav className="detail-breadcrumb" aria-label="Breadcrumb">
        <button aria-label="Back to patient table" type="button" onClick={onBackToPatients}>
          Patients
        </button>
        <ChevronRightIcon size={14} variant="stroke" />
        <strong>Sokha Chan</strong>
      </nav>
      <div className="detail-header-actions">
        <DetailIconButton Icon={NoteIcon} label="Add note" />
        <DetailIconButton Icon={CalendarIcon} label="Schedule" />
        <DetailIconButton Icon={MoreIcon} label="More actions" />
      </div>
    </header>
  );
}

function RecordBadge({ badge }: { badge: RecordBadgeData }) {
  const tone = badge.tone ?? "neutral";

  return (
    <span className={`record-badge record-badge-${tone}${badge.dashed ? " dashed" : ""}`}>
      {badge.icon === "info" && (
        <span className="record-badge-icon record-badge-icon-info">
          <InfoIcon size={10} variant="bulk" />
        </span>
      )}
      {badge.icon === "clock" && (
        <span className="record-badge-icon">
          <ClockIcon size={14} variant="twotone" />
        </span>
      )}
      <span>{badge.label}</span>
    </span>
  );
}

function RecordMetaLine({ clinicalContext }: { clinicalContext: RecordClinicalContext }) {
  return (
    <p>
      <strong>32 y</strong>
      <span> · </span>
      <strong>Female</strong>
      <span> · DOB </span>
      <strong>12 Sep 1994</strong>
      <span> · MRN </span>
      <strong>P-9134</strong>
      <span> · Tel </span>
      <strong>070 ··· 496</strong>
      <span> · Insurance </span>
      <strong>Forte (active)</strong>
      {clinicalContext === "none" && (
        <>
          <span> · </span>
          <strong>T2DM</strong>
          <span> · </span>
          <strong>CKD 3</strong>
        </>
      )}
    </p>
  );
}

function RecordViewToggle({
  expanded,
  onClick,
}: {
  expanded: boolean;
  onClick: () => void;
}) {
  return (
    <button className="record-view-more" onClick={onClick} type="button">
      <span>{expanded ? "View Less" : "View more"}</span>
      <span className={`record-view-icon${expanded ? " expanded" : ""}`}>
        <ChevronRightIcon size={16} variant="stroke" />
      </span>
    </button>
  );
}

function RecordClinicalCompact({ onExpand }: { onExpand: () => void }) {
  return (
    <div className="record-clinical-strip compact">
      <div className="record-chip-row">
        {recordProblemBadges.map((badge) => (
          <RecordBadge badge={badge} key={badge.label} />
        ))}
        <span className="record-chip-separator">·</span>
        {recordRecentAbnormalBadges.map((badge) => (
          <RecordBadge badge={badge} key={badge.label} />
        ))}
        <RecordBadge badge={recordCompactReportedBadge} />
        <RecordBadge badge={recordCompactMonitorBadge} />
      </div>
      <RecordViewToggle expanded={false} onClick={onExpand} />
    </div>
  );
}

function RecordClinicalGroupRow({ group }: { group: RecordClinicalGroup }) {
  return (
    <div className="record-clinical-group">
      <p className="record-clinical-label">{group.label}</p>
      {group.badges && (
        <div className="record-clinical-badges">
          {group.badges.map((badge) => (
            <RecordBadge badge={badge} key={badge.label} />
          ))}
        </div>
      )}
      {group.due && (
        <div className="record-due-row">
          <ClockIcon size={14} variant="twotone" />
          <strong>{group.due.lead}</strong>
          <span>· {group.due.followUp}</span>
        </div>
      )}
    </div>
  );
}

function RecordClinicalExpanded({ onCollapse }: { onCollapse: () => void }) {
  return (
    <div className="record-clinical-strip expanded">
      <div className="record-expanded-context">
        <div className="record-expanded-groups">
          {recordExpandedGroups.map((group) => (
            <RecordClinicalGroupRow group={group} key={group.label} />
          ))}
        </div>
        <RecordViewToggle expanded onClick={onCollapse} />
      </div>
    </div>
  );
}

function RecordTabs({
  activeTab,
  onTabChange,
}: {
  activeTab: RecordTabId;
  onTabChange: (tab: RecordTabId) => void;
}) {
  return (
    <div className="record-tabs">
      <div className="record-tabs-track" role="tablist" aria-label="Record sections">
        {recordTabs.map((tab) => {
          const active = activeTab === tab.id;

          return (
            <button
              aria-controls={`record-panel-${tab.id}`}
              aria-selected={active}
              className={`record-tab${active ? " active" : ""}`}
              id={`record-tab-${tab.id}`}
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              role="tab"
              type="button"
            >
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function RecordHeader({
  activeTab,
  clinicalContext = "compact",
  onTabChange,
}: {
  activeTab: RecordTabId;
  clinicalContext?: RecordClinicalContext;
  onTabChange: (tab: RecordTabId) => void;
}) {
  const [currentContext, setCurrentContext] = useState<RecordClinicalContext>(clinicalContext);

  return (
    <section className="record-header" aria-label="Patient record header">
      <div className="record-identity-row">
        <div className="record-avatar">SC</div>
        <div className="record-identity">
          <h1>Sokha Chan</h1>
          <RecordMetaLine clinicalContext={currentContext} />
        </div>
        <Button className="quick-order-button" icon={<PlusIcon size={14} variant="stroke" />}>
          Quick Order
        </Button>
      </div>
      {currentContext === "compact" && <RecordClinicalCompact onExpand={() => setCurrentContext("expanded")} />}
      {currentContext === "expanded" && <RecordClinicalExpanded onCollapse={() => setCurrentContext("compact")} />}
      <RecordTabs activeTab={activeTab} onTabChange={onTabChange} />
    </section>
  );
}

function SummarySourceLabel() {
  return (
    <span className="summary-source-label">
      <span aria-hidden />
      <span>self-reported</span>
    </span>
  );
}

function SummaryItemRow({ item }: { item: SummaryItem }) {
  return (
    <div className={`summary-item-row${item.muted ? " muted" : ""}`}>
      <span className="summary-row-marker">–</span>
      <div className="summary-item-copy">
        <strong>{item.title}</strong>
        <p>
          <span>{item.meta}</span>
          {item.selfReported && <SummarySourceLabel />}
        </p>
      </div>
    </div>
  );
}

function SummarySection({ section }: { section: SummarySectionData }) {
  const Icon = section.Icon;

  return (
    <section className="summary-section" id={section.id} aria-labelledby={`${section.id}-title`}>
      <div className="summary-section-heading">
        <Icon size={20} variant="stroke" />
        <h3 id={`${section.id}-title`}>{section.title}</h3>
        {section.badge && <RecordBadge badge={{ label: section.badge, tone: "info" }} />}
      </div>
      <div className="summary-section-list">
        {section.items.map((item) => (
          <SummaryItemRow item={item} key={item.title} />
        ))}
      </div>
    </section>
  );
}

function SummarySectionGrid() {
  return (
    <div className="summary-section-grid">
      {summarySections.map((section) => (
        <SummarySection key={section.id} section={section} />
      ))}
    </div>
  );
}

function MedicalHistoryTimeline() {
  return (
    <section className="summary-section" id="summary-medical-history" aria-labelledby="summary-medical-history-title">
      <div className="summary-section-heading">
        <NoteIcon size={20} variant="stroke" />
        <h3 id="summary-medical-history-title">Medical History</h3>
      </div>
      <div className="summary-timeline">
        {medicalHistoryGroups.map((group) => (
          <div className="summary-timeline-group" key={group.label}>
            <p className="summary-timeline-label">{group.label}</p>
            {group.entries.map((entry, index) => (
              <div className={`summary-timeline-entry${entry.muted ? " muted" : ""}`} key={`${group.label}-${entry.title}`}>
                <span className="summary-timeline-rail" aria-hidden>
                  <span />
                  {index < group.entries.length - 1 && <i />}
                </span>
                <div className="summary-timeline-copy">
                  <strong>{entry.title}</strong>
                  <p>
                    <span>{entry.meta}</span>
                    {entry.selfReported && <SummarySourceLabel />}
                  </p>
                </div>
                <span className="summary-timeline-date">{entry.date}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

function SummaryLabTrend({ values, color }: { values: number[]; color: string }) {
  const W = 70;
  const H = 28;
  const padX = 6;
  const padY = 7;
  if (!values.length) return <span className="summary-lab-trend" aria-hidden />;
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = hi - lo || 1;
  const points = values.map((v, i) => [
    padX + (values.length === 1 ? (W - 2 * padX) / 2 : (i * (W - 2 * padX)) / (values.length - 1)),
    padY + (H - 2 * padY) * (1 - (v - lo) / span),
  ]);

  return (
    <span className="summary-lab-trend" style={{ color }} aria-hidden>
      <svg focusable="false" viewBox={`0 0 ${W} ${H}`}>
        {points.slice(1).map(([x, y], index) => {
          const [startX, startY] = points[index];

          return <line key={`${x}-${y}`} x1={startX} x2={x} y1={startY} y2={y} />;
        })}
        {points.map(([x, y], index) => (
          <g key={`${x}-${y}`}>
            <circle className="summary-lab-dot-shell" cx={x} cy={y} r={index === points.length - 1 ? 5.5 : 4.5} />
            <circle className="summary-lab-dot-core" cx={x} cy={y} r="2.7" />
          </g>
        ))}
      </svg>
    </span>
  );
}

function SummaryStatusPill({ status }: { status: SummaryLabStatus }) {
  const label =
    status === "critical" ? "Critical" : status === "watch" ? "Watch" : status === "abnormal" ? "Abnormal" : "In range";
  return <span className={`summary-status-pill ${status}`}>{label}</span>;
}

function LabHistoryPreview({ onOpenLabs, onOpenLabsAt }: { onOpenLabs: () => void; onOpenLabsAt: (labKey: string) => void }) {
  return (
    <section className="summary-section summary-lab-preview" id="summary-lab-preview" aria-labelledby="summary-lab-preview-title">
      <div className="summary-section-heading summary-lab-preview-heading">
        <div>
          <FlaskIcon size={20} variant="stroke" />
          <h3 id="summary-lab-preview-title">Lab History Preview</h3>
        </div>
        <button className="summary-inline-link" onClick={onOpenLabs} type="button">
          <span>View full Labs</span>
          <ArrowRightIcon size={14} variant="stroke" />
        </button>
      </div>
      <div className="summary-lab-table" role="table" aria-label="Lab history preview">
        <div className="summary-lab-header" role="row">
          <span role="columnheader">TEST GROUP</span>
          <span role="columnheader">LATEST</span>
          <span role="columnheader">TREND</span>
          <span role="columnheader">STATUS</span>
          <span role="columnheader">LAST RESULT</span>
          <span aria-hidden />
        </div>
        {summaryLabRows.map((row) => (
          <button className="summary-lab-row" key={row.group} onClick={() => onOpenLabsAt(row.key)} role="row" type="button">
            <span className="summary-lab-group" role="cell">
              <strong>{row.group}</strong>
              {row.groupMeta && <small>{row.groupMeta}</small>}
            </span>
            <span className="summary-lab-latest" role="cell">
              <strong>{row.latest}</strong>
              <small>{row.reference}</small>
            </span>
            <span role="cell">
              <SummaryLabTrend values={row.points} color={row.color} />
            </span>
            <span role="cell">
              <SummaryStatusPill status={row.status} />
            </span>
            <span className="summary-lab-last" role="cell">{row.lastResult}</span>
            <span className="summary-lab-chevron" role="cell">›</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function MedicationsSection() {
  return (
    <section className="summary-section" id="summary-medications" aria-labelledby="summary-medications-title">
      <div className="summary-section-heading">
        <PillIcon size={20} variant="stroke" />
        <h3 id="summary-medications-title">Medications</h3>
      </div>
      <div className="summary-section-list">
        {medicationItems.map((item) => (
          <SummaryItemRow item={item} key={item.title} />
        ))}
      </div>
    </section>
  );
}

function MedicalMedicationGrid() {
  return (
    <div className="summary-section-grid summary-clinical-grid">
      <MedicalHistoryTimeline />
      <MedicationsSection />
    </div>
  );
}

function SummaryJumpNav({
  activeSectionId,
  onActiveSectionChange,
}: {
  activeSectionId: string;
  onActiveSectionChange: (sectionId: string) => void;
}) {
  const handleJumpClick = (event: ReactMouseEvent<HTMLAnchorElement>, sectionId: string) => {
    const didScroll = scrollToSummarySection(sectionId);

    if (didScroll) {
      event.preventDefault();
      onActiveSectionChange(sectionId);
      window.history.pushState(null, "", `#${sectionId}`);
    }
  };

  return (
    <aside className="summary-jump-nav" aria-label="Jump to summary section">
      <p>JUMP TO</p>
      <nav>
        {summaryJumpItems.map((item) => (
          <a
            aria-current={activeSectionId === item.id ? "location" : undefined}
            className={activeSectionId === item.id ? "active" : ""}
            href={`#${item.id}`}
            key={item.id}
            onClick={(event) => handleJumpClick(event, item.id)}
          >
            <span className="summary-jump-label">
              {item.label}
              {item.alert && <i aria-label="Needs attention" />}
            </span>
          </a>
        ))}
      </nav>
    </aside>
  );
}

function SummaryRailList({ rows, showDots = true }: { rows: SummaryItem[]; showDots?: boolean }) {
  return (
    <div className={`summary-rail-list${showDots ? "" : " no-dots"}`}>
      {rows.map((row) => (
        <div className={`summary-rail-row${row.muted ? " muted" : ""}${showDots ? "" : " no-dot"}`} key={row.title}>
          {showDots && <span className="summary-rail-dot" aria-hidden />}
          <div>
            <strong>{row.title}</strong>
            <p>
              <span>{row.meta}</span>
              {row.selfReported && <SummarySourceLabel />}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function SummaryCareTeamList({ rows }: { rows: SummaryItem[] }) {
  return (
    <dl className="summary-risk-list summary-care-team-list">
      {rows.map((member) => (
        <div key={member.title}>
          <dt>{member.title}</dt>
          <dd>{member.meta}</dd>
        </div>
      ))}
    </dl>
  );
}

function SummaryRiskFactors() {
  return (
    <section className="summary-rail-section">
      <h3>Risk Factors</h3>
      <dl className="summary-risk-list">
        {riskFactors.map((factor) => (
          <div key={factor.label}>
            <dt>{factor.label}</dt>
            <dd>{factor.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function SummarySideRail() {
  return (
    <aside className="summary-side-rail" aria-label="Patient summary sidebar">
      <section className="summary-rail-section">
        <h3>{summaryRailSections[0].title}</h3>
        <SummaryRailList rows={summaryRailSections[0].rows} />
      </section>
      <SummaryRiskFactors />
      {summaryRailSections.slice(1).map((section) => {
        const isCareTeam = section.title === "Care Team";
        const isDocuments = section.title === "Documents";

        return (
          <section className="summary-rail-section" key={section.title}>
            <h3>{section.title}</h3>
            {isCareTeam ? (
              <SummaryCareTeamList rows={section.rows} />
            ) : (
              <SummaryRailList rows={section.rows} showDots={!isDocuments} />
            )}
            {isDocuments && (
              <button className="summary-inline-link rail-link" type="button">
                <span>View all</span>
                <ArrowRightIcon size={14} variant="stroke" />
              </button>
            )}
          </section>
        );
      })}
    </aside>
  );
}

function PatientSummaryTab({ onOpenLabs, onOpenLabsAt }: { onOpenLabs: () => void; onOpenLabsAt: (labKey: string) => void }) {
  const [activeSummarySectionId, setActiveSummarySectionId] = useState(defaultSummaryJumpId);
  const requestedSummarySectionIdRef = useRef<string | null>(null);
  const requestedSummarySectionTimerRef = useRef<number | null>(null);

  const clearRequestedSummarySection = () => {
    if (requestedSummarySectionTimerRef.current !== null) {
      window.clearTimeout(requestedSummarySectionTimerRef.current);
      requestedSummarySectionTimerRef.current = null;
    }

    requestedSummarySectionIdRef.current = null;
  };

  const handleSummarySectionChange = (sectionId: string) => {
    clearRequestedSummarySection();
    requestedSummarySectionIdRef.current = sectionId;
    requestedSummarySectionTimerRef.current = window.setTimeout(() => {
      requestedSummarySectionIdRef.current = null;
      requestedSummarySectionTimerRef.current = null;
    }, 900);
    setActiveSummarySectionId(sectionId);
  };

  useEffect(() => {
    const sectionId = window.location.hash.slice(1);

    if (!summaryJumpItems.some((item) => item.id === sectionId)) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      if (requestedSummarySectionTimerRef.current !== null) {
        window.clearTimeout(requestedSummarySectionTimerRef.current);
      }

      requestedSummarySectionIdRef.current = sectionId;
      requestedSummarySectionTimerRef.current = window.setTimeout(() => {
        requestedSummarySectionIdRef.current = null;
        requestedSummarySectionTimerRef.current = null;
      }, 900);
      setActiveSummarySectionId(sectionId);
      scrollToSummarySection(sectionId, "auto");
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(
    () => () => {
      if (requestedSummarySectionTimerRef.current !== null) {
        window.clearTimeout(requestedSummarySectionTimerRef.current);
      }

      requestedSummarySectionTimerRef.current = null;
      requestedSummarySectionIdRef.current = null;
    },
    [],
  );

  useEffect(() => {
    const summaryScroller = document.querySelector<HTMLElement>(".summary-main-column");

    if (!summaryScroller) {
      return;
    }

    let animationFrame = 0;

    const updateActiveSection = () => {
      animationFrame = 0;

      const scrollerTop = summaryScroller.getBoundingClientRect().top;
      const activationLine = 48;
      let nextSectionId = defaultSummaryJumpId;
      let closestSectionId = defaultSummaryJumpId;
      let closestDistance = Number.POSITIVE_INFINITY;
      let activeRowTop = Number.NEGATIVE_INFINITY;
      let activeRowSectionIds: string[] = [];

      for (const item of summaryJumpItems) {
        const section = document.getElementById(item.id);

        if (!section) {
          continue;
        }

        const rect = section.getBoundingClientRect();
        const offsetFromScroller = rect.top - scrollerTop;
        const distanceFromAnchor = Math.abs(offsetFromScroller - 8);

        if (offsetFromScroller <= activationLine) {
          nextSectionId = item.id;
        }

        if (offsetFromScroller <= activationLine && rect.bottom >= scrollerTop) {
          if (offsetFromScroller > activeRowTop + 2) {
            activeRowTop = offsetFromScroller;
            activeRowSectionIds = [item.id];
          } else if (Math.abs(offsetFromScroller - activeRowTop) <= 2) {
            activeRowSectionIds.push(item.id);
          }
        }

        if (rect.bottom >= scrollerTop && distanceFromAnchor < closestDistance) {
          closestDistance = distanceFromAnchor;
          closestSectionId = item.id;
        }
      }

      const isAtBottom =
        summaryScroller.scrollTop + summaryScroller.clientHeight >= summaryScroller.scrollHeight - 2;

      if (isAtBottom) {
        nextSectionId = summaryJumpItems[summaryJumpItems.length - 1].id;
        activeRowSectionIds = [];
      } else if (activeRowSectionIds.length) {
        [nextSectionId] = activeRowSectionIds;
      } else if (nextSectionId === defaultSummaryJumpId && summaryScroller.scrollTop > 1) {
        nextSectionId = closestSectionId;
      }

      const requestedSectionId = requestedSummarySectionIdRef.current;
      const shouldKeepRequestedSection = requestedSectionId !== null;
      const shouldReleaseRequestedSection =
        requestedSectionId !== null &&
        (activeRowSectionIds.includes(requestedSectionId) || nextSectionId === requestedSectionId);

      if (shouldReleaseRequestedSection) {
        clearRequestedSummarySection();
      }

      setActiveSummarySectionId((currentSectionId) => {
        if (shouldKeepRequestedSection) {
          return currentSectionId === requestedSectionId ? currentSectionId : requestedSectionId;
        }

        if (activeRowSectionIds.includes(currentSectionId)) {
          return currentSectionId;
        }

        return currentSectionId === nextSectionId ? currentSectionId : nextSectionId;
      });
    };

    const scheduleActiveSectionUpdate = () => {
      if (animationFrame) {
        return;
      }

      animationFrame = window.requestAnimationFrame(updateActiveSection);
    };

    updateActiveSection();
    summaryScroller.addEventListener("scroll", scheduleActiveSectionUpdate, { passive: true });
    window.addEventListener("resize", scheduleActiveSectionUpdate);

    return () => {
      if (animationFrame) {
        window.cancelAnimationFrame(animationFrame);
      }

      summaryScroller.removeEventListener("scroll", scheduleActiveSectionUpdate);
      window.removeEventListener("resize", scheduleActiveSectionUpdate);
    };
  }, []);

  return (
    <div
      aria-labelledby="record-tab-summary"
      className="patient-summary-content"
      id="record-panel-summary"
      role="tabpanel"
    >
      <SummaryJumpNav activeSectionId={activeSummarySectionId} onActiveSectionChange={handleSummarySectionChange} />
      <main className="summary-main-column">
        <section className="summary-assessment" id="summary-assessment" aria-labelledby="summary-assessment-title">
          <h2 className="summary-ai-title" id="summary-assessment-title">
            Kura AI Summary
          </h2>
          <p>
            Sokha is a 32-year-old with type 2 diabetes and stage 3 CKD with albuminuria. Glycemic control is poor —
            HbA1c 9.4% (target &lt;7%), trending up over the last three readings. LDL 162 mg/dL and BP 145/92 are
            above target; renal function is stable. Suggested: intensify glycemic therapy, recheck HbA1c in 90 days,
            manage cardiovascular risk.
          </p>
          <small>AI-generated · verify against lab results and apply clinical judgment.</small>
        </section>
        <SummarySectionGrid />
        <MedicalMedicationGrid />
        <LabHistoryPreview onOpenLabs={onOpenLabs} onOpenLabsAt={onOpenLabsAt} />
      </main>
      <div className="summary-vertical-divider" aria-hidden />
      <SummarySideRail />
    </div>
  );
}

function RecordPlaceholderTab({ activeTab }: { activeTab: RecordTabId }) {
  const tabLabel = recordTabs.find((tab) => tab.id === activeTab)?.label ?? "Record";

  return (
    <section
      aria-labelledby={`record-tab-${activeTab}`}
      className="record-placeholder-tab"
      id={`record-panel-${activeTab}`}
      role="tabpanel"
    >
      <h2>{tabLabel}</h2>
      <p>This section is ready for the next workflow.</p>
    </section>
  );
}

function PatientRecordPage({ onBackToPatients }: { onBackToPatients: () => void }) {
  const [activeRecordTab, setActiveRecordTab] = useState<RecordTabId>("summary");
  const [labFocusKey, setLabFocusKey] = useState<string | null>(null);

  const openLabsAt = (labKey: string) => {
    setLabFocusKey(labKey);
    setActiveRecordTab("labs");
  };

  return (
    <div className="record-page">
      <DetailHeader onBackToPatients={onBackToPatients} />
      <RecordHeader activeTab={activeRecordTab} onTabChange={setActiveRecordTab} />
      {activeRecordTab === "summary" && (
        <PatientSummaryTab onOpenLabs={() => setActiveRecordTab("labs")} onOpenLabsAt={openLabsAt} />
      )}
      {activeRecordTab === "labs" && (
        <div aria-labelledby="record-tab-labs" className="record-body" id="record-panel-labs" role="tabpanel">
          <LabHistory focusKey={labFocusKey} onFocusHandled={() => setLabFocusKey(null)} />
        </div>
      )}
      {activeRecordTab === "orders" && <OrdersTab />}
      {activeRecordTab === "records" && <RecordsTab />}
      {activeRecordTab !== "summary" && activeRecordTab !== "labs" && activeRecordTab !== "orders" && activeRecordTab !== "records" && (
        <RecordPlaceholderTab activeTab={activeRecordTab} />
      )}
    </div>
  );
}

function SearchKbd({ children }: { children: string }) {
  return <span className="global-search-kbd">{children}</span>;
}

function GlobalSearchFooter() {
  return (
    <div className="global-search-footer">
      <span className="global-search-shortcut">
        <SearchKbd>↑</SearchKbd>
        <SearchKbd>↓</SearchKbd>
        <span>Navigate</span>
      </span>
      <span className="global-search-shortcut">
        <SearchKbd>↵</SearchKbd>
        <span>Open</span>
      </span>
      <span className="global-search-shortcut">
        <SearchKbd>esc</SearchKbd>
        <span>Close</span>
      </span>
    </div>
  );
}

function GlobalSearchResultRow({
  active,
  record,
  onClick,
}: {
  active: boolean;
  record: SearchRecord;
  onClick: () => void;
}) {
  return (
    <button
      aria-selected={active}
      className={`global-search-result${active ? " active" : ""}`}
      onClick={onClick}
      role="option"
      type="button"
    >
      <span className="global-search-avatar">{record.initials ?? record.title.slice(0, 2)}</span>
      <span className="global-search-result-copy">
        <strong>{record.title}</strong>
        <span>{record.subtitle}</span>
      </span>
      <span className="global-search-result-meta">
        <span>{getSearchScopeLabel(record.scope)}</span>
        <span>{record.meta}</span>
      </span>
    </button>
  );
}

function GlobalSearchModal({
  open,
  onClose,
  onOpenRecord,
}: {
  open: boolean;
  onClose: () => void;
  onOpenRecord: (record: SearchRecord) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const records = useMemo(() => getGlobalSearchRecords(), []);
  const [query, setQuery] = useState("");
  const [activeScope, setActiveScope] = useState<SearchScopeId | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [recentRecords, setRecentRecords] = useState<SearchRecord[]>([]);
  const results = useMemo(
    () => getGlobalSearchResults(records, query, activeScope),
    [activeScope, query, records],
  );
  const queryText = query.trim();
  const hasQuery = queryText.length > 0;
  const hasSearchContext = hasQuery || activeScope !== null;
  const showIdle = !hasSearchContext;
  const showInitialHint = showIdle && recentRecords.length === 0;
  const showRecent = showIdle && recentRecords.length > 0;
  const showNoResults = hasSearchContext && results.length === 0;
  const actionCount = showNoResults ? 2 : 0;
  const interactiveCount = results.length + (showRecent ? recentRecords.length : 0) + actionCount;

  useEffect(() => {
    if (!open) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.requestAnimationFrame(() => inputRef.current?.focus());

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [open]);

  if (!open) return null;

  const openRecord = (record: SearchRecord) => {
    setRecentRecords((current) => [record, ...current.filter((item) => item.id !== record.id)].slice(0, 5));
    setQuery("");
    setActiveScope(null);
    setActiveIndex(0);
    onOpenRecord(record);
  };
  const closeAndReset = () => {
    setQuery("");
    setActiveScope(null);
    onClose();
    setActiveIndex(0);
  };
  const clearQuery = () => {
    setQuery("");
    setActiveIndex(0);
    inputRef.current?.focus();
  };
  const runSearchAllRecords = () => {
    setActiveScope(null);
    setActiveIndex(0);
    inputRef.current?.focus();
  };
  const createPatientFromQuery = () => {
    const draftRecord: SearchRecord = {
      id: `create-${queryText || "patient"}`,
      scope: "patients",
      title: `Create new patient${queryText ? ` "${queryText}"` : ""}`,
      subtitle: "Draft patient profile",
      meta: "Patients",
      keywords: [queryText, "create", "new patient"],
      page: "patients",
      initials: "+",
    };

    setRecentRecords((current) =>
      [draftRecord, ...current].slice(0, 5),
    );
    closeAndReset();
  };
  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeAndReset();
      return;
    }

    if (interactiveCount === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % interactiveCount);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => (current - 1 + interactiveCount) % interactiveCount);
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();

      if (showRecent) {
        const recent = recentRecords[activeIndex];
        if (recent) openRecord(recent);
        return;
      }

      const record = results[activeIndex];
      if (record) {
        openRecord(record);
        return;
      }

      if (showNoResults && activeIndex === 0) {
        runSearchAllRecords();
        return;
      }

      if (showNoResults && activeIndex === 1) {
        createPatientFromQuery();
      }
    }
  };

  return (
    <div className="global-search-layer" onKeyDown={handleKeyDown}>
      <button className="global-search-scrim" aria-label="Close search" onClick={closeAndReset} type="button" />
      <section aria-label="Global search" aria-modal="true" className="global-search-modal" role="dialog">
        <div className="global-search-field-shell">
          <label className="global-search-field">
            <FigmaIcon src="/figma/icon-search.svg" size={24} />
            <input
              ref={inputRef}
              aria-label="Search patients, bookings, lab orders"
              autoComplete="off"
              placeholder="Search patients, bookings, lab orders..."
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActiveIndex(0);
              }}
            />
            {query && (
              <button aria-label="Clear search" className="global-search-clear" onClick={clearQuery} type="button">
                ×
              </button>
            )}
          </label>
        </div>

        {activeScope && (
          <div className="global-search-active-filters">
            <button
              className="global-search-active-chip"
              onClick={() => {
                setActiveScope(null);
                setActiveIndex(0);
              }}
              type="button"
            >
              <span>{getSearchScopeLabel(activeScope)}</span>
              <span aria-hidden>×</span>
            </button>
          </div>
        )}

        <div className="global-search-divider" />

        {showIdle && (
          <div className={`global-search-body${showRecent ? " compact" : ""}`}>
            <p className="global-search-section-label">Quick filters</p>
            <div className="global-search-chips">
              {globalSearchScopes.map((scope) => (
                <button
                  key={scope.id}
                  className="global-search-chip"
                  onClick={() => {
                    setActiveScope(scope.id);
                    setActiveIndex(0);
                  }}
                  type="button"
                >
                  {scope.label}
                </button>
              ))}
            </div>
            {showInitialHint && (
              <div className="global-search-hint">
                <FigmaIcon src="/figma/icon-search.svg" size={24} />
                <p>Search anything in your clinic</p>
              </div>
            )}
          </div>
        )}

        {showRecent && (
          <div className="global-search-results" role="listbox">
            <p className="global-search-section-label">Recent</p>
            {recentRecords.map((record, index) => (
              <GlobalSearchResultRow
                active={activeIndex === index}
                key={record.id}
                record={record}
                onClick={() => openRecord(record)}
              />
            ))}
          </div>
        )}

        {results.length > 0 && (
          <div className="global-search-results" role="listbox">
            <p className="global-search-section-label">
              {activeScope ? getSearchScopeLabel(activeScope) : "Top results"}
            </p>
            {results.map((record, index) => (
              <GlobalSearchResultRow
                active={activeIndex === index}
                key={record.id}
                record={record}
                onClick={() => openRecord(record)}
              />
            ))}
          </div>
        )}

        {showNoResults && (
          <>
            <div className="global-search-empty">
              <strong>No results found</strong>
              <span>Try a different term or remove a filter</span>
            </div>
            <div className="global-search-actions">
              <button
                className={`global-search-action${activeIndex === 0 ? " active" : ""}`}
                onClick={runSearchAllRecords}
                type="button"
              >
                <FilterPrimitives.Icon src="/figma/icon-search.svg" />
                <span>Search all records for “{queryText}”</span>
              </button>
              <button
                className={`global-search-action${activeIndex === 1 ? " active" : ""}`}
                onClick={createPatientFromQuery}
                type="button"
              >
                <FilterPrimitives.Icon src="/figma/icon-plus.svg" />
                <span>Create new patient “{queryText}”</span>
              </button>
            </div>
          </>
        )}

        <div className="global-search-divider" />
        <GlobalSearchFooter />
      </section>
    </div>
  );
}

function ComingSoonPage({ page }: { page: PageId }) {
  return (
    <section className="coming-soon-workspace" aria-labelledby="coming-soon-title">
      <div className="coming-soon-panel">
        <div className="coming-soon-icon">
          <NavIcon Icon={pageIcons[page]} restVariant="stroke" />
        </div>
        <p>{pageLabels[page]}</p>
        <h2 id="coming-soon-title">Coming soon</h2>
      </div>
    </section>
  );
}

export default function Home() {
  const [activePage, setActivePage] = useState<PageId>("patients");
  const [patientView, setPatientView] = useState<PatientView>("record");
  const [searchOpen, setSearchOpen] = useState(false);
  const isPatientsPage = activePage === "patients";
  const isPatientRecordPage = isPatientsPage && patientView === "record";

  useEffect(() => {
    const handleGlobalSearchShortcut = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.getAttribute("contenteditable") === "true";

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
        return;
      }

      if (!isTyping && event.key === "/") {
        event.preventDefault();
        setSearchOpen(true);
      }
    };

    window.addEventListener("keydown", handleGlobalSearchShortcut);
    return () => window.removeEventListener("keydown", handleGlobalSearchShortcut);
  }, []);

  useEffect(() => {
    const originalScrollRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";

    return () => {
      window.history.scrollRestoration = originalScrollRestoration;
    };
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activePage, patientView]);

  const openSearchRecord = (record: SearchRecord) => {
    if (record.scope === "patients") {
      setActivePage("patients");
      setPatientView("record");
    }

    setSearchOpen(false);
  };

  const openPatientRecord = () => {
    setActivePage("patients");
    setPatientView("record");
  };

  const openPatientList = () => {
    setActivePage("patients");
    setPatientView("list");
  };

  const handlePageChange = (page: PageId) => {
    setActivePage(page);

    if (page === "patients") {
      setPatientView("list");
    }
  };

  return (
    <main className={`kura-screen${isPatientRecordPage ? " record-shell" : ""}`}>
      <Sidebar activePage={activePage} onOpenSearch={() => setSearchOpen(true)} onPageChange={handlePageChange} />
      <section className={`app-main${isPatientRecordPage ? " record-main" : ""}`}>
        {!isPatientRecordPage && (
          <header className="page-header">
            <h1>{pageTitles[activePage]}</h1>
            {isPatientsPage && <NewPatientButton />}
          </header>
        )}
        <div className={`page-content${isPatientRecordPage ? " record-page-content" : ""}`}>
          {isComingSoonPage(activePage) ? (
            <ComingSoonPage page={activePage} />
          ) : isPatientRecordPage ? (
            <PatientRecordPage onBackToPatients={openPatientList} />
          ) : (
            <PatientPage onOpenPatient={openPatientRecord} onOpenSearch={() => setSearchOpen(true)} />
          )}
        </div>
      </section>
      <GlobalSearchModal open={searchOpen} onClose={() => setSearchOpen(false)} onOpenRecord={openSearchRecord} />
    </main>
  );
}
