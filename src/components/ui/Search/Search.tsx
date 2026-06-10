"use client";

import { forwardRef } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";
import { cx } from "@/lib/cx";
import { Search as SearchIcon, Close } from "@/icons";
import "./Search.css";

export type SearchDensity = "default" | "compact" | "large";
export type SearchSurface = "light" | "dark";

export interface SearchProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  /** default 36 · compact 28 (sunken) · large 44. */
  density?: SearchDensity;
  /** light for in-page; dark for on-dark headers / global search. */
  surface?: SearchSurface;
  /** Leading search icon. On by default. */
  leadingIcon?: boolean;
  /** Trailing keyboard hint chip (e.g. "⌘K"); hidden once there's a value. */
  kbd?: ReactNode;
  /** Shows a clear (×) once there's a value. */
  onClear?: () => void;
  /** Trailing action after a divider (e.g. a ghost "Filters" button). */
  trailingAction?: ReactNode;
  /** Render as a button that opens a command palette (no text input). */
  asTrigger?: boolean;
  onTriggerClick?: () => void;
  /** Label shown when `asTrigger` (since there is no input). */
  triggerLabel?: ReactNode;
  containerClassName?: string;
}

export const Search = forwardRef<HTMLInputElement, SearchProps>(function Search(
  {
    density = "default",
    surface = "light",
    leadingIcon = true,
    kbd,
    onClear,
    trailingAction,
    asTrigger = false,
    onTriggerClick,
    triggerLabel = "Search…",
    value,
    placeholder = "Search…",
    disabled,
    className,
    containerClassName,
    ...rest
  },
  ref,
) {
  const hasValue = typeof value === "string" && value.length > 0;
  const shell = cx(
    "kui-search",
    `kui-search--${density}`,
    `kui-search--${surface}`,
    disabled && "is-disabled",
    containerClassName,
  );

  const icon = leadingIcon && (
    <span className="kui-search__icon" aria-hidden="true">
      <SearchIcon variant="stroke" />
    </span>
  );

  const action = trailingAction && (
    <>
      <span className="kui-search__divider" aria-hidden="true" />
      <span className="kui-search__action">{trailingAction}</span>
    </>
  );

  if (asTrigger) {
    return (
      <button
        type="button"
        className={cx(shell, "kui-search--trigger", className)}
        onClick={onTriggerClick}
        disabled={disabled}
      >
        {icon}
        <span className="kui-search__placeholder">{triggerLabel}</span>
        {kbd && <span className="kui-search__kbd">{kbd}</span>}
        {action}
      </button>
    );
  }

  return (
    <div className={cx(shell, className)}>
      {icon}
      <input
        ref={ref}
        type="search"
        className="kui-search__input"
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        {...rest}
      />
      {hasValue && onClear ? (
        <button
          type="button"
          className="kui-search__clear"
          aria-label="Clear search"
          tabIndex={-1}
          onClick={onClear}
        >
          <Close variant="stroke" />
        </button>
      ) : (
        kbd && <span className="kui-search__kbd">{kbd}</span>
      )}
      {action}
    </div>
  );
});
