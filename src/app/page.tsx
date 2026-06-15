"use client";

import type {
  ComponentType,
  CSSProperties,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  ReactNode,
} from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import { ActionList, Badge, Button as UiButton, Counter, Drawer, LabHistory, LabMiniTrend, getLabHistoryPreview, type LabPreviewEntry } from "@/components/ui";
import { OrdersTab } from "@/components/OrdersTab";
import { LabCatalogWorkspace } from "@/components/LabCatalogWorkspace";
import { RecordsTab } from "@/components/RecordsTab";
import { SettingsView, type SettingsSectionId } from "@/components/SettingsView";
import { VerificationStatusBanner } from "@/components/Verification";
import { BookingsWorkspace, type BookingFocus } from "@/components/BookingsWorkspace";
import { DoctorMobileApp } from "@/components/DoctorMobile";
import { HomeView } from "@/components/HomeView";
import type { HomeModel } from "@/components/HomeView";
import {
  ACTIVE_PATIENT_ID,
  OrderDraftDock,
  OrderDraftPopover,
  OrderDraftProvider,
  OrderDraftRail,
  formatMoney as odrFormatMoney,
  orderCategories,
  orderItems,
  specimenFilters,
  useOrderDraft,
} from "@/components/OrderDraft";
import { BOOKING_PATIENTS, SEEDED_BOOKINGS } from "@/components/OrderDraft/bookingSeeds";
import {
  getBookingAnchor,
  getBookingSearchKeywords,
  getBookingTestSummary,
  getRouteLabel,
  bookingStatusView,
  isBookingAwaitingVisit,
} from "@/components/OrderDraft/bookingShared";
import type { BookingListItem, PlacedOrderSummary } from "@/components/OrderDraft/types";
import { Button } from "@/components/button";
import { FilterPrimitives } from "@/components/filter-primitives";
import { Pagination } from "@/components/pagination";
import { Avatar } from "@/components/ui";
import { deltaLabFacts, deltaLabKeys } from "@/data/deltaLabResults";
import {
  ArrowRight as ArrowRightIcon,
  Bell as BellIcon,
  Booking as BookingIcon,
  Calendar as CalendarIcon,
  Catalog as CatalogIcon,
  Check as CheckIcon,
  ChevronDown as ChevronDownIcon,
  ChevronRight as ChevronRightIcon,
  Clock as ClockIcon,
  Close as CloseSmallIcon,
  Corporate as CorporateIcon,
  CreditCard as CreditCardIcon,
  Flask as FlaskIcon,
  Heart as HeartIcon,
  Home as HomeIcon,
  IDCard as IDCardIcon,
  Info as InfoIcon,
  MedicalMask as MedicalMaskIcon,
  More as MoreIcon,
  Note as NoteIcon,
  Patient as PatientIcon,
  Pill as PillIcon,
  Plus as PlusIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Setting as SettingIcon,
  Share as ShareIcon,
  TeleConsultation as TeleConsultationIcon,
  Tube as TubeIcon,
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
  primaryCondition: string;
  activeConditions: string[];
  reviewItems: string[];
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
/* Records can carry scopes beyond the quick-filter chips: catalog tests,
   care-plan signals, and action shortcuts rank below clinical entities. */
type SearchRecordScope = SearchScopeId | "catalog" | "carePlan" | "actions";
/* Where a result lands. Search never mutates — it navigates or focuses. */
type SearchDestination =
  | { kind: "page"; page: PageId }
  | { kind: "booking"; bookingCode: string }
  | { kind: "catalog"; catalog: { query: string; itemId: string } }
  | { kind: "patients-list" }
  | { kind: "record"; tab: RecordTabId; labKey?: string; catalog?: { query: string; itemId: string } };
type SearchRecord = {
  id: string;
  scope: SearchRecordScope;
  title: string;
  subtitle: string;
  meta: string;
  keywords: string[];
  /* exact-match identifier (MRN / booking code / lab code) — top ranking tier */
  code?: string;
  destination: SearchDestination;
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
type NavItem = {
  id: PageId;
  label: string;
  Icon: NavIconComponent;
  activeVariant?: IconStyle;
  disabled?: boolean;
  restVariant?: IconStyle;
};
type MoreMenuItem = {
  label: string;
  Icon: NavIconComponent;
  page?: PageId;
  settings?: SettingsSectionId;
};
type MoreMenuGroup = {
  title: string;
  items: MoreMenuItem[];
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

const MOBILE_SHELL_QUERY = "(max-width: 900px)";

function subscribeMobileShell(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  const media = window.matchMedia(MOBILE_SHELL_QUERY);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}

function getMobileShellSnapshot() {
  return typeof window !== "undefined" && window.matchMedia(MOBILE_SHELL_QUERY).matches;
}

function getMobileShellServerSnapshot() {
  return false;
}

const moreMenuGroups = [
  {
    title: "GENERAL",
    items: [
      { label: "Dashboard", Icon: CatalogIcon, page: "home" },
      { label: "Inbox", Icon: BellIcon, page: "more" },
      { label: "Calendar", Icon: CalendarIcon, page: "more" },
      { label: "Tasks", Icon: CheckIcon, page: "more" },
    ],
  },
  {
    title: "CLINICAL",
    items: [
      { label: "Telehealth", Icon: TeleConsultationIcon, page: "more" },
      { label: "Care plans", Icon: HeartIcon, page: "more" },
      { label: "Pharma calls", Icon: NoteIcon, page: "more" },
    ],
  },
  {
    title: "PHARMACY",
    items: [
      { label: "Dispensary", Icon: PillIcon, page: "more" },
      { label: "Supplies", Icon: TubeIcon, page: "more" },
    ],
  },
  {
    title: "BUSINESS",
    items: [
      { label: "Billing & Payments", Icon: CreditCardIcon, settings: "billing" },
      { label: "Refer & earn", Icon: ShareIcon, page: "more" },
    ],
  },
  {
    title: "ACCOUNT",
    items: [
      { label: "Directory profile", Icon: CorporateIcon, settings: "directory" },
      { label: "e-Signature", Icon: IDCardIcon, settings: "esign" },
    ],
  },
] satisfies MoreMenuGroup[];

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

const comingSoonPages = new Set<PageId>(["more"]);

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
    primaryCondition: "Type 2 Diabetes",
    activeConditions: ["Hypertension", "CKD stage 3"],
    reviewItems: ["Neuropathy/retinopathy screening"],
  },
  {
    name: "Dara Pich",
    khmerName: "ភិច ដារ៉ា",
    phone: "011 ••• 230",
    age: 41,
    sex: "male",
    sexTone: "pink",
    lastSeen: "3d ago",
    primaryCondition: "Hypertension",
    activeConditions: ["Hyperlipidemia", "Obesity"],
    reviewItems: [],
  },
  {
    name: "Sreymom Sok",
    khmerName: "សុខ ស្រីមុំ",
    phone: "092 ••• 778",
    age: 29,
    sex: "female",
    sexTone: "brand",
    lastSeen: "1d ago",
    primaryCondition: "Pregnancy",
    activeConditions: ["Gestational diabetes"],
    reviewItems: [],
  },
  {
    name: "Vichea Nuon",
    khmerName: "នួន វិជា",
    phone: "088 ••• 142",
    age: 63,
    sex: "male",
    sexTone: "pink",
    lastSeen: "5d ago",
    primaryCondition: "COPD",
    activeConditions: ["Hypertension", "OSA", "Chronic bronchitis"],
    reviewItems: [],
  },
  {
    name: "Bopha Lim",
    khmerName: "លឹម បុប្ផា",
    phone: "016 ••• 905",
    age: 7,
    sex: "female",
    sexTone: "brand",
    lastSeen: "8d ago",
    primaryCondition: "Asthma",
    activeConditions: ["Allergic rhinitis"],
    reviewItems: [],
  },
  {
    name: "Rithy Kong",
    khmerName: "គង់ ឫទ្ធិ",
    phone: "010 ••• 367",
    age: 48,
    sex: "male",
    sexTone: "pink",
    lastSeen: "21d ago",
    primaryCondition: "GERD",
    activeConditions: ["H. pylori"],
    reviewItems: [],
  },
  {
    name: "Channary Em",
    khmerName: "អែម ចន្នារី",
    phone: "069 ••• 514",
    age: 35,
    sex: "female",
    sexTone: "brand",
    lastSeen: "2d ago",
    primaryCondition: "Low back pain",
    activeConditions: ["Sciatica", "Disc herniation"],
    reviewItems: [],
  },
  {
    name: "Sovann Tep",
    khmerName: "ទេព សុវណ្ណ",
    phone: "078 ••• 889",
    age: 71,
    sex: "male",
    sexTone: "brand",
    lastSeen: "30d ago",
    primaryCondition: "Heart failure",
    activeConditions: ["CAD", "AFib", "CKD stage 3", "Hyperlipidemia"],
    reviewItems: [],
  },
];

function getClinicalReviewLabels(patient: Pick<Patient, "reviewItems">) {
  return patient.reviewItems.map((label) => label.trim()).filter(Boolean);
}

function getClinicalProblemText(patient: Pick<Patient, "primaryCondition" | "activeConditions">) {
  const primaryLabel = patient.primaryCondition.trim() || "Problem list not recorded";
  const activeLabels = patient.activeConditions.map((label) => label.trim()).filter(Boolean);
  return [primaryLabel, ...activeLabels].join(" · ");
}

function getClinicalSummaryText(patient: Pick<Patient, "primaryCondition" | "activeConditions" | "reviewItems">) {
  const problemText = getClinicalProblemText(patient);
  const reviewLabels = getClinicalReviewLabels(patient);
  return reviewLabels.length > 0 ? `${problemText}. Review: ${reviewLabels.join(", ")}` : problemText;
}

function getConditionCodes(
  primaryCondition: string,
  activeConditions: string[],
  reviewItems: string[],
  index: number,
): ConditionFilterId[] {
  const copy = [primaryCondition, ...activeConditions, ...reviewItems].join(" ").toLowerCase();
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
    conditionCodes: getConditionCodes(seed.primaryCondition, seed.activeConditions, seed.reviewItems, index),
    acuity: getPatientAcuity(index),
    needsReview: seed.reviewItems.length > 0,
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
  { label: `${deltaLabFacts.creatinine.label} ${deltaLabFacts.creatinine.value} ↑`, tone: "danger" },
  { label: `${deltaLabFacts.microalbuminCreatinineRatio.label} ${deltaLabFacts.microalbuminCreatinineRatio.value} ↑`, tone: "danger" },
  { label: `${deltaLabFacts.bun.label} ${deltaLabFacts.bun.value} ↑`, tone: "warning" },
  { label: `${deltaLabFacts.hemoglobin.label} ${deltaLabFacts.hemoglobin.value} ↓`, tone: "warning" },
];

const recordLabContextBadges: RecordBadgeData[] = [
  { label: deltaLabFacts.hba1c.summary, tone: "warning" },
  { label: deltaLabFacts.ldl.summary, tone: "success" },
  { label: "BP 146/92 ↑", tone: "warning" },
];

const recordMonitorBadges: RecordBadgeData[] = [
  { label: "Syphilis", tone: "warning" },
  { label: "H. pylori", tone: "warning" },
];

const recordReportedBadges: RecordBadgeData[] = [
  { label: "HIV", tone: "info", dashed: true, icon: "info" },
  { label: "Hepatitis B", tone: "info", dashed: true, icon: "info" },
];


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
  { label: "LAB CONTEXT", badges: recordLabContextBadges },
  { label: "DUE", due: { lead: "HbA1c — not repeated since Jan 15", followUp: "Renal markers above reference" } },
];

type RecordPatient = {
  id: string;
  initials: string;
  name: string;
  age: number;
  sex: string;
  dob: string;
  mrn: string;
  tel: string;
  insurance: string;
  problems: RecordBadgeData[];
  flags: RecordBadgeData[];
};

/* Patients the header switcher can jump between in place. Index 0 mirrors the
   live demo chart (Sokha) exactly. NOTE (prototype): only Sokha has a full
   backing chart — switching swaps the header identity + problem/flag chips, but
   the tab bodies below stay on the demo fixture (the app's existing convention
   that every chart resolves to Sokha's data). */
