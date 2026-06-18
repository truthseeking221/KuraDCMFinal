"use client";

import { forwardRef, useId, useState } from "react";
import type { ChangeEvent, InputHTMLAttributes, KeyboardEvent, ReactNode } from "react";
import { cx } from "@/lib/cx";
import "./Input.css";

type InputMask = "date";
export type InputDensity = "default" | "compact" | "large";

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  /** Formats text as the user types. `date` renders DD-MM-YYYY. */
  mask?: InputMask;
  density?: InputDensity;
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

function inputValueToString(value: InputProps["value"] | InputProps["defaultValue"]) {
  if (value == null) return "";
  if (Array.isArray(value)) return value.join("");
  return String(value);
}

function formatDateInputValue(value: InputProps["value"] | InputProps["defaultValue"]) {
  const digits = inputValueToString(value).replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}`;
}

function countDigitsBeforeCaret(value: string, caret: number) {
  return value.slice(0, caret).replace(/\D/g, "").length;
}

function getCaretPositionForDigitIndex(value: string, digitIndex: number) {
  if (digitIndex <= 0) return 0;
  let digitsSeen = 0;
  for (let index = 0; index < value.length; index += 1) {
    if (/\d/.test(value[index])) digitsSeen += 1;
    if (digitsSeen >= digitIndex) return index + 1;
  }
  return value.length;
}

function restoreCaret(input: HTMLInputElement, position: number) {
  window.requestAnimationFrame(() => {
    if (document.activeElement === input) {
      input.setSelectionRange(position, position);
    }
  });
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    mask,
    density = "default",
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
    type,
    value,
    defaultValue,
    onChange,
    onKeyDown,
    inputMode,
    placeholder,
    maxLength,
    pattern,
    "aria-describedby": ariaDescribedBy,
    "aria-invalid": ariaInvalid,
    ...rest
  },
  ref,
) {
  const autoId = useId();
  const helpId = useId();
  const errorId = useId();
  const inputId = id ?? autoId;
  const isDateMasked = mask === "date";
  const isControlled = value != null;
  const [maskedValue, setMaskedValue] = useState(() => formatDateInputValue(defaultValue));
  const describedBy = [ariaDescribedBy, error ? errorId : helpText ? helpId : undefined].filter(Boolean).join(" ") || undefined;

  function handleMaskedDateChange(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const selectionStart = input.selectionStart ?? input.value.length;
    const digitIndex = countDigitsBeforeCaret(input.value, selectionStart);
    const nextValue = formatDateInputValue(input.value);
    const nextCaret = getCaretPositionForDigitIndex(nextValue, digitIndex);

    input.value = nextValue;
    if (!isControlled) setMaskedValue(nextValue);

    onChange?.(event);
    restoreCaret(input, nextCaret);
  }

  function handleMaskedDateKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    onKeyDown?.(event);
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;

    const input = event.currentTarget;
    const start = input.selectionStart ?? 0;
    const end = input.selectionEnd ?? start;
    if (start !== end) return;

    if (event.key === "Backspace" && input.value[start - 1] === "-") {
      input.setSelectionRange(start - 1, start - 1);
    }
    if (event.key === "Delete" && input.value[start] === "-") {
      input.setSelectionRange(start + 1, start + 1);
    }
  }

  const inputProps = isDateMasked
    ? {
        type: "text",
        inputMode: inputMode ?? "numeric",
        placeholder: placeholder ?? "DD-MM-YYYY",
        maxLength: maxLength ?? 10,
        pattern: pattern ?? "\\d{2}-\\d{2}-\\d{4}",
        value: isControlled ? formatDateInputValue(value) : maskedValue,
        onChange: handleMaskedDateChange,
        onKeyDown: handleMaskedDateKeyDown,
      }
    : {
        type,
        inputMode,
        placeholder,
        maxLength,
        pattern,
        value,
        defaultValue,
        onChange,
        onKeyDown,
      };

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
          `kui-input--${density}`,
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
          data-slot="input"
          className={cx("kui-input__control", className)}
          disabled={disabled}
          readOnly={readOnly}
          aria-invalid={error ? true : ariaInvalid}
          aria-describedby={describedBy}
          {...inputProps}
          {...rest}
        />
        {trailing && <span className="kui-input__icon">{trailing}</span>}
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
