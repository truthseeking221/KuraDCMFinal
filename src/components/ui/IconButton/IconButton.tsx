"use client";

import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "@/lib/cx";
import "./IconButton.css";

export type IconButtonVariant = "default" | "primary" | "tertiary";
export type IconButtonTone = "default" | "critical" | "success";
export type IconButtonSize = "micro" | "default" | "large";

export interface IconButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  /** Accessible label — required since the button has no visible text. */
  "aria-label": string;
  icon: ReactNode;
  variant?: IconButtonVariant;
  tone?: IconButtonTone;
  size?: IconButtonSize;
  loading?: boolean;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    {
      icon,
      variant = "default",
      tone = "default",
      size = "default",
      loading = false,
      type = "button",
      className,
      disabled,
      ...rest
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        className={cx(
          "kui-iconbtn",
          `kui-iconbtn--${variant}`,
          `kui-iconbtn--tone-${tone}`,
          `kui-iconbtn--${size}`,
          loading && "kui-iconbtn--loading",
          className,
        )}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...rest}
      >
        {loading ? (
          <span className="kui-iconbtn__spinner" aria-hidden="true" />
        ) : (
          <span className="kui-iconbtn__icon" aria-hidden="true">
            {icon}
          </span>
        )}
      </button>
    );
  },
);
