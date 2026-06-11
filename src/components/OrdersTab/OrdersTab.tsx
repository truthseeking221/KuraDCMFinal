"use client";

import { useMemo, useState } from "react";
import {
  Badge,
  Button,
  Checkbox,
  Counter,
  Search,
} from "@/components/ui";
import { cx } from "@/lib/cx";
import {
  ArrowRight as ArrowRightIcon,
  Booking as BookingIcon,
  Check as CheckIcon,
  ChevronDown as ChevronDownIcon,
  Flask as FlaskIcon,
  Plus as PlusIcon,
  Refresh as RefreshIcon,
} from "@/icons/components";
import "./OrdersTab.css";

type OrderCategoryId =
  | "glycemic"
  | "lipids"
  | "renal"
  | "liver"
  | "hematology"
  | "endocrine";
type OrderFilterId = "all" | "bundles" | OrderCategoryId;
type OrderSpecimenId = "blood" | "urine" | "saliva" | "swab";

type OrderItem = {
  id: string;
  name: string;
  categoryId: OrderCategoryId;
  price: number;
  specimens: OrderSpecimenId[];
  note?: string;
  alert?: string;
};

type OrderBundle = {
  id: string;
  name: string;
  price: number;
  tags: string[];
  testCount: number;
  specimenIds: OrderSpecimenId[];
};

type SuggestedOrder = {
  id: string;
  title: string;
  description: string;
  tone: "danger" | "warning" | "info";
  targetId: string;
};

const orderCategories: Array<{ id: OrderCategoryId; label: string }> = [
  { id: "glycemic", label: "Glycemic control" },
  { id: "lipids", label: "Lipids" },
  { id: "renal", label: "Renal function" },
  { id: "liver", label: "Liver function" },
  { id: "hematology", label: "Hematology" },
  { id: "endocrine", label: "Endocrine" },
];

const specimenFilters: Array<{ id: OrderSpecimenId; label: string }> = [
  { id: "blood", label: "Blood" },
  { id: "urine", label: "Urine" },
  { id: "saliva", label: "Saliva" },
  { id: "swab", label: "Swab" },
];

const orderBundles: OrderBundle[] = [
  {
    id: "bundle-diabetes-panel",
    name: "Diabetes panel",
    price: 28,
    tags: ["HbA1c", "glucose", "microalb", "+1"],
    testCount: 4,
    specimenIds: ["blood", "urine"],
  },
  {
    id: "bundle-cardiac-panel",
    name: "Cardiac panel",
    price: 42,
    tags: ["lipid", "CBC", "troponin", "ECG", "+1"],
    testCount: 5,
    specimenIds: ["blood"],
  },
];

