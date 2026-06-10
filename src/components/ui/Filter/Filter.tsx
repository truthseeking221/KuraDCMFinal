"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "@/lib/cx";
import { Filter as FilterIcon, ChevronDown } from "@/icons";
import { Counter } from "../Counter";
import "./Filter.css";

/* ---- Trigger button ------------------------------------------------------- */
export interface FilterButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  label?: ReactNode;
  /** Active-filter count badge; hidden when 0 / undefined. */
  count?: number;
  /** Active = filters applied / panel open. */
  active?: boolean;
}

export function FilterButton({
  label = "Filters",
  count,
  active = false,
  className,
  ...rest
}: FilterButtonProps) {
  return (
    <button
      type="button"
      className={cx("kui-filterbtn", active && "is-active", className)}
      aria-expanded={active}
      {...rest}
    >
      <span className="kui-filterbtn__icon" aria-hidden="true">
        <FilterIcon />
      </span>
      <span>{label}</span>
      {count != null && count > 0 && (
        <Counter className="kui-filterbtn__count" count={count} tone="neutral" />
      )}
      <span className="kui-filterbtn__chev" aria-hidden="true">
        <ChevronDown />
      </span>
    </button>
  );
}

/* ---- Panel ---------------------------------------------------------------- */
export interface FilterPanelProps {
  title?: ReactNode;
  onReset?: () => void;
  /** Optional search slot above the body. */
  search?: ReactNode;
  /** Footer slot (usually match toggle + apply button). */
  footer?: ReactNode;
  width?: number | string;
  className?: string;
  children?: ReactNode;
}

export function FilterPanel({
  title = "Filters",
  onReset,
  search,
  footer,
  width = 300,
  className,
  children,
}: FilterPanelProps) {
  return (
    <div className={cx("kui-filterpanel", className)} style={{ width }}>
      <div className="kui-filterpanel__head">
        <span className="kui-filterpanel__title">{title}</span>
        {onReset && (
          <button type="button" className="kui-filterpanel__reset" onClick={onReset}>
            Reset
          </button>
        )}
      </div>
      {search && <div className="kui-filterpanel__search">{search}</div>}
      <div className="kui-filterpanel__body">{children}</div>
      {footer && <div className="kui-filterpanel__footer">{footer}</div>}
    </div>
  );
}

export function FilterSection({
  title,
  children,
}: {
  title?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="kui-filterpanel__section">
      {title && <div className="kui-filterpanel__section-title">{title}</div>}
      {children}
    </div>
  );
}
