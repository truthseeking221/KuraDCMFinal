"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  orderItemById,
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
import { getItemFlags, TestIndicatorGroup } from "./TestIndicatorGroup";
import { TestContextPopover, useHoverFocusPopover } from "./TestContextPopover";
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

function OrderToggleIndicator({ checked }: { checked: boolean }) {
  return (
    <span aria-hidden className={cx("orders-add-button", checked && "is-selected")}>
      {checked ? <CheckIcon size={14} variant="stroke" /> : <PlusIcon size={14} variant="stroke" />}
    </span>
  );
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
  highlighted = false,
  item,
  onToggle,
}: {
  checked: boolean;
  /* brief emphasis after a global-search jump scrolls this tile into view */
  highlighted?: boolean;
  item: OrderItem;
  onToggle: () => void;
}) {
  /* Unavailable rows are not orderable but stay focusable/hoverable (aria-
     disabled, not `disabled`) so the doctor can still read *why* via the flag
     tooltip and the detail popover. */
  const blocked = !!item.unavailable;
  const flags = getItemFlags(item);
  const { open, dismiss, wrapperProps, triggerProps } = useHoverFocusPopover(`tile:${item.id}`);
  const ref = useRef<HTMLButtonElement>(null);

  return (
    <div className="orders-item" {...wrapperProps}>
      <button
        aria-disabled={blocked || undefined}
        aria-label={`${checked ? "Remove" : "Add"} ${item.name}`}
        aria-pressed={checked}
        className={cx(
          "orders-item-tile",
          checked && "is-selected",
          blocked && "is-unavailable",
          highlighted && "is-search-hit",
        )}
        id={`order-item-${item.id}`}
        onClick={() => {
          if (!blocked) {
            onToggle();
            dismiss();
          }
        }}
        ref={ref}
        type="button"
        {...triggerProps}
      >
        <span aria-hidden className={cx("orders-item-check", checked && "is-selected")}>
          {checked && <CheckIcon size={14} variant="stroke" />}
        </span>
        <span className="orders-item-name">{item.name}</span>
        <TestIndicatorGroup flags={flags} />
      </button>
      {open && <TestContextPopover item={item} anchorRef={ref} />}
    </div>
  );
}

/* Dense suggested chip: name + subtle signal flag + add affordance. The reason
   ("No repeat since Jan 2026", "155.52 mg/g · improving") lives in the same
   hover/focus popover as the catalog rows, not a full card line. */
