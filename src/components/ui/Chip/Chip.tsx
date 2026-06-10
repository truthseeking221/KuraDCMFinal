"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "@/lib/cx";
import { X } from "@/icons";
import { Counter } from "../Counter";
import "./Chip.css";

export type ChipType = "choice" | "removable";

export interface ChipProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> {
  /** choice = quick-filter toggle; removable = applied filter with an x. */
  variant?: ChipType;
  selected?: boolean;
  /** Optional trailing count badge (choice chips). */
  count?: number;
  leadingIcon?: ReactNode;
  /** Called when the x of a removable chip is clicked. */
  onRemove?: () => void;
}

export function Chip({
  variant = "choice",
  selected = false,
  count,
  leadingIcon,
  onRemove,
  className,
  children,
  ...rest
}: ChipProps) {
  return (
    <button
      type="button"
      className={cx(
        "kui-chip",
        `kui-chip--${variant}`,
        selected && "kui-chip--selected",
        className,
      )}
      aria-pressed={variant === "choice" ? selected : undefined}
      {...rest}
    >
      {leadingIcon && (
        <span className="kui-chip__icon" aria-hidden="true">
          {leadingIcon}
        </span>
      )}
      <span className="kui-chip__label">{children}</span>
      {count != null && (
        <Counter className="kui-chip__count" count={count} tone="neutral" />
      )}
      {variant === "removable" && (
        <span
          className="kui-chip__close"
          role="button"
          tabIndex={-1}
          aria-label="Remove"
          onClick={(e) => {
            e.stopPropagation();
            onRemove?.();
          }}
        >
          <X />
        </span>
      )}
    </button>
  );
}
