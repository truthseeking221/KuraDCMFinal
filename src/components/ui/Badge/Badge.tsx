"use client";

import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "@/lib/cx";
import "./Badge.css";

export type BadgeTone =
  | "neutral"
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "ai"
  | "brand";
export type BadgeAppearance = "subtle" | "strong";
export type BadgeSize = "medium" | "large";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  appearance?: BadgeAppearance;
  size?: BadgeSize;
  /** Leading status pip. */
  dot?: boolean;
  /** Leading icon (overrides dot). */
  icon?: ReactNode;
}

export function Badge({
  tone = "neutral",
  appearance = "subtle",
  size = "medium",
  dot = false,
  icon,
  className,
  children,
  ...rest
}: BadgeProps) {
  return (
    <span
      className={cx(
        "kui-badge",
        `kui-badge--${appearance}`,
        `kui-badge--${tone}`,
        `kui-badge--${size}`,
        className,
      )}
      {...rest}
    >
      {icon ? (
        <span className="kui-badge__icon" aria-hidden="true">
          {icon}
        </span>
      ) : (
        dot && <span className="kui-badge__dot" aria-hidden="true" />
      )}
      <span className="kui-badge__label">{children}</span>
    </span>
  );
}
