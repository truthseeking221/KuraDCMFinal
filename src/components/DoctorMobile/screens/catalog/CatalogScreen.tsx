"use client";

/* CatalogScreen — the Master Lab Ordering Workspace (mobile).

   No patient is required to browse or build an order: tests go into the shared
   draft (toggleCatalogItem · catalog-standalone), the patient is attached later
   through the identity gate when sending. Surfaces covered:
     · context bar (No patient / For X · change)
     · search over orderItems (name/code/category/specimen/indication)
     · filter ChipRail: Favorites + categories + specimens, with count badges
     · single-column test tiles — favorite heart · panel "N biomarkers" badge ·
       coverage / unavailable greyed · tap → TestDetailSheet
     · Recommended (suggestedOrders) + bundle cards (seeded + doctor bundles)
     · "Build a bundle" → BundleBuilderSheet
     · "Choose patient & send" → IdentityGateSheet → originateDoctorBooking. */

import { useEffect, useMemo, useRef, useState } from "react";
import {
  BOOKING_PATIENTS,
  type BookingPatient,
  type GuarantorPhoneGraph,
  type IdentityGraphMember,
} from "@/components/OrderDraft/bookingSeeds";
import {
  dedupHits,
  formatMoney,
  memberToPatient,
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
import type {
  DoctorIdentityDecision,
  DoctorPatientAssurance,
  OrderItem,
  PscPayChoice,
} from "@/components/OrderDraft";
import { useFavoriteOrderItems } from "@/components/OrderDraft/favorites";
import { useUserBundles } from "@/components/OrderDraft/userBundles";
import { Avatar, OtpInput, PhoneInput } from "@/components/ui";
import {
  Check,
  CheckCircle,
  Catalog as CatalogIcon,
  Delete,
  Flask,
  Heart,
  Patient as PatientIcon,
  Plus,
  Search as SearchIcon,
  Warning,
} from "@/icons/components";
import { toast } from "sonner";
import { cx } from "@/lib/cx";
import { useMobileApp } from "../../state/MobileAppContext";
import { useSheets } from "../../components/Sheet";
import { Sheet } from "../../components/Sheet";
import { ChipRail, SectionHeader, StickyCtaDock } from "../../components/primitives";
import { rosterById } from "../../data/clinical";
import { TestDetailSheet } from "./TestDetailSheet";
import { BundleBuilderSheet } from "./BundleBuilderSheet";
import base from "../../DoctorMobileApp.module.css";
import styles from "./CatalogScreen.module.css";

const CATEGORY_LABEL = new Map(orderCategories.map((c) => [c.id, c.label]));
const SPECIMEN_LABEL = new Map(specimenFilters.map((s) => [s.id, s.label]));

const FILTER_FAVORITES = "favorites";
const FILTER_ALL = "all";

function panelLabel(item: OrderItem): number {
  return item.analytes?.length ?? 0;
}

function matchesQuery(item: OrderItem, q: string): boolean {
  if (!q) return true;
  const haystack = [
    item.name,
    item.code,
    item.fullName ?? "",
    CATEGORY_LABEL.get(item.categoryId) ?? "",
    item.specimens.map((s) => SPECIMEN_LABEL.get(s) ?? s).join(" "),
    (item.indications ?? []).join(" "),
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

export function CatalogScreen() {
  const draft = useOrderDraft();
  const { lineCount, totals, selectedIds, hasItem, toggleCatalogItem } = draft;
  const { activePatientId } = useMobileApp();
  const sheets = useSheets();
  const { favoriteIdSet, favoriteIds, toggleFavorite } = useFavoriteOrderItems();
  const { bundles: userBundles } = useUserBundles();

  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>(FILTER_ALL);

  const activePatient = rosterById.get(activePatientId) ?? null;

  /* ----- filter chips (Favorites + categories + specimens) with counts ----- */
  const q = query.trim().toLowerCase();

  const filterCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    counts[FILTER_FAVORITES] = favoriteIds.length;
    for (const cat of orderCategories) counts[cat.id] = 0;
    for (const spec of specimenFilters) counts[spec.id] = 0;
    for (const item of orderItems) {
      counts[item.categoryId] = (counts[item.categoryId] ?? 0) + 1;
      for (const s of item.specimens) counts[s] = (counts[s] ?? 0) + 1;
    }
    return counts;
  }, [favoriteIds.length]);

  const chipItems = useMemo(() => {
    const items: Array<{ id: string; label: string; count?: number }> = [{ id: FILTER_ALL, label: "All tests" }];
    if (filterCounts[FILTER_FAVORITES] > 0) {
      items.push({ id: FILTER_FAVORITES, label: "Favorites", count: filterCounts[FILTER_FAVORITES] });
    }
    for (const cat of orderCategories) items.push({ id: cat.id, label: cat.label, count: filterCounts[cat.id] });
    for (const spec of specimenFilters) items.push({ id: spec.id, label: spec.label, count: filterCounts[spec.id] });
    return items;
  }, [filterCounts]);

  /* ----- the result list ---------------------------------------------------- */
  const results = useMemo(() => {
    const specimenIds = new Set(specimenFilters.map((s) => s.id as string));
    return orderItems.filter((item) => {
      if (!matchesQuery(item, q)) return false;
      if (activeFilter === FILTER_ALL) return true;
      if (activeFilter === FILTER_FAVORITES) return favoriteIdSet.has(item.id);
      if (specimenIds.has(activeFilter)) return item.specimens.includes(activeFilter as OrderItem["specimens"][number]);
      return item.categoryId === activeFilter;
    });
  }, [q, activeFilter, favoriteIdSet]);

  const showDiscovery = q.length === 0 && activeFilter === FILTER_ALL;

  /* ----- bundle handling (seeded + doctor) --------------------------------- */
  const bundleSelected = (memberItemIds: string[]) =>
    memberItemIds.length > 0 && memberItemIds.every((id) => hasItem(id));

  const addBundle = (memberItemIds: string[], name: string) => {
    const fullyIn = bundleSelected(memberItemIds);
    memberItemIds.forEach((id) => {
      const already = hasItem(id);
      if (fullyIn && already) toggleCatalogItem(id, "catalog-standalone"); /* toggle off */
      else if (!already) toggleCatalogItem(id, "catalog-standalone");
    });
    toast.success(fullyIn ? `Removed ${name}` : `Added ${name}`);
  };

  const openDetail = (itemId: string) => sheets.open((close) => <TestDetailSheet itemId={itemId} onClose={close} />);
  const openBuilder = () => sheets.open((close) => <BundleBuilderSheet onClose={close} />);
  const openGate = () =>
    sheets.open((close) => <IdentityGateSheet onClose={close} />);

  return (
    <div className={base.sectionStack}>
      {/* context bar */}
      <div className={styles.contextBar}>
        <span className={styles.contextIcon} aria-hidden="true">
          <PatientIcon size={16} variant="stroke" />
        </span>
        <span className={styles.contextBody}>
          <span className={base.eyebrow}>Ordering for</span>
          <strong>{activePatient ? activePatient.name : "No patient — choose at send"}</strong>
        </span>
        <button type="button" className={styles.contextChange} onClick={openGate}>
          {activePatient ? "Change" : "Choose"}
        </button>
      </div>

      {/* search */}
      <label className={base.searchBox}>
        <SearchIcon size={16} variant="stroke" aria-hidden="true" />
        <input
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
          placeholder="Search tests, codes, panels, indications"
          aria-label="Search the lab catalog"
        />
      </label>

      {/* filters */}
      <ChipRail items={chipItems} activeId={activeFilter} onSelect={setActiveFilter} />

      {/* discovery: recommended + bundles (only when browsing unfiltered) */}
      {showDiscovery && (
        <>
          {suggestedOrders.length > 0 && (
            <section className={base.sectionStack}>
              <SectionHeader title="Recommended" meta="From this patient's gaps" />
              <div className={styles.cardRail}>
                {suggestedOrders.map((suggestion) => {
                  const item = orderItemById.get(suggestion.targetId);
                  const on = item ? hasItem(item.id) : false;
                  return (
                    <button
                      key={suggestion.id}
                      type="button"
                      className={styles.recCard}
                      onClick={() => openDetail(suggestion.targetId)}
                    >
                      <div className={styles.cardTop}>
                        <strong>{suggestion.title}</strong>
                        <span className={cx(styles.cardDot, toneDot(suggestion.tone))} aria-hidden="true">
                          <Warning size={15} variant="stroke" />
                        </span>
                      </div>
                      <small>{suggestion.description}</small>
                      <span className={styles.cardCta}>
                        {on ? (
                          <>
                            <Check size={12} variant="stroke" aria-hidden="true" /> In order
                          </>
                        ) : (
                          <>
                            <Plus size={12} variant="stroke" aria-hidden="true" /> Review & add
                          </>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          <section className={base.sectionStack}>
            <SectionHeader
              title="Order Sets"
              action={
                <button type="button" className={base.textButton} onClick={openBuilder}>
                  <Plus size={14} variant="stroke" aria-hidden="true" /> Build
                </button>
              }
            />
            <div className={styles.cardRail}>
              {userBundles.map((bundle) => {
                const on = bundleSelected(bundle.memberItemIds);
                const tags = bundle.memberItemIds
                  .map((id) => orderItemById.get(id)?.name)
                  .filter((n): n is string => !!n)
                  .slice(0, 3);
                return (
                  <button
                    key={bundle.id}
                    type="button"
                    className={cx(styles.bundleCard, on && styles.bundleCardSelected)}
                    aria-pressed={on}
                    onClick={() => addBundle(bundle.memberItemIds, bundle.name)}
                  >
                    <div className={styles.cardTop}>
                      <strong>{bundle.name}</strong>
                      <span className={styles.cardDot} aria-hidden="true">
                        <CatalogIcon size={15} variant="stroke" />
                      </span>
                    </div>
                    <small>{bundle.memberItemIds.length} tests · your Order Set</small>
                    <div className={styles.bundleTags}>
                      {tags.map((tag) => (
                        <span key={tag} className={styles.bundleTag}>
                          {tag}
                        </span>
                      ))}
                    </div>
                    <span className={styles.cardCta}>
                      {on ? (
                        <>
                          <Check size={12} variant="stroke" aria-hidden="true" /> Added
                        </>
                      ) : (
                        <>
                          <Plus size={12} variant="stroke" aria-hidden="true" /> Add all
                        </>
                      )}
                    </span>
                  </button>
                );
              })}
              {orderBundles.map((bundle) => {
                const on = bundleSelected(bundle.memberItemIds);
                return (
                  <button
                    key={bundle.id}
                    type="button"
                    className={cx(styles.bundleCard, on && styles.bundleCardSelected)}
                    aria-pressed={on}
                    onClick={() => addBundle(bundle.memberItemIds, bundle.name)}
                  >
                    <div className={styles.cardTop}>
                      <strong>{bundle.name}</strong>
                      <span className={styles.cardDot} aria-hidden="true">
                        <Flask size={15} variant="stroke" />
                      </span>
                    </div>
                    <small>
                      {bundle.testCount} tests · {formatMoney(bundle.price)} list
                    </small>
                    <div className={styles.bundleTags}>
                      {bundle.tags.slice(0, 4).map((tag) => (
                        <span key={tag} className={styles.bundleTag}>
                          {tag}
                        </span>
                      ))}
                    </div>
                    <span className={styles.cardCta}>
                      {on ? (
                        <>
                          <Check size={12} variant="stroke" aria-hidden="true" /> Added
                        </>
                      ) : (
                        <>
                          <Plus size={12} variant="stroke" aria-hidden="true" /> Add all
                        </>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        </>
      )}

      {/* test list */}
      <section className={base.sectionStack}>
        <SectionHeader
          title={showDiscovery ? "All tests" : chipLabel(activeFilter, query)}
          meta={`${results.length}`}
        />
        {results.length === 0 ? (
          <div className={styles.empty}>
            <strong>No tests match</strong>
            <span>Try another name, code, or clear the filter.</span>
          </div>
        ) : (
          <div className={base.cardGroup}>
            {results.map((item) => {
              const selected = selectedIds.has(item.id);
              const isFav = favoriteIdSet.has(item.id);
              const analyteCount = panelLabel(item);
              const unavailable = item.unavailable;
              return (
                <div
                  key={item.id}
                  className={cx(styles.tile, selected && styles.tileSelected, unavailable && styles.tileUnavailable)}
                >
                  <button
                    type="button"
                    className={cx(styles.fav, isFav && styles.favOn)}
                    aria-label={isFav ? `Unfavorite ${item.name}` : `Favorite ${item.name}`}
                    aria-pressed={isFav}
                    onClick={() => toggleFavorite(item.id)}
                  >
                    <Heart size={16} variant={isFav ? "solid" : "stroke"} aria-hidden="true" />
                  </button>

                  <button
                    type="button"
                    className={cx(styles.tileBody, styles.tileBodyButton)}
                    onClick={() => openDetail(item.id)}
                  >
                    <span className={styles.tileTitle}>
                      <strong>{item.name}</strong>
                      {analyteCount > 0 && (
                        <span className={styles.panelBadge}>
                          <Flask size={11} variant="stroke" aria-hidden="true" /> {analyteCount}
                        </span>
                      )}
                    </span>
                    <span className={styles.tileMeta}>
                      {item.code} · <em>{CATEGORY_LABEL.get(item.categoryId)}</em> · {item.tat}
                      {item.prep ? ` · ${item.prep}` : ""}
                      {unavailable ? (
                        <> · <span className={styles.coverageNot}>{unavailable.reason}</span></>
                      ) : item.coverage === "not-covered" ? (
                        <> · <span className={styles.coverageNot}>Not covered</span></>
                      ) : item.coverage === "unconfirmed" ? (
                        <> · <span className={styles.coverageFlag}>Coverage unconfirmed</span></>
                      ) : null}
                    </span>
                  </button>

                  <span className={styles.tileAside}>
                    <span className={styles.tilePrice}>{formatMoney(item.price)}</span>
                    <AddControl
                      selected={selected}
                      disabled={!!unavailable}
                      label={item.name}
                      onAdd={() => toggleCatalogItem(item.id, "catalog-standalone")}
                      onRemove={() => toggleCatalogItem(item.id, "catalog-standalone")}
                    />
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* primary send CTA (separate from the shell mini-cart dock) */}
      {lineCount > 0 && (
        <StickyCtaDock>
          <button type="button" className={base.primaryButton} onClick={openGate}>
            <PatientIcon size={16} variant="stroke" aria-hidden="true" /> Choose patient & send
          </button>
          <span className={base.lightButton} aria-hidden="true">
            {lineCount} · {totals.unpricedCount > 0 ? `$${totals.due.toFixed(2)}+` : `$${totals.due.toFixed(2)}`}
          </span>
        </StickyCtaDock>
      )}
    </div>
  );
}

function chipLabel(activeFilter: string, query: string): string {
  if (query.trim()) return `Results for "${query.trim()}"`;
  if (activeFilter === FILTER_FAVORITES) return "Favorites";
  const cat = orderCategories.find((c) => c.id === activeFilter);
  if (cat) return cat.label;
  const spec = specimenFilters.find((s) => s.id === activeFilter);
  if (spec) return spec.label;
  return "All tests";
}

function toneDot(tone: "danger" | "warning" | "info"): string {
  if (tone === "danger") return base.text_danger;
  if (tone === "warning") return base.text_warning;
  return base.text_info;
}

/* Add control — explicit, non-hover Add → Added states with adequate hit area.
   Re-tapping an "Added" item reveals an inline Remove action (a mini-menu, no
   popover that could cover the control) instead of silently toggling off. */
function AddControl({
  selected,
  disabled,
  label,
  onAdd,
  onRemove,
}: {
  selected: boolean;
  disabled: boolean;
  label: string;
  onAdd: () => void;
  onRemove: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);

  /* the confirm branch is gated by `selected` below, so a stale `confirming`
     after an external removal simply falls back to the Add state — no effect
     needed to reset it. */
  useEffect(() => {
    if (!confirming) return;
    function onDocPointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setConfirming(false);
    }
    document.addEventListener("pointerdown", onDocPointer);
    return () => document.removeEventListener("pointerdown", onDocPointer);
  }, [confirming]);

  if (selected && confirming) {
    return (
      <span ref={rootRef} className={styles.addMenu} role="group" aria-label={`${label} — added`}>
        <button type="button" className={styles.addRemove} onClick={onRemove} aria-label={`Remove ${label} from order`}>
          <Delete size={11} variant="stroke" aria-hidden="true" /> Remove
        </button>
        <button
          type="button"
          className={styles.addKeep}
          onClick={() => setConfirming(false)}
          aria-label="Keep in order"
        >
          <Check size={11} variant="stroke" aria-hidden="true" /> Keep
        </button>
      </span>
    );
  }

  return (
    <span ref={rootRef}>
      <button
        type="button"
        className={cx(styles.addPill, selected && styles.addPillActive)}
        disabled={disabled}
        aria-pressed={selected}
        aria-label={selected ? `${label} added — tap to remove` : `Add ${label} to order`}
        onClick={() => {
          if (selected) setConfirming(true);
          else onAdd();
        }}
      >
        {selected ? (
          <>
            <Check size={11} variant="stroke" aria-hidden="true" /> Added
          </>
        ) : (
          <>
            <Plus size={11} variant="stroke" aria-hidden="true" /> Add
          </>
        )}
      </button>
    </span>
  );
}

/* =============================================================================
   IdentityGateSheet — mobile-native identity gate. Reuses the shared identity
   helpers (resolveGuarantorPhone · dedupHits · memberToPatient) the desktop
   composer uses, then attaches the patient + places the standing draft as a
   doctor-originated PSC booking via originateDoctorBooking. Phone is a contact
   key, not an identity: a guarantor phone asks "who is the patient?", a no-match
   runs the duplicate preflight before minting a provisional.
   ========================================================================== */

type GateStep = "phone" | "candidates" | "new" | "payment";
type ProvisionalKind = Extract<
  DoctorIdentityDecision["kind"],
  "unknown-phone-provisional" | "shared-phone-provisional" | "guarantor-provisional"
>;

function digitsOf(value: string) {
  return value.replace(/\D/g, "");
}
function maskPhone(raw: string) {
  const d = digitsOf(raw);
  if (d.length < 6) return raw.trim() || "Phone pending";
  return `${d.slice(0, 3)} ••• ${d.slice(-3)}`;
}
function normalizePhone(raw: string) {
  const d = digitsOf(raw);
  if (!d) return "";
  if (d.startsWith("855")) return `+${d}`;
  return `+855${d.replace(/^0+/, "")}`;
}
function slugify(name: string) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "patient";
}
function deriveYearOfBirth(value: string) {
  const trimmed = value.trim();
  const year = trimmed.match(/\b(19|20)\d{2}\b/)?.[0];
  if (year) return year;
  const age = Number.parseInt(trimmed, 10);
  if (Number.isFinite(age) && age > 0 && age < 120) return String(2026 - age);
  return undefined;
}
function phoneCandidateHits(phone: string, patients: BookingPatient[]) {
  const d = digitsOf(phone);
  if (d.length < 8) return [];
  const first = d.slice(0, 3);
  const last = d.slice(-3);
  const direct = patients.filter((p) => {
    const pd = digitsOf(p.phone ?? p.phoneMasked);
    return pd.length >= 6 && pd.slice(0, 3) === first && pd.slice(-3) === last;
  });
  if (direct.length > 0) return direct;
  if (first === "010") return patients.filter((p) => digitsOf(p.phone ?? p.phoneMasked).startsWith("010")).slice(0, 3);
  return [];
}

function IdentityGateSheet({ onClose }: { onClose: () => void }) {
  const { draft, lines, totals, originateDoctorBooking, clearDraft } = useOrderDraft();
  const { pushBooking } = useMobileApp();

  const [step, setStep] = useState<GateStep>("phone");
  const [country, setCountry] = useState("KH");
  const [phone, setPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [verified, setVerified] = useState(false);
  const [graph, setGraph] = useState<GuarantorPhoneGraph | null>(null);
  const [candidates, setCandidates] = useState<BookingPatient[]>([]);
  const [createdPatients, setCreatedPatients] = useState<BookingPatient[]>([]);

  const [selectedPatient, setSelectedPatient] = useState<BookingPatient | null>(null);
  const [assurance, setAssurance] = useState<DoctorPatientAssurance | null>(null);
  const [decision, setDecision] = useState<DoctorIdentityDecision | null>(null);
  const [provisionalKind, setProvisionalKind] = useState<ProvisionalKind>("unknown-phone-provisional");

  const [form, setForm] = useState<{ name: string; dobOrAge: string; sex: "" | "female" | "male" | "other" }>({
    name: "",
    dobOrAge: "",
    sex: "",
  });
  const [dupCandidates, setDupCandidates] = useState<BookingPatient[]>([]);
  const [pscPay, setPscPay] = useState<PscPayChoice>("later");

  const allPatients = useMemo(() => [...createdPatients, ...BOOKING_PATIENTS], [createdPatients]);
  const normalizedPhone = normalizePhone(phone);
  const itemIds = useMemo(() => lines.map((line) => line.itemId).filter((id): id is string => !!id), [lines]);

  const resetPhone = (next: string) => {
    setPhone(next);
    setOtpSent(false);
    setOtp("");
    setVerified(false);
    setGraph(null);
    setCandidates([]);
    setSelectedPatient(null);
    setAssurance(null);
    setDecision(null);
    setDupCandidates([]);
    setStep("phone");
  };

  const verifyOtp = (next = otp) => {
    if (digitsOf(next).length !== 6) return;
    setVerified(true);
    const g = resolveGuarantorPhone(phone);
    if (g) {
      setGraph(g);
      setStep("candidates");
      return;
    }
    const hits = phoneCandidateHits(phone, allPatients);
    setCandidates(hits);
    if (hits.length === 0) {
      setProvisionalKind("unknown-phone-provisional");
      setForm({ name: "", dobOrAge: "", sex: "" });
      setStep("new");
    } else {
      setStep("candidates");
    }
  };

  const confirmKnown = (patient: BookingPatient) => {
    setSelectedPatient({ ...patient, phone: patient.phone ?? normalizedPhone, identityTier: patient.identityTier ?? "panel" });
    setAssurance("known-reused");
    setDecision({
      kind: "known-confirmed",
      verifiedPhone: normalizedPhone || phone.trim(),
      candidateIds: candidates.map((c) => c.id),
      confirmedPatientId: patient.id,
      relationshipToPhoneHolder: "self",
    });
    setStep("payment");
  };

  const pickMember = (member: IdentityGraphMember) => {
    if (!graph) return;
    const patient = memberToPatient(member, phone);
    const isHolder = member.relationshipToHolder === "self";
    setSelectedPatient(patient);
    setAssurance("known-reused");
    setDecision({
      kind: isHolder ? "known-confirmed" : "dependent-confirmed",
      verifiedPhone: normalizedPhone || phone.trim(),
      candidateIds: graph.members.map((m) => m.id),
      confirmedPatientId: member.id,
      relationshipToPhoneHolder: member.relationshipToHolder,
      phoneHolderName: graph.holderName,
    });
    setStep("payment");
  };

  const beginProvisional = (kind: ProvisionalKind) => {
    setProvisionalKind(kind);
    setSelectedPatient(null);
    setAssurance(null);
    setDecision(null);
    setForm({ name: "", dobOrAge: "", sex: "" });
    setDupCandidates([]);
    setStep("new");
  };

  const attachProvisional = () => {
    const name = form.name.trim();
    if (!name || !form.dobOrAge.trim() || !form.sex) return;
    const patient: BookingPatient = {
      id: `new-${slugify(name)}-${createdPatients.length + 1}`,
      name,
      mrn: `PROV-${String(createdPatients.length + 1).padStart(4, "0")}`,
      phoneMasked: maskPhone(phone),
      phone: normalizedPhone || phone.trim(),
      dobOrAge: form.dobOrAge.trim(),
      yearOfBirth: deriveYearOfBirth(form.dobOrAge),
      sex: form.sex,
      identityTier: "phone_verified",
      relationship: "new",
    };
    setCreatedPatients((current) => [patient, ...current]);
    setSelectedPatient(patient);
    setAssurance("provisional");
    setDecision({
      kind: provisionalKind,
      verifiedPhone: normalizedPhone || phone.trim(),
      candidateIds: candidates.map((c) => c.id),
      relationshipToPhoneHolder: provisionalKind === "guarantor-provisional" ? "dependent" : "self",
      phoneHolderName: provisionalKind === "guarantor-provisional" ? graph?.holderName : undefined,
      dedupChecked: true,
    });
    setDupCandidates([]);
    setStep("payment");
  };

  const submitProvisional = () => {
    const name = form.name.trim();
    if (!name || !form.dobOrAge.trim() || !form.sex) return;
    const dups = dedupHits(name, form.dobOrAge, form.sex, BOOKING_PATIENTS);
    if (dups.length) {
      setDupCandidates(dups);
      return;
    }
    attachProvisional();
  };

  const place = () => {
    if (!selectedPatient || !assurance || !decision || itemIds.length === 0) return;
    const result = originateDoctorBooking({
      patientId: selectedPatient.id,
      patient: selectedPatient,
      itemIds,
      pscPay,
      patientAssurance: assurance,
      identityDecision: decision,
      /* Carry the care-plan destination chosen in the CartScreen picker
         through the catalog send path — mirroring desktop sendBookingCode —
         so a plan link isn't silently dropped at the identity gate. */
      carePlanId: draft.carePlanId,
      carePlanTitle: draft.carePlanTitle,
    });
    if (!result) return;
    clearDraft();
    toast.success(`Booking sent for ${selectedPatient.name}`);
    onClose();
    pushBooking(result.code);
  };

  const phoneReady = digitsOf(phone).length >= 8;
  const otpReady = digitsOf(otp).length === 6;
  const formValid = !!form.name.trim() && !!form.dobOrAge.trim() && !!form.sex;
  const sharedPhone = candidates.length > 1;

  const footer =
    step === "payment" && selectedPatient ? (
      <div className={cx(base.stickyCta, styles.stickyCtaStatic)}>
        <button type="button" className={base.primaryButton} onClick={place}>
          <CheckCircle size={16} variant="stroke" aria-hidden="true" /> Send PSC booking
        </button>
        <span className={base.lightButton} aria-hidden="true">
          {totals.unpricedCount > 0 ? `$${totals.due.toFixed(2)}+` : `$${totals.due.toFixed(2)}`}
        </span>
      </div>
    ) : undefined;

  return (
    <Sheet title="Choose patient & send" onClose={onClose} footer={footer} size="full">
      {/* draft summary */}
      <div className={cx(base.banner, base.tone_info)} role="status">
        <Flask size={15} variant="stroke" aria-hidden="true" />
        <span>
          {itemIds.length} test{itemIds.length === 1 ? "" : "s"} ready ·{" "}
          {totals.unpricedCount > 0 ? `$${totals.due.toFixed(2)}+` : formatMoney(totals.due)}
        </span>
      </div>

      {step === "phone" && (
        <>
          <div className={styles.gateHead}>
            <p>A phone finds possible Kura records. Identity is confirmed only after the SMS code and the right-person check.</p>
          </div>
          <div className={styles.gateField}>
            <span className={styles.fieldLabel}>Mobile phone</span>
            <PhoneInput
              country={country}
              number={phone}
              onCountryChange={setCountry}
              onNumberChange={resetPhone}
              placeholder="70 123 456"
              verified={verified}
              locked={verified}
              lockedDescription="Phone checked. Change phone to restart the identity check."
            />
            <button
              type="button"
              className={base.secondaryButton}
              disabled={!phoneReady || otpSent}
              onClick={() => setOtpSent(true)}
            >
              {otpSent ? "Code sent" : "Send code"}
            </button>
          </div>

          <p className={styles.demoHint}>
            Demo · <strong>012 777 088</strong> guarantor + dependents · <strong>010 222 333</strong> shared phone · any other → new patient + dedup check
          </p>

          {otpSent && !verified && (
            <div className={styles.gateField}>
              <span className={styles.fieldLabel}>Verification code</span>
              <p className={styles.demoHint}>Patient reads the 6-digit SMS code to {maskPhone(phone)} aloud.</p>
              <OtpInput value={otp} onChange={setOtp} onComplete={verifyOtp} autoFocus ariaLabel="6-digit verification code" />
              <button type="button" className={base.primaryButton} disabled={!otpReady} onClick={() => verifyOtp()}>
                Verify phone
              </button>
            </div>
          )}
        </>
      )}

      {step === "candidates" && (
        <div className={base.sectionStack}>
          {graph ? (
            <>
              <div className={cx(base.banner, base.tone_warning)} role="status">
                <CheckCircle size={15} variant="stroke" aria-hidden="true" />
                <span>
                  {maskPhone(phone)} belongs to {graph.holderName} ({relationshipLabel(graph.holderRelationship)}). Choose who the tests are for.
                </span>
              </div>
              <SectionHeader title="Who is the patient?" />
              <div className={base.cardGroup}>
                {graph.members.map((member) => (
                  <button key={member.id} type="button" className={styles.candidate} onClick={() => pickMember(member)}>
                    <Avatar name={member.name} size="sm" />
                    <span className={styles.candidateBody}>
                      <strong>{member.name}</strong>
                      <small>
                        {member.ageLabel}y · {member.relationshipToHolder === "self" ? "phone holder" : relationshipLabel(member.relationshipToHolder)}
                      </small>
                    </span>
                    <Check size={16} variant="stroke" aria-hidden="true" />
                  </button>
                ))}
              </div>
              <button type="button" className={base.textButton} onClick={() => beginProvisional("guarantor-provisional")}>
                <Plus size={14} variant="stroke" aria-hidden="true" /> Someone else — not listed
              </button>
            </>
          ) : (
            <>
              <div className={base.banner} role="status">
                <CheckCircle size={15} variant="stroke" aria-hidden="true" />
                <span>{maskPhone(phone)} verified. Confirm the person before ordering.</span>
              </div>
              <SectionHeader title={sharedPhone ? "Shared phone candidates" : "Possible Kura record"} />
              <div className={base.cardGroup}>
                {candidates.map((candidate) => (
                  <button key={candidate.id} type="button" className={styles.candidate} onClick={() => confirmKnown(candidate)}>
                    <Avatar name={candidate.name} size="sm" />
                    <span className={styles.candidateBody}>
                      <strong>{candidate.name}</strong>
                      <small>
                        {candidate.mrn} · {candidate.phoneMasked}
                      </small>
                    </span>
                    <Check size={16} variant="stroke" aria-hidden="true" />
                  </button>
                ))}
              </div>
              <button
                type="button"
                className={base.textButton}
                onClick={() => beginProvisional("shared-phone-provisional")}
              >
                <Plus size={14} variant="stroke" aria-hidden="true" /> None of these — new patient
              </button>
            </>
          )}
        </div>
      )}

      {step === "new" && (
        <div className={base.sectionStack}>
          {dupCandidates.length > 0 ? (
            <>
              <div className={cx(base.banner, base.tone_warning)} role="status">
                <PatientIcon size={15} variant="stroke" aria-hidden="true" />
                <span>A Kura patient already looks like {form.name.trim()}. Pick the existing record, or create new only if none match.</span>
              </div>
              <div className={base.cardGroup}>
                {dupCandidates.map((candidate) => (
                  <button key={candidate.id} type="button" className={styles.candidate} onClick={() => confirmKnown(candidate)}>
                    <Avatar name={candidate.name} size="sm" />
                    <span className={styles.candidateBody}>
                      <strong>{candidate.name}</strong>
                      <small>
                        {candidate.mrn} · {candidate.phoneMasked}
                      </small>
                    </span>
                    <Check size={16} variant="stroke" aria-hidden="true" />
                  </button>
                ))}
              </div>
              <div className={styles.gateRowActions}>
                <button type="button" className={base.lightButton} onClick={() => setDupCandidates([])}>
                  Back to details
                </button>
                <button type="button" className={base.secondaryButton} onClick={attachProvisional}>
                  None match — create {form.name.trim() || "new patient"}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className={cx(base.banner, provisionalKind === "unknown-phone-provisional" ? undefined : base.tone_warning)} role="status">
                <PatientIcon size={15} variant="stroke" aria-hidden="true" />
                <span>
                  {provisionalKind === "shared-phone-provisional"
                    ? "Different person on a phone already in Kura. PSC reception verifies before the draw."
                    : provisionalKind === "guarantor-provisional"
                      ? `New dependent under ${graph?.holderName ?? "this phone"}. PSC reception verifies before the draw.`
                      : "No patient found with this phone. We check for duplicates before creating a provisional record."}
                </span>
              </div>
              <div className={styles.gateField}>
                <span className={styles.fieldLabel}>Full name</span>
                <input
                  className={styles.builderInput}
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.currentTarget.value })}
                  placeholder="e.g. Sokha Chann"
                  autoComplete="off"
                  aria-label="Full name"
                />
              </div>
              <div className={styles.gateField}>
                <span className={styles.fieldLabel}>DOB or age</span>
                <input
                  className={styles.builderInput}
                  value={form.dobOrAge}
                  onChange={(event) => setForm({ ...form, dobOrAge: event.currentTarget.value })}
                  placeholder="1971 or 54"
                  autoComplete="off"
                  aria-label="DOB or age"
                />
              </div>
              <div className={styles.gateField}>
                <span className={styles.fieldLabel}>Sex</span>
                <ChipRail
                  items={[
                    { id: "female", label: "Female" },
                    { id: "male", label: "Male" },
                    { id: "other", label: "Other" },
                  ]}
                  activeId={form.sex || null}
                  onSelect={(id) => setForm({ ...form, sex: id as "female" | "male" | "other" })}
                />
              </div>
              <button type="button" className={base.primaryButton} disabled={!formValid} onClick={submitProvisional}>
                <Check size={16} variant="stroke" aria-hidden="true" /> Check & use this identity
              </button>
            </>
          )}
        </div>
      )}

      {step === "payment" && selectedPatient && (
        <div className={base.sectionStack}>
          <SectionHeader title="Confirm & payment" />
          <div className={base.cardGroup}>
            <div className={styles.candidate} style={{ cursor: "default" }}>
              <Avatar name={selectedPatient.name} size="sm" />
              <span className={styles.candidateBody}>
                <strong>{selectedPatient.name}</strong>
                <small>
                  {selectedPatient.mrn} · {selectedPatient.phoneMasked}
                  {assurance === "provisional" ? " · provisional" : ""}
                </small>
              </span>
              {assurance === "provisional" ? (
                <Warning size={16} variant="stroke" aria-hidden="true" className={base.text_warning} />
              ) : (
                <CheckCircle size={16} variant="stroke" aria-hidden="true" className={base.text_success} />
              )}
            </div>
          </div>

          <SectionHeader title="Payment" />
          <div className={base.cardGroup}>
            {(
              [
                { id: "later", label: "Pay at PSC", sub: "Patient pays at reception during the visit." },
                { id: "cash", label: "Cash at your office", sub: "Record cash received before sending." },
                { id: "khqr", label: "KHQR before visit", sub: "Send a payment link before the visit." },
              ] as Array<{ id: PscPayChoice; label: string; sub: string }>
            ).map((option) => {
              const on = pscPay === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  className={cx(styles.candidate, styles.payOption, on && styles.tileSelected)}
                  aria-pressed={on}
                  onClick={() => setPscPay(option.id)}
                >
                  <span className={styles.candidateBody}>
                    <strong>{option.label}</strong>
                    <small>{option.sub}</small>
                  </span>
                  {on && <Check size={16} variant="stroke" aria-hidden="true" />}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            className={base.textButton}
            onClick={() => {
              setSelectedPatient(null);
              setAssurance(null);
              setDecision(null);
              setStep(graph || candidates.length ? "candidates" : "phone");
            }}
          >
            Change patient
          </button>
        </div>
      )}
    </Sheet>
  );
}