const orderItems: OrderItem[] = [
  {
    id: "hba1c",
    name: "HbA1c",
    categoryId: "glycemic",
    price: 8,
    specimens: ["blood"],
    alert: "Glycemic control - due",
  },
  { id: "fasting-glucose", name: "Fasting glucose", categoryId: "glycemic", price: 5, specimens: ["blood"] },
  { id: "ogtt", name: "OGTT (gestational)", categoryId: "glycemic", price: 18, specimens: ["blood"] },
  { id: "insulin", name: "Insulin", categoryId: "glycemic", price: 14, specimens: ["blood"] },
  { id: "c-peptide", name: "C-peptide", categoryId: "glycemic", price: 18, specimens: ["blood"] },
  { id: "fructosamine", name: "Fructosamine", categoryId: "glycemic", price: 14, specimens: ["blood"] },
  { id: "random-glucose", name: "Random glucose", categoryId: "glycemic", price: 5, specimens: ["blood"] },
  { id: "postprandial-glucose", name: "2h postprandial", categoryId: "glycemic", price: 5, specimens: ["blood"] },
  { id: "gad-antibodies", name: "GAD antibodies", categoryId: "glycemic", price: 24, specimens: ["blood"] },
  { id: "lipid-panel", name: "Lipid panel", categoryId: "lipids", price: 18, specimens: ["blood"], alert: "LDL was 162 mg/dL" },
  { id: "total-cholesterol", name: "Total cholesterol", categoryId: "lipids", price: 7, specimens: ["blood"] },
  { id: "ldl-c", name: "LDL-C", categoryId: "lipids", price: 7, specimens: ["blood"] },
  { id: "hdl-c", name: "HDL-C", categoryId: "lipids", price: 7, specimens: ["blood"] },
  { id: "triglycerides", name: "Triglycerides", categoryId: "lipids", price: 7, specimens: ["blood"] },
  { id: "apob", name: "Apolipoprotein B", categoryId: "lipids", price: 16, specimens: ["blood"] },
  { id: "lpa", name: "Lipoprotein(a)", categoryId: "lipids", price: 16, specimens: ["blood"] },
  { id: "apo-ai", name: "Apo AI", categoryId: "lipids", price: 16, specimens: ["blood"] },
  { id: "vldl", name: "VLDL", categoryId: "lipids", price: 8, specimens: ["blood"] },
  { id: "non-hdl", name: "Non-HDL cholesterol", categoryId: "lipids", price: 7, specimens: ["blood"] },
  { id: "creatinine-egfr", name: "Creatinine + eGFR", categoryId: "renal", price: 8, specimens: ["blood"] },
  { id: "urea-bun", name: "Urea (BUN)", categoryId: "renal", price: 7, specimens: ["blood"] },
  { id: "microalbumin", name: "Microalbumin", categoryId: "renal", price: 8, specimens: ["urine"], alert: "Early nephropathy" },
  { id: "cystatin-c", name: "Cystatin C", categoryId: "renal", price: 22, specimens: ["blood"] },
  { id: "uric-acid", name: "Uric acid", categoryId: "renal", price: 7, specimens: ["blood"] },
  { id: "electrolytes-panel", name: "Electrolytes panel", categoryId: "renal", price: 13, specimens: ["blood"] },
  { id: "albumin-creatinine-ratio", name: "Albumin/creatinine ratio", categoryId: "renal", price: 10, specimens: ["urine"] },
  { id: "phosphate", name: "Phosphate", categoryId: "renal", price: 7, specimens: ["blood"] },
  { id: "creatinine-clearance", name: "Creatinine clearance", categoryId: "renal", price: 16, specimens: ["blood", "urine"] },
  { id: "alt", name: "ALT", categoryId: "liver", price: 6, specimens: ["blood"] },
  { id: "ast", name: "AST", categoryId: "liver", price: 6, specimens: ["blood"] },
  { id: "alp", name: "ALP", categoryId: "liver", price: 6, specimens: ["blood"] },
  { id: "ggt", name: "GGT", categoryId: "liver", price: 8, specimens: ["blood"] },
  { id: "bilirubin-total", name: "Bilirubin total", categoryId: "liver", price: 6, specimens: ["blood"] },
  { id: "bilirubin-direct", name: "Bilirubin direct", categoryId: "liver", price: 6, specimens: ["blood"] },
  { id: "albumin", name: "Albumin", categoryId: "liver", price: 6, specimens: ["blood"] },
  { id: "total-protein", name: "Total protein", categoryId: "liver", price: 6, specimens: ["blood"] },
  { id: "pt-inr", name: "PT / INR", categoryId: "liver", price: 11, specimens: ["blood"] },
  { id: "cbc", name: "Complete blood count", categoryId: "hematology", price: 9, specimens: ["blood"] },
  { id: "esr", name: "ESR", categoryId: "hematology", price: 7, specimens: ["blood"] },
  { id: "ferritin", name: "Ferritin", categoryId: "hematology", price: 14, specimens: ["blood"] },
  { id: "iron-panel", name: "Iron panel", categoryId: "hematology", price: 18, specimens: ["blood"] },
  { id: "reticulocyte", name: "Reticulocyte", categoryId: "hematology", price: 10, specimens: ["blood"] },
  { id: "vitamin-b12", name: "Vitamin B12", categoryId: "hematology", price: 16, specimens: ["blood"] },
  { id: "folate", name: "Folate", categoryId: "hematology", price: 16, specimens: ["blood"] },
  { id: "transferrin", name: "Transferrin", categoryId: "hematology", price: 14, specimens: ["blood"] },
  { id: "haptoglobin", name: "Haptoglobin", categoryId: "hematology", price: 18, specimens: ["blood"] },
  { id: "tsh", name: "TSH", categoryId: "endocrine", price: 12, specimens: ["blood"] },
  { id: "free-t4", name: "Free T4", categoryId: "endocrine", price: 12, specimens: ["blood"] },
  { id: "free-t3", name: "Free T3", categoryId: "endocrine", price: 12, specimens: ["blood"] },
  { id: "cortisol", name: "Cortisol", categoryId: "endocrine", price: 16, specimens: ["blood", "saliva"] },
  { id: "vitamin-d", name: "Vitamin D (25-OH)", categoryId: "endocrine", price: 20, specimens: ["blood"] },
  { id: "pth", name: "PTH", categoryId: "endocrine", price: 22, specimens: ["blood"] },
  { id: "prolactin", name: "Prolactin", categoryId: "endocrine", price: 14, specimens: ["blood"] },
  { id: "testosterone", name: "Testosterone", categoryId: "endocrine", price: 18, specimens: ["blood"] },
  { id: "estradiol", name: "Estradiol", categoryId: "endocrine", price: 18, specimens: ["blood"] },
];

