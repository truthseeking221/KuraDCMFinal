"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent, ReactNode } from "react";
import {
  Avatar,
  Button,
  Checkbox,
  Counter,
  Input,
  OtpInput,
  PhoneInput,
  Search,
  Select,
  SegmentedToggle,
  Textarea,
  Tooltip,
} from "@/components/ui";
import {
  Cart,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  Close,
  Flask,
  Heart,
  Patient,
  Plus,
  Sparkles,
} from "@/icons";
import {
  ACTIVE_PATIENT_ID,
  dedupHits,
  formatKhr,
  formatMoney,
  getItemLabContexts,
  identityStatusFor,
  LOOKUP_DEMOGRAPHICS,
  memberToPatient,
  orderBundleById,
  orderBundles,
  orderCategories,
  orderItemById,
  orderItems,
  relationshipLabel,
  resolveGuarantorPhone,
  specimenFilters,
  suggestedOrders,
  useOrderDraft,
} from "@/components/OrderDraft";
import { panelBiomarkerLabel, useFavoriteOrderItems } from "@/components/OrderDraft/favorites";
import type {
  DoctorIdentityDecision,
  DoctorPatientAssurance,
  ItemLabContext,
  OrderBundle,
  OrderCategoryId,
  OrderDraftLine,
  OrderFilterId,
  OrderItem,
  OrderSpecimenId,
  PlacedOrderSummary,
  PscPayChoice,
} from "@/components/OrderDraft";
import {
  BOOKING_PATIENTS,
  type BookingPatient,
  type GuarantorPhoneGraph,
  type IdentityGraphMember,
} from "@/components/OrderDraft/bookingSeeds";
import { getItemFlags, TestIndicatorGroup } from "@/components/OrdersTab/TestIndicatorGroup";
import { TestContextPopover, useHoverFocusPopover } from "@/components/OrdersTab/TestContextPopover";
import { cx } from "@/lib/cx";
import "@/components/OrdersTab/OrdersTab.css"; /* shares the dense category grid styles */
import "./LabCatalogWorkspace.css";

/* Master Lab Ordering Workspace.
   One ordering surface — opened from the global catalog, a patient chart, a lab
   result, or the patient list. The structure never changes: an Order context
   bar (who is this for?), the catalog (search / suggested / bundles / grid),
   and a fixed Order cart. The doctor fills ONE lab order; they may start with a
   patient or with tests, and the cart opens an in-place identity gate before
   the doctor-created PSC booking code is sent. */

type LabCatalogWorkspaceProps = {
  searchIntent?: { query: string; itemId: string } | null;
  onSearchIntentHandled?: () => void;
  onOpenPatientChart?: (patientId: string) => void;
  /* Entry points (patient chart, lab result, patient row) open the workspace
     with a patient already attached. Global catalog / Home open with none. */
  initialPatient?: BookingPatient | null;
  /* Lab-result "repeat test" entry can seed the cart with the suggested test. */
  initialCartIds?: string[];
};

type CatalogFilterId = OrderFilterId | "favorites";

const SPECIMEN_LABEL = new Map(specimenFilters.map((specimen) => [specimen.id, specimen.label]));
const CATEGORY_LABEL = new Map(orderCategories.map((category) => [category.id, category.label]));

