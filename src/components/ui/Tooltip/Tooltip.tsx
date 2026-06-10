"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import "./Tooltip.css";

export type TooltipPlacement = "top" | "bottom" | "left" | "right";

export interface TooltipProps {
  content: ReactNode;
  placement?: TooltipPlacement;
  children: ReactNode;
}

export function Tooltip({ content, placement = "top", children }: TooltipProps) {
  const [open, setOpen] = useState(false);
  return (
    <span
      className="kui-tooltip-wrap"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      <span
        role="tooltip"
        className={cx(
          "kui-tooltip",
          `kui-tooltip--${placement}`,
          open && "is-open",
        )}
      >
        {content}
      </span>
    </span>
  );
}