const recordPatients: RecordPatient[] = [
  {
    id: "sokha-chan",
    initials: "SC",
    name: "Sokha Chan",
    age: 32,
    sex: "Female",
    dob: "12 Sep 1994",
    mrn: "P-9134",
    tel: "070 ··· 496",
    insurance: "Forte (active)",
    problems: recordProblemBadges,
    flags: recordRecentAbnormalBadges,
  },
  {
    id: "vanna-kim",
    initials: "VK",
    name: "Vanna Kim",
    age: 61,
    sex: "Male",
    dob: "03 Feb 1965",
    mrn: "P-8820",
    tel: "077 ··· 218",
    insurance: "Forte (active)",
    problems: [{ label: "Hypertension" }, { label: "CAD" }, { label: "Hyperlipidemia" }],
    flags: [
      { label: "BP 152/94 ↑", tone: "danger" },
      { label: "LDL 168 mg/dL ↑", tone: "warning" },
    ],
  },
  {
    id: "dara-meas",
    initials: "DM",
    name: "Dara Meas",
    age: 43,
    sex: "Male",
    dob: "21 Nov 1982",
    mrn: "P-8431",
    tel: "012 ··· 905",
    insurance: "Sovannaphum (review)",
    problems: [{ label: "Type 2 diabetes" }, { label: "Obesity" }],
    flags: [{ label: "HbA1c 8.9% ↑", tone: "danger" }],
  },
  {
    id: "chanthy-sok",
    initials: "CS",
    name: "Chanthy Sok",
    age: 36,
    sex: "Female",
    dob: "08 Jun 1990",
    mrn: "P-9007",
    tel: "070 ··· 774",
    insurance: "Self-pay",
    problems: [{ label: "Hypothyroidism" }],
    flags: [{ label: "TSH 7.1 mIU/L ↑", tone: "warning" }],
  },
  {
    id: "ratha-pich",
    initials: "RP",
    name: "Ratha Pich",
    age: 58,
    sex: "Male",
    dob: "14 Mar 1968",
    mrn: "P-7765",
    tel: "078 ··· 332",
    insurance: "Forte (active)",
    problems: [{ label: "CKD stage 4" }, { label: "Anemia" }, { label: "Gout" }],
    flags: [
      { label: "eGFR 24 ↓", tone: "danger" },
      { label: "Haemoglobin 9.6 g/dL ↓", tone: "warning" },
    ],
  },
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
  { id: "summary-lab-preview", label: "Lab history", alert: true },
  { id: "summary-visit-intent", label: "Visit intent" },
  { id: "summary-symptoms", label: "Symptoms" },
  { id: "summary-medical-history", label: "Medical history" },
  { id: "summary-medications", label: "Medications" },
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
        title: "Renal markers and glycemic follow-up",
        meta: "Review renal markers · HbA1c not repeated on latest draws",
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

const allergyRows: SummaryItem[] = [{ title: "Penicillin", meta: "Rash, moderate", selfReported: true }];

/* Alerts & care gaps — rule-engine output. Orderable gaps carry the LabHistory
   row key so "Order" adds a provenance-rich line to the shared order draft. */
type CareGapRow = {
  title: string;
  meta: string;
  tone: "danger" | "warning" | "muted";
  order?: { labKey: string; labName: string; severityTone: "danger" | "warning" };
  referral?: boolean;
};

const careGapRows: CareGapRow[] = [
  {
    title: "HbA1c — repeat now",
    meta: `${deltaLabFacts.hba1c.value} · ${deltaLabFacts.hba1c.repeatStatus}`,
    tone: "danger",
    order: {
      labKey: "GLYCOSYLATED HAEMOGLOBIN (Roche)||Hb A1c % (DCCT/NGSP)",
      labName: "HbA1c",
      severityTone: "danger",
    },
  },
  {
    title: "Microalbumin/Cr follow-up",
    meta: `${deltaLabFacts.microalbuminCreatinineRatio.value} · ${deltaLabFacts.microalbuminCreatinineRatio.status}`,
    tone: "warning",
    order: {
      labKey: "URINE BIOCHEMISTRY (Microalbumin Roche)||Microalbumin/Cre Ratio",
      labName: "Microalbumin / creatinine ratio",
      severityTone: "warning",
    },
  },
  { title: "Creatinine remains above reference", meta: `${deltaLabFacts.creatinine.value} · ${deltaLabFacts.creatinine.shortDate}`, tone: "danger" },
  { title: "Annual eye exam overdue", meta: "Refer ophthalmology", tone: "warning", referral: true },
  { title: "Repeat HbA1c (fasting)", meta: `Last result ${deltaLabFacts.hba1c.shortDate}`, tone: "muted" },
];

/* ICD-10 — evidence-backed AI candidates; nothing auto-adds (doctor decides).
   The suggestion list is always CANDIDATES minus what's already on the chart. */
type ClinicalEvidence = { label: string; value: string; tone?: "danger" | "warning" | "success" | "neutral" };
type IcdEntry = {
  code: string;
  label: string;
  trigger: string;
  confidence: "high" | "low";
  linkedProblem?: string;
  actionHint?: string;
  evidence?: ClinicalEvidence[];
  /* Short evidence line for the compact coding-review row — values only,
     no dates or reference status. Falls back to `trigger`. */
  reviewMeta?: string;
};

const icdCandidates: IcdEntry[] = [
  {
    code: "E11.65",
    label: "Type 2 diabetes mellitus with hyperglycemia",
    trigger: deltaLabFacts.hba1c.summary,
    confidence: "high",
    linkedProblem: "Diabetes follow-up",
    actionHint: "Code if the diagnosis is clinically confirmed today",
    evidence: [{ label: "HbA1c", value: `${deltaLabFacts.hba1c.value} · ${deltaLabFacts.hba1c.date} · not repeated`, tone: "warning" }],
    reviewMeta: `HbA1c ${deltaLabFacts.hba1c.value} · not repeated`,
  },
  {
    code: "I10",
    label: "Essential (primary) hypertension",
    trigger: "BP 146/92 · 3 visits",
    confidence: "high",
    linkedProblem: "Blood pressure",
    actionHint: "Code if elevated BP remains part of the visit assessment",
    evidence: [{ label: "Vitals", value: "BP 146/92 · 3 visits", tone: "warning" }],
    reviewMeta: "BP 146/92 · 3 visits",
  },
  {
    code: "N18.3",
    label: "Chronic kidney disease, stage 3",
    trigger: `${deltaLabFacts.creatinine.summary} · ${deltaLabFacts.microalbuminCreatinineRatio.summary}`,
    confidence: "high",
    linkedProblem: "Renal markers",
    actionHint: "Add diagnosis to connect renal evidence to the care plan",
    evidence: [
      { label: "Creatinine", value: `${deltaLabFacts.creatinine.value} · ${deltaLabFacts.creatinine.date} · ${deltaLabFacts.creatinine.status}`, tone: "danger" },
      {
        label: "Albuminuria",
        value: `${deltaLabFacts.microalbuminCreatinineRatio.value} · ${deltaLabFacts.microalbuminCreatinineRatio.date} · ${deltaLabFacts.microalbuminCreatinineRatio.status}`,
        tone: "danger",
      },
    ],
    reviewMeta: `Creatinine ${deltaLabFacts.creatinine.value} · albuminuria ${deltaLabFacts.microalbuminCreatinineRatio.value}`,
  },
  {
    code: "D64.9",
    label: "Anemia, unspecified",
    trigger: deltaLabFacts.hemoglobin.summary,
    confidence: "low",
    linkedProblem: "CBC signal",
    actionHint: "Review before coding because confidence is low",
    evidence: [{ label: "Haemoglobin", value: `${deltaLabFacts.hemoglobin.value} · ${deltaLabFacts.hemoglobin.date} · ${deltaLabFacts.hemoglobin.status}`, tone: "warning" }],
    reviewMeta: `Hb ${deltaLabFacts.hemoglobin.value}`,
  },
];

const initialIcdCodes = ["E11.65", "I10"];

/* Rx — guideline-driven candidates with trigger + rationale. Suggestions
   already covered by an active medication are filtered out automatically. */
type RxCandidate = {
  drug: string;
  dose: string;
  freq: string;
  class: string;
  trigger: string;
  rationale: string;
  linkedProblem: string;
  evidence: ClinicalEvidence[];
  actionLabel?: string;
  mode?: "add" | "review";
};

const rxCandidates: RxCandidate[] = [
  {
    drug: "Empagliflozin",
    dose: "10 mg",
    freq: "Once daily",
    class: "SGLT2i",
    trigger: `${deltaLabFacts.hba1c.summary} · ${deltaLabFacts.microalbuminCreatinineRatio.summary}`,
    rationale: "Consider renal-protective therapy if clinically appropriate",
    linkedProblem: "T2DM + albuminuria",
    evidence: [
      { label: "Glycemic", value: `${deltaLabFacts.hba1c.value} · ${deltaLabFacts.hba1c.date} · not repeated`, tone: "warning" },
      {
        label: "Renal",
        value: `${deltaLabFacts.microalbuminCreatinineRatio.value} · ${deltaLabFacts.microalbuminCreatinineRatio.date} · ${deltaLabFacts.microalbuminCreatinineRatio.status}`,
        tone: "danger",
      },
    ],
    actionLabel: "Add medication",
  },
  {
    drug: "Lisinopril",
    dose: "10 mg",
    freq: "Once daily",
    class: "ACE inhibitor",
    trigger: `BP 146/92 · ${deltaLabFacts.microalbuminCreatinineRatio.summary}`,
    rationale: "Review BP control and albuminuria context",
    linkedProblem: "Hypertension + albuminuria",
    evidence: [
      { label: "Vitals", value: "BP 146/92", tone: "warning" },
      {
        label: "Renal",
        value: `${deltaLabFacts.microalbuminCreatinineRatio.value} · ${deltaLabFacts.microalbuminCreatinineRatio.date} · ${deltaLabFacts.microalbuminCreatinineRatio.status}`,
        tone: "danger",
      },
    ],
    actionLabel: "Add medication",
  },
  {
    drug: "Atorvastatin",
    dose: "40 mg",
    freq: "Once daily",
    class: "High-intensity statin",
    trigger: `${deltaLabFacts.ldl.summary} · T2DM history`,
    rationale: "LDL is in range on this report; review existing lipid plan, do not escalate from this value alone",
    linkedProblem: "Cardiovascular risk review",
    evidence: [{ label: "Lipids", value: `${deltaLabFacts.ldl.value} · ${deltaLabFacts.ldl.date} · ${deltaLabFacts.ldl.status}`, tone: "success" }],
    actionLabel: "Review lipid plan",
    mode: "review",
  },
];

/* ------------------------------------------------------------------ */
/* Encounter layer — the treatment loop on top of the review chart:
   signal → decision → action (note / Rx / ICD / referral / follow-up)
   → encounter timeline → claim readiness. All demo-local state.       */

/* Full searchable ICD set = the 4 evidence-backed AI candidates plus
   chart-derived extras (documents, vitals). */
const icdExtras: IcdEntry[] = [
  { code: "K76.0", label: "Fatty (change of) liver", trigger: "US: hepatic steatosis · mild", confidence: "low" },
  { code: "E66.9", label: "Overweight, unspecified", trigger: "BMI 28.4", confidence: "low" },
  { code: "H36.0", label: "Diabetic retinopathy", trigger: "Reports blurred vision · screening due", confidence: "low" },
];
const icdLibrary: IcdEntry[] = [...icdCandidates, ...icdExtras];

type RxFormularyItem = { drug: string; dose: string; class: string; defaultFreq: string };

const rxFormulary: RxFormularyItem[] = [
  { drug: "Empagliflozin", dose: "10 mg", class: "SGLT2i", defaultFreq: "OD" },
  { drug: "Atorvastatin", dose: "40 mg", class: "High-intensity statin", defaultFreq: "OD" },
  { drug: "Lisinopril", dose: "10 mg", class: "ACE inhibitor", defaultFreq: "OD" },
  { drug: "Metformin", dose: "1 g", class: "Biguanide", defaultFreq: "BID" },
  { drug: "Losartan", dose: "50 mg", class: "ARB", defaultFreq: "OD" },
];

const rxFrequencies = [
  { value: "OD", label: "OD — Once daily" },
  { value: "BID", label: "BID — Twice daily" },
  { value: "TID", label: "TID — Three times daily" },
  { value: "PRN", label: "PRN — As needed" },
];

const referralServices = ["Specialty consult", "Imaging", "Surgery", "Mental health"];

type ReferralDestination = { name: string; distance: string; nextSlot: string; cost: string; insurance: string };

const referralDestinations: ReferralDestination[] = [
  { name: "Calmette Hospital", distance: "2.1 km", nextSlot: "Tomorrow 14:00", cost: "$25–$60", insurance: "Forte · NSSF" },
  { name: "Khema Clinic — Ophthalmology", distance: "3.4 km", nextSlot: "Fri 09:30", cost: "$40–$90", insurance: "Forte" },
  { name: "Preah Ang Duong (public)", distance: "5.0 km", nextSlot: "Next week", cost: "$0–$30", insurance: "NSSF" },
];

const followUpOptions = [
  { id: "4w", label: "4 weeks", detail: "BP + medication tolerance check" },
  { id: "90d", label: "90 days", detail: "Repeat HbA1c · if clinically indicated", recommended: true },
  { id: "6m", label: "6 months", detail: "Stable-state review" },
];

/* SOAP scaffold seeded from today's chart signals — every section is the
   doctor's to edit before signing. */
const noteScaffold = {
  reason: "Renal marker and glycemic follow-up review",
  s: "Polyuria 2 weeks, worsening. Fatigue. Reports blurred vision (not yet verified).",
  o: `BP 146/92. Bilateral peripheral edema. ${deltaLabFacts.hba1c.summary}. ${deltaLabFacts.microalbuminCreatinineRatio.summary}. ${deltaLabFacts.creatinine.summary}.`,
  a: "T2DM with HbA1c not repeated on the latest draws. Renal markers remain above reference. Hypertension above target.",
  p: "Review renal markers and current therapy. Repeat HbA1c if clinically indicated. Ophthalmology referral for retinopathy screen.",
};

type EncounterEntry = {
  id: number;
  kind: "note" | "icd" | "rx" | "order" | "referral" | "followup" | "claim";
  label: string;
  detail?: string;
};

type NoteStatus = "none" | "draft" | "signed";
type NoteFields = { reason: string; s: string; o: string; a: string; p: string };
type ReferralRecord = { service: string; destination: string; urgency: string; code: string };
/* A self-reported signal the doctor has acted on: confirmed into the record
   or dismissed as not relevant today. Unlisted ids are still unresolved. */
type SelfReportedResolution = "confirmed" | "dismissed";

type EncounterApi = {
  entries: EncounterEntry[];
  logEntry: (kind: EncounterEntry["kind"], label: string, detail?: string) => void;
  icdCodes: string[];
  addIcd: (code: string) => void;
  removeIcd: (code: string) => void;
  meds: Array<SummaryItem & { ai?: boolean; rx?: boolean }>;
  addMedFromSuggestion: (candidate: RxCandidate) => void;
  addMedFromRx: (item: RxFormularyItem, freqLabel: string) => void;
  note: NoteFields;
  setNote: (fields: Partial<NoteFields>) => void;
  noteStatus: NoteStatus;
  saveNoteDraft: () => void;
  signNote: () => void;
  signedRx: string[];
  referral: ReferralRecord | null;
  sendReferral: (record: Omit<ReferralRecord, "code">) => void;
  followUp: string | null;
  scheduleFollowUp: (label: string) => void;
  selfReported: Record<string, SelfReportedResolution>;
  resolveSelfReported: (id: string, resolution: SelfReportedResolution, label: string) => void;
  clearSelfReported: (id: string, label: string) => void;
  claimChecks: Array<{ id: string; label: string; done: boolean }>;
  claimReady: boolean;
};

const EncounterContext = createContext<EncounterApi | null>(null);

function useEncounter(): EncounterApi {
  const api = useContext(EncounterContext);
  if (!api) throw new Error("useEncounter must be used inside EncounterProvider");
  return api;
}

function EncounterProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<EncounterEntry[]>([]);
  const entrySeqRef = useRef(0);
  const [icdCodes, setIcdCodes] = useState<string[]>(initialIcdCodes);
  const [meds, setMeds] = useState<Array<SummaryItem & { ai?: boolean; rx?: boolean }>>(medicationItems);
  const [note, setNoteFields] = useState<NoteFields>(noteScaffold);
  const [noteStatus, setNoteStatus] = useState<NoteStatus>("none");
  const [signedRx, setSignedRx] = useState<string[]>([]);
  const [referral, setReferral] = useState<ReferralRecord | null>(null);
  const [followUp, setFollowUp] = useState<string | null>(null);
  const [selfReported, setSelfReported] = useState<Record<string, SelfReportedResolution>>({});

  const logEntry = useCallback((kind: EncounterEntry["kind"], label: string, detail?: string) => {
    entrySeqRef.current += 1;
    setEntries((current) => [...current, { id: entrySeqRef.current, kind, label, detail }]);
  }, []);

  const addIcd = useCallback(
    (code: string) => {
      const entry = icdLibrary.find((candidate) => candidate.code === code);
      setIcdCodes((codes) => (codes.includes(code) ? codes : [...codes, code]));
      if (entry) logEntry("icd", `Added ${entry.code} — ${entry.label}`, entry.trigger);
    },
    [logEntry],
  );

  const removeIcd = useCallback((code: string) => {
    setIcdCodes((codes) => codes.filter((existing) => existing !== code));
  }, []);

  const addMedFromSuggestion = useCallback(
    (candidate: RxCandidate) => {
      setMeds((current) => [
        ...current,
        { title: `${candidate.drug} ${candidate.dose}`, meta: `${candidate.class} · ${candidate.freq}`, ai: true },
      ]);
      logEntry("rx", `Added medication — ${candidate.drug} ${candidate.dose}`, "From AI suggestion · not yet a signed Rx");
    },
    [logEntry],
  );

  const addMedFromRx = useCallback(
    (item: RxFormularyItem, freqLabel: string) => {
      setMeds((current) => {
        const title = `${item.drug} ${item.dose}`;
        if (current.some((med) => med.title === title)) return current;
        return [...current, { title, meta: `${item.class} · ${freqLabel}`, rx: true }];
      });
      setSignedRx((current) => [...current, item.drug]);
      logEntry("rx", `Prescribed ${item.drug} ${item.dose}`, `${freqLabel} · signed Rx · PDF for any pharmacy`);
    },
    [logEntry],
  );

  const setNote = useCallback((fields: Partial<NoteFields>) => {
    setNoteFields((current) => ({ ...current, ...fields }));
  }, []);

  const saveNoteDraft = useCallback(() => {
    setNoteStatus((current) => (current === "signed" ? current : "draft"));
    logEntry("note", "Note drafted", "Unsigned — not yet part of the legal record");
  }, [logEntry]);

  const signNote = useCallback(() => {
    setNoteStatus("signed");
    logEntry("note", "Signed note", noteScaffold.reason);
  }, [logEntry]);

  const sendReferral = useCallback(
    (record: Omit<ReferralRecord, "code">) => {
      const code = `KR-9134-${String(2400 + entrySeqRef.current * 7).slice(-4)}`;
      setReferral({ ...record, code });
      logEntry("referral", `Referred ${record.service.toLowerCase()} — ${record.destination}`, `${record.urgency} · ${code} · patient notified via Telegram`);
    },
    [logEntry],
  );

  const scheduleFollowUp = useCallback(
    (label: string) => {
      setFollowUp(label);
      logEntry("followup", `Scheduled follow-up in ${label}`, "Telegram reminder to 070 ··· 496");
    },
    [logEntry],
  );

  const resolveSelfReported = useCallback(
    (id: string, resolution: SelfReportedResolution, label: string) => {
      setSelfReported((current) => ({ ...current, [id]: resolution }));
      logEntry(
        "note",
        resolution === "confirmed" ? `Confirmed self-reported — ${label}` : `Dismissed self-reported — ${label}`,
        resolution === "confirmed" ? "Moved into the clinical record" : "Marked not clinically relevant today",
      );
    },
    [logEntry],
  );

  const clearSelfReported = useCallback(
    (id: string, label: string) => {
      setSelfReported((current) => {
        if (!(id in current)) return current;
        const next = { ...current };
        delete next[id];
        return next;
      });
      logEntry("note", `Reopened self-reported — ${label}`, "Back to unverified — needs a decision");
    },
    [logEntry],
  );

  /* Claim packet readiness — UX mock of the billing gate. Lab evidence and
     identity tier come from seeded chart facts. */
  const claimChecks = useMemo(
    () => [
      { id: "icd", label: "ICD-10 coded", done: icdCodes.length > 0 },
      { id: "note", label: "Signed note", done: noteStatus === "signed" },
      { id: "labs", label: "Lab evidence — HbA1c results on file", done: true },
      { id: "identity", label: "Identity verified · Forte active", done: true },
      { id: "therapy", label: "Therapy plan — Rx, referral, or follow-up", done: signedRx.length > 0 || referral !== null || followUp !== null },
    ],
    [icdCodes.length, noteStatus, signedRx.length, referral, followUp],
  );
  const claimReady = claimChecks.every((check) => check.done);

  const claimLoggedRef = useRef(false);
  useEffect(() => {
    if (claimReady && !claimLoggedRef.current) {
      claimLoggedRef.current = true;
      logEntry("claim", "Claim packet ready", "ICD · signed note · lab evidence · therapy plan");
    }
  }, [claimReady, logEntry]);

  const api = useMemo<EncounterApi>(
    () => ({
      entries,
      logEntry,
      icdCodes,
      addIcd,
      removeIcd,
      meds,
      addMedFromSuggestion,
      addMedFromRx,
      note,
      setNote,
      noteStatus,
      saveNoteDraft,
      signNote,
      signedRx,
      referral,
      sendReferral,
      followUp,
      scheduleFollowUp,
      selfReported,
      resolveSelfReported,
      clearSelfReported,
      claimChecks,
      claimReady,
    }),
    [entries, logEntry, icdCodes, addIcd, removeIcd, meds, addMedFromSuggestion, addMedFromRx, note, setNote, noteStatus, saveNoteDraft, signNote, signedRx, referral, sendReferral, followUp, scheduleFollowUp, selfReported, resolveSelfReported, clearSelfReported, claimChecks, claimReady],
  );

  return <EncounterContext.Provider value={api}>{children}</EncounterContext.Provider>;
}

function getNameInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2);
}

const bookingPatientByIdForSearch = new Map(BOOKING_PATIENTS.map((patient) => [patient.id, patient]));
const seededBookingSearchItems: BookingListItem[] = Object.entries(SEEDED_BOOKINGS).flatMap(([patientId, orders]) => {
  const patient = bookingPatientByIdForSearch.get(patientId);
  return orders.map((booking: PlacedOrderSummary) => ({
    ...booking,
    patientId,
    patientName: patient?.name ?? patientId,
    mrn: patient?.mrn ?? "—",
    phoneMasked: patient?.phoneMasked ?? "—",
  }));
});

/* Bookings search records can be generated from seed data (module fallback)
   or from the live provider queue inside HomeShell. */
function getBookingSearchRecords(bookings: BookingListItem[]): SearchRecord[] {
  return bookings.map((booking) => {
    const anchor = getBookingAnchor(booking);
    const status = bookingStatusView(booking);
    return {
      id: `booking-${booking.code}`,
      scope: "bookings",
      title: booking.patientName,
      subtitle: `${anchor} · ${booking.mrn} · ${getBookingTestSummary(booking, 2)}`,
      meta: `${status.label} · ${booking.placedAt ?? "Today"} · ${getRouteLabel(booking)}`,
      keywords: ["booking", "appointment", ...getBookingSearchKeywords(booking)],
      code: anchor,
      destination: { kind: "booking", bookingCode: anchor },
      initials: getNameInitials(booking.patientName),
    };
  });
}

const seededBookingSearchRecords: SearchRecord[] = getBookingSearchRecords(seededBookingSearchItems);

/* Lab orders deep-link into the chart's Labs tab at the matching test row,
   reusing the existing focus + highlight machinery. */
