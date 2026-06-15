"use client";

import type { ComponentType } from "react";
import {
  Clock as ClockIcon,
  CreditCard as CreditCardIcon,
  Tube as TubeIcon,
  Warning as WarningIcon,
} from "@/icons/components";
import type { IconProps } from "@/icons/components/types";
import {
  COVERAGE_LABEL,
  getItemLabContexts,
  specimenFilters,
} from "@/components/OrderDraft";
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

const SPECIMEN_LABEL = new Map(specimenFilters.map((s) => [s.id, s.label]));

/* Priority order, safety first: a row never drops a higher-priority flag for a
   lower one (see MAX_VISIBLE). */
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

  /* live "why re-order this?" signal, shared with the Labs tab model */
  const labCtx = getItemLabContexts().get(item.id);
  if (labCtx) {
    flags.push({
      key: "abnormal",
      tone: labCtx.tone,
      Icon: WarningIcon,
      label: labCtx.title,
    });
  }

  if (item.coverage) {
    flags.push({
      key: "coverage",
      tone: item.coverage === "unconfirmed" ? "warning" : "neutral",
      Icon: CreditCardIcon,
      label: COVERAGE_LABEL[item.coverage],
    });
  }

  if (item.prep) {
    flags.push({ key: "prep", tone: "info", Icon: ClockIcon, label: item.prep });
  }

  const nonBlood = item.specimens.filter((s) => s !== "blood");
  if (nonBlood.length > 0) {
    const names = nonBlood.map((s) => SPECIMEN_LABEL.get(s) ?? s).join(", ");
    flags.push({
      key: "specimen",
      tone: "neutral",
      Icon: TubeIcon,
      label: `Specimen: ${names}`,
    });
  }

  return flags;
}

/* Cap visible flags so a busy row stays scannable; overflow detail lives in the
   popover. Safety/abnormal flags sort first so they are never the ones dropped. */
const MAX_VISIBLE = 3;

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
