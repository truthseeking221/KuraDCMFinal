"use client";

import { useState } from "react";
import { cx } from "@/lib/cx";
import { ChevronLeft, ChevronRight } from "@/icons";
import "./Calendar.css";

export interface DateRange {
  start: Date | null;
  end: Date | null;
}

interface BaseProps {
  min?: Date;
  max?: Date;
  className?: string;
}

export type CalendarProps =
  | (BaseProps & { mode?: "single"; value: Date | null; onChange: (date: Date) => void })
  | (BaseProps & { mode: "range"; value: DateRange; onChange: (range: DateRange) => void });

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const key = (d: Date) => d.getFullYear() * 10000 + d.getMonth() * 100 + d.getDate();
const same = (a: Date | null, b: Date | null) => !!a && !!b && key(a) === key(b);

export function Calendar(props: CalendarProps) {
  const { min, max, className } = props;
  const isRange = props.mode === "range";

  const seed = isRange
    ? (props.value.start ?? new Date())
    : (props.value ?? new Date());
  const [view, setView] = useState({ y: seed.getFullYear(), m: seed.getMonth() });
  const today = new Date();

  const first = new Date(view.y, view.m, 1);
  const gridStart = new Date(view.y, view.m, 1 - first.getDay());
  const cells = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });

  const disabled = (d: Date) =>
    (min ? key(d) < key(min) : false) || (max ? key(d) > key(max) : false);

  const shift = (delta: number) => {
    const m = view.m + delta;
    setView({ y: view.y + Math.floor(m / 12), m: ((m % 12) + 12) % 12 });
  };

  const handlePick = (d: Date) => {
    if (props.mode === "range") {
      const { start, end } = props.value;
      if (!start || (start && end)) {
        props.onChange({ start: d, end: null });
      } else if (key(d) < key(start)) {
        props.onChange({ start: d, end: start });
      } else {
        props.onChange({ start, end: d });
      }
    } else {
      props.onChange(d);
    }
  };

  const dayState = (d: Date) => {
    if (props.mode === "range") {
      const { start, end } = props.value;
      if (same(d, start)) return "start";
      if (same(d, end)) return "end";
      if (start && end && key(d) > key(start) && key(d) < key(end)) return "in";
      return null;
    }
    return same(d, props.value) ? "selected" : null;
  };

  const title = first.toLocaleString("en-US", { month: "long", year: "numeric" });

  return (
    <div className={cx("kui-cal", className)}>
      <div className="kui-cal__head">
        <button type="button" className="kui-cal__nav" aria-label="Previous month" onClick={() => shift(-1)}>
          <ChevronLeft />
        </button>
        <span className="kui-cal__title">{title}</span>
        <button type="button" className="kui-cal__nav" aria-label="Next month" onClick={() => shift(1)}>
          <ChevronRight />
        </button>
      </div>
      <div className="kui-cal__grid">
        {WEEKDAYS.map((w) => (
          <div key={w} className="kui-cal__wd">
            {w}
          </div>
        ))}
        {cells.map((d, i) => {
          const outside = d.getMonth() !== view.m;
          const state = dayState(d);
          return (
            <button
              key={i}
              type="button"
              disabled={disabled(d)}
              onClick={() => handlePick(d)}
              className={cx(
                "kui-cal__day",
                outside && "is-outside",
                same(d, today) && "is-today",
                state === "selected" && "is-selected",
                state === "start" && "is-range-start",
                state === "end" && "is-range-end",
                state === "in" && "is-in-range",
              )}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
