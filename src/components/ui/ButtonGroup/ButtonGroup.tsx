"use client";

import type { HTMLAttributes } from "react";
import { cx } from "@/lib/cx";
import "./ButtonGroup.css";

export interface ButtonGroupProps extends HTMLAttributes<HTMLDivElement> {
  /** segmented = connected with shared borders; otherwise spaced with a gap. */
  segmented?: boolean;
}

export function ButtonGroup({
  segmented = true,
  className,
  children,
  ...rest
}: ButtonGroupProps) {
  return (
    <div
      className={cx(
        "kui-btn-group",
        segmented ? "kui-btn-group--segmented" : "kui-btn-group--spaced",
        className,
      )}
      role="group"
      {...rest}
    >
      {children}
    </div>
  );
}