function toggleSetValue<T>(set: ReadonlySet<T>, value: T) {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

function matchesSpecimens(specimens: OrderSpecimenId[], activeSpecimens: ReadonlySet<OrderSpecimenId>) {
  if (activeSpecimens.size === 0) return true;
  return specimens.some((specimen) => activeSpecimens.has(specimen));
}

function scrollLabLane(track: { current: HTMLDivElement | null }, direction: -1 | 1) {
  const node = track.current;
  if (!node) return;
  node.scrollBy({ left: direction * Math.min(544, node.clientWidth), behavior: "smooth" });
}

function LabLaneControls({
  label,
  trackRef,
}: {
  label: string;
  trackRef: { current: HTMLDivElement | null };
}) {
  return (
    <div className="lc-lane-controls" aria-label={`${label} carousel controls`}>
      <button aria-label={`Previous ${label}`} onClick={() => scrollLabLane(trackRef, -1)} type="button">
        <ChevronDown aria-hidden className="lc-lane-chevron is-prev" size={14} variant="stroke" />
      </button>
      <button aria-label={`Next ${label}`} onClick={() => scrollLabLane(trackRef, 1)} type="button">
        <ChevronDown aria-hidden className="lc-lane-chevron is-next" size={14} variant="stroke" />
      </button>
    </div>
  );
}

function LabToggleIndicator({ checked }: { checked: boolean }) {
  return (
    <span aria-hidden className={cx("lc-card-check", checked && "is-selected")}>
      {checked && <Check size={14} variant="stroke" />}
    </span>
  );
}

/* Left-rail filter row: checkbox · label · count. Mirrors the in-chart Orders
   tab so both ordering surfaces share one filter grammar. */
function CatalogFilterOption({
  checked,
  count,
  label,
  onChange,
}: {
  checked: boolean;
  count: number;
  label: string;
  onChange: () => void;
}) {
  return (
    <div className="orders-filter-option">
      <Checkbox checked={checked} label={<span>{label}</span>} onChange={onChange} />
      <Counter count={count} />
    </div>
  );
}

/* Generic, patient-agnostic starters shown before a patient is attached. Same
   section + chip shell as the patient-aware suggestions — only the copy and the
   relevance line differ. */
const GENERIC_SUGGESTIONS: Array<{ id: string; title: string; sub: string; targetId: string }> = [
  { id: "sg-diabetes", title: "Diabetes follow-up", sub: "HbA1c · glucose · microalbumin", targetId: "bundle-diabetes-panel" },
  { id: "sg-cardiac", title: "Cardiac risk", sub: "Lipids + cardiac markers", targetId: "bundle-cardiac-panel" },
  { id: "sg-annual", title: "Annual screen", sub: "CBC · fasting glucose · lipids", targetId: "cbc" },
];

function firstNameOf(name: string) {
  return name.split(" ")[0] || name;
}

function initialsOf(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function specimenText(item: OrderItem) {
  return item.sample || item.specimens.map((id) => SPECIMEN_LABEL.get(id) ?? id).join(" / ");
}

function itemMatchesQuery(item: OrderItem, query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  return [
    item.name,
    item.code,
    CATEGORY_LABEL.get(item.categoryId),
    item.sample,
    item.prep,
    item.description,
    item.indications?.join(" "),
    item.referenceRange?.us,
    item.referenceRange?.si,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(normalized);
}

function bundleMatchesQuery(bundle: OrderBundle, query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  return [bundle.name, bundle.tags.join(" "), String(bundle.testCount)].join(" ").toLowerCase().includes(normalized);
}

function identitySummary(patient: BookingPatient) {
  if (patient.relationship === "new") return "New patient · Phone verified";
  if (patient.relationship === "kura_known") return "Linked to doctor · Phone verified";
  if (patient.identityTier === "phone_verified") return "Phone verified";
  if (patient.identityTier === "phone_unconfirmed") return "Phone pending";
  return null;
}

type CartEntry = {
  id: string;
  kind: OrderDraftLine["kind"];
  name: string;
  code: string;
  price: number | null;
  meta: string;
};

function getCartEntry(line: OrderDraftLine): CartEntry {
  const item = line.itemId ? orderItemById.get(line.itemId) : null;
  if (item) {
    return {
      kind: line.kind,
      id: line.lineId,
      name: line.displayName || item.name,
      code: item.code,
      price: line.price,
      meta: `${CATEGORY_LABEL.get(item.categoryId) ?? item.categoryId} · ${specimenText(item)}`,
    };
  }

  const bundle = line.itemId ? orderBundleById.get(line.itemId) : null;
  if (bundle) {
    return {
      kind: line.kind,
      id: line.lineId,
      name: line.displayName || bundle.name,
      code: "Bundle",
      price: line.price,
      meta: `${bundle.testCount} tests · ${bundle.tags.join(", ")}`,
    };
  }

  const labMeta = line.labRefs.map((ref) => ref.reasonText || ref.labName).filter(Boolean).join(" · ");
  return {
    kind: line.kind,
    id: line.lineId,
    name: line.displayName,
    code: line.kind === "unlisted" ? "Unlisted" : "Catalog",
    price: line.price,
    meta: labMeta || (line.kind === "unlisted" ? "Priced at front desk" : "Selected from order draft"),
  };
}

/* Doctor identity gate: phone contact -> OTP -> resolve WHO the patient is,
   then hand that identity decision back to the Order draft rail. Payment + send
   live on the rail, not in this modal. */
type OrderGateStep = "phone" | "otp" | "candidates" | "relationship" | "preflight" | "provisional";
type ProvisionalIdentityKind = Extract<
  DoctorIdentityDecision["kind"],
  "unknown-phone-provisional" | "shared-phone-provisional" | "guarantor-provisional"
>;
type PatientSex = NonNullable<BookingPatient["sex"]>;

const DEMO_YEAR = 2026;
const DEMO_OTP_CODE = "123456";
const SEX_OPTIONS: Array<{ label: string; value: "" | PatientSex }> = [
  { label: "Female", value: "female" },
  { label: "Male", value: "male" },
  { label: "Other", value: "other" },
];

function digitsOf(value: string) {
  return value.replace(/\D/g, "");
}

function maskPhone(raw: string) {
  const d = digitsOf(raw);
  if (d.length < 6) return raw.trim() || "Phone pending";
  return `${d.slice(0, 3)} ••• ${d.slice(-3)}`;
}

function maskOtpPhone(raw: string) {
  const d = digitsOf(raw);
  const local = d.startsWith("855") ? d.slice(3) : d.replace(/^0+/, "");
  if (local.length < 5) return normalizePhone(raw) || raw.trim() || "phone";
  return `+855 ${local.slice(0, 2)} ••• ${local.slice(-3)}`;
}

function normalizePhone(raw: string) {
  const d = digitsOf(raw);
  if (!d) return "";
  if (d.startsWith("855")) return `+${d}`;
  return `+855${d.replace(/^0+/, "")}`;
}

function slugifyPatientName(name: string) {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "patient"
  );
}

function deriveYearOfBirth(value: string) {
  const trimmed = value.trim();
  const year = trimmed.match(/\b(19|20)\d{2}\b/)?.[0];
  if (year) return year;
  const age = Number.parseInt(trimmed, 10);
  if (Number.isFinite(age) && age > 0 && age < 120) return String(DEMO_YEAR - age);
  return undefined;
}

function sexDisplay(sex: PatientSex) {
  if (sex === "female") return "Female";
  if (sex === "male") return "Male";
  return "Other";
}

function redactName(name: string) {
  const parts = name.trim().split(/\s+/);
  const first = parts[0] ?? "";
  const last = parts.at(-1) ?? "";
  const redactedFirst = first.length <= 2 ? first : `${first.slice(0, 2)}...`;
  const redactedLast = last && last !== first ? `${last[0]}.` : "";
  return `${redactedFirst} ${redactedLast}`.trim();
}

function redactedIdentity(patient: BookingPatient) {
  const demographics = LOOKUP_DEMOGRAPHICS[patient.id];
  const mrnDigits = digitsOf(patient.mrn).slice(-2) || "—";
  return {
    name: redactName(patient.name),
    mrn: `MRN ••${mrnDigits}`,
    dob: patient.yearOfBirth
      ? `YOB ${patient.yearOfBirth.slice(0, 3)}•`
      : demographics
        ? `${demographics.ageLabel}y`
        : "DOB not shown",
    sex: patient.sex ? sexDisplay(patient.sex) : demographics ? sexDisplay(demographics.sex) : "Sex not shown",
  };
}

function withLookupDemographics(patient: BookingPatient): BookingPatient {
  const demographics = LOOKUP_DEMOGRAPHICS[patient.id];
  if (!demographics) return patient;
  return {
    ...patient,
    sex: patient.sex ?? demographics.sex,
    yearOfBirth: patient.yearOfBirth ?? demographics.yearOfBirth,
    dobOrAge: patient.dobOrAge ?? demographics.ageLabel,
  };
}

function phoneCandidateHits(phone: string, patients: BookingPatient[]) {
  const d = digitsOf(phone);
  if (d.length < 8) return [];
  const first = d.slice(0, 3);
  const last = d.slice(-3);
  const direct = patients.filter((patient) => {
    const pd = digitsOf(patient.phone ?? patient.phoneMasked);
    return pd.length >= 6 && pd.slice(0, 3) === first && pd.slice(-3) === last;
  });
  if (direct.length > 0) return direct;
  if (first === "010") {
    return patients.filter((patient) => digitsOf(patient.phone ?? patient.phoneMasked).startsWith("010")).slice(0, 3);
  }
  return [];
}

function assuranceForDecision(kind: DoctorIdentityDecision["kind"]): DoctorPatientAssurance {
  return kind === "known-confirmed" || kind === "dependent-confirmed" ? "known-reused" : "provisional";
}

/* A chart-provided patient is treated as an already-confirmed known identity. */
function seedKnownDecision(patient: BookingPatient | null): DoctorIdentityDecision | null {
  if (!patient) return null;
  return {
    kind: "known-confirmed",
    verifiedPhone: patient.phone ?? "",
    candidateIds: [patient.id],
    confirmedPatientId: patient.id,
    relationshipToPhoneHolder: "self",
  };
}

/* ---- Suggested (global or patient-aware) ------------------------------- */
function SuggestedCard({
  patient,
  patientAware,
  cartIds,
  itemCtx,
  onToggleCart,
}: {
  patient: BookingPatient | null;
  patientAware: boolean;
  cartIds: ReadonlySet<string>;
  itemCtx: Map<string, ItemLabContext>;
  onToggleCart: (id: string) => void;
}) {
  const entries = patientAware
    ? suggestedOrders.map((s) => {
        const ctx = itemCtx.get(s.targetId);
        return { id: s.id, targetId: s.targetId, title: s.title, sub: ctx?.short ?? s.description, tone: s.tone };
      })
    : GENERIC_SUGGESTIONS.map((s) => ({ id: s.id, targetId: s.targetId, title: s.title, sub: s.sub, tone: "info" as const }));
  const trackRef = useRef<HTMLDivElement>(null);

  return (
    <section className="lc-lane" aria-labelledby="lc-suggested-title">
      <div className="lc-lane-head">
        <div className="lc-lane-title">
          <h2 className="text-gradient-wizard" id="lc-suggested-title">{patientAware ? `Suggested for ${firstNameOf(patient!.name)}` : "Suggested"}</h2>
          <Counter count={entries.length} />
        </div>
        <LabLaneControls label="suggested tests" trackRef={trackRef} />
      </div>
      <div className="lc-suggest-row" ref={trackRef}>
        {entries.map((entry) => {
          const selected = cartIds.has(entry.targetId);
          const item = orderItemById.get(entry.targetId);
          const flags = item ? getItemFlags(item).filter((flag) => patientAware || flag.key !== "abnormal") : [];
          return (
            <button
              key={entry.id}
              type="button"
              className={cx("lc-suggest-chip", selected && "is-selected", `tone-${entry.tone}`)}
              aria-pressed={selected}
              aria-label={`${selected ? "Remove" : "Add"} ${entry.title}`}
              onClick={() => onToggleCart(entry.targetId)}
            >
              <span className="lc-suggest-copy">
                <strong>{entry.title}</strong>
                <span className="lc-suggest-reason-row">
                  <small>{entry.sub}</small>
                  <TestIndicatorGroup flags={flags} />
                </span>
              </span>
              <LabToggleIndicator checked={selected} />
            </button>
          );
        })}
      </div>
    </section>
  );
}

function BundlesCard({
  bundles,
  cartIds,
  onToggleBundle,
}: {
  bundles: OrderBundle[];
  cartIds: ReadonlySet<string>;
  onToggleBundle: (bundleId: string) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);

  return (
    <section className="lc-lane" aria-labelledby="lc-bundles-title">
      <div className="lc-lane-head">
        <div className="lc-lane-title">
          <h2 id="lc-bundles-title">From Your Bundle</h2>
          <Counter count={bundles.length} />
        </div>
        <LabLaneControls label="bundles" trackRef={trackRef} />
      </div>
      <div className="lc-bundle-row" ref={trackRef}>
        {bundles.map((bundle) => {
          const selected = cartIds.has(bundle.id);
          const sub = bundle.tags.join(", ").replace(", +", " · +");
          return (
            <button
              key={bundle.id}
              type="button"
              className={cx("lc-bundle-chip", selected && "is-selected")}
              aria-pressed={selected}
              aria-label={`${selected ? "Remove" : "Add"} ${bundle.name}`}
              onClick={() => onToggleBundle(bundle.id)}
            >
              <span className="lc-bundle-copy">
                <strong>{bundle.name}</strong>
                <small>{sub}</small>
              </span>
              <LabToggleIndicator checked={selected} />
            </button>
          );
        })}
      </div>
    </section>
  );
}

/* ---- Dense catalog grid (shared shell with the in-chart Orders tab) -----
   A compact pick tile: checkbox · name · clinical flag icons. The flag's full
   reason + test detail live in the shared hover/focus popover, so the grid scans
   clean. Abnormal flags only show when the demo patient is attached (honest); the
   unavailable flag is patient-independent. */
function CatalogItemTile({
  checked,
  favorite,
  highlighted,
  item,
  patientAware,
  onToggleFavorite,
  onToggle,
}: {
  checked: boolean;
  favorite: boolean;
  highlighted: boolean;
  item: OrderItem;
  patientAware: boolean;
  onToggleFavorite: () => void;
  onToggle: () => void;
}) {
  const blocked = !!item.unavailable;
  const flags = getItemFlags(item).filter((flag) => patientAware || flag.key !== "abnormal");
  const { open, dismiss, popoverProps, wrapperProps, triggerProps } = useHoverFocusPopover(`lc-tile:${item.id}`);
  const ref = useRef<HTMLButtonElement>(null);
  const lastFavoritePointerToggleRef = useRef(0);
  const panelLabel = panelBiomarkerLabel(item);
  const toggleFavoriteAndDismiss = () => {
    onToggleFavorite();
    dismiss();
  };
  const handleFavoritePointerUp = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    lastFavoritePointerToggleRef.current = Date.now();
    toggleFavoriteAndDismiss();
  };
  const handleFavoriteClick = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (Date.now() - lastFavoritePointerToggleRef.current < 700) return;
    toggleFavoriteAndDismiss();
  };

  return (
    <div className="orders-item">
      <button
        aria-disabled={blocked || undefined}
        aria-label={`${checked ? "Remove" : "Add"} ${item.name}`}
        aria-pressed={checked}
        className={cx("orders-item-tile", checked && "is-selected", blocked && "is-unavailable", highlighted && "is-search-hit")}
        id={`lab-catalog-item-${item.id}`}
        onClick={() => {
          if (!blocked) {
            onToggle();
            dismiss();
          }
        }}
        ref={ref}
        type="button"
        {...wrapperProps}
        {...triggerProps}
      >
        <span aria-hidden className={cx("orders-item-check", checked && "is-selected")}>
          {checked && <Check size={14} variant="stroke" />}
        </span>
        <span className="orders-item-label">
          <span className="orders-item-name">{item.name}</span>
          {panelLabel && item.analytes && (
            <span
              aria-label={`${panelLabel} biomarker${panelLabel === "1" ? "" : "s"}`}
              className="orders-item-panel"
              title={`Includes ${item.analytes.join(", ")}`}
            >
              {panelLabel}
            </span>
          )}
        </span>
        <TestIndicatorGroup flags={flags} />
      </button>
      <Tooltip content={favorite ? "Remove from favorites" : "Add to favorites"} placement="top">
        <button
          aria-label={`${favorite ? "Remove from favorites" : "Add to favorites"}: ${item.name}`}
          aria-pressed={favorite}
          className={cx("orders-item-favorite", favorite && "is-active")}
          onClick={handleFavoriteClick}
          onPointerUp={handleFavoritePointerUp}
          type="button"
        >
          <Heart size={14} variant={favorite ? "solid" : "stroke"} />
        </button>
      </Tooltip>
      {open && (
        <TestContextPopover
          item={item}
          anchorRef={ref}
          hoverProps={popoverProps}
          selected={checked}
          onToggle={onToggle}
        />
      )}
    </div>
  );
}

