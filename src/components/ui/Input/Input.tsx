"use client";

import { forwardRef, useId } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";
import { cx } from "@/lib/cx";
import "./Input.css";

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: ReactNode;
  required?: boolean;
  helpText?: ReactNode;
  /** Error message — turns the box danger-red. */
  error?: ReactNode;
  leadingIcon?: ReactNode;
  /** Trailing node (icon or button). */
  trailing?: ReactNode;
  containerClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    label,
    required,
    helpText,
    error,
    leadingIcon,
    trailing,
    id,
    className,
    containerClassName,
    disabled,
    readOnly,
    ...rest
  },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <div className={cx("kui-field", containerClassName)}>
      {label && (
        <label htmlFor={inputId} className="kui-field__label">
          {label}
          {required && <span className="kui-field__req">*</span>}
        </label>
      )}
      <div
        className={cx(
          "kui-input",
          error ? "kui-input--error" : undefined,
          disabled && "is-disabled",
          readOnly && "is-readonly",
        )}
      >
        {leadingIcon && (
          <span className="kui-input__icon" aria-hidden="true">
            {leadingIcon}
          </span>
        )}
        <input
          id={inputId}
          ref={ref}
          className={cx("kui-input__control", className)}
          disabled={disabled}
          readOnly={readOnly}
          aria-invalid={error ? true : undefined}
          {...rest}
        />
        {trailing && <span className="kui-input__icon">{trailing}</span>}
      </div>
      {error ? (
        <div className="kui-field__error">{error}</div>
      ) : helpText ? (
        <div className="kui-field__help">{helpText}</div>
      ) : null}
    </div>
  );
});
