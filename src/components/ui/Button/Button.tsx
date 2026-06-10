"use client";

import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "@/lib/cx";
import { ChevronDown } from "@/icons";
import "./Button.css";

export type ButtonIntent =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "destructive";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual emphasis / semantic intent. Maps to Figma `Intent`. */
  intent?: ButtonIntent;
  /** Maps to Figma `Size` (SM 32 / MD 36 / LG 44). */
  size?: ButtonSize;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  /** Trailing chevron signalling a menu/popover (Figma "Disclosure"). */
  disclosure?: boolean;
  /** Show a spinner and block interaction. */
  loading?: boolean;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    intent = "primary",
    size = "md",
    leadingIcon,
    trailingIcon,
    disclosure = false,
    loading = false,
    fullWidth = false,
    type = "button",
    className,
    children,
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
        "kui-btn",
        `kui-btn--${intent}`,
        `kui-btn--${size}`,
        fullWidth && "kui-btn--full",
        loading && "kui-btn--loading",
        className,
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && <span className="kui-btn__spinner" aria-hidden="true" />}
      {leadingIcon && (
        <span className="kui-btn__icon" aria-hidden="true">
          {leadingIcon}
        </span>
      )}
      {children != null && <span className="kui-btn__label">{children}</span>}
      {trailingIcon && (
        <span className="kui-btn__icon" aria-hidden="true">
          {trailingIcon}
        </span>
      )}
      {disclosure && (
        <span className="kui-btn__icon kui-btn__disclosure" aria-hidden="true">
          <ChevronDown />
        </span>
      )}
    </button>
  );
});