function CatalogSection({
  cartIds,
  collapsed,
  favoriteIds,
  highlightedItemId,
  items,
  patientAware,
  title,
  onToggle,
  onToggleFavorite,
  onToggleItem,
}: {
  cartIds: ReadonlySet<string>;
  collapsed: boolean;
  favoriteIds: ReadonlySet<string>;
  highlightedItemId: string | null;
  items: OrderItem[];
  patientAware: boolean;
  title: string;
  onToggle: () => void;
  onToggleFavorite: (id: string) => void;
  onToggleItem: (id: string) => void;
}) {
  return (
    <section className="orders-category-section">
      <button className="orders-section-heading" onClick={onToggle} type="button">
        <ChevronDown className={cx(collapsed && "is-collapsed")} size={12} variant="stroke" />
        <span>{title}</span>
      </button>
      {!collapsed && (
        <div className="orders-item-grid">
          {items.map((item) => (
            <CatalogItemTile
              key={item.id}
              item={item}
              checked={cartIds.has(item.id)}
              favorite={favoriteIds.has(item.id)}
              highlighted={item.id === highlightedItemId}
              patientAware={patientAware}
              onToggleFavorite={() => onToggleFavorite(item.id)}
              onToggle={() => onToggleItem(item.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

/* ---- Order cart -------------------------------------------------------- */
/* The cart never changes role and never becomes a patient search. It always
   states the patient slot ("For X" / "No patient attached") and its CTA names
   the one missing piece: add tests, add patient, choose route, review, place. */
const PSC_PAY_OPTIONS: Array<{ id: PscPayChoice; title: string; sub: string }> = [
  { id: "later", title: "Patient pays at PSC", sub: "Kura collects at PSC and remits the doctor spread." },
  { id: "cash", title: "Cash collected at doctor office", sub: "Doctor declares cash collected and owes Kura balance." },
  { id: "khqr", title: "KHQR before visit", sub: "Payment link is sent with the booking code." },
];

function OrderCart({
  lines,
  patient,
  identityDecision,
  placedBooking,
  pscPay,
  cashCollected,
  onClear,
  onBeginOrder,
  onChangePatient,
  onPscPay,
  onCashCollected,
  onSend,
  onRemove,
}: {
  lines: OrderDraftLine[];
  patient: BookingPatient | null;
  identityDecision: DoctorIdentityDecision | null;
  placedBooking: PlacedOrderSummary | null;
  pscPay: PscPayChoice;
  cashCollected: boolean;
  onClear: () => void;
  onBeginOrder: () => void;
  onChangePatient: () => void;
  onPscPay: (choice: PscPayChoice) => void;
  onCashCollected: (next: boolean) => void;
  onSend: () => void;
  onRemove: (id: string) => void;
}) {
  const sortedLines = useMemo(() => [...lines].sort((a, b) => a.addedAt - b.addedAt), [lines]);
  const entries = sortedLines.map(getCartEntry);
  const total = entries.reduce((sum, entry) => sum + (entry.price ?? 0), 0);
  const unpricedCount = entries.filter((entry) => entry.price === null).length;
  const hasTests = entries.length > 0;
  /* Patient is "attached" only once both the record and the doctor's identity
     decision are set — a phone match alone is never enough. */
  const attached = !!patient && !!identityDecision;
  const patientIdentity = patient ? identitySummary(patient) : null;
  const status = identityStatusFor(identityDecision);
  const cashNow = pscPay === "cash";

  const patientLine = attached ? (
    <div className="lc-cart-patient">
      <span className={cx("lc-cart-patient-av", status.tone === "warn" && "is-warning")}>{initialsOf(patient!.name)}</span>
      <span className="lc-cart-patient-copy">
        <strong>For {patient!.name}</strong>
        <small>
          {patient!.mrn}
          {patientIdentity ? ` · ${patientIdentity}` : ""}
        </small>
      </span>
      {!placedBooking && (
        <button type="button" className="lc-cart-patient-change" onClick={onChangePatient}>
          Change
        </button>
      )}
    </div>
  ) : hasTests ? (
    <div className="lc-cart-patient is-missing">
      <span aria-hidden className="lc-cart-patient-av is-empty">
        <Patient size={15} variant="stroke" />
      </span>
      <span className="lc-cart-patient-copy">
        <strong>Patient identity pending</strong>
        <small>Resolve who the patient is before sending a booking code</small>
      </span>
    </div>
  ) : null;

  const identityBadge = attached ? (
    <div className={cx("lc-cart-identity", status.tone === "ok" ? "is-ok" : "is-warn")} role="status">
      {status.tone === "ok" ? <CheckCircle size={15} variant="bulk" /> : <Patient size={14} variant="stroke" />}
      <span>
        <strong>{status.label}</strong>
        <small>{status.sub}</small>
      </span>
    </div>
  ) : null;

  const testLines = hasTests ? (
    <section className="lc-cart-section">
      <span className="lc-cart-group-label">Catalog</span>
      <ul className="lc-cart-lines">
        {entries.map((entry) => (
          <li key={entry.id}>
            <span className="lc-cart-line-copy">
              <strong>{entry.name}</strong>
              <span>{entry.code} · {entry.meta}</span>
            </span>
            <span className="lc-cart-line-price">
              {entry.price === null ? <span className="lc-cart-line-frontdesk">Front desk</span> : formatMoney(entry.price)}
            </span>
            {!placedBooking && (
              <button type="button" aria-label={`Remove ${entry.name}`} onClick={() => onRemove(entry.id)}>
                <Close size={14} variant="stroke" />
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  ) : (
    <div className="lc-cart-empty">
      <span className="lc-cart-empty-badge" aria-hidden="true">
        <Cart size={16} variant="bulk" />
      </span>
      <span className="lc-cart-empty-copy">
        <strong>No tests selected</strong>
        <span>Add tests from the catalog to build this order.</span>
      </span>
    </div>
  );

  const subtotalBlock = hasTests ? (
    <div className="lc-cart-total">
      <div className="lc-cart-total-row">
        <span>Subtotal</span>
        <strong>{formatMoney(total)}</strong>
      </div>
      <div className="lc-cart-total-sub">
        <small>≈ {formatKhr(total)}</small>
        {unpricedCount > 0 && <small className="lc-cart-total-warning">+{unpricedCount} unpriced</small>}
      </div>
    </div>
  ) : null;

  /* Payment lives on the rail (not the modal) so the doctor reviews the tests in
     full before any booking code is sent. */
  const paymentBlock = hasTests && attached && !placedBooking ? (
    <section className="lc-cart-pay" aria-label="Payment handling">
      <span className="lc-cart-group-label">Payment</span>
      <div className="lc-order-payment-options">
        {PSC_PAY_OPTIONS.map((option) => (
          <button
            type="button"
            key={option.id}
            className={cx("lc-order-payment-row", pscPay === option.id && "is-selected")}
            aria-pressed={pscPay === option.id}
            onClick={() => onPscPay(option.id)}
          >
            <span>
              <strong>{option.title}</strong>
              <small>{option.sub}</small>
            </span>
          </button>
        ))}
      </div>
      {cashNow && (
        <label className="lc-order-check lc-order-check-warning">
          <input type="checkbox" checked={cashCollected} onChange={(event) => onCashCollected(event.target.checked)} />
          <span>Cash collected at doctor office for {formatMoney(total)}</span>
        </label>
      )}
    </section>
  ) : null;

  const placedProvisional = placedBooking?.patientAssurance === "provisional";
  const placedBlock = placedBooking ? (
    <section className={cx("lc-cart-placed", placedProvisional && "is-warning")} aria-label="Placed booking">
      <CheckCircle size={18} variant="bulk" />
      <div>
        <strong>Booking code sent</strong>
        <span>
          {placedBooking.bookingCode ?? placedBooking.code} ·{" "}
          {placedProvisional ? "Awaiting PSC identity verification" : "Awaiting visit"}
        </span>
        <small>
          {placedProvisional
            ? `${placedBooking.code} · PSC must verify identity before draw`
            : `${placedBooking.code} · PSC reception confirms check-in and draw`}
        </small>
      </div>
    </section>
  ) : null;

  const sendBlocked = !attached
    ? "Attach a patient first."
    : !hasTests
      ? "Add at least one catalog test."
      : cashNow && !cashCollected
        ? `Confirm office cash collection of ${formatMoney(total)}.`
        : null;

  return (
    <aside className="lc-cart lc-cart-rail" aria-label="Order cart">
      <header className="lc-cart-head">
        <h2>Order draft</h2>
        {hasTests && <span className="lc-cart-count">{entries.length}</span>}
        {hasTests && !placedBooking && (
          <button type="button" className="lc-cart-clear" onClick={onClear}>
            Clear
          </button>
        )}
      </header>

      <div className="lc-cart-body">
        {patientLine}
        {identityBadge}
        {placedBlock}
        {testLines}
        {paymentBlock}
      </div>

      {hasTests && (
        <footer className="lc-cart-footer">
          {subtotalBlock}
          <div className="lc-cart-cta">
            {placedBooking ? (
              <Button
                fullWidth
                intent="outline"
                leadingIcon={<Plus size={13} variant="stroke" />}
                onClick={onClear}
              >
                Start another order
              </Button>
            ) : attached ? (
              <Button fullWidth disabled={!!sendBlocked} onClick={onSend}>
                Send booking code
              </Button>
            ) : (
              <Button
                fullWidth
                leadingIcon={<Patient size={13} variant="stroke" />}
                onClick={onBeginOrder}
              >
                Add patient to order
              </Button>
            )}
            <p className="lc-cart-helper">
              {placedBooking
                ? placedProvisional
                  ? "Provisional identity — PSC reception verifies the patient before the draw."
                  : "This PSC booking is now in the doctor queue as Awaiting visit."
                : attached
                  ? sendBlocked ?? "Review the tests above, then send the PSC booking code."
                  : "Resolve the patient's identity, then send the booking code from here."}
            </p>
          </div>
        </footer>
      )}
    </aside>
  );
}

/* Doctor identity gate. It verifies the phone contact, resolves WHO the patient
   is, and hands that decision back to the rail via onAttach — it never sends a
   booking code. A phone is a contact key, not an identity: a match must be
   confirmed, a guarantor phone must route to the real patient, and a no-match
   must clear a duplicate preflight before a provisional is minted. */
function OrderIdentityModal({
  initialPatient,
  onClose,
  onAttach,
}: {
  initialPatient: BookingPatient | null;
  onClose: () => void;
  onAttach: (patient: BookingPatient, decision: DoctorIdentityDecision) => void;
}) {
  const seededPhone = initialPatient?.phone ? initialPatient.phone.replace(/^\+855/, "0") : "";

  const [step, setStep] = useState<OrderGateStep>("phone");
  const [phoneCountry, setPhoneCountry] = useState("KH");
  const [phone, setPhone] = useState(seededPhone);
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [provisionalKind, setProvisionalKind] = useState<ProvisionalIdentityKind | null>(null);
  const [candidateIdsForDecision, setCandidateIdsForDecision] = useState<string[]>([]);
  const [guarantorGraph, setGuarantorGraph] = useState<GuarantorPhoneGraph | null>(null);
  const [dupCandidates, setDupCandidates] = useState<BookingPatient[]>([]);
  const [sharedMismatchAcknowledged, setSharedMismatchAcknowledged] = useState(false);
  const [form, setForm] = useState<{ name: string; dobOrAge: string; sex: "" | PatientSex }>({
    name: "",
    dobOrAge: "",
    sex: "",
  });
  const [error, setError] = useState<string | null>(null);

  const candidates = useMemo(() => phoneCandidateHits(phone, BOOKING_PATIENTS), [phone]);
  const normalizedPhone = normalizePhone(phone);
  const maskedPhone = maskPhone(phone);
  const verifiedPhone = normalizedPhone || phone.trim();
  const candidateIds = candidates.map((candidate) => candidate.id);

  const resetToPhone = () => {
    setStep("phone");
    setOtp("");
    setOtpSent(false);
    setProvisionalKind(null);
    setCandidateIdsForDecision([]);
    setGuarantorGraph(null);
    setDupCandidates([]);
    setSharedMismatchAcknowledged(false);
    setForm({ name: "", dobOrAge: "", sex: "" });
    setError(null);
  };

  const startPhoneVerification = () => {
    if (digitsOf(phone).length < 8) {
      setError("Enter the patient's mobile number first.");
      return;
    }
    setSharedMismatchAcknowledged(false);
    setDupCandidates([]);
    setError(null);
    setOtp("");
    setOtpSent(true);
    setStep("otp");
  };

  const resolvePhoneIdentity = () => {
    /* A guarantor/guardian phone resolves to a family, not a patient. Route to
       relationship resolution before anyone is attached. */
    const graph = resolveGuarantorPhone(phone);
    if (graph) {
      setGuarantorGraph(graph);
      setCandidateIdsForDecision(graph.members.map((member) => member.id));
      setStep("relationship");
      return;
    }

    const matches = phoneCandidateHits(phone, BOOKING_PATIENTS);
    setGuarantorGraph(null);
    setCandidateIdsForDecision(matches.map((candidate) => candidate.id));

    if (matches.length === 0) {
      /* No record on this phone — NOT "new patient". The provisional form runs a
         duplicate preflight before anything is created. */
      setProvisionalKind("unknown-phone-provisional");
      setStep("provisional");
      return;
    }

    setStep("candidates");
  };

  const verifyOtp = (code = otp) => {
    if (!otpSent) {
      setError("Send the code before verifying this phone.");
      return;
    }
    if (code.length < DEMO_OTP_CODE.length) {
      setError("Enter the 6-digit code read by the patient.");
      return;
    }
    if (code !== DEMO_OTP_CODE) {
      setError("That code does not match. Check the number and try again.");
      return;
    }
    setError(null);
    resolvePhoneIdentity();
  };

  /* Attach an existing Kura record the doctor confirmed by sight. */
  const confirmKnownPatient = (patient: BookingPatient) => {
    const enriched = withLookupDemographics(patient);
    onAttach(
      { ...enriched, phone: enriched.phone ?? normalizedPhone, identityTier: enriched.identityTier ?? "panel" },
      {
        kind: "known-confirmed",
        verifiedPhone,
        candidateIds: candidateIdsForDecision.length ? candidateIdsForDecision : candidateIds,
        confirmedPatientId: enriched.id,
        relationshipToPhoneHolder: "self",
      },
    );
  };

  /* Attach a member chosen from a guarantor phone graph. The holder (self) is a
     normal known patient; a dependent is attached as dependent-confirmed. */
  const pickGraphMember = (member: IdentityGraphMember) => {
    if (!guarantorGraph) return;
    const patient = memberToPatient(member, phone);
    const isHolder = member.relationshipToHolder === "self";
    onAttach(patient, {
      kind: isHolder ? "known-confirmed" : "dependent-confirmed",
      verifiedPhone,
      candidateIds: guarantorGraph.members.map((entry) => entry.id),
      confirmedPatientId: member.id,
      relationshipToPhoneHolder: member.relationshipToHolder,
      phoneHolderName: guarantorGraph.holderName,
    });
  };

  const beginProvisional = (kind: ProvisionalIdentityKind) => {
    setProvisionalKind(kind);
    setDupCandidates([]);
    setSharedMismatchAcknowledged(false);
    setForm({ name: "", dobOrAge: "", sex: "" });
    setError(null);
    setStep("provisional");
  };

  const buildProvisional = (): BookingPatient => ({
    id: `catalog-${slugifyPatientName(form.name.trim())}`,
    name: form.name.trim(),
    mrn: "PROV-0001",
    phone: verifiedPhone,
    phoneMasked: maskedPhone,
    dobOrAge: form.dobOrAge.trim(),
    yearOfBirth: deriveYearOfBirth(form.dobOrAge),
    sex: form.sex || undefined,
    identityTier: "phone_verified",
    relationship: "new",
  });

  const attachProvisional = () => {
    onAttach(buildProvisional(), {
      kind: provisionalKind ?? "unknown-phone-provisional",
      verifiedPhone,
      candidateIds: candidateIdsForDecision,
      relationshipToPhoneHolder: provisionalKind === "guarantor-provisional" ? "dependent" : "self",
      phoneHolderName: provisionalKind === "guarantor-provisional" ? guarantorGraph?.holderName : undefined,
      dedupChecked: true,
    });
  };

  /* Provisional submit runs the duplicate preflight first. Only a clear preflight
     (or an explicit "create anyway") mints the record. */
  const submitProvisional = () => {
    const name = form.name.trim();
    if (!name || !form.dobOrAge.trim() || !form.sex) {
      setError("Add name, DOB or age, and sex before continuing.");
      return;
    }
    if (provisionalKind === "shared-phone-provisional" && !sharedMismatchAcknowledged) {
      setError("Confirm the matched Kura patient is not the person being tested.");
      return;
    }
    const dups = dedupHits(name, form.dobOrAge, form.sex, BOOKING_PATIENTS);
    if (dups.length) {
      setDupCandidates(dups);
      setError(null);
      setStep("preflight");
      return;
    }
    attachProvisional();
  };

  const otpPhoneLabel = maskOtpPhone(phone);
  const cardNodeId =
    step === "phone"
      ? "650:21746"
      : step === "otp"
        ? "650:25847"
        : step === "candidates" && candidates.length === 1
          ? "650:26067"
          : step === "provisional"
            ? "650:24513"
            : "650:22944";

  const closeButton = (
    <button className="lc-phone-gate-close" type="button" aria-label="Close patient identity gate" onClick={onClose}>
      <Close size={16} variant="stroke" />
    </button>
  );

  const topbar = (onBack: () => void = resetToPhone, label = "Change Phone") => (
    <div className="lc-phone-gate-topbar">
      <button type="button" className="lc-phone-gate-back" onClick={onBack}>
        <ChevronLeft size={20} variant="stroke" />
        <span>{label}</span>
      </button>
      {closeButton}
    </div>
  );

  const responsibilityPanel = (
    <aside className="lc-phone-gate-safety" aria-label="Doctor responsibility">
      <span className="lc-eyebrow">Doctor responsibility</span>
      <ul className="lc-phone-verify-list">
        <li>
          <CheckCircle size={15} variant="bulk" />
          <span>Verify the contact number first.</span>
        </li>
        <li>
          <CheckCircle size={15} variant="bulk" />
          <span>Confirm the person taking the tests before attaching this order.</span>
        </li>
        <li>
          <CheckCircle size={15} variant="bulk" />
          <span>Reception can finish ID checks and duplicate cleanup later.</span>
        </li>
      </ul>
    </aside>
  );

  const renderChoiceRow = ({
    id,
    name,
    initials,
    meta,
    tone = "neutral",
    onChoose,
    chooseLabel = "Choose",
  }: {
    id: string;
    name: string;
    initials: string;
    meta: string;
    tone?: "neutral" | "brand";
    onChoose: () => void;
    chooseLabel?: string;
  }) => (
    <div className="lc-phone-gate-choice-row" key={id}>
      <Avatar name={name} initials={initials} size="md" tone={tone} />
      <span className="lc-phone-gate-choice-copy">
        <strong>{name}</strong>
        <small>{meta}</small>
      </span>
      <Button className="lc-phone-gate-choice-button" size="sm" onClick={onChoose}>
        {chooseLabel}
      </Button>
    </div>
  );

  let gateBody: ReactNode;
  if (step === "phone") {
    gateBody = (
      <>
        <div className="lc-phone-gate-head">
          <h2 id="lc-order-gate-title">Find Patient</h2>
          <p>This can be the patient, guardian, or guarantor&apos;s number.</p>
        </div>
        <PhoneInput
          country={phoneCountry}
          number={phone}
          onCountryChange={setPhoneCountry}
          onNumberChange={(next) => {
            setPhone(next);
            setError(null);
          }}
          invalid={!!error}
        />
        {error && <p className="lc-field-error">{error}</p>}
        <Button fullWidth size="lg" onClick={startPhoneVerification}>
          Check phone
        </Button>
        <p className="lc-phone-gate-footnote">
          Demo: <strong>012 777 088</strong> family phone · <strong>010 222 333</strong> shared phone · any other number starts a new patient check
        </p>
      </>
    );
  } else if (step === "otp") {
    gateBody = (
      <>
        {topbar()}
        <div className="lc-phone-gate-centered">
          <h2 id="lc-order-gate-title">Verify number</h2>
          <p>
            Enter the 6-digit SMS code sent to <strong>{otpPhoneLabel}</strong>.
          </p>
        </div>
        <OtpInput
          autoFocus
          className="lc-phone-gate-otp"
          value={otp}
          invalid={!!error}
          ariaLabel="Patient OTP"
          onChange={(next) => {
            setOtp(next);
            setError(null);
          }}
          onComplete={(code) => verifyOtp(code)}
        />
        {error && <p className="lc-field-error">{error}</p>}
        <Button fullWidth size="lg" disabled={!otpSent} onClick={() => verifyOtp()}>
          Verify code
        </Button>
        <p className="lc-phone-gate-footnote">
          Demo code: <strong>{DEMO_OTP_CODE}</strong>
        </p>
      </>
    );
  } else if (step === "candidates") {
    const singleCandidate = candidates.length === 1 ? candidates[0] : null;
    gateBody = (
      <>
        {topbar()}
        {singleCandidate ? (
          <>
            <div className="lc-phone-gate-title-block">
              <h2 id="lc-order-gate-title">Is this the patient?</h2>
            </div>
            {(() => {
              const redacted = redactedIdentity(singleCandidate);
              return (
                <>
                  <div className="lc-phone-gate-choice-list is-single">
                    {renderChoiceRow({
                      id: singleCandidate.id,
                      name: redacted.name,
                      initials: initialsOf(singleCandidate.name),
                      meta: `${redacted.sex} · ${redacted.dob} · ${redacted.mrn}`,
                      tone: "brand",
                      onChoose: () => confirmKnownPatient(singleCandidate),
                    })}
                  </div>
                  <Button className="lc-phone-gate-secondary" fullWidth size="lg" onClick={() => beginProvisional("shared-phone-provisional")}>
                    Patient is someone else
                  </Button>
                </>
              );
            })()}
          </>
        ) : (
          <>
            <div className="lc-phone-gate-title-block">
              <h2 id="lc-order-gate-title">Choose patient</h2>
            </div>
            <section className="lc-phone-gate-note">
              <strong>This number is linked to {candidates.length} patients</strong>
              <span>Choose who this order is for.</span>
            </section>
            <div className="lc-phone-gate-choice-list">
              {candidates.map((candidate) => {
                const redacted = redactedIdentity(candidate);
                return renderChoiceRow({
                  id: candidate.id,
                  name: redacted.name,
                  initials: initialsOf(candidate.name),
                  meta: `${redacted.sex} · ${redacted.dob} · ${redacted.mrn}`,
                  tone: "brand",
                  onChoose: () => confirmKnownPatient(candidate),
                });
              })}
            </div>
            <Button className="lc-phone-gate-secondary" fullWidth size="lg" onClick={() => beginProvisional("shared-phone-provisional")}>
              Patient is someone else
            </Button>
          </>
        )}
      </>
    );
  } else if (step === "relationship") {
    const graph = guarantorGraph!;
    gateBody = (
      <>
        {topbar()}
        <div className="lc-phone-gate-title-block">
          <h2 id="lc-order-gate-title">Choose patient</h2>
        </div>
        <section className="lc-phone-gate-note is-warning">
          <strong>This number is linked to {graph.members.length} patients</strong>
          <span>A phone holder is not automatically the patient. Choose who this order is for.</span>
        </section>
        <div className="lc-phone-gate-choice-list">
          {graph.members.map((member) =>
            renderChoiceRow({
              id: member.id,
              name: member.name,
              initials: initialsOf(member.name),
              meta: `${sexDisplay(member.sex)} · ${member.ageLabel}y · ${
                member.relationshipToHolder === "self" ? relationshipLabel(graph.holderRelationship) : relationshipLabel(member.relationshipToHolder)
              }`,
              tone: member.relationshipToHolder === "self" ? "brand" : "neutral",
              onChoose: () => pickGraphMember(member),
            }),
          )}
        </div>
        <Button className="lc-phone-gate-secondary" fullWidth size="lg" onClick={() => beginProvisional("guarantor-provisional")}>
          Patient is someone else
        </Button>
      </>
    );
  } else if (step === "preflight") {
    gateBody = (
      <>
        {topbar(() => setStep("provisional"), "Back to details")}
        <div className="lc-phone-gate-title-block">
          <h2 id="lc-order-gate-title">Possible existing patient</h2>
        </div>
        <section className="lc-phone-gate-note is-warning">
          <strong>A Kura patient already looks like this</strong>
          <span>Before creating a new record for {form.name.trim()}, check it is not one of these.</span>
        </section>
        <div className="lc-phone-gate-choice-list">
          {dupCandidates.map((candidate) => {
            const redacted = redactedIdentity(candidate);
            return renderChoiceRow({
              id: candidate.id,
              name: redacted.name,
              initials: initialsOf(candidate.name),
              meta: `${redacted.sex} · ${redacted.dob} · ${redacted.mrn}`,
              tone: "brand",
              chooseLabel: "Use this",
              onChoose: () => confirmKnownPatient(candidate),
            });
          })}
        </div>
        <Button className="lc-phone-gate-secondary" fullWidth size="lg" onClick={attachProvisional}>
          None of these - create {form.name.trim() || "new patient"}
        </Button>
      </>
    );
  } else {
    const sharedPhone = provisionalKind === "shared-phone-provisional";
    const guarantorChild = provisionalKind === "guarantor-provisional";
    const noteTitle = sharedPhone
      ? "This looks like a different patient"
      : guarantorChild
        ? "Add a new dependent under this phone"
        : "No matching patient found";
    const noteBody = sharedPhone
      ? "This phone already belongs to someone in Kura. Confirm the person in front of you is not that matched patient before adding details."
      : guarantorChild
        ? "The verified phone can belong to a guardian or guarantor. Add the patient's details so Kura can check for duplicates first."
        : "Add the patient's details. Kura will check for possible duplicates before creating a provisional record.";

    gateBody = (
      <>
        {topbar()}
        <section className={cx("lc-phone-gate-note", (sharedPhone || guarantorChild) && "is-warning")}>
          <strong>{noteTitle}</strong>
          <span>{noteBody}</span>
        </section>
        <div className="lc-phone-gate-form">
          <label className="lc-phone-gate-field">
            <span>Verified phone</span>
            <PhoneInput
              country={phoneCountry}
              number={phone}
              onCountryChange={setPhoneCountry}
              onNumberChange={setPhone}
              locked
              verified
              lockedDescription="Phone was verified with OTP"
              onUnlock={resetToPhone}
            />
          </label>
          <div className="lc-phone-gate-form-grid">
            <Input
              label="Full name"
              value={form.name}
              onChange={(event) => {
                setForm((current) => ({ ...current, name: event.target.value }));
                setError(null);
              }}
              placeholder="Patient name"
            />
            <Input
              label="DOB or age"
              value={form.dobOrAge}
              onChange={(event) => {
                setForm((current) => ({ ...current, dobOrAge: event.target.value }));
                setError(null);
              }}
              placeholder="12-09-1994 or 32"
            />
          </div>
          <label className="lc-phone-gate-sex-field">
            <span>Sex</span>
            <SegmentedToggle
              aria-label="Patient sex"
              className="lc-phone-gate-sex-toggle"
              options={SEX_OPTIONS}
              value={form.sex}
              onChange={(sex) => {
                setForm((current) => ({ ...current, sex }));
                setError(null);
              }}
            />
          </label>
          {sharedPhone && (
            <label className="lc-phone-gate-check">
              <input
                type="checkbox"
                checked={sharedMismatchAcknowledged}
                onChange={(event) => {
                  setSharedMismatchAcknowledged(event.target.checked);
                  setError(null);
                }}
              />
              <span>I confirmed the matched Kura patient is not the person being tested.</span>
            </label>
          )}
          {error && <p className="lc-field-error">{error}</p>}
          <Button fullWidth size="lg" onClick={submitProvisional}>
            Check &amp; continue
          </Button>
        </div>
      </>
    );
  }

  return (
    <div className="lc-modal-backdrop" role="presentation">
      <section className="lc-order-gate-phone" role="dialog" aria-modal="true" aria-labelledby="lc-order-gate-title">
        {step === "phone" && closeButton}
        <div className={cx("lc-phone-gate-card", `is-${step}`)} data-figma-node={cardNodeId}>
          {gateBody}
        </div>
        {responsibilityPanel}
      </section>
    </div>
  );
}

function SuggestTestModal({
  initialName,
  onClose,
}: {
  initialName: string;
  onClose: () => void;
}) {
  const [testName, setTestName] = useState(initialName);
  const [specimen, setSpecimen] = useState("unknown");
  const [urgency, setUrgency] = useState("within-month");
  const [volume, setVolume] = useState("6-20");
  const [reason, setReason] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!testName.trim()) {
      setError("Enter the test name so lab ops can triage the request.");
      return;
    }
    setError(null);
    setSubmitted(true);
  };

  return (
    <div className="lc-modal-backdrop" role="presentation">
      <section className="lc-modal" role="dialog" aria-modal="true" aria-labelledby="lc-suggest-title">
        <button className="lc-modal-close" type="button" aria-label="Close request form" onClick={onClose}>
          <Close size={16} variant="stroke" />
        </button>
        {submitted ? (
          <div className="lc-suggest-success">
            <CheckCircle size={28} variant="bulk" />
            <h2 id="lc-suggest-title">Request added to lab ops review</h2>
            <p>
              {testName.trim()} will be reviewed in the weekly assay backlog. Kura will notify the clinic if a vendor is already being qualified.
            </p>
            <Button onClick={onClose}>Done</Button>
          </div>
        ) : (
          <form onSubmit={submit}>
            <div className="lc-modal-head">
              <span className="lc-eyebrow">Doctor demand → lab ops backlog</span>
              <h2 id="lc-suggest-title">Suggest a missing test</h2>
            </div>
            <Input
              label="Test name"
              required
              value={testName}
              error={error}
              onChange={(event) => setTestName(event.target.value)}
              placeholder="e.g. Anti-CCP antibody"
            />
            <Select label="Specimen, if known" value={specimen} onChange={(event) => setSpecimen(event.target.value)}>
              <option value="unknown">Not sure</option>
              <option value="blood">Blood</option>
              <option value="urine">Urine</option>
              <option value="swab">Swab</option>
              <option value="saliva">Saliva</option>
            </Select>
            <Select label="Urgency" value={urgency} onChange={(event) => setUrgency(event.target.value)}>
              <option value="asap">ASAP - blocking patient care now</option>
              <option value="within-month">Within 1 month</option>
              <option value="nice">Nice to have</option>
            </Select>
            <Select label="Expected volume" value={volume} onChange={(event) => setVolume(event.target.value)}>
              <option value="1-5">1-5 per month</option>
              <option value="6-20">6-20 per month</option>
              <option value="20-plus">20+ per month</option>
            </Select>
            <Textarea
              label="Reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Clinical use case or patient cohort"
            />
            <div className="lc-modal-actions">
              <Button intent="ghost" onClick={onClose}>Cancel</Button>
              <Button type="submit">Submit request</Button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}

export function LabCatalogWorkspace({
  searchIntent = null,
  onSearchIntentHandled,
  initialPatient = null,
  initialCartIds = [],
}: LabCatalogWorkspaceProps) {
  const [query, setQuery] = useState(searchIntent?.query ?? "");
  const [activeFilters, setActiveFilters] = useState<Set<CatalogFilterId>>(new Set());
  const [activeSpecimens, setActiveSpecimens] = useState<Set<OrderSpecimenId>>(new Set());
  const [collapsedSections, setCollapsedSections] = useState<Set<OrderCategoryId>>(new Set());
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [identityModalOpen, setIdentityModalOpen] = useState(false);
  const [placedBooking, setPlacedBooking] = useState<PlacedOrderSummary | null>(null);
  const [highlightedItemId, setHighlightedItemId] = useState<string | null>(searchIntent?.itemId ?? null);
  /* A patient handed in from a chart starts already-attached as a confirmed
     known patient; the catalog onramp starts with none and resolves via the
     identity gate. */
  const initialDecision = seedKnownDecision(initialPatient);
  const [attachedPatient, setAttachedPatient] = useState<BookingPatient | null>(initialPatient);
  const [identityDecision, setIdentityDecision] = useState<DoctorIdentityDecision | null>(initialDecision);
  const [pscPay, setPscPay] = useState<PscPayChoice>("later");
  const [cashCollected, setCashCollected] = useState(false);
  const initialCartKey = initialCartIds.join("|");
  const seededInitialCartRef = useRef("");
  const initialPatientRef = useRef(initialPatient?.id ?? null);
  const {
    clearDraft,
    lines: cartLines,
    removeLine,
    selectedIds,
    toggleCatalogItem,
    originateDoctorBooking,
  } = useOrderDraft();
  const { favoriteIdSet, favoriteItems, toggleFavorite } = useFavoriteOrderItems();

  /* Resync when the host swaps in a different chart patient. */
  useEffect(() => {
    const nextId = initialPatient?.id ?? null;
    if (initialPatientRef.current === nextId) return;
    initialPatientRef.current = nextId;
    setAttachedPatient(initialPatient);
    setIdentityDecision(seedKnownDecision(initialPatient));
    setPlacedBooking(null);
  }, [initialPatient]);

  useEffect(() => {
    if (!initialCartKey || seededInitialCartRef.current === initialCartKey) return;
    for (const id of initialCartKey.split("|").filter(Boolean)) {
      if (!selectedIds.has(id)) {
        toggleCatalogItem(id, "catalog-standalone");
      }
    }
    seededInitialCartRef.current = initialCartKey;
  }, [initialCartKey, selectedIds, toggleCatalogItem]);

  useEffect(() => {
    if (!highlightedItemId) return;
    const timer = window.setTimeout(() => {
      document
        .getElementById(`lab-catalog-item-${highlightedItemId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 80);
    const clearTimer = window.setTimeout(() => {
      setHighlightedItemId(null);
      onSearchIntentHandled?.();
    }, 2200);
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(clearTimer);
    };
  }, [highlightedItemId, onSearchIntentHandled]);

  /* Relevance lines are honest only for the demo patient (the one with a backing
     lab history). Any other attached patient gets the generic, no-context view. */
  const patientAware = attachedPatient?.id === ACTIVE_PATIENT_ID;
  const itemCtx = useMemo(() => (patientAware ? getItemLabContexts() : new Map<string, ItemLabContext>()), [patientAware]);

  const cartIdSet = selectedIds;

  const activeCategoryFilters = useMemo(
    () => orderCategories.filter((cat) => activeFilters.has(cat.id)).map((cat) => cat.id),
    [activeFilters],
  );
  const hasCategoryFilter = activeCategoryFilters.length > 0;
  const favoritesOnly = activeFilters.has("favorites");
  const bundlesOnly = !favoritesOnly && activeFilters.has("bundles") && !hasCategoryFilter;
  const showBundles = !favoritesOnly && (activeFilters.size === 0 || activeFilters.has("bundles") || activeFilters.has("all"));
  const showSuggested = !bundlesOnly;

  const categoryOptionCount = (id: CatalogFilterId) => {
    if (id === "all") return orderItems.length + orderBundles.length;
    if (id === "favorites") return favoriteItems.length;
    if (id === "bundles") return orderBundles.length;
    return orderItems.filter((item) => item.categoryId === id).length;
  };

  const visibleItems = useMemo(
    () => {
      if (bundlesOnly) return [];
      return orderItems.filter((item) => {
        const matchesCategory =
          !hasCategoryFilter || activeCategoryFilters.includes(item.categoryId) || activeFilters.has("all");
        const matchesFavorite = !favoritesOnly || favoriteIdSet.has(item.id);
        return matchesFavorite && matchesCategory && matchesSpecimens(item.specimens, activeSpecimens) && itemMatchesQuery(item, query);
      });
    },
    [activeCategoryFilters, activeFilters, activeSpecimens, bundlesOnly, favoriteIdSet, favoritesOnly, hasCategoryFilter, query],
  );

  const visibleBundles = useMemo(
    () =>
      showBundles
        ? orderBundles.filter(
            (bundle) => matchesSpecimens(bundle.specimenIds, activeSpecimens) && bundleMatchesQuery(bundle, query),
          )
        : [],
    [activeSpecimens, query, showBundles],
  );
  const showCatalogGrid = !bundlesOnly || visibleBundles.length === 0;

  const toggleFilter = (id: CatalogFilterId) => {
    setActiveFilters((current) => {
      if (id === "all") return new Set();
      if (id === "favorites") return current.has("favorites") ? new Set() : new Set(["favorites"]);
      const next = toggleSetValue(current, id);
      next.delete("all");
      next.delete("favorites");
      return next;
    });
  };

  const clearAllFilters = () => {
    setActiveFilters(new Set());
    setActiveSpecimens(new Set());
    setQuery("");
  };

  const toggleCart = (id: string) => {
    setPlacedBooking(null);
    toggleCatalogItem(id, "catalog-standalone");
  };

  const removeCartLine = (id: string) => {
    setPlacedBooking(null);
    removeLine(id);
  };

  const clearOrderDraft = () => {
    setPlacedBooking(null);
    setIdentityModalOpen(false);
    clearDraft();
    /* keep a chart-provided patient; drop a gate-resolved one */
    setAttachedPatient(initialPatient);
    setIdentityDecision(seedKnownDecision(initialPatient));
    setPscPay("later");
    setCashCollected(false);
  };

  /* The identity gate resolves WHO the patient is and hands it back here. The
     booking code is sent later, from the rail, after the doctor reviews tests. */
  const handleAttachPatient = (patient: BookingPatient, decision: DoctorIdentityDecision) => {
    setAttachedPatient(patient);
    setIdentityDecision(decision);
    setPlacedBooking(null);
    setCashCollected(false);
    setIdentityModalOpen(false);
  };

  const sendBookingCode = () => {
    if (!attachedPatient || !identityDecision) return;
    const itemIds = cartLines.map((line) => line.itemId).filter((id): id is string => !!id);
    if (!itemIds.length) return;
    const result = originateDoctorBooking({
      patientId: attachedPatient.id,
      patient: attachedPatient,
      itemIds,
      pscPay,
      patientAssurance: assuranceForDecision(identityDecision.kind),
      identityDecision,
    });
    if (result) setPlacedBooking(result);
  };

  const handlePscPay = (choice: PscPayChoice) => {
    setPscPay(choice);
    if (choice !== "cash") setCashCollected(false);
  };

  const toggleSection = (id: OrderCategoryId) => {
    setCollapsedSections((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const emptyTitle = favoritesOnly
    ? favoriteItems.length > 0
      ? "No favorites match these filters"
      : "No favorite tests yet"
    : bundlesOnly
      ? `No bundles match${query ? ` "${query}"` : ""}`
    : `No tests match${query ? ` "${query}"` : ""}`;
  const emptyHelp = favoritesOnly
    ? favoriteItems.length > 0
      ? "Try clearing specimen filters or search."
      : "Use the favorite action on any test to pin it here."
    : bundlesOnly
      ? "Try clearing specimen filters or search."
    : "Try a broader search or submit a missing-test request.";

  return (
    <section className="lab-catalog has-cart" aria-label="Master lab order">
      <aside className="orders-filter-sidebar lab-catalog-filters" aria-label="Catalog filters">
        <div className="orders-filter-group">
          <div className="orders-filter-heading">
            <span>Shortcuts</span>
            <button onClick={clearAllFilters} type="button">
              Clear
            </button>
          </div>
          <div className="orders-filter-list">
            <CatalogFilterOption
              checked={activeFilters.has("favorites")}
              count={categoryOptionCount("favorites")}
              label="Favorites"
              onChange={() => toggleFilter("favorites")}
            />
          </div>
        </div>
        <div className="orders-filter-divider" />
        <div className="orders-filter-group">
          <div className="orders-filter-heading">
            <span>Categories</span>
          </div>
          <div className="orders-filter-list">
            <CatalogFilterOption
              checked={activeFilters.size === 0}
              count={categoryOptionCount("all")}
              label="All"
              onChange={() => toggleFilter("all")}
            />
            <CatalogFilterOption
              checked={activeFilters.has("bundles")}
              count={categoryOptionCount("bundles")}
              label="Bundles"
              onChange={() => toggleFilter("bundles")}
            />
            {orderCategories.map((cat) => (
              <CatalogFilterOption
                checked={activeFilters.has(cat.id)}
                count={categoryOptionCount(cat.id)}
                key={cat.id}
                label={cat.label}
                onChange={() => toggleFilter(cat.id)}
              />
            ))}
          </div>
        </div>
        <div className="orders-filter-divider" />
        <div className="orders-filter-group">
          <div className="orders-filter-heading">
            <span>Specimen</span>
          </div>
          <div className="orders-filter-list">
            {specimenFilters.map((specimen) => (
              <CatalogFilterOption
                checked={activeSpecimens.has(specimen.id)}
                count={orderItems.filter((item) => item.specimens.includes(specimen.id)).length}
                key={specimen.id}
                label={specimen.label}
                onChange={() => setActiveSpecimens((current) => toggleSetValue(current, specimen.id))}
              />
            ))}
          </div>
        </div>
      </aside>

      <div className="lab-catalog-main">
        <div className="lc-search-panel">
          <Search
            density="large"
            placeholder="Search tests, panels, or keywords…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onClear={() => setQuery("")}
          />
        </div>

        <div className="lc-accelerator-strip" aria-label="Catalog accelerators">
          {showSuggested && (
            <SuggestedCard
              patient={attachedPatient}
              patientAware={patientAware}
              cartIds={cartIdSet}
              itemCtx={itemCtx}
              onToggleCart={toggleCart}
            />
          )}
          {visibleBundles.length > 0 && (
            <BundlesCard
              bundles={visibleBundles}
              cartIds={cartIdSet}
              onToggleBundle={toggleCart}
            />
          )}
        </div>

        {showCatalogGrid && (
          <section className="lc-catalog-grid" aria-label="Catalog tests">
            <div className="lc-grid-head">
              <span>
                {bundlesOnly
                  ? `${visibleBundles.length} bundle${visibleBundles.length === 1 ? "" : "s"}${query ? ` matching "${query}"` : ""}`
                  : `${visibleItems.length} test${visibleItems.length === 1 ? "" : "s"}${query ? ` matching "${query}"` : ""}`}
              </span>
              <span className="lc-grid-note"><Sparkles size={12} /> Prices USD · KHR estimate shown</span>
            </div>
            {visibleItems.length ? (
              <div className="orders-catalog-sections">
                {orderCategories.map((cat) => {
                  const items = visibleItems.filter((item) => item.categoryId === cat.id);
                  if (!items.length) return null;
                  return (
                    <CatalogSection
                      key={cat.id}
                      title={cat.label}
                      items={items}
                      cartIds={cartIdSet}
                      collapsed={collapsedSections.has(cat.id)}
                      favoriteIds={favoriteIdSet}
                      highlightedItemId={highlightedItemId}
                      patientAware={patientAware}
                      onToggle={() => toggleSection(cat.id)}
                      onToggleFavorite={toggleFavorite}
                      onToggleItem={toggleCart}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="lc-empty">
                <Flask size={24} variant="bulk" />
                <strong>{emptyTitle}</strong>
                <span>{emptyHelp}</span>
                <Button onClick={() => setSuggestOpen(true)} leadingIcon={<Plus size={13} />}>
                  Suggest a missing test
                </Button>
              </div>
            )}
          </section>
        )}

        {visibleItems.length > 0 && (
          <section className="lc-request-strip">
            <div>
              <strong>Test you need is not here?</strong>
              <span>Submit demand to lab ops with urgency and expected monthly volume.</span>
            </div>
            <Button intent="outline" size="sm" onClick={() => setSuggestOpen(true)} leadingIcon={<Plus size={12} />}>
              Suggest a test
            </Button>
          </section>
        )}
      </div>

      <div aria-hidden className="lab-catalog-rail-divider" />

      <OrderCart
        lines={cartLines}
        patient={attachedPatient}
        identityDecision={identityDecision}
        placedBooking={placedBooking}
        pscPay={pscPay}
        cashCollected={cashCollected}
        onClear={clearOrderDraft}
        onBeginOrder={() => setIdentityModalOpen(true)}
        onChangePatient={() => setIdentityModalOpen(true)}
        onPscPay={handlePscPay}
        onCashCollected={setCashCollected}
        onSend={sendBookingCode}
        onRemove={removeCartLine}
      />

      {identityModalOpen && (
        <OrderIdentityModal
          initialPatient={attachedPatient}
          onClose={() => setIdentityModalOpen(false)}
          onAttach={handleAttachPatient}
        />
      )}

      {suggestOpen && <SuggestTestModal initialName={query} onClose={() => setSuggestOpen(false)} />}
    </section>
  );
}
