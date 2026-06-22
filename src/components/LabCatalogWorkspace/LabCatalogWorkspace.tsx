"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent, ReactNode } from "react";
import { BorderBeam } from "border-beam";
import {
  Avatar,
  Button,
  Checkbox,
  Counter,
  IconButton,
  Input,
  OtpInput,
  PhoneInput,
  Search,
  Select,
  SegmentedToggle,
  Textarea,
  Tooltip,
  toast,
  CarePlanDestinationPicker,
  SmartSuggestionRow,
} from "@/components/ui";
import { useCarePlans, OPEN_STATUSES } from "@/components/CarePlan/carePlanModel";
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
} from "@/icons";
import {
  ACTIVE_PATIENT_ID,
  NEAREST_PSC,
  PATIENT_PHONE_MASKED,
  SWEEP_WINDOW,
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
  flyToCart,
  OrderDraftDock,
  TubePrepPanel,
  tubesForLines,
  useOrderDraft,
  detectQuickSetSuggestion,
} from "@/components/OrderDraft";
import type { QuickSetSuggestion } from "@/components/OrderDraft";
import { getBundleToneClassName } from "@/components/OrderDraft/bundleTone";
import { panelBiomarkerLabel, useFavoriteOrderItems } from "@/components/OrderDraft/favorites";
import { useUserBundles } from "@/components/OrderDraft/userBundles";
import type { UserBundle } from "@/components/OrderDraft/userBundles";
import { Edit as EditIcon, Delete as DeleteIcon } from "@/icons/components";
import type {
  DoctorIdentityDecision,
  DoctorPatientAssurance,
  ItemLabContext,
  OrderBundle,
  OrderCategoryId,
  OrderDraftLine,
  OrderFilterId,
  OrderItem,
  OrderRouteId,
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

function closeOnBackdropClick(event: ReactMouseEvent<HTMLElement>, onClose: () => void) {
  if (event.target === event.currentTarget) onClose();
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
  if (patient.relationship === "new") return "New patient · Phone checked";
  if (patient.relationship === "kura_known") return "Known patient · Phone checked";
  if (patient.identityTier === "phone_verified") return "Phone checked";
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
      code: "Order Set",
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
   then hand that identity decision back to the Order draft rail. The final send
   action lives on the rail, not in this modal. */
type OrderGateStep = "phone" | "otp" | "candidates" | "relationship" | "preflight" | "provisional";
type ProvisionalIdentityKind = Extract<
  DoctorIdentityDecision["kind"],
  "unknown-phone-provisional" | "shared-phone-provisional" | "guarantor-provisional"
>;
type PatientSex = NonNullable<BookingPatient["sex"]>;

const DEMO_YEAR = 2026;
const DEMO_OTP_CODE = "123456";
const PHONE_GATE_DEMO_CASES = [
  { label: "Known", value: "070 123 496" },
  { label: "Shared", value: "010 000 999" },
  { label: "Guardian", value: "012 777 088" },
  { label: "New", value: "099 111 222" },
  { label: "Duplicate", value: "Sokha Chann / 32 / Female" },
];
const PHONE_GATE_COUNTRIES = [{ iso: "KH", dial: "+855", name: "Cambodia", flag: "🇰🇭" }];
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

function isValidCambodiaPhone(raw: string) {
  const d = digitsOf(raw);
  const local = d.startsWith("855") ? d.slice(3) : d.replace(/^0+/, "");
  return local.length >= 8 && local.length <= 9;
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

function redactPatientName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "Patient";
  if (parts.length === 1) return `${parts[0][0] ?? "P"}•••`;
  return `${parts[0]} ${parts.slice(1).map((part) => `${part[0] ?? ""}.`).join(" ")}`;
}

function candidateIdentity(patient: BookingPatient) {
  const demographics = LOOKUP_DEMOGRAPHICS[patient.id];
  const mrnDigits = digitsOf(patient.mrn).slice(-2) || "—";
  return {
    name: redactPatientName(patient.name),
    mrn: `Kura record ••${mrnDigits}`,
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
            <BorderBeam
              key={entry.id}
              borderRadius={12}
              className="lc-suggest-beam"
              colorVariant={entry.tone === "danger" || entry.tone === "warning" ? "sunset" : "colorful"}
              duration={2.8}
              strength={0.82}
              theme="light"
            >
              <button
                type="button"
                className={cx("lc-suggest-chip", selected && "is-selected", `tone-${entry.tone}`)}
                aria-pressed={selected}
                aria-label={`${selected ? "Remove" : "Add"} ${entry.title}`}
                onClick={() => onToggleCart(entry.targetId)}
              >
                <LabToggleIndicator checked={selected} />
                <span className="lc-suggest-copy">
                  <strong>{entry.title}</strong>
                  <span className="lc-suggest-reason-row">
                    <small>{entry.sub}</small>
                    <TestIndicatorGroup flags={flags} />
                  </span>
                </span>
              </button>
            </BorderBeam>
          );
        })}
      </div>
    </section>
  );
}

/* Compact "X tests · A, B, C" line for a doctor-authored bundle, mirroring the
   static panel chip's tag summary. */
function userBundleSummary(bundle: UserBundle): string {
  const names = bundle.memberItemIds
    .map((id) => orderItemById.get(id)?.name)
    .filter((name): name is string => Boolean(name));
  const count = `${names.length} test${names.length === 1 ? "" : "s"}`;
  if (!names.length) return count;
  const shown = names.slice(0, 2).join(", ");
  const extra = names.length > 2 ? ` · +${names.length - 2}` : "";
  return `${count} · ${shown}${extra}`;
}

function MissingTestIllustration() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.6">
        <rect x="11" y="8" width="22" height="30" rx="6" />
        <path d="M17 17h10M17 23h7" opacity="0.66" />
        <circle cx="33" cy="32" r="8" fill="var(--color-surface)" />
        <path d="M33 28v8M29 32h8" />
      </g>
    </svg>
  );
}

