/* Smart Order-Set detection — pure, deterministic, no React, no UI.

   A "frequent set" is a clinician-recognisable cluster of catalog tests the
   doctor tends to order together (Diabetes follow-up, CKD monitoring, …). When
   the active draft already contains every member of one of these sets we offer
   a one-tap "Save as Quick Set" — turning an ad-hoc multi-select into a reusable
   shortcut (the existing UserBundle save path). Detection is read-only: it never
   mutates the draft or the saved-set store. */

import { orderItemById } from "./catalog";
import type { OrderDraftLine } from "./types";

export type FrequentSet = {
  id: string;
  title: string;
  /* catalog item ids that define the set — all must be present in the draft */
  itemIds: string[];
};

export type QuickSetSuggestion = {
  id: string;
  title: string;
  itemIds: string[];
};

/* Seeded frequent sets keyed to real catalog ids (see catalog.ts). Order is
   stable and the lists are deterministic — no randomness, no dates. Each member
   id is guaranteed to resolve in the catalog, so a suggestion never references a
   phantom test. Minimum size is enforced by MIN_SET_SIZE at detection time. */
export const FREQUENT_SETS: FrequentSet[] = [
  {
    id: "freq-diabetes-followup",
    title: "Diabetes follow-up",
    itemIds: ["hba1c", "fasting-glucose", "lipid-panel", "creatinine-egfr"],
  },
  {
    id: "freq-ckd-monitoring",
    title: "CKD monitoring",
    itemIds: ["creatinine-egfr", "urea-bun", "microalbumin", "albumin-creatinine-ratio"],
  },
  {
    id: "freq-lipid-cvd",
    title: "Lipid / CVD risk",
    itemIds: ["lipid-panel", "hs-crp", "hba1c"],
  },
];

/* A set is only worth offering once the draft covers at least this many of its
   tests — below this the "set" is just one or two coincidental lines. */
export const MIN_SET_SIZE = 3;

/* The minimal shape detection needs from a saved set, so callers can pass the
   user's saved UserBundles without importing the full type. */
export type SavedSetLike = { memberItemIds: string[] };

/* True when two id lists describe the same set of catalog tests (order- and
   duplicate-insensitive). Used to suppress re-suggesting a set the doctor has
   already saved. */
function sameItemSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const setB = new Set(b);
  return a.every((id) => setB.has(id));
}

/* Returns the highest-priority frequent set the draft is a SUPERSET of (every
   member present), that has at least MIN_SET_SIZE members and isn't already in
   `knownSets`. Deterministic: walks FREQUENT_SETS in declared order and returns
   the first match. null when nothing qualifies. */
export function detectQuickSetSuggestion(
  lines: OrderDraftLine[],
  knownSets: SavedSetLike[],
): QuickSetSuggestion | null {
  const draftItemIds = new Set(
    lines
      .map((line) => line.itemId)
      .filter((id): id is string => typeof id === "string" && orderItemById.has(id)),
  );
  if (draftItemIds.size < MIN_SET_SIZE) return null;

  for (const set of FREQUENT_SETS) {
    if (set.itemIds.length < MIN_SET_SIZE) continue;
    const covered = set.itemIds.every((id) => draftItemIds.has(id));
    if (!covered) continue;
    const alreadySaved = knownSets.some((saved) => sameItemSet(saved.memberItemIds, set.itemIds));
    if (alreadySaved) continue;
    return { id: set.id, title: set.title, itemIds: [...set.itemIds] };
  }
  return null;
}
