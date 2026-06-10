"use client";

import { useId } from "react";
import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import { Checkbox } from "../Checkbox";
import type { CheckboxTone } from "../Checkbox";
import "./ChoiceList.css";

export interface ChoiceOption<T extends string> {
  label: ReactNode;
  value: T;
  helpText?: ReactNode;
  disabled?: boolean;
}

interface ChoiceListBase<T extends string> {
  title?: ReactNode;
  options: ChoiceOption<T>[];
  tone?: CheckboxTone;
  error?: ReactNode;
  className?: string;
}

type ChoiceListProps<T extends string> = ChoiceListBase<T> &
  (
    | { multiple?: false; value: T | null; onChange: (value: T) => void }
    | { multiple: true; value: T[]; onChange: (value: T[]) => void }
  );

export function ChoiceList<T extends string>(props: ChoiceListProps<T>) {
  const { title, options, tone = "default", error, className } = props;
  const name = useId();

  return (
    <fieldset className={cx("kui-choicelist", className)}>
      {title && <legend className="kui-choicelist__title">{title}</legend>}
      <div className="kui-choicelist__options">
        {options.map((opt) => {
          if (props.multiple) {
            const checked = props.value.includes(opt.value);
            return (
              <Checkbox
                key={opt.value}
                tone={tone}
                label={opt.label}
                helpText={opt.helpText}
                checked={checked}
                disabled={opt.disabled}
                onChange={() =>
                  props.onChange(
                    checked
                      ? props.value.filter((v) => v !== opt.value)
                      : [...props.value, opt.value],
                  )
                }
              />
            );
          }
          const selected = props.value === opt.value;
          return (
            <label
              key={opt.value}
              className={cx("kui-radio", opt.disabled && "is-disabled")}
            >
              <span className="kui-radio__control">
                <input
                  type="radio"
                  className="kui-radio__input"
                  name={name}
                  checked={selected}
                  disabled={opt.disabled}
                  onChange={() => props.onChange(opt.value)}
                />
                <span className="kui-radio__box" aria-hidden="true" />
              </span>
              <span className="kui-radio__text">
                <span className="kui-radio__label">{opt.label}</span>
                {opt.helpText && (
                  <span className="kui-radio__help">{opt.helpText}</span>
                )}
              </span>
            </label>
          );
        })}
      </div>
      {error && <div className="kui-choicelist__error">{error}</div>}
    </fieldset>
  );
}
