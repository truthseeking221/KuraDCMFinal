"use client";

import { useId, useState, type ReactNode } from "react";
import { cx } from "@/lib/cx";
import { Icon } from "./Icon";

export type AccordionItem = {
  q: ReactNode;
  a: ReactNode;
};

export function Accordion({
  items,
  defaultOpen = 0,
  tone = "default",
  className,
}: {
  items: AccordionItem[];
  defaultOpen?: number | null;
  tone?: "default" | "inverse";
  className?: string;
}) {
  const [open, setOpen] = useState<number | null>(defaultOpen);
  const inverse = tone === "inverse";
  const baseId = useId();
  return (
    <div className={cx("flex flex-col", className)}>
      {items.map((item, i) => {
        const isOpen = open === i;
        const panelId = `${baseId}-${i}`;
        return (
          <div
            key={i}
            className={cx(
              "border-t last:border-b",
              inverse ? "border-white/12" : "border-[var(--hairline)]",
            )}
          >
            <button
              type="button"
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() => setOpen(isOpen ? null : i)}
              className="flex w-full items-center justify-between gap-6 py-5 text-left"
            >
              <span
                className={cx(
                  "text-[1.0625rem] font-medium",
                  inverse ? "text-white" : "text-text-primary",
                )}
              >
                {item.q}
              </span>
              <span
                className={cx(
                  "grid size-7 shrink-0 place-items-center rounded-full transition-transform duration-300 ease-[var(--ease-out)]",
                  inverse ? "bg-white/10 text-white" : "bg-ink-100 text-ink-600",
                  isOpen && "rotate-180",
                )}
              >
                <Icon name="chevron-down" size={16} />
              </span>
            </button>
            <div
              id={panelId}
              role="region"
              aria-hidden={!isOpen}
              inert={!isOpen}
              className={cx(
                "grid transition-all duration-300 ease-[var(--ease-out)]",
                isOpen
                  ? "grid-rows-[1fr] opacity-100"
                  : "grid-rows-[0fr] opacity-0",
              )}
            >
              <div className="overflow-hidden">
                <p
                  className={cx(
                    "max-w-2xl pb-6 text-[0.9375rem] leading-relaxed",
                    inverse ? "text-white/65" : "text-text-secondary",
                  )}
                >
                  {item.a}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
