"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cx } from "@/lib/cx";

/** Splits "7M+", "24h", "0%", "1,200+" into { num, prefix, suffix }. */
function parseValue(value: string) {
  const match = value.match(/^([^\d]*)([\d.,]+)(.*)$/);
  if (!match) return { prefix: "", num: null as number | null, suffix: value };
  const [, prefix, digits, suffix] = match;
  const num = Number(digits.replace(/,/g, ""));
  return { prefix, num: Number.isFinite(num) ? num : null, suffix, digits };
}

function format(n: number, template: string) {
  if (template.includes(",")) return Math.round(n).toLocaleString("en-US");
  if (template.includes(".")) return n.toFixed(template.split(".")[1].length);
  return String(Math.round(n));
}

export function Stat({
  value,
  label,
  sub,
  align = "left",
  tone = "default",
  className,
}: {
  value: string;
  label: ReactNode;
  sub?: ReactNode;
  align?: "left" | "center";
  tone?: "default" | "inverse";
  className?: string;
}) {
  const { prefix, num, suffix, digits } = parseValue(value);
  const ref = useRef<HTMLDivElement | null>(null);
  const [display, setDisplay] = useState(num === null ? value : `${prefix}0${suffix}`);

  useEffect(() => {
    if (num === null) {
      return;
    }
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      const timer = window.setTimeout(() => setDisplay(value), 0);
      return () => window.clearTimeout(timer);
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      const timer = window.setTimeout(() => setDisplay(value), 0);
      return () => window.clearTimeout(timer);
    }
    let raf = 0;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;
        io.disconnect();
        const start = performance.now();
        const dur = 1100;
        const tick = (now: number) => {
          const p = Math.min(1, (now - start) / dur);
          const eased = 1 - Math.pow(1 - p, 3);
          setDisplay(`${prefix}${format(num * eased, digits ?? "0")}${suffix}`);
          if (p < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [num, prefix, suffix, value, digits]);

  return (
    <div
      ref={ref}
      className={cx(
        "flex flex-col gap-1",
        align === "center" && "items-center text-center",
        className,
      )}
    >
      <span
        className={cx(
          "text-h2 font-medium tabular-nums tracking-tight",
          tone === "inverse" ? "text-white" : "text-text-primary",
        )}
      >
        {display}
      </span>
      <span
        className={cx(
          "text-[0.875rem] font-medium",
          tone === "inverse" ? "text-white/65" : "text-text-secondary",
        )}
      >
        {label}
      </span>
      {sub ? (
        <span
          className={cx(
            "text-[0.75rem]",
            tone === "inverse" ? "text-white/45" : "text-text-tertiary",
          )}
        >
          {sub}
        </span>
      ) : null}
    </div>
  );
}

/** Hairline-divided horizontal stat strip (Function "160+ | Whole body | $1/day"). */
export function StatStrip({
  items,
  tone = "default",
  className,
}: {
  items: { value: string; label: ReactNode; sub?: ReactNode }[];
  tone?: "default" | "inverse";
  className?: string;
}) {
  return (
    <dl
      className={cx(
        "grid grid-cols-2 gap-x-6 gap-y-8 sm:flex sm:flex-wrap sm:items-start sm:gap-x-0",
        className,
      )}
    >
      {items.map((it, i) => (
        <div
          key={i}
          className={cx(
            "sm:px-7 sm:first:pl-0",
            i > 0 &&
              "sm:border-l sm:border-[var(--hairline)]",
          )}
        >
          <Stat value={it.value} label={it.label} sub={it.sub} tone={tone} />
        </div>
      ))}
    </dl>
  );
}
