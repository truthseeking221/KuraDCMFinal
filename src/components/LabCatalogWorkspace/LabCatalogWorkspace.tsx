"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  Badge,
  Button,
  Counter,
  Input,
  Search,
  SegmentedToggle,
} from "@/components/ui";
import {
  ArrowLeft,
  ArrowRight,
  BloodDrop,
  Cart,
  CheckCircle,
  CheckShield,
  Clock,
  Close,
  Delete,
  Flask,
  Lock,
  Patient,
  Plus,
  Sparkles,
  Star,
  Tube,
  Warning,
} from "@/icons";
import {
  formatKhr,
  formatMoney,
  orderBundleById,
  orderBundles,
  orderCategories,
  orderItemById,
  orderItems,
  specimenFilters,
  useOrderDraft,
} from "@/components/OrderDraft";
import type {
  OrderCategoryId,
  OrderItem,
  OrderRouteId,
  PlacedOrderSummary,
  PscPayChoice,
} from "@/components/OrderDraft";
import { BOOKING_PATIENTS, type BookingPatient } from "@/components/OrderDraft/bookingSeeds";
import { useKyd, VERIFICATION_HREF } from "@/components/Verification";
import { cx } from "@/lib/cx";
import "./LabCatalogWorkspace.css";

type LabCatalogWorkspaceProps = {
  searchIntent?: { query: string; itemId: string } | null;
  onSearchIntentHandled?: () => void;
  onOpenPatientChart?: (patientId: string) => void;
};

type UnitSystem = "us" | "si";
type CatalogCategoryFilter = "all" | "favorites" | OrderCategoryId;
type CartPhase = "cart" | "patient" | "review" | "placed";

const SPECIMEN_LABEL = new Map(specimenFilters.map((specimen) => [specimen.id, specimen.label]));
const CATEGORY_LABEL = new Map(orderCategories.map((category) => [category.id, category.label]));
const DEFAULT_PATIENTS = BOOKING_PATIENTS.slice(0, 6);
const PRIMARY_CATEGORY_IDS: OrderCategoryId[] = ["glycemic", "lipids", "renal", "liver", "hematology", "cardiac"];

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

function patientMatchesQuery(patient: BookingPatient, query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  return [patient.name, patient.mrn, patient.phoneMasked, patient.id].join(" ").toLowerCase().includes(normalized);
}

function slugifyPatientName(name: string) {
  const cleaned = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return cleaned || "new-patient";
}

function getCartEntry(id: string):
  | { kind: "test"; id: string; name: string; code: string; price: number; meta: string }
  | { kind: "bundle"; id: string; name: string; code: string; price: number; meta: string }
  | null {
  const item = orderItemById.get(id);
  if (item) {
    return {
      kind: "test",
      id,
      name: item.name,
      code: item.code,
      price: item.price,
      meta: `${CATEGORY_LABEL.get(item.categoryId) ?? item.categoryId} · ${specimenText(item)}`,
    };
  }

  const bundle = orderBundleById.get(id);
  if (bundle) {
    return {
      kind: "bundle",
      id,
      name: bundle.name,
      code: "Bundle",
      price: bundle.price,
      meta: `${bundle.testCount} tests · ${bundle.tags.join(", ")}`,
    };
  }

  return null;
}

function FavoritesCard({
  favorites,
  onOpenFavorites,
  onRemove,
}: {
  favorites: string[];
  onOpenFavorites: () => void;
  onRemove: (itemId: string) => void;
}) {
  const favoriteItems = favorites.map((id) => orderItemById.get(id)).filter((item): item is OrderItem => !!item);

  return (
    <section className="lc-accelerator-card" aria-labelledby="lc-favorites-title">
      <div className="lc-library-head">
        <span className="lc-library-icon" aria-hidden>
          <Star size={14} />
        </span>
        <div>
          <h2 id="lc-favorites-title">Favorites</h2>
          <p>{favoriteItems.length ? `${favoriteItems.length} saved tests` : "0 saved tests"}</p>
        </div>
      </div>
      {favoriteItems.length ? (
        <div className="lc-library-tags">
          {favoriteItems.slice(0, 6).map((item) => (
            <button
              key={item.id}
              type="button"
              aria-label={`Remove ${item.name} from favorites`}
              onClick={() => onRemove(item.id)}
            >
              {item.code}
              <Close size={11} variant="stroke" />
            </button>
          ))}
        </div>
      ) : (
        <button className="lc-library-empty" type="button" onClick={onOpenFavorites}>
          Add popular
        </button>
      )}
    </section>
  );
}