function SuggestedChip({
  added,
  onToggle,
  suggestion,
}: {
  added: boolean;
  onToggle: (id: string) => void;
  suggestion: SuggestedOrder;
}) {
  const item = orderItemById.get(suggestion.targetId);
  const flags = item ? getItemFlags(item) : [];
  const { open, dismiss, wrapperProps, triggerProps } = useHoverFocusPopover(`chip:${suggestion.id}`);
  const ref = useRef<HTMLButtonElement>(null);

  return (
    <div className="orders-suggest-chip-wrap" {...wrapperProps}>
      <button
        aria-label={`${added ? "Remove" : "Add"} ${suggestion.title} — ${suggestion.description}`}
        aria-pressed={added}
        className={cx("orders-suggest-chip", `tone-${suggestion.tone}`, added && "is-selected")}
        onClick={() => {
          onToggle(suggestion.targetId);
          dismiss();
        }}
        ref={ref}
        type="button"
        {...triggerProps}
      >
        <span className="orders-suggest-chip-copy">
          <span className="orders-suggest-chip-name">{suggestion.title}</span>
          <span className={cx("orders-suggest-chip-reason", `tone-${suggestion.tone}`)}>
            {suggestion.description}
          </span>
        </span>
        <TestIndicatorGroup flags={flags} />
        <span aria-hidden className={cx("orders-add-button", added && "is-selected")}>
          {added ? <CheckIcon size={14} variant="stroke" /> : <PlusIcon size={14} variant="stroke" />}
        </span>
      </button>
      {open && item && <TestContextPopover item={item} anchorRef={ref} />}
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

/* Why this bundle for *this* patient: count members that carry an abnormal /
   repeat-due signal from the shared lab model. Earns the card's footprint. */
function bundleRelevance(bundle: OrderBundle): string | null {
  const ctxMap = getItemLabContexts();
  const flagged = bundle.memberItemIds.filter((id) => {
    const ctx = ctxMap.get(id);
    return ctx && (ctx.tone === "danger" || ctx.tone === "warning");
  }).length;
  return flagged > 0 ? `Covers ${flagged} flagged for Sokha` : null;
}

function BundleCard({
  bundle,
  checked,
  membersInCart,
  relevance,
  onToggle,
}: {
  bundle: OrderBundle;
  checked: boolean;
  /* members already in the draft as individual tests (partially-in-cart) */
  membersInCart: number;
  /* per-patient justification line ("Covers 2 flagged for Sokha") */
  relevance?: string | null;
  onToggle: () => void;
}) {
  return (
    <button
      aria-label={`${checked ? "Remove" : "Add"} ${bundle.name}`}
      aria-pressed={checked}
      className={cx("orders-bundle-card", checked && "is-selected")}
      onClick={onToggle}
      type="button"
    >
      <BundleIllustration bundleId={bundle.id} />
      <div className="orders-bundle-copy">
        <div className="orders-bundle-title-row">
          <strong>{bundle.name}</strong>
          <span className="orders-bundle-count">{bundle.testCount} tests</span>
          <span className="orders-bundle-price">{formatMoney(bundle.price)}</span>
        </div>
        {relevance && <span className="orders-bundle-relevance">{relevance}</span>}
        <span className="orders-bundle-tags-text">
          {bundle.tags.join(" · ")}
          {!checked && membersInCart > 0 && (
            <span className="orders-bundle-overlap"> · {membersInCart} of {bundle.testCount} already in draft</span>
          )}
        </span>
      </div>
      <OrderToggleIndicator checked={checked} />
    </button>
  );
}

function OrderSection({
  collapsed,
  highlightedItemId,
  items,
  selectedOrderIds,
  title,
  onToggle,
  onToggleItem,
}: {
  collapsed: boolean;
  highlightedItemId?: string | null;
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
              highlighted={item.id === highlightedItemId}
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

/* The catalog surface, shared by two entry points into the *same* OrderDraft:
   the patient-record Orders tab ("record") and the sidebar Catalog page
   ("standalone"). Both read/write one draft via useOrderDraft — no second cart,
   no second checkout. Standalone only adds a patient-context banner so the
   browse view stays anchored to who the order is for. */
export function OrderCatalogWorkspace({
  mode = "record",
  patientName,
  searchIntent = null,
  onSearchIntentHandled,
}: {
  /* "record" = inside a patient chart; "standalone" = sidebar Catalog page */
  mode?: "record" | "standalone";
  /* whose draft this catalog feeds — shown as context in standalone mode */
  patientName?: string;
  /* from global search: pre-fill the catalog query and reveal one tile */
  searchIntent?: { query: string; itemId: string } | null;
  onSearchIntentHandled?: () => void;
} = {}) {
  const { selectedIds: selectedOrderIds, toggleCatalogItem } = useOrderDraft();
  const standalone = mode === "standalone";
  /* A global-search landing seeds the catalog state at mount — the record
     page remounts this tab per search jump, so no state sync is needed. */
  const [query, setQuery] = useState(searchIntent?.query ?? "");
  const [activeFilters, setActiveFilters] = useState<Set<OrderFilterId>>(new Set());
  const [activeSpecimens, setActiveSpecimens] = useState<Set<OrderSpecimenId>>(new Set());
  const [collapsedSections, setCollapsedSections] = useState<Set<OrderCategoryId>>(new Set());
  const [searchHitItemId, setSearchHitItemId] = useState<string | null>(searchIntent?.itemId ?? null);

  /* Scroll the matched tile into view, hold a short emphasis, then release
     the intent so tab switches don't replay it. */
  useEffect(() => {
    if (!searchHitItemId) return;

    const scrollTimer = window.setTimeout(() => {
      document
        .getElementById(`order-item-${searchHitItemId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 80);
    const clearTimer = window.setTimeout(() => {
      setSearchHitItemId(null);
      onSearchIntentHandled?.();
    }, 2200);

    return () => {
      window.clearTimeout(scrollTimer);
      window.clearTimeout(clearTimer);
    };
  }, [searchHitItemId, onSearchIntentHandled]);

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
      aria-label={standalone ? "Lab catalog" : undefined}
      aria-labelledby={standalone ? undefined : "record-tab-orders"}
      className={cx("orders-tab", standalone && "orders-tab--standalone")}
      id={standalone ? undefined : "record-panel-orders"}
      role={standalone ? "region" : "tabpanel"}
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
        {standalone && (
          <div className="orders-standalone-banner">
            <span className="orders-standalone-context">
              <FlaskIcon size={14} variant="twotone" />
              Lab catalog
            </span>
            {patientName ? (
              <span className="orders-standalone-patient">
                Ordering for <strong>{patientName}</strong>
              </span>
            ) : (
              <span className="orders-standalone-patient orders-standalone-nopatient">
                Select a patient to create an order
              </span>
            )}
          </div>
        )}
        <div className="orders-toolbar">
          <Search
            aria-label="Search order catalog"
            containerClassName="orders-search"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search..."
            value={query}
          />
        </div>

        {/* dense suggested strip — one quiet row of chips; each chip's reason
            lives in the shared hover/focus popover, not a full card line */}
        <section className="orders-suggested" aria-label="Suggested orders">
          <div className="orders-suggested-head">
            <span className="orders-section-label orders-suggested-label">
              <FlaskIcon size={14} variant="twotone" />
              Suggested for Sokha
            </span>
            <Counter count={suggestedOrders.length} />
          </div>
          <div className="orders-suggested-chips">
            {suggestedOrders.map((suggestion) => (
              <SuggestedChip
                added={selectedOrderIds.has(suggestion.targetId)}
                key={suggestion.id}
                onToggle={toggleOrder}
                suggestion={suggestion}
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
                  relevance={bundleRelevance(bundle)}
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
                highlightedItemId={searchHitItemId}
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

/* Thin alias kept for the patient-record Orders tab — the catalog workspace in
   its in-chart mode. The sidebar Catalog page renders OrderCatalogWorkspace with
   mode="standalone" directly. */
export function OrdersTab(props: {
  searchIntent?: { query: string; itemId: string } | null;
  onSearchIntentHandled?: () => void;
} = {}) {
  return <OrderCatalogWorkspace mode="record" {...props} />;
}