const labSearchRecords: SearchRecord[] = [
  {
    id: "lab-001",
    scope: "labs",
    title: "HbA1c panel",
    subtitle: "Sokha Chann · Ordered today",
    meta: "Pending collection",
    keywords: ["lab", "order", "hba1c", "diabetes", "sokha"],
    destination: { kind: "record", tab: "labs", labKey: deltaLabKeys.hba1c },
    initials: "A1",
  },
  {
    id: "lab-002",
    scope: "labs",
    title: "Renal function",
    subtitle: "Sovann Tep · Due tomorrow",
    meta: "CKD stage 3",
    keywords: ["lab", "order", "renal", "kidney", "ckd"],
    destination: { kind: "record", tab: "labs", labKey: deltaLabKeys.creatinine },
    initials: "RF",
  },
  {
    id: "lab-003",
    scope: "labs",
    title: "Lipid profile",
    subtitle: "Dara Pich · Overdue",
    meta: "Hyperlipidemia",
    keywords: ["lab", "lipid", "cholesterol", "overdue"],
    destination: { kind: "record", tab: "labs", labKey: deltaLabKeys.ldl },
    initials: "LP",
  },
  {
    id: "lab-004",
    scope: "labs",
    title: "CBC",
    subtitle: "Sreymom Sok · Completed",
    meta: "Pregnancy review",
    keywords: ["lab", "cbc", "pregnancy"],
    destination: { kind: "record", tab: "labs", labKey: deltaLabKeys.hemoglobin },
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
    keywords: ["invoice", "billing", "unpaid", "payment", "sokha", "2048"],
    code: "INV-2048",
    destination: { kind: "page", page: "more" },
    initials: "$",
  },
  {
    id: "invoice-002",
    scope: "invoices",
    title: "Invoice INV-2049",
    subtitle: "Dara Pich · $28.00",
    meta: "Paid · 9 May 2026",
    keywords: ["invoice", "billing", "paid", "payment", "dara", "2049"],
    code: "INV-2049",
    destination: { kind: "page", page: "more" },
    initials: "$",
  },
  {
    id: "invoice-003",
    scope: "invoices",
    title: "Invoice INV-2051",
    subtitle: "Sovann Tep · $65.00",
    meta: "Needs review",
    keywords: ["invoice", "billing", "review", "payment", "sovann", "2051"],
    code: "INV-2051",
    destination: { kind: "page", page: "more" },
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
    destination: { kind: "page", page: "more" },
    initials: "DP",
  },
  {
    id: "staff-002",
    scope: "staff",
    title: "Nurse Lina",
    subtitle: "Triage nurse",
    meta: "On shift",
    keywords: ["nurse", "triage", "staff", "lina"],
    destination: { kind: "page", page: "more" },
    initials: "NL",
  },
  {
    id: "staff-003",
    scope: "staff",
    title: "Sokun Admin",
    subtitle: "Front desk",
    meta: "Bookings and invoices",
    keywords: ["staff", "admin", "front desk", "booking", "invoice"],
    destination: { kind: "page", page: "more" },
    initials: "SA",
  },
];

/* Care-plan signals land on the chart's Care plan tab with the next due item
   spelled out in the row itself. */
const carePlanSearchRecords: SearchRecord[] = [
  {
    id: "careplan-001",
    scope: "carePlan",
    title: "Care plan — Sokha Chann",
    subtitle: "Next due: HbA1c repeat · overdue since Jan 15",
    meta: "P-9134 · T2DM · CKD 3",
    keywords: ["care plan", "follow up", "hba1c", "repeat", "sokha", "diabetes", "overdue"],
    destination: { kind: "record", tab: "carePlan" },
    initials: "SC",
  },
  {
    id: "careplan-002",
    scope: "carePlan",
    title: "Care plan — Sovann Tep",
    subtitle: "Next due: renal function · due tomorrow",
    meta: "MRN-1008 · Heart failure · CKD 3",
    keywords: ["care plan", "follow up", "renal", "kidney", "sovann", "heart failure"],
    destination: { kind: "record", tab: "carePlan" },
    initials: "ST",
  },
];

/* Action shortcuts — navigation only, never destructive. */
const actionSearchRecords: SearchRecord[] = [
  {
    id: "action-order-labs",
    scope: "actions",
    title: "Order labs",
    subtitle: "Open the order catalog on the active chart",
    meta: "Shortcut",
    keywords: ["order", "labs", "catalog", "tests", "draft"],
    destination: { kind: "record", tab: "orders" },
    initials: "+",
  },
  {
    id: "action-new-patient",
    scope: "actions",
    title: "New patient",
    subtitle: "Open the patient list to register",
    meta: "Shortcut",
    keywords: ["new", "patient", "create", "register"],
    destination: { kind: "patients-list" },
    initials: "+",
  },
];

const specimenLabelById = new Map(specimenFilters.map((specimen) => [specimen.id, specimen.label]));
const categoryLabelById = new Map(orderCategories.map((category) => [category.id, category.label]));

/* Catalog tests are searchable by name, code, and category; a hit lands on the
   standalone Lab Catalog, not the patient Orders tab. */
function getCatalogSearchRecords(): SearchRecord[] {
  return orderItems.map((item) => ({
    id: `catalog-${item.id}`,
    scope: "catalog",
    title: item.name,
    subtitle: [
      item.code,
      item.specimens.map((id) => specimenLabelById.get(id) ?? id).join(" / "),
      item.tat,
      item.prep,
    ]
      .filter(Boolean)
      .join(" · "),
    meta: `${odrFormatMoney(item.price)} · ${categoryLabelById.get(item.categoryId) ?? item.categoryId}`,
    keywords: [item.code, categoryLabelById.get(item.categoryId) ?? "", "lab test", "catalog", item.prep ?? "", item.note ?? ""],
    code: item.code,
    destination: { kind: "catalog", catalog: { query: item.name, itemId: item.id } },
    initials: item.code.slice(0, 2),
  }));
}

function getPatientMrn(index: number) {
  /* index 0 is Sokha Chann — the demo chart's MRN so exact lookup works */
  return index === 0 ? "P-9134" : `MRN-${String(1001 + index).padStart(4, "0")}`;
}

function getPatientFlagText(patient: Patient) {
  if (patient.abnormalLabs) return "Abnormal labs";
  if (patient.overdueFollowUp) return "Overdue follow-up";
  if (patient.needsReview) return "Needs review";
  return "";
}

function getPatientSearchRecords(): SearchRecord[] {
  return patients.map((patient, index) => {
    const flag = getPatientFlagText(patient);
    const problemText = getClinicalProblemText(patient);
    const reviewLabels = getClinicalReviewLabels(patient);
    return {
      id: `patient-${index + 1}`,
      scope: "patients" as const,
      title: patient.name,
      subtitle: `${patient.khmerName} · ${patient.phone} · ${getPatientMrn(index)}`,
      meta: `${patient.age}${patient.sex === "female" ? "F" : "M"} · ${problemText}${flag ? ` · ${flag}` : ""}`,
      keywords: [
        patient.khmerName,
        patient.phone,
        getPatientMrn(index),
        patient.primaryCondition,
        ...patient.activeConditions,
        ...reviewLabels,
        patient.needsReview ? "needs review" : "",
        patient.overdueFollowUp ? "overdue follow-up" : "",
        patient.abnormalLabs ? "abnormal labs" : "",
        index === 0 ? "forte insurance" : "",
      ],
      code: getPatientMrn(index),
      destination: { kind: "record" as const, tab: "summary" as const },
      initials: patient.name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2),
    };
  });
}

function getGlobalSearchRecords(bookingRecords: SearchRecord[] = seededBookingSearchRecords) {
  return [
    ...getPatientSearchRecords(),
    ...bookingRecords,
    ...labSearchRecords,
    ...carePlanSearchRecords,
    ...getCatalogSearchRecords(),
    ...invoiceSearchRecords,
    ...staffSearchRecords,
    ...actionSearchRecords,
  ];
}

/* Idle-state list: what likely needs the doctor right now — flagged patients,
   bookings with results back or a waiting patient, then safe shortcuts. */
