"use client";

import type { ComponentType } from "react";
import { Warning as WarningIcon } from "@/icons/components";
import type { IconProps } from "@/icons/components/types";
import { getItemLabContexts } from "@/components/OrderDraft";
import type { OrderItem } from "@/components/OrderDraft";
import { cx } from "@/lib/cx";

/* Persistent clinical flags shown beside a catalog test name. Icon-only +
   status tone, but every flag carries a full-text aria-label / tooltip so the
   meaning never depends on color alone. Derived purely from existing catalog
   data — the popover (TestContextPopover) explains each flag in words. */

export type FlagTone = "danger" | "warning" | "info" | "neutral";

export type ItemFlag = {
  key: string;
  /* full sentence — used as aria-label and native tooltip */
  label: string;
  tone: FlagTone;
  Icon: ComponentType<IconProps>;
};

/* Rows carry only the decision-driving signal: a test is abnormal/repeat-due
   (the "why re-order this?" from the Labs model) or unavailable. Coverage, prep,
   and specimen are operational detail — they live in the hover popover, not as
   persistent row icons, so the catalog scans clean instead of icon-noisy. */
export function getItemFlags(item: OrderItem): ItemFlag[] {
  const flags: ItemFlag[] = [];

  if (item.unavailable) {
    flags.push({
      key: "unavailable",
      tone: "warning",
      Icon: WarningIcon,
      label: `Unavailable — ${item.unavailable.reason}`,
    });
  }

  const labCtx = getItemLabContexts().get(item.id);
  if (labCtx) {
    flags.push({
      key: "abnormal",
      tone: labCtx.tone,
      Icon: WarningIcon,
      label: labCtx.title,
    });
  }

  return flags;
}

/* Cap visible flags so a busy row stays scannable; overflow detail lives in the
   popover. Safety/abnormal flags sort first so they are never the ones dropped. */
const MAX_VISIBLE = 2;

export function TestIndicatorGroup({
  flags,
  className,
}: {
  flags: ItemFlag[];
  className?: string;
}) {
  if (flags.length === 0) return null;
  const shown = flags.slice(0, MAX_VISIBLE);

  return (
    <span className={cx("orders-flags", className)}>
      {shown.map((flag) => (
        <span
          key={flag.key}
          className={cx("orders-flag", `tone-${flag.tone}`)}
          role="img"
          aria-label={flag.label}
          title={flag.label}
        >
          <flag.Icon size={12} variant="bulk" />
        </span>
      ))}
    </span>
  );
}
