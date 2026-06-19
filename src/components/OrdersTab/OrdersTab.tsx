"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from "react";
import {
  Checkbox,
  Counter,
  Search,
  Tooltip,
} from "@/components/ui";
import { cx } from "@/lib/cx";
import {
  Check as CheckIcon,
  ChevronDown as ChevronDownIcon,
  Flask as FlaskIcon,
  Heart as HeartIcon,
} from "@/icons/components";
import {
  OrderDraftCheckout,
  OrderDraftDock,
  OrderDraftRail,
  orderBundles,
  orderCategories,
  orderItemById,
  orderItems,
  specimenFilters,
  suggestedOrders,
  useOrderDraft,
} from "@/components/OrderDraft";
import { panelBiomarkerLabel, useFavoriteOrderItems } from "@/components/OrderDraft/favorites";
import { getBundleToneClassName } from "@/components/OrderDraft/bundleTone";
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

type OrderFilterSelection = OrderFilterId | "favorites";

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

function scrollRecommendationLane(track: { current: HTMLDivElement | null }, direction: -1 | 1) {
  const node = track.current;
  if (!node) return;
  node.scrollBy({ left: direction * Math.min(544, node.clientWidth), behavior: "smooth" });
}

function OrderToggleIndicator({ checked }: { checked: boolean }) {
  return (
    <span aria-hidden className={cx("orders-add-button", checked && "is-selected")}>
      {checked && <CheckIcon size={14} variant="stroke" />}
    </span>
  );
}

function RecommendationLaneControls({
  label,
  trackRef,
}: {
  label: string;
  trackRef: { current: HTMLDivElement | null };
}) {
  return (
    <div className="orders-lane-controls" aria-label={`${label} carousel controls`}>
      <button aria-label={`Previous ${label}`} onClick={() => scrollRecommendationLane(trackRef, -1)} type="button">
        <ChevronDownIcon aria-hidden className="orders-lane-chevron is-prev" size={14} variant="stroke" />
      </button>
      <button aria-label={`Next ${label}`} onClick={() => scrollRecommendationLane(trackRef, 1)} type="button">
        <ChevronDownIcon aria-hidden className="orders-lane-chevron is-next" size={14} variant="stroke" />
      </button>
    </div>
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
  favorite,
  highlighted = false,
  item,
  onToggleFavorite,
  onToggle,
}: {
  checked: boolean;
  favorite: boolean;
  /* brief emphasis after a global-search jump scrolls this tile into view */
  highlighted?: boolean;
  item: OrderItem;
  onToggleFavorite: () => void;
  onToggle: () => void;
}) {
  /* Unavailable rows are not orderable but stay focusable/hoverable (aria-
     disabled, not `disabled`) so the doctor can still read *why* via the flag
     tooltip and the detail popover. */
  const blocked = !!item.unavailable;
  const flags = getItemFlags(item);
  const { open, dismiss, popoverProps, wrapperProps, triggerProps } = useHoverFocusPopover(`tile:${item.id}`);
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
        {...wrapperProps}
        {...triggerProps}
      >
        <span aria-hidden className={cx("orders-item-check", checked && "is-selected")}>
          {checked && <CheckIcon size={14} variant="stroke" />}
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
          <HeartIcon size={14} variant={favorite ? "solid" : "stroke"} />
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

/* Patient recommendation row: compact, scan-first, and still exposes the
   clinical signal without turning the catalog into a hero section. */
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
  const { open, dismiss, popoverProps, wrapperProps, triggerProps } = useHoverFocusPopover(`chip:${suggestion.id}`);
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
          <span className="orders-suggest-chip-reason-row">
            <span className={cx("orders-suggest-chip-reason", `tone-${suggestion.tone}`)}>
              {suggestion.description}
            </span>
            <TestIndicatorGroup flags={flags} />
          </span>
        </span>
        <OrderToggleIndicator checked={added} />
      </button>
      {open && item && (
        <TestContextPopover
          item={item}
          anchorRef={ref}
          hoverProps={popoverProps}
          selected={added}
          onToggle={() => onToggle(suggestion.targetId)}
        />
      )}
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
    <button
      aria-label={`${checked ? "Remove" : "Add"} ${bundle.name}`}
      aria-pressed={checked}
      className={cx("orders-bundle-card", getBundleToneClassName(bundle.id), checked && "is-selected")}
      onClick={onToggle}
      type="button"
    >
      <div className="orders-bundle-copy">
        <div className="orders-bundle-title-row">
          <strong>{bundle.name}</strong>
        </div>
        <span className="orders-bundle-tags-text">{bundle.tags.join(" · ")}</span>
      </div>
      <OrderToggleIndicator checked={checked} />
    </button>
  );
}

