/* Minimal tube-set derivation for in-clinic draws: group every test in the
   draft into the fewest tubes. Display heuristic for the prototype:
     hematology (CBC, ESR, …)  → EDTA purple 3 mL
     any urine-specimen test   → urine cup 10 mL
     everything else (chemistry / serology / endocrine) → SST gold 5 mL
   Unlisted lab tests fall back by their lab section (URINE… → cup, else SST). */

import { orderBundleById, orderItemById } from "./catalog";
import type { OrderDraftLine, TubeKind, TubeSpec } from "./types";

const TUBE_META: Record<TubeKind, { name: string }> = {
  edta: { name: "EDTA purple · 3 mL" },
  sst: { name: "SST gold · 5 mL" },
  urine: { name: "Urine cup · 10 mL" },
};

function tubeForItemId(itemId: string): TubeKind {
  const item = orderItemById.get(itemId);
  if (!item) return "sst";
  if (item.specimens.includes("urine")) return "urine";
  /* HbA1c is a whole-blood assay — EDTA, like the hematology panel */
  if (item.categoryId === "hematology" || itemId === "hba1c") return "edta";
  return "sst";
}

export function tubesForLines(lines: OrderDraftLine[]): TubeSpec[] {
  const buckets = new Map<TubeKind, string[]>();
  const put = (kind: TubeKind, testName: string) => {
    const list = buckets.get(kind) ?? [];
    if (!list.includes(testName)) list.push(testName);
    buckets.set(kind, list);
  };

  for (const line of lines) {
    if (line.kind === "bundle" && line.itemId) {
      const bundle = orderBundleById.get(line.itemId);
      for (const memberId of bundle?.memberItemIds ?? []) {
        const member = orderItemById.get(memberId);
        if (member) put(tubeForItemId(memberId), member.name);
      }
    } else if (line.kind === "test" && line.itemId) {
      put(tubeForItemId(line.itemId), line.displayName);
    } else {
      /* unlisted — infer from the lab section in the row key */
      const labKey = line.labRefs[0]?.labKey ?? "";
      put(labKey.startsWith("URINE") || labKey.startsWith("CYTOLOGY") ? "urine" : "sst", line.displayName);
    }
  }

  const order: TubeKind[] = ["edta", "sst", "urine"];
  return order
    .filter((kind) => buckets.has(kind))
    .map((kind) => ({
      id: kind,
      kind,
      name: TUBE_META[kind].name,
      tests: buckets.get(kind) as string[],
    }));
}
