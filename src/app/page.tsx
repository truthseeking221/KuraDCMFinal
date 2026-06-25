"use client";

import type {
  ComponentType,
  CSSProperties,
  KeyboardEvent as ReactKeyboardEvent,
  ReactNode,
} from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Avatar, Badge, Button as UiButton, Counter, Drawer, LabHistory, LabHoverTrigger, LabMiniTrend, Search, getLabHistoryPreview, toast, type LabPreviewEntry } from "@/components/ui";
import { AppSidebar, type AppSidebarPageId } from "@/components/AppSidebar";
import { LabCatalogWorkspace } from "@/components/LabCatalogWorkspace";
import { RecordsTab } from "@/components/RecordsTab";
import { PatientActivityTab } from "@/components/PatientActivity/PatientActivityTab";
import { logPatientActivity } from "@/components/OrderDraft/patientActivity";
import type { ActivityType } from "@/components/OrderDraft/patientActivity";
import { CarePlanTab, type CarePlanOrderRequest } from "@/components/CarePlan/CarePlanTab";
import { addMedicationFor, appendPlanDelta } from "@/components/CarePlan/carePlanModel";
import {
  DARA_CHOLESTEROL_DRAFT,
  ensure,
  livingPlanOf,
  programPatientProfile,
  PROGRAM_SEED_PATIENT_IDS,
  useCarePlans,
  type ClinicalFocus,
  type ProtocolKey,
} from "@/features/care-plan/domain";
import { CareLoopReviewDrawer } from "@/features/care-plan/components";
import { SettingsView, type SettingsSectionId } from "@/components/SettingsView";
import { VerificationModal } from "@/components/Verification";
import { BookingsWorkspace, type BookingFocus } from "@/components/BookingsWorkspace";
import { DoctorMobileApp } from "@/components/DoctorMobile";
import { HomeView } from "@/components/HomeView";
import type { HomeModel } from "@/components/HomeView";
import { InboxView } from "@/components/InboxView";
import { CalendarView } from "@/components/CalendarView";
import { TasksView } from "@/components/TasksView";
import { TelehealthView } from "@/components/TelehealthView";
import { CarePlansView } from "@/components/CarePlansView";
import { PharmaCallsView } from "@/components/PharmaCallsView";
import { DispensaryView } from "@/components/DispensaryView";
import { SuppliesView } from "@/components/SuppliesView";
import { ReferEarnView } from "@/components/ReferEarnView";
import {
  ACTIVE_PATIENT_ID,
  OrderDraftCheckout,
  OrderDraftCompactRail,
  OrderDraftDock,
  OrderDraftProvider,
  formatMoney as odrFormatMoney,
  orderCategories,
  orderItems,
  mapLabKeyToItemId,
  specimenFilters,
  useOrderDraft,
} from "@/components/OrderDraft";
import { deriveOrderLedgerImpact } from "@/components/OrderDraft/ledger";
import { BOOKING_PATIENTS, SEEDED_BOOKINGS, type BookingPatient } from "@/components/OrderDraft/bookingSeeds";
import {
  getBookingAnchor,
  getBookingSearchKeywords,
  getBookingTestSummary,
  getRouteLabel,
  bookingStatusView,
  isBookingAwaitingVisit,
} from "@/components/OrderDraft/bookingShared";
import type {
  BookingListItem,
  DoctorIdentityDecision,
  DoctorPatientAssurance,
  OrderDraft,
  OrderDraftLine,
  PlacedOrderSummary,
} from "@/components/OrderDraft/types";
import { ageFromValue } from "@/components/OrderDraft/identityGraph";
import { PatientIntakeDrawer, type ResolvedIntake } from "@/components/PatientIntakeDrawer/PatientIntakeDrawer";
import { EarningsDetailDrawer } from "@/components/EarningsDetailDrawer/EarningsDetailDrawer";
import { ChargePatientDrawer, type ChargeReason } from "@/components/ChargePatient";
import { Button } from "@/components/button";
import { FilterPrimitives } from "@/components/filter-primitives";
import { Pagination } from "@/components/pagination";
import { deltaLabFacts, deltaLabKeys } from "@/data/deltaLabResults";
import { ICD10_WHO_2019_SOURCE, icd10Who2019 } from "@/data/icd10Who2019";
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
  Flask as FlaskIcon,
  Heart as HeartIcon,
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
  Share as ShareIcon,
  TeleConsultation as TeleConsultationIcon,
  Tube as TubeIcon,
  Warning as WarningIcon,
} from "@/icons/components";
import type { IconProps } from "@/icons/components/types";

