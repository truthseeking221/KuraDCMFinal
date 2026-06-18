"use client";

import { forwardRef, useId } from "react";
import type { ReactNode, TextareaHTMLAttributes } from "react";
import { cx } from "@/lib/cx";
import "./Textarea.css";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: ReactNode;
  required?: boolean;
  helpText?: ReactNode;
  error?: ReactNode;
  containerClassName?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  {
    label,
    required,
    helpText,
    error,
    id,
    className,
    containerClassName,
    disabled,
    "aria-describedby": ariaDescribedBy,
    "aria-invalid": ariaInvalid,
    ...rest
  },
  ref,
) {
  const autoId = useId();
  const helpId = useId();
  const errorId = useId();
  const textareaId = id ?? autoId;
  const describedBy = [ariaDescribedBy, error ? errorId : helpText ? helpId : undefined].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cx("kui-field", containerClassName)}>
      {label && (
        <label htmlFor={textareaId} className="kui-field__label">
          {label}
          {required && <span className="kui-field__req">*</span>}
        </label>
      )}
      <textarea
        id={textareaId}
        ref={ref}
        data-slot="textarea"
        className={cx("kui-textarea", !!error && "kui-textarea--error", className)}
        disabled={disabled}
        aria-invalid={error ? true : ariaInvalid}
        aria-describedby={describedBy}
        {...rest}
      />
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
