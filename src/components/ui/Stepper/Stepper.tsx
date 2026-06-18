"use client";

import type { CSSProperties, ReactNode } from "react";
import { cx } from "@/lib/cx";
import { CheckCircle } from "@/icons";
import "./Stepper.css";

export type StepperStatus = "complete" | "current" | "pending";

export interface StepperItem<T extends string> {
  label: ReactNode;
  value: T;
  status: StepperStatus;
  disabled?: boolean;
}

export interface StepperProps<T extends string> {
  items: StepperItem<T>[];
  onStepClick?: (value: T) => void;
  className?: string;
  "aria-label"?: string;
}

export function Stepper<T extends string>({
  items,
  onStepClick,
  className,
  "aria-label": ariaLabel = "Steps",
}: StepperProps<T>) {
  const style = { "--kui-stepper-count": items.length } as CSSProperties;

  return (
    <ol className={cx("kui-stepper", className)} style={style} aria-label={ariaLabel}>
      {items.map((item, index) => {
        const interactive = item.status === "complete" && !!onStepClick && !item.disabled;
        const marker = item.status === "complete" ? <CheckCircle size={13} variant="bulk" /> : index + 1;
        const content = (
          <>
            <span className="kui-stepper__dot">{marker}</span>
            <span className="kui-stepper__label">{item.label}</span>
          </>
        );

        return (
          <li key={item.value} className={cx("kui-stepper__item", `is-${item.status}`, item.disabled && "is-disabled")}>
            {interactive ? (
              <button type="button" className="kui-stepper__control" onClick={() => onStepClick(item.value)}>
                {content}
              </button>
            ) : (
              <span className="kui-stepper__control" aria-current={item.status === "current" ? "step" : undefined}>
                {content}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
