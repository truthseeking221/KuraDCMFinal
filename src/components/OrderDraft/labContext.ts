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

function lcFirst(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
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
    const current = best.get(itemId);
    const moreSevere =
      !current ||
      rank < current.rank ||
      (rank === current.rank && ctx.severityTone === "danger" && current.ctx.severityTone !== "danger");
    if (moreSevere) best.set(itemId, { rank, ctx });
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
