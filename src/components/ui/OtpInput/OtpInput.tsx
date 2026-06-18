"use client";

import {
  useEffect,
  useRef,
  type ClipboardEvent,
  type ComponentProps,
  type KeyboardEvent,
} from "react";
import { cx } from "@/lib/cx";
import "./OtpInput.css";

export type OtpInputProps = Omit<ComponentProps<"div">, "children" | "onChange"> & {
  /** Total number of digits. Defaults to 6 to match the shared Kura UI kit. */
  length?: number;
  /** Current value, stored as digits only. */
  value: string;
  /** Fired with the next digits-only value on every change. */
  onChange: (next: string) => void;
  /** Fired when the entered value reaches `length`. */
  onComplete?: (code: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  ariaLabel?: string;
  invalid?: boolean;
};

/* Ported from Kura-med/ui-kit's OtpInput molecule, then restyled onto this
   app's local Kura DS tokens so typography follows --font-family-base. */
export function OtpInput({
  length = 6,
  value,
  onChange,
  onComplete,
  disabled,
  autoFocus,
  ariaLabel = "One-time code",
  invalid,
  className,
  ...props
}: OtpInputProps) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length }, (_, index) => value[index] ?? "");

  useEffect(() => {
    if (!autoFocus) return;
    const firstEmpty = digits.findIndex((digit) => !digit);
    refs.current[firstEmpty === -1 ? length - 1 : firstEmpty]?.focus();
    // Match the UI kit behavior: focus once on mount and if length changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFocus, length]);

  function commit(nextRaw: string) {
    const next = nextRaw.replace(/\D/g, "").slice(0, length);
    onChange(next);
    if (next.length === length) onComplete?.(next);
  }

  function setDigitAt(index: number, digit: string) {
    const chars = digits.slice();
    chars[index] = digit;
    while (chars.length && chars[chars.length - 1] === "") chars.pop();
    commit(chars.join(""));
  }

  function handleChange(index: number, raw: string) {
    const digit = raw.replace(/\D/g, "").slice(-1);
    if (!digit) {
      setDigitAt(index, "");
      return;
    }
    setDigitAt(index, digit);
    if (index < length - 1) refs.current[index + 1]?.focus();
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      event.preventDefault();
      refs.current[index - 1]?.focus();
      setDigitAt(index - 1, "");
    } else if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      refs.current[index - 1]?.focus();
    } else if (event.key === "ArrowRight" && index < length - 1) {
      event.preventDefault();
      refs.current[index + 1]?.focus();
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "");
    if (!pasted) return;
    event.preventDefault();
    const next = pasted.slice(0, length);
    commit(next);
    refs.current[Math.min(next.length, length - 1)]?.focus();
  }

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cx("kui-otp", invalid && "kui-otp--error", disabled && "is-disabled", className)}
      {...props}
    >
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(element) => {
            refs.current[index] = element;
          }}
          className="kui-otp__cell"
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          maxLength={1}
          value={digit}
          disabled={disabled}
          aria-invalid={invalid || undefined}
          aria-label={`Digit ${index + 1}`}
          onChange={(event) => handleChange(index, event.target.value)}
          onFocus={(event) => event.currentTarget.select()}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={handlePaste}
        />
      ))}
    </div>
  );
}
