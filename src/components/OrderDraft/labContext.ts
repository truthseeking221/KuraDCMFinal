/* Reverse of LAB_TO_CATALOG: for each orderable item, the live lab reason
   that explains why it's worth (re-)ordering — derived from the same model
   the Labs tab renders, so the doctor never has to think back. Only rows
   that actually warrant action (out of range / follow-up due) produce a
   line; in-range tests stay quiet. */

import { getLabOrderContexts, type LabOrderContext } from "@/components/ui";
import { LAB_TO_CATALOG } from "./labMapping";

export type ItemLabContext = {
  text: string; /* "Creatinine 3.86 mg/dL — above range · further out" */
  short: string; /* tile copy: "3.86 mg/dL ↑ · further out" / "No repeat since Jan 2026" */
  tone: "danger" | "warning";
  title: string; /* full sentence for tooltips */
  labKey: string;
};

/* Terse one-line copy for suggestion tiles — value + direction arrow for
   out-of-range, repeat gap for follow-up-due. */
function shortFor(ctx: LabOrderContext): string {
  const parts = ctx.reasonText.split(" · ");
  if (ctx.group === "out") {
    const arrow = /above/i.test(parts[0]) ? " ↑" : /below/i.test(parts[0]) ? " ↓" : "";
    const trend = parts[1] ? ` · ${parts[1]}` : "";
    return ctx.latest ? `${ctx.latest}${arrow}${trend}` : ctx.reasonText;
  }
  const since = ctx.reasonText.match(/in ([A-Za-z]{3,9} \d{4})/);
  return since ? `No repeat since ${since[1]}` : ctx.reasonText;
}

const GROUP_RANK: Record<string, number> = { out: 0, watch: 1 };
const SEVERITY_RANK: Record<string, number> = { danger: 0, warning: 1 };
const PREFERRED_PANEL_LABS: Record<string, string[]> = {
  cbc: [
    "CELL BLOOD COUNT||Haemoglobin",
    "CELL BLOOD COUNT||Red blood cell",
    "CELL BLOOD COUNT||Hematocrit",
    "CELL BLOOD COUNT||White blood cell",
    "CELL BLOOD COUNT||Platelet count",
  ],
};

function lcFirst(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

function preferenceRank(itemId: string, labKey: string): number {
  const preferred = PREFERRED_PANEL_LABS[itemId];
  if (!preferred) return Number.POSITIVE_INFINITY;
  const index = preferred.indexOf(labKey);
  return index === -1 ? Number.POSITIVE_INFINITY : index;
}

function candidateScore(itemId: string, rank: number, ctx: LabOrderContext): [number, number, number] {
  return [
    rank,
    SEVERITY_RANK[ctx.severityTone ?? "warning"],
    preferenceRank(itemId, ctx.labKey),
  ];
}

function isBetterContext(
  itemId: string,
  candidate: { rank: number; ctx: LabOrderContext },
  current?: { rank: number; ctx: LabOrderContext },
): boolean {
  if (!current) return true;
  const nextScore = candidateScore(itemId, candidate.rank, candidate.ctx);
  const currentScore = candidateScore(itemId, current.rank, current.ctx);
  for (let index = 0; index < nextScore.length; index += 1) {
    if (nextScore[index] < currentScore[index]) return true;
    if (nextScore[index] > currentScore[index]) return false;
  }
  return false;
}

let cache: Map<string, ItemLabContext> | null = null;

export function getItemLabContexts(): Map<string, ItemLabContext> {
  if (cache) return cache;

  const byKey = new Map(getLabOrderContexts().map((ctx) => [ctx.labKey, ctx]));
  const best = new Map<string, { rank: number; ctx: LabOrderContext }>();

  for (const [labKey, itemId] of Object.entries(LAB_TO_CATALOG)) {
    const ctx = byKey.get(labKey);
    if (!ctx) continue;
    const rank = GROUP_RANK[ctx.group];
    if (rank === undefined) continue;
    const candidate = { rank, ctx };
    const current = best.get(itemId);
    if (isBetterContext(itemId, candidate, current)) best.set(itemId, candidate);
  }

  cache = new Map(
    [...best].map(([itemId, { ctx }]) => {
      const text =
        ctx.group === "out"
          ? `${ctx.labName}${ctx.latest ? ` ${ctx.latest}` : ""} — ${lcFirst(ctx.reasonText)}`
          : ctx.reasonText;
      return [
        itemId,
        {
          text,
          short: shortFor(ctx),
          tone: ctx.severityTone ?? "warning",
          title: `${ctx.labName}: ${ctx.reasonText}`,
          labKey: ctx.labKey,
        },
      ];
    }),
  );
  return cache;
}

/* Per-patient test history — hydrated for the patient the chart is open on, NOT
   part of the catalog. Drives the "latest value · last ordered · trend" block in
   the test-detail popover. Authored for the demo patient's flagged tests; any
   test without an entry simply shows no history block. */
export type ItemPatientContext = {
  reason: string; /* the flag line, e.g. "No repeat since Jan 2026" */
  shortReason: string; /* compact tile-style copy when a short phrase is needed */
  tone: "danger" | "warning";
  labKey: string;
  lastValue?: string; /* "9.2%" */
  lastOrdered?: string; /* "7 months ago" */
  trend?: "up" | "down" | "flat";
};

const PATIENT_TEST_HISTORY: Record<string, { lastValue: string; lastOrdered: string; trend: "up" | "down" | "flat" }> = {
  hba1c: { lastValue: "9.2%", lastOrdered: "7 months ago", trend: "up" },
  "creatinine-egfr": { lastValue: "eGFR 52", lastOrdered: "3 weeks ago", trend: "down" },
  microalbumin: { lastValue: "155.52 mg/g", lastOrdered: "3 weeks ago", trend: "up" },
  "urea-bun": { lastValue: "38 mg/dL", lastOrdered: "3 weeks ago", trend: "up" },
  cbc: { lastValue: "Hgb 11.0", lastOrdered: "3 weeks ago", trend: "down" },
};

export function getItemPatientContext(itemId: string): ItemPatientContext | null {
  const ctx = getItemLabContexts().get(itemId);
  if (!ctx) return null;
  return { reason: ctx.text, shortReason: ctx.short, tone: ctx.tone, labKey: ctx.labKey, ...PATIENT_TEST_HISTORY[itemId] };
}
