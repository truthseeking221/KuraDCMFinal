"use client";

import type { HTMLAttributes } from "react";
import { cx } from "@/lib/cx";
import "./Counter.css";

export type CounterTone = "neutral" | "brand" | "success" | "danger";

export interface CounterProps extends HTMLAttributes<HTMLSpanElement> {
  count: number;
  tone?: CounterTone;
  /** Values above this render as `${max}+`. Default 99. */
  max?: number;
}

/** Format a count the Kura way: 99+ then 1.2k truncation. */
export function formatCount(count: number, max = 99): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  }
  if (count > max) return `${max}+`;
  return String(count);
}

export function Counter({
  count,
  tone = "neutral",
  max = 99,
  className,
  ...rest
}: CounterProps) {
  return (
    <span className={cx("kui-counter", `kui-counter--${tone}`, className)} {...rest}>
      {formatCount(count, max)}
    </span>
  );
}
