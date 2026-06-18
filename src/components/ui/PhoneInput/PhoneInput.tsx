"use client";

import {
  type ChangeEvent,
  type ComponentPropsWithoutRef,
  type FocusEvent,
  type ReactNode,
  useId,
  useRef,
  useState,
} from "react";
import { CheckCircle, ChevronDown, Lock } from "@/icons";
import { cx } from "@/lib/cx";
import "./PhoneInput.css";

export type PhoneCountry = {
  iso: string;
  dial: string;
  name: string;
  flag?: string;
};

export type PhoneInputState = {
  locked: boolean;
  editing: boolean;
  disabled: boolean;
};

export const DEFAULT_PHONE_COUNTRIES: PhoneCountry[] = [
  { iso: "KH", dial: "+855", name: "Cambodia", flag: "🇰🇭" },
  { iso: "VN", dial: "+84", name: "Vietnam", flag: "🇻🇳" },
  { iso: "TH", dial: "+66", name: "Thailand", flag: "🇹🇭" },
  { iso: "LA", dial: "+856", name: "Laos", flag: "🇱🇦" },
  { iso: "MY", dial: "+60", name: "Malaysia", flag: "🇲🇾" },
  { iso: "SG", dial: "+65", name: "Singapore", flag: "🇸🇬" },
  { iso: "US", dial: "+1", name: "United States", flag: "🇺🇸" },
  { iso: "GB", dial: "+44", name: "United Kingdom", flag: "🇬🇧" },
  { iso: "FR", dial: "+33", name: "France", flag: "🇫🇷" },
  { iso: "AU", dial: "+61", name: "Australia", flag: "🇦🇺" },
];

export type PhoneInputProps = Omit<ComponentPropsWithoutRef<"div">, "children" | "defaultValue" | "onChange"> & {
  country: string;
  number: string;
  onCountryChange: (iso: string) => void;
  onNumberChange: (next: string) => void;
  countries?: PhoneCountry[];
  placeholder?: string;
  disabled?: boolean;
  locked?: boolean;
  onUnlock?: () => void;
  onLockReset?: () => void;
  lockedDescription?: string;
  verified?: boolean;
  trailing?: ReactNode | ((state: PhoneInputState) => ReactNode);
  invalid?: boolean;
  inputId?: string;
  "aria-describedby"?: string;
};

export function PhoneInput({
  country,
  number,
  onCountryChange,
  onNumberChange,
  countries = DEFAULT_PHONE_COUNTRIES,
  placeholder = "12 345 678",
  disabled,
  locked,
  onUnlock,
  onLockReset,
  lockedDescription,
  verified,
  trailing,
  invalid,
  inputId,
  className,
  onBlur,
  "aria-describedby": ariaDescribedBy,
  ...props
}: PhoneInputProps) {
  const autoInputId = useId();
  const lockedDescriptionId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [unlockedByUser, setUnlockedByUser] = useState(false);
  const selectedCountry = countries.find((candidate) => candidate.iso === country) ?? countries[0];

  const inputIsLocked = locked === true && !unlockedByUser;
  const inputIsDisabled = !inputIsLocked && disabled === true;
  const selectIsDisabled = disabled === true || inputIsLocked;
  const isEditingLockedPhone = locked === true && unlockedByUser && !inputIsDisabled;
  const hasVerifiedState = verified === true && !isEditingLockedPhone;
  const hasLockedDescription = inputIsLocked && Boolean(lockedDescription);
  const phoneInputState: PhoneInputState = {
    locked: inputIsLocked,
    editing: isEditingLockedPhone,
    disabled: inputIsDisabled,
  };
  const trailingContent = typeof trailing === "function" ? trailing(phoneInputState) : trailing;
  const describedBy = [ariaDescribedBy, hasLockedDescription ? lockedDescriptionId : undefined].filter(Boolean).join(" ") || undefined;

  function handleNumberChange(event: ChangeEvent<HTMLInputElement>) {
    onNumberChange(event.target.value.replace(/[^\d ]/g, ""));
  }

  function handleUnlock() {
    setUnlockedByUser(true);
    onUnlock?.();
    window.requestAnimationFrame(() => inputRef.current?.focus());
  }

  function resetUnlockedPhone() {
    setUnlockedByUser(false);
    onLockReset?.();
  }

  function handleRootBlur(event: FocusEvent<HTMLDivElement>) {
    onBlur?.(event);
    if (event.defaultPrevented || !unlockedByUser) return;
    const nextTarget = event.relatedTarget;
    if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) return;
    resetUnlockedPhone();
  }

  return (
    <div
      ref={rootRef}
      data-slot="phone-input"
      className={cx(
        "kui-phone",
        invalid && "kui-phone--error",
        disabled && "is-disabled",
        inputIsLocked && "is-locked",
        hasVerifiedState && "is-verified",
        className,
      )}
      onBlur={handleRootBlur}
      {...props}
    >
      <label className="kui-phone__country" aria-label="Country code">
        <span className="kui-phone__country-display" aria-hidden="true">
          <span className="kui-phone__flag">{selectedCountry.flag ?? selectedCountry.iso}</span>
          <span className="kui-phone__country-code">{selectedCountry.iso}</span>
          <span className="kui-phone__dial">{selectedCountry.dial}</span>
        </span>
        <select
          className="kui-phone__country-select"
          value={selectedCountry.iso}
          disabled={selectIsDisabled}
          onChange={(event) => onCountryChange(event.target.value)}
          aria-label="Country code"
        >
          {countries.map((candidate) => (
            <option key={candidate.iso} value={candidate.iso}>
              {candidate.name} {candidate.dial}
            </option>
          ))}
        </select>
        <ChevronDown size={14} variant="stroke" aria-hidden="true" />
      </label>

      <div className="kui-phone__number">
        <input
          ref={inputRef}
          id={inputId ?? autoInputId}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          className="kui-phone__input"
          value={number}
          placeholder={placeholder}
          disabled={inputIsDisabled}
          readOnly={inputIsLocked || undefined}
          aria-readonly={inputIsLocked || undefined}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          data-locked={inputIsLocked || undefined}
          data-verified={hasVerifiedState || undefined}
          onChange={handleNumberChange}
          onClick={inputIsLocked ? handleUnlock : undefined}
        />
        {hasVerifiedState ? (
          <span className="kui-phone__verified" aria-label="Phone verified">
            <CheckCircle size={15} variant="bulk" />
          </span>
        ) : null}
        {inputIsLocked ? (
          <button
            type="button"
            className="kui-phone__lock"
            aria-label="Unlock phone number"
            title="Unlock phone number"
            onClick={handleUnlock}
          >
            <Lock size={13} variant="stroke" aria-hidden="true" />
          </button>
        ) : null}
        {hasLockedDescription ? (
          <span id={lockedDescriptionId} className="kui-phone__sr">
            {lockedDescription}
          </span>
        ) : null}
      </div>

      {trailingContent ? <div className="kui-phone__trailing">{trailingContent}</div> : null}
    </div>
  );
}