function getNeedsAttentionRecords(
  records: SearchRecord[],
  bookingRecords: SearchRecord[] = seededBookingSearchRecords,
): SearchRecord[] {
  const byId = new Map(records.map((record) => [record.id, record]));
  const flaggedPatients = records
    .filter((record) => record.scope === "patients" && /Abnormal labs|Overdue follow-up|Needs review/.test(record.meta))
    .slice(0, 2);
  const activeBookings = bookingRecords.filter((record) => /Results back|Flagged|Awaiting visit/.test(record.meta));

  return [
    ...flaggedPatients,
    ...activeBookings,
    byId.get("action-order-labs"),
    byId.get("action-new-patient"),
  ].filter((record): record is SearchRecord => Boolean(record));
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

const searchScopeRowLabels: Record<SearchRecordScope, string> = {
  patients: "Patients",
  bookings: "Bookings",
  labs: "Lab orders",
  invoices: "Invoices",
  staff: "Staff",
  catalog: "Lab test",
  carePlan: "Care plan",
  actions: "Shortcut",
};

function getSearchScopeLabel(scope: SearchRecordScope) {
  return searchScopeRowLabels[scope] ?? "All";
}

/* Deterministic ranking tiers — exact identifier first, then patients and
   care plans, bookings, lab orders/tests, billing/staff, shortcuts last. */
const searchScopeTier: Record<SearchRecordScope, number> = {
  patients: 6,
  carePlan: 6,
  bookings: 5,
  labs: 4,
  catalog: 4,
  invoices: 3,
  staff: 3,
  actions: 1,
};

function scoreSearchRecord(
  record: SearchRecord,
  tokens: string[],
  queryNorm: string,
  activeScope: SearchScopeId | null,
) {
  if (activeScope && record.scope !== activeScope) return 0;
  if (tokens.length === 0) return activeScope ? 1 : 0;

  const title = normalizeSearchText(record.title);
  const subtitle = normalizeSearchText(record.subtitle);
  const meta = normalizeSearchText(record.meta);
  const keywords = normalizeSearchText(record.keywords.join(" "));
  const code = record.code ? normalizeSearchText(record.code) : "";
  const haystack = `${title} ${subtitle} ${meta} ${keywords} ${code}`;

  if (!tokens.every((token) => haystack.includes(token))) return 0;

  const fieldScore = tokens.reduce((score, token) => {
    if (title.startsWith(token)) return score + 80;
    if (title.includes(token)) return score + 60;
    if (subtitle.includes(token)) return score + 40;
    if (meta.includes(token)) return score + 28;
    if (keywords.includes(token)) return score + 18;
    return score + 8; /* matched only via code */
  }, 0);

  /* whole-query equality with the identifier — MRN / booking / lab code */
  if (code && queryNorm === code) return 1_000_000 + fieldScore;

  return searchScopeTier[record.scope] * 1000 + fieldScore;
}

function getGlobalSearchResults(records: SearchRecord[], query: string, activeScope: SearchScopeId | null) {
  const tokens = getSearchTokens(query);
  const queryNorm = normalizeSearchText(query);

  return records
    .map((record, index) => ({
      record,
      index,
      score: scoreSearchRecord(record, tokens, queryNorm, activeScope),
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
  onOpenSettings,
}: {
  activePage: PageId;
  onPageChange: (page: PageId) => void;
  onOpenSearch: () => void;
  onOpenSettings: (section: SettingsSectionId) => void;
}) {
  return (
    <aside className="app-sidebar" aria-label="Primary navigation">
      <Logo />
      <nav className="sidebar-list">
        {navItems.map((item) =>
          item.id === "more" ? (
            <SidebarMoreMenu
              active={activePage === item.id}
              key={item.id}
              onOpenSettings={onOpenSettings}
              onPageChange={onPageChange}
            />
          ) : (
            <NavItemButton
              active={activePage === item.id}
              item={item}
              key={item.id}
              onOpenSearch={onOpenSearch}
              onPageChange={onPageChange}
            />
          ),
        )}
      </nav>
      <div className="sidebar-spacer" />
      <div className="sidebar-bottom">
        <NavItemButton
          active={activePage === settingsItem.id}
          item={settingsItem}
          onOpenSearch={onOpenSearch}
          onPageChange={onPageChange}
        />
        <AccountMenu onOpenSettings={onOpenSettings} />
      </div>
    </aside>
  );
}

function SidebarMoreMenu({
  active,
  onOpenSettings,
  onPageChange,
}: {
  active: boolean;
  onOpenSettings: (section: SettingsSectionId) => void;
  onPageChange: (page: PageId) => void;
}) {
  const [open, setOpen] = useState(false);
  const [geometry, setGeometry] = useState({ menuTop: 220, safeTop: 220, safeHeight: 271, safeY: 50 });
  const closeTimerRef = useRef<number | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const measure = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    const viewportHeight = window.innerHeight || 720;
    const menuHeight = 271;
    const triggerTop = rect?.top ?? 360;
    const triggerBottom = rect?.bottom ?? triggerTop + 56;
    const triggerMid = triggerTop + (rect?.height ?? 56) / 2;
    const menuTop = Math.min(Math.max(triggerMid - 140, 20), Math.max(20, viewportHeight - menuHeight - 20));
    const safeTop = Math.min(menuTop, triggerTop - 12);
    const safeBottom = Math.max(menuTop + menuHeight, triggerBottom + 12);
    const safeHeight = safeBottom - safeTop;
    const safeY = Math.min(82, Math.max(18, ((triggerMid - safeTop) / safeHeight) * 100));

    setGeometry({ menuTop, safeTop, safeHeight, safeY });
  }, []);

  const openMenu = () => {
    clearCloseTimer();
    measure();
    setOpen(true);
  };

  const scheduleClose = () => {
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => setOpen(false), 140);
  };

  useEffect(() => {
    if (!open) return;

    const onDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onResize = () => measure();

    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, [measure, open]);

  useEffect(() => () => clearCloseTimer(), [clearCloseTimer]);

  const goTo = (item: MoreMenuItem) => {
    setOpen(false);
    if (item.settings) {
      onOpenSettings(item.settings);
      return;
    }
    onPageChange(item.page ?? "more");
  };

  return (
    <div
      className="sidebar-more"
      onPointerEnter={clearCloseTimer}
      onPointerLeave={scheduleClose}
      ref={rootRef}
    >
      <button
        aria-current={active ? "page" : undefined}
        aria-expanded={open}
        aria-haspopup="menu"
        className={`rail-item${active || open ? " active" : ""}`}
        data-page="more"
        onClick={openMenu}
        onPointerEnter={openMenu}
        ref={triggerRef}
        type="button"
      >
        <NavIcon Icon={MoreIcon} active={active || open} activeVariant="solid" restVariant="stroke" />
        <span>More</span>
      </button>

      {open && (
        <>
          <div
            aria-hidden="true"
            className="sidebar-more-safe-zone"
            style={
              {
                "--safe-y": `${geometry.safeY}%`,
                height: `${geometry.safeHeight}px`,
                top: `${geometry.safeTop}px`,
              } as CSSProperties
            }
          />
          <div
            aria-label="More navigation"
            className="sidebar-more-menu"
            role="menu"
            style={{ top: geometry.menuTop } as CSSProperties}
          >
            <div className="sidebar-more-col">
              <MoreMenuSection group={moreMenuGroups[0]} onSelect={goTo} />
            </div>
            <div className="sidebar-more-col">
              <MoreMenuSection group={moreMenuGroups[1]} onSelect={goTo} />
              <MoreMenuSection group={moreMenuGroups[2]} onSelect={goTo} />
            </div>
            <div className="sidebar-more-col">
              <MoreMenuSection group={moreMenuGroups[3]} onSelect={goTo} />
              <MoreMenuSection group={moreMenuGroups[4]} onSelect={goTo} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function MoreMenuSection({
  group,
  onSelect,
}: {
  group: MoreMenuGroup;
  onSelect: (item: MoreMenuItem) => void;
}) {
  return (
    <section className="sidebar-more-section" aria-label={group.title}>
      <h2>{group.title}</h2>
      <div className="sidebar-more-items">
        {group.items.map((item) => (
          <button className="sidebar-more-item" key={item.label} onClick={() => onSelect(item)} role="menuitem" type="button">
            <span aria-hidden className="sidebar-more-item-icon">
              <item.Icon size={20} variant="stroke" />
            </span>
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

/* Compact account popover anchored to the sidebar avatar. Every row is a real
   destination inside Settings — no dead menu items. */
function AccountMenu({ onOpenSettings }: { onOpenSettings: (section: SettingsSectionId) => void }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const goTo = (section: SettingsSectionId) => {
    setOpen(false);
    onOpenSettings(section);
  };

  return (
    <div className="account-menu" ref={rootRef}>
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Account menu"
        className="avatar account-trigger"
        onClick={() => setOpen((v) => !v)}
        type="button"
      >
        PT
      </button>
      {open && (
        <div className="account-pop" role="menu">
          <div className="account-pop-id">
            <Avatar name="Phong Tuy" size="sm" tone="success" />
            <div className="account-pop-copy">
              <strong>Dr. Phong Tuy</strong>
              <span>leon@kura.med</span>
            </div>
            <Badge tone="success">Verified</Badge>
          </div>
          <ActionList
            sections={[
              {
                items: [
                  { label: "Profile", onClick: () => goTo("account") },
                  {
                    label: (
                      <span className="account-item-row">
                        Settings <kbd>⌘,</kbd>
                      </span>
                    ),
                    onClick: () => goTo("overview"),
                  },
                  { label: "Billing & payments", onClick: () => goTo("billing") },
                ],
              },
              {
                items: [{ destructive: true, label: "Log out", onClick: () => setOpen(false) }],
              },
            ]}
          />
        </div>
      )}
    </div>
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
      <span className="search-input-placeholder">Search Name, Khmer Name, MRN, Phone...</span>
      <span aria-hidden className="search-input-kbd">⌘K</span>
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

function ClinicalSummaryCell({
  patient,
}: {
  patient: Pick<Patient, "primaryCondition" | "activeConditions" | "reviewItems">;
}) {
  const primaryLabel = patient.primaryCondition.trim() || "Problem list not recorded";
  const activeLabels = patient.activeConditions.map((label) => label.trim()).filter(Boolean);
  const visibleActiveLabels = activeLabels.slice(0, 2);
  const hiddenActiveCount = activeLabels.length - visibleActiveLabels.length;
  const reviewLabels = getClinicalReviewLabels(patient);
  const fullSummary = getClinicalSummaryText(patient);

  return (
    <div className="clinical-summary-cell" title={fullSummary}>
      <div className="clinical-summary-main">
        <strong>{primaryLabel}</strong>
        {visibleActiveLabels.map((label) => (
          <span className="clinical-summary-secondary" key={label}>
            <span className="clinical-summary-separator">·</span>
            {label}
          </span>
        ))}
        {hiddenActiveCount > 0 && <span className="clinical-summary-more">+{hiddenActiveCount} more</span>}
      </div>
      {reviewLabels.length > 0 && (
        <div className="clinical-summary-review">
          <FigmaIcon src="/figma/icon-warning.svg" size={14} />
          <span>
            <strong>Review:</strong> {reviewLabels.join(", ")}
          </span>
        </div>
      )}
    </div>
  );
}

function PatientRow({ patient, onOpenPatient }: { patient: Patient; onOpenPatient: (patient: Patient) => void }) {
  const clinicalSummary = getClinicalSummaryText(patient);

  return (
    <button
      aria-label={`Open ${patient.name} record, ${patient.age} ${patient.sex}, ${patient.phone}${patient.overdueFollowUp ? ", overdue follow-up" : ""}. Clinical summary: ${clinicalSummary}`}
      className={`table-row patient-table-row acuity-${patient.acuity}`}
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
      <div
        className="table-cell last-seen-cell"
        title={patient.overdueFollowUp ? "Overdue follow-up" : undefined}
      >
        {patient.overdueFollowUp && <span aria-hidden className="overdue-dot" />}
        {patient.lastSeen}
      </div>
      <div className="table-cell clinical-summary-table-cell">
        <ClinicalSummaryCell patient={patient} />
      </div>
      <span aria-hidden className="row-chevron">
        <FigmaIcon src="/figma/icon-chevron-right.svg" size={16} />
      </span>
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
          <div className="table-cell sorted">Last seen <span className="sort-arrow">▲</span></div>
          <div className="table-cell">Clinical summary</div>
        </div>
        {pagePatients.length > 0 ? (
          pagePatients.map((patient) => (
            <PatientRow key={patient.name} patient={patient} onOpenPatient={onOpenPatient} />
          ))
        ) : (
          <div className="table-empty">
            <strong>No patients match these filters</strong>
            <span>Try clearing a filter, or search by name, Khmer name, MRN, or phone</span>
          </div>
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

/* Navigation only — encounter actions live in RecordHeader where the
   patient context is visible. */
function DetailHeader({ onBackToPatients, patientName }: { onBackToPatients: () => void; patientName: string }) {
  return (
    <header className="detail-header">
      <nav className="detail-breadcrumb" aria-label="Breadcrumb">
        <button aria-label="Back to patient table" type="button" onClick={onBackToPatients}>
          Patients
        </button>
        <ChevronRightIcon size={14} variant="stroke" />
        <strong>{patientName}</strong>
      </nav>
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

function RecordMetaLine({ patient, clinicalContext }: { patient: RecordPatient; clinicalContext: RecordClinicalContext }) {
  return (
    <p>
      <strong>{patient.age} y</strong>
      <span> · </span>
      <strong>{patient.sex}</strong>
      <span> · DOB </span>
      <strong>{patient.dob}</strong>
      <span> · MRN </span>
      <strong>{patient.mrn}</strong>
      <span> · Tel </span>
      <strong>{patient.tel}</strong>
      <span> · Insurance </span>
      <strong>{patient.insurance}</strong>
      {clinicalContext === "none" &&
        patient.problems.slice(0, 2).map((problem) => (
          <span key={problem.label}>
            <span> · </span>
            <strong>{problem.label}</strong>
          </span>
        ))}
    </p>
  );
}

/* Switch the active chart in place — no round-trip to the patient table.
   The list is the clinic's patients; selecting one swaps the header identity. */
function PatientSwitcher({
  patients,
  currentId,
  onSelect,
}: {
  patients: RecordPatient[];
  currentId: string;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="patient-switcher" ref={ref}>
      <button
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label="Switch patient"
        className="patient-switcher-trigger"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <ChevronDownIcon size={18} variant="stroke" />
      </button>
      {open && (
        <div aria-label="Switch patient" className="patient-switcher-menu" role="listbox">
          <p className="patient-switcher-label">Switch patient</p>
          {patients.map((patient) => {
            const active = patient.id === currentId;
            return (
              <button
                aria-selected={active}
                className={`patient-switcher-option${active ? " is-active" : ""}`}
                key={patient.id}
                onClick={() => {
                  onSelect(patient.id);
                  setOpen(false);
                }}
                role="option"
                type="button"
              >
                <span aria-hidden className="patient-switcher-avatar">
                  {patient.initials}
                </span>
                <span className="patient-switcher-copy">
                  <strong>{patient.name}</strong>
                  <span>
                    {patient.age} {patient.sex.charAt(0)} ·{" "}
                    {patient.problems.map((problem) => problem.label).slice(0, 2).join(" · ")}
                  </span>
                </span>
                {active && (
                  <span aria-hidden className="patient-switcher-check">
                    <CheckIcon size={16} variant="stroke" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
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

function RecordClinicalCompact({
  problems,
  flags,
  onExpand,
}: {
  problems: RecordBadgeData[];
  flags: RecordBadgeData[];
  onExpand: () => void;
}) {
  return (
    <div className="record-clinical-strip compact">
      <div className="record-chip-row">
        {problems.map((badge) => (
          <RecordBadge badge={badge} key={badge.label} />
        ))}
        {flags.length > 0 && <span className="record-chip-separator">·</span>}
        {flags.map((badge) => (
          <RecordBadge badge={badge} key={badge.label} />
        ))}
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

function RecordClinicalExpanded({
  groups,
  onCollapse,
}: {
  groups: RecordClinicalGroup[];
  onCollapse: () => void;
}) {
  return (
    <div className="record-clinical-strip expanded">
      <div className="record-expanded-context">
        <div className="record-expanded-groups">
          {groups.map((group) => (
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
  const { lineCount } = useOrderDraft();

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
              {tab.id === "orders" && lineCount > 0 && (
                <Counter count={lineCount} tone={active ? "brand" : "neutral"} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ----------------------- Clinical action layer ----------------------- */

type ClinicalDrawerId = "note" | "rx" | "icd" | "refer" | "followup" | "finish";

function NoteDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { note, setNote, noteStatus, saveNoteDraft, signNote } = useEncounter();
  const signed = noteStatus === "signed";

  return (
    <Drawer
      footer={
        signed ? (
          <span className="enc-signed-line">
            <CheckIcon size={14} variant="stroke" />
            Signed &amp; locked — part of the legal record
          </span>
        ) : (
          <>
            <UiButton intent="secondary" onClick={() => { saveNoteDraft(); onClose(); }}>
              Save draft
            </UiButton>
            <UiButton intent="primary" onClick={() => { signNote(); onClose(); }}>
              Sign note
            </UiButton>
          </>
        )
      }
      onClose={onClose}
      open={open}
      subtitle={signed ? "Signed · locked" : noteStatus === "draft" ? "Draft — unsigned" : "SOAP note · seeded from today's chart signals"}
      title="Visit note"
    >
      <div className="enc-form">
        <label className="enc-field">
          <span>Reason for visit</span>
          <input disabled={signed} onChange={(event) => setNote({ reason: event.target.value })} value={note.reason} />
        </label>
        {(
          [
            ["s", "Subjective"],
            ["o", "Objective"],
            ["a", "Assessment"],
            ["p", "Plan"],
          ] as const
        ).map(([key, label]) => (
          <label className="enc-field" key={key}>
            <span>{label}</span>
            <textarea disabled={signed} onChange={(event) => setNote({ [key]: event.target.value })} rows={3} value={note[key]} />
          </label>
        ))}
        <p className="enc-hint">Drafted from chart signals. Review before signing.</p>
      </div>
    </Drawer>
  );
}

function RxDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { meds, addMedFromRx } = useEncounter();
  const [selected, setSelected] = useState<RxFormularyItem | null>(null);
  const [freq, setFreq] = useState("OD");
  const [duration, setDuration] = useState("90 days");
  const onMeds = (item: RxFormularyItem) => meds.some((med) => med.title.startsWith(item.drug));
  const freqLabel = rxFrequencies.find((option) => option.value === freq)?.label ?? freq;

  const sign = () => {
    if (!selected) return;
    addMedFromRx(selected, freqLabel.split(" — ")[1] ?? freqLabel);
    setSelected(null);
    onClose();
  };

  return (
    <Drawer
      footer={
        <>
          <UiButton intent="secondary" onClick={onClose}>
            Cancel
          </UiButton>
          <UiButton disabled={!selected} intent="primary" onClick={sign}>
            Sign &amp; PDF Rx
          </UiButton>
        </>
      }
      onClose={onClose}
      open={open}
      subtitle="Phase 1 — signed PDF, accepted by any pharmacy"
      title="Write prescription"
    >
      <div className="enc-form">
        <div className="enc-field">
          <span>Formulary</span>
          <div className="enc-options">
            {rxFormulary.map((item) => {
              const disabled = onMeds(item);
              return (
                <button
                  className={`enc-option${selected?.drug === item.drug ? " is-selected" : ""}`}
                  disabled={disabled}
                  key={item.drug}
                  onClick={() => {
                    setSelected(item);
                    setFreq(item.defaultFreq);
                  }}
                  type="button"
                >
                  <strong>
                    {item.drug} {item.dose}
                  </strong>
                  <span>{disabled ? "Already on medication list" : item.class}</span>
                </button>
              );
            })}
          </div>
        </div>
        {selected && (
          <>
            <div className="enc-field-row">
              <label className="enc-field">
                <span>Frequency</span>
                <select onChange={(event) => setFreq(event.target.value)} value={freq}>
                  {rxFrequencies.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="enc-field">
                <span>Duration</span>
                <select onChange={(event) => setDuration(event.target.value)} value={duration}>
                  <option>30 days</option>
                  <option>60 days</option>
                  <option>90 days</option>
                </select>
              </label>
            </div>
            <div className="enc-checks">
              <p>
                <CheckIcon size={13} variant="stroke" /> No major interactions — DDI source: First Databank
              </p>
              <p>
                <CheckIcon size={13} variant="stroke" /> No allergy conflict — on file: Penicillin
              </p>
            </div>
            <p className="enc-hint">
              Sig: {selected.drug} {selected.dose} PO {freq} · {duration} · refills 0
            </p>
          </>
        )}
      </div>
    </Drawer>
  );
}

function DiagnosisDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { icdCodes, addIcd } = useEncounter();
  const [query, setQuery] = useState("");
  const normalized = query.trim().toLowerCase();
  const results = icdLibrary.filter(
    (entry) => !normalized || entry.code.toLowerCase().includes(normalized) || entry.label.toLowerCase().includes(normalized),
  );

  return (
    <Drawer onClose={onClose} open={open} subtitle="Attaches to the encounter and the claim" title="Add ICD-10 diagnosis">
      <div className="enc-form">
        <label className="enc-field">
          <span>Search</span>
          <input onChange={(event) => setQuery(event.target.value)} placeholder="Code or description…" value={query} />
        </label>
        <div className="enc-options">
          {results.map((entry) => {
            const onChart = icdCodes.includes(entry.code);
            return (
              <button
                className="enc-option"
                disabled={onChart}
                key={entry.code}
                onClick={() => addIcd(entry.code)}
                type="button"
              >
                <strong>
                  <code>{entry.code}</code> {entry.label}
                </strong>
                <span>{onChart ? "Already on chart" : `${entry.trigger}${entry.confidence === "low" ? " · low confidence" : ""}`}</span>
              </button>
            );
          })}
        </div>
      </div>
    </Drawer>
  );
}

function ReferDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { referral, sendReferral } = useEncounter();
  const [service, setService] = useState(referralServices[0]);
  const [destination, setDestination] = useState<string | null>(null);
  const [urgency, setUrgency] = useState("Routine");

  if (referral) {
    return (
      <Drawer onClose={onClose} open={open} subtitle="Tracked in Referrals · withdrawable for 24h" title="Referral sent">
        <div className="enc-form">
          <p className="enc-sent-code">{referral.code}</p>
          <p className="enc-hint">
            {referral.service} — {referral.destination} · {referral.urgency}. The patient gets a Telegram message when
            the hospital confirms a slot. Letter carries 12 months of labs, current meds, and allergies.
          </p>
        </div>
      </Drawer>
    );
  }

  return (
    <Drawer
      footer={
        <>
          <UiButton intent="secondary" onClick={onClose}>
            Cancel
          </UiButton>
          <UiButton disabled={!destination} intent="primary" onClick={() => destination && sendReferral({ service, destination, urgency })}>
            Send referral
          </UiButton>
        </>
      }
      onClose={onClose}
      open={open}
      subtitle="Ranked by partner tier · distance · insurance match"
      title="Hospital referral"
    >
      <div className="enc-form">
        <div className="enc-field">
          <span>Service</span>
          <div className="enc-pills">
            {referralServices.map((option) => (
              <button
                className={`enc-pill${service === option ? " is-selected" : ""}`}
                key={option}
                onClick={() => setService(option)}
                type="button"
              >
                {option}
              </button>
            ))}
          </div>
        </div>
        <div className="enc-field">
          <span>Destination</span>
          <div className="enc-options">
            {referralDestinations.map((dest) => (
              <button
                className={`enc-option${destination === dest.name ? " is-selected" : ""}`}
                key={dest.name}
                onClick={() => setDestination(dest.name)}
                type="button"
              >
                <strong>{dest.name}</strong>
                <span>
                  {dest.distance} · next {dest.nextSlot} · {dest.cost} · {dest.insurance}
                </span>
              </button>
            ))}
          </div>
        </div>
        <div className="enc-field">
          <span>Urgency</span>
          <div className="enc-pills">
            {["Routine", "Urgent (1 wk)", "Stat (48h)"].map((option) => (
              <button
                className={`enc-pill${urgency === option ? " is-selected" : ""}`}
                key={option}
                onClick={() => setUrgency(option)}
                type="button"
              >
                {option}
              </button>
            ))}
          </div>
        </div>
        <p className="enc-hint">Attachments: labs (12 mo) · current meds + allergies · signed by you, audit-logged.</p>
      </div>
    </Drawer>
  );
}

function FollowUpDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { followUp, scheduleFollowUp } = useEncounter();

  return (
    <Drawer onClose={onClose} open={open} subtitle="Telegram reminder to 070 ··· 496" title="Schedule follow-up">
      <div className="enc-form">
        {followUp ? (
          <p className="enc-hint">
            <CheckIcon size={13} variant="stroke" /> Follow-up scheduled in <strong>{followUp}</strong> — reminder goes
            out via Telegram, no booking needed.
          </p>
        ) : (
          <div className="enc-options">
            {followUpOptions.map((option) => (
              <button
                className="enc-option"
                key={option.id}
                onClick={() => {
                  scheduleFollowUp(option.label);
                  onClose();
                }}
                type="button"
              >
                <strong>
                  {option.label}
                  {option.recommended ? " · recommended" : ""}
                </strong>
                <span>{option.detail}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </Drawer>
  );
}

/* Finish-visit gate — one review surface over the existing claim checklist.
   Reads encounter state only; the claim data model stays untouched. */
function FinishVisitDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { claimChecks, claimReady, noteStatus, followUp } = useEncounter();
  const { openDrawer } = useClinicalDrawers();
  const remaining = claimChecks.filter((check) => !check.done).length;
  const isDone = (id: string) => claimChecks.some((check) => check.id === id && check.done);

  const rows: Array<{
    id: string;
    label: string;
    done: boolean;
    detail: string;
    actions?: Array<{ label: string; drawer: ClinicalDrawerId }>;
  }> = [
    {
      id: "note",
      label: "Visit note",
      done: isDone("note"),
      detail:
        noteStatus === "signed"
          ? "Signed — part of the legal record"
          : noteStatus === "draft"
            ? "Draft saved — not yet signed"
            : "No note for today's visit",
      actions: isDone("note") ? undefined : [{ label: noteStatus === "draft" ? "Resume" : "Add note", drawer: "note" }],
    },
    {
      id: "icd",
      label: "ICD-10 diagnosis",
      done: isDone("icd"),
      detail: isDone("icd") ? "Diagnosis coded" : "No code on the encounter",
      actions: isDone("icd") ? undefined : [{ label: "Add code", drawer: "icd" }],
    },
    {
      id: "labs",
      label: "Lab evidence",
      done: isDone("labs"),
      detail: isDone("labs") ? "HbA1c results on file" : "No supporting results",
    },
    {
      id: "identity",
      label: "Identity / insurance",
      done: isDone("identity"),
      detail: isDone("identity") ? "Identity verified · Forte active" : "Verification pending",
    },
    {
      id: "therapy",
      label: "Therapy plan",
      done: isDone("therapy"),
      detail: isDone("therapy") ? "Rx, referral, or follow-up in place" : "No Rx, referral, or follow-up yet",
      actions: isDone("therapy")
        ? undefined
        : [
            { label: "Prescribe", drawer: "rx" },
            { label: "Refer", drawer: "refer" },
            { label: "Schedule", drawer: "followup" },
          ],
    },
    {
      id: "followup",
      label: "Follow-up",
      done: followUp !== null,
      detail: followUp ? `Follow-up in ${followUp}` : "Not scheduled",
      actions: followUp ? undefined : [{ label: "Schedule", drawer: "followup" }],
    },
  ];

  return (
    <Drawer
      footer={
        <>
          {claimReady ? (
            <span className="enc-signed-line">
              <CheckIcon size={14} variant="stroke" />
              Ready for claim review
            </span>
          ) : (
            <span className="finish-claim-line">Claim · {remaining} steps left</span>
          )}
          <UiButton intent="secondary" onClick={onClose}>
            Close
          </UiButton>
        </>
      }
      onClose={onClose}
      open={open}
      subtitle="Required before claim readiness"
      title="Finish today's visit"
    >
      <div className="finish-check-list">
        {rows.map((row) => (
          <div className={`finish-check-row${row.done ? " done" : ""}`} key={row.id}>
            {row.done ? <CheckIcon size={14} variant="stroke" /> : <span className="summary-check-dot" aria-hidden />}
            <div className="finish-check-copy">
              <strong>{row.label}</strong>
              <span>{row.detail}</span>
            </div>
            {row.actions && (
              <div className="finish-check-actions">
                {row.actions.map((action) => (
                  <button className="summary-gap-action" key={action.label} onClick={() => openDrawer(action.drawer)} type="button">
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </Drawer>
  );
}

/* Clinical actions open from where their context lives — note/coding/therapy
   from the visit checklist, prescribing from Medications, referral from Next
   actions — so one provider hosts the drawers instead of a header menu. */
type ClinicalDrawerApi = { openDrawer: (id: ClinicalDrawerId) => void };

const ClinicalDrawerContext = createContext<ClinicalDrawerApi | null>(null);

function useClinicalDrawers(): ClinicalDrawerApi {
  const api = useContext(ClinicalDrawerContext);
  if (!api) throw new Error("useClinicalDrawers must be used inside ClinicalDrawerProvider");
  return api;
}

function ClinicalDrawerProvider({ children }: { children: ReactNode }) {
  const [activeDrawer, setActiveDrawer] = useState<ClinicalDrawerId | null>(null);
  const close = () => setActiveDrawer(null);
  const api = useMemo<ClinicalDrawerApi>(() => ({ openDrawer: setActiveDrawer }), []);

  return (
    <ClinicalDrawerContext.Provider value={api}>
      {children}
      <NoteDrawer onClose={close} open={activeDrawer === "note"} />
      <RxDrawer onClose={close} open={activeDrawer === "rx"} />
      <DiagnosisDrawer onClose={close} open={activeDrawer === "icd"} />
      <ReferDrawer onClose={close} open={activeDrawer === "refer"} />
      <FollowUpDrawer onClose={close} open={activeDrawer === "followup"} />
      <FinishVisitDrawer onClose={close} open={activeDrawer === "finish"} />
    </ClinicalDrawerContext.Provider>
  );
}

function RecordHeader({
  activeTab,
  patient,
  patients,
  onSwitchPatient,
  clinicalContext = "compact",
  onTabChange,
}: {
  activeTab: RecordTabId;
  patient: RecordPatient;
  patients: RecordPatient[];
  onSwitchPatient: (id: string) => void;
  clinicalContext?: RecordClinicalContext;
  onTabChange: (tab: RecordTabId) => void;
}) {
  const [currentContext, setCurrentContext] = useState<RecordClinicalContext>(clinicalContext);
  const { draft, lineCount } = useOrderDraft();
  const { claimChecks, claimReady, noteStatus } = useEncounter();
  const { openDrawer } = useClinicalDrawers();
  const [cartOpen, setCartOpen] = useState(false);
  const claimRemaining = claimChecks.filter((check) => !check.done).length;

  return (
    <section className="record-header" aria-label="Patient record header">
      <div className="record-identity-row">
        <div className="record-avatar">{patient.initials}</div>
        <div className="record-identity">
          <div className="record-identity-name">
            <h1>{patient.name}</h1>
            <PatientSwitcher currentId={patient.id} onSelect={onSwitchPatient} patients={patients} />
          </div>
          <RecordMetaLine clinicalContext={currentContext} patient={patient} />
        </div>
        <div className="record-header-controls">
          <div className="odr-trigger-wrap" onMouseDown={(event) => event.stopPropagation()}>
            <Button
              aria-expanded={cartOpen}
              aria-haspopup="dialog"
              className="quick-order-button"
              icon={<PlusIcon size={14} variant="stroke" />}
              onClick={() => setCartOpen((open) => !open)}
            >
              Lab order
              {lineCount > 0 && (
                <Counter count={lineCount} tone={draft.status === "placed" ? "success" : "brand"} />
              )}
            </Button>
            {cartOpen && (
              <OrderDraftPopover onClose={() => setCartOpen(false)} onOpenOrders={() => onTabChange("orders")} />
            )}
          </div>
          <UiButton
            className="record-action-button"
            intent="secondary"
            leadingIcon={<NoteIcon size={14} variant="stroke" />}
            onClick={() => openDrawer("note")}
            size="sm"
          >
            Visit note
            {noteStatus !== "none" && (
              <Badge tone={noteStatus === "signed" ? "success" : "neutral"}>
                {noteStatus === "signed" ? "Signed" : "Draft"}
              </Badge>
            )}
          </UiButton>
          <UiButton
            className="record-action-button"
            intent="secondary"
            leadingIcon={<CheckIcon size={14} variant="stroke" />}
            onClick={() => openDrawer("finish")}
            size="sm"
          >
            Finish visit
            <Badge tone={claimReady ? "success" : "neutral"}>
              {claimReady ? "Ready" : `${claimRemaining} left`}
            </Badge>
          </UiButton>
        </div>
      </div>
      {currentContext === "compact" && (
        <RecordClinicalCompact
          flags={patient.flags}
          onExpand={() => setCurrentContext("expanded")}
          problems={patient.problems}
        />
      )}
      {currentContext === "expanded" && (
        <RecordClinicalExpanded
          groups={
            patient.id === "sokha-chan"
              ? recordExpandedGroups
              : [
                  { label: "PROBLEMS", badges: patient.problems },
                  { label: "RECENT ABNORMAL", badges: patient.flags },
                ]
          }
          onCollapse={() => setCurrentContext("compact")}
        />
      )}
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

/* Active ICD-10 codes + a quiet coding-review disclosure. The chart stays
   primary: possible gaps collapse to one line, and the CTA opens the ICD
   review drawer — never a one-click add from Summary. */
function SummaryDiagnosisCodes() {
  const { icdCodes: activeCodes, removeIcd } = useEncounter();
  const { openDrawer } = useClinicalDrawers();
  const [reviewOpen, setReviewOpen] = useState(false);
  const active = activeCodes
    .map((code) => icdLibrary.find((candidate) => candidate.code === code))
    .filter((entry): entry is IcdEntry => Boolean(entry));
  const gaps = icdCandidates.filter((candidate) => !activeCodes.includes(candidate.code));

  return (
    <div className="summary-icd">
      <div className="summary-icd-stage">
        <span>Coded diagnoses</span>
        <span>{active.length} active</span>
      </div>
      <div className="summary-icd-active">
        {active.length === 0 ? (
          <p className="summary-icd-empty">No coded diagnoses — open the coding review below.</p>
        ) : (
          active.map((entry) => (
            <span className="summary-icd-chip" key={entry.code}>
              <code>{entry.code}</code>
              <span>{entry.label}</span>
              <button aria-label={`Remove ${entry.code}`} onClick={() => removeIcd(entry.code)} type="button">
                <CloseSmallIcon size={12} variant="stroke" />
              </button>
            </span>
          ))
        )}
      </div>
      {gaps.length > 0 && (
        <div className="summary-review-block">
          <button
            aria-expanded={reviewOpen}
            className="summary-review-toggle"
            onClick={() => setReviewOpen((open) => !open)}
            type="button"
          >
            <ChevronRightIcon size={14} variant="stroke" />
            <span>Coding review</span>
            <span className="summary-review-count">
              {gaps.length} possible gap{gaps.length === 1 ? "" : "s"}
            </span>
          </button>
          {reviewOpen && (
            <div className="summary-review-rows">
              {gaps.map((entry) => (
                <div className="summary-review-row" key={entry.code}>
                  <div className="summary-review-copy">
                    <strong>
                      Review <code>{entry.code}</code> {entry.label}
                    </strong>
                    <p>
                      {entry.reviewMeta ?? entry.trigger}
                      {entry.confidence === "low" && " · low confidence"}
                    </p>
                  </div>
                  <button className="summary-gap-action" onClick={() => openDrawer("icd")} type="button">
                    {entry.confidence === "low" ? "Review" : "Review code"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
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
      <SummaryDiagnosisCodes />
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

function SummaryStatusPill({ status }: { status: SummaryLabStatus }) {
  const label =
    status === "critical" ? "Critical" : status === "watch" ? "Repeat due" : status === "abnormal" ? "Abnormal" : "In range";
  return <span className={`summary-status-pill ${status}`}>{label}</span>;
}

/* Fly-to-cart: a brand dot arcs from the CTA to the header "Lab order"
   button, then its counter pulses. Skipped under reduced motion. */
function flyToCart(fromRect: DOMRect) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const target = document.querySelector(".odr-trigger-wrap");
  if (!target) return;
  const to = target.getBoundingClientRect();
  const dot = document.createElement("span");
  dot.className = "odr-fly";
  dot.style.left = `${fromRect.left + fromRect.width / 2}px`;
  dot.style.top = `${fromRect.top + fromRect.height / 2}px`;
  document.body.appendChild(dot);
  void dot.getBoundingClientRect();
  dot.style.transform = `translate(${to.left + to.width / 2 - fromRect.left - fromRect.width / 2}px, ${
    to.top + to.height / 2 - fromRect.top - fromRect.height / 2
  }px) scale(0.35)`;
  dot.style.opacity = "0.3";
  const finish = () => {
    if (!dot.isConnected) return;
    dot.remove();
    const counter = target.querySelector(".kui-counter");
    counter?.classList.add("odr-counter-pulse");
    counter?.addEventListener("animationend", () => counter.classList.remove("odr-counter-pulse"), { once: true });
  };
  dot.addEventListener("transitionend", finish, { once: true });
  window.setTimeout(finish, 800);
}

function LabPreviewRowDetail({ row, onOpenLabsAt }: { row: LabPreviewEntry; onOpenLabsAt: (labKey: string) => void }) {
  const { addLabTest, plannedLabKeys, removeLabTest } = useOrderDraft();
  const d = row.detail;
  const planned = plannedLabKeys.has(row.key);
  /* "HbA1c (%)" → "HbA1c" — parentheticals don't belong on a button */
  const shortName = d.labName.replace(/\s*\(.*\)$/, "");

  const drawsLabel = `${d.drawCount} ${d.drawCount === 1 ? "draw" : "draws"}`;
  const needsAction = d.group === "watch" || d.group === "out";

  return (
    <div className={`summary-lab-detail tone-${d.severityTone ?? "ok"}`}>
      <span className="summary-lab-detail-marker" aria-hidden />
      <div className="summary-lab-detail-copy">
        <p className={`summary-lab-reason tone-${d.severityTone ?? "ok"}`}>{d.reasonText}</p>
        {d.evidence && <p className="summary-lab-subline">{d.evidence}</p>}
      </div>
      <div className="summary-lab-detail-actions">
        <button
          aria-label={`Open ${shortName} full history, ${drawsLabel}`}
          className="summary-inline-link"
          onClick={() => onOpenLabsAt(row.key)}
          type="button"
        >
          <span>Full history · {drawsLabel}</span>
          <ArrowRightIcon size={14} variant="stroke" />
        </button>
        <UiButton
          aria-label={
            planned ? `Remove repeat ${shortName} from lab order` : `Add repeat ${shortName} to lab order`
          }
          className={planned ? "summary-lab-remove" : undefined}
          intent={planned ? "ghost" : needsAction ? "primary" : "outline"}
          leadingIcon={planned ? <CloseSmallIcon size={14} variant="stroke" /> : <PlusIcon size={14} variant="stroke" />}
          onClick={(event) => {
            if (planned) {
              removeLabTest(row.key);
              return;
            }
            const fromRect = event.currentTarget.getBoundingClientRect();
            addLabTest(row.key, {
              labName: d.labName,
              reasonText: d.reasonText,
              severityTone: d.severityTone,
              source: d.group === "out" ? "labs-followup" : "labs-suggested",
            });
            flyToCart(fromRect);
          }}
          size="sm"
        >
          {planned
            ? "Remove"
            : d.group === "watch"
              ? `Repeat ${shortName}`
              : d.group === "out"
                ? `Re-test ${shortName}`
                : "Order again"}
        </UiButton>
      </div>
    </div>
  );
}

function LabHistoryPreview({ onOpenLabs, onOpenLabsAt }: { onOpenLabs: () => void; onOpenLabsAt: (labKey: string) => void }) {
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

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
      <div className="summary-lab-table" aria-label="Lab history preview">
        <div className="summary-lab-header" aria-hidden>
          <span>TEST GROUP</span>
          <span>MARKER</span>
          <span>VALUE</span>
          <span>TREND</span>
          <span>STATUS</span>
          <span>LAST RESULT</span>
          <span />
        </div>
        {summaryLabRows.map((row) => {
          const expanded = expandedKey === row.key;

          return (
            <div key={row.group}>
              <button
                aria-expanded={expanded}
                className={`summary-lab-row${expanded ? " is-expanded" : ""}`}
                onClick={() => setExpandedKey(expanded ? null : row.key)}
                type="button"
              >
                <span className="summary-lab-group">
                  <strong>{row.group}</strong>
                  {row.groupMeta && <small>{row.groupMeta}</small>}
                </span>
                <span className="summary-lab-latest">
                  <strong>{row.latestLabel}</strong>
                  <small>{row.reference}</small>
                </span>
                <span className={`summary-lab-value tone-${row.latestTone}`}>
                  <strong>{row.latestValue ?? "—"}</strong>
                  {row.latestValue && row.latestUnit && <em>{row.latestUnit}</em>}
                </span>
                <span>
                  <LabMiniTrend labKey={row.key} />
                </span>
                <span>
                  <SummaryStatusPill status={row.status} />
                </span>
                <span className="summary-lab-last">{row.lastResult}</span>
                <span className="summary-lab-chevron" aria-hidden>›</span>
              </button>
              <div className={`summary-lab-expand${expanded ? " is-open" : ""}`} inert={!expanded}>
                <div>
                  <LabPreviewRowDetail onOpenLabsAt={onOpenLabsAt} row={row} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* Active meds stay primary; therapy logic collapses to one quiet review row.
   Candidates already covered by an active medication are filtered out, and
   review-mode candidates (e.g. in-range lipids) never surface here — they
   belong to the Care plan. The CTA opens the Rx drawer; Summary never adds
   a medication directly. */
function MedicationsSection() {
  const { meds } = useEncounter();
  const { openDrawer } = useClinicalDrawers();
  const therapySignals = rxCandidates.filter(
    (candidate) =>
      candidate.mode !== "review" &&
      !meds.some((med) => med.title.toLowerCase().startsWith(candidate.drug.toLowerCase())),
  );
  const therapyLead = therapySignals[0];

  return (
    <section className="summary-section" id="summary-medications" aria-labelledby="summary-medications-title">
      <div className="summary-section-heading">
        <PillIcon size={20} variant="stroke" />
        <h3 id="summary-medications-title">Medications</h3>
        <button className="summary-gap-action summary-heading-action" onClick={() => openDrawer("rx")} type="button">
          Prescribe
        </button>
      </div>
      <div className="summary-section-list">
        {meds.length === 0 ? (
          <p className="summary-icd-empty">No medications on file — use Prescribe to add one.</p>
        ) : (
          meds.map((item) => (
            <div className="summary-med-row" key={item.title}>
              <SummaryItemRow item={item} />
              {item.ai && <span className="summary-ai-flag">AI</span>}
              {item.rx && <span className="summary-ai-flag rx">RX</span>}
            </div>
          ))
        )}
      </div>
      {therapyLead && (
        <div className="summary-review-block">
          <div className="summary-review-row">
            <div className="summary-review-copy">
              <strong>Therapy review</strong>
              <p>
                {therapyLead.linkedProblem} ·{" "}
                {/^[A-Z][a-z]/.test(therapyLead.rationale)
                  ? therapyLead.rationale.charAt(0).toLowerCase() + therapyLead.rationale.slice(1)
                  : therapyLead.rationale}
              </p>
            </div>
            <button className="summary-gap-action" onClick={() => openDrawer("rx")} type="button">
              Review therapy
            </button>
          </div>
        </div>
      )}
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

function SummaryAttentionHeader({ actionCount, blockerCount }: { actionCount: number; blockerCount: number }) {
  return (
    <header className="summary-attention-head">
      <div>
        <h2 className="summary-attention-title">Needs attention</h2>
        <p className="summary-attention-meta">
          {actionCount} action{actionCount === 1 ? "" : "s"} · {blockerCount} visit blocker
          {blockerCount === 1 ? "" : "s"}
        </p>
      </div>
    </header>
  );
}

/* Visit completion is a blocker queue, not a second checklist. Completed items
   collapse so doctors scan what still prevents the visit from closing. */
function SummaryFinishVisitSection() {
  const { claimChecks, claimReady, noteStatus, followUp } = useEncounter();
  const { openDrawer } = useClinicalDrawers();
  const [completeOpen, setCompleteOpen] = useState(false);

  /* Display copy only — claimChecks data and claim logic stay untouched. */
  const checkCopy = (check: EncounterApi["claimChecks"][number]): string => {
    if (check.id === "note") {
      return noteStatus === "signed" ? "Note signed" : noteStatus === "draft" ? "Note unsigned · draft saved" : "Note unsigned";
    }
    if (check.id === "icd") return check.done ? "Diagnosis ready" : "Diagnosis missing";
    if (check.id === "therapy") return check.done ? "Therapy plan in place" : "Therapy plan missing";
    return check.label;
  };

  const checkAction = (check: EncounterApi["claimChecks"][number]): { label: string; drawer: ClinicalDrawerId } | null => {
    if (check.done) return null;
    if (check.id === "note") return { label: noteStatus === "draft" ? "Resume" : "Add note", drawer: "note" };
    if (check.id === "icd") return { label: "Add code", drawer: "icd" };
    if (check.id === "therapy") return { label: "Prescribe", drawer: "rx" };
    return null;
  };

  const checkMeta = (check: EncounterApi["claimChecks"][number]): string => {
    if (check.id === "note") return noteStatus === "draft" ? "Draft saved · sign before claim" : "Required before claim";
    if (check.id === "icd") return "Diagnosis coding required";
    if (check.id === "therapy") return "Treatment plan required";
    return "Required before claim";
  };

  const pendingRows = [
    ...claimChecks
      .filter((check) => !check.done)
      .map((check) => ({
        id: check.id,
        title: checkCopy(check),
        meta: checkMeta(check),
        action: checkAction(check),
      })),
    ...(followUp
      ? []
      : [
          {
            id: "followup",
            title: "Follow-up not scheduled",
            meta: "Set review cadence before closing",
            action: { label: "Schedule", drawer: "followup" as ClinicalDrawerId },
          },
        ]),
  ];
  const completedRows = [
    ...claimChecks
      .filter((check) => check.done)
      .map((check) => ({
        id: check.id,
        title: checkCopy(check),
      })),
    ...(followUp ? [{ id: "followup", title: `Follow-up in ${followUp}` }] : []),
  ];
  const remaining = pendingRows.length;
  const visitReady = claimReady && remaining === 0;

  return (
    <section className="summary-rail-section">
      <div className="summary-rail-title">
        <h3 className="summary-rail-kicker">Finish visit</h3>
        <Badge tone={visitReady ? "success" : "neutral"}>{visitReady ? "Ready" : `${remaining} left`}</Badge>
      </div>
      <p className="summary-rail-helper">Required before claim submission</p>
      <div className="summary-check-list">
        {pendingRows.length === 0 && (
          <div className="summary-check-row done">
            <CheckIcon size={12} variant="stroke" />
            <span>Visit blockers complete</span>
          </div>
        )}
        {pendingRows.map((row) => {
          const action = row.action;
          return (
            <div className="summary-check-row summary-check-row-pending" key={row.id}>
              <span className="summary-check-dot" aria-hidden />
              <span className="summary-check-copy">
                <strong>{row.title}</strong>
                <small>{row.meta}</small>
              </span>
              {action && (
                <button className="summary-gap-action" onClick={() => openDrawer(action.drawer)} type="button">
                  {action.label}
                </button>
              )}
            </div>
          );
        })}
        {completedRows.length > 0 && (
          <>
            <button
              aria-expanded={completeOpen}
              className="summary-check-complete-toggle"
              onClick={() => setCompleteOpen((open) => !open)}
              type="button"
            >
              <ChevronRightIcon size={12} variant="stroke" />
              <span>{completedRows.length} complete</span>
            </button>
            {completeOpen && (
              <div className="summary-check-complete-list">
                {completedRows.map((row) => (
                  <div className="summary-check-row done" key={row.id}>
                    <CheckIcon size={12} variant="stroke" />
                    <span>{row.title}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </section>
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

const BOOKING_STATUS_BADGE: Record<string, { tone: "neutral" | "warning" | "success"; label: string }> = {
  scheduled: { tone: "neutral", label: "Scheduled" },
  "in-progress": { tone: "warning", label: "In progress" },
  "results-back": { tone: "success", label: "Results back" },
};

function SummaryDoNextSection() {
  const { addLabTest, plannedLabKeys, removeLabTest } = useOrderDraft();
  const { referral } = useEncounter();
  const { openDrawer } = useClinicalDrawers();
  const [showAll, setShowAll] = useState(false);

  const activeRows = [...careGapRows]
    .filter((row) => row.tone !== "muted")
    .sort((a, b) => {
      const aScore = a.order ? 0 : a.referral ? 1 : 2;
      const bScore = b.order ? 0 : b.referral ? 1 : 2;
      return aScore - bScore;
    });
  const visibleRows = showAll ? activeRows : activeRows.slice(0, 2);

  return (
    <section className="summary-rail-section">
      <div className="summary-rail-title">
        <h3 className="summary-rail-kicker">Do next</h3>
        <Counter count={activeRows.length} />
      </div>
      <div className="summary-rail-list">
        {visibleRows.map((row, index) => {
          const planned = row.order ? plannedLabKeys.has(row.order.labKey) : false;
          const stateLabel = row.referral ? "Overdue" : row.tone === "danger" ? "Due now" : "Needs review";
          return (
            <div
              className={`summary-rail-row summary-gap-row${index === 0 ? " summary-rail-primary-row" : ""}`}
              key={row.title}
            >
              <span className={`summary-rail-dot tone-${row.tone}`} aria-hidden />
              <div>
                <strong>{row.title}</strong>
                <p>
                  <span>
                    {stateLabel} · {row.meta}
                  </span>
                </p>
              </div>
              {row.order &&
                (planned ? (
                  <button
                    aria-label={`Remove ${row.order.labName} from the lab order`}
                    className="summary-gap-action draft-remove"
                    onClick={() => removeLabTest(row.order!.labKey)}
                    type="button"
                  >
                    <CloseSmallIcon size={12} variant="stroke" />
                    <span>Remove</span>
                  </button>
                ) : (
                  <button
                    className="summary-gap-action"
                    onClick={(event) => {
                      addLabTest(row.order!.labKey, {
                        labName: row.order!.labName,
                        reasonText: `${row.title} · ${row.meta}`,
                        severityTone: row.order!.severityTone,
                        source: "labs-suggested",
                      });
                      flyToCart(event.currentTarget.getBoundingClientRect());
                    }}
                    type="button"
                  >
                    Order
                  </button>
                ))}
              {row.referral &&
                (referral ? (
                  <button
                    aria-label="Referral sent — view details"
                    className="summary-gap-action planned"
                    onClick={() => openDrawer("refer")}
                    type="button"
                  >
                    <CheckIcon size={12} variant="stroke" />
                    <span>Sent</span>
                  </button>
                ) : (
                  <button className="summary-gap-action" onClick={() => openDrawer("refer")} type="button">
                    Refer
                  </button>
                ))}
            </div>
          );
        })}
      </div>
      {!showAll && activeRows.length > 2 && (
        <button className="summary-inline-link rail-link" onClick={() => setShowAll(true)} type="button">
          <span>View all {activeRows.length}</span>
        </button>
      )}
    </section>
  );
}

/* "HbA1c (fasting)" and "HbA1c" are the same test for grouping purposes */
function normalizeTestName(name: string): string {
  return name.replace(/\s*\(.*\)$/, "").trim().toLowerCase();
}

/* last-result dates from the lab preview model, keyed by normalized test name */
const lastResultByTestName = new Map(
  summaryLabRows.map((row) => [normalizeTestName(row.detail.labName), row.lastResult]),
);

/* Order state is compressed to one row. Detailed bookings stay in Orders. */
function SummaryOrderStateSection({ onOpenOrders }: { onOpenOrders: () => void }) {
  const { draft, lineCount, totals } = useOrderDraft();
  const bookings = useMemo(
    () => [
      ...(draft.status === "placed" && draft.lastPlaced ? [draft.lastPlaced] : []),
      ...draft.placedOrders,
    ],
    [draft.status, draft.lastPlaced, draft.placedOrders],
  );
  const latestOrder = bookings.find((order) => !order.cancelled);
  if (lineCount === 0 && !latestOrder) return null;

  const orderLines = latestOrder?.lines ?? [];
  const shortNames = [...new Set(orderLines.map((line) => line.displayName.replace(/\s*\(.*\)$/, "").trim()))].join(" · ");
  const latestBadge = latestOrder
    ? BOOKING_STATUS_BADGE[latestOrder.bookingStatus] ?? { tone: "neutral" as const, label: "Scheduled" }
    : null;
  const latestRoute = latestOrder?.route === "psc" ? "PSC walk-in" : "in-clinic draw";
  const latestLastResult =
    orderLines.length === 1 ? lastResultByTestName.get(normalizeTestName(orderLines[0].displayName)) : undefined;

  return (
    <section className="summary-rail-section summary-order-state">
      <div className="summary-rail-title">
        <h3 className="summary-rail-kicker">Order state</h3>
      </div>
      <div className="summary-rail-list no-dots">
        {lineCount > 0 && (
          <div className="summary-rail-row no-dot">
            <div>
              <strong>Draft not submitted</strong>
              <p>
                <span>
                  {lineCount} test{lineCount === 1 ? "" : "s"} · {odrFormatMoney(totals.due)}
                </span>
              </p>
            </div>
            <button className="summary-gap-action" onClick={onOpenOrders} type="button">
              Review orders
            </button>
          </div>
        )}
        {lineCount === 0 && latestOrder && latestBadge && (
          <div className="summary-rail-row no-dot">
            <div>
              <span className="summary-booking-head">
                <strong>Latest order · {shortNames}</strong>
                <Badge tone={latestBadge.tone}>{latestBadge.label}</Badge>
              </span>
              <p>
                <span>
                  {latestRoute} · {odrFormatMoney(latestOrder.total)}
                  {latestLastResult ? ` · last result ${latestLastResult}` : ""}
                </span>
              </p>
            </div>
            <button className="summary-gap-action" onClick={onOpenOrders} type="button">
              Review orders
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function SummarySafetySection() {
  const safetyRows: Array<{ title: string; meta: string; tone: "danger" | "warning" | "muted"; selfReported?: boolean }> = [
    ...allergyRows.map((row) => ({
      title: `${row.title} allergy`,
      meta: row.meta,
      tone: "danger" as const,
      selfReported: row.selfReported,
    })),
    { title: "CKD stage 3", meta: "Dose-adjust renal drugs", tone: "danger" },
    { title: "Forte active", meta: "Claim eligible", tone: "muted" },
    { title: "T2 verified", meta: "ID verified · billing ready", tone: "muted" },
  ];

  return (
    <section className="summary-rail-section">
      <h3 className="summary-rail-kicker">Safety</h3>
      <div className="summary-rail-list">
        {safetyRows.map((row) => (
          <div className="summary-rail-row summary-gap-row" key={row.title}>
            <span className={`summary-rail-dot tone-${row.tone}`} aria-hidden />
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
    </section>
  );
}

function SummarySideRail({ onOpenOrders }: { onOpenOrders: () => void }) {
  const { claimChecks, followUp } = useEncounter();
  const actionCount = careGapRows.filter((row) => row.tone !== "muted").length;
  const blockerCount = claimChecks.filter((check) => !check.done).length + (followUp ? 0 : 1);

  return (
    <aside className="summary-side-rail summary-attention-rail" aria-label="Patient attention rail">
      <SummaryAttentionHeader actionCount={actionCount} blockerCount={blockerCount} />
      <SummaryDoNextSection />
      <SummaryFinishVisitSection />
      <SummaryOrderStateSection onOpenOrders={onOpenOrders} />
      <SummarySafetySection />
    </aside>
  );
}

function PatientSummaryTab({
  onOpenLabs,
  onOpenLabsAt,
  onOpenOrders,
}: {
  onOpenLabs: () => void;
  onOpenLabsAt: (labKey: string) => void;
  onOpenOrders: () => void;
}) {
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
          <h2 className="summary-ai-title text-gradient-wizard" id="summary-assessment-title">
            Kura AI Summary
          </h2>
          <p>
            Sokha is a 32-year-old with type 2 diabetes and stage 3 CKD with albuminuria. Latest lab evidence shows{" "}
            {deltaLabFacts.creatinine.summary}, {deltaLabFacts.microalbuminCreatinineRatio.summary}, and{" "}
            {deltaLabFacts.hba1c.summary}. {deltaLabFacts.ldl.summary}. BP 146/92 is above target. Suggested: review
            renal markers, repeat HbA1c if clinically indicated, and manage cardiovascular risk using the full chart.
          </p>
          <small>AI-generated · verify against lab results and apply clinical judgment.</small>
        </section>
        <LabHistoryPreview onOpenLabs={onOpenLabs} onOpenLabsAt={onOpenLabsAt} />
        <SummarySectionGrid />
        <MedicalMedicationGrid />
      </main>
      <div className="summary-vertical-divider" aria-hidden />
      <SummarySideRail onOpenOrders={onOpenOrders} />
    </div>
  );
}

/* ------------------------------ Care plan tab ------------------------------ */
/* Patient-specific care plan instance — NOT the global template library.
   Answers: what are we improving for Sokha, what's due next, who owns it,
   and what gets reviewed at the next encounter. All actions reuse the
   shared order draft + clinical drawers; no new data models. */

/* ------------------- Care plan: execution workspace -------------------
   Summary answers "what do we know?"; Care plan answers "what are we trying
   to improve, what happens next, who owns it, when do we review it?" */

type CarePlanStatus = "due" | "decision" | "planned" | "overdue";

const CARE_PLAN_STATUS: Record<CarePlanStatus, { label: string }> = {
  due: { label: "Due now" },
  decision: { label: "Needs decision" },
  planned: { label: "Planned" },
  overdue: { label: "Overdue" },
};

/* Explicit text pill — status never reads by color alone */
function CarePlanStatusLabel({ status }: { status: CarePlanStatus }) {
  const meta = CARE_PLAN_STATUS[status];
  return <span className={`care-plan-status status-${status}`}>{meta.label}</span>;
}

/* The two orderable goals reuse the exact care-gap order objects so
   "Planned" stays in sync with the Summary rail and the Labs tab. */
const carePlanHba1cOrder = careGapRows.find((row) => row.order?.labName === "HbA1c")?.order;
const carePlanMicroOrder = careGapRows.find((row) => row.order?.labName.startsWith("Microalbumin"))?.order;

function CarePlanLabAction({
  label = "Order",
  order,
  reason,
}: {
  label?: string;
  order: { labKey: string; labName: string; severityTone: "danger" | "warning" } | undefined;
  reason: string;
}) {
  const { addLabTest, plannedLabKeys, removeLabTest } = useOrderDraft();
  if (!order) return null;
  const planned = plannedLabKeys.has(order.labKey);

  return planned ? (
    <button
      aria-label={`Remove ${order.labName} from the lab order`}
      className="summary-gap-action draft-remove"
      onClick={() => removeLabTest(order.labKey)}
      type="button"
    >
      <CloseSmallIcon size={12} variant="stroke" />
      <span>Remove</span>
    </button>
  ) : (
    <button
      aria-label={`Add ${order.labName} to the lab order`}
      className="summary-gap-action"
      onClick={(event) => {
        addLabTest(order.labKey, {
          labName: order.labName,
          reasonText: reason,
          severityTone: order.severityTone,
          source: "labs-suggested",
        });
        flyToCart(event.currentTarget.getBoundingClientRect());
      }}
      type="button"
    >
      {label}
    </button>
  );
}

/* Plan header: name, status, intent, owner/review/channel facts, primary CTA.
   "Review plan" jumps focus to the first due row — no invented backend. */
function CarePlanHeader() {
  const { items, pending } = useCarePlanActions();
  const { followUp } = useEncounter();
  const completed = items.length - pending;
  const labsDue = items.filter((item) => item.group === "lab" && !item.done).length;
  const reviewFacts = [
    `${completed}/${items.length} addressed`,
    labsDue > 0 ? `${labsDue} lab${labsDue === 1 ? "" : "s"} due` : "labs addressed",
    followUp ? `follow-up in ${followUp}` : "follow-up not scheduled",
  ];

  return (
    <header className={`care-plan-header${pending === 0 ? " is-clear" : ""}`}>
      <div className="care-plan-title-wrap">
        <span className="care-plan-header-ic" aria-hidden>
          <NoteIcon size={18} variant="stroke" />
        </span>
        <div className="care-plan-title-main">
          <div className="care-plan-title-row">
            <h2>Diabetes + CKD care plan</h2>
            <Badge tone="success">Active</Badge>
          </div>
          <p className="care-plan-intent">Improve glycemic control, protect kidneys, reduce cardiovascular risk.</p>
          <div className="care-plan-header-facts" aria-label="Care plan facts">
            <span>
              <strong>Owner</strong> Dr. Chann
            </span>
            <span>
              <strong>Reviewed</strong> today
            </span>
            <span>
              <strong>Channel</strong> Telegram on
            </span>
          </div>
        </div>
      </div>
      <div className="care-plan-header-review" aria-label="Today's plan review">
        <div className="care-plan-review-score">
          <strong>{pending}</strong>
          <span>{pending === 1 ? "open action" : "open actions"}</span>
        </div>
        <div className="care-plan-review-copy">
          <strong>{pending === 0 ? "Plan reviewed" : "Before finishing visit"}</strong>
          <span>{reviewFacts.join(" · ")}</span>
        </div>
        <UiButton
          intent={pending === 0 ? "outline" : "primary"}
          leadingIcon={<CheckIcon size={13} variant="stroke" />}
          onClick={focusFirstOpenGoal}
          size="sm"
        >
          {pending === 0 ? "Review plan" : `Review ${pending}`}
        </UiButton>
      </div>
    </header>
  );
}

/* Walk focus to the first goal card that still needs a decision (or the
   first card if all are addressed). No invented backend — the strip and the
   goal board share this. */
function focusFirstOpenGoal() {
  const row = document.querySelector<HTMLElement>(".care-plan-goal-card.is-due");
  const target = row ?? document.querySelector<HTMLElement>(".care-plan-goal-card");
  if (!target) return;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  target.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
  target.querySelector<HTMLElement>("button")?.focus({ preventScroll: true });
}

/* Target-band gauge — borrows the Labs reference-band grammar: a quiet
   track, a jade target zone, and the current value as a severity dot.
   One glance answers "where is the patient vs where we want them". */
function CarePlanGauge({
  min,
  max,
  bandLo,
  bandHi,
  value,
  tone,
  ariaLabel,
}: {
  min: number;
  max: number;
  bandLo: number;
  bandHi: number;
  value: number;
  tone: "danger" | "warning" | "success";
  ariaLabel: string;
}) {
  const pct = (n: number) => `${(((Math.min(Math.max(n, min), max) - min) / (max - min)) * 100).toFixed(1)}%`;
  /* distance to the nearest target edge — the number the doctor acts on */
  const delta = value > bandHi ? value - bandHi : value < bandLo ? value - bandLo : 0;
  const deltaLabel =
    delta === 0
      ? "in target"
      : `${delta > 0 ? "+" : "−"}${Number.isInteger(delta) ? Math.abs(delta) : Math.abs(delta).toFixed(1)} vs target`;
  return (
    <div className="care-plan-gauge-row">
      <div aria-label={ariaLabel} className="care-plan-gauge" role="img">
        <span
          className="care-plan-gauge-band"
          style={{ left: pct(bandLo), width: `calc(${pct(bandHi)} - ${pct(bandLo)})` }}
        />
        <span className={`care-plan-gauge-dot tone-${tone}`} style={{ left: pct(value) }} />
      </div>
      <span className={`care-plan-gauge-delta tone-${delta === 0 ? "ok" : tone}`}>{deltaLabel}</span>
    </div>
  );
}

/* One source of truth for the four goal states — the goal cards, the plan
   ring, and the journey all read the same answers. CV flips to planned
   once an Rx is signed; eye flips once the referral is sent. */
function useCarePlanGoalStatuses(): { glycemic: CarePlanStatus; kidney: CarePlanStatus; cv: CarePlanStatus; eye: CarePlanStatus } {
  const { plannedLabKeys } = useOrderDraft();
  const { referral, signedRx } = useEncounter();
  return {
    glycemic: carePlanHba1cOrder && plannedLabKeys.has(carePlanHba1cOrder.labKey) ? "planned" : "due",
    kidney: carePlanMicroOrder && plannedLabKeys.has(carePlanMicroOrder.labKey) ? "planned" : "due",
    cv: signedRx.length > 0 ? "planned" : "decision",
    eye: referral ? "planned" : "overdue",
  };
}

type CarePlanActionGroup = "lab" | "medication" | "referral" | "followup";

const CARE_PLAN_ACTION_GROUP_LABEL: Record<CarePlanActionGroup, string> = {
  lab: "Lab",
  medication: "Medication",
  referral: "Referral",
  followup: "Follow-up",
};

/* The visit's action list, derived entirely from live state. The review
   strip counts these; the goal cards own the actual controls. One model so
   the count can never drift from what the cards show. */
function useCarePlanActions(): {
  items: Array<{ id: string; label: string; group: CarePlanActionGroup; done: boolean }>;
  pending: number;
} {
  const statuses = useCarePlanGoalStatuses();
  const { followUp } = useEncounter();
  const items = [
    { id: "hba1c", label: "Order HbA1c", group: "lab" as const, done: statuses.glycemic === "planned" },
    { id: "uacr", label: "Order uACR", group: "lab" as const, done: statuses.kidney === "planned" },
    { id: "meds", label: "Review renal medication dosing", group: "medication" as const, done: statuses.cv === "planned" },
    { id: "refer", label: "Refer ophthalmology", group: "referral" as const, done: statuses.eye === "planned" },
    { id: "followup", label: "Schedule 90-day follow-up", group: "followup" as const, done: Boolean(followUp) },
  ];
  return { items, pending: items.filter((item) => !item.done).length };
}

/* Right rail action list — the durable "before finish" checklist. The goal
   cards own the controls; this rail keeps visit state visible while scanning. */
function CarePlanActionRail() {
  const { items, pending } = useCarePlanActions();
  const completed = items.length - pending;

  return (
    <section className="care-plan-block care-plan-action-rail" aria-label="Actions before finishing visit">
      <div className="care-plan-group-head">
        <span className="care-plan-group-ic" aria-hidden>
          <CheckIcon size={14} variant="stroke" />
        </span>
        <h3 className="care-plan-section-title">Before finish</h3>
        <Counter count={pending} />
      </div>
      <p className="care-plan-rail-summary">
        {pending === 0 ? "All visit plan actions are addressed." : `${completed}/${items.length} addressed · resolve open decisions first.`}
      </p>
      <div className="care-plan-task-list">
        {items.map((item) => (
          <div className={`care-plan-task${item.done ? " is-done" : ""}`} key={item.id}>
            <span className="care-plan-task-mark" aria-hidden>
              {item.done && <CheckIcon size={10} variant="stroke" />}
            </span>
            <div className="care-plan-task-text">
              <strong>{item.label}</strong>
              <span>{CARE_PLAN_ACTION_GROUP_LABEL[item.group]}</span>
            </div>
          </div>
        ))}
      </div>
      {pending > 0 && (
        <button className="summary-gap-action care-plan-rail-action" onClick={focusFirstOpenGoal} type="button">
          Review open goals
          <ArrowRightIcon size={13} variant="stroke" />
        </button>
      )}
    </section>
  );
}

/* Goal cards: each goal is a small instrument — status, target-band gauge,
   the real sparkline from the lab fixture, and its one next action. */
function CarePlanGoalBoard({ onOpenOrders }: { onOpenOrders: () => void }) {
  const { lineCount, plannedLabKeys } = useOrderDraft();
  const { referral, selfReported } = useEncounter();
  const { openDrawer } = useClinicalDrawers();
  const statuses = useCarePlanGoalStatuses();
  void plannedLabKeys;
  const blurredVision = selfReported["blurred-vision"];
  const eyeNote =
    blurredVision === "confirmed"
      ? "Blurred vision confirmed · in record"
      : blurredVision === "dismissed"
        ? undefined
        : "Blurred vision self-reported · unverified";

  const goals: Array<{
    name: string;
    status: CarePlanStatus;
    priority?: boolean;
    gauge?: { min: number; max: number; bandLo: number; bandHi: number; value: number; tone: "danger" | "warning" | "success"; aria: string };
    current: string;
    target: string;
    trendKey?: string;
    note?: string;
    action: ReactNode;
  }> = [
    {
      name: "Kidney protection",
      status: statuses.kidney,
      priority: true,
      gauge: { min: 0, max: 300, bandLo: 0, bandHi: 30, value: 155.52, tone: "danger", aria: "uACR 155.52 milligrams per gram, target below 30" },
      current: `uACR ${deltaLabFacts.microalbuminCreatinineRatio.value} · above reference`,
      target: "Target <30 mg/g · confirm albuminuria trend",
      trendKey: deltaLabKeys.microalbuminCreatinineRatio,
      action: (
        <CarePlanLabAction label="Order uACR" order={carePlanMicroOrder} reason="Kidney protection goal · confirm trend" />
      ),
    },
    {
      name: "Glycemic control",
      status: statuses.glycemic,
      gauge: { min: 4, max: 10, bandLo: 4, bandHi: 6, value: 6.5, tone: "warning", aria: "HbA1c 6.5 percent, target zone 4 to 6" },
      current: `HbA1c ${deltaLabFacts.hba1c.value} · ${deltaLabFacts.hba1c.shortDate} · not repeated`,
      target: "Target <6% · repeat & titrate therapy",
      trendKey: deltaLabKeys.hba1c,
      action: (
        <CarePlanLabAction label="Order HbA1c" order={carePlanHba1cOrder} reason="Glycemic control goal · repeat due" />
      ),
    },
    {
      name: "Cardiovascular risk",
      status: statuses.cv,
      gauge: { min: 90, max: 180, bandLo: 90, bandHi: 130, value: 146, tone: "danger", aria: "Systolic blood pressure 146, target below 130" },
      current: "BP 146/92 · LDL 27 controlled",
      target: "Target <130/80 · statin + BP decision",
      trendKey: deltaLabKeys.ldl,
      action: (
        <button className="summary-gap-action" onClick={() => openDrawer("rx")} type="button">
          Review medication
        </button>
      ),
    },
    {
      name: "Eye screening",
      status: statuses.eye,
      current: "Annual dilated exam · overdue",
      target: referral ? `Referred — ${referral.destination}` : "Refer ophthalmology",
      note: eyeNote,
      action: referral ? (
        <button
          aria-label={`Referral sent to ${referral.destination} — view details`}
          className="summary-gap-action planned"
          onClick={() => openDrawer("refer")}
          type="button"
        >
          <CheckIcon size={12} variant="stroke" />
          <span>Sent</span>
        </button>
      ) : (
        <button
          aria-label="Refer ophthalmology"
          className="summary-gap-action"
          onClick={() => openDrawer("refer")}
          type="button"
        >
          Refer
        </button>
      ),
    },
  ];

  return (
    <section className="care-plan-goal-board" aria-label="Care goals">
      <div className="care-plan-group-head">
        <span className="care-plan-group-ic" aria-hidden>
          <CheckIcon size={14} variant="stroke" />
        </span>
        <h3 className="care-plan-section-title">Care goals</h3>
        <Counter count={goals.length} />
        {lineCount > 0 && (
          <button className="summary-inline-link care-plan-orders-link" onClick={onOpenOrders} type="button">
            <span>Review lab order · {lineCount}</span>
            <ArrowRightIcon size={14} variant="stroke" />
          </button>
        )}
      </div>
      <div className="care-plan-goal-grid">
        {goals.map((goal) => (
          <article
            className={`care-plan-goal-card${goal.priority ? " is-priority" : ""}${goal.status === "due" || goal.status === "overdue" ? " is-due" : ""}`}
            key={goal.name}
          >
            <div className="care-plan-goal-card-head">
              <strong className="care-plan-goal-name">{goal.name}</strong>
              <CarePlanStatusLabel status={goal.status} />
            </div>
            {goal.gauge ? (
              <CarePlanGauge
                ariaLabel={goal.gauge.aria}
                bandHi={goal.gauge.bandHi}
                bandLo={goal.gauge.bandLo}
                max={goal.gauge.max}
                min={goal.gauge.min}
                tone={goal.gauge.tone}
                value={goal.gauge.value}
              />
            ) : (
              <div aria-hidden className="care-plan-gauge care-plan-gauge-empty" />
            )}
            <p className="care-plan-goal-current">{goal.current}</p>
            <p className="care-plan-goal-target">{goal.target}</p>
            {goal.note && <p className="care-plan-goal-note">{goal.note}</p>}
            <div className="care-plan-goal-card-foot">
              {goal.trendKey ? (
                <span className="care-plan-goal-trend" title="Last 5 draws">
                  <LabMiniTrend labKey={goal.trendKey} />
                </span>
              ) : (
                <span />
              )}
              {goal.action}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

/* Safety constraints — always visible next to the goals, no rail needed.
   Self-reported signals carry a resolve control: confirm into the record or
   dismiss as not relevant today. The decision persists on the encounter and
   feeds the eye-screening goal note. */
function CarePlanSafetyCard() {
  const { selfReported, resolveSelfReported, clearSelfReported } = useEncounter();
  const rows: Array<{ title: string; meta: string; tone: string; selfReported?: boolean; resolveId?: string }> = [
    { title: "CKD stage 3", meta: "dose-adjust renal drugs", tone: "danger" },
    { title: "Penicillin allergy", meta: "rash · moderate", tone: "danger", selfReported: true },
    { title: "Blurred vision", meta: "unverified", tone: "warning", selfReported: true, resolveId: "blurred-vision" },
    { title: "Forte active", meta: "claim eligible", tone: "muted" },
  ];

  return (
    <section className="care-plan-block care-plan-safety" aria-label="Safety constraints">
      <div className="care-plan-group-head">
        <span className="care-plan-group-ic" aria-hidden>
          <MedicalMaskIcon size={14} variant="stroke" />
        </span>
        <h3 className="care-plan-section-title">Safety</h3>
      </div>
      {rows.map((row) => {
        const resolution = row.resolveId ? selfReported[row.resolveId] : undefined;
        return (
          <div className={`care-plan-line${resolution === "dismissed" ? " is-dismissed" : ""}`} key={row.title}>
            <span className={`summary-rail-dot tone-${resolution === "dismissed" ? "muted" : row.tone}`} aria-hidden />
            <strong>{row.title}</strong>
            <span className="care-plan-line-meta">
              {resolution === "confirmed" ? "confirmed" : resolution === "dismissed" ? "dismissed" : row.meta}
              {row.selfReported && !resolution ? " · self-reported" : ""}
            </span>
            {row.resolveId && !resolution && (
              <span className="care-plan-resolve">
                <button
                  aria-label={`Confirm ${row.title} into the record`}
                  className="summary-gap-action"
                  onClick={() => resolveSelfReported(row.resolveId!, "confirmed", row.title)}
                  type="button"
                >
                  Confirm
                </button>
                <button
                  aria-label={`Dismiss ${row.title} — not relevant today`}
                  className="summary-gap-action care-plan-resolve-dismiss"
                  onClick={() => resolveSelfReported(row.resolveId!, "dismissed", row.title)}
                  type="button"
                >
                  Dismiss
                </button>
              </span>
            )}
            {row.resolveId && resolution && (
              <span className="care-plan-resolve">
                {resolution === "confirmed" && (
                  <span aria-hidden className="care-plan-resolve-state">
                    <CheckIcon size={12} variant="stroke" />
                    <span>Confirmed</span>
                  </span>
                )}
                <button
                  aria-label={`Reopen ${row.title}`}
                  className="summary-gap-action"
                  onClick={() => clearSelfReported(row.resolveId!, row.title)}
                  type="button"
                >
                  Undo
                </button>
              </span>
            )}
          </div>
        );
      })}
    </section>
  );
}

/* Secondary blocks in one 3-up row. The due-now work already lives on the
   goal board, so nothing repeats it here. */
function CarePlanColumns() {
  const { followUp, referral } = useEncounter();
  const { openDrawer } = useClinicalDrawers();
  const { plannedLabKeys } = useOrderDraft();
  const [copied, setCopied] = useState(false);

  const hba1cPlanned = carePlanHba1cOrder ? plannedLabKeys.has(carePlanHba1cOrder.labKey) : false;
  const microPlanned = carePlanMicroOrder ? plannedLabKeys.has(carePlanMicroOrder.labKey) : false;

  /* Instructions are an output of today's decisions, not a static list.
     Action-derived lines come first; the two safety-net lines always show. */
  const derived: Array<{ title: string; meta: string }> = [];
  if (hba1cPlanned) derived.push({ title: "Repeat HbA1c at PSC", meta: "walk-in code via Telegram" });
  if (microPlanned) derived.push({ title: "Repeat urine albumin/creatinine", meta: "same PSC visit" });
  if (referral) derived.push({ title: "Attend ophthalmology", meta: `${referral.destination} · ${referral.code}` });
  if (followUp) derived.push({ title: `Return in ${followUp}`, meta: "glycemic + renal review" });
  const instructions: Array<{ title: string; meta: string }> = [
    ...derived,
    { title: "Bring current medications", meta: "next review" },
    { title: "Return sooner if", meta: "edema · dyspnea · vision changes" },
  ];

  const copyInstructions = () => {
    const text = instructions.map((line) => `• ${line.title} — ${line.meta}`).join("\n");
    void navigator.clipboard?.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="care-plan-columns">
      <section className="care-plan-block" aria-label="Follow-up and cadence">
        <div className="care-plan-group-head">
          <span className="care-plan-group-ic" aria-hidden>
            <RefreshIcon size={14} variant="stroke" />
          </span>
          <h3 className="care-plan-section-title">Follow-up &amp; cadence</h3>
        </div>
        <div className="care-plan-line">
          <strong>90-day follow-up</strong>
          <span className="care-plan-line-meta">{followUp ? `in ${followUp}` : "not scheduled"}</span>
          {followUp ? (
            <button
              aria-label={`Follow-up scheduled in ${followUp} — view details`}
              className="summary-gap-action planned"
              onClick={() => openDrawer("followup")}
              type="button"
            >
              <CheckIcon size={12} variant="stroke" />
              <span>Scheduled</span>
            </button>
          ) : (
            <button
              aria-label="Schedule follow-up"
              className="summary-gap-action"
              onClick={() => openDrawer("followup")}
              type="button"
            >
              Schedule
            </button>
          )}
        </div>
        <div className="care-plan-line">
          <strong>HbA1c</strong>
          <span className="care-plan-line-meta">every 90 days</span>
        </div>
        <div className="care-plan-line">
          <strong>Renal markers</strong>
          <span className="care-plan-line-meta">each draw</span>
        </div>
        <div className="care-plan-line">
          <strong>Blood pressure</strong>
          <span className="care-plan-line-meta">each visit</span>
        </div>
      </section>

      <section className="care-plan-block" aria-label="Patient instructions">
        <div className="care-plan-group-head">
          <span className="care-plan-group-ic" aria-hidden>
            <TeleConsultationIcon size={14} variant="stroke" />
          </span>
          <h3 className="care-plan-section-title">Patient instructions</h3>
          {derived.length > 0 && <Counter count={derived.length} />}
        </div>
        {derived.length === 0 && (
          <p className="care-plan-empty-hint">Add an order, referral, or follow-up — instructions build here.</p>
        )}
        {instructions.map((line) => (
          <div className="care-plan-line" key={line.title}>
            <strong>{line.title}</strong>
            <span className="care-plan-line-meta">{line.meta}</span>
          </div>
        ))}
        <div className="care-plan-msg-foot">
          <button className="summary-gap-action" onClick={copyInstructions} type="button">
            {copied ? (
              <>
                <CheckIcon size={12} variant="stroke" />
                <span>Copied</span>
              </>
            ) : (
              <span>Copy for patient</span>
            )}
          </button>
          <span className="care-plan-msg-note">Sent after you finish the visit · Telegram</span>
        </div>
      </section>

    </div>
  );
}

/* The plan as a journey — one horizontal line from the first abnormal
   draw through Today to the next review window. Past milestones are
   settled jade, Today carries a quiet pulse, due work shows as a danger
   stop, and the future stays in outline. Fully derived from live state. */
function CarePlanJourneyStrip() {
  const { plannedLabKeys } = useOrderDraft();
  const { followUp, referral } = useEncounter();
  const hba1cPlanned = carePlanHba1cOrder ? plannedLabKeys.has(carePlanHba1cOrder.labKey) : false;
  const microPlanned = carePlanMicroOrder ? plannedLabKeys.has(carePlanMicroOrder.labKey) : false;
  const plannedCount = [hba1cPlanned, microPlanned].filter(Boolean).length;

  const stops: Array<{ date: string; label: string; state: "past" | "now" | "due" | "done" | "sched" | "future" }> = [
    { date: deltaLabFacts.hba1c.shortDate, label: `HbA1c ${deltaLabFacts.hba1c.value} · abnormal`, state: "past" },
    { date: deltaLabFacts.creatinine.shortDate, label: "Renal markers reviewed", state: "past" },
    {
      date: "Today",
      label: plannedCount > 0 ? `${plannedCount} test${plannedCount === 1 ? "" : "s"} planned` : "Plan review",
      state: "now",
    },
    referral
      ? { date: "Sent", label: `Ophthalmology · ${referral.code}`, state: "done" }
      : { date: "Due now", label: "Eye exam referral", state: "due" },
    { date: "Jun 12", label: "Fasting HbA1c · scheduled", state: "sched" },
    followUp
      ? { date: `+${followUp}`, label: "Follow-up · scheduled", state: "sched" }
      : { date: "+90 days", label: "Glycemic review", state: "future" },
  ];

  /* the travelled part of the line ends at Today; the rest stays dashed */
  const nowIndex = stops.findIndex((stop) => stop.state === "now");
  const nowCenter = `${(((nowIndex + 0.5) / stops.length) * 100).toFixed(2)}%`;

  return (
    <section
      aria-label="Care plan journey"
      className="care-plan-journey"
      style={{ "--cp-now-center": nowCenter } as CSSProperties}
    >
      {stops.map((stop, index) => (
        <div
          className={`care-plan-stop state-${stop.state}`}
          key={`${stop.date}-${stop.label}`}
          style={{ "--cp-stop-delay": `${(index * 0.09).toFixed(2)}s` } as CSSProperties}
        >
          <span className="care-plan-stop-date">{stop.date}</span>
          <span className="care-plan-stop-dot" aria-hidden>
            {(stop.state === "past" || stop.state === "done") && <CheckIcon size={9} variant="stroke" />}
          </span>
          <span className="care-plan-stop-label" title={stop.label}>
            {stop.label}
          </span>
        </div>
      ))}
    </section>
  );
}

function PatientCarePlanTab({ onOpenOrders }: { onOpenOrders: () => void }) {
  return (
    <div aria-labelledby="record-tab-carePlan" className="care-plan-shell" id="record-panel-carePlan" role="tabpanel">
      <main className="care-plan-main">
        <CarePlanHeader />
        <div className="care-plan-workspace">
          <div className="care-plan-content-stack">
            <CarePlanGoalBoard onOpenOrders={onOpenOrders} />
            <CarePlanJourneyStrip />
            <CarePlanColumns />
          </div>
          <aside className="care-plan-side" aria-label="Care plan context">
            <CarePlanActionRail />
            <CarePlanSafetyCard />
          </aside>
        </div>
      </main>
    </div>
  );
}

function LabsTabPanel({
  focusKey,
  onOpenOrders,
  onFocusHandled,
}: {
  focusKey: string | null;
  onOpenOrders: () => void;
  onFocusHandled: () => void;
}) {
  const { addLabTest, lineCount, plannedLabKeys, removeLabTest } = useOrderDraft();
  const reviewInOrdersCta =
    lineCount > 0 ? (
      <UiButton
        fullWidth
        intent="primary"
        onClick={onOpenOrders}
        trailingIcon={<ArrowRightIcon size={14} variant="stroke" />}
      >
        Continue in Orders
      </UiButton>
    ) : null;

  return (
    <div aria-labelledby="record-tab-labs" className="labs-tab" id="record-panel-labs" role="tabpanel">
      <div className="labs-tab-main">
        <LabHistory
          focusKey={focusKey}
          onFocusHandled={onFocusHandled}
          orderedKeys={plannedLabKeys}
          onOrderTest={(labKey, meta) =>
            addLabTest(labKey, {
              labName: meta.labName,
              reasonText: meta.reasonText,
              severityTone: meta.severityTone,
              source: meta.group === "out" ? "labs-followup" : "labs-suggested",
            })
          }
          onCancelOrder={removeLabTest}
        />
      </div>
      <div aria-hidden className="odr-rail-divider" />
      <OrderDraftRail ctaSlot={reviewInOrdersCta} emptyHint="Add follow-ups from the list." />
      <OrderDraftDock ctaSlot={reviewInOrdersCta} emptyHint="Add follow-ups from the list." />
    </div>
  );
}

/* Landing intent from global search: which tab to open, plus an optional
   lab row to focus or a catalog item to reveal in the order catalog. */
type RecordLanding = { tab: RecordTabId; labKey?: string; catalog?: { query: string; itemId: string } };

function PatientRecordPage({
  landing = null,
  onBackToPatients,
}: {
  /* seeded at mount — the parent remounts this page (key bump) per search
     jump, so no effect-driven state sync is needed */
  landing?: RecordLanding | null;
  onBackToPatients: () => void;
}) {
  const [activeRecordTab, setActiveRecordTab] = useState<RecordTabId>(landing?.tab ?? "summary");
  const [currentPatientId, setCurrentPatientId] = useState(recordPatients[0].id);
  const currentPatient = recordPatients.find((p) => p.id === currentPatientId) ?? recordPatients[0];
  const [labFocusKey, setLabFocusKey] = useState<string | null>(landing?.labKey ?? null);
  const [ordersSearchIntent, setOrdersSearchIntent] = useState<{ query: string; itemId: string } | null>(
    landing?.catalog ?? null,
  );

  const openLabsAt = (labKey: string) => {
    setLabFocusKey(labKey);
    setActiveRecordTab("labs");
  };

  return (
    <EncounterProvider>
    <ClinicalDrawerProvider>
    <div className="record-page">
      <DetailHeader onBackToPatients={onBackToPatients} patientName={currentPatient.name} />
      <RecordHeader
        activeTab={activeRecordTab}
        onSwitchPatient={setCurrentPatientId}
        onTabChange={setActiveRecordTab}
        patient={currentPatient}
        patients={recordPatients}
      />
      {activeRecordTab === "summary" && (
        <PatientSummaryTab
          onOpenLabs={() => setActiveRecordTab("labs")}
          onOpenLabsAt={openLabsAt}
          onOpenOrders={() => setActiveRecordTab("orders")}
        />
      )}
      {activeRecordTab === "labs" && (
        <LabsTabPanel
          focusKey={labFocusKey}
          onOpenOrders={() => setActiveRecordTab("orders")}
          onFocusHandled={() => setLabFocusKey(null)}
        />
      )}
      {activeRecordTab === "orders" && (
        <OrdersTab
          searchIntent={ordersSearchIntent}
          onSearchIntentHandled={() => setOrdersSearchIntent(null)}
        />
      )}
      {activeRecordTab === "carePlan" && <PatientCarePlanTab onOpenOrders={() => setActiveRecordTab("orders")} />}
      {activeRecordTab === "records" && <RecordsTab />}
    </div>
    </ClinicalDrawerProvider>
    </EncounterProvider>
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
  id,
  record,
  onClick,
}: {
  active: boolean;
  id?: string;
  record: SearchRecord;
  onClick: () => void;
}) {
  return (
    <button
      aria-selected={active}
      className={`global-search-result${active ? " active" : ""}`}
      id={id}
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
  bookingRecords,
  open,
  onClose,
  onOpenRecord,
}: {
  bookingRecords: SearchRecord[];
  open: boolean;
  onClose: () => void;
  onOpenRecord: (record: SearchRecord) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const records = useMemo(() => getGlobalSearchRecords(bookingRecords), [bookingRecords]);
  const needsAttention = useMemo(() => getNeedsAttentionRecords(records, bookingRecords), [bookingRecords, records]);
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
  const showRecent = showIdle && recentRecords.length > 0;
  const showNoResults = hasSearchContext && results.length === 0;

  /* One flat row list across sections so arrows, Enter, and
     aria-activedescendant share a single index space. */
  const rowGroups: Array<{ label: string; records: SearchRecord[] }> = showIdle
    ? [
        ...(showRecent ? [{ label: "Recent", records: recentRecords }] : []),
        { label: "Needs attention", records: needsAttention },
      ]
    : results.length > 0
      ? [{ label: activeScope ? getSearchScopeLabel(activeScope) : "Top results", records: results }]
      : [];
  const flatRows = rowGroups.flatMap((group) => group.records);
  const actionCount = showNoResults ? 2 : 0;
  const interactiveCount = flatRows.length + actionCount;
  const activeOptionId =
    interactiveCount > 0
      ? showNoResults
        ? `global-search-action-${activeIndex}`
        : `global-search-option-${activeIndex}`
      : undefined;

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
      destination: { kind: "patients-list" },
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

      const record = flatRows[activeIndex];
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

  let rowIndexOffset = 0;

  return (
    <div className="global-search-layer" onKeyDown={handleKeyDown}>
      <button className="global-search-scrim" aria-label="Close search" onClick={closeAndReset} type="button" />
      <section aria-label="Global search" aria-modal="true" className="global-search-modal" role="dialog">
        <div className="global-search-field-shell">
          <label className="global-search-field">
            <FigmaIcon src="/figma/icon-search.svg" size={24} />
            <input
              ref={inputRef}
              aria-activedescendant={activeOptionId}
              aria-autocomplete="list"
              aria-controls="global-search-listbox"
              aria-expanded="true"
              aria-label="Search patients, bookings, lab orders"
              autoComplete="off"
              placeholder="Search patients, bookings, lab orders..."
              role="combobox"
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
          <div className="global-search-body compact">
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
          </div>
        )}

        {flatRows.length > 0 && (
          <div className="global-search-results" id="global-search-listbox" role="listbox">
            {rowGroups.map((group) => {
              const offset = rowIndexOffset;
              rowIndexOffset += group.records.length;

              return (
                <div className="global-search-result-group" key={group.label} role="presentation">
                  <p className="global-search-section-label">{group.label}</p>
                  {group.records.map((record, index) => (
                    <GlobalSearchResultRow
                      active={activeIndex === offset + index}
                      id={`global-search-option-${offset + index}`}
                      key={record.id}
                      record={record}
                      onClick={() => openRecord(record)}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        )}

        {showNoResults && (
          <>
            <div className="global-search-empty">
              <strong>No scoped matches</strong>
              <span>Search covers this clinic only — try another term or remove a filter</span>
            </div>
            <div className="global-search-actions" id="global-search-listbox" role="listbox">
              <button
                aria-selected={activeIndex === 0}
                className={`global-search-action${activeIndex === 0 ? " active" : ""}`}
                id="global-search-action-0"
                onClick={runSearchAllRecords}
                role="option"
                type="button"
              >
                <FilterPrimitives.Icon src="/figma/icon-search.svg" />
                <span>Search all records for “{queryText}”</span>
              </button>
              <button
                aria-selected={activeIndex === 1}
                className={`global-search-action${activeIndex === 1 ? " active" : ""}`}
                id="global-search-action-1"
                onClick={createPatientFromQuery}
                role="option"
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

function CatalogPage({
  onOpenPatientChart,
  onSearchIntentHandled,
  searchIntent,
}: {
  onOpenPatientChart?: (patientId: string) => void;
  onSearchIntentHandled?: () => void;
  searchIntent?: { query: string; itemId: string } | null;
}) {
  return (
    <LabCatalogWorkspace
      onOpenPatientChart={onOpenPatientChart}
      onSearchIntentHandled={onSearchIntentHandled}
      searchIntent={searchIntent}
    />
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

function HomeShell() {
  const mobileShellActive = useSyncExternalStore(
    subscribeMobileShell,
    getMobileShellSnapshot,
    getMobileShellServerSnapshot,
  );
  const { allBookings } = useOrderDraft();
  const [activePage, setActivePage] = useState<PageId>("patients");
  const [patientView, setPatientView] = useState<PatientView>("record");
  const [searchOpen, setSearchOpen] = useState(false);
  const [settingsSection, setSettingsSection] = useState<SettingsSectionId>("overview");
  /* keyed so each search jump remounts the record page with fresh landing
     state; manual navigation clears it */
  const [searchLanding, setSearchLanding] = useState<{ landing: RecordLanding; key: number } | null>(null);
  const [catalogLanding, setCatalogLanding] = useState<{ landing: { query: string; itemId: string }; key: number } | null>(null);
  const [bookingFocus, setBookingFocus] = useState<BookingFocus | null>(null);
  const [searchToast, setSearchToast] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const isPatientsPage = activePage === "patients";
  const isPatientRecordPage = isPatientsPage && patientView === "record";
  const liveBookingSearchRecords = useMemo(() => getBookingSearchRecords(allBookings), [allBookings]);

  const showSearchToast = (message: string) => {
    setSearchToast(message);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setSearchToast(null), 4000);
  };

  useEffect(() => () => {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
  }, []);

  const openSettings = useCallback((section: SettingsSectionId) => {
    setSettingsSection(section);
    setActivePage("settings");
  }, []);

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

      if ((event.metaKey || event.ctrlKey) && event.key === ",") {
        event.preventDefault();
        openSettings("overview");
        return;
      }

      if (!isTyping && event.key === "/") {
        event.preventDefault();
        setSearchOpen(true);
      }
    };

    window.addEventListener("keydown", handleGlobalSearchShortcut);
    return () => window.removeEventListener("keydown", handleGlobalSearchShortcut);
  }, [openSettings]);

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

  /* Deep-link target for the approved "Create first lab order" CTA on
     /verification. No standalone /orders route exists — open the patient
     record on the Orders tab (the order builder). */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("intent") !== "new-order") return;
    /* eslint-disable react-hooks/set-state-in-effect */
    setActivePage("patients");
    setPatientView("record");
    setSearchLanding({ landing: { tab: "orders" }, key: 1 });
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const openSearchRecord = (record: SearchRecord) => {
    const destination = record.destination;

    if (destination.kind === "record") {
      setBookingFocus(null);
      setCatalogLanding(null);
      setActivePage("patients");
      setPatientView("record");
      setSearchLanding((current) => ({
        landing: { tab: destination.tab, labKey: destination.labKey, catalog: destination.catalog },
        key: (current?.key ?? 0) + 1,
      }));
      /* feedback so the jump from search is traceable to an identity */
      if (record.scope === "patients" || record.scope === "carePlan") {
        showSearchToast(`Opened from search${record.code ? ` · ${record.code}` : ""}`);
      } else {
        showSearchToast(`Opened from search · ${record.title}`);
      }
    } else if (destination.kind === "booking") {
      setSearchLanding(null);
      setCatalogLanding(null);
      setActivePage("bookings");
      setBookingFocus((current) => ({ code: destination.bookingCode, key: (current?.key ?? 0) + 1 }));
      showSearchToast(`Opened booking · ${destination.bookingCode}`);
    } else if (destination.kind === "catalog") {
      setSearchLanding(null);
      setBookingFocus(null);
      setActivePage("catalog");
      setCatalogLanding((current) => ({
        landing: destination.catalog,
        key: (current?.key ?? 0) + 1,
      }));
      showSearchToast(`Opened catalog · ${record.title}`);
    } else if (destination.kind === "patients-list") {
      setCatalogLanding(null);
      setBookingFocus(null);
      setActivePage("patients");
      setPatientView("list");
    } else {
      setCatalogLanding(null);
      setBookingFocus(null);
      setActivePage(destination.page);
      if (destination.page === "patients") setPatientView("list");
    }

    setSearchOpen(false);
  };

  const openPatientRecord = () => {
    setSearchLanding(null);
    setCatalogLanding(null);
    setBookingFocus(null);
    setActivePage("patients");
    setPatientView("record");
  };

  const openPatientList = () => {
    setSearchLanding(null);
    setCatalogLanding(null);
    setBookingFocus(null);
    setActivePage("patients");
    setPatientView("list");
  };

  const handlePageChange = (page: PageId) => {
    setSearchLanding(null);
    setCatalogLanding(null);
    setBookingFocus(null);
    setActivePage(page);

    if (page === "patients") {
      setPatientView("list");
    }
  };

  /* Deep-link from a Home work-queue item straight into a patient record tab
     (mirrors the search-record landing flow). The prototype renders the single
     demo record, so every record link lands on Sokha Chann's chart. */
  const openRecordTab = (tab: RecordTabId) => {
    setCatalogLanding(null);
    setBookingFocus(null);
    setActivePage("patients");
    setPatientView("record");
    setSearchLanding((current) => ({ landing: { tab }, key: (current?.key ?? 0) + 1 }));
  };

  /* Home work queue — built from the same models the tabs render (bookings,
     abnormal labs, care gaps); the live order draft + KYD state are read inside
     HomeView. Each item routes the doctor to the right place to finish it. */
  const awaitingVisit = allBookings.filter(isBookingAwaitingVisit).length;
  const resultsBack = allBookings.filter(
    (booking) => !booking.cancelled && booking.bookingStatus === "results-back",
  ).length;
  const scheduled = allBookings.filter(
    (booking) => !booking.cancelled && booking.bookingStatus === "scheduled",
  ).length;
  const awaitingBooking = allBookings.find(isBookingAwaitingVisit);
  const homeModel: HomeModel = {
    doctorName: "Dr. Pierre",
    dateLabel: "Saturday, 9 May 2026",
    summary: [
      { id: "s-att", label: "items need attention", count: 4, tone: "danger" },
      { id: "s-res", label: "results to review", count: recordRecentAbnormalBadges.length, onClick: () => openRecordTab("labs") },
      { id: "s-over", label: "patients overdue", count: 2, onClick: openPatientList },
      { id: "s-book", label: "bookings awaiting visit", count: awaitingVisit, onClick: () => handlePageChange("bookings") },
      { id: "s-cp", label: "care plans due", count: 2, onClick: () => openRecordTab("carePlan") },
    ],
    attention: [
      {
        id: "att-careplan",
        initials: "SC",
        patient: "Sokha Chann",
        reason: "Diabetes + CKD care plan due",
        detail: "2 labs due · eye referral overdue · follow-up not scheduled",
        tone: "danger",
        actionLabel: "Review plan",
        onAction: () => openRecordTab("carePlan"),
      },
      {
        id: "att-results",
        initials: "SC",
        patient: "Sokha Chann",
        reason: "Results back to review",
        detail: `${recordRecentAbnormalBadges[0].label} · ${recordRecentAbnormalBadges[1].label}`,
        tone: "danger",
        actionLabel: "Review labs",
        onAction: () => openRecordTab("labs"),
      },
      {
        id: "att-booking",
        initials: awaitingBooking ? getNameInitials(awaitingBooking.patientName) : "DP",
        patient: awaitingBooking?.patientName ?? "Dara Pich",
        reason: "Booking awaiting PSC visit",
        detail: awaitingBooking
          ? `${getBookingAnchor(awaitingBooking)} · ${getBookingTestSummary(awaitingBooking, 1)} · no PSC check-in yet`
          : "Code sent · no visit yet · BP review",
        tone: "warning",
        actionLabel: "Open bookings",
        onAction: () => handlePageChange("bookings"),
      },
      {
        id: "att-identity",
        initials: "SC",
        patient: "Sokha Chann",
        reason: "2 self-reported items unverified",
        detail: "HIV · Hepatitis B serology pending",
        tone: "info",
        actionLabel: "Review",
        onAction: () => openRecordTab("summary"),
      },
    ],
    patients: [
      { id: "p-sokha", initials: "SC", name: "Sokha Chann", summary: "CKD stage 3 · uACR high · HbA1c due", tone: "danger", onAction: () => openRecordTab("summary") },
      { id: "p-vichea", initials: "VN", name: "Vichea Nuon", summary: "COPD · overdue follow-up", tone: "warning", onAction: openPatientList },
      { id: "p-sovann", initials: "ST", name: "Sovann Tep", summary: "Heart failure · abnormal labs", tone: "warning", onAction: openPatientList },
    ],
    labOps: [
      { id: "awaiting", label: "Awaiting visit", count: awaitingVisit, onOpen: () => handlePageChange("bookings") },
      { id: "scheduled", label: "Scheduled", count: scheduled, onOpen: () => handlePageChange("bookings") },
      { id: "results", label: "Results back", count: resultsBack, onOpen: () => openRecordTab("labs") },
    ],
    carePlans: [
      { id: "cp-sokha", patient: "Sokha Chann", plan: "Diabetes + CKD", detail: "2 labs due · 1 referral overdue · follow-up not scheduled", tone: "danger", onOpen: () => openRecordTab("carePlan") },
      { id: "cp-sovann", patient: "Sovann Tep", plan: "Heart failure", detail: "Renal function due tomorrow", tone: "warning", onOpen: openPatientList },
    ],
    nextActions: [
      { id: "na-cp", label: "Review Sokha care plan", onAction: () => openRecordTab("carePlan") },
      { id: "na-identity", label: "Confirm 2 self-reported conditions", onAction: () => openRecordTab("summary") },
    ],
    safety: [
      { id: "sf-self", label: "Self-reported conditions unverified", detail: "HIV, Hepatitis B · confirm or dismiss", tone: "info" },
      { id: "sf-allergy", label: "Penicillin allergy", detail: "on file · moderate", tone: "warning" },
      { id: "sf-ckd", label: "CKD stage 3", detail: "4 patients", tone: "neutral" },
    ],
  };

  if (mobileShellActive) {
    return <DoctorMobileApp />;
  }

  return (
    <main className={`kura-screen${isPatientRecordPage ? " record-shell" : ""}${activePage === "catalog" ? " catalog-screen" : ""}`}>
        <Sidebar
          activePage={activePage}
          onOpenSearch={() => setSearchOpen(true)}
          onOpenSettings={openSettings}
          onPageChange={handlePageChange}
        />
        <section className={`app-main${isPatientRecordPage ? " record-main" : ""}`}>
          {!isPatientRecordPage && activePage !== "home" && activePage !== "catalog" && (
            <header className="page-header">
              <h1>{pageTitles[activePage]}</h1>
              {isPatientsPage && <NewPatientButton />}
              {activePage === "bookings" && (
                <Button icon={<PlusIcon size={14} variant="stroke" />} onClick={() => setSearchOpen(true)}>
                  New booking
                </Button>
              )}
            </header>
          )}
          <div className={`page-content${isPatientRecordPage ? " record-page-content" : ""}${activePage === "catalog" ? " catalog-page-content" : ""}`}>
            {!isPatientRecordPage && <VerificationStatusBanner />}
            {activePage === "home" ? (
              <HomeView
                model={homeModel}
                onFindPatient={() => setSearchOpen(true)}
                onOpenDemoPatient={openPatientRecord}
                onOrderLabs={() => openRecordTab("orders")}
              />
            ) : activePage === "settings" ? (
              <SettingsView onSectionChange={setSettingsSection} section={settingsSection} />
            ) : activePage === "catalog" ? (
              <CatalogPage
                key={catalogLanding?.key ?? "catalog"}
                onOpenPatientChart={openPatientRecord}
                onSearchIntentHandled={() => setCatalogLanding(null)}
                searchIntent={catalogLanding?.landing ?? null}
              />
            ) : activePage === "bookings" ? (
              <BookingsWorkspace
                focus={bookingFocus}
                onOpenPatient={openPatientRecord}
                onReviewLabs={() => openRecordTab("labs")}
              />
            ) : isComingSoonPage(activePage) ? (
              <ComingSoonPage page={activePage} />
            ) : isPatientRecordPage ? (
              <PatientRecordPage
                key={searchLanding?.key ?? 0}
                landing={searchLanding?.landing ?? null}
                onBackToPatients={openPatientList}
              />
            ) : (
              <PatientPage onOpenPatient={openPatientRecord} onOpenSearch={() => setSearchOpen(true)} />
            )}
          </div>
        </section>
        <GlobalSearchModal
          bookingRecords={liveBookingSearchRecords}
          open={searchOpen}
          onClose={() => setSearchOpen(false)}
          onOpenRecord={openSearchRecord}
        />
        {searchToast && (
          <div className="search-toast" role="status">
            {searchToast}
          </div>
        )}
    </main>
  );
}

export default function Home() {
  return (
    <OrderDraftProvider patientId={ACTIVE_PATIENT_ID}>
      <HomeShell />
    </OrderDraftProvider>
  );
}
