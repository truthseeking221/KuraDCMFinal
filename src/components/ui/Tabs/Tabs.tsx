"use client";

import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import { Counter } from "../Counter";
import "./Tabs.css";

export interface TabItem<T extends string> {
  label: ReactNode;
  value: T;
  icon?: ReactNode;
  count?: number;
  disabled?: boolean;
}

export interface TabsProps<T extends string> {
  items: TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: "md" | "sm";
  /** hug = content width; fill = spread the full width. */
  fit?: "hug" | "fill";
  className?: string;
  "aria-label"?: string;
}

export function Tabs<T extends string>({
  items,
  value,
  onChange,
  size = "md",
  fit = "hug",
  className,
  ...rest
}: TabsProps<T>) {
  return (
    <div
      className={cx("kui-tabs", `kui-tabs--${size}`, `kui-tabs--${fit}`, className)}
      role="tablist"
      {...rest}
    >
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={item.disabled}
            className={cx("kui-tab", active && "is-active")}
            onClick={() => onChange(item.value)}
          >
            {item.icon && (
              <span className="kui-tab__icon" aria-hidden="true">
                {item.icon}
              </span>
            )}
            <span className="kui-tab__label">{item.label}</span>
            {item.count != null && (
              <Counter className="kui-tab__count" count={item.count} tone="neutral" />
            )}
            <span className="kui-tab__underline" aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}
