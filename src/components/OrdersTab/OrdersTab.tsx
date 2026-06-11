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
} from "@/icons/components";
import {
  OrderDraftCheckout,
  OrderDraftDock,
  OrderDraftRail,
  formatMoney,
  orderBundles,
  orderCategories,
  orderItems,
  specimenFilters,
  suggestedOrders,
  useOrderDraft,
} from "@/components/OrderDraft";
import type {
  OrderBundle,
  OrderCategoryId,
  OrderFilterId,
  OrderItem,
  OrderSpecimenId,
  SuggestedOrder,
} from "@/components/OrderDraft";
import "./OrdersTab.css";

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

  return [item.name, item.code, item.note, item.alert, categoryLabel, item.specimens.join(" ")]
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
  item: Pick<OrderItem, "id" | "name" | "alert"> &
    Partial<Pick<OrderItem, "code" | "tat" | "prep" | "unavailable">> & {
      description?: string;
      tone?: SuggestedOrder["tone"];
    };
  variant?: "default" | "suggested";
  onToggle: () => void;
}) {
  const unavailable = item.unavailable;
  const meta = [item.code, item.tat, item.prep].filter(Boolean).join(" · ");

  return (
    <div
      className={cx(
        "orders-item-tile",
        variant === "suggested" && "orders-item-tile-suggested",
        checked && "is-selected",
        unavailable && "is-unavailable",
      )}
    >
      <Checkbox
        aria-label={item.name}
        checked={checked}
        disabled={!!unavailable}
        onChange={onToggle}
        label={
          <span className="orders-item-copy">
            <span className="orders-item-name">{item.name}</span>
            {(item.description || item.alert) && (
              <span className={cx("orders-item-note", item.tone && `tone-${item.tone}`)}>{item.description ?? item.alert}</span>
            )}
            {unavailable ? (
              <span className="orders-item-note tone-warning">{unavailable.reason}</span>
            ) : (
              meta &&
              variant !== "suggested" && <span className="orders-item-meta">{meta}</span>
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
  membersInCart,
  onToggle,
}: {
  bundle: OrderBundle;
  checked: boolean;
  /* members already in the draft as individual tests (partially-in-cart) */
  membersInCart: number;
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
          {!checked && membersInCart > 0 && (
            <span className="orders-bundle-overlap">
              {membersInCart} of {bundle.testCount} already in draft
            </span>
          )}
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
  selectedOrderIds: ReadonlySet<string>;
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
  const { selectedIds: selectedOrderIds, toggleCatalogItem } = useOrderDraft();
  const [query, setQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState<Set<OrderFilterId>>(new Set());
  const [activeSpecimens, setActiveSpecimens] = useState<Set<OrderSpecimenId>>(new Set());
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

  const toggleOrder = (id: string) => {
    setDraftSaved(false);
    toggleCatalogItem(id);
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
                  membersInCart={bundle.memberItemIds.filter((id) => selectedOrderIds.has(id)).length}
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

      <div aria-hidden className="odr-rail-divider" />
      <OrderDraftRail ctaSlot={<OrderDraftCheckout />} emptyHint="Tick tests in the catalog to add them." />
      <OrderDraftDock ctaSlot={<OrderDraftCheckout />} emptyHint="Tick tests in the catalog to add them." />
    </section>
  );
}
