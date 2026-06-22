"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cx } from "@/lib/cx";
import { Check, ChevronDown } from "@/icons";
import "./CarePlanDestinationPicker.css";

export interface CarePlanOption {
  id: string;
  title: string;
}

export interface CarePlanDestinationPickerProps {
  /** Active care plans the order can be routed into. */
  plans: CarePlanOption[];
  /** Selected plan id, or `null` for a standalone lab order. */
  value: string | null;
  /** Fired with the chosen plan id, or `null` for standalone. */
  onChange: (planId: string | null) => void;
  /** When provided, renders the confirmation line below the control. */
  testCount?: number;
  className?: string;
}

const STANDALONE_LABEL = "Standalone lab order";

export function CarePlanDestinationPicker({
  plans,
  value,
  onChange,
  testCount,
  className,
}: CarePlanDestinationPickerProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const selected = value == null ? null : plans.find((p) => p.id === value) ?? null;
  const currentLabel = selected ? selected.title : STANDALONE_LABEL;

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function choose(planId: string | null) {
    onChange(planId);
    setOpen(false);
  }

  let confirmation: string | null = null;
  if (testCount != null) {
    const noun = testCount === 1 ? "test" : "tests";
    confirmation = selected
      ? `${testCount} ${noun} will be added to ${selected.title}`
      : `${testCount} ${noun} will be ordered as a standalone lab order.`;
  }

  return (
    <div ref={rootRef} className={cx("kui-cpdp", className)}>
      <div className="kui-cpdp__row">
        <span className="kui-cpdp__lead">Add to:</span>
        <button
          type="button"
          className={cx("kui-cpdp__current", selected && "is-plan")}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={open ? menuId : undefined}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="kui-cpdp__current-label">{currentLabel}</span>
          <ChevronDown size={14} className="kui-cpdp__caret" />
        </button>
      </div>

      {open && (
        <div id={menuId} role="menu" className="kui-cpdp__menu">
          {plans.map((plan) => {
            const active = plan.id === value;
            return (
              <button
                key={plan.id}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                className={cx("kui-cpdp__option", active && "is-active")}
                onClick={() => choose(plan.id)}
              >
                <span className="kui-cpdp__option-label">{plan.title}</span>
                {active && <Check size={15} className="kui-cpdp__tick" />}
              </button>
            );
          })}
          <div className="kui-cpdp__sep" role="separator" />
          <button
            type="button"
            role="menuitemradio"
            aria-checked={value == null}
            className={cx("kui-cpdp__option", value == null && "is-active")}
            onClick={() => choose(null)}
          >
            <span className="kui-cpdp__option-label">{STANDALONE_LABEL}</span>
            {value == null && <Check size={15} className="kui-cpdp__tick" />}
          </button>
        </div>
      )}

      {confirmation && <p className="kui-cpdp__confirm">{confirmation}</p>}
    </div>
  );
}