type Patient = {
  name: string;
  khmerName: string;
  phone: string;
  mrn: string;
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
/* Two axes rendered as one single-select chip rail, split into visual groups:
   scope (all / recently active / needs attention) and clinical attention
   (needs review / abnormal labs / overdue / screening due). */
type QuickFilterId =
  | "all"
  | "recentlyActive"
  | "needsAttention"
  | "needsReview"
  | "abnormalLabs"
  | "overdueFollowUp"
  | "screeningDue";
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
type PatientFilterChip =
  | { id: "search"; kind: "search"; label: string }
  | { id: QuickFilterId; kind: "quickFilter"; label: string }
  | { id: ConditionFilterId; kind: "condition"; label: string }
  | { id: AcuityFilterId; kind: "acuity"; label: string };
type PatientSeed = Omit<
  Patient,
  "mrn" | "conditionCodes" | "acuity" | "needsReview" | "overdueFollowUp" | "abnormalLabs"
>;
type PageId = AppSidebarPageId;
type PatientView = "list" | "record";
type BookingComposerSeed = {
  key: number;
  itemIds: string[];
  patient?: BookingPatient | null;
  /* Pre-resolved identity from Patient Start-intake → composer skips to Tests. */
  identityDecision?: DoctorIdentityDecision | null;
  patientAssurance?: DoctorPatientAssurance | null;
};
type SearchScopeId = "patients" | "bookings" | "labs" | "invoices" | "staff";
/* Records can carry scopes beyond the quick-filter chips: catalog tests,
   care-plan signals, page navigation, and action shortcuts rank below clinical
   entities. "pages" connects every workspace surface into the palette. */
type SearchRecordScope = SearchScopeId | "catalog" | "carePlan" | "pages" | "actions";
/* Self-service actions the palette can fire. Never destructive — they open a
   flow on the right surface, mirroring the shell's own handlers. */
type SearchActionId = "new-booking" | "new-patient" | "order-labs" | "connect-aba";
/* Where a result lands. Search never mutates — it navigates, focuses, or opens
   a non-destructive flow. */
type SearchDestination =
  | { kind: "page"; page: PageId }
  | { kind: "settings"; section: SettingsSectionId }
  | { kind: "action"; action: SearchActionId }
  | { kind: "booking"; bookingCode: string }
  | { kind: "catalog"; catalog: { query: string; itemId: string } }
  | { kind: "patients-list" }
  | {
      kind: "record";
      tab: RecordTabId;
      labKey?: string;
      catalog?: { query: string; itemId: string };
      patientId?: string;
      patientName?: string;
      carePlanFocusId?: string;
      carePlanProtocolKey?: ProtocolKey;
      summarySectionId?: string;
      handoff?: RecordHandoff;
    };
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
  /* People show initials in an avatar; pages and actions show a glyph instead. */
  initials?: string;
  Icon?: ComponentType<IconProps>;
  /* Optional keyboard shortcut hint shown on the trailing edge (e.g. "⌘B"). */
  shortcut?: string;
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
type RecordTabId = "summary" | "labs" | "orders" | "carePlan" | "records" | "activity";
type RecordHandoffAction = {
  label: string;
  tab: RecordTabId;
  labKey?: string;
  summarySectionId?: string;
};
type RecordHandoffEvidence = {
  label: string;
  value: string;
  tone?: RecordBadgeTone;
};
type RecordHandoff = {
  sourceLabel: string;
  title: string;
  description: string;
  tone: RecordBadgeTone;
  evidence: RecordHandoffEvidence[];
  primaryAction: RecordHandoffAction;
  secondaryAction?: RecordHandoffAction;
};
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

const pageTitles: Record<PageId, string> = {
  home: "Home",
  search: "Search",
  patients: "Patients",
  bookings: "Bookings",
  catalog: "Lab catalog",
  more: "More",
  settings: "Settings",
  inbox: "Inbox",
  calendar: "Calendar",
  tasks: "Tasks",
  telehealth: "Telehealth",
  "care-plans": "Care programs",
  "pharma-calls": "Rep disclosure log",
  dispensary: "Dispensary",
  supplies: "Supplies",
  "refer-earn": "Refer & earn",
};

const pageLabels: Record<PageId, string> = {
  home: "Home",
  search: "Search",
  patients: "Patients",
  bookings: "Bookings",
  catalog: "Catalog",
  more: "More",
  settings: "Settings",
  inbox: "Inbox",
  calendar: "Calendar",
  tasks: "Tasks",
  telehealth: "Telehealth",
  "care-plans": "Care programs",
  "pharma-calls": "Rep disclosure log",
  dispensary: "Dispensary",
  supplies: "Supplies",
  "refer-earn": "Refer & earn",
};

const pageIcons: Record<PageId, NavIconComponent> = {
  home: HomeIcon,
  search: SearchIcon,
  patients: PatientIcon,
  bookings: BookingIcon,
  catalog: CatalogIcon,
  more: MoreIcon,
  settings: SettingIcon,
  inbox: BellIcon,
  calendar: CalendarIcon,
  tasks: CheckIcon,
  telehealth: TeleConsultationIcon,
  "care-plans": HeartIcon,
  "pharma-calls": NoteIcon,
  dispensary: PillIcon,
  supplies: TubeIcon,
  "refer-earn": ShareIcon,
};

const comingSoonPages = new Set<PageId>(["more"]);

const isComingSoonPage = (page: PageId) => comingSoonPages.has(page);

/* The "More" mega-menu pages render their own self-contained workspaces that can
   exceed the fixed page-content frame. They opt into internal vertical scroll
   (page-content is overflow:hidden by default for the fixed-frame pages). */
const morePages = new Set<PageId>([
  "inbox",
  "calendar",
  "tasks",
  "telehealth",
  "care-plans",
  "pharma-calls",
  "dispensary",
  "supplies",
  "refer-earn",
]);

const isMorePage = (page: PageId) => morePages.has(page);

/* Scope = which slice of the roster (time/relevance). Kept separate from the
   clinical-attention chips so demographics never blur with "why now". */
const quickFilterScope = [
  { id: "all", label: "All" },
  { id: "recentlyActive", label: "Recent visits" },
  { id: "needsAttention", label: "Needs attention" },
] satisfies Array<{ id: QuickFilterId; label: string }>;

/* Clinical attention = why the doctor should look, ranked by urgency. */
const quickFilterClinical = [
  { id: "needsReview", label: "Needs review" },
  { id: "abnormalLabs", label: "Abnormal labs" },
  { id: "overdueFollowUp", label: "Overdue follow-up" },
  { id: "screeningDue", label: "Screening due" },
] satisfies Array<{ id: QuickFilterId; label: string }>;

const quickFilters = [...quickFilterScope, ...quickFilterClinical];

/* Palette scope chips — the content-rich scopes worth filtering by. Tab cycles
   through them; invoices/staff stay searchable under "All" without a chip. */
const globalSearchScopes = [
  { id: "patients", label: "Patients" },
  { id: "bookings", label: "Bookings" },
  { id: "labs", label: "Lab orders" },
  { id: "catalog", label: "Catalog" },
  { id: "carePlan", label: "Care programs" },
  { id: "pages", label: "Pages" },
  { id: "actions", label: "Actions" },
] satisfies Array<{ id: SearchRecordScope; label: string }>;

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
  conditions: [],
  acuities: [],
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

const PATIENT_PAGE_SIZE = 11;
/* Patient | Phone | Clinical context | Attention | Activity | Action.
   Demographics sit under the name as identity support; phone is separated so
   contact lookup scans vertically without crowding the patient identity. */
const PATIENT_ROSTER_GRID_STYLE: CSSProperties = {
  gridTemplateColumns:
    "minmax(248px, 320px) minmax(112px, 132px) minmax(320px, 1fr) minmax(178px, 230px) minmax(128px, 158px) minmax(176px, 210px)",
};

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

/* Generated patients (index >= seed count) draw a distinct problem list from
   this pool instead of cycling the 8 seeds. Length is 15 (coprime to the
   stride-8 attention cohort) so sorted tiers never stack identical rows — the
   Clinical context column scans top to bottom. All chronic, so any next action
   (review result / schedule follow-up / order screening) stays coherent. */
const conditionSetPool: Array<{ primaryCondition: string; activeConditions: string[] }> = [
  { primaryCondition: "Type 2 Diabetes", activeConditions: ["Retinopathy", "Hyperlipidemia"] },
  { primaryCondition: "Hypertension", activeConditions: ["CKD stage 2", "Gout"] },
  { primaryCondition: "Hyperlipidemia", activeConditions: ["NAFLD", "Obesity"] },
  { primaryCondition: "Type 2 Diabetes", activeConditions: ["Neuropathy", "Hypertension"] },
  { primaryCondition: "CKD stage 4", activeConditions: ["Anemia", "Hypertension"] },
  { primaryCondition: "Hypothyroidism", activeConditions: ["Iron-deficiency anemia"] },
  { primaryCondition: "Osteoarthritis", activeConditions: ["Chronic knee pain", "Obesity"] },
  { primaryCondition: "COPD", activeConditions: ["Hypertension", "OSA"] },
  { primaryCondition: "Heart failure", activeConditions: ["CAD", "AFib"] },
  { primaryCondition: "Asthma", activeConditions: ["Allergic rhinitis"] },
  { primaryCondition: "GERD", activeConditions: ["H. pylori"] },
  { primaryCondition: "Chronic hepatitis B", activeConditions: ["Cirrhosis"] },
  { primaryCondition: "Migraine", activeConditions: ["Anxiety"] },
  { primaryCondition: "Rheumatoid arthritis", activeConditions: ["Osteoporosis"] },
  { primaryCondition: "Prediabetes", activeConditions: ["Hypertension", "Obesity"] },
];

const patients: Patient[] = patientNamePool.map((name, index) => {
  const seed = patientSeeds[index % patientSeeds.length];
  const visibleIndex = index + 1;
  const isSeed = index < patientSeeds.length;
  const phonePrefix = ["070", "011", "092", "088", "016", "010", "069", "078", "015", "012"][index % 10];
  const phoneSuffix = String((495 + index * 37) % 900 + 100).padStart(3, "0");
  const abnormalLabs = index < 4;
  const conditionSet = isSeed
    ? { primaryCondition: seed.primaryCondition, activeConditions: seed.activeConditions }
    : conditionSetPool[index % conditionSetPool.length];

  return {
    ...seed,
    name,
    khmerName: khmerNamePool[index],
    mrn: getPatientMrn(index),
    phone: isSeed ? seed.phone : `${phonePrefix} ••• ${phoneSuffix}`,
    age: isSeed ? seed.age : 6 + ((visibleIndex * 7) % 76),
    sex: index % 3 === 1 ? "male" : "female",
    sexTone: index % 3 === 1 ? "pink" : "brand",
    lastSeen: isSeed ? seed.lastSeen : `${1 + ((visibleIndex * 3) % 45)}d ago`,
    primaryCondition: conditionSet.primaryCondition,
    activeConditions: conditionSet.activeConditions,
    conditionCodes: getConditionCodes(conditionSet.primaryCondition, conditionSet.activeConditions, seed.reviewItems, index),
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
  { label: "DUE", due: { lead: "HbA1c not repeated since Jan 15", followUp: "Renal markers above reference" } },
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
   live demo chart (Sokha) exactly. Program cohort patients carry their own
   care-plan records so Care Programs can deep-link into the right focus. */
const recordPatients: RecordPatient[] = [
  {
    id: "sokha-chan",
    initials: "SC",
    name: "Sokha Chann",
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

/* The header switcher browses the whole clinic roster (same list as the
   Patients table) with search. Roster rows only carry list-level fields, so the
   chart identity (DOB / MRN / insurance) is synthesized deterministically — the
   tab bodies still resolve to Sokha's fixture per the prototype convention
   above. Index 0 keeps Sokha's canonical chart + identity. */
const recordDobMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const recordInsurancePool = ["Forte (active)", "Sokapheap Tep", "Self-pay", "Infinity (active)"];

function rosterPatientToRecord(patient: Patient, index: number): RecordPatient {
  const day = String(((index * 7) % 28) + 1).padStart(2, "0");
  const month = recordDobMonths[(index * 5) % 12];
  return {
    id: `roster-${index}`,
    initials: getNameInitials(patient.name),
    name: patient.name,
    age: patient.age,
    sex: patient.sex === "female" ? "Female" : "Male",
    dob: `${day} ${month} ${2026 - patient.age}`,
    mrn: `P-${8000 + index}`,
    tel: patient.phone,
    insurance: recordInsurancePool[index % recordInsurancePool.length],
    problems: [patient.primaryCondition, ...patient.activeConditions]
      .map((label) => label.trim())
      .filter(Boolean)
      .map((label) => ({ label })),
    flags: [],
  };
}

/* Care Programs cohort patients live in the care-plan domain, so they have no
   roster row. Use the shared program profile verbatim so the cohort, enrolment
   drawer, and chart header all describe the same person. */
const programCohortRecordPatients: RecordPatient[] = PROGRAM_SEED_PATIENT_IDS.flatMap((id): RecordPatient[] => {
  const profile = programPatientProfile(id);
  if (!profile) return [];
  const focus = ensure(id)[0]?.focuses[0];
  return [{
    id,
    initials: getNameInitials(profile.name),
    name: profile.name,
    age: profile.age,
    sex: profile.sex,
    dob: profile.dob,
    mrn: profile.mrn,
    tel: profile.phoneMasked,
    insurance: profile.insurance,
    problems: focus ? [{ label: focus.label }] : [],
    flags: [],
  }];
});

/* Canonical Sokha (full chart) leads; the rest mirror the roster table, then the
   Care Programs cohort so their charts open in place from a program deep-link.
   A program-seed patient (e.g. Dara) must resolve to her DOMAIN-linked cohort
   record (id = patient id), not a synthesized "roster-N" duplicate — otherwise her
   seeded care plan and the result-review loop key off the wrong id. So drop the
   roster-synthesized record whenever a cohort record already covers that name. */
const programCohortRecordNames = new Set(
  programCohortRecordPatients.map((patient) => normalizeRecordPatientName(patient.name)),
);
const recordSwitcherPatients: RecordPatient[] = [
  recordPatients[0],
  ...patients
    .slice(1)
    .map((patient, index) => rosterPatientToRecord(patient, index + 1))
    .filter((record) => !programCohortRecordNames.has(normalizeRecordPatientName(record.name))),
  ...programCohortRecordPatients,
];

const recordTabs = [
  { id: "summary", label: "Summary" },
  { id: "labs", label: "Labs" },
  { id: "orders", label: "Orders" },
  { id: "carePlan", label: "Care plan" },
  { id: "records", label: "Records" },
  { id: "activity", label: "Activity" },
] satisfies Array<{ id: RecordTabId; label: string }>;

const summarySectionIds = [
  "summary-assessment",
  "summary-lab-preview",
  "summary-visit-intent",
  "summary-symptoms",
  "summary-medical-history",
  "summary-medications",
] as const;

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
  stateLabel?: string;
  order?: { labKey: string; labName: string; severityTone: "danger" | "warning" };
  referral?: boolean;
};

const careGapRows: CareGapRow[] = [
  {
    title: "HbA1c repeat due",
    meta: `Last ${deltaLabFacts.hba1c.value} on ${deltaLabFacts.hba1c.shortDate} · no active order`,
    tone: "warning",
    stateLabel: "Repeat due",
    order: {
      labKey: "GLYCOSYLATED HAEMOGLOBIN (Roche)||Hb A1c % (DCCT/NGSP)",
      labName: "HbA1c",
      severityTone: "warning",
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

function orderLineMatchesLab(line: Pick<OrderDraftLine, "itemId" | "labRefs">, labKey: string) {
  const itemId = mapLabKeyToItemId(labKey);

  return line.labRefs.some((ref) => ref.labKey === labKey) || (itemId != null && line.itemId === itemId);
}

function getActiveLabOrder(
  draft: Pick<OrderDraft, "status" | "lastPlaced" | "placedOrders">,
  labKey: string,
): PlacedOrderSummary | null {
  const currentPlaced = draft.status === "placed" && draft.lastPlaced ? [draft.lastPlaced] : [];
  const orders = [...currentPlaced, ...draft.placedOrders];

  return (
    orders.find(
      (order) =>
        !order.cancelled &&
        order.bookingStatus !== "results-back" &&
        order.lines.some((line) => orderLineMatchesLab(line, labKey)),
    ) ?? null
  );
}

function getActiveLabOrderStatusText(order: PlacedOrderSummary) {
  return bookingStatusView(order).label.toLowerCase();
}

/* ICD-10 — evidence-backed AI candidates; nothing auto-adds (doctor decides).
   The suggestion list is always CANDIDATES minus what's already on the chart. */
type ClinicalEvidence = { label: string; value: string; tone?: "danger" | "warning" | "success" | "neutral" };
type IcdEntry = {
  code: string;
  label: string;
  trigger: string;
  confidence?: "high" | "low";
  codable?: boolean;
  sourceLabel?: string;
  chapterTitle?: string;
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

/* Full searchable ICD set = chart-aware suggestions plus the WHO ICD-10
   2019 international metadata. WHO non-terminal categories remain searchable
   for navigation, but cannot be added as encounter codes. */
const icdExtras: IcdEntry[] = [
  { code: "K76.0", label: "Fatty (change of) liver", trigger: "US: hepatic steatosis · mild", confidence: "low" },
  { code: "E66.9", label: "Overweight, unspecified", trigger: "BMI 28.4", confidence: "low" },
  { code: "H36.0", label: "Diabetic retinopathy", trigger: "Reports blurred vision · screening due", confidence: "low" },
];
const localIcdEntries: IcdEntry[] = [...icdCandidates, ...icdExtras];
const localIcdCodes = new Set(localIcdEntries.map((entry) => entry.code));
const whoIcdEntries: IcdEntry[] = icd10Who2019
  .filter((entry) => !localIcdCodes.has(entry.code))
  .map((entry) => ({
    code: entry.code,
    label: entry.label,
    trigger: `${entry.chapterTitle} · ${ICD10_WHO_2019_SOURCE.name}`,
    codable: entry.terminal,
    sourceLabel: ICD10_WHO_2019_SOURCE.name,
    chapterTitle: entry.chapterTitle,
  }));
const icdLibrary: IcdEntry[] = [...localIcdEntries, ...whoIcdEntries];
const icdLibraryByCode = new Map(icdLibrary.map((entry) => [entry.code, entry]));
const ICD_SEARCH_RESULT_LIMIT = 16;

function normalizeIcdSearchText(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizeIcdCode(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isBareNumericIcdQuery(compactQuery: string, queryTokens: string[]) {
  return (
    compactQuery.length > 0 &&
    /^\d+$/.test(compactQuery) &&
    queryTokens.length > 0 &&
    queryTokens.every((token) => /^\d+$/.test(token))
  );
}

type IcdSearchEntry = IcdEntry & {
  codable: boolean;
  compactCode: string;
  searchOrder: number;
  searchText: string;
};

const icdSearchIndex: IcdSearchEntry[] = icdLibrary.map((entry, searchOrder) => ({
  ...entry,
  codable: entry.codable !== false,
  compactCode: normalizeIcdCode(entry.code),
  searchOrder,
  searchText: normalizeIcdSearchText(`${entry.code} ${entry.label} ${entry.chapterTitle ?? ""}`),
}));

function getIcdSearchRank(entry: IcdSearchEntry, queryText: string, compactQuery: string, queryTokens: string[]) {
  if (isBareNumericIcdQuery(compactQuery, queryTokens)) return null;
  if (compactQuery && /^[a-z]/.test(compactQuery) && entry.compactCode === compactQuery) return 0;
  if (compactQuery && /^[a-z]/.test(compactQuery) && entry.compactCode.startsWith(compactQuery)) return 10 + entry.compactCode.length / 100;
  if (queryText && entry.searchText.startsWith(queryText)) return 20;
  if (queryText && entry.searchText.includes(` ${queryText}`)) return 30;
  if (queryTokens.length > 0 && queryTokens.every((token) => entry.searchText.includes(token))) {
    return 40 + queryTokens.length / 100;
  }

  return null;
}

function getIcdEntryMeta(entry: IcdEntry, onChart: boolean) {
  if (onChart) return "Already on chart";
  if (entry.codable === false) return `${entry.chapterTitle ?? entry.trigger} · choose a terminal code`;
  if (entry.linkedProblem) return `${entry.linkedProblem} · ${entry.reviewMeta ?? entry.trigger}${entry.confidence === "low" ? " · low confidence" : ""}`;
  if (entry.chapterTitle) return entry.chapterTitle;
  return `${entry.trigger}${entry.confidence === "low" ? " · low confidence" : ""}`;
}

function getIcdEntryAction(entry: IcdEntry, onChart: boolean) {
  if (onChart) return "Added";
  if (entry.codable === false) return "Category";
  return "Add";
}

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

const noteSoapSections = [
  ["s", "Subjective"],
  ["o", "Objective"],
  ["a", "Assessment"],
  ["p", "Plan"],
] as const;

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
  patientId: string;
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

function EncounterProvider({ children, patientId }: { children: ReactNode; patientId: string }) {
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

  const logEntry = useCallback(
    (kind: EncounterEntry["kind"], label: string, detail?: string) => {
      entrySeqRef.current += 1;
      setEntries((current) => [...current, { id: entrySeqRef.current, kind, label, detail }]);
      /* mirror into the unified per-patient Activity log so clinical actions
         (note signed, Rx, referral, follow-up, ICD, claim) land in one history */
      if (patientId) logPatientActivity(patientId, { type: kind as ActivityType, title: label, detail });
    },
    [patientId],
  );

  const addIcd = useCallback(
    (code: string) => {
      const entry = icdLibraryByCode.get(code);
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
      /* The signed Rx accumulates into the living care plan — no re-entry — both as
         a standing Medication (Kura Rx · confirmed) and a "what changed" delta. */
      addMedicationFor(ACTIVE_PATIENT_ID, {
        drug: item.drug,
        dose: item.dose,
        frequency: freqLabel,
        route: "Oral",
        indication: item.class,
        source: "kura_prescribed",
        verification: "confirmed",
        verifiedBy: "Dr Dara",
      });
      appendPlanDelta(ACTIVE_PATIENT_ID, {
        actor: "Dr Dara",
        action: "rx_signed",
        summary: `Prescribed ${item.drug} ${item.dose}`,
        detail: `${freqLabel} · signed Rx`,
      });
    },
    [logEntry],
  );

  const setNote = useCallback((fields: Partial<NoteFields>) => {
    setNoteFields((current) => ({ ...current, ...fields }));
  }, []);

  const saveNoteDraft = useCallback(() => {
    setNoteStatus((current) => (current === "signed" ? current : "draft"));
    logEntry("note", "Note drafted", "Unsigned. Not part of the legal record yet");
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
      appendPlanDelta(ACTIVE_PATIENT_ID, {
        actor: "Dr Dara",
        action: "referral_created",
        summary: `Referred ${record.service.toLowerCase()} — ${record.destination}`,
        detail: `${record.urgency} · ${code}`,
        ref: code,
      });
    },
    [logEntry],
  );

  const scheduleFollowUp = useCallback(
    (label: string) => {
      setFollowUp(label);
      logEntry("followup", `Scheduled follow-up in ${label}`, "Telegram reminder to 070 ··· 496");
      appendPlanDelta(ACTIVE_PATIENT_ID, {
        actor: "Dr Dara",
        action: "follow_up_scheduled",
        summary: `Follow-up scheduled in ${label}`,
        detail: "Telegram reminder to the patient",
      });
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
      patientId,
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
    [patientId, entries, logEntry, icdCodes, addIcd, removeIcd, meds, addMedFromSuggestion, addMedFromRx, note, setNote, noteStatus, saveNoteDraft, signNote, signedRx, referral, sendReferral, followUp, scheduleFollowUp, selfReported, resolveSelfReported, clearSelfReported, claimChecks, claimReady],
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

function normalizeRecordPatientName(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function resolveRecordPatientId(patientId?: string, patientName?: string) {
  if (patientId && recordSwitcherPatients.some((patient) => patient.id === patientId)) {
    return patientId;
  }

  const bookingPatient = patientId ? bookingPatientByIdForSearch.get(patientId) : undefined;
  const targetName = patientName ?? bookingPatient?.name;

  if (targetName) {
    const normalizedTargetName = normalizeRecordPatientName(targetName);
    const recordPatient = recordSwitcherPatients.find(
      (patient) => normalizeRecordPatientName(patient.name) === normalizedTargetName,
    );

    if (recordPatient) {
      return recordPatient.id;
    }
  }

  return recordPatients[0].id;
}

function bookingPatientForRecordPatient(patient: RecordPatient): BookingPatient {
  const bookingById = bookingPatientByIdForSearch.get(patient.id);
  const normalizedName = normalizeRecordPatientName(patient.name);
  const bookingByName = BOOKING_PATIENTS.find(
    (bookingPatient) => normalizeRecordPatientName(bookingPatient.name) === normalizedName,
  );
  const seed = bookingById ?? bookingByName;

  return {
    ...(seed ?? {}),
    id: seed?.id ?? patient.id,
    name: patient.name,
    mrn: patient.mrn,
    phoneMasked: patient.tel,
    identityTier: seed?.identityTier ?? "panel",
    relationship: seed?.relationship ?? "current_panel",
  };
}

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
    destination: { kind: "settings", section: "billing" },
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
    destination: { kind: "settings", section: "billing" },
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
    destination: { kind: "settings", section: "billing" },
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
    keywords: ["doctor", "provider", "physician", "pierre", "member"],
    destination: { kind: "settings", section: "members" },
    initials: "DP",
  },
  {
    id: "staff-002",
    scope: "staff",
    title: "Nurse Lina",
    subtitle: "Triage nurse",
    meta: "On shift",
    keywords: ["nurse", "triage", "staff", "lina", "member"],
    destination: { kind: "settings", section: "members" },
    initials: "NL",
  },
  {
    id: "staff-003",
    scope: "staff",
    title: "Sokun Admin",
    subtitle: "Front desk",
    meta: "Bookings and invoices",
    keywords: ["staff", "admin", "front desk", "booking", "invoice", "member"],
    destination: { kind: "settings", section: "members" },
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
    destination: { kind: "record", tab: "carePlan", patientId: "sokha-chan", patientName: "Sokha Chann", carePlanFocusId: "f-dm" },
    initials: "SC",
  },
  {
    id: "careplan-002",
    scope: "carePlan",
    title: "Care plan — Sreymom Sok",
    subtitle: "Next due: renal panel · overdue since Apr 20",
    meta: "P-7133 · CKD program",
    keywords: ["care plan", "follow up", "renal", "kidney", "ckd", "sreymom", "overdue"],
    destination: { kind: "record", tab: "carePlan", patientId: "sreymom-sok", patientName: "Sreymom Sok", carePlanProtocolKey: "ckd" },
    initials: "SS",
  },
];

/* Action shortcuts — open a flow, never destructive. Listed first in the idle
   palette, like Vapi/Clay command palettes. */
const actionSearchRecords: SearchRecord[] = [
  {
    id: "action-new-booking",
    scope: "actions",
    title: "New booking",
    subtitle: "Start a lab order",
    meta: "",
    keywords: ["new", "booking", "order", "create", "lab", "tests", "book"],
    destination: { kind: "action", action: "new-booking" },
    Icon: BookingIcon,
    shortcut: "B",
  },
  {
    id: "action-order-labs",
    scope: "actions",
    title: "Order labs on a chart",
    subtitle: "Open the order builder",
    meta: "",
    keywords: ["order", "labs", "catalog", "tests", "draft"],
    destination: { kind: "record", tab: "orders" },
    Icon: FlaskIcon,
  },
  {
    id: "action-new-patient",
    scope: "actions",
    title: "New patient",
    subtitle: "Register a patient",
    meta: "",
    keywords: ["new", "patient", "create", "register"],
    destination: { kind: "patients-list" },
    Icon: PatientIcon,
  },
  {
    id: "action-connect-aba",
    scope: "actions",
    title: "Connect ABA payout",
    subtitle: "Set up payouts",
    meta: "",
    keywords: ["aba", "bank", "payout", "banking", "connect", "earnings", "settlement"],
    destination: { kind: "page", page: "refer-earn" },
    Icon: ShareIcon,
  },
];

const commonActionSearchRecords = actionSearchRecords.filter((record) => record.id !== "action-connect-aba");

/* Page navigation — every workspace surface is reachable from the palette, so
   search doubles as "Jump to" (Vapi / Gamma pattern). meta = the sidebar group. */
const pageNavSearchRecords: SearchRecord[] = [
  { id: "page-home", scope: "pages", title: "Home", subtitle: "Practice dashboard and worklist", meta: "General", keywords: ["home", "dashboard", "start"], destination: { kind: "page", page: "home" }, Icon: HomeIcon },
  { id: "page-patients", scope: "pages", title: "Patients", subtitle: "Roster, charts, and records", meta: "Clinical", keywords: ["patients", "roster", "charts", "records"], destination: { kind: "patients-list" }, Icon: PatientIcon },
  { id: "page-bookings", scope: "pages", title: "Bookings", subtitle: "Lab orders and their lifecycle", meta: "Work", keywords: ["bookings", "orders", "lab", "appointments"], destination: { kind: "page", page: "bookings" }, Icon: BookingIcon },
  { id: "page-catalog", scope: "pages", title: "Lab catalog", subtitle: "Tests, tubes, turnaround, pricing", meta: "Clinical", keywords: ["catalog", "tests", "lab", "tubes", "prices", "tat"], destination: { kind: "page", page: "catalog" }, Icon: CatalogIcon },
  { id: "page-inbox", scope: "pages", title: "Inbox", subtitle: "Results, bookings, billing, claims, identity", meta: "General", keywords: ["inbox", "notifications", "messages", "alerts", "results"], destination: { kind: "page", page: "inbox" }, Icon: BellIcon },
  { id: "page-calendar", scope: "pages", title: "Calendar", subtitle: "Visits, telehealth, collections & rep visits", meta: "General", keywords: ["calendar", "schedule", "visits", "telehealth", "collection", "rep", "agenda", "day", "week"], destination: { kind: "page", page: "calendar" }, Icon: CalendarIcon },
  { id: "page-tasks", scope: "pages", title: "Tasks", subtitle: "Open worklist — results, gaps, identity, claims", meta: "General", keywords: ["tasks", "worklist", "todo", "follow up", "gaps"], destination: { kind: "page", page: "tasks" }, Icon: CheckIcon },
  { id: "page-telehealth", scope: "pages", title: "Telehealth", subtitle: "Live consult room & waiting room", meta: "Clinical", keywords: ["telehealth", "video", "consult", "call", "waiting room", "live"], destination: { kind: "page", page: "telehealth" }, Icon: TeleConsultationIcon },
  { id: "page-care-plans", scope: "pages", title: "Care programs", subtitle: "Protocol templates and enrolled patients", meta: "Clinical", keywords: ["care program", "care plan", "protocol", "template", "cohort", "enrol", "diabetes", "ckd", "hypertension", "follow up"], destination: { kind: "page", page: "care-plans" }, Icon: HeartIcon },
  { id: "page-pharma-calls", scope: "pages", title: "Rep disclosure log", subtitle: "Sample disclosure & compliance record", meta: "Business", keywords: ["rep", "pharma", "disclosure", "detailing", "samples", "compliance", "sunshine"], destination: { kind: "page", page: "pharma-calls" }, Icon: NoteIcon },
  { id: "page-dispensary", scope: "pages", title: "Dispensary", subtitle: "Dispense medication and track stock", meta: "Pharmacy", keywords: ["dispensary", "dispense", "medication", "pharmacy", "stock", "rx"], destination: { kind: "page", page: "dispensary" }, Icon: PillIcon },
  { id: "page-supplies", scope: "pages", title: "Supplies", subtitle: "Tubes and collection consumables", meta: "Pharmacy", keywords: ["supplies", "tubes", "consumables", "inventory", "reorder", "edta"], destination: { kind: "page", page: "supplies" }, Icon: TubeIcon },
  { id: "page-refer-earn", scope: "pages", title: "Refer & earn", subtitle: "Invite doctors and track rewards", meta: "Business", keywords: ["refer", "earn", "referral", "invite", "reward", "aba", "growth"], destination: { kind: "page", page: "refer-earn" }, Icon: ShareIcon },
  { id: "page-settings", scope: "pages", title: "Settings", subtitle: "Workspace, payments, team, security", meta: "Workspace", keywords: ["settings", "preferences", "configure", "options"], destination: { kind: "settings", section: "overview" }, Icon: SettingIcon },
  { id: "page-settings-account", scope: "pages", title: "Account & verification", subtitle: "Identity, medical licence, KYD", meta: "Settings", keywords: ["account", "verification", "licence", "kyd", "identity", "profile"], destination: { kind: "settings", section: "account" }, Icon: SettingIcon },
  { id: "page-settings-billing", scope: "pages", title: "Payments", subtitle: "Bank, KHQR, insurers, netting", meta: "Settings", keywords: ["billing", "payments", "settlement", "bank", "aba", "khqr", "payout", "insurers"], destination: { kind: "settings", section: "billing" }, Icon: SettingIcon },
  { id: "page-settings-members", scope: "pages", title: "Team access", subtitle: "Roles, invites, permissions", meta: "Settings", keywords: ["members", "access", "roles", "invites", "team", "staff"], destination: { kind: "settings", section: "members" }, Icon: SettingIcon },
  { id: "page-settings-security", scope: "pages", title: "Security", subtitle: "Sessions and PHI access log", meta: "Settings", keywords: ["security", "audit", "sessions", "phi", "log", "privacy"], destination: { kind: "settings", section: "security" }, Icon: SettingIcon },
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
    ...pageNavSearchRecords,
    ...actionSearchRecords,
  ];
}

/* Idle-state list: only the first few items that likely need the doctor now. */
function getNeedsAttentionRecords(
  records: SearchRecord[],
  bookingRecords: SearchRecord[] = seededBookingSearchRecords,
): SearchRecord[] {
  const flaggedPatients = records
    .filter((record) => record.scope === "patients" && /Abnormal labs|Overdue follow-up|Needs review/.test(record.meta))
    .slice(0, 2);
  const activeBookings = bookingRecords.filter((record) => /Results back|Flagged|Awaiting visit/.test(record.meta));

  return [...flaggedPatients, ...activeBookings].slice(0, 4);
}

function getHomeRecentBookings(bookings: BookingListItem[], limit: number): BookingListItem[] {
  const selected: BookingListItem[] = [];
  const selectedCodes = new Set<string>();
  const selectedPatients = new Set<string>();

  for (const booking of bookings) {
    if (selected.length >= limit) break;

    const patientKey = booking.patientId || booking.patientName;
    if (selectedPatients.has(patientKey)) continue;

    selected.push(booking);
    selectedCodes.add(booking.code);
    selectedPatients.add(patientKey);
  }

  for (const booking of bookings) {
    if (selected.length >= limit) break;
    if (selectedCodes.has(booking.code)) continue;

    selected.push(booking);
    selectedCodes.add(booking.code);
  }

  return selected;
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

/* Section header used when results are grouped by scope (plural form). */
const searchScopeSectionLabels: Record<SearchRecordScope, string> = {
  patients: "Patients",
  bookings: "Bookings",
  labs: "Lab orders",
  invoices: "Invoices",
  staff: "Members",
  catalog: "Lab catalog",
  carePlan: "Care programs",
  pages: "Pages",
  actions: "Actions",
};

function getSearchScopeSectionLabel(scope: SearchRecordScope) {
  return searchScopeSectionLabels[scope] ?? "Matches";
}

/* Deterministic ranking tiers — exact identifier first, then patients and
   care plans, bookings, lab orders/tests, billing/staff, pages, actions last. */
const searchScopeTier: Record<SearchRecordScope, number> = {
  patients: 6,
  carePlan: 6,
  bookings: 5,
  labs: 4,
  catalog: 4,
  invoices: 3,
  staff: 3,
  pages: 2,
  actions: 1,
};

function scoreSearchRecord(
  record: SearchRecord,
  tokens: string[],
  queryNorm: string,
  activeScope: SearchRecordScope | null,
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

function getGlobalSearchResults(records: SearchRecord[], query: string, activeScope: SearchRecordScope | null) {
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
    .slice(0, 24)
    .map((item) => item.record);
}

/* Ordered scope buckets for the grouped query view — clinical entities first,
   pages and actions last (mirrors searchScopeTier). */
const SEARCH_SCOPE_ORDER: SearchRecordScope[] = [
  "patients",
  "bookings",
  "labs",
  "carePlan",
  "catalog",
  "invoices",
  "staff",
  "pages",
  "actions",
];

/* Group the ranked results by scope, preserving rank order within each bucket
   and capping each bucket so no single scope floods the list. */
function getGroupedSearchResults(
  records: SearchRecord[],
  query: string,
  activeScope: SearchRecordScope | null,
): Array<{ scope: SearchRecordScope; label: string; records: SearchRecord[] }> {
  const ranked = getGlobalSearchResults(records, query, activeScope);
  if (activeScope) {
    return ranked.length > 0
      ? [{ scope: activeScope, label: getSearchScopeSectionLabel(activeScope), records: ranked }]
      : [];
  }

  const perScopeCap = 5;
  const buckets = new Map<SearchRecordScope, SearchRecord[]>();
  for (const record of ranked) {
    const bucket = buckets.get(record.scope) ?? [];
    if (bucket.length < perScopeCap) {
      bucket.push(record);
      buckets.set(record.scope, bucket);
    }
  }

  return SEARCH_SCOPE_ORDER.filter((scope) => buckets.has(scope)).map((scope) => ({
    scope,
    label: getSearchScopeSectionLabel(scope),
    records: buckets.get(scope) ?? [],
  }));
}

/* Wrap the matched query tokens in <mark> so the user sees why a row matched
   (cmdk / Linear pattern). ASCII-oriented; non-Latin scripts pass through. */
function highlightSearchMatch(text: string, tokens: string[]): ReactNode {
  const escaped = tokens
    .filter((token) => token.length > 0)
    .map((token) => token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (escaped.length === 0) return text;

  const splitRe = new RegExp(`(${escaped.join("|")})`, "ig");
  const matchRe = new RegExp(`^(?:${escaped.join("|")})$`, "i");
  return text.split(splitRe).map((part, index) =>
    part && matchRe.test(part) ? (
      <mark className="global-search-mark" key={index}>
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

function countPatients(match: (patient: Patient) => boolean) {
  return patients.filter(match).length;
}

function matchesQuickFilter(patient: Patient, quickFilter: QuickFilterId) {
  if (quickFilter === "recentlyActive") return parseLastSeenDays(patient.lastSeen) <= 7;
  if (quickFilter === "needsAttention") return patientNeedsAttention(patient);
  if (quickFilter === "needsReview") return patient.needsReview && !getPatientScreeningDue(patient);
  if (quickFilter === "overdueFollowUp") return patient.overdueFollowUp;
  if (quickFilter === "abnormalLabs") return patient.abnormalLabs;
  if (quickFilter === "screeningDue") return getPatientScreeningDue(patient);
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

function matchesPatientQuery(patient: Patient, index: number, queryTokens: string[]) {
  if (queryTokens.length === 0) return true;

  const haystack = normalizeSearchText(
    [
      patient.name,
      patient.khmerName,
      patient.phone,
      getPatientMrn(index),
      patient.primaryCondition,
      ...patient.activeConditions,
      ...getClinicalReviewLabels(patient),
    ].join(" "),
  );

  return queryTokens.every((token) => haystack.includes(token));
}

function getFilteredPatients(filterState: FilterState, query: string) {
  const queryTokens = getSearchTokens(query);

  const matched = patients.filter(
    (patient, index) =>
      matchesQuickFilter(patient, filterState.quickFilter) &&
      matchesPanelFilters(patient, filterState) &&
      matchesPatientQuery(patient, index, queryTokens),
  );

  /* A search ranks by relevance (kept in source order); otherwise the roster is
     a worklist — clinical urgency first, then most-recently seen. */
  if (queryTokens.length > 0) return matched;
  return [...matched].sort((a, b) => {
    const rank = getPatientUrgencyRank(a) - getPatientUrgencyRank(b);
    if (rank !== 0) return rank;
    return parseLastSeenDays(a.lastSeen) - parseLastSeenDays(b.lastSeen);
  });
}

function getCompactFilterLabel(label: string) {
  return label.replace(/\s*\([^)]*\)/g, "");
}

function getConditionFilterLabel(condition: ConditionFilterId) {
  const option = [...conditionFilters, ...cardiovascularConditions].find((filter) => filter.id === condition);
  return option ? getCompactFilterLabel(option.label) : condition;
}

function getAcuityFilterLabel(acuity: AcuityFilterId) {
  return acuityFilters.find((filter) => filter.id === acuity)?.label ?? acuity;
}

function getQuickFilterLabel(quickFilter: QuickFilterId) {
  return quickFilters.find((filter) => filter.id === quickFilter)?.label ?? quickFilter;
}

function getPatientFilterChips(filterState: FilterState, query: string): PatientFilterChip[] {
  const trimmedQuery = query.trim();
  const chips: PatientFilterChip[] = [];

  if (trimmedQuery) {
    chips.push({ id: "search", kind: "search", label: `Search: ${trimmedQuery}` });
  }

  if (filterState.quickFilter !== "all") {
    chips.push({
      id: filterState.quickFilter,
      kind: "quickFilter",
      label: getQuickFilterLabel(filterState.quickFilter),
    });
  }

  filterState.conditions.forEach((condition) => {
    chips.push({ id: condition, kind: "condition", label: getConditionFilterLabel(condition) });
  });

  filterState.acuities.forEach((acuity) => {
    chips.push({ id: acuity, kind: "acuity", label: getAcuityFilterLabel(acuity) });
  });

  return chips;
}

function hasActivePatientFilters(filterState: FilterState, query: string) {
  return getPatientFilterChips(filterState, query).length > 0;
}

function getQuickFilterCounts(filterState: FilterState, query: string): Record<QuickFilterId, number> {
  const queryTokens = getSearchTokens(query);

  return quickFilters.reduce(
    (counts, filter) => ({
      ...counts,
      [filter.id]: patients.filter(
        (patient, index) =>
          matchesQuickFilter(patient, filter.id) &&
          matchesPanelFilters(patient, filterState) &&
          matchesPatientQuery(patient, index, queryTokens),
      ).length,
    }),
    {} as Record<QuickFilterId, number>,
  );
}

function parseLastSeenDays(lastSeen: string): number {
  const match = lastSeen.match(/(\d+)\s*d/);
  if (match) return Number(match[1]);
  if (/today/i.test(lastSeen)) return 0;
  return Number.MAX_SAFE_INTEGER;
}

function getPatientScreeningDue(patient: Pick<Patient, "reviewItems">): boolean {
  return patient.reviewItems.some((item) => /screening/i.test(item));
}

/* A non-screening review item is a "real" review (lab/result needing the doctor);
   screening lives in its own low-noise lane. */
function getPatientReviewItem(patient: Pick<Patient, "reviewItems">): string | undefined {
  return patient.reviewItems.map((item) => item.trim()).find((item) => item && !/screening/i.test(item));
}

type AttentionTier = "high" | "medium" | "low" | "none";

/* The single most actionable reason this patient surfaces, with a priority tier
   that drives tone + sort. Abnormal labs lead (the only red); a real review is
   next; screening-due is its own lane; overdue follow-up stays amber so red
   remains reserved for lab risk. */
function getPatientAttention(
  patient: Pick<Patient, "reviewItems" | "abnormalLabs" | "overdueFollowUp">,
): { label: string; tier: AttentionTier; tone: "danger" | "warning" | "info" | "neutral" } {
  const reviewReal = getPatientReviewItem(patient);
  const screening = patient.reviewItems.find((item) => /screening/i.test(item));
  if (patient.abnormalLabs) return { label: "Recent abnormal labs", tier: "high", tone: "danger" };
  if (reviewReal) return { label: reviewReal, tier: "high", tone: "warning" };
  if (screening) return { label: "Screening due", tier: "medium", tone: "info" };
  if (patient.overdueFollowUp) return { label: "Follow-up overdue", tier: "low", tone: "warning" };
  return { label: "No open task", tier: "none", tone: "neutral" };
}

/* What the doctor does next — the verb, not just the problem. */
function getPatientNextAction(
  patient: Pick<Patient, "reviewItems" | "abnormalLabs" | "overdueFollowUp">,
): string {
  if (patient.abnormalLabs) return "Review abnormal result";
  if (getPatientReviewItem(patient)) return "Review and order follow-up";
  if (getPatientScreeningDue(patient)) return "Order screening labs";
  if (patient.overdueFollowUp) return "Schedule follow-up";
  return "Open chart";
}

/* Last activity = recency only; clinical state is already in attention/action. */
function getPatientLastActivity(patient: Pick<Patient, "lastSeen">): string {
  return `Seen ${patient.lastSeen}`;
}

function patientNeedsAttention(
  patient: Pick<Patient, "needsReview" | "abnormalLabs" | "overdueFollowUp">,
): boolean {
  return patient.abnormalLabs || patient.needsReview || patient.overdueFollowUp;
}

/* Default sort key — clinical urgency, not alphabet. Abnormal labs → real review
   → screening → overdue → recently active → everyone else. */
function getPatientUrgencyRank(
  patient: Pick<Patient, "reviewItems" | "abnormalLabs" | "overdueFollowUp" | "lastSeen">,
): number {
  if (patient.abnormalLabs) return 0;
  if (getPatientReviewItem(patient)) return 1;
  if (getPatientScreeningDue(patient)) return 2;
  if (patient.overdueFollowUp) return 3;
  if (parseLastSeenDays(patient.lastSeen) <= 7) return 4;
  return 5;
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
  const Icon = src.includes("chevron-left")
    ? ChevronRightIcon
    : src.includes("chevron-right")
      ? ChevronRightIcon
      : SearchIcon;

  return (
    <span className={`figma-icon ${className}`} style={{ "--icon-size": `${size}px` } as CSSProperties}>
      <Icon
        aria-hidden
        size={size}
        style={{ transform: src.includes("chevron-left") ? "rotate(180deg)" : undefined }}
        variant="stroke"
      />
    </span>
  );
}

/* Doctor intake is identity-first (phone → OTP → reuse-or-provisional), never a
   raw "create record" form — phone is a contact key, not an identity. The label
   says "Start intake" so it never reads as a reception-style registry create. */
function NewPatientButton({ onClick }: { onClick: () => void }) {
  return (
    <Button aria-label="Start patient intake" icon={<PlusIcon size={14} variant="stroke" />} onClick={onClick}>
      Start intake
    </Button>
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
  return (
    <FilterPrimitives.Trigger
      count={count > 0 ? count : undefined}
      expanded={expanded}
      onClick={onClick}
      state={count > 0 ? "active" : "rest"}
    />
  );
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
        <span>Search conditions or ICD-10...</span>
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
  tone = "neutral",
  onClick,
}: {
  label: string;
  count: number;
  active?: boolean;
  tone?: "neutral" | "brand" | "danger" | "warning" | "ai";
  onClick: () => void;
}) {
  return (
    <button
      aria-pressed={active}
      className={`status-chip tone-${tone}${active ? " active" : ""}`}
      onClick={onClick}
      type="button"
    >
      <span>{label}</span>
      <span className="chip-count">{count}</span>
    </button>
  );
}

function getQuickFilterTone(filterId: QuickFilterId): "neutral" | "brand" | "danger" | "warning" | "ai" {
  if (filterId === "abnormalLabs") return "danger";
  if (filterId === "overdueFollowUp") return "ai";
  if (filterId === "screeningDue") return "brand";
  if (filterId === "needsAttention") return "warning";
  return "neutral";
}

/* Attention column — why this patient is on the worklist right now, ranked by
   tier. Tone is meaningful: danger only for abnormal labs, blue for screening,
   amber for follow-up/review. A leading dot makes the tier scan down the column. */
function PatientAttentionCell({
  patient,
}: {
  patient: Pick<Patient, "reviewItems" | "abnormalLabs" | "overdueFollowUp">;
}) {
  const attention = getPatientAttention(patient);

  if (attention.tier === "none") {
    return (
      <span className="patient-status neutral" title="No open task">
        —
      </span>
    );
  }

  return (
    <span className={`patient-status ${attention.tone}`} title={attention.label}>
      <span className="patient-attention-dot" aria-hidden />
      <span className="patient-status-label">{attention.label}</span>
    </span>
  );
}

/* What the doctor does next, not just what's wrong. */
function PatientNextActionCell({
  patient,
}: {
  patient: Pick<Patient, "reviewItems" | "abnormalLabs" | "overdueFollowUp">;
}) {
  const attention = getPatientAttention(patient);
  const isAction = attention.tier !== "none";
  return (
    <span className={`next-action-text priority-${attention.tier}${isAction ? " is-action" : ""}`}>
      <span className="next-action-label">{getPatientNextAction(patient)}</span>
      {isAction ? (
        <ChevronRightIcon aria-hidden="true" className="patient-next-action-chevron" size={14} variant="stroke" />
      ) : null}
    </span>
  );
}

/* Last activity — recency only; lab state already lives in Attention + Next action. */
function PatientLastActivityCell({ patient }: { patient: Pick<Patient, "lastSeen"> }) {
  const activity = getPatientLastActivity(patient);
  return (
    <span className="last-activity-cell">{activity}</span>
  );
}

/* Problem list — primary condition leads, comorbidities trail. The
   clinical "who is this" once the status tells you "why now". */
function ClinicalContextCell({
  patient,
}: {
  patient: Pick<Patient, "primaryCondition" | "activeConditions">;
}) {
  const primaryLabel = patient.primaryCondition.trim() || "Problem list not recorded";
  const activeLabels = patient.activeConditions.map((label) => label.trim()).filter(Boolean);
  const visibleActiveLabels = activeLabels.slice(0, 2);
  const hiddenActiveCount = activeLabels.length - visibleActiveLabels.length;

  return (
    <div className="clinical-context-cell" title={getClinicalProblemText(patient)}>
      <strong>{primaryLabel}</strong>
      {visibleActiveLabels.length > 0 || hiddenActiveCount > 0 ? (
        <span className="clinical-context-secondary">
          {visibleActiveLabels.map((label, index) => (
            <span key={label}>
              {index > 0 ? <span className="clinical-summary-separator">·</span> : null}
              {label}
            </span>
          ))}
          {hiddenActiveCount > 0 ? (
            <span className="clinical-summary-more">
              {visibleActiveLabels.length > 0 ? <span className="clinical-summary-separator">·</span> : null}
              +{hiddenActiveCount} more
            </span>
          ) : null}
        </span>
      ) : null}
    </div>
  );
}

function PatientRow({ patient, onOpenPatient }: { patient: Patient; onOpenPatient: (patient: Patient) => void }) {
  const clinicalSummary = getClinicalSummaryText(patient);
  const attention = getPatientAttention(patient);
  const nextAction = getPatientNextAction(patient);
  const sexChar = patient.sex === "female" ? "F" : "M";
  const sexLabel = patient.sex === "female" ? "female" : "male";

  return (
    <button
      aria-label={`Open ${patient.name} record, ${patient.age} year old ${sexLabel}, ${patient.phone}. Attention: ${attention.label}. Next action: ${nextAction}. Clinical context: ${clinicalSummary}`}
      className={`table-row patient-table-row acuity-${patient.acuity}`}
      onClick={() => onOpenPatient(patient)}
      style={PATIENT_ROSTER_GRID_STYLE}
      type="button"
    >
      <div className="table-cell patient-cell">
        <Avatar initials={getNameInitials(patient.name)} name={patient.name} size="sm" />
        <div className="patient-name">
          <span className="patient-name-primary">
            <strong>{patient.name}</strong>
          </span>
          <span className="patient-identity-line">
            <span className="patient-khmer">{patient.khmerName}</span>
            <span className="patient-meta-dot" aria-hidden>
              ·
            </span>
            <span className="patient-age">
              {patient.age} {sexChar}
            </span>
          </span>
        </div>
      </div>
      <div className="table-cell patient-phone-table-cell">
        <span className="patient-phone-value">{patient.phone}</span>
      </div>
      <div className="table-cell clinical-context-table-cell">
        <ClinicalContextCell patient={patient} />
      </div>
      <div className="table-cell patient-reason-table-cell">
        <PatientAttentionCell patient={patient} />
      </div>
      <div className="table-cell last-activity-table-cell">
        <PatientLastActivityCell patient={patient} />
      </div>
      <div className="table-cell next-action-table-cell">
        <PatientNextActionCell patient={patient} />
      </div>
    </button>
  );
}

function PatientTable({
  currentPage,
  hasActiveFilters,
  rows,
  onClearFilters,
  onOpenPatient,
  onPageChange,
}: {
  currentPage: number;
  hasActiveFilters: boolean;
  rows: Patient[];
  onClearFilters: () => void;
  onOpenPatient: (patient: Patient) => void;
  onPageChange: (page: number) => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const [pageSize, setPageSize] = useState(PATIENT_PAGE_SIZE);

  // Size each page to the rows that fit the viewport without scrolling.
  // Anchored to the list's top, so changing pageSize never moves the
  // measurement point — no feedback loop. Recomputed on mount and resize.
  useEffect(() => {
    const measure = () => {
      const node = listRef.current;
      if (!node) return;
      const top = node.getBoundingClientRect().top;
      const ROW_HEIGHT = 56;
      const HEAD_HEIGHT = 36;
      const FOOTER_RESERVE = 48; // pagination row + table gap + bottom breathing room
      const available = window.innerHeight - top - HEAD_HEIGHT - FOOTER_RESERVE;
      const fit = Math.floor(available / ROW_HEIGHT);
      setPageSize(Math.max(5, Math.min(fit, 40)));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStart = (safeCurrentPage - 1) * pageSize;
  const pagePatients = rows.slice(pageStart, pageStart + pageSize);

  return (
    <div className="patient-list" ref={listRef}>
      <section className="patient-table patient-roster" aria-label="Patient list">
        <div className="table-row table-head" style={PATIENT_ROSTER_GRID_STYLE}>
          <div className="table-cell">Patient</div>
          <div className="table-cell">Phone</div>
          <div className="table-cell">Clinical context</div>
          <div className="table-cell">Attention</div>
          <div className="table-cell">Last activity</div>
          <div className="table-cell">Next action</div>
        </div>
        {pagePatients.length > 0 ? (
          pagePatients.map((patient) => (
            <PatientRow key={patient.name} patient={patient} onOpenPatient={onOpenPatient} />
          ))
        ) : (
          <div className="table-empty">
            <strong>No patients match this view</strong>
            <span>Clear filters or search by name, Khmer name, MRN, or phone.</span>
            {hasActiveFilters && (
              <button className="table-empty-action" type="button" onClick={onClearFilters}>
                Clear filters
              </button>
            )}
          </div>
        )}
      </section>
      <Pagination
        currentPage={safeCurrentPage}
        itemName="matching patients"
        pageSize={pageSize}
        summaryMode="visible"
        totalItems={rows.length}
        onPageChange={onPageChange}
      />
    </div>
  );
}

function PatientSearchInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="search-input table-search-input patient-search-input">
      <FigmaIcon src="/figma/icon-search.svg" size={24} />
      <input
        aria-label="Search patients"
        autoComplete="off"
        className="search-input-field"
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search by name, Khmer name, MRN, or phone number..."
        spellCheck={false}
        type="search"
        value={value}
      />
      {value.trim() ? (
        <button aria-label="Clear patient search" className="table-search-clear" onClick={() => onChange("")} type="button">
          <CloseSmallIcon size={14} variant="stroke" />
        </button>
      ) : null}
    </div>
  );
}

function PatientFilterSummary({
  chips,
  shownCount,
  totalCount,
  onClearAll,
  onRemoveChip,
}: {
  chips: PatientFilterChip[];
  shownCount: number;
  totalCount: number;
  onClearAll: () => void;
  onRemoveChip: (chip: PatientFilterChip) => void;
}) {
  if (chips.length === 0 && shownCount === totalCount) return null;

  return (
    <div className={`patient-filter-summary${chips.length > 0 ? " has-chips" : ""}`} aria-live="polite">
      {/* metadata, not a headline — only call out a number when filtering narrows it */}
      <p className="patient-filter-count">
        {shownCount === totalCount ? `${totalCount} patients` : `${shownCount} of ${totalCount} patients`}
      </p>
      {chips.length > 0 ? (
        <div className="patient-filter-chip-row" aria-label="Applied patient filters">
          {chips.map((chip) => (
            <button
              aria-label={`Remove ${chip.label}`}
              className={`patient-filter-chip ${chip.kind}`}
              key={`${chip.kind}-${chip.id}`}
              onClick={() => onRemoveChip(chip)}
              type="button"
            >
              <span>{chip.label}</span>
              <CloseSmallIcon size={12} variant="stroke" />
            </button>
          ))}
          <button className="patient-filter-clear" type="button" onClick={onClearAll}>
            Clear all
          </button>
        </div>
      ) : null}
    </div>
  );
}

function PatientPage({
  onOpenPatient,
}: {
  onOpenPatient: (patient: Patient) => void;
}) {
  const [filterState, setFilterState] = useState<FilterState>(defaultFilterState);
  const [patientQuery, setPatientQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const filteredPatients = getFilteredPatients(filterState, patientQuery);
  const filterChips = getPatientFilterChips(filterState, patientQuery);
  const activePatientFilters = hasActivePatientFilters(filterState, patientQuery);
  const selectedFilterCount = filterState.conditions.length + filterState.acuities.length;
  const quickFilterCounts = getQuickFilterCounts(filterState, patientQuery);
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
  const updatePatientQuery = (value: string) => {
    setPatientQuery(value);
    setCurrentPage(1);
  };
  const clearAllPatientFilters = () => {
    setFilterState(defaultFilterState);
    setPatientQuery("");
    setCurrentPage(1);
  };
  const removePatientFilterChip = (chip: PatientFilterChip) => {
    if (chip.kind === "search") {
      updatePatientQuery("");
      return;
    }

    if (chip.kind === "quickFilter") {
      updateFilterState((current) => ({ ...current, quickFilter: "all" }));
      return;
    }

    if (chip.kind === "condition") {
      updateFilterState((current) => ({
        ...current,
        conditions: current.conditions.filter((condition) => condition !== chip.id),
      }));
      return;
    }

    updateFilterState((current) => ({
      ...current,
      acuities: current.acuities.filter((acuity) => acuity !== chip.id),
    }));
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
        <PatientSearchInput value={patientQuery} onChange={updatePatientQuery} />
        <div className="toolbar patient-table-toolbar">
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
          <PatientFilterSummary
            chips={filterChips}
            shownCount={filteredPatients.length}
            totalCount={patients.length}
            onClearAll={clearAllPatientFilters}
            onRemoveChip={removePatientFilterChip}
          />
          <div className="quick-filters patient-quick-filter-rail" role="group" aria-label="Patient table filters">
            {quickFilters
              .filter(
                (filter) =>
                  filter.id === "all" ||
                  filterState.quickFilter === filter.id ||
                  quickFilterCounts[filter.id] > 0,
              )
              .map((filter) => (
                <StatusChip
                  key={filter.id}
                  active={filterState.quickFilter === filter.id}
                  count={quickFilterCounts[filter.id]}
                  label={filter.label}
                  tone={getQuickFilterTone(filter.id)}
                  onClick={() => updateFilterState((current) => ({ ...current, quickFilter: filter.id }))}
                />
              ))}
          </div>
        </div>
        <PatientTable
          currentPage={currentPage}
          hasActiveFilters={activePatientFilters}
          rows={filteredPatients}
          onClearFilters={clearAllPatientFilters}
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
          <InfoIcon size={10} variant="stroke" />
        </span>
      )}
      {badge.icon === "clock" && (
        <span className="record-badge-icon">
          <ClockIcon size={12} variant="stroke" />
        </span>
      )}
      <span>{badge.label}</span>
    </span>
  );
}

function RecordMetaLine({ patient, clinicalContext }: { patient: RecordPatient; clinicalContext: RecordClinicalContext }) {
  const identityItems = [`${patient.age} y`, patient.sex, `DOB ${patient.dob}`, `MRN ${patient.mrn}`];

  return (
    <p className="record-meta-line" aria-label={identityItems.join(", ")}>
      {identityItems.map((item) => (
        <span className="record-meta-token" key={item}>
          {item}
        </span>
      ))}
      {clinicalContext === "none" &&
        patient.problems.slice(0, 2).map((problem) => (
          <span className="record-meta-token" key={problem.label}>
            {problem.label}
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
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const closeSwitcher = () => {
    setOpen(false);
    setQuery("");
  };

  const normalizedQuery = query.trim().toLowerCase();
  const filtered = normalizedQuery
    ? patients.filter(
        (patient) =>
          patient.name.toLowerCase().includes(normalizedQuery) ||
          patient.problems.some((problem) => problem.label.toLowerCase().includes(normalizedQuery)),
      )
    : patients;

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) closeSwitcher();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeSwitcher();
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
        onClick={() => {
          if (open) closeSwitcher();
          else setOpen(true);
        }}
        type="button"
      >
        <ChevronDownIcon size={18} variant="stroke" />
      </button>
      {open && (
        <div aria-label="Switch patient" className="patient-switcher-menu" role="listbox">
          <div className="patient-switcher-search">
            <SearchIcon size={15} variant="stroke" />
            <input
              autoFocus
              className="patient-switcher-search-input"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search patients"
              type="text"
              value={query}
            />
          </div>
          <div className="patient-switcher-list">
            {filtered.length > 0 ? (
              filtered.map((patient) => {
                const active = patient.id === currentId;
                return (
                  <button
                    aria-selected={active}
                    className={`patient-switcher-option${active ? " is-active" : ""}`}
                    key={patient.id}
                    onClick={() => {
                      onSelect(patient.id);
                      closeSwitcher();
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
              })
            ) : (
              <p className="patient-switcher-empty">No patients match “{query}”</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function RecordViewToggle({
  expanded,
  controlsId,
  onClick,
}: {
  expanded: boolean;
  controlsId?: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-controls={controlsId}
      aria-expanded={expanded}
      className="record-view-more"
      onClick={onClick}
      type="button"
    >
      <span>{expanded ? "View less" : "View more"}</span>
      <span className={`record-view-icon${expanded ? " expanded" : ""}`}>
        <ChevronRightIcon size={16} variant="stroke" />
      </span>
    </button>
  );
}

function formatRecordBadgeSummary(badges: RecordBadgeData[]) {
  if (badges.length === 0) return null;

  return {
    primary: badges[0],
    overflow: Math.max(0, badges.length - 1),
  };
}

function RecordClinicalSignal({
  label,
  meta,
  tone = "neutral",
  value,
}: {
  label: string;
  meta?: string;
  tone?: RecordBadgeData["tone"];
  value: string;
}) {
  return (
    <div className={`record-signal record-signal-${tone ?? "neutral"}`}>
      <span className="record-signal-label">{label}</span>
      <strong>{value}</strong>
      {meta && <span className="record-signal-meta">{meta}</span>}
    </div>
  );
}

function RecordClinicalCompact({
  due,
  expanded,
  problems,
  flags,
  onToggle,
}: {
  due?: RecordClinicalGroup["due"];
  expanded: boolean;
  problems: RecordBadgeData[];
  flags: RecordBadgeData[];
  onToggle: () => void;
}) {
  const problemSummary = formatRecordBadgeSummary(problems);
  const flagSummary = formatRecordBadgeSummary(flags);

  return (
    <div className="record-clinical-strip compact">
      <div className="record-signal-row">
        {problemSummary && (
          <RecordClinicalSignal
            label="Problems"
            meta={problemSummary.overflow > 0 ? `+${problemSummary.overflow}` : undefined}
            value={problemSummary.primary.label}
          />
        )}
        {flagSummary && (
          <RecordClinicalSignal
            label="Recent abnormal"
            meta={flagSummary.overflow > 0 ? `+${flagSummary.overflow}` : undefined}
            tone={flagSummary.primary.tone}
            value={flagSummary.primary.label}
          />
        )}
        {due && <RecordClinicalSignal label="Due" meta={due.followUp} tone="warning" value={due.lead} />}
      </div>
      <RecordViewToggle controlsId="record-clinical-context" expanded={expanded} onClick={onToggle} />
    </div>
  );
}

function RecordClinicalGroupRow({ group }: { group: RecordClinicalGroup }) {
  const label = formatRecordClinicalGroupLabel(group.label);

  return (
    <div className="record-clinical-group">
      <p className="record-clinical-label">{label}</p>
      {group.badges && (
        <div className="record-clinical-badges">
          {group.badges.map((badge) => (
            <span className={`record-context-token record-context-token-${badge.tone ?? "neutral"}`} key={badge.label}>
              {badge.icon === "clock" && <ClockIcon size={12} variant="stroke" />}
              {badge.icon === "info" && <InfoIcon size={10} variant="stroke" />}
              <span>{badge.label}</span>
            </span>
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

function formatRecordClinicalGroupLabel(label: string) {
  switch (label) {
    case "MONITOR · IN REMISSION":
      return "In remission";
    case "REPORTED · UNVERIFIED":
      return "Reported, unverified";
    case "RECENT ABNORMAL":
      return "Recent labs";
    case "LAB CONTEXT":
      return "Lab context";
    default:
      return label.charAt(0) + label.slice(1).toLowerCase();
  }
}

function RecordClinicalExpanded({
  groups,
}: {
  groups: RecordClinicalGroup[];
}) {
  return (
    <div
      aria-label="Expanded clinical context"
      className="record-clinical-strip expanded"
      id="record-clinical-context"
      role="region"
    >
      <div className="record-expanded-context">
        <div className="record-expanded-groups">
          {groups.map((group) => (
            <RecordClinicalGroupRow group={group} key={group.label} />
          ))}
        </div>
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

type ClinicalDrawerId = "note" | "rx" | "icd" | "refer" | "followup" | "finish" | "charge";

function NoteDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const {
    patientId,
    note,
    setNote,
    noteStatus,
    saveNoteDraft,
    signNote,
    claimChecks,
    claimReady,
  } = useEncounter();
  const { plans: currentCarePlans } = useCarePlans(patientId);
  const { plans: fixtureCarePlans } = useCarePlans(ACTIVE_PATIENT_ID);
  const signed = noteStatus === "signed";
  const missingClaimChecks = claimChecks.filter((check) => !check.done);
  const statusDetail = signed
    ? "Signed clinical record"
    : noteStatus === "draft"
      ? "Draft. Sign before claim"
      : "Suggested draft from Labs and vitals";
  const linkedPlan = useMemo(
    () => livingPlanOf(currentCarePlans) ?? livingPlanOf(fixtureCarePlans),
    [currentCarePlans, fixtureCarePlans],
  );
  const linkedFocusLabels = useMemo(() => {
    if (!linkedPlan) return [];
    const focusById = new Map(linkedPlan.focuses.map((focus) => [focus.id, focus]));
    const preferred = ["f-ckd", "f-dm", "f-htn"]
      .map((focusId) => focusById.get(focusId))
      .filter((focus): focus is ClinicalFocus => Boolean(focus));
    const rest = linkedPlan.focuses.filter((focus) => !preferred.some((item) => item.id === focus.id));
    return [...preferred, ...rest]
      .filter((focus) => focus.focusStatus !== "archived")
      .slice(0, 3)
      .map((focus) => focus.shortLabel ?? focus.label);
  }, [linkedPlan]);
  const evidenceItems: Array<{ label: string; tone?: "danger" | "warning" | "success" }> = [
    { label: "BP 146/92", tone: "warning" },
    { label: "Creatinine 3.86 ↑", tone: "danger" },
    { label: "uACR 155.52 ↑", tone: "danger" },
    { label: "HbA1c due", tone: "warning" },
  ];

  return (
    <Drawer
      className="enc-note-drawer"
      footer={
        signed ? (
          <span className="enc-signed-line">
            <CheckIcon size={14} variant="stroke" />
            Signed and locked. Legal record.
          </span>
        ) : (
          <div className="enc-note-footer">
            <span className="enc-note-footer-copy">
              {claimReady ? "Signing locks the record and keeps the claim packet ready." : `Claim gate: ${missingClaimChecks.length} item${missingClaimChecks.length === 1 ? "" : "s"} left.`}
            </span>
            <UiButton intent="secondary" onClick={() => { saveNoteDraft(); onClose(); }}>
              Save draft
            </UiButton>
            <UiButton intent="primary" onClick={() => { signNote(); onClose(); }}>
              Sign note
            </UiButton>
          </div>
        )
      }
      onClose={onClose}
      open={open}
      subtitle={statusDetail}
      title="Visit note"
      width={540}
    >
      <div className="enc-form enc-note-form">
        <section className="enc-note-context" aria-label="Visit note source">
          <div className="enc-note-evidence-strip">
            <strong>Created from</strong>
            {evidenceItems.map((item) => (
              <span className={item.tone ? `is-${item.tone}` : undefined} key={item.label}>
                {item.label}
              </span>
            ))}
          </div>
          <div className="enc-note-evidence-strip enc-note-plan-strip">
            <strong>Care plan</strong>
            <span className="enc-note-plan-name">{linkedPlan?.title ?? "Not linked yet"}</span>
            {linkedFocusLabels.map((label, index) => (
              <span key={label}>{index === 0 ? `${label} focus` : label}</span>
            ))}
          </div>
        </section>

        <label className="enc-field enc-note-reason">
          <span>Reason for visit</span>
          <input disabled={signed} onChange={(event) => setNote({ reason: event.target.value })} value={note.reason} />
        </label>

        <div className="enc-note-soap" aria-label="SOAP note sections">
          {noteSoapSections.map(([key, label]) => (
            <label className="enc-field enc-soap-card" key={key}>
              <span className="enc-soap-head">
                <strong>{label}</strong>
              </span>
              <textarea
                disabled={signed}
                onChange={(event) => setNote({ [key]: event.target.value })}
                rows={label === "Objective" ? 4 : 3}
                spellCheck={false}
                value={note[key]}
              />
            </label>
          ))}
        </div>

        <p className="enc-hint enc-note-hint">
          <InfoIcon size={13} variant="stroke" />
          Review this draft before signing.
        </p>
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
  const queryText = normalizeIcdSearchText(query);
  const compactQuery = normalizeIcdCode(query);
  const queryTokens = useMemo(() => queryText.split(" ").filter(Boolean), [queryText]);
  const bareNumericQuery = isBareNumericIcdQuery(compactQuery, queryTokens);
  const search = useMemo(() => {
    if (!queryText && !compactQuery) {
      return { isQuery: false, results: localIcdEntries, total: localIcdEntries.length };
    }

    const ranked = icdSearchIndex
      .map((entry) => ({ entry, rank: getIcdSearchRank(entry, queryText, compactQuery, queryTokens) }))
      .filter((result): result is { entry: IcdSearchEntry; rank: number } => result.rank != null)
      .sort((a, b) => a.rank - b.rank || a.entry.searchOrder - b.entry.searchOrder);

    return {
      isQuery: true,
      results: ranked.slice(0, ICD_SEARCH_RESULT_LIMIT).map((result) => result.entry),
      total: ranked.length,
    };
  }, [compactQuery, queryText, queryTokens]);
  const searchSummary = !search.isQuery
    ? "Chart suggestions. Search by code or diagnosis."
    : bareNumericQuery
      ? "ICD-10 codes start with a letter. Try A23.3, or search a diagnosis name."
      : search.total === 0
        ? "No close match. Check spelling, code format, or search a broader clinical term."
        : `${search.total.toLocaleString()} close match${search.total === 1 ? "" : "es"} · showing ${search.results.length.toLocaleString()}.`;

  return (
    <Drawer
      className="icd-drawer"
      onClose={onClose}
      open={open}
      subtitle={`${ICD10_WHO_2019_SOURCE.name} · ${ICD10_WHO_2019_SOURCE.entryCount.toLocaleString()} entries`}
      title="Add ICD-10 diagnosis"
    >
      <div className="enc-form">
        <label className="enc-field">
          <span>Search</span>
          <input
            data-autofocus="true"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Code or diagnosis"
            value={query}
          />
        </label>
        <p aria-live="polite" className="enc-hint icd-search-summary">
          {searchSummary}
        </p>
        {search.results.length > 0 ? (
          <div className="icd-results">
            {search.results.map((entry) => {
              const onChart = icdCodes.includes(entry.code);
              const disabled = onChart || entry.codable === false;
              const action = getIcdEntryAction(entry, onChart);
              const resultClassName = `icd-result${onChart ? " is-added" : ""}${entry.codable === false ? " is-category" : ""}`;
              return (
                <button
                  aria-label={`${action} ${entry.code} ${entry.label}`}
                  className={resultClassName}
                  disabled={disabled}
                  key={entry.code}
                  onClick={() => addIcd(entry.code)}
                  type="button"
                >
                  <span className="icd-result-code">
                    <code>{entry.code}</code>
                  </span>
                  <span className="icd-result-copy">
                    <strong>{entry.label}</strong>
                    <span>{getIcdEntryMeta(entry, onChart)}</span>
                  </span>
                  <span className="icd-result-action">{action}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="icd-empty">No close match.</p>
        )}
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
  const listNames = (items: string[]) => {
    if (items.length <= 1) return items[0] ?? "";
    if (items.length === 2) return `${items[0]} and ${items[1]}`;
    return `${items.slice(0, -1).join(", ")}, and ${items.at(-1)}`;
  };

  type FinishRow = {
    id: string;
    label: string;
    done: boolean;
    detail: string;
    optional?: boolean;
    actions?: Array<{ label: string; drawer: ClinicalDrawerId; primary?: boolean; reason?: ChargeReason }>;
  };
  const rows: FinishRow[] = [
    {
      id: "note",
      label: "Visit note",
      done: isDone("note"),
      detail:
        noteStatus === "signed"
          ? "Signed to the record"
          : noteStatus === "draft"
            ? "Draft saved, not signed"
            : "No note yet",
      actions: isDone("note") ? undefined : [{ label: noteStatus === "draft" ? "Resume note" : "Add note", drawer: "note", primary: true }],
    },
    {
      id: "icd",
      label: "ICD-10 diagnosis",
      done: isDone("icd"),
      detail: isDone("icd") ? "Diagnosis coded" : "Not coded yet",
      actions: isDone("icd") ? undefined : [{ label: "Add code", drawer: "icd", primary: true }],
    },
    {
      id: "labs",
      label: "Lab evidence",
      done: isDone("labs"),
      detail: isDone("labs") ? "HbA1c results on file" : "No results attached",
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
      detail: isDone("therapy") ? "Rx, referral, or follow-up added" : "No Rx, referral, or follow-up yet",
      actions: isDone("therapy")
        ? undefined
        : [
            { label: "Prescribe", drawer: "rx", primary: true },
            { label: "Refer", drawer: "refer" },
            { label: "Schedule", drawer: "followup" },
          ],
    },
    {
      id: "followup",
      label: "Follow-up",
      done: followUp !== null,
      optional: true,
      detail: followUp ? `In ${followUp}` : "Not scheduled",
      actions: followUp ? undefined : [{ label: "Schedule", drawer: "followup", primary: true }],
    },
  ];

  /* Split the flat checklist so what needs action leads, optional follow-up
     sits apart, and settled checks demote to a quiet read-only group. */
  const todo = rows.filter((row) => !row.done && !row.optional);
  const optional = rows.filter((row) => !row.done && row.optional);
  const done = rows.filter((row) => row.done);
  const groups: Array<{ key: string; label: string; rows: FinishRow[]; muted?: boolean }> = [
    { key: "todo", label: "Required", rows: todo },
    { key: "optional", label: "Optional", rows: optional },
    { key: "done", label: "Already ready", rows: done, muted: true },
  ];
  const missingSummary = listNames(todo.map((row) => row.label.toLowerCase()));
  const readinessCopy = claimReady
    ? "Diagnosis, lab evidence, identity, note, and therapy plan are ready."
    : `Only the ${missingSummary} ${todo.length === 1 ? "is" : "are"} missing.`;

  const renderRow = (row: FinishRow, index: number) => (
    <div className={`finish-check-row${row.done ? " done" : ""}${row.optional ? " optional" : ""}`} key={row.id}>
      <span className="finish-check-status" aria-hidden>
        {row.done ? <CheckIcon size={14} variant="stroke" /> : row.optional ? <span className="summary-check-dot" /> : index + 1}
      </span>
      <div className="finish-check-copy">
        <strong>{row.label}</strong>
        <span>{row.detail}</span>
      </div>
      {row.actions && (
        <div className="finish-check-actions">
          {row.actions.map((action) => (
            <button
              className={`finish-check-action${action.primary ? " is-primary" : ""}`}
              key={action.label}
              onClick={() => openDrawer(action.drawer, action.reason ? { reason: action.reason } : undefined)}
              type="button"
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <Drawer
      className="finish-visit-drawer"
      footer={
        <>
          {claimReady ? (
            <span className="enc-signed-line">
              <CheckIcon size={14} variant="stroke" />
              Ready for claim submission
            </span>
          ) : (
            <span className="finish-claim-line">
              {remaining} required {remaining === 1 ? "step" : "steps"} left
            </span>
          )}
          <UiButton intent="secondary" onClick={onClose}>
            Close
          </UiButton>
          <UiButton
            disabled={!claimReady}
            intent="primary"
            onClick={() => {
              toast.success("Claim packet submitted");
              onClose();
            }}
          >
            Submit claim
          </UiButton>
        </>
      }
      onClose={onClose}
      open={open}
      subtitle={claimReady ? "All required evidence is in place" : "Before you submit the claim"}
      title={claimReady ? "Claim ready" : `${remaining} required ${remaining === 1 ? "step" : "steps"} left`}
      width={420}
    >
      <div className="finish-check-groups">
        <section className={`finish-readiness-card${claimReady ? " is-ready" : ""}`}>
          <p>Claim readiness</p>
          <strong>{claimReady ? "Ready to submit" : "Finish these first"}</strong>
          <span>{readinessCopy}</span>
        </section>
        {groups
          .filter((group) => group.rows.length > 0)
          .map((group) => (
            <section className={`finish-check-group${group.muted ? " finish-check-group--done" : ""}`} key={group.key}>
              <p className="k-section-label finish-check-group-label">{group.label}</p>
              <div className="finish-check-list">{group.rows.map(renderRow)}</div>
            </section>
          ))}
      </div>
    </Drawer>
  );
}

/* Clinical actions open from where their context lives — note/coding/therapy
   from the visit checklist, prescribing from Medications, referral from Next
   actions — so one provider hosts the drawers instead of a header menu. */
type ChargeContext = { reason?: ChargeReason };
type ClinicalDrawerApi = { openDrawer: (id: ClinicalDrawerId, ctx?: ChargeContext) => void };

const ClinicalDrawerContext = createContext<ClinicalDrawerApi | null>(null);

function useClinicalDrawers(): ClinicalDrawerApi {
  const api = useContext(ClinicalDrawerContext);
  if (!api) throw new Error("useClinicalDrawers must be used inside ClinicalDrawerProvider");
  return api;
}

function ClinicalDrawerProvider({ children, patientName }: { children: ReactNode; patientName?: string }) {
  const [activeDrawer, setActiveDrawer] = useState<ClinicalDrawerId | null>(null);
  const [chargeCtx, setChargeCtx] = useState<ChargeContext | null>(null);
  const close = () => setActiveDrawer(null);
  const api = useMemo<ClinicalDrawerApi>(
    () => ({
      openDrawer: (id, ctx) => {
        setChargeCtx(ctx ?? null);
        setActiveDrawer(id);
      },
    }),
    [],
  );

  return (
    <ClinicalDrawerContext.Provider value={api}>
      {children}
      <NoteDrawer onClose={close} open={activeDrawer === "note"} />
      <RxDrawer onClose={close} open={activeDrawer === "rx"} />
      <DiagnosisDrawer onClose={close} open={activeDrawer === "icd"} />
      <ReferDrawer onClose={close} open={activeDrawer === "refer"} />
      <FollowUpDrawer onClose={close} open={activeDrawer === "followup"} />
      <FinishVisitDrawer onClose={close} open={activeDrawer === "finish"} />
      <ChargePatientDrawer
        onClose={close}
        open={activeDrawer === "charge"}
        patientName={patientName}
        initialReason={chargeCtx?.reason}
      />
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
  const { claimChecks, claimReady, noteStatus } = useEncounter();
  const { openDrawer } = useClinicalDrawers();
  const claimRemaining = claimChecks.filter((check) => !check.done).length;
  const clinicalGroups =
    patient.id === "sokha-chan"
      ? recordExpandedGroups
      : [
          { label: "PROBLEMS", badges: patient.problems },
          { label: "RECENT ABNORMAL", badges: patient.flags },
        ];
  const dueSummary = clinicalGroups.find((group) => group.due)?.due;

  return (
    <section className="record-header" aria-label="Patient record header">
      <div className="record-identity-row">
        <div className="record-avatar">{patient.initials}</div>
        <div className="record-identity">
          <div className="record-identity-name">
            <h1>{patient.name}</h1>
            {patient.id.startsWith("intake-") && (
              <Badge tone="warning" icon={<WarningIcon size={12} variant="stroke" />}>
                Provisional · PSC verifies
              </Badge>
            )}
            <PatientSwitcher currentId={patient.id} onSelect={onSwitchPatient} patients={patients} />
          </div>
          <RecordMetaLine clinicalContext={currentContext} patient={patient} />
        </div>
        <div className="record-header-controls">
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
      <RecordClinicalCompact
        due={dueSummary}
        expanded={currentContext === "expanded"}
        flags={patient.flags}
        onToggle={() => setCurrentContext((context) => (context === "expanded" ? "compact" : "expanded"))}
        problems={patient.problems}
      />
      <RecordTabs activeTab={activeTab} onTabChange={onTabChange} />
      {currentContext === "expanded" && (
        <RecordClinicalExpanded groups={clinicalGroups} />
      )}
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

/* Collapse affordance shared by every Summary section card. The chevron rotates
   with state; sections default to collapsed so the chart reads as a compact
   stack of group headers the doctor expands on demand. */
function SummaryCollapseChevron({ open }: { open: boolean }) {
  return (
    <span className={`summary-section-chevron${open ? " is-open" : ""}`} aria-hidden>
      <ChevronRightIcon size={16} variant="stroke" />
    </span>
  );
}

function SummarySection({ focusSectionId, section }: { focusSectionId?: string | null; section: SummarySectionData }) {
  const Icon = section.Icon;
  const [open, setOpen] = useState(focusSectionId === section.id);

  useEffect(() => {
    if (focusSectionId === section.id) {
      const timer = window.setTimeout(() => setOpen(true), 0);
      return () => window.clearTimeout(timer);
    }
  }, [focusSectionId, section.id]);

  return (
    <section
      className={`summary-section${open ? " is-open" : " is-collapsed"}`}
      id={section.id}
      aria-labelledby={`${section.id}-title`}
    >
      <div className="summary-section-heading">
        <button
          aria-controls={`${section.id}-body`}
          aria-expanded={open}
          className="summary-section-toggle"
          onClick={() => setOpen((value) => !value)}
          type="button"
        >
          <Icon size={20} variant="stroke" />
          <h3 id={`${section.id}-title`}>{section.title}</h3>
          {section.badge && <RecordBadge badge={{ label: section.badge, tone: "info" }} />}
          <SummaryCollapseChevron open={open} />
        </button>
      </div>
      {open && (
        <div className="summary-section-list" id={`${section.id}-body`}>
          {section.items.map((item) => (
            <SummaryItemRow item={item} key={item.title} />
          ))}
        </div>
      )}
    </section>
  );
}

function SummarySectionGrid({ focusSectionId }: { focusSectionId?: string | null }) {
  return (
    <div className="summary-section-grid">
      {summarySections.map((section) => (
        <SummarySection focusSectionId={focusSectionId} key={section.id} section={section} />
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
    .map((code) => icdLibraryByCode.get(code))
    .filter((entry): entry is IcdEntry => Boolean(entry));
  const gaps = icdCandidates.filter((candidate) => !activeCodes.includes(candidate.code));

  return (
    <div className="summary-icd">
      <div className="summary-icd-stage">
        <span>Coded diagnoses</span>
        <div className="summary-icd-stage-actions">
          <span className="summary-icd-count">{active.length} active</span>
          <button className="summary-gap-action summary-icd-add" onClick={() => openDrawer("icd")} type="button">
            <PlusIcon size={12} variant="stroke" />
            Add ICD-10
          </button>
        </div>
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

function MedicalHistoryTimeline({ focusSectionId }: { focusSectionId?: string | null }) {
  const [open, setOpen] = useState(focusSectionId === "summary-medical-history");

  useEffect(() => {
    if (focusSectionId === "summary-medical-history") {
      const timer = window.setTimeout(() => setOpen(true), 0);
      return () => window.clearTimeout(timer);
    }
  }, [focusSectionId]);

  return (
    <section
      className={`summary-section${open ? " is-open" : " is-collapsed"}`}
      id="summary-medical-history"
      aria-labelledby="summary-medical-history-title"
    >
      <div className="summary-section-heading">
        <button
          aria-controls="summary-medical-history-body"
          aria-expanded={open}
          className="summary-section-toggle"
          onClick={() => setOpen((value) => !value)}
          type="button"
        >
          <NoteIcon size={20} variant="stroke" />
          <h3 id="summary-medical-history-title">Medical History</h3>
          <SummaryCollapseChevron open={open} />
        </button>
      </div>
      {open && (
        <div className="summary-section-body" id="summary-medical-history-body">
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
        </div>
      )}
    </section>
  );
}

function SummaryStatusPill({ status }: { status: SummaryLabStatus }) {
  const label =
    status === "critical" ? "Critical" : status === "watch" ? "Repeat due" : status === "abnormal" ? "Abnormal" : "In range";
  return <span className={`summary-status-pill ${status}`}>{label}</span>;
}

function LabHistoryPreview({
  focusSectionId,
  onOpenLabs,
  onOpenLabsAt,
}: {
  focusSectionId?: string | null;
  onOpenLabs: () => void;
  onOpenLabsAt: (labKey: string) => void;
}) {
  const [open, setOpen] = useState(focusSectionId === "summary-lab-preview");

  useEffect(() => {
    if (focusSectionId === "summary-lab-preview") {
      const timer = window.setTimeout(() => setOpen(true), 0);
      return () => window.clearTimeout(timer);
    }
  }, [focusSectionId]);

  return (
    <section
      className={`summary-section summary-lab-preview${open ? " is-open" : " is-collapsed"}`}
      id="summary-lab-preview"
      aria-labelledby="summary-lab-preview-title"
    >
      <div className="summary-section-heading summary-lab-preview-heading">
        <button
          aria-controls="summary-lab-preview-body"
          aria-expanded={open}
          className="summary-section-toggle"
          onClick={() => setOpen((value) => !value)}
          type="button"
        >
          <FlaskIcon size={20} variant="stroke" />
          <h3 id="summary-lab-preview-title">Lab History Preview</h3>
          <SummaryCollapseChevron open={open} />
        </button>
        {open && (
          <button className="summary-inline-link" onClick={onOpenLabs} type="button">
            <span>View full Labs</span>
            <ArrowRightIcon size={14} variant="stroke" />
          </button>
        )}
      </div>
      {open && (
      <div className="summary-lab-table" id="summary-lab-preview-body" aria-label="Lab history preview">
        <div className="summary-lab-header" aria-hidden>
          <span>TEST GROUP</span>
          <span>MARKER</span>
          <span>VALUE</span>
          <span>TREND</span>
          <span>STATUS</span>
          <span>LAST RESULT</span>
          <span />
        </div>
        {summaryLabRows.map((row) => (
          /* Hover/focus floats the shared clinical brief (same card as the Labs
             tab); the row click deep-links into full Labs at this marker. */
          <LabHoverTrigger
            key={row.group}
            labKey={row.key}
            placementAnchorSelector=".summary-lab-trend"
            placementBoundsSelector=".summary-main-column"
          >
            <button
              className="summary-lab-row"
              onClick={() => onOpenLabsAt(row.key)}
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
              <span className="summary-lab-trend">
                <LabMiniTrend labKey={row.key} />
              </span>
              <span>
                <SummaryStatusPill status={row.status} />
              </span>
              <span className="summary-lab-last">{row.lastResult}</span>
              <span className="summary-lab-chevron" aria-hidden>›</span>
            </button>
          </LabHoverTrigger>
        ))}
      </div>
      )}
    </section>
  );
}

/* Active meds stay primary; therapy logic collapses to one quiet review row.
   Candidates already covered by an active medication are filtered out, and
   review-mode candidates (e.g. in-range lipids) never surface here — they
   belong to the Care plan. The CTA opens the Rx drawer; Summary never adds
   a medication directly. */
function MedicationsSection({ focusSectionId }: { focusSectionId?: string | null }) {
  const { meds } = useEncounter();
  const { openDrawer } = useClinicalDrawers();
  const therapySignals = rxCandidates.filter(
    (candidate) =>
      candidate.mode !== "review" &&
      !meds.some((med) => med.title.toLowerCase().startsWith(candidate.drug.toLowerCase())),
  );
  const therapyLead = therapySignals[0];

  const [open, setOpen] = useState(focusSectionId === "summary-medications");

  useEffect(() => {
    if (focusSectionId === "summary-medications") {
      const timer = window.setTimeout(() => setOpen(true), 0);
      return () => window.clearTimeout(timer);
    }
  }, [focusSectionId]);

  return (
    <section
      className={`summary-section${open ? " is-open" : " is-collapsed"}`}
      id="summary-medications"
      aria-labelledby="summary-medications-title"
    >
      <div className="summary-section-heading">
        <button
          aria-controls="summary-medications-body"
          aria-expanded={open}
          className="summary-section-toggle"
          onClick={() => setOpen((value) => !value)}
          type="button"
        >
          <PillIcon size={20} variant="stroke" />
          <h3 id="summary-medications-title">Medications</h3>
          <SummaryCollapseChevron open={open} />
        </button>
        {open && (
          <button className="summary-gap-action summary-heading-action" onClick={() => openDrawer("rx")} type="button">
            Prescribe
          </button>
        )}
      </div>
      {open && (
        <>
          <div className="summary-section-list" id="summary-medications-body">
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
        </>
      )}
    </section>
  );
}

function MedicalMedicationGrid({ focusSectionId }: { focusSectionId?: string | null }) {
  return (
    <div className="summary-section-grid summary-clinical-grid">
      <MedicalHistoryTimeline focusSectionId={focusSectionId} />
      <MedicationsSection focusSectionId={focusSectionId} />
    </div>
  );
}

function SummaryDoNextSection({ onOpenOrders }: { onOpenOrders: () => void }) {
  const { addLabTest, draft, plannedLabKeys, removeLabTest } = useOrderDraft();
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
  /* Choice-paralysis cure: lead with ONE next action. The rest stay one tap
     away behind "View all" rather than competing for the eye up front. */
  const visibleRows = showAll ? activeRows : activeRows.slice(0, 1);

  return (
    <section className="summary-rail-section summary-rail-next">
      <div className="summary-rail-title">
        <h3 className="summary-rail-kicker">Do next</h3>
      </div>
      <div className="summary-rail-list">
        {visibleRows.map((row, index) => {
          const planned = row.order ? plannedLabKeys.has(row.order.labKey) : false;
          const activeOrder = row.order ? getActiveLabOrder(draft, row.order.labKey) : null;
          const stateLabel = activeOrder
            ? "Already ordered"
            : row.stateLabel ?? (row.referral ? "Overdue" : row.tone === "danger" ? "Due now" : "Needs review");
          const meta = activeOrder ? getActiveLabOrderStatusText(activeOrder) : row.meta;
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
                    {stateLabel} · {meta}
                  </span>
                </p>
              </div>
              {row.order &&
                (activeOrder && !planned ? (
                  <button
                    aria-label={`Review active ${row.order.labName} order`}
                    className="summary-gap-action"
                    onClick={onOpenOrders}
                    type="button"
                  >
                    Review
                  </button>
                ) : planned ? (
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
                    onClick={() => {
                      addLabTest(row.order!.labKey, {
                        labName: row.order!.labName,
                        reasonText: `${row.title} · ${row.meta}`,
                        severityTone: row.order!.severityTone,
                        source: "labs-suggested",
                      });
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
      {!showAll && activeRows.length > 1 && (
        <button className="summary-inline-link rail-link" onClick={() => setShowAll(true)} type="button">
          <span>View {activeRows.length - 1} more action{activeRows.length - 1 === 1 ? "" : "s"}</span>
        </button>
      )}
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
  ];

  return (
    <section className="summary-rail-section">
      <div className="summary-rail-title">
        <h3 className="summary-rail-kicker">Safety</h3>
      </div>
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

function SummaryVisitWorkSection() {
  const { claimChecks, claimReady } = useEncounter();
  const { openDrawer } = useClinicalDrawers();
  const remainingChecks = claimChecks.filter((check) => !check.done);
  const visibleChecks = remainingChecks.slice(0, 2);
  const hiddenCount = Math.max(0, remainingChecks.length - visibleChecks.length);

  return (
    <section className="summary-rail-overview" aria-label="Visit work">
      <div className="summary-rail-overview-head">
        <div>
          <h2>Visit work</h2>
          <p>{claimReady ? "Ready to finish" : `${remainingChecks.length} left before claim`}</p>
        </div>
        <button className="summary-gap-action summary-rail-overview-action" onClick={() => openDrawer("finish")} type="button">
          {claimReady ? "Finish" : "Review"}
        </button>
      </div>
      {!claimReady && visibleChecks.length > 0 && (
        <ul className="summary-rail-mini-list" aria-label="Items left before claim">
          {visibleChecks.map((check) => (
            <li key={check.id}>
              <span className="summary-check-dot" aria-hidden />
              <span>{check.label}</span>
            </li>
          ))}
          {hiddenCount > 0 && (
            <li className="is-muted">
              <span>{hiddenCount} more</span>
            </li>
          )}
        </ul>
      )}
    </section>
  );
}

function SummarySideRail({ onOpenOrders }: { onOpenOrders: () => void }) {
  return (
    <aside className="summary-side-rail summary-attention-rail" aria-label="Patient attention rail">
      <SummaryVisitWorkSection />
      <SummaryDoNextSection onOpenOrders={onOpenOrders} />
      <SummarySafetySection />
    </aside>
  );
}

function SummaryAssessment({
  hasPriorityContext = false,
  patient,
}: {
  hasPriorityContext?: boolean;
  patient: RecordPatient;
}) {
  const firstName = patient.name.split(" ")[0] || patient.name;

  return (
    <section className="summary-assessment" id="summary-assessment" aria-labelledby="summary-assessment-title">
      <h2 className="summary-ai-title text-gradient-wizard" id="summary-assessment-title">
        Kura AI Summary
      </h2>
      <p>
        {firstName} has active cardiometabolic and renal follow-up needs. Latest available evidence includes{" "}
        {deltaLabFacts.creatinine.summary}, {deltaLabFacts.microalbuminCreatinineRatio.summary}, and{" "}
        {deltaLabFacts.hba1c.summary}; {deltaLabFacts.ldl.summary}.
      </p>
      {hasPriorityContext ? (
        <p>
          Use the alert banner above for today&apos;s reason to act, then review medications, allergies, CKD safety,
          and follow-up readiness before changing treatment or placing follow-up orders.
        </p>
      ) : (
        <p>
          Start with the lab rows below, then decide whether to repeat HbA1c, adjust medication, or update the care
          plan.
        </p>
      )}
      <small>AI-generated · verify against lab results and apply clinical judgment.</small>
    </section>
  );
}

/* A just-created record has no work behind it yet. One calm state, one obvious next
   action — never the canonical demo body or a wall of empty cards. */
function NewPatientEmptyState({ patientName, onOrderLabs }: { patientName: string; onOrderLabs: () => void }) {
  const [linkSent, setLinkSent] = useState(false);
  return (
    <div
      aria-labelledby="record-tab-summary"
      className="patient-summary-content patient-summary-content--empty"
      id="record-panel-summary"
      role="tabpanel"
    >
      <section className="record-new-card" aria-label={`New record — ${patientName}`}>
        <h3>Start with first labs</h3>
        <p>This record is new. Order labs now or send intake to collect history.</p>
        <div className="record-new-actions">
          <UiButton intent="primary" leadingIcon={<FlaskIcon size={16} variant="stroke" />} onClick={onOrderLabs}>
            Order first labs
          </UiButton>
          <UiButton intent="secondary" disabled={linkSent} onClick={() => setLinkSent(true)}>
            {linkSent ? "Intake link sent" : "Send intake link"}
          </UiButton>
        </div>
        <ul className="record-new-ghosts" aria-label="What appears as work builds">
          <li>Patient summary appears after results</li>
          <li>Lab trends appear after the first draw</li>
          <li>Care plan appears after a reviewed issue</li>
        </ul>
      </section>
    </div>
  );
}

function PatientSummaryTab({
  focusSectionId = null,
  handoff = null,
  onFocusSectionHandled,
  onOpenLabs,
  onOpenLabsAt,
  onOpenOrders,
  patient,
}: {
  focusSectionId?: string | null;
  handoff?: RecordHandoff | null;
  onFocusSectionHandled?: () => void;
  onOpenLabs: () => void;
  onOpenLabsAt: (labKey: string) => void;
  onOpenOrders: () => void;
  patient: RecordPatient;
}) {
  const focusSectionHandledTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const sectionId = focusSectionId ?? window.location.hash.slice(1);

    if (!summarySectionIds.some((id) => id === sectionId)) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      scrollToSummarySection(sectionId, focusSectionId ? "smooth" : "auto");

      if (focusSectionId) {
        if (focusSectionHandledTimerRef.current !== null) {
          window.clearTimeout(focusSectionHandledTimerRef.current);
        }

        focusSectionHandledTimerRef.current = window.setTimeout(() => {
          focusSectionHandledTimerRef.current = null;
          onFocusSectionHandled?.();
        }, 2400);
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, [focusSectionId, onFocusSectionHandled]);

  useEffect(
    () => () => {
      if (focusSectionHandledTimerRef.current !== null) {
        window.clearTimeout(focusSectionHandledTimerRef.current);
      }

      focusSectionHandledTimerRef.current = null;
    },
    [],
  );

  /* Provisional / brand-new record (minted by Start intake) → one calm empty state,
     not the canonical demo body and not the shared care-gap rail. */
  if (patient.insurance === "Pending verification") {
    return <NewPatientEmptyState patientName={patient.name} onOrderLabs={onOpenOrders} />;
  }

  return (
    <div
      aria-labelledby="record-tab-summary"
      className="patient-summary-content"
      id="record-panel-summary"
      role="tabpanel"
    >
      <main className="summary-main-column">
        <SummaryAssessment hasPriorityContext={Boolean(handoff)} patient={patient} />
        <LabHistoryPreview focusSectionId={focusSectionId} onOpenLabs={onOpenLabs} onOpenLabsAt={onOpenLabsAt} />
        <SummarySectionGrid focusSectionId={focusSectionId} />
        <MedicalMedicationGrid focusSectionId={focusSectionId} />
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

/* Care plan tab — the longitudinal CarePlan module (focus → goal → intervention
   → owner → due → evidence → review → version). "Create order from intervention"
   seeds the shared order draft with the tests + clinical rationale and opens the
   Orders tab; it never auto-bills, and the intervention keeps a backlink. */
function CarePlanTabConnected({
  patientId,
  onOpenOrders,
  initialProtocolKey,
  initialFocusId,
  onViewProgram,
}: {
  /* The chart's resolved patient — drives both the plan we read AND the deltas we
     write, so a program deep-link lands on the clicked patient, not the demo. */
  patientId: string;
  onOpenOrders: () => void;
  /* Deep-link from Care programs — open the focus enrolled via this protocol. */
  initialProtocolKey?: ProtocolKey;
  /* Deep-link from search — open a consultation-created focus with no protocol key. */
  initialFocusId?: string;
  /* Provenance jump back to the focus's program in Care programs. */
  onViewProgram?: (protocolKey: ProtocolKey) => void;
}) {
  const { addLabTest } = useOrderDraft();
  const handleCreateOrder = (req: CarePlanOrderRequest): string => {
    req.labKeys.forEach((labKey) => {
      const labName = labKey.includes("||") ? labKey.split("||")[1] : labKey;
      addLabTest(labKey, {
        labName,
        reasonText: req.rationale,
        severityTone: "warning",
        source: "labs-suggested",
      });
    });
    onOpenOrders();
    const n = req.labKeys.length;
    const ref = `${n} test${n === 1 ? "" : "s"} · draft order`;
    appendPlanDelta(patientId, {
      actor: "Dr Dara",
      action: "lab_ordered",
      focusId: req.focusId,
      goalId: req.goalId,
      interventionId: req.interventionId,
      summary: `${req.interventionLabel} — ${n} test${n === 1 ? "" : "s"} ordered`,
      detail: req.rationale,
      ref,
    });
    return ref;
  };
  return (
    <div aria-labelledby="record-tab-carePlan" className="cp-panel" id="record-panel-carePlan" role="tabpanel">
      <CarePlanTab
        patientId={patientId}
        onCreateOrder={handleCreateOrder}
        initialProtocolKey={initialProtocolKey}
        initialFocusId={initialFocusId}
        onViewProgram={onViewProgram}
      />
    </div>
  );
}

function LabsTabPanel({
  focusKey,
  reviewBookingCode,
  onFocusHandled,
}: {
  focusKey: string | null;
  /* Result-back booking under review; the Labs tab names which order the doctor is here to read. */
  reviewBookingCode?: string | null;
  onFocusHandled: () => void;
}) {
  const { addLabTest, allBookings, plannedLabKeys, removeLabTest } = useOrderDraft();
  const reviewBooking = reviewBookingCode
    ? allBookings.find((b) => b.code === reviewBookingCode) ?? null
    : null;

  return (
    <div aria-labelledby="record-tab-labs" className="labs-tab" id="record-panel-labs" role="tabpanel">
      <div className="labs-tab-main">
        {reviewBooking && (
          <p className="labs-tab-review-context">
            <FlaskIcon size={14} variant="stroke" />
            Reviewing {getBookingTestSummary(reviewBooking)} · {reviewBooking.bookingCode ?? reviewBooking.code}
          </p>
        )}
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
      <OrderDraftCompactRail emptyHint="Add follow-ups from the list." />
      <OrderDraftDock ctaSlot={<OrderDraftCheckout />} emptyHint="Add follow-ups from the list." />
    </div>
  );
}

/* Landing intent from global search: which tab to open, plus an optional
   lab row to focus or a catalog item to reveal in the order catalog. */
type RecordLanding = {
  tab: RecordTabId;
  labKey?: string;
  catalog?: { query: string; itemId: string };
  patientId?: string;
  patientName?: string;
  summarySectionId?: string;
  handoff?: RecordHandoff;
  /* Results-back booking opened in Labs so the tab knows which order is under review. */
  reviewBookingCode?: string;
  /* Care Plan deep-link from Care programs: open the focus enrolled via this
     protocol on the carePlan tab (falls back to the default focus). */
  carePlanProtocolKey?: ProtocolKey;
  /* Care Plan deep-link from search: open a consultation-created focus that has
     no protocol key. */
  carePlanFocusId?: string;
};

function RecordHandoffBanner({
  handoff,
  onAction,
  onDismiss,
}: {
  handoff: RecordHandoff;
  onAction: (action: RecordHandoffAction) => void;
  onDismiss: () => void;
}) {
  const ToneIcon = handoff.tone === "danger" ? WarningIcon : handoff.tone === "warning" ? ClockIcon : InfoIcon;

  return (
    <section className={`record-handoff record-handoff-${handoff.tone}`} aria-label={`${handoff.title} context`}>
      <div className="record-handoff-icon" aria-hidden>
        <ToneIcon size={16} variant="stroke" />
      </div>
      <div className="record-handoff-body">
        <h2>{handoff.title}</h2>
        <p className="record-handoff-description">{handoff.description}</p>
        <div className="record-handoff-evidence" aria-label="Linked evidence">
          {handoff.evidence.map((item) => (
            <span className={`record-handoff-evidence-item tone-${item.tone ?? "neutral"}`} key={`${item.label}-${item.value}`}>
              <strong>{item.label}</strong>
              <span>{item.value}</span>
            </span>
          ))}
        </div>
      </div>
      <div className="record-handoff-actions">
        <button className="record-handoff-action primary" onClick={() => onAction(handoff.primaryAction)} type="button">
          <span>{handoff.primaryAction.label}</span>
          <ChevronRightIcon size={14} variant="stroke" />
        </button>
        {handoff.secondaryAction && (
          <button className="record-handoff-action secondary" onClick={() => onAction(handoff.secondaryAction!)} type="button">
            {handoff.secondaryAction.label}
          </button>
        )}
        <button
          aria-label={`Dismiss ${handoff.title}`}
          className="record-handoff-dismiss"
          onClick={onDismiss}
          title="Dismiss"
          type="button"
        >
          <CloseSmallIcon size={14} variant="stroke" />
        </button>
      </div>
    </section>
  );
}

/* Dara Pich's authored AI-suggestion case: her first lipid panel is back and off
   target. The banner is the entry to the grouped Review-results surface; it hides
   once the cholesterol loop is started (a lipid focus exists), so review → sign →
   gone reads as closing the loop. */
function DaraResultReviewBanner({
  patientId,
  onReviewSigned,
}: {
  patientId: string;
  onReviewSigned: (focusId: string) => void;
}) {
  const { plans } = useCarePlans(patientId);
  const [open, setOpen] = useState(false);

  const lipidStarted = useMemo(() => {
    const living = livingPlanOf(plans);
    return Boolean(living?.focuses.some((f) => f.protocolKey === "lipid_cvd" || f.coded === "E78.5"));
  }, [plans]);

  if (patientId !== DARA_CHOLESTEROL_DRAFT.patientId || lipidStarted) return null;

  return (
    <>
      <div className="record-result-banner" role="status">
        <span className="record-result-banner-copy">
          <strong>Results returned · {DARA_CHOLESTEROL_DRAFT.issueTitle}</strong>
          <small>First lipid panel is back and off target.</small>
        </span>
        <UiButton intent="primary" size="sm" onClick={() => setOpen(true)}>
          Review results
        </UiButton>
      </div>
      <CareLoopReviewDrawer
        open={open}
        onClose={() => setOpen(false)}
        draft={DARA_CHOLESTEROL_DRAFT}
        onSigned={(focusId) => {
          setOpen(false);
          onReviewSigned(focusId);
        }}
      />
    </>
  );
}

function PatientRecordPage({
  landing = null,
  provisional = null,
  onBackToPatients,
  onViewProgram,
}: {
  /* seeded at mount — the parent remounts this page (key bump) per search
     jump, so no effect-driven state sync is needed */
  landing?: RecordLanding | null;
  /* session-only provisional record from Start-intake, prepended to the switcher
     so its (otherwise unseeded) chart can open. */
  provisional?: RecordPatient | null;
  onBackToPatients: () => void;
  /* Care Plan provenance jump → the focus's program in Care programs. */
  onViewProgram?: (protocolKey: ProtocolKey) => void;
}) {
  const switcherPatients = provisional ? [provisional, ...recordSwitcherPatients] : recordSwitcherPatients;
  const [activeRecordTab, setActiveRecordTab] = useState<RecordTabId>(landing?.tab ?? "summary");
  const [currentPatientId, setCurrentPatientId] = useState(() =>
    provisional && landing?.patientId === provisional.id
      ? provisional.id
      : resolveRecordPatientId(landing?.patientId, landing?.patientName),
  );
  const currentPatient = switcherPatients.find((p) => p.id === currentPatientId) ?? switcherPatients[0];
  const currentOrderPatient = useMemo(() => bookingPatientForRecordPatient(currentPatient), [currentPatient]);
  const [labFocusKey, setLabFocusKey] = useState<string | null>(landing?.labKey ?? null);
  const [summaryFocusSectionId, setSummaryFocusSectionId] = useState<string | null>(landing?.summarySectionId ?? null);
  const [recordHandoff, setRecordHandoff] = useState<RecordHandoff | null>(landing?.handoff ?? null);
  const [ordersSearchIntent, setOrdersSearchIntent] = useState<{ query: string; itemId: string } | null>(
    landing?.catalog ?? null,
  );
  /* Care-plan focus deep-link — seeded from a landing, then overridden when the
     doctor signs a care loop here (open the new focus without a round-trip). */
  const [carePlanProtocol, setCarePlanProtocol] = useState<ProtocolKey | undefined>(
    landing?.carePlanProtocolKey,
  );

  const openLabsAt = (labKey: string) => {
    setLabFocusKey(labKey);
    setActiveRecordTab("labs");
  };
  const clearSummaryFocusSection = useCallback(() => setSummaryFocusSectionId(null), []);
  const dismissRecordHandoff = useCallback(() => {
    setRecordHandoff(null);
    setSummaryFocusSectionId(null);
  }, []);
  const handleRecordHandoffAction = (action: RecordHandoffAction) => {
    setActiveRecordTab(action.tab);

    if (action.labKey) {
      setLabFocusKey(action.labKey);
    }

    if (action.summarySectionId) {
      setSummaryFocusSectionId(null);
      window.setTimeout(() => setSummaryFocusSectionId(action.summarySectionId ?? null), 0);
    }
  };
  const handleSwitchPatient = (patientId: string) => {
    if (patientId !== currentPatientId) {
      setRecordHandoff(null);
      setLabFocusKey(null);
      setSummaryFocusSectionId(null);
    }

    setCurrentPatientId(patientId);
  };

  return (
    <EncounterProvider patientId={currentPatient.id}>
    <ClinicalDrawerProvider patientName={currentPatient.name}>
    <div className="record-page">
      <DetailHeader onBackToPatients={onBackToPatients} patientName={currentPatient.name} />
      <RecordHeader
        activeTab={activeRecordTab}
        onSwitchPatient={handleSwitchPatient}
        onTabChange={setActiveRecordTab}
        patient={currentPatient}
        patients={switcherPatients}
      />
      {recordHandoff && (
        <RecordHandoffBanner
          handoff={recordHandoff}
          onAction={handleRecordHandoffAction}
          onDismiss={dismissRecordHandoff}
        />
      )}
      <DaraResultReviewBanner
        patientId={currentPatient.id}
        onReviewSigned={() => {
          setCarePlanProtocol("lipid_cvd");
          setActiveRecordTab("carePlan");
        }}
      />
      {activeRecordTab === "summary" && (
        <PatientSummaryTab
          focusSectionId={summaryFocusSectionId}
          handoff={recordHandoff}
          onOpenLabs={() => setActiveRecordTab("labs")}
          onOpenLabsAt={openLabsAt}
          onOpenOrders={() => setActiveRecordTab("orders")}
          onFocusSectionHandled={clearSummaryFocusSection}
          patient={currentPatient}
        />
      )}
      {activeRecordTab === "labs" && (
        <LabsTabPanel
          focusKey={labFocusKey}
          reviewBookingCode={landing?.reviewBookingCode ?? null}
          onFocusHandled={() => setLabFocusKey(null)}
        />
      )}
      {activeRecordTab === "orders" && (
        <div
          aria-labelledby="record-tab-orders"
          className="orders-tab-catalog"
          id="record-panel-orders"
          role="tabpanel"
        >
          <LabCatalogWorkspace
            initialPatient={currentOrderPatient}
            searchIntent={ordersSearchIntent}
            onSearchIntentHandled={() => setOrdersSearchIntent(null)}
          />
        </div>
      )}
      {activeRecordTab === "carePlan" && (
        <CarePlanTabConnected
          key={`${currentPatient.id}-${carePlanProtocol ?? landing?.carePlanFocusId ?? "default"}`}
          patientId={currentPatient.id}
          onOpenOrders={() => setActiveRecordTab("orders")}
          initialProtocolKey={carePlanProtocol}
          initialFocusId={landing?.carePlanFocusId}
          onViewProgram={onViewProgram}
        />
      )}
      {activeRecordTab === "records" && <RecordsTab />}
      {activeRecordTab === "activity" && (
        <PatientActivityTab patientId={currentPatient.id} />
      )}
    </div>
    </ClinicalDrawerProvider>
    </EncounterProvider>
  );
}

function GlobalSearchResultRow({
  active,
  id,
  record,
  tokens,
  onClick,
  onHover,
}: {
  active: boolean;
  id?: string;
  record: SearchRecord;
  tokens: string[];
  onClick: () => void;
  onHover: () => void;
}) {
  const RecordIcon = record.Icon;
  return (
    <button
      aria-selected={active}
      className={`global-search-result${active ? " active" : ""}`}
      id={id}
      onClick={onClick}
      onMouseMove={onHover}
      role="option"
      type="button"
    >
      {RecordIcon ? (
        <span className="global-search-lead global-search-lead-icon" aria-hidden="true">
          <RecordIcon size={18} variant="stroke" />
        </span>
      ) : (
        <span className="global-search-lead global-search-avatar" aria-hidden="true">
          {record.initials ?? record.title.slice(0, 2)}
        </span>
      )}
      <span className="global-search-result-copy">
        <strong>{highlightSearchMatch(record.title, tokens)}</strong>
        <span>{highlightSearchMatch(record.subtitle, tokens)}</span>
      </span>
      <span className="global-search-result-meta">
        {record.meta ? <span className="global-search-result-metaline">{record.meta}</span> : null}
      </span>
      {record.shortcut ? (
        <kbd className="global-search-result-shortcut">{record.shortcut}</kbd>
      ) : (
        <span className="global-search-result-enter" aria-hidden="true">↵</span>
      )}
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
  const [activeScope, setActiveScope] = useState<SearchRecordScope | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [recentRecords, setRecentRecords] = useState<SearchRecord[]>([]);

  const queryText = query.trim();
  const hasQuery = queryText.length > 0;
  const hasSearchContext = hasQuery || activeScope !== null;
  const showIdle = !hasSearchContext;
  const showScopeFilters = hasSearchContext;
  const tokens = useMemo(() => getSearchTokens(query), [query]);
  const groupedResults = useMemo(
    () => getGroupedSearchResults(records, query, activeScope),
    [records, query, activeScope],
  );

  /* One flat row list across sections so arrows, Enter, and
     aria-activedescendant share a single index space. */
  const rowGroups: Array<{ label: string; records: SearchRecord[] }> = showIdle
    ? [
        { label: "Common actions", records: commonActionSearchRecords },
        ...(needsAttention.length > 0 ? [{ label: "Needs attention", records: needsAttention }] : []),
        ...(recentRecords.length > 0 ? [{ label: "Recent", records: recentRecords }] : []),
      ]
    : groupedResults.map((group) => ({ label: group.label, records: group.records }));

  const flatRows = rowGroups.flatMap((group) => group.records);
  const showNoResults = hasSearchContext && flatRows.length === 0;
  const actionCount = showNoResults ? (activeScope ? 2 : 1) : 0;
  const interactiveCount = flatRows.length + actionCount;
  const safeIndex = interactiveCount > 0 ? Math.min(activeIndex, interactiveCount - 1) : 0;
  const activeOptionId =
    interactiveCount > 0
      ? showNoResults
        ? `global-search-action-${safeIndex}`
        : `global-search-option-${safeIndex}`
      : undefined;
  const summaryText = showNoResults
    ? "No matches"
    : showIdle
      ? ""
      : `${flatRows.length} result${flatRows.length === 1 ? "" : "s"}`;

  useEffect(() => {
    if (!open) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.requestAnimationFrame(() => inputRef.current?.focus());

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [open]);

  /* Keep the active row scrolled into view as arrows move through the list. */
  useEffect(() => {
    if (!open || !activeOptionId) return;
    document.getElementById(activeOptionId)?.scrollIntoView({ block: "nearest" });
  }, [open, activeOptionId]);

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
  const selectScope = (scope: SearchRecordScope | null) => {
    setActiveScope(scope);
    setActiveIndex(0);
    inputRef.current?.focus();
  };
  /* Tab / Shift+Tab cycle filters once the filter row is visible. */
  const cycleScope = (direction: 1 | -1) => {
    const cycle: Array<SearchRecordScope | null> = [null, ...globalSearchScopes.map((scope) => scope.id)];
    const current = cycle.findIndex((scope) => scope === activeScope);
    const next = cycle[(current + direction + cycle.length) % cycle.length];
    selectScope(next);
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

    setRecentRecords((current) => [draftRecord, ...current].slice(0, 5));
    closeAndReset();
  };
  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeAndReset();
      return;
    }

    if (event.key === "Tab" && showScopeFilters) {
      event.preventDefault();
      cycleScope(event.shiftKey ? -1 : 1);
      return;
    }

    if (interactiveCount === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => (Math.min(current, interactiveCount - 1) + 1) % interactiveCount);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => (Math.min(current, interactiveCount - 1) - 1 + interactiveCount) % interactiveCount);
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();

      const record = flatRows[safeIndex];
      if (record) {
        openRecord(record);
        return;
      }

      if (showNoResults && activeScope && safeIndex === 0) {
        runSearchAllRecords();
        return;
      }

      if (showNoResults) {
        createPatientFromQuery();
      }
    }
  };

  return (
    <div className="global-search-layer" onKeyDown={handleKeyDown}>
      <button className="global-search-scrim" aria-label="Close search" onClick={closeAndReset} type="button" />
      <section aria-label="Global search" aria-modal="true" className="global-search-modal" role="dialog">
        <div className="global-search-field-shell">
          <Search
            ref={inputRef}
            aria-activedescendant={activeOptionId}
            aria-autocomplete="list"
            aria-controls="global-search-listbox"
            aria-expanded="true"
            aria-label="Search patients, bookings, tests, or pages"
            autoComplete="off"
            className="global-search-field"
            density="large"
            onClear={query ? clearQuery : undefined}
            placeholder="Search patients, bookings, tests, or pages"
            role="combobox"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
          />
          {showScopeFilters && (
            <div className="global-search-scopebar">
              <div aria-label="Search scope" className="global-search-chips" role="group">
                <button
                  aria-pressed={activeScope === null}
                  className={`global-search-chip${activeScope === null ? " active" : ""}`}
                  onClick={() => selectScope(null)}
                  type="button"
                >
                  All
                </button>
                {globalSearchScopes.map((scope) => {
                  const selected = activeScope === scope.id;
                  return (
                    <button
                      aria-pressed={selected}
                      className={`global-search-chip${selected ? " active" : ""}`}
                      key={scope.id}
                      onClick={() => selectScope(selected ? null : scope.id)}
                      type="button"
                    >
                      {scope.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="global-search-divider" />

        {flatRows.length > 0 && (
          <div className="global-search-results" id="global-search-listbox" role="listbox">
            {rowGroups.map((group, groupIndex) => {
              /* Flat option index = rows in all preceding groups (no mutable
                 render-scope counter). */
              const offset = rowGroups
                .slice(0, groupIndex)
                .reduce((total, prev) => total + prev.records.length, 0);

              return (
                <div className="global-search-result-group" key={group.label} role="presentation">
                  <p className="global-search-section-label">{group.label}</p>
                  {group.records.map((record, index) => (
                    <GlobalSearchResultRow
                      active={safeIndex === offset + index}
                      id={`global-search-option-${offset + index}`}
                      key={record.id}
                      record={record}
                      tokens={tokens}
                      onClick={() => openRecord(record)}
                      onHover={() => setActiveIndex(offset + index)}
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
              <strong>No matches</strong>
              <span>Try a name, MRN, booking code, or page.</span>
            </div>
            <div className="global-search-actions" id="global-search-listbox" role="listbox">
              {activeScope && (
                <button
                  aria-selected={safeIndex === 0}
                  className={`global-search-action${safeIndex === 0 ? " active" : ""}`}
                  id="global-search-action-0"
                  onClick={runSearchAllRecords}
                  role="option"
                  type="button"
                >
                  <FilterPrimitives.Icon src="/figma/icon-search.svg" />
                  <span>Search all records for &quot;{queryText}&quot;</span>
                </button>
              )}
              <button
                aria-selected={safeIndex === (activeScope ? 1 : 0)}
                className={`global-search-action${safeIndex === (activeScope ? 1 : 0) ? " active" : ""}`}
                id={`global-search-action-${activeScope ? 1 : 0}`}
                onClick={createPatientFromQuery}
                role="option"
                type="button"
              >
                <FilterPrimitives.Icon src="/figma/icon-plus.svg" />
                <span>Create new patient &quot;{queryText}&quot;</span>
              </button>
            </div>
          </>
        )}

        <div className="global-search-footer">
          <span className="global-search-hints">
            <kbd>↑</kbd>
            <kbd>↓</kbd>
            <span>navigate</span>
            <kbd>↵</kbd>
            <span>open</span>
            <kbd>Esc</kbd>
            <span>close</span>
          </span>
          {summaryText ? <span aria-live="polite" className="global-search-summary">{summaryText}</span> : null}
        </div>
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
  const Icon = pageIcons[page];

  return (
    <section className="coming-soon-workspace" aria-labelledby="coming-soon-title">
      <div className="coming-soon-panel">
        <div className="coming-soon-icon">
          <Icon size={24} variant="stroke" />
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
  const [activePage, setActivePage] = useState<PageId>("home");
  const [patientView, setPatientView] = useState<PatientView>("list");
  const [searchOpen, setSearchOpen] = useState(false);
  const [settingsSection, setSettingsSection] = useState<SettingsSectionId>("overview");
  /* keyed so each search jump remounts the record page with fresh landing
     state; manual navigation clears it */
  const [searchLanding, setSearchLanding] = useState<{ landing: RecordLanding; key: number } | null>(null);
  /* Care programs preselect — set when a patient's Care Plan jumps to its program. */
  const [careProgramFocus, setCareProgramFocus] = useState<ProtocolKey | null>(null);
  const [catalogLanding, setCatalogLanding] = useState<{ landing: { query: string; itemId: string }; key: number } | null>(null);
  const [bookingFocus, setBookingFocus] = useState<BookingFocus | null>(null);
  const [bookingComposerOpen, setBookingComposerOpen] = useState(false);
  const [bookingComposerSeed, setBookingComposerSeed] = useState<BookingComposerSeed | null>(null);
  const [patientIntakeOpen, setPatientIntakeOpen] = useState(false);
  const [earningsOpen, setEarningsOpen] = useState(false);
  /* Session-only provisional chart from intake — never persisted, surfaced as
     "Provisional · PSC verifies" until reception confirms identity. */
  const [provisionalPatient, setProvisionalPatient] = useState<RecordPatient | null>(null);
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
    setBookingComposerOpen(false);
    setBookingComposerSeed(null);

    if (destination.kind === "record") {
      setBookingFocus(null);
      setCatalogLanding(null);
      setActivePage("patients");
      setPatientView("record");
      const landing: RecordLanding = {
        tab: destination.tab,
        labKey: destination.labKey,
        catalog: destination.catalog,
        patientId: destination.patientId,
        patientName: destination.patientName,
        carePlanFocusId: destination.carePlanFocusId,
        carePlanProtocolKey: destination.carePlanProtocolKey,
        summarySectionId: destination.summarySectionId,
        handoff: destination.handoff,
      };
      setSearchLanding((current) => ({
        landing,
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
    } else if (destination.kind === "settings") {
      setSearchLanding(null);
      setCatalogLanding(null);
      setBookingFocus(null);
      openSettings(destination.section);
      showSearchToast(`Opened settings · ${record.title}`);
    } else if (destination.kind === "action") {
      if (destination.action === "new-booking") {
        openBookingComposer();
      }
    } else {
      setCatalogLanding(null);
      setBookingFocus(null);
      setActivePage(destination.page);
      if (destination.page === "patients") setPatientView("list");
    }

    setSearchOpen(false);
  };

  const openPatientRecord = (landing?: RecordLanding | null) => {
    setCatalogLanding(null);
    setBookingFocus(null);
    setBookingComposerOpen(false);
    setBookingComposerSeed(null);
    setActivePage("patients");
    setPatientView("record");

    if (landing) {
      setSearchLanding((current) => ({ landing, key: (current?.key ?? 0) + 1 }));
    } else {
      setSearchLanding(null);
    }
  };
  const openPatientRecordById = (patientId: string, opts?: { protocolKey?: ProtocolKey }) => {
    const bookingPatient = bookingPatientByIdForSearch.get(patientId);
    const patientName = programPatientProfile(patientId)?.name ?? bookingPatient?.name;

    /* From Care programs we land on the patient's Care Plan, opened on the focus for
       that program; otherwise the summary. */
    openPatientRecord(
      opts?.protocolKey
        ? {
            tab: "carePlan",
            patientId,
            patientName,
            carePlanProtocolKey: opts.protocolKey,
          }
        : {
            tab: "summary",
            patientId,
            patientName,
          },
    );
  };
  const openRosterPatientRecord = (patient: Patient) => {
    openPatientRecord({
      tab: "summary",
      patientName: patient.name,
    });
  };

  const openPatientList = () => {
    setSearchLanding(null);
    setCatalogLanding(null);
    setBookingFocus(null);
    setBookingComposerOpen(false);
    setBookingComposerSeed(null);
    setActivePage("patients");
    setPatientView("list");
  };

  const openBookingComposer = (seed?: {
    itemIds?: string[];
    patient?: BookingPatient | null;
    identityDecision?: DoctorIdentityDecision | null;
    patientAssurance?: DoctorPatientAssurance | null;
  }) => {
    setSearchLanding(null);
    setCatalogLanding(null);
    setBookingFocus(null);
    setActivePage("bookings");
    setBookingComposerSeed((current) => {
      const itemIds = Array.from(new Set(seed?.itemIds ?? []));
      if (itemIds.length === 0 && !seed?.patient) return null;
      return {
        key: (current?.key ?? 0) + 1,
        itemIds,
        patient: seed?.patient ?? null,
        identityDecision: seed?.identityDecision ?? null,
        patientAssurance: seed?.patientAssurance ?? null,
      };
    });
    setBookingComposerOpen(true);
  };

  const closeBookingComposer = () => {
    setActivePage("bookings");
    setBookingComposerOpen(false);
    setBookingComposerSeed(null);
  };

  /* Patient Start-intake handoffs. Intake only RESOLVES identity — these two
     terminals are the doctor's explicit next step. Neither creates a visit,
     sample, or booking on its own. */
  const handleIntakeOpenChart = (resolved: ResolvedIntake) => {
    if (resolved.assurance === "provisional") {
      /* Not a seeded chart yet → mint a session-only provisional record so the
         chart can open, flagged "Provisional · PSC verifies". */
      const p = resolved.patient;
      const age = p.dobOrAge ? ageFromValue(p.dobOrAge) ?? 0 : 0;
      setProvisionalPatient({
        id: p.id,
        initials: getNameInitials(p.name),
        name: p.name,
        age,
        sex: p.sex === "female" ? "Female" : p.sex === "male" ? "Male" : "Unknown",
        dob: p.yearOfBirth ? `Born ${p.yearOfBirth}` : "Not recorded",
        mrn: p.mrn,
        tel: p.phoneMasked,
        insurance: "Pending verification",
        problems: [],
        flags: [],
      });
      openPatientRecord({ tab: "summary", patientId: p.id, patientName: p.name });
      return;
    }
    setProvisionalPatient(null);
    openPatientRecordById(resolved.patient.id);
  };

  const handleIntakeCreateBooking = (resolved: ResolvedIntake) => {
    setProvisionalPatient(null);
    openBookingComposer({
      patient: resolved.patient,
      identityDecision: resolved.decision,
      patientAssurance: resolved.assurance,
    });
  };

  /* Home lab-activity row → open that exact booking in the Bookings detail pane. */
  const openBooking = (code: string) => {
    setSearchLanding(null);
    setCatalogLanding(null);
    setBookingComposerOpen(false);
    setBookingComposerSeed(null);
    setActivePage("bookings");
    setBookingFocus((current) => ({ code, key: (current?.key ?? 0) + 1 }));
  };

  /* Home KPI / needs-attention card → Bookings filtered to that exact lane. */
  const openBookingsLane = (
    filter: NonNullable<BookingFocus["filter"]>,
    scope: NonNullable<BookingFocus["scope"]> = "all",
  ) => {
    setSearchLanding(null);
    setCatalogLanding(null);
    setBookingComposerOpen(false);
    setBookingComposerSeed(null);
    setActivePage("bookings");
    setBookingFocus((current) => ({ filter, scope, key: (current?.key ?? 0) + 1 }));
  };

  const handlePageChange = (page: PageId) => {
    setSearchLanding(null);
    setCatalogLanding(null);
    setBookingFocus(null);
    setBookingComposerOpen(false);
    setBookingComposerSeed(null);
    setCareProgramFocus(null);
    setActivePage(page);

    if (page === "patients") {
      setPatientView("list");
    }
  };

  /* Provenance jump: a patient's Care Plan focus → its program in Care programs,
     preselected to that program's cohort. */
  const viewProgramFromChart = (protocolKey: ProtocolKey) => {
    handlePageChange("care-plans");
    setCareProgramFocus(protocolKey);
  };

  /* Deep-link from a Home work-queue item straight into a patient record tab
     (mirrors the search-record landing flow). The prototype renders the single
     demo record, so every record link lands on Sokha Chann's chart. */
  const openRecordTab = (tab: RecordTabId) => {
    setCatalogLanding(null);
    setBookingFocus(null);
    setBookingComposerOpen(false);
    setBookingComposerSeed(null);
    setActivePage("patients");
    setPatientView("record");
    setSearchLanding((current) => ({ landing: { tab }, key: (current?.key ?? 0) + 1 }));
  };

  /* Home work queue — built from the same models the tabs render (bookings,
     abnormal labs, care gaps); the live order draft + KYD state are read inside
     HomeView. Each item routes the doctor to the right place to finish it. */
  const activeBookings = allBookings.filter((booking) => !booking.cancelled);
  const awaitingVisit = allBookings.filter(isBookingAwaitingVisit).length;
  const flaggedCount = activeBookings.filter(
    (booking) => booking.bookingStatus === "results-back" && booking.flagged,
  ).length;
  const recentBookings = getHomeRecentBookings(activeBookings, 4);
  const homeNextAction = (booking: BookingListItem): { label: string; tone?: "brand" | "muted" } => {
    if (booking.bookingStatus === "results-back") return { label: "Review" };
    if (isBookingAwaitingVisit(booking)) return { label: "Send reminder" };
    if (booking.bookingStatus === "scheduled") return { label: "Track booking" };
    return { label: "Nothing needed", tone: "muted" };
  };
  const homeStatusLabel = (booking: BookingListItem): string => {
    if (booking.cancelled) return "Cancelled";
    if (booking.bookingStatus === "results-back") return booking.flagged ? "Needs review" : "Results back";
    if (isBookingAwaitingVisit(booking)) return "Waiting for PSC";
    if (booking.bookingStatus === "scheduled") return "Scheduled";
    return "At lab";
  };
  const homeChartMeta = [
    {
      gender: "Male",
      age: "61",
      reason: "BP review is overdue",
      reasonTone: "danger" as const,
      openedAt: "8 min ago",
      landing: {
        tab: "summary" as const,
        summarySectionId: "summary-assessment",
        handoff: {
          sourceLabel: "Patient follow-ups",
          title: "BP review is overdue",
          description:
            "BP has been high across recent visits. Check the assessment first, then decide whether medication or the care plan needs an update.",
          tone: "danger" as const,
          evidence: [
            { label: "Vitals", value: "BP 146/92 · 3 visits", tone: "warning" as const },
            { label: "Context", value: "Hypertension above target", tone: "neutral" as const },
          ],
          primaryAction: { label: "Review BP context", tab: "summary" as const, summarySectionId: "summary-assessment" },
          secondaryAction: { label: "Open care plan", tab: "carePlan" as const },
        },
      },
    },
    {
      gender: "Female",
      age: "48",
      reason: "Thyroid review due",
      reasonTone: "warning" as const,
      openedAt: "24 min ago",
      landing: {
        tab: "labs" as const,
        labKey: deltaLabKeys.tsh,
        summarySectionId: "summary-lab-preview",
        handoff: {
          sourceLabel: "Patient follow-ups",
          title: "Thyroid review due",
          description:
            "This alert is about thyroid follow-up. Review the TSH result first, then use Summary for medications, symptoms, and history.",
          tone: "warning" as const,
          evidence: [
            { label: "TSH", value: `${deltaLabFacts.tsh.value} · ${deltaLabFacts.tsh.shortDate}`, tone: "warning" as const },
            { label: "Reason", value: "Thyroid monitoring due", tone: "neutral" as const },
          ],
          primaryAction: { label: "Review TSH", tab: "labs" as const, labKey: deltaLabKeys.tsh },
          secondaryAction: { label: "View Summary", tab: "summary" as const, summarySectionId: "summary-lab-preview" },
        },
      },
    },
    {
      gender: "Female",
      age: "39",
      reason: "Annual screening",
      reasonTone: "info" as const,
      openedAt: "Yesterday",
      landing: {
        tab: "carePlan" as const,
        handoff: {
          sourceLabel: "Patient follow-ups",
          title: "Annual screening",
          description:
            "This alert is about preventive screening. Check what is due, then decide whether to order the annual screen.",
          tone: "info" as const,
          evidence: [
            { label: "Gap", value: "Annual screen due", tone: "info" as const },
            { label: "Suggested", value: "CBC · fasting glucose · lipids", tone: "neutral" as const },
          ],
          primaryAction: { label: "Review care plan", tab: "carePlan" as const },
          secondaryAction: { label: "View lab preview", tab: "summary" as const, summarySectionId: "summary-lab-preview" },
        },
      },
    },
    {
      gender: "Male",
      age: "57",
      reason: "Medication review",
      reasonTone: "neutral" as const,
      openedAt: "Yesterday",
      landing: {
        tab: "summary" as const,
        summarySectionId: "summary-medications",
        handoff: {
          sourceLabel: "Patient follow-ups",
          title: "Medication review",
          description:
            "This alert is about treatment review. Check current medications before changing the plan.",
          tone: "neutral" as const,
          evidence: [
            { label: "Medication", value: "Review current therapy", tone: "neutral" as const },
            { label: "Visit gate", value: "Therapy plan affects finish-visit readiness", tone: "info" as const },
          ],
          primaryAction: { label: "Review medications", tab: "summary" as const, summarySectionId: "summary-medications" },
          secondaryAction: { label: "Open care plan", tab: "carePlan" as const },
        },
      },
    },
  ];
  /* Doctor spread — the cut the doctor keeps on each lab order they place. A calm
     awareness figure on Home; the billing surface lives elsewhere. */
  const DOCTOR_SPREAD_RATE = 0.15;
  const moneyShort = (n: number): string => `$${Math.round(n).toLocaleString("en-US")}`;
  const earnedToday = activeBookings.reduce((sum, booking) => sum + (booking.total ?? 0), 0) * DOCTOR_SPREAD_RATE;
  const ordersToday = activeBookings.length;
  const earnedMonth = earnedToday + 1240;
  const homeModel: HomeModel = {
    doctorName: "Dr. Pierre",
    dateLabel: "Saturday, 9 May 2026",
    needsAttention: [
      ...(flaggedCount > 0
        ? [
            {
              id: "na-flagged",
              tone: "danger" as const,
              label: "Flagged results",
              detail: `${flaggedCount} abnormal result${flaggedCount === 1 ? "" : "s"}`,
              actionLabel: "Review results",
              onAction: () => openBookingsLane("results-ready"),
            },
          ]
        : []),
      ...(awaitingVisit > 0
        ? [
            {
              id: "na-await",
              tone: "warning" as const,
              label: "PSC visit not recorded",
              detail: `${awaitingVisit} patient${awaitingVisit === 1 ? "" : "s"} waiting for arrival`,
              actionLabel: "Remind PSC",
              onAction: () => openBookingsLane("awaiting-collection"),
            },
          ]
        : []),
    ],
    recentOrders: recentBookings.map((booking) => {
      const status = bookingStatusView(booking);
      const nextAction = homeNextAction(booking);
      return {
        id: booking.code,
        bookingCode: booking.bookingCode ?? booking.code,
        patient: booking.patientName,
        patientMeta: `${booking.mrn} · ${booking.phoneMasked}`,
        initials: getNameInitials(booking.patientName),
        tests: getBookingTestSummary(booking, 2),
        statusLabel: homeStatusLabel(booking),
        statusTone: status.tone as HomeModel["recentOrders"][number]["statusTone"],
        updated: booking.placedAt ?? "",
        nextActionLabel: nextAction.label,
        nextActionTone: nextAction.tone,
        onOpen: () => openBooking(booking.code),
      };
    }),
    recentPatients: BOOKING_PATIENTS.slice(0, 4).map((patient, index) => {
      const meta = homeChartMeta[index] ?? homeChartMeta[homeChartMeta.length - 1];
      return {
        id: patient.id,
        initials: getNameInitials(patient.name),
        name: patient.name,
        detail: `${meta.gender} · ${meta.age}`,
        reason: meta.reason,
        reasonTone: meta.reasonTone,
        openedAt: meta.openedAt,
        onOpen: () =>
          openPatientRecord({
            ...meta.landing,
            patientId: patient.id,
            patientName: patient.name,
          }),
      };
    }),
    earnings: {
      today: moneyShort(earnedToday),
      todayDetail: `${ordersToday} order${ordersToday === 1 ? "" : "s"} today`,
      month: moneyShort(earnedMonth),
      monthDetail: "May · 86 orders",
      trend: "+12% vs last week",
      trendTone: "success",
      transactions: recentBookings.slice(0, 6).map((booking, index) => {
        const ledger = booking.ledgerImpact ?? deriveOrderLedgerImpact(booking);
        const owed = ledger.kind === "doctor-owes-kura";
        const value = owed ? ledger.doctorOwes : ledger.doctorEarns;
        return {
          id: `txn-${booking.code}-${index}`,
          detail: "1 order",
          amount: `${owed ? "−" : "+"}${moneyShort(value)}`,
          amountTone: (owed ? "danger" : ledger.kind === "earning-confirmed" ? "success" : "warning") as
            | "success"
            | "warning"
            | "danger",
          statusLabel: owed ? "Owed to Kura" : ledger.kind === "earning-confirmed" ? "Available" : "Pending",
          time: booking.placedAt ?? "Today",
        };
      }),
      onView: () => setEarningsOpen(true),
    },
  };

  if (mobileShellActive) {
    return <DoctorMobileApp />;
  }

  return (
    <main className={`kura-screen${isPatientRecordPage ? " record-shell" : ""}${activePage === "catalog" ? " catalog-screen" : ""}`}>
        <VerificationModal />
        <PatientIntakeDrawer
          open={patientIntakeOpen}
          onClose={() => setPatientIntakeOpen(false)}
          onOpenChart={handleIntakeOpenChart}
          onCreateBooking={handleIntakeCreateBooking}
        />
        <EarningsDetailDrawer
          open={earningsOpen}
          onClose={() => setEarningsOpen(false)}
          bookings={allBookings}
          bankMasked="ABA ···· 4102"
          nextStatementLabel="May 16"
          onOpenBooking={(code) => {
            setEarningsOpen(false);
            openBooking(code);
          }}
          onOpenBanking={() => {
            setEarningsOpen(false);
            openSettings("billing");
          }}
        />
        <AppSidebar
          activePage={activePage}
          onNewBooking={() => openBookingComposer()}
          onNewPatient={() => setPatientIntakeOpen(true)}
          onOpenSearch={() => setSearchOpen(true)}
          onOpenSettings={openSettings}
          onPageChange={handlePageChange}
        />
        <section className={`app-main${isPatientRecordPage ? " record-main" : ""}`}>
          {!isPatientRecordPage && activePage !== "home" && activePage !== "care-plans" && (
            <header className="page-header">
              <h1>{activePage === "bookings" && bookingComposerOpen ? "New booking" : pageTitles[activePage]}</h1>
              {isPatientsPage && <NewPatientButton onClick={() => setPatientIntakeOpen(true)} />}
              {activePage === "bookings" && !bookingComposerOpen && (
                <Button icon={<PlusIcon size={14} variant="stroke" />} onClick={() => openBookingComposer()}>
                  New booking
                </Button>
              )}
            </header>
          )}
          <div className={`page-content${isPatientRecordPage ? " record-page-content" : ""}${activePage === "catalog" ? " catalog-page-content" : ""}${isPatientsPage && !isPatientRecordPage ? " patients-page-content" : ""}${isMorePage(activePage) ? " more-page-content" : ""}`}>
            {activePage === "home" ? (
              <HomeView
                model={homeModel}
                onBrowseCatalog={() => handlePageChange("catalog")}
                onCreateOrder={() => openBookingComposer()}
                onFindPatient={() => setSearchOpen(true)}
                onOpenDemoPatient={() => openPatientRecord()}
                onViewBookings={() => handlePageChange("bookings")}
              />
            ) : activePage === "settings" ? (
              <SettingsView onSectionChange={setSettingsSection} section={settingsSection} />
            ) : activePage === "catalog" ? (
              <CatalogPage
                key={catalogLanding?.key ?? "catalog"}
                onOpenPatientChart={openPatientRecordById}
                onSearchIntentHandled={() => setCatalogLanding(null)}
                searchIntent={catalogLanding?.landing ?? null}
              />
            ) : activePage === "bookings" ? (
              <BookingsWorkspace
                focus={bookingFocus}
                onOpenPatient={openPatientRecordById}
                onReviewLabs={() => openRecordTab("labs")}
                composerOpen={bookingComposerOpen}
                composerSeed={bookingComposerSeed}
                onComposerClose={closeBookingComposer}
              />
            ) : activePage === "inbox" ? (
              <InboxView />
            ) : activePage === "calendar" ? (
              <CalendarView onNavigate={(page) => handlePageChange(page as PageId)} />
            ) : activePage === "tasks" ? (
              <TasksView />
            ) : activePage === "telehealth" ? (
              <TelehealthView />
            ) : activePage === "care-plans" ? (
              <CarePlansView
                onOpenPatient={openPatientRecordById}
                initialProgram={careProgramFocus ?? undefined}
              />
            ) : activePage === "pharma-calls" ? (
              <PharmaCallsView />
            ) : activePage === "dispensary" ? (
              <DispensaryView />
            ) : activePage === "supplies" ? (
              <SuppliesView />
            ) : activePage === "refer-earn" ? (
              <ReferEarnView />
            ) : isComingSoonPage(activePage) ? (
              <ComingSoonPage page={activePage} />
            ) : isPatientRecordPage ? (
              <PatientRecordPage
                key={searchLanding?.key ?? 0}
                landing={searchLanding?.landing ?? null}
                provisional={provisionalPatient}
                onBackToPatients={openPatientList}
                onViewProgram={viewProgramFromChart}
              />
            ) : (
              <PatientPage onOpenPatient={openRosterPatientRecord} />
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