function BundlesCard({
  userBundles,
  staticBundles,
  cartIds,
  isUserBundleActive,
  onToggleStatic,
  onToggleUserBundle,
  onNewBundle,
  onEditBundle,
}: {
  userBundles: UserBundle[];
  staticBundles: OrderBundle[];
  cartIds: ReadonlySet<string>;
  isUserBundleActive: (bundle: UserBundle) => boolean;
  onToggleStatic: (bundleId: string) => void;
  onToggleUserBundle: (bundle: UserBundle) => void;
  onNewBundle: () => void;
  onEditBundle: (bundle: UserBundle) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const total = userBundles.length + staticBundles.length;

  return (
    <section className="lc-lane lc-bundle-lane" aria-labelledby="lc-bundles-title">
      <div className="lc-lane-head">
        <div className="lc-lane-title">
          <h2 id="lc-bundles-title">Your Order Sets</h2>
          <Counter count={total} />
        </div>
        <div className="lc-lane-actions">
          <button
            type="button"
            className="lc-bundle-create"
            aria-label="Create new Order Set"
            onClick={onNewBundle}
          >
            <Plus size={14} variant="stroke" />
            <span>New Order Set</span>
          </button>
          <LabLaneControls label="Order Sets" trackRef={trackRef} />
        </div>
      </div>
      <div className="lc-bundle-row" ref={trackRef}>
        {/* Doctor-authored bundles first — each carries an inline edit affordance.
            Clicking the chip adds (or clears) every member test. */}
        {userBundles.map((bundle) => {
          const selected = isUserBundleActive(bundle);
          return (
            <div className="lc-bundle" key={bundle.id}>
              <button
                type="button"
                className={cx("lc-bundle-chip", "is-user", getBundleToneClassName(bundle.id), selected && "is-selected")}
                aria-pressed={selected}
                aria-label={`${selected ? "Remove" : "Add"} ${bundle.name} (${bundle.memberItemIds.length} tests)`}
                onClick={() => onToggleUserBundle(bundle)}
              >
                <LabToggleIndicator checked={selected} />
                <span className="lc-bundle-copy">
                  <strong>{bundle.name}</strong>
                  <small>{userBundleSummary(bundle)}</small>
                </span>
              </button>
              <IconButton
                aria-label={`Edit ${bundle.name}`}
                className="lc-bundle-edit"
                size="micro"
                variant="tertiary"
                icon={<EditIcon size={13} variant="stroke" />}
                onClick={() => onEditBundle(bundle)}
              />
            </div>
          );
        })}

        {staticBundles.map((bundle) => {
          const selected = cartIds.has(bundle.id);
          const sub = bundle.tags.join(", ").replace(", +", " · +");
          return (
            <button
              key={bundle.id}
              type="button"
              className={cx("lc-bundle-chip", getBundleToneClassName(bundle.id), selected && "is-selected")}
              aria-pressed={selected}
              aria-label={`${selected ? "Remove" : "Add"} ${bundle.name}`}
              onClick={() => onToggleStatic(bundle.id)}
            >
              <LabToggleIndicator checked={selected} />
              <span className="lc-bundle-copy">
                <strong>{bundle.name}</strong>
                <small>{sub}</small>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

/* ---- Dense catalog grid (shared shell with the in-chart Orders tab) -----
   A compact pick tile: checkbox · name · per-test signal flags (abnormal /
   repeat-due, patient-aware). Full test detail lives in the shared hover/focus
   popover, so the grid scans clean while the flags still warn at a glance. */
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
  const { open, dismiss, popoverProps, wrapperProps, triggerProps } = useHoverFocusPopover(`lc-tile:${item.id}`);
  const rowRef = useRef<HTMLDivElement>(null);
  const lastFavoritePointerToggleRef = useRef(0);
  const panelLabel = panelBiomarkerLabel(item);
  /* Per-test signal flags (abnormal value, repeat-due, etc.) — abnormal is
     patient-specific, so it only shows in a patient-aware context. */
  const flags = getItemFlags(item).filter((flag) => patientAware || flag.key !== "abnormal");

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

  const toggleSelection = () => {
    if (blocked) return;
    if (!checked) flyToCart(rowRef.current);
    onToggle();
    dismiss();
  };

  return (
    <div className={cx("orders-item lc-cat-item", checked && "is-selected")} ref={rowRef} {...wrapperProps}>
      <button
        aria-disabled={blocked || undefined}
        aria-label={blocked ? `${item.name} unavailable` : `${checked ? "Remove" : "Add"} ${item.name}`}
        aria-pressed={checked}
        className={cx(
          "orders-item-tile lc-cat-tile",
          checked && "is-selected",
          blocked && "is-unavailable",
          highlighted && "is-search-hit",
        )}
        id={`lab-catalog-item-${item.id}`}
        onClick={toggleSelection}
        type="button"
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
          anchorRef={rowRef}
          guardRef={rowRef}
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
const LC_FULFILLMENT_OPTIONS: Array<{ id: OrderRouteId; title: string; sub: string }> = [
  { id: "psc", title: "Send patient to PSC", sub: "Patient receives a booking code and goes to a Kura PSC for collection." },
  { id: "clinic", title: "Send tubes to Kura", sub: "Collect the sample in clinic, prepare the tubes, then send them to Kura." },
];

/* Short labels for the compact segmented controls — the full descriptive copy
   moves to a single caption under the active segment. */
const LC_ROUTE_SEG: Record<OrderRouteId, string> = {
  psc: "Patient → PSC",
  clinic: "Tubes → Kura",
};

type ClearedDraftSnapshot = {
  lines: OrderDraftLine[];
  patient: BookingPatient | null;
  identityDecision: DoctorIdentityDecision | null;
  route: OrderRouteId;
  pscPay: PscPayChoice;
};

function cloneDraftLines(lines: OrderDraftLine[]): OrderDraftLine[] {
  return lines.map((line) => ({
    ...line,
    labRefs: line.labRefs.map((ref) => ({ ...ref })),
  }));
}

function OrderCart({
  lines,
  patient,
  identityDecision,
  placedBooking,
  route,
  undoClear,
  carePlans,
  carePlanId,
  quickSet,
  onSetCarePlan,
  onSaveQuickSet,
  onDismissQuickSet,
  onNeverQuickSet,
  onClear,
  onUndoClear,
  onDismissUndo,
  onBeginOrder,
  onChangePatient,
  onRoute,
  onSend,
  onRemove,
}: {
  lines: OrderDraftLine[];
  patient: BookingPatient | null;
  identityDecision: DoctorIdentityDecision | null;
  placedBooking: PlacedOrderSummary | null;
  route: OrderRouteId;
  undoClear: { count: number } | null;
  carePlans: Array<{ id: string; title: string }>;
  carePlanId: string | null;
  quickSet: QuickSetSuggestion | null;
  onSetCarePlan: (planId: string | null) => void;
  onSaveQuickSet: (suggestion: QuickSetSuggestion) => void;
  onDismissQuickSet: () => void;
  onNeverQuickSet: () => void;
  onClear: () => void;
  onUndoClear: () => void;
  onDismissUndo: () => void;
  onBeginOrder: () => void;
  onChangePatient: () => void;
  onRoute: (route: OrderRouteId) => void;
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

  /* In-clinic draw: the "… · prepare tubes" CTA opens a label-and-scan step
     before the order actually commits — Bookings must never list a sample that
     doesn't physically exist yet. PSC route skips this (the patient is drawn at
     the collection point). Local scan state; confirming runs the normal send. */
  const isClinic = route === "clinic";
  const [tubePrep, setTubePrep] = useState(false);
  /* Persistent + collapsible: the cart can fold to a one-line "N tests selected"
     summary and expand in place — it never leaves the rail. Auto-expands while
     placing / tube-prep so those flows are always fully visible. */
  const [collapsed, setCollapsed] = useState(false);
  const [scannedTubes, setScannedTubes] = useState<Record<string, string>>({});
  const sampleSeqRef = useRef(0);
  const tubeSet = useMemo(() => tubesForLines(lines), [lines]);

  const scanTube = (tubeId: string) =>
    setScannedTubes((prev) => {
      if (prev[tubeId]) return prev;
      sampleSeqRef.current += 1;
      return { ...prev, [tubeId]: `26${String(1000000000 + sampleSeqRef.current * 7).slice(-10)}` };
    });
  const unscanTube = (tubeId: string) =>
    setScannedTubes((prev) => {
      if (!prev[tubeId]) return prev;
      const next = { ...prev };
      delete next[tubeId];
      return next;
    });

  /* Drop in-progress prep when the cart empties, places, or the route flips
     away from clinic — never re-open onto a stale tube set. */
  useEffect(() => {
    if (!tubePrep || (hasTests && !placedBooking && isClinic)) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setTubePrep(false);
      setScannedTubes({});
    });
    return () => {
      cancelled = true;
    };
  }, [tubePrep, hasTests, placedBooking, isClinic]);

  const patientLine = attached ? (
    <div className="lc-cart-patient">
      <span className={cx("lc-cart-patient-av", status.tone === "warn" && "is-warning")}>{initialsOf(patient!.name)}</span>
      <span className="lc-cart-patient-copy">
        <span className="lc-cart-patient-name">
          <strong>For {patient!.name}</strong>
          {status.tone === "ok" && (
            <CheckCircle aria-label={status.label} className="lc-cart-patient-check" size={14} variant="solid" />
          )}
        </span>
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
        <strong>Choose a patient</strong>
        <small>Needed before sending</small>
      </span>
    </div>
  ) : null;

  const undoClearBlock =
    !hasTests && undoClear ? (
      <section className="lc-cart-undo" role="status" aria-live="polite" aria-label="Cleared draft recovery">
        <span className="lc-cart-undo-copy">
          <strong>
            {undoClear.count} {undoClear.count === 1 ? "test" : "tests"} cleared
          </strong>
          <span>Restore if accidental.</span>
        </span>
        <span className="lc-cart-undo-actions">
          <button type="button" className="lc-cart-undo-action" onClick={onUndoClear}>
            Undo
          </button>
          <button type="button" className="lc-cart-undo-dismiss" aria-label="Dismiss undo" onClick={onDismissUndo}>
            <Close size={13} variant="stroke" />
          </button>
        </span>
      </section>
    ) : null;

  const testLines = hasTests ? (
    <section className="lc-cart-section">
      <ul className="lc-cart-lines">
        {entries.map((entry) => (
          <li key={entry.id} title={`${entry.code} · ${entry.meta}`}>
            <span className="lc-cart-line-copy">
              <strong>{entry.name}</strong>
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

  /* Care-plan destination: route the order into one of the patient's active
     care plans, or leave it standalone. Keep it as a compact selector in this
     rail; the cart title already owns patient context. */
  const carePlanBlock =
    hasTests && attached && !placedBooking && carePlans.length > 0 ? (
      <section className="lc-cart-section lc-cart-careplan" aria-label="Care plan destination">
        <CarePlanDestinationPicker
          plans={carePlans}
          value={carePlanId}
          onChange={onSetCarePlan}
        />
      </section>
    ) : null;

  /* Smart Order Set: a quiet, neutral nudge when the draft already covers a
     recognised frequent set. Save reuses the userBundles path; Dismiss/Never are
     handled by the workspace (Never is enforced after 2 dismisses). */
  const quickSetBlock =
    quickSet && hasTests && !placedBooking ? (
      <SmartSuggestionRow
        className="lc-cart-quickset"
        title={`Looks like your ${quickSet.title} set`}
        actionLabel="Save as Quick Set"
        onAction={() => onSaveQuickSet(quickSet)}
        onDismiss={onDismissQuickSet}
        onNever={onNeverQuickSet}
      />
    ) : null;

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

  const activeFulfillment = LC_FULFILLMENT_OPTIONS.find((option) => option.id === route);
  const fulfillmentBlock = hasTests && attached && !placedBooking ? (
    <section className="lc-cart-setup" aria-label="Fulfillment">
      {activeFulfillment && (
        <div className="lc-route-context">
          <span>Sample route</span>
          <p>{activeFulfillment.sub}</p>
        </div>
      )}
      <div className="lc-seg" role="radiogroup" aria-label="Fulfillment">
        {LC_FULFILLMENT_OPTIONS.map((option) => (
          <button
            type="button"
            key={option.id}
            className={cx("lc-seg-btn", route === option.id && "is-selected")}
            aria-checked={route === option.id}
            role="radio"
            onClick={() => onRoute(option.id)}
          >
            {LC_ROUTE_SEG[option.id]}
          </button>
        ))}
      </div>
    </section>
  ) : null;

  const placedProvisional = placedBooking?.patientAssurance === "provisional";
  const placedBlock = placedBooking ? (
    <section
      className={cx(
        "lc-cart-placed-receipt",
        placedProvisional && "is-warning",
      )}
      aria-label="Placed booking"
    >
      <div className="lc-cart-placed-status">
        <CheckCircle size={22} variant="bulk" />
        <span>Order placed</span>
      </div>

      <div className="lc-cart-ticket">
        {placedBooking.route === "psc" && placedBooking.bookingCode ? (
          <div className="lc-cart-ticket-code">
            <strong>{placedBooking.bookingCode}</strong>
            <span>{placedProvisional ? "PSC confirms identity first" : "Show at any Kura PSC"}</span>
          </div>
        ) : placedBooking.handoverCode ? (
          <div className="lc-cart-ticket-code">
            <strong>{placedBooking.handoverCode}</strong>
            <span>Read this code to the courier · ~30 min</span>
          </div>
        ) : (
          <div className="lc-cart-ticket-code">
            <strong className="lc-cart-ticket-code-sm">{placedBooking.sweep ?? SWEEP_WINDOW}</strong>
            <span>Next sweep — leave the tube bag at reception</span>
          </div>
        )}

        <div className="lc-cart-ticket-rows">
          {placedBooking.route === "psc" && (
            <>
              <div className="lc-cart-ticket-row">
                <span>Sent via</span>
                <span className="lc-cart-ticket-value">Telegram + SMS · {patient?.phoneMasked ?? PATIENT_PHONE_MASKED}</span>
              </div>
              <div className="lc-cart-ticket-row">
                <span>Nearest PSC</span>
                <span className="lc-cart-ticket-value">{NEAREST_PSC.replace("Kura PSC · ", "")} · open now</span>
              </div>
            </>
          )}
          <div className="lc-cart-ticket-row">
            <span>Order</span>
            <span className="lc-cart-ticket-value">
              {placedBooking.stat ? "STAT" : "Routine"} · {placedBooking.lines.length}{" "}
              {placedBooking.lines.length === 1 ? "item" : "items"} · {formatMoney(placedBooking.total)}
              {placedBooking.statFee > 0 ? ` (incl. ${formatMoney(placedBooking.statFee)} STAT)` : ""}
              {placedBooking.unpricedCount > 0 ? ` · +${placedBooking.unpricedCount} unpriced` : ""} ·{" "}
              <span className="lc-cart-ticket-ref">{placedBooking.code}</span>
            </span>
          </div>
        </div>
      </div>

      <Button className="lc-cart-placed-action" fullWidth intent="outline" onClick={onClear} size="md">
        Start new order
      </Button>
    </section>
  ) : null;

  const sendBlocked = !attached
    ? "Choose a patient first."
    : !hasTests
      ? "Add at least one test."
      : null;
  const ctaLabel = route === "psc" ? "Send booking code" : "Prepare tubes";
  /* Collapse only applies to the building cart (not placed, not tube-prep). */
  const canCollapse = hasTests && !placedBooking && !tubePrep;
  const isCollapsed = canCollapse && collapsed;
  const cartTitle = attached && patient ? `Order for ${patient.name}` : "Order draft";
  const visiblePatientLine = !attached || tubePrep ? patientLine : null;

  return (
    <aside className={cx("lc-cart lc-cart-rail", isCollapsed && "is-collapsed")} aria-label="Order cart">
      {/* Once placed, the receipt owns the header with its own "Order placed"
          status — the "Order draft" title would contradict it, so drop it. */}
      {!placedBooking && (
        <header className="lc-cart-head">
          <h2>{cartTitle}</h2>
          {hasTests && <span className="lc-cart-count">{entries.length}</span>}
          {hasTests && (
            <button type="button" className="lc-cart-clear" aria-label="Clear order draft" title="Clear order draft" onClick={onClear}>
              <DeleteIcon size={14} variant="stroke" />
            </button>
          )}
        </header>
      )}

      {isCollapsed ? (
        <button
          type="button"
          className="lc-cart-collapsed-summary"
          onClick={() => setCollapsed(false)}
          aria-label={`${entries.length} ${entries.length === 1 ? "test" : "tests"} selected — expand order draft`}
        >
          <span className="lc-cart-collapsed-copy">
            <Cart size={15} variant="bulk" aria-hidden="true" />
            <strong>
              {entries.length} {entries.length === 1 ? "test" : "tests"} selected
            </strong>
          </span>
          <span className="lc-cart-collapsed-total">{formatMoney(total)}</span>
        </button>
      ) : (
        <div className={cx("lc-cart-body", placedBooking && "is-placed is-revealed")}>
          {placedBooking ? (
            placedBlock
          ) : tubePrep ? (
            <div className="lc-cart-tubeprep">
              {patientLine}
              <TubePrepPanel
                tubes={tubeSet}
                scanned={scannedTubes}
                onScan={scanTube}
                onUnscan={unscanTube}
                onConfirm={onSend}
                onBack={() => {
                  setTubePrep(false);
                  setScannedTubes({});
                }}
              />
            </div>
          ) : (
            <>
              {visiblePatientLine}
              {undoClearBlock}
              {testLines}
              {carePlanBlock}
              {quickSetBlock}
            </>
          )}
        </div>
      )}

      {hasTests && !placedBooking && !tubePrep && !isCollapsed && (
        <footer className="lc-cart-footer">
          {fulfillmentBlock}
          {subtotalBlock}
          <div className="lc-cart-cta">
            {attached ? (
              <Button
                fullWidth
                disabled={!!sendBlocked}
                onClick={() => {
                  if (isClinic) setTubePrep(true);
                  else onSend();
                }}
              >
                {ctaLabel}
              </Button>
            ) : (
              <Button
                fullWidth
                leadingIcon={<Patient size={13} variant="stroke" />}
                onClick={onBeginOrder}
              >
                Choose patient
              </Button>
            )}
            {attached && !placedBooking && sendBlocked && <p className="lc-cart-helper">{sendBlocked}</p>}
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
    if (!isValidCambodiaPhone(phone)) {
      setError("Enter a valid Cambodia mobile number first.");
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

  const topbar = (onBack: () => void = resetToPhone, label = "Change phone") => (
    <div className="lc-phone-gate-topbar">
      <button type="button" className="lc-phone-gate-back" onClick={onBack}>
        <ChevronLeft size={20} variant="stroke" />
        <span>{label}</span>
      </button>
    </div>
  );

  const phoneReady = isValidCambodiaPhone(phone);
  const phoneInvalidHint = phone.trim() && !phoneReady ? "Enter 8-9 local digits after +855." : null;
  const phoneChecked = step !== "phone" && step !== "otp" && otpSent;
  const phoneContactLabel = phoneChecked ? maskOtpPhone(phone) : step === "otp" ? `${maskOtpPhone(phone)} · SMS sent` : "Not checked yet";
  const detailsComplete = Boolean(form.name.trim() && form.dobOrAge.trim() && form.sex);
  const needsMismatchConfirmation = provisionalKind === "shared-phone-provisional";
  const mismatchReady = !needsMismatchConfirmation || sharedMismatchAcknowledged;
  const canSubmitProvisional = detailsComplete && mismatchReady;
  const provisionalBlockReason = !detailsComplete
    ? "Add name, DOB or age, and sex before duplicate check."
    : needsMismatchConfirmation && !sharedMismatchAcknowledged
      ? "Confirm this is not the matched Kura patient."
      : null;

  const responsibilityPanel = (
    <aside className="lc-phone-gate-safety" aria-label="Identity readiness before sending">
      <div className="lc-phone-gate-safety-head">
        <span className="lc-phone-gate-safety-icon" aria-hidden="true">
          <Patient size={18} variant="stroke" />
        </span>
        <div>
          <span className="lc-eyebrow">Identity check</span>
          <h3>Before sending</h3>
        </div>
      </div>
      <p className="lc-phone-gate-safety-copy">
        Match the phone to the person being tested. SMS confirms the phone, not identity.
      </p>
      <div className="lc-phone-gate-review-card">
        <span>Phone check</span>
        <strong>{phoneContactLabel}</strong>
      </div>
      <ul className="lc-phone-gate-safety-list">
        <li>Choose the person being tested.</li>
        <li>Use provisional only if no record fits.</li>
        <li>PSC checks ID before collection.</li>
      </ul>
      <p className="lc-phone-gate-safety-note">Keeps the order on the right patient.</p>
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
          <h2 id="lc-order-gate-title">Choose patient</h2>
          <p>Use the phone of the patient, guardian, or guarantor who is with you now.</p>
        </div>
        <PhoneInput
          country={phoneCountry}
          number={phone}
          countries={PHONE_GATE_COUNTRIES}
          onCountryChange={() => setPhoneCountry("KH")}
          onNumberChange={(next) => {
            setPhone(next);
            setError(null);
          }}
          invalid={!!error}
        />
        {error && (
          <p className="lc-field-error" role="alert">
            {error}
          </p>
        )}
        {phoneInvalidHint && !error && <p className="lc-phone-gate-helper">{phoneInvalidHint}</p>}
        <Button fullWidth size="lg" disabled={!phoneReady} onClick={startPhoneVerification}>
          Send SMS code
        </Button>
        <div className="lc-demo-hint lc-phone-gate-demo-hint" aria-label="Prototype identity test cases">
          <div className="lc-phone-gate-demo-head">
            <strong>Prototype-only test cases</strong>
            <span>Demo OTP {DEMO_OTP_CODE}</span>
          </div>
          <div className="lc-phone-gate-demo-list">
            {PHONE_GATE_DEMO_CASES.map((demoCase) => (
              <span className="lc-phone-gate-demo-chip" key={demoCase.label}>
                <strong>{demoCase.label}</strong>
                <code>{demoCase.value}</code>
              </span>
            ))}
          </div>
        </div>
      </>
    );
  } else if (step === "otp") {
    gateBody = (
      <>
        {topbar()}
        <div className="lc-phone-gate-centered">
          <h2 id="lc-order-gate-title">Verify number</h2>
          <p>
            Enter the 6-digit SMS code read by the patient or phone holder at <strong>{otpPhoneLabel}</strong>.
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
        {error && (
          <p className="lc-field-error" role="alert">
            {error}
          </p>
        )}
        <Button fullWidth size="lg" disabled={!otpSent || otp.length < DEMO_OTP_CODE.length} onClick={() => verifyOtp()}>
          Verify code
        </Button>
        <p className="lc-phone-gate-footnote">
          Prototype OTP: <strong>{DEMO_OTP_CODE}</strong>
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
              const identity = candidateIdentity(singleCandidate);
              return (
                <>
                  <div className="lc-phone-gate-choice-list is-single">
                    {renderChoiceRow({
                      id: singleCandidate.id,
                      name: identity.name,
                      initials: initialsOf(singleCandidate.name),
                      meta: `${identity.sex} · ${identity.dob} · ${identity.mrn}`,
                      tone: "brand",
                      onChoose: () => confirmKnownPatient(singleCandidate),
                    })}
                  </div>
                  <Button className="lc-phone-gate-secondary" fullWidth size="lg" onClick={() => beginProvisional("shared-phone-provisional")}>
                    None of these, add provisional patient
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
                const identity = candidateIdentity(candidate);
                return renderChoiceRow({
                  id: candidate.id,
                  name: identity.name,
                  initials: initialsOf(candidate.name),
                  meta: `${identity.sex} · ${identity.dob} · ${identity.mrn}`,
                  tone: "brand",
                  onChoose: () => confirmKnownPatient(candidate),
                });
              })}
            </div>
            <Button className="lc-phone-gate-secondary" fullWidth size="lg" onClick={() => beginProvisional("shared-phone-provisional")}>
              None of these, add provisional patient
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
              name: redactPatientName(member.name),
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
          None of these, add provisional patient
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
            const identity = candidateIdentity(candidate);
            return renderChoiceRow({
              id: candidate.id,
              name: identity.name,
              initials: initialsOf(candidate.name),
              meta: `${identity.sex} · ${identity.dob} · ${identity.mrn}`,
              tone: "brand",
              chooseLabel: "Use this",
              onChoose: () => confirmKnownPatient(candidate),
            });
          })}
        </div>
        <Button className="lc-phone-gate-secondary" fullWidth size="lg" onClick={attachProvisional}>
          Create provisional patient anyway
        </Button>
      </>
    );
  } else {
    const sharedPhone = provisionalKind === "shared-phone-provisional";
    const guarantorChild = provisionalKind === "guarantor-provisional";
    const noteTitle = sharedPhone
      ? "This looks like a different patient"
      : guarantorChild
        ? "Add dependent"
        : "No Kura match for this phone";
    const noteBody = sharedPhone
      ? "This phone belongs to another Kura patient. Confirm this is a different person."
      : guarantorChild
        ? "Add the patient details. Kura will check for duplicates."
        : "Add the person taking these tests. Kura will check for possible duplicates before attaching them to the order.";

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
              countries={PHONE_GATE_COUNTRIES}
              onCountryChange={() => setPhoneCountry("KH")}
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
              required
              value={form.name}
              onChange={(event) => {
                setForm((current) => ({ ...current, name: event.target.value }));
                setError(null);
              }}
              placeholder="Patient name"
            />
            <Input
              label="DOB or age"
              required
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
          {error && (
            <p className="lc-field-error" role="alert">
              {error}
            </p>
          )}
          <Button fullWidth size="lg" disabled={!canSubmitProvisional} onClick={submitProvisional}>
            Check for existing patient
          </Button>
          {provisionalBlockReason && <p className="lc-phone-gate-helper">{provisionalBlockReason}</p>}
        </div>
      </>
    );
  }

  return (
    <div className="lc-modal-backdrop" role="presentation">
      <section className="lc-order-gate-phone" role="dialog" aria-modal="true" aria-labelledby="lc-order-gate-title">
        {closeButton}
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
    <div className="lc-modal-backdrop" role="presentation" onClick={(event) => closeOnBackdropClick(event, onClose)}>
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

/* Build or edit a doctor-authored bundle: name + a searchable, category-grouped
   multi-select of catalog tests. A bundle is a saved shortcut — saving stores
   member ids; applying it later adds those tests to the cart individually. */
function BundleBuilderModal({
  mode,
  initial,
  seedMemberIds,
  onClose,
  onSave,
  onDelete,
}: {
  mode: "create" | "edit";
  initial?: UserBundle;
  seedMemberIds: string[];
  onClose: () => void;
  onSave: (name: string, memberItemIds: string[]) => void;
  onDelete?: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [selected, setSelected] = useState<Set<string>>(() => new Set(initial?.memberItemIds ?? []));
  const [pickQuery, setPickQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  const filteredCategories = useMemo(
    () =>
      orderCategories
        .map((cat) => ({
          cat,
          items: orderItems.filter(
            (item) => item.categoryId === cat.id && itemMatchesQuery(item, pickQuery),
          ),
        }))
        .filter((group) => group.items.length > 0),
    [pickQuery],
  );

  const seedNotYetIn = seedMemberIds.filter((id) => orderItemById.has(id) && !selected.has(id));

  const toggleMember = (id: string) => {
    setError(null);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const useCart = () => {
    setError(null);
    setSelected((prev) => {
      const next = new Set(prev);
      seedMemberIds.forEach((id) => {
        if (orderItemById.has(id)) next.add(id);
      });
      return next;
    });
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim()) {
      setError("Name the Order Set so it's easy to reuse.");
      return;
    }
    if (selected.size === 0) {
      setError("Pick at least one test for the Order Set.");
      return;
    }
    /* persist in stable catalog order, not pick order */
    onSave(name.trim(), orderItems.filter((item) => selected.has(item.id)).map((item) => item.id));
  };

  return (
    <div className="lc-modal-backdrop" role="presentation" onClick={(event) => closeOnBackdropClick(event, onClose)}>
      <section className="lc-modal lc-bundle-modal" role="dialog" aria-modal="true" aria-labelledby="lc-bundle-title">
        <button className="lc-modal-close" type="button" aria-label="Close Order Set builder" onClick={onClose}>
          <Close size={16} variant="stroke" />
        </button>
        <form onSubmit={submit}>
          <div className="lc-modal-head">
            <h2 id="lc-bundle-title">{mode === "edit" ? "Edit Order Set" : "Create new Order Set"}</h2>
          </div>

          <Input
            label="Order Set name"
            required
            value={name}
            error={error && !name.trim() ? error : null}
            onChange={(event) => {
              setName(event.target.value);
              setError(null);
            }}
            placeholder="e.g. Diabetes review"
          />

          <div className="lc-bundle-picker-head">
            <span className="lc-bundle-picker-label">Tests</span>
            <span className="lc-bundle-picker-count">
              {selected.size} selected
              {seedNotYetIn.length > 0 && (
                <button type="button" className="lc-bundle-usecart" onClick={useCart}>
                  Add cart ({seedNotYetIn.length})
                </button>
              )}
            </span>
          </div>

          <Search
            placeholder="Search tests…"
            value={pickQuery}
            onChange={(event) => setPickQuery(event.target.value)}
            onClear={() => setPickQuery("")}
          />

          <div className="lc-bundle-picker" role="group" aria-label="Catalog tests">
            {filteredCategories.length === 0 ? (
              <p className="lc-bundle-picker-empty">No tests match “{pickQuery}”.</p>
            ) : (
              filteredCategories.map(({ cat, items }) => (
                <div className="lc-bundle-picker-group" key={cat.id}>
                  <span className="lc-bundle-picker-cat">{cat.label}</span>
                  {items.map((item) => (
                    <Checkbox
                      key={item.id}
                      checked={selected.has(item.id)}
                      onChange={() => toggleMember(item.id)}
                      label={item.name}
                    />
                  ))}
                </div>
              ))
            )}
          </div>

          {error && selected.size === 0 && name.trim() ? (
            <p className="lc-bundle-error">{error}</p>
          ) : null}

          <div className="lc-modal-actions lc-bundle-actions">
            {mode === "edit" && onDelete ? (
              <Button intent="destructive" onClick={onDelete} leadingIcon={<DeleteIcon size={14} variant="stroke" />}>
                Delete
              </Button>
            ) : null}
            <span className="lc-bundle-actions-spacer" />
            <Button intent="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={!name.trim() || selected.size === 0}>
              {mode === "edit" ? "Save Order Set" : "Create Order Set"}
            </Button>
          </div>
        </form>
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
  const [bundleEditor, setBundleEditor] = useState<{ mode: "create" | "edit"; bundle?: UserBundle } | null>(null);
  const [identityModalOpen, setIdentityModalOpen] = useState(false);
  const [placedBooking, setPlacedBooking] = useState<PlacedOrderSummary | null>(null);
  const [clearedDraft, setClearedDraft] = useState<ClearedDraftSnapshot | null>(null);
  const [highlightedItemId, setHighlightedItemId] = useState<string | null>(searchIntent?.itemId ?? null);
  /* A patient handed in from a chart starts already-attached as a confirmed
     known patient; the catalog onramp starts with none and resolves via the
     identity gate. */
  const initialDecision = seedKnownDecision(initialPatient);
  const [attachedPatient, setAttachedPatient] = useState<BookingPatient | null>(initialPatient);
  const [identityDecision, setIdentityDecision] = useState<DoctorIdentityDecision | null>(initialDecision);
  const [route, setRoute] = useState<OrderRouteId>("psc");
  const [pscPay, setPscPay] = useState<PscPayChoice>("later");
  const initialCartKey = initialCartIds.join("|");
  const seededInitialCartRef = useRef("");
  const initialPatientRef = useRef(initialPatient?.id ?? null);
  const {
    clearDraft,
    draft,
    lines: cartLines,
    removeLine,
    restoreLines,
    selectedIds,
    toggleCatalogItem,
    originateDoctorBooking,
    setCarePlanDestination,
  } = useOrderDraft();
  const { favoriteIdSet, favoriteItems, toggleFavorite } = useFavoriteOrderItems();
  const { bundles: userBundles, createBundle, updateBundle, removeBundle } = useUserBundles();
  /* Active care plans the order can be routed into. */
  const { plans: carePlanList } = useCarePlans(attachedPatient?.id ?? "");
  const activeCarePlans = useMemo(
    () =>
      carePlanList
        .filter((plan) => OPEN_STATUSES.includes(plan.status))
        .map((plan) => ({ id: plan.id, title: plan.title })),
    [carePlanList],
  );
  /* Smart Order Set suppression: count dismisses per set id; hide a set after 2
     dismisses or an explicit Never. Re-running detection against saved bundles
     also hides any set the doctor already saved. */
  const [quickSetDismissals, setQuickSetDismissals] = useState<Record<string, number>>({});
  const [quickSetNever, setQuickSetNever] = useState<Set<string>>(new Set());
  const quickSetSuggestion = useMemo(() => {
    const detected = detectQuickSetSuggestion(cartLines, userBundles);
    if (!detected) return null;
    if (quickSetNever.has(detected.id)) return null;
    if ((quickSetDismissals[detected.id] ?? 0) >= 2) return null;
    return detected;
  }, [cartLines, userBundles, quickSetDismissals, quickSetNever]);

  /* Resync when the host swaps in a different chart patient. */
  useEffect(() => {
    const nextId = initialPatient?.id ?? null;
    if (initialPatientRef.current === nextId) return;
    initialPatientRef.current = nextId;
    setAttachedPatient(initialPatient);
    setIdentityDecision(seedKnownDecision(initialPatient));
    setPlacedBooking(null);
    setClearedDraft(null);
    setRoute("psc");
    setPscPay("later");
  }, [initialPatient]);

  useEffect(() => {
    if (!initialCartKey || seededInitialCartRef.current === initialCartKey) return;
    setClearedDraft(null);
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
    if (id === "all") return orderItems.length + orderBundles.length + userBundles.length;
    if (id === "favorites") return favoriteItems.length;
    if (id === "bundles") return orderBundles.length + userBundles.length;
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
  const visibleUserBundles = useMemo(() => {
    if (!showBundles) return [];
    const q = query.trim().toLowerCase();
    if (!q) return userBundles;
    return userBundles.filter(
      (bundle) =>
        bundle.name.toLowerCase().includes(q) ||
        bundle.memberItemIds.some((id) => orderItemById.get(id)?.name.toLowerCase().includes(q)),
    );
  }, [showBundles, userBundles, query]);
  const showCatalogGrid = !bundlesOnly || visibleBundles.length + visibleUserBundles.length === 0;

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
    setClearedDraft(null);
    toggleCatalogItem(id, "catalog-standalone");
  };

  /* A doctor bundle is "active" when every member test is already in the cart;
     clicking then clears them all, otherwise it adds the missing ones. */
  const isUserBundleActive = (bundle: UserBundle) => {
    const valid = bundle.memberItemIds.filter((id) => orderItemById.has(id));
    return valid.length > 0 && valid.every((id) => cartIdSet.has(id));
  };

  const toggleUserBundle = (bundle: UserBundle) => {
    setPlacedBooking(null);
    setClearedDraft(null);
    const valid = bundle.memberItemIds.filter((id) => orderItemById.has(id));
    const allIn = valid.length > 0 && valid.every((id) => cartIdSet.has(id));
    valid.forEach((id) => {
      const inCart = cartIdSet.has(id);
      if (allIn ? inCart : !inCart) toggleCatalogItem(id, "catalog-standalone");
    });
  };

  const saveBundle = (name: string, memberItemIds: string[]) => {
    if (bundleEditor?.mode === "edit" && bundleEditor.bundle) {
      updateBundle(bundleEditor.bundle.id, { name, memberItemIds });
    } else {
      createBundle(name, memberItemIds);
      toast.success("Order Set created", {
        description: `${memberItemIds.length} test${memberItemIds.length === 1 ? "" : "s"} saved to Your Order Sets.`,
        position: "top-right",
      });
    }
    setBundleEditor(null);
  };

  const deleteBundle = () => {
    if (bundleEditor?.mode === "edit" && bundleEditor.bundle) removeBundle(bundleEditor.bundle.id);
    setBundleEditor(null);
  };

  const removeCartLine = (id: string) => {
    setPlacedBooking(null);
    setClearedDraft(null);
    removeLine(id);
  };

  const clearOrderDraft = () => {
    setClearedDraft(
      cartLines.length > 0 && !placedBooking
        ? {
            lines: cloneDraftLines(cartLines),
            patient: attachedPatient,
            identityDecision,
            route,
            pscPay,
          }
        : null,
    );
    setPlacedBooking(null);
    setIdentityModalOpen(false);
    clearDraft();
    /* keep a chart-provided patient; drop a gate-resolved one */
    setAttachedPatient(initialPatient);
    setIdentityDecision(seedKnownDecision(initialPatient));
    setRoute("psc");
    setPscPay("later");
  };

  const restoreClearedDraft = () => {
    if (!clearedDraft) return;
    setPlacedBooking(null);
    setIdentityModalOpen(false);
    restoreLines(clearedDraft.lines);
    setAttachedPatient(clearedDraft.patient);
    setIdentityDecision(clearedDraft.identityDecision);
    setRoute(clearedDraft.route);
    setPscPay(clearedDraft.pscPay);
    setClearedDraft(null);
  };

  /* The identity gate resolves WHO the patient is and hands it back here. The
     booking code is sent later, from the rail, after the doctor reviews tests. */
  const handleAttachPatient = (patient: BookingPatient, decision: DoctorIdentityDecision) => {
    setAttachedPatient(patient);
    setIdentityDecision(decision);
    setPlacedBooking(null);
    setClearedDraft(null);
    setIdentityModalOpen(false);
  };

  /* Record (or clear) the care-plan destination on the active draft. We also
     keep the chosen title so the place toast + receipt can name it. */
  const handleSetCarePlan = (planId: string | null) => {
    if (planId === null) {
      setCarePlanDestination(null);
      return;
    }
    const title = activeCarePlans.find((plan) => plan.id === planId)?.title;
    setCarePlanDestination(planId, title);
  };

  const dismissQuickSet = (id: string) => {
    setQuickSetDismissals((current) => ({ ...current, [id]: (current[id] ?? 0) + 1 }));
  };
  const neverQuickSet = (id: string) => {
    setQuickSetNever((current) => {
      const next = new Set(current);
      next.add(id);
      return next;
    });
  };
  const saveQuickSet = (suggestion: QuickSetSuggestion) => {
    createBundle(suggestion.title, suggestion.itemIds);
    toast.success("Quick Set saved", {
      description: `${suggestion.title} · ${suggestion.itemIds.length} tests saved to Your Order Sets.`,
      position: "top-right",
    });
  };

  const sendBookingCode = () => {
    if (!attachedPatient || !identityDecision) return;
    const itemIds = cartLines.map((line) => line.itemId).filter((id): id is string => !!id);
    if (!itemIds.length) return;
    const carePlanTitle = draft.carePlanId
      ? activeCarePlans.find((plan) => plan.id === draft.carePlanId)?.title ?? draft.carePlanTitle
      : undefined;
    const result = originateDoctorBooking({
      patientId: attachedPatient.id,
      patient: attachedPatient,
      itemIds,
      route,
      pscPay,
      patientAssurance: assuranceForDecision(identityDecision.kind),
      identityDecision,
      carePlanId: draft.carePlanId,
      carePlanTitle,
    });
    if (result) {
      setPlacedBooking(result);
      setClearedDraft(null);
      const count = itemIds.length;
      const noun = count === 1 ? "test" : "tests";
      toast.success("Order placed", {
        description: carePlanTitle
          ? `${count} ${noun} linked to ${carePlanTitle}.`
          : `${count} ${noun} ordered as a standalone lab order.`,
        position: "top-right",
      });
    }
  };

  const handleRoute = (nextRoute: OrderRouteId) => {
    setRoute(nextRoute);
    setPscPay(nextRoute === "psc" ? "later" : "khqr");
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
      ? `No Order Sets match${query ? ` "${query}"` : ""}`
    : `No tests match${query ? ` "${query}"` : ""}`;
  const emptyHelp = favoritesOnly
    ? favoriteItems.length > 0
      ? "Try clearing specimen filters or search."
      : "Use the favorite action on any test to pin it here."
    : bundlesOnly
      ? "Try clearing specimen filters or search."
    : "Try a broader search or submit a missing-test request.";

  return (
    <section className="lab-catalog has-floating-cart" aria-label="Master lab order">
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
              label="Order Sets"
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
        <div className="lc-catalog-top-surface">
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
            {showBundles && (
              <BundlesCard
                userBundles={visibleUserBundles}
                staticBundles={visibleBundles}
                cartIds={cartIdSet}
                isUserBundleActive={isUserBundleActive}
                onToggleStatic={toggleCart}
                onToggleUserBundle={toggleUserBundle}
                onNewBundle={() => setBundleEditor({ mode: "create" })}
                onEditBundle={(bundle) => setBundleEditor({ mode: "edit", bundle })}
              />
            )}
          </div>
        </div>

        {showCatalogGrid && (
          <section className="lc-catalog-grid" aria-label="Catalog tests">
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
                <Button onClick={() => setSuggestOpen(true)} leadingIcon={<Plus size={13} variant="stroke" />}>
                  Suggest a missing test
                </Button>
              </div>
            )}
          </section>
        )}

        {visibleItems.length > 0 && (
          <section className="lc-request-strip">
            <span className="lc-request-illustration" aria-hidden="true">
              <MissingTestIllustration />
            </span>
            <div className="lc-request-copy">
              <strong>Test you need is not here?</strong>
              <span>Submit demand to lab ops with urgency and expected monthly volume.</span>
            </div>
            <Button className="lc-request-action" size="sm" onClick={() => setSuggestOpen(true)} leadingIcon={<Plus size={12} variant="stroke" />}>
              Suggest a test
            </Button>
          </section>
        )}
      </div>

      <OrderDraftDock>
        <OrderCart
          lines={cartLines}
          patient={attachedPatient}
          identityDecision={identityDecision}
          placedBooking={placedBooking}
          route={route}
          undoClear={clearedDraft ? { count: clearedDraft.lines.length } : null}
          carePlans={activeCarePlans}
          carePlanId={draft.carePlanId ?? null}
          quickSet={quickSetSuggestion}
          onSetCarePlan={handleSetCarePlan}
          onSaveQuickSet={saveQuickSet}
          onDismissQuickSet={() => quickSetSuggestion && dismissQuickSet(quickSetSuggestion.id)}
          onNeverQuickSet={() => quickSetSuggestion && neverQuickSet(quickSetSuggestion.id)}
          onClear={clearOrderDraft}
          onUndoClear={restoreClearedDraft}
          onDismissUndo={() => setClearedDraft(null)}
          onBeginOrder={() => setIdentityModalOpen(true)}
          onChangePatient={() => setIdentityModalOpen(true)}
          onRoute={handleRoute}
          onSend={sendBookingCode}
          onRemove={removeCartLine}
        />
      </OrderDraftDock>

      {identityModalOpen && (
        <OrderIdentityModal
          initialPatient={attachedPatient}
          onClose={() => setIdentityModalOpen(false)}
          onAttach={handleAttachPatient}
        />
      )}

      {suggestOpen && <SuggestTestModal initialName={query} onClose={() => setSuggestOpen(false)} />}

      {bundleEditor && (
        <BundleBuilderModal
          mode={bundleEditor.mode}
          initial={bundleEditor.bundle}
          seedMemberIds={cartLines
            .map((line) => line.itemId)
            .filter((id): id is string => !!id && orderItemById.has(id))}
          onClose={() => setBundleEditor(null)}
          onSave={saveBundle}
          onDelete={bundleEditor.mode === "edit" ? deleteBundle : undefined}
        />
      )}
    </section>
  );
}
