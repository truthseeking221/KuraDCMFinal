"use client";

import { forwardRef, useId } from "react";
import type { ReactNode, SelectHTMLAttributes } from "react";
import { ChevronDown } from "@/icons";
import { cx } from "@/lib/cx";
import "./Select.css";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: ReactNode;
  required?: boolean;
  helpText?: ReactNode;
  error?: ReactNode;
  placeholder?: string;
  containerClassName?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  {
    label,
    required,
    helpText,
    error,
    placeholder,
    id,
    className,
    containerClassName,
    disabled,
    children,
    value,
    defaultValue,
    "aria-describedby": ariaDescribedBy,
    "aria-invalid": ariaInvalid,
    ...rest
  },
  ref,
) {
  const autoId = useId();
  const helpId = useId();
  const errorId = useId();
  const selectId = id ?? autoId;
  const describedBy = [ariaDescribedBy, error ? errorId : helpText ? helpId : undefined].filter(Boolean).join(" ") || undefined;
  const isEmptyValue = value === "" || (value == null && defaultValue == null);

  return (
    <div className={cx("kui-field", containerClassName)}>
      {label && (
        <label htmlFor={selectId} className="kui-field__label">
          {label}
          {required && <span className="kui-field__req">*</span>}
        </label>
      )}
      <div className={cx("kui-select", !!error && "kui-select--error", disabled && "is-disabled")}>
        <select
          id={selectId}
          ref={ref}
          data-slot="select"
          className={cx("kui-select__control", isEmptyValue && !!placeholder && "is-placeholder", className)}
          disabled={disabled}
          value={value}
          defaultValue={defaultValue}
          aria-invalid={error ? true : ariaInvalid}
          aria-describedby={describedBy}
          {...rest}
        >
          {placeholder ? (
            <option value="" disabled={required}>
              {placeholder}
            </option>
          ) : null}
          {children}
        </select>
        <span className="kui-select__icon" aria-hidden="true">
          <ChevronDown size={16} variant="stroke" />
        </span>
      </div>
      {error ? (
        <div id={errorId} className="kui-field__error">
          {error}
        </div>
      ) : helpText ? (
        <div id={helpId} className="kui-field__help">
          {helpText}
        </div>
      ) : null}
    </div>
  );
});
