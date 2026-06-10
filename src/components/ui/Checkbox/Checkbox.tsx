"use client";

import { useEffect, useId, useRef } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";
import { cx } from "@/lib/cx";
import { Check, Minus } from "@/icons";
import "./Checkbox.css";

export type CheckboxTone = "default" | "ai";

export interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "size"> {
  label?: ReactNode;
  helpText?: ReactNode;
  /** Error message — also turns the box danger-red. */
  error?: ReactNode;
  indeterminate?: boolean;
  tone?: CheckboxTone;
}

export function Checkbox({
  label,
  helpText,
  error,
  indeterminate = false,
  tone = "default",
  className,
  id,
  disabled,
  ...rest
}: CheckboxProps) {
  const ref = useRef<HTMLInputElement>(null);
  const autoId = useId();
  const inputId = id ?? autoId;

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <label
      htmlFor={inputId}
      className={cx(
        "kui-checkbox",
        `kui-checkbox--${tone}`,
        error ? "kui-checkbox--error" : undefined,
        disabled && "is-disabled",
        className,
      )}
    >
      <span className="kui-checkbox__control">
        <input
          id={inputId}
          ref={ref}
          type="checkbox"
          className="kui-checkbox__input"
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          {...rest}
        />
        <span className="kui-checkbox__box" aria-hidden="true">
          <Check className="kui-checkbox__check" variant="solid" />
          <Minus className="kui-checkbox__minus" variant="solid" />
        </span>
      </span>
      {(label || helpText || error) && (
        <span className="kui-checkbox__text">
          {label && <span className="kui-checkbox__label">{label}</span>}
          {error ? (
            <span className="kui-checkbox__error">{error}</span>
          ) : (
            helpText && <span className="kui-checkbox__help">{helpText}</span>
          )}
        </span>
      )}
    </label>
  );
}
