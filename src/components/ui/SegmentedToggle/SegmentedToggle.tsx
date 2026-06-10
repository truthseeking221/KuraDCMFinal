"use client";

import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import "./SegmentedToggle.css";

export interface SegmentedOption<T extends string> {
  label: ReactNode;
  value: T;
}

export interface SegmentedToggleProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  "aria-label"?: string;
  className?: string;
}

export function SegmentedToggle<T extends string>({
  options,
  value,
  onChange,
  className,
  ...rest
}: SegmentedToggleProps<T>) {
  return (
    <div className={cx("kui-segmented", className)} role="tablist" {...rest}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            className={cx("kui-segmented__seg", active && "is-active")}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
