"use client";

import { useMemo, useState } from "react";
import {
  Checkbox,
  Counter,
  Search,
} from "@/components/ui";
import { cx } from "@/lib/cx";
import {
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
  getItemLabContexts,
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
  onToggle,
}: {
  checked: boolean;
  item: OrderItem;
  onToggle: () => void;
}) {
  const unavailable = item.unavailable;
  const meta = [item.code, item.tat, item.prep].filter(Boolean).join(" · ");
  /* live lab reason ("why re-order this?") beats the static alert */
  const labCtx = getItemLabContexts().get(item.id);

  return (
    <div className={cx("orders-item-tile", checked && "is-selected", unavailable && "is-unavailable")}>
      <Checkbox
        aria-label={item.name}
        checked={checked}
        disabled={!!unavailable}
        onChange={onToggle}
        label={
          <span className="orders-item-copy">
            <span className="orders-item-name">{item.name}</span>
            {labCtx ? (
              <span className={`orders-item-note tone-${labCtx.tone}`} title={labCtx.title}>
                {labCtx.text}
              </span>
            ) : (
              item.alert && <span className="orders-item-note tone-danger">{item.alert}</span>
            )}
            {unavailable ? (
              <span className="orders-item-note tone-warning">{unavailable.reason}</span>
            ) : (
              meta && <span className="orders-item-meta">{meta}</span>
            )}
          </span>
        }
      />
    </div>
  );
}

function BundleIllustration({ bundleId }: { bundleId: string }) {
  const isCardiac = bundleId.includes("cardiac");

  return (
    <span className={cx("orders-bundle-icon", isCardiac ? "orders-bundle-icon--cardiac" : "orders-bundle-icon--diabetes")} aria-hidden="true">
      {isCardiac ? (
        <svg viewBox="0 0 48 48" focusable="false">
          <path
            d="M24 35.5s-10.5-6.2-10.5-14.1c0-3.7 2.5-6.4 5.8-6.4 2 0 3.7 1 4.7 2.6 1-1.6 2.7-2.6 4.7-2.6 3.3 0 5.8 2.7 5.8 6.4C34.5 29.3 24 35.5 24 35.5Z"
            className="orders-bundle-icon-soft"
          />
          <path d="M13 25h5.5l2.2-4.4 4.3 8.3 2.6-4.9H35" />
          <path d="M24 35.5s-10.5-6.2-10.5-14.1c0-3.7 2.5-6.4 5.8-6.4 2 0 3.7 1 4.7 2.6 1-1.6 2.7-2.6 4.7-2.6 3.3 0 5.8 2.7 5.8 6.4C34.5 29.3 24 35.5 24 35.5Z" />
          <path d="M33 11.5h4.5a2.5 2.5 0 0 1 2.5 2.5v5" />
          <path d="M37.5 9v5" />
          <path d="M35 11.5h5" />
        </svg>
      ) : (
        <svg viewBox="0 0 48 48" focusable="false">
          <rect x="12" y="10" width="18" height="25" rx="5" className="orders-bundle-icon-soft" />
          <rect x="15.5" y="14" width="11" height="7" rx="2" />
          <path d="M17 25h8" />
          <path d="M17 29h6" />
          <path d="M17 33h4" />
          <path
            d="M35 21.5c3.3 3.6 5 6 5 8.5a5 5 0 0 1-10 0c0-2.5 1.7-4.9 5-8.5Z"
            className="orders-bundle-icon-soft"
          />
          <path d="M35 21.5c3.3 3.6 5 6 5 8.5a5 5 0 0 1-10 0c0-2.5 1.7-4.9 5-8.5Z" />
          <path d="M35 29v4" />
        </svg>
      )}
    </span>
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
      <BundleIllustration bundleId={bundle.id} />
      <div className="orders-bundle-copy">
        <div className="orders-bundle-title-row">
          <strong>{bundle.name}</strong>
          <span className="orders-bundle-count">{bundle.testCount} tests</span>
          <span className="orders-bundle-price">{formatMoney(bundle.price)}</span>
        </div>
        <span className="orders-bundle-tags-text">
          {bundle.tags.join(" · ")}
          {!checked && membersInCart > 0 && (
            <span className="orders-bundle-overlap"> · {membersInCart} of {bundle.testCount} already in draft</span>
          )}
        </span>
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
        </div>

        {/* one-tap suggestion pills — same affordance language as the Labs
            "Suggested: repeat X" chip; reason text is live lab context */}
        <section className="orders-suggested" aria-label="Suggested orders">
          <span className="orders-section-label orders-suggested-label">
            <FlaskIcon size={14} variant="twotone" />
            Suggested for Sokha
          </span>
          <div className="orders-suggested-row">
            {suggestedOrders.map((suggestion) => {
              const added = selectedOrderIds.has(suggestion.targetId);
              const labCtx = getItemLabContexts().get(suggestion.targetId);
              return (
                <button
                  aria-pressed={added}
                  className={cx("orders-suggest-pill", added && "is-added")}
                  key={suggestion.id}
                  onClick={() => toggleOrder(suggestion.targetId)}
                  title={labCtx?.title ?? suggestion.description}
                  type="button"
                >
                  {added ? <CheckIcon size={13} variant="stroke" /> : <PlusIcon size={13} variant="stroke" />}
                  <strong>{suggestion.title}</strong>
                  <span>{labCtx?.text ?? suggestion.description}</span>
                </button>
              );
            })}
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