const suggestedOrders: SuggestedOrder[] = [
  {
    id: "suggest-hba1c",
    title: "HbA1c",
    description: "Glycemic control - due",
    tone: "danger",
    targetId: "hba1c",
  },
  {
    id: "suggest-lipid-panel",
    title: "Lipid panel",
    description: "LDL was 162 mg/dL",
    tone: "danger",
    targetId: "lipid-panel",
  },
  {
    id: "suggest-microalbumin",
    title: "Microalbumin",
    description: "Early nephropathy",
    tone: "danger",
    targetId: "microalbumin",
  },
];

const defaultSelectedOrderIds = new Set(["bundle-diabetes-panel", "hba1c", "lipid-panel"]);

function formatMoney(value: number) {
  return `$${value.toFixed(2)}`;
}

function toggleSetValue<T>(set: Set<T>, value: T) {
  const next = new Set(set);
  if (next.has(value)) {
    next.delete(value);
  } else {
    next.add(value);
  }
  return next;
}

function itemMatchesQuery(item: OrderItem, query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  const categoryLabel = orderCategories.find((category) => category.id === item.categoryId)?.label ?? "";

  return [item.name, item.note, item.alert, categoryLabel, item.specimens.join(" ")]
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

function matchesSpecimens(specimens: OrderSpecimenId[], activeSpecimens: Set<OrderSpecimenId>) {
  if (activeSpecimens.size === 0) return true;
  return specimens.some((specimen) => activeSpecimens.has(specimen));
}

function OrderFilterOption({
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
      <Checkbox
        checked={checked}
        label={<span>{label}</span>}
        onChange={onChange}
      />
      <Counter count={count} />
    </div>
  );
}

function OrderItemTile({
  checked,
  item,
  variant = "default",
  onToggle,
}: {
  checked: boolean;
  item: Pick<OrderItem, "id" | "name" | "alert"> & { description?: string; tone?: SuggestedOrder["tone"] };
  variant?: "default" | "suggested";
  onToggle: () => void;
}) {
  return (
    <div className={cx("orders-item-tile", variant === "suggested" && "orders-item-tile-suggested", checked && "is-selected")}>
      <Checkbox
        aria-label={item.name}
        checked={checked}
        onChange={onToggle}
        label={
          <span className="orders-item-copy">
            <span className="orders-item-name">{item.name}</span>
            {(item.description || item.alert) && (
              <span className={cx("orders-item-note", item.tone && `tone-${item.tone}`)}>{item.description ?? item.alert}</span>
            )}
          </span>
        }
      />
    </div>
  );
}

function BundleCard({
  bundle,
  checked,
  onToggle,
}: {
  bundle: OrderBundle;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <article className={cx("orders-bundle-card", checked && "is-selected")}>
      <div className="orders-bundle-icon" aria-hidden>
        <BookingIcon size={16} variant="twotone" />
      </div>
      <div className="orders-bundle-copy">
        <div className="orders-bundle-title-row">
          <strong>{bundle.name}</strong>
          <Badge tone="info">{bundle.testCount} tests</Badge>
          <span className="orders-bundle-price">{formatMoney(bundle.price)}</span>
        </div>
        <div className="orders-bundle-tags" aria-label={`${bundle.name} includes`}>
          {bundle.tags.map((tag) => (
            <Badge key={tag} tone="neutral">
              {tag}
            </Badge>
          ))}
        </div>
      </div>
      <button
        className="orders-add-button"
        aria-pressed={checked}
        aria-label={`${checked ? "Remove" : "Add"} ${bundle.name}`}
        onClick={onToggle}
        type="button"
      >
        {checked ? <CheckIcon size={14} variant="stroke" /> : <PlusIcon size={14} variant="stroke" />}
      </button>
    </article>
  );
}

function OrderSection({
  collapsed,
  items,
  selectedOrderIds,
  title,
  onToggle,
  onToggleItem,
}: {
  collapsed: boolean;
  items: OrderItem[];
  selectedOrderIds: Set<string>;
  title: string;
  onToggle: () => void;
  onToggleItem: (id: string) => void;
}) {
  return (
    <section className="orders-category-section">
      <button className="orders-section-heading" onClick={onToggle} type="button">
        <ChevronDownIcon className={cx(collapsed && "is-collapsed")} size={12} variant="stroke" />
        <span>{title}</span>
        <Counter count={items.length} />
      </button>
      {!collapsed && (
        <div className="orders-item-grid">
          {items.map((item) => (
            <OrderItemTile
              checked={selectedOrderIds.has(item.id)}
              item={item}
              key={item.id}
              onToggle={() => onToggleItem(item.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export function OrdersTab() {
  const [query, setQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState<Set<OrderFilterId>>(new Set());
  const [activeSpecimens, setActiveSpecimens] = useState<Set<OrderSpecimenId>>(new Set());
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(() => new Set(defaultSelectedOrderIds));
  const [collapsedSections, setCollapsedSections] = useState<Set<OrderCategoryId>>(new Set());
  const [draftSaved, setDraftSaved] = useState(true);

  const activeCategoryFilters = useMemo(
    () => orderCategories.filter((category) => activeFilters.has(category.id)).map((category) => category.id),
    [activeFilters],
  );
  const hasCategoryFilter = activeCategoryFilters.length > 0;
  const showBundles = activeFilters.size === 0 || activeFilters.has("bundles") || activeFilters.has("all");

  const visibleItems = useMemo(
    () =>
      orderItems.filter((item) => {
        const matchesCategory = !hasCategoryFilter || activeCategoryFilters.includes(item.categoryId) || activeFilters.has("all");
        return matchesCategory && matchesSpecimens(item.specimens, activeSpecimens) && itemMatchesQuery(item, query);
      }),
    [activeCategoryFilters, activeFilters, activeSpecimens, hasCategoryFilter, query],
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

  const selectedTotal = useMemo(() => {
    const bundleTotal = orderBundles.reduce((total, bundle) => total + (selectedOrderIds.has(bundle.id) ? bundle.price : 0), 0);
    const itemTotal = orderItems.reduce((total, item) => total + (selectedOrderIds.has(item.id) ? item.price : 0), 0);
    return bundleTotal + itemTotal;
  }, [selectedOrderIds]);

  const selectedCount = selectedOrderIds.size;

  const toggleOrder = (id: string) => {
    setDraftSaved(false);
    setSelectedOrderIds((current) => toggleSetValue(current, id));
  };

  const toggleFilter = (id: OrderFilterId) => {
    setActiveFilters((current) => {
      if (id === "all") return new Set();
      const next = toggleSetValue(current, id);
      next.delete("all");
      return next;
    });
  };

  const clearFilters = () => {
    setActiveFilters(new Set());
    setActiveSpecimens(new Set());
    setQuery("");
  };

  const saveDraft = () => {
    setDraftSaved(true);
  };

  const categoryOptionCount = (id: OrderFilterId) => {
    if (id === "all") return orderItems.length + orderBundles.length;
    if (id === "bundles") return orderBundles.length;
    return orderItems.filter((item) => item.categoryId === id).length;
  };

  return (
    <section
      aria-labelledby="record-tab-orders"
      className="orders-tab"
      id="record-panel-orders"
      role="tabpanel"
    >
      <aside className="orders-filter-sidebar" aria-label="Order filters">
        <div className="orders-filter-group">
          <div className="orders-filter-heading">
            <span>Categories</span>
            <button onClick={clearFilters} type="button">
              Clear
            </button>
          </div>
          <div className="orders-filter-list">
            <OrderFilterOption
              checked={activeFilters.size === 0}
              count={categoryOptionCount("all")}
              label="All"
              onChange={() => toggleFilter("all")}
            />
            <OrderFilterOption
              checked={activeFilters.has("bundles")}
              count={categoryOptionCount("bundles")}
              label="Bundles"
              onChange={() => toggleFilter("bundles")}
            />
            {orderCategories.map((category) => (
              <OrderFilterOption
                checked={activeFilters.has(category.id)}
                count={categoryOptionCount(category.id)}
                key={category.id}
                label={category.label}
                onChange={() => toggleFilter(category.id)}
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
              <OrderFilterOption
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

      <main className="orders-catalog" aria-label="Order catalog">
        <div className="orders-toolbar">
          <Search
            aria-label="Search order catalog"
            containerClassName="orders-search"
            onChange={(event) => setQuery(event.target.value)}
            onClear={() => setQuery("")}
            placeholder="Search..."
            value={query}
          />
          <div className="orders-toolbar-actions">
            <span className={cx("orders-draft-state", draftSaved && "is-saved")}>{draftSaved ? "Draft saved" : "Unsaved changes"}</span>
            <Badge tone={selectedCount > 0 ? "brand" : "neutral"}>{selectedCount} selected</Badge>
            <span className="orders-selected-total">{formatMoney(selectedTotal)}</span>
            <Button
              intent="secondary"
              size="sm"
              leadingIcon={<RefreshIcon size={14} variant="stroke" />}
              onClick={() => {
                setDraftSaved(false);
                setSelectedOrderIds(new Set());
              }}
            >
              Reset
            </Button>
            <Button
              intent="primary"
              size="sm"
              trailingIcon={<ArrowRightIcon size={14} variant="stroke" />}
              onClick={saveDraft}
            >
              Save draft
            </Button>
          </div>
        </div>

        <section className="orders-suggested-panel" aria-label="Suggested orders">
          <div className="orders-suggested-title">
            <FlaskIcon size={16} variant="twotone" />
            <strong>Suggested for Sokha</strong>
          </div>
          <div className="orders-suggested-grid">
            {suggestedOrders.map((suggestion) => (
              <OrderItemTile
                checked={selectedOrderIds.has(suggestion.targetId)}
                item={{
                  id: suggestion.id,
                  name: suggestion.title,
                  description: suggestion.description,
                  tone: suggestion.tone,
                }}
                key={suggestion.id}
                onToggle={() => toggleOrder(suggestion.targetId)}
                variant="suggested"
              />
            ))}
          </div>
        </section>

        {visibleBundles.length > 0 && (
          <section className="orders-bundles-section" aria-label="Bundles">
            <div className="orders-section-label">Bundles</div>
            <div className="orders-bundle-list">
              {visibleBundles.map((bundle) => (
                <BundleCard
                  bundle={bundle}
                  checked={selectedOrderIds.has(bundle.id)}
                  key={bundle.id}
                  onToggle={() => toggleOrder(bundle.id)}
                />
              ))}
            </div>
          </section>
        )}

        <div className="orders-catalog-sections">
          {orderCategories.map((category) => {
            const categoryItems = visibleItems.filter((item) => item.categoryId === category.id);
            if (categoryItems.length === 0) return null;
            return (
              <OrderSection
                collapsed={collapsedSections.has(category.id)}
                items={categoryItems}
                key={category.id}
                onToggle={() => setCollapsedSections((current) => toggleSetValue(current, category.id))}
                onToggleItem={toggleOrder}
                selectedOrderIds={selectedOrderIds}
                title={category.label}
              />
            );
          })}
        </div>

        {visibleItems.length === 0 && visibleBundles.length === 0 && (
          <div className="orders-empty-state">
            <strong>No matching orders</strong>
          <span>Try clearing filters or searching a different test name.</span>
        </div>
      )}
    </main>
    </section>
  );
}