function BundlesCard({
  cartIds,
  onToggleBundle,
}: {
  cartIds: Set<string>;
  onToggleBundle: (bundleId: string) => void;
}) {
  return (
    <section className="lc-accelerator-card lc-accelerator-card--wide" aria-labelledby="lc-bundles-title">
      <div className="lc-library-head">
        <span className="lc-library-icon" aria-hidden>
          <Cart size={14} variant="bulk" />
        </span>
        <div>
          <h2 id="lc-bundles-title">Bundles</h2>
          <p>Reusable panels for frequent ordering</p>
        </div>
      </div>
      <div className="lc-bundle-row">
        {orderBundles.map((bundle) => {
          const selected = cartIds.has(bundle.id);
          return (
            <button
              key={bundle.id}
              type="button"
              className={cx("lc-bundle-chip", selected && "is-selected")}
              aria-pressed={selected}
              aria-label={`${selected ? "Remove" : "Add"} ${bundle.name}`}
              onClick={() => onToggleBundle(bundle.id)}
            >
              <span>
                <strong>{bundle.name}</strong>
                <small>{bundle.testCount} tests · {formatMoney(bundle.price)}</small>
              </span>
              {selected ? <CheckCircle size={14} variant="bulk" /> : <Plus size={14} variant="stroke" />}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function CatalogRow({
  favorite,
  highlighted,
  inCart,
  item,
  onToggleCart,
  onToggleFavorite,
  unitSystem,
}: {
  favorite: boolean;
  highlighted: boolean;
  inCart: boolean;
  item: OrderItem;
  onToggleCart: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  unitSystem: UnitSystem;
}) {
  const reference = item.referenceRange?.[unitSystem];

  return (
    <li
      className={cx("lc-test-row", highlighted && "is-highlighted")}
      id={`lab-catalog-item-${item.id}`}
      title={item.description || undefined}
    >
      <div className="lc-test-tube" aria-hidden>
        <Tube size={16} variant="bulk" />
      </div>
      <div className="lc-test-main">
        <div className="lc-test-title-line">
          <strong>{item.name}</strong>
          <span className="lc-code">{item.code}</span>
          <span className="lc-category">{CATEGORY_LABEL.get(item.categoryId) ?? item.categoryId}</span>
          {item.popular && (
            <Badge tone="brand" icon={<Star size={10} />}>
              Popular
            </Badge>
          )}
          {item.unavailable && (
            <Badge tone="warning" icon={<Warning size={10} variant="bulk" />}>
              Unavailable
            </Badge>
          )}
        </div>
        <div className="lc-test-meta">
          <span><Clock size={11} variant="bulk" /> {item.tat}</span>
          <span><BloodDrop size={11} variant="bulk" /> {specimenText(item)}</span>
          <span><Flask size={11} variant="bulk" /> {item.prep ?? "No special prep"}</span>
          {reference && <span className="lc-ref">Ref {reference}</span>}
        </div>
      </div>
      <div className="lc-test-price" aria-label={`Price ${formatMoney(item.price)}, approximately ${formatKhr(item.price)}`}>
        <strong>{formatMoney(item.price)}</strong>
        <span>{formatKhr(item.price)}</span>
      </div>
      <div className="lc-row-actions">
        <button
          type="button"
          className={cx("lc-icon-action", favorite && "is-favorite")}
          aria-label={`${favorite ? "Remove" : "Add"} ${item.name} favorite`}
          aria-pressed={favorite}
          title={`${favorite ? "Remove" : "Add"} favorite`}
          onClick={() => onToggleFavorite(item.id)}
        >
          <Star size={14} />
        </button>
        <button
          type="button"
          className={cx("lc-add-action", inCart && "is-selected")}
          aria-label={`${inCart ? "Remove" : "Add"} ${item.name} ${inCart ? "from" : "to"} cart`}
          aria-pressed={inCart}
          disabled={!!item.unavailable}
          title={`${inCart ? "Remove from" : "Add to"} cart`}
          onClick={() => onToggleCart(item.id)}
        >
          {inCart ? <Delete size={14} variant="stroke" /> : <Plus size={14} variant="stroke" />}
          <span>{inCart ? "Remove" : "Add"}</span>
        </button>
      </div>
    </li>
  );
}

function PatientRow({
  patient,
  selected,
  onSelect,
}: {
  patient: BookingPatient;
  selected: boolean;
  onSelect: () => void;
}) {
  const initials = patient.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2);

  return (
    <button type="button" className={cx("lc-patient-row", selected && "is-selected")} onClick={onSelect}>
      <span className="lc-patient-avatar">{initials}</span>
      <span className="lc-patient-copy">
        <strong>{patient.name}</strong>
        <small>{patient.mrn} · {patient.phoneMasked}</small>
      </span>
      {selected && <CheckCircle size={15} variant="bulk" />}
    </button>
  );
}

function LabCatalogCart({
  cartIds,
  onClear,
  onOpenPatientChart,
  onRemove,
}: {
  cartIds: string[];
  onClear: () => void;
  onOpenPatientChart?: (patientId: string) => void;
  onRemove: (id: string) => void;
}) {
  const { placeStandaloneOrder } = useOrderDraft();
  const kyd = useKyd();
  const [phase, setPhase] = useState<CartPhase>("cart");
  const [patientQuery, setPatientQuery] = useState("");
  const [createdPatients, setCreatedPatients] = useState<BookingPatient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<BookingPatient | null>(null);
  const [route, setRoute] = useState<OrderRouteId>("clinic");
  const [pscPay, setPscPay] = useState<PscPayChoice>("later");
  const [placed, setPlaced] = useState<PlacedOrderSummary | null>(null);

  const entries = cartIds.map((id) => getCartEntry(id)).filter((entry): entry is NonNullable<typeof entry> => !!entry);
  const total = entries.reduce((sum, entry) => sum + entry.price, 0);
  const allPatients = [...createdPatients, ...DEFAULT_PATIENTS];
  const patientHits = allPatients.filter((patient) => patientMatchesQuery(patient, patientQuery));
  const canOrder = !kyd.loading && kyd.isApproved;

  const createPatient = () => {
    const name = patientQuery.trim() || "New patient";
    const id = `catalog-${slugifyPatientName(name)}-${createdPatients.length + 1}`;
    const next: BookingPatient = {
      id,
      name,
      mrn: `NEW-${String(createdPatients.length + 1).padStart(4, "0")}`,
      phoneMasked: "Phone pending",
    };
    setCreatedPatients((current) => [next, ...current]);
    setSelectedPatient(next);
  };

  const place = () => {
    if (!selectedPatient) return;
    const result = placeStandaloneOrder({
      patientId: selectedPatient.id,
      patient: selectedPatient,
      itemIds: cartIds,
      route,
      pscPay: route === "psc" ? pscPay : null,
    });
    if (!result) return;
    setPlaced(result);
    setPhase("placed");
  };

  if (phase === "placed" && selectedPatient && placed) {
    return (
      <aside className="lc-cart" aria-label="Placed catalog order">
        <div className="lc-cart-status tone-success">
          <CheckCircle size={17} variant="bulk" />
          <div>
            <strong>Order placed</strong>
            <span>{entries.length} item{entries.length === 1 ? "" : "s"} for {selectedPatient.name}</span>
          </div>
        </div>
        <div className="lc-placed-code">
          <span>Order ref</span>
          <strong>{placed.code}</strong>
          {placed.bookingCode && <small>Patient code {placed.bookingCode}</small>}
        </div>
        <p className="lc-cart-note">
          Booking code and QR are ready for SMS/Telegram. The booking is now visible in the clinic queue.
        </p>
        <Button fullWidth onClick={() => onOpenPatientChart?.(selectedPatient.id)} trailingIcon={<ArrowRight size={13} />}>
          Open chart
        </Button>
        <Button
          fullWidth
          intent="ghost"
          onClick={() => {
            onClear();
            setPhase("cart");
            setPlaced(null);
            setSelectedPatient(null);
          }}
        >
          Back to catalog
        </Button>
      </aside>
    );
  }

  if (phase === "patient") {
    return (
      <aside className="lc-cart" aria-label="Choose patient for catalog cart">
        <div className="lc-cart-top">
          <button type="button" onClick={() => setPhase("cart")}>
            <ArrowLeft size={13} /> Back
          </button>
          <span>Step 2 · patient</span>
        </div>
        <Search
          density="compact"
          placeholder="Search name, phone, ID..."
          value={patientQuery}
          onChange={(event) => setPatientQuery(event.target.value)}
          onClear={() => setPatientQuery("")}
        />
        <div className="lc-patient-list">
          {patientHits.slice(0, 6).map((patient) => (
            <PatientRow
              key={patient.id}
              patient={patient}
              selected={selectedPatient?.id === patient.id}
              onSelect={() => setSelectedPatient(patient)}
            />
          ))}
          {patientHits.length === 0 && (
            <div className="lc-no-patient">
              <strong>No patient match</strong>
              <span>Create a draft patient and confirm details before collection.</span>
            </div>
          )}
        </div>
        <Button intent="outline" fullWidth leadingIcon={<Plus size={13} />} onClick={createPatient}>
          Add new patient
        </Button>
        <Button fullWidth disabled={!selectedPatient} onClick={() => setPhase("review")} trailingIcon={<ArrowRight size={13} />}>
          Next · review order
        </Button>
      </aside>
    );
  }

  if (phase === "review" && selectedPatient) {
    return (
      <aside className="lc-cart" aria-label="Review catalog order">
        <div className="lc-cart-top">
          <button type="button" onClick={() => setPhase("patient")}>
            <ArrowLeft size={13} /> Back
          </button>
          <span>Step 3 · review</span>
        </div>
        <section className="lc-review-block">
          <span className="lc-review-label">For</span>
          <PatientRow patient={selectedPatient} selected onSelect={() => setPhase("patient")} />
        </section>
        <section className="lc-review-block">
          <span className="lc-review-label">Route</span>
          <div className="lc-route-grid">
            <button type="button" className={cx(route === "clinic" && "is-selected")} onClick={() => setRoute("clinic")}>
              <Tube size={14} variant="bulk" />
              <span>
                <strong>Draw in clinic</strong>
                <small>Kura courier pickup</small>
              </span>
            </button>
            <button type="button" className={cx(route === "psc" && "is-selected")} onClick={() => setRoute("psc")}>
              <Patient size={14} variant="bulk" />
              <span>
                <strong>Send to PSC</strong>
                <small>Slip + QR to patient</small>
              </span>
            </button>
          </div>
        </section>
        {route === "psc" && (
          <section className="lc-review-block">
            <span className="lc-review-label">PSC payment</span>
            <SegmentedToggle
              aria-label="PSC payment choice"
              value={pscPay}
              onChange={setPscPay}
              options={[
                { label: "At PSC", value: "later" },
                { label: "Cash now", value: "cash" },
                { label: "KHQR", value: "khqr" },
              ]}
            />
          </section>
        )}
        <section className="lc-review-block">
          <span className="lc-review-label">Tests</span>
          <ul className="lc-review-lines">
            {entries.map((entry) => (
              <li key={entry.id}>
                <span>{entry.name}</span>
                <strong>{formatMoney(entry.price)}</strong>
              </li>
            ))}
          </ul>
        </section>
        <div className="lc-cart-total">
          <span>{entries.length} item{entries.length === 1 ? "" : "s"}</span>
          <strong>{formatMoney(total)}</strong>
          <small>{formatKhr(total)}</small>
        </div>
        <Button fullWidth onClick={place} leadingIcon={<Flask size={13} variant="stroke" />}>
          Place order
        </Button>
      </aside>
    );
  }

  return (
    <aside className="lc-cart" aria-label="Catalog cart">
      <div className="lc-cart-head">
        <div>
          <h2>Cart</h2>
          <span>{entries.length} item{entries.length === 1 ? "" : "s"}</span>
        </div>
        <button type="button" onClick={onClear}>Clear</button>
      </div>
      <ul className="lc-cart-lines">
        {entries.map((entry) => (
          <li key={entry.id}>
            <div>
              <strong>{entry.name}</strong>
              <span>{entry.code} · {entry.meta}</span>
            </div>
            <div>
              <strong>{formatMoney(entry.price)}</strong>
              <button type="button" onClick={() => onRemove(entry.id)}>Remove</button>
            </div>
          </li>
        ))}
      </ul>
      <div className="lc-cart-total">
        <span>{entries.length} item{entries.length === 1 ? "" : "s"}</span>
        <strong>{formatMoney(total)}</strong>
        <small>{formatKhr(total)}</small>
      </div>
      {canOrder ? (
        <Button fullWidth onClick={() => setPhase("patient")} trailingIcon={<ArrowRight size={13} />}>
          Continue · find patient
        </Button>
      ) : (
        <div className="lc-explorer-gate">
          <Button fullWidth disabled leadingIcon={<Lock size={13} />}>
            Continue · find patient
          </Button>
          <p>
            <CheckShield size={12} variant="bulk" />
            Explorer mode. Verify your MoH licence before placing real lab orders.
          </p>
          <a href={VERIFICATION_HREF}>Verify license</a>
        </div>
      )}
    </aside>
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
            <label className="lc-form-field">
              <span>Specimen, if known</span>
              <select value={specimen} onChange={(event) => setSpecimen(event.target.value)}>
                <option value="unknown">Not sure</option>
                <option value="blood">Blood</option>
                <option value="urine">Urine</option>
                <option value="swab">Swab</option>
                <option value="saliva">Saliva</option>
              </select>
            </label>
            <label className="lc-form-field">
              <span>Urgency</span>
              <select value={urgency} onChange={(event) => setUrgency(event.target.value)}>
                <option value="asap">ASAP - blocking patient care now</option>
                <option value="within-month">Within 1 month</option>
                <option value="nice">Nice to have</option>
              </select>
            </label>
            <label className="lc-form-field">
              <span>Expected volume</span>
              <select value={volume} onChange={(event) => setVolume(event.target.value)}>
                <option value="1-5">1-5 per month</option>
                <option value="6-20">6-20 per month</option>
                <option value="20-plus">20+ per month</option>
              </select>
            </label>
            <label className="lc-form-field">
              <span>Reason</span>
              <textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Clinical use case or patient cohort" />
            </label>
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
  onOpenPatientChart,
}: LabCatalogWorkspaceProps) {
  const [query, setQuery] = useState(searchIntent?.query ?? "");
  const [category, setCategory] = useState<CatalogCategoryFilter>("all");
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [cartIds, setCartIds] = useState<string[]>([]);
  const [unitSystem, setUnitSystem] = useState<UnitSystem>("us");
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [showMoreCategories, setShowMoreCategories] = useState(false);
  const [highlightedItemId, setHighlightedItemId] = useState<string | null>(searchIntent?.itemId ?? null);

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

  const favoriteIds = useMemo(() => [...favorites], [favorites]);
  const favoriteCount = favorites.size;
  const cartIdSet = useMemo(() => new Set(cartIds), [cartIds]);
  const categoryCounts = useMemo(() => {
    const counts = new Map<OrderCategoryId, number>();
    for (const item of orderItems) counts.set(item.categoryId, (counts.get(item.categoryId) ?? 0) + 1);
    return counts;
  }, []);
  const primaryCategories = useMemo(
    () => orderCategories.filter((cat) => PRIMARY_CATEGORY_IDS.includes(cat.id)),
    [],
  );
  const overflowCategories = useMemo(
    () => orderCategories.filter((cat) => !PRIMARY_CATEGORY_IDS.includes(cat.id)),
    [],
  );
  const overflowCount = overflowCategories.reduce((sum, cat) => sum + (categoryCounts.get(cat.id) ?? 0), 0);
  const activeOverflowCategory = overflowCategories.some((cat) => cat.id === category);
  const showOverflowCategories = showMoreCategories || activeOverflowCategory;

  const visibleItems = useMemo(
    () =>
      orderItems.filter((item) => {
        const matchesCategory =
          category === "all" ||
          (category === "favorites" && favorites.has(item.id)) ||
          item.categoryId === category;
        return matchesCategory && itemMatchesQuery(item, query);
      }),
    [category, favorites, query],
  );

  const toggleFavorite = (itemId: string) => {
    setFavorites((current) => {
      const next = new Set(current);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const toggleCart = (id: string) => {
    setCartIds((current) => (current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id]));
  };

  const addPopularFavorites = () => {
    setFavorites(new Set(orderItems.filter((item) => item.popular).slice(0, 5).map((item) => item.id)));
  };

  /* Group the full list into calm category sections (doctors think in panels);
     a single category or an active search collapses back to one flat list. */
  const grouped = category === "all" && !query;
  const catalogRow = (item: OrderItem) => (
    <CatalogRow
      key={item.id}
      item={item}
      favorite={favorites.has(item.id)}
      inCart={cartIdSet.has(item.id)}
      highlighted={highlightedItemId === item.id}
      unitSystem={unitSystem}
      onToggleFavorite={toggleFavorite}
      onToggleCart={toggleCart}
    />
  );

  return (
    <section className={cx("lab-catalog", cartIds.length > 0 && "has-cart")} aria-labelledby="lab-catalog-title">
      <div className="lab-catalog-main">
        <header className="lc-hero">
          <div>
            <span className="lc-eyebrow">Lab catalog</span>
            <h1 id="lab-catalog-title">Lab catalog</h1>
            <p>
              {orderItems.length} tests · pricing, specimen, prep, reference ranges
            </p>
          </div>
          <div className="lc-unit-switch">
            <span>Reference ranges</span>
            <SegmentedToggle
              aria-label="Reference range unit system"
              value={unitSystem}
              onChange={setUnitSystem}
              options={[
                { label: "US", value: "us" },
                { label: "SI", value: "si" },
              ]}
            />
          </div>
        </header>

        <div className="lc-search-panel">
          <Search
            density="large"
            placeholder="Search by name, code (HBA1C), category, prep..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onClear={() => setQuery("")}
          />
          <div className="lc-category-chips" aria-label="Catalog categories">
            <button
              type="button"
              className={cx(category === "all" && "is-active")}
              onClick={() => setCategory("all")}
            >
              All <Counter count={orderItems.length} />
            </button>
            <button
              type="button"
              className={cx(category === "favorites" && "is-active")}
              onClick={() => setCategory("favorites")}
            >
              <Star size={12} /> Favorites <Counter count={favoriteCount} />
            </button>
            {primaryCategories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                className={cx(category === cat.id && "is-active")}
                onClick={() => setCategory(cat.id)}
              >
                {cat.label} <Counter count={categoryCounts.get(cat.id) ?? 0} />
              </button>
            ))}
            {overflowCategories.length > 0 && (
              <button
                type="button"
                className={cx("lc-more-categories", showOverflowCategories && "is-active")}
                aria-expanded={showOverflowCategories}
                onClick={() => setShowMoreCategories((current) => !current)}
              >
                {showOverflowCategories ? "Hide categories" : "More categories"} <Counter count={overflowCount} />
              </button>
            )}
            {showOverflowCategories &&
              overflowCategories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  className={cx("lc-overflow-category", category === cat.id && "is-active")}
                  onClick={() => setCategory(cat.id)}
                >
                  {cat.label} <Counter count={categoryCounts.get(cat.id) ?? 0} />
                </button>
              ))}
          </div>
        </div>

        <div className="lc-accelerator-strip" aria-label="Catalog accelerators">
          <FavoritesCard favorites={favoriteIds} onOpenFavorites={addPopularFavorites} onRemove={toggleFavorite} />
          <BundlesCard cartIds={cartIdSet} onToggleBundle={toggleCart} />
        </div>

        <section className="lc-results" aria-label="Catalog tests">
          <div className="lc-results-head">
            <span>{visibleItems.length} test{visibleItems.length === 1 ? "" : "s"}{query ? ` matching "${query}"` : ""}</span>
            <span><Sparkles size={12} /> Prices USD · KHR estimate shown</span>
          </div>
          {visibleItems.length ? (
            grouped ? (
              <div className="lc-groups">
                {orderCategories.map((cat) => {
                  const items = visibleItems.filter((item) => item.categoryId === cat.id);
                  if (!items.length) return null;
                  return (
                    <div className="lc-group" key={cat.id}>
                      <div className="lc-group-head">
                        <span>{cat.label}</span>
                        <Counter count={items.length} />
                      </div>
                      <ul>{items.map(catalogRow)}</ul>
                    </div>
                  );
                })}
              </div>
            ) : (
              <ul>{visibleItems.map(catalogRow)}</ul>
            )
          ) : (
            <div className="lc-empty">
              <Flask size={24} variant="bulk" />
              <strong>No tests match{query ? ` "${query}"` : ""}</strong>
              <span>Try a broader search or submit a missing-test request.</span>
              <Button onClick={() => setSuggestOpen(true)} leadingIcon={<Plus size={13} />}>
                Suggest a missing test
              </Button>
            </div>
          )}
        </section>

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

      {cartIds.length > 0 && (
        <LabCatalogCart
          cartIds={cartIds}
          onClear={() => setCartIds([])}
          onRemove={toggleCart}
          onOpenPatientChart={onOpenPatientChart}
        />
      )}

      {suggestOpen && <SuggestTestModal initialName={query} onClose={() => setSuggestOpen(false)} />}
    </section>
  );
}
