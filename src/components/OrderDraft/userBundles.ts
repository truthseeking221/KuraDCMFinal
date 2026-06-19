"use client";

/* Doctor-authored bundles — a saved multi-select shortcut, NOT a priced panel.
   Adding one expands to its member tests as ordinary catalog lines (honest
   per-test pricing, no bundle-line / tube plumbing). localStorage-backed,
   cross-tab synced. Mirrors the favorites store. */

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { orderItemById } from "./catalog";

const USER_BUNDLES_KEY = "kura.userBundles.v1";
const USER_BUNDLES_EVENT = "kura:user-bundles-change";
const SERVER_USER_BUNDLES: UserBundle[] = [];

export type UserBundle = {
  id: string;
  name: string;
  /* catalog item ids the bundle adds to the cart, in pick order */
  memberItemIds: string[];
};

let userBundlesSnapshot: UserBundle[] | null = null;
const userBundleListeners = new Set<() => void>();
let listeningToWindow = false;
let idCounter = 0;

function newBundleId(): string {
  idCounter += 1;
  const stamp = typeof Date !== "undefined" ? Date.now().toString(36) : "0";
  return `ub_${stamp}_${idCounter.toString(36)}`;
}

/* A bundle survives normalization only with a usable name and ≥1 member that
   still exists in the catalog — members are filtered + de-duped so a renamed or
   retired test can never resurrect as a phantom line. */
function normalizeUserBundles(value: unknown): UserBundle[] {
  if (!Array.isArray(value)) return [];
  const seenIds = new Set<string>();
  const out: UserBundle[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const { id, name, memberItemIds } = entry as Partial<UserBundle>;
    if (typeof id !== "string" || seenIds.has(id)) continue;
    if (typeof name !== "string" || !name.trim()) continue;
    if (!Array.isArray(memberItemIds)) continue;

    const seenMembers = new Set<string>();
    const members: string[] = [];
    for (const memberId of memberItemIds) {
      if (typeof memberId !== "string" || seenMembers.has(memberId) || !orderItemById.has(memberId)) continue;
      seenMembers.add(memberId);
      members.push(memberId);
    }
    if (!members.length) continue;

    seenIds.add(id);
    out.push({ id, name: name.trim(), memberItemIds: members });
  }
  return out;
}

function readUserBundles(): UserBundle[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(USER_BUNDLES_KEY);
    return raw ? normalizeUserBundles(JSON.parse(raw)) : [];
  } catch {
    return [];
  }
}

function writeUserBundles(bundles: UserBundle[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(USER_BUNDLES_KEY, JSON.stringify(bundles));
  } catch {
    /* storage unavailable (private mode) — bundles stay in-memory for this tab */
  }
}

function getUserBundlesSnapshot() {
  if (userBundlesSnapshot === null) {
    userBundlesSnapshot = readUserBundles();
  }
  return userBundlesSnapshot;
}

function getUserBundlesServerSnapshot() {
  return SERVER_USER_BUNDLES;
}

function notifyUserBundleListeners() {
  userBundleListeners.forEach((listener) => listener());
}

function syncUserBundlesFromEvent(event?: Event) {
  const detail = event instanceof CustomEvent ? event.detail : null;
  userBundlesSnapshot = Array.isArray(detail) ? normalizeUserBundles(detail) : readUserBundles();
  notifyUserBundleListeners();
}

function ensureWindowListeners() {
  if (typeof window === "undefined" || listeningToWindow) return;
  window.addEventListener(USER_BUNDLES_EVENT, syncUserBundlesFromEvent);
  window.addEventListener("storage", syncUserBundlesFromEvent);
  listeningToWindow = true;
}

function releaseWindowListenersIfIdle() {
  if (typeof window === "undefined" || !listeningToWindow || userBundleListeners.size > 0) return;
  window.removeEventListener(USER_BUNDLES_EVENT, syncUserBundlesFromEvent);
  window.removeEventListener("storage", syncUserBundlesFromEvent);
  listeningToWindow = false;
}

function subscribeUserBundles(listener: () => void) {
  userBundleListeners.add(listener);
  ensureWindowListeners();
  return () => {
    userBundleListeners.delete(listener);
    releaseWindowListenersIfIdle();
  };
}

function commitUserBundles(next: UserBundle[]) {
  const normalized = normalizeUserBundles(next);
  userBundlesSnapshot = normalized;
  writeUserBundles(normalized);
  /* same-tab listeners update synchronously; the event also reaches any other
     hook instance without waiting for the storage event (which never fires in
     the originating tab) */
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(USER_BUNDLES_EVENT, { detail: normalized }));
  } else {
    notifyUserBundleListeners();
  }
}

export function useUserBundles() {
  const bundles = useSyncExternalStore(
    subscribeUserBundles,
    getUserBundlesSnapshot,
    getUserBundlesServerSnapshot,
  );

  const createBundle = useCallback((name: string, memberItemIds: string[]) => {
    const id = newBundleId();
    commitUserBundles([{ id, name, memberItemIds }, ...getUserBundlesSnapshot()]);
    return id;
  }, []);

  const updateBundle = useCallback(
    (id: string, patch: { name?: string; memberItemIds?: string[] }) => {
      commitUserBundles(
        getUserBundlesSnapshot().map((bundle) =>
          bundle.id === id ? { ...bundle, ...patch } : bundle,
        ),
      );
    },
    [],
  );

  const removeBundle = useCallback((id: string) => {
    commitUserBundles(getUserBundlesSnapshot().filter((bundle) => bundle.id !== id));
  }, []);

  return useMemo(
    () => ({ bundles, createBundle, updateBundle, removeBundle }),
    [bundles, createBundle, updateBundle, removeBundle],
  );
}