function OrderSection({
  collapsed,
  favoriteIds,
  highlightedItemId,
  items,
  selectedOrderIds,
  title,
  onToggle,
  onToggleFavorite,
  onToggleItem,
}: {
  collapsed: boolean;
  favoriteIds: ReadonlySet<string>;
  highlightedItemId?: string | null;
  items: OrderItem[];
  selectedOrderIds: ReadonlySet<string>;
  title: string;
  onToggle: () => void;
  onToggleFavorite: (id: string) => void;
  onToggleItem: (id: string) => void;
}) {
  return (
    <section className="orders-category-section">
      <button className="orders-section-heading" onClick={onToggle} type="button">
        <ChevronDownIcon className={cx(collapsed && "is-collapsed")} size={12} variant="stroke" />
        <span>{title}</span>
      </button>
      {!collapsed && (
        <div className="orders-item-grid">
          {items.map((item) => (
            <OrderItemTile
              checked={selectedOrderIds.has(item.id)}
              favorite={favoriteIds.has(item.id)}
              highlighted={item.id === highlightedItemId}
              item={item}
              key={item.id}
              onToggleFavorite={() => onToggleFavorite(item.id)}
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
  const { favoriteIdSet, favoriteItems, toggleFavorite } = useFavoriteOrderItems();
  const standalone = mode === "standalone";
  /* A global-search landing seeds the catalog state at mount — the record
     page remounts this tab per search jump, so no state sync is needed. */
  const [query, setQuery] = useState(searchIntent?.query ?? "");
  const [activeFilters, setActiveFilters] = useState<Set<OrderFilterSelection>>(new Set());
  const [activeSpecimens, setActiveSpecimens] = useState<Set<OrderSpecimenId>>(new Set());
  const [collapsedSections, setCollapsedSections] = useState<Set<OrderCategoryId>>(new Set());
  const [searchHitItemId, setSearchHitItemId] = useState<string | null>(searchIntent?.itemId ?? null);
  const suggestedTrackRef = useRef<HTMLDivElement>(null);
  const bundleTrackRef = useRef<HTMLDivElement>(null);

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
  const favoritesOnly = activeFilters.has("favorites");
  const bundlesOnly = !favoritesOnly && activeFilters.has("bundles") && !hasCategoryFilter;
  const showBundles = !favoritesOnly && (activeFilters.size === 0 || activeFilters.has("bundles") || activeFilters.has("all"));
  const showSuggested = !bundlesOnly;

  const visibleItems = useMemo(
    () => {
      if (bundlesOnly) return [];
      return orderItems.filter((item) => {
        const matchesCategory = !hasCategoryFilter || activeCategoryFilters.includes(item.categoryId) || activeFilters.has("all");
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

  const toggleOrder = (id: string) => {
    toggleCatalogItem(id);
  };

  const toggleFilter = (id: OrderFilterSelection) => {
    setActiveFilters((current) => {
      if (id === "all") return new Set();
      if (id === "favorites") return current.has("favorites") ? new Set() : new Set(["favorites"]);
      const next = toggleSetValue(current, id);
      next.delete("all");
      next.delete("favorites");
      return next;
    });
  };

  const clearFilters = () => {
    setActiveFilters(new Set());
    setActiveSpecimens(new Set());
    setQuery("");
  };

  const categoryOptionCount = (id: OrderFilterSelection) => {
    if (id === "all") return orderItems.length + orderBundles.length;
    if (id === "favorites") return favoriteItems.length;
    if (id === "bundles") return orderBundles.length;
    return orderItems.filter((item) => item.categoryId === id).length;
  };

  const emptyTitle = favoritesOnly
    ? favoriteItems.length > 0
      ? "No favorites match these filters"
      : "No favorite tests yet"
    : bundlesOnly
    ? "No matching bundles"
    : "No matching orders";
  const emptyHelp = favoritesOnly
    ? favoriteItems.length > 0
      ? "Try clearing specimen filters or search."
      : "Use the favorite action on any test to pin it here."
    : bundlesOnly
    ? "Try clearing specimen filters or search."
    : "Try clearing filters or searching a different test name.";

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
            <span>Shortcuts</span>
            <button onClick={clearFilters} type="button">
              Clear
            </button>
          </div>
          <div className="orders-filter-list">
            <OrderFilterOption
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

        <section className="orders-recommendations" aria-label="Order recommendations">
          {showSuggested && (
            <div className="orders-recommendation-lane orders-recommendation-lane--suggested" aria-labelledby="orders-suggested-title">
              <div className="orders-lane-head">
                <div className="orders-lane-title">
                  <h2 className="text-gradient-wizard" id="orders-suggested-title">
                    {standalone ? "Suggested" : "Suggested for Sokha"}
                  </h2>
                  <Counter count={suggestedOrders.length} />
                </div>
                <RecommendationLaneControls label="suggested tests" trackRef={suggestedTrackRef} />
              </div>
              <div className="orders-suggested-chips" ref={suggestedTrackRef}>
                {suggestedOrders.map((suggestion) => (
                  <SuggestedChip
                    added={selectedOrderIds.has(suggestion.targetId)}
                    key={suggestion.id}
                    onToggle={toggleOrder}
                    suggestion={suggestion}
                  />
                ))}
              </div>
            </div>
          )}

          {visibleBundles.length > 0 && (
            <div className="orders-recommendation-lane orders-recommendation-lane--bundles" aria-labelledby="orders-bundles-title">
              <div className="orders-lane-head">
                <div className="orders-lane-title">
                  <h2 id="orders-bundles-title">From Your Bundle</h2>
                  <Counter count={visibleBundles.length} />
                </div>
                <RecommendationLaneControls label="bundles" trackRef={bundleTrackRef} />
              </div>
              <div className="orders-bundle-list" ref={bundleTrackRef}>
                {visibleBundles.map((bundle) => (
                  <BundleCard
                    bundle={bundle}
                    checked={selectedOrderIds.has(bundle.id)}
                    key={bundle.id}
                    onToggle={() => toggleOrder(bundle.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </section>

        <div className="orders-catalog-sections">
          {orderCategories.map((category) => {
            const categoryItems = visibleItems.filter((item) => item.categoryId === category.id);
            if (categoryItems.length === 0) return null;
            return (
              <OrderSection
                collapsed={collapsedSections.has(category.id)}
                favoriteIds={favoriteIdSet}
                highlightedItemId={searchHitItemId}
                items={categoryItems}
                key={category.id}
                onToggle={() => setCollapsedSections((current) => toggleSetValue(current, category.id))}
                onToggleFavorite={toggleFavorite}
                onToggleItem={toggleOrder}
                selectedOrderIds={selectedOrderIds}
                title={category.label}
              />
            );
          })}
        </div>

        {visibleItems.length === 0 && visibleBundles.length === 0 && (
          <div className="orders-empty-state">
            <strong>{emptyTitle}</strong>
            <span>{emptyHelp}</span>
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
