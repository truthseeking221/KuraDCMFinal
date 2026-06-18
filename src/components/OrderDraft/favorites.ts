"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { orderItemById } from "./catalog";
import type { OrderItem } from "./catalog";

const ORDER_FAVORITES_KEY = "kura.orderFavorites.v1";
const ORDER_FAVORITES_EVENT = "kura:order-favorites-change";
const SERVER_FAVORITE_IDS: string[] = [];

let favoriteIdsSnapshot: string[] | null = null;
const favoriteListeners = new Set<() => void>();
let listeningToWindowFavorites = false;

function normalizeFavoriteIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  const ids: string[] = [];
  for (const entry of value) {
    if (typeof entry !== "string" || seen.has(entry) || !orderItemById.has(entry)) continue;
    seen.add(entry);
    ids.push(entry);
  }
  return ids;
}

function readFavoriteIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(ORDER_FAVORITES_KEY);
    return raw ? normalizeFavoriteIds(JSON.parse(raw)) : [];
  } catch {
    return [];
  }
}

function writeFavoriteIds(ids: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ORDER_FAVORITES_KEY, JSON.stringify(ids));
  } catch {
    /* storage unavailable (private mode) — favorites stay in-memory for this tab */
  }
}

function getFavoriteIdsSnapshot() {
  if (favoriteIdsSnapshot === null) {
    favoriteIdsSnapshot = readFavoriteIds();
  }
  return favoriteIdsSnapshot;
}

function getFavoriteIdsServerSnapshot() {
  return SERVER_FAVORITE_IDS;
}

function notifyFavoriteListeners() {
  favoriteListeners.forEach((listener) => listener());
}

function syncFavoriteIdsFromEvent(event?: Event) {
  const detail = event instanceof CustomEvent ? event.detail : null;
  favoriteIdsSnapshot = Array.isArray(detail) ? normalizeFavoriteIds(detail) : readFavoriteIds();
  notifyFavoriteListeners();
}

function ensureFavoriteWindowListeners() {
  if (typeof window === "undefined" || listeningToWindowFavorites) return;
  window.addEventListener(ORDER_FAVORITES_EVENT, syncFavoriteIdsFromEvent);
  window.addEventListener("storage", syncFavoriteIdsFromEvent);
  listeningToWindowFavorites = true;
}

function releaseFavoriteWindowListenersIfIdle() {
  if (typeof window === "undefined" || !listeningToWindowFavorites || favoriteListeners.size > 0) return;
  window.removeEventListener(ORDER_FAVORITES_EVENT, syncFavoriteIdsFromEvent);
  window.removeEventListener("storage", syncFavoriteIdsFromEvent);
  listeningToWindowFavorites = false;
}

function subscribeFavoriteIds(listener: () => void) {
  favoriteListeners.add(listener);
  ensureFavoriteWindowListeners();

  return () => {
    favoriteListeners.delete(listener);
    releaseFavoriteWindowListenersIfIdle();
  };
}

function updateFavoriteIds(updater: (current: string[]) => string[]) {
  const normalized = normalizeFavoriteIds(updater(getFavoriteIdsSnapshot()));
  favoriteIdsSnapshot = normalized;
  writeFavoriteIds(normalized);
  notifyFavoriteListeners();
}

export function panelBiomarkerLabel(item: OrderItem): string | null {
  const count = item.analytes?.length ?? 0;
  if (count === 0) return null;
  return String(count);
}

export function useFavoriteOrderItems() {
  const favoriteIds = useSyncExternalStore(
    subscribeFavoriteIds,
    getFavoriteIdsSnapshot,
    getFavoriteIdsServerSnapshot,
  );

  const favoriteIdSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);
  const favoriteItems = useMemo(
    () => favoriteIds.map((id) => orderItemById.get(id)).filter((item): item is OrderItem => Boolean(item)),
    [favoriteIds],
  );

  const toggleFavorite = useCallback((id: string) => {
    updateFavoriteIds((current) =>
      current.includes(id) ? current.filter((favoriteId) => favoriteId !== id) : [id, ...current],
    );
  }, []);

  const removeFavorite = useCallback((id: string) => {
    updateFavoriteIds((current) => current.filter((favoriteId) => favoriteId !== id));
  }, []);

  return {
    favoriteIds,
    favoriteIdSet,
    favoriteItems,
    removeFavorite,
    toggleFavorite,
  };
}
