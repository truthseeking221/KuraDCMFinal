"use client";

import type { ReactNode } from "react";
import { useLang, type Localized } from "@/i18n/LanguageProvider";
import { Section, Eyebrow, Reveal } from "@/components/ui";
import { cx } from "@/lib/cx";

export type NumberedItem = { title: Localized; body: Localized };

export function NumberedList({
  eyebrow,
  title,
  lead,
  items,
  aside,
  tone = "default",
}: {
  eyebrow?: Localized;
  title: Localized;
  lead?: Localized;
  items: NumberedItem[];
  aside?: ReactNode;
  tone?: "default" | "tint";
}) {
  const { t } = useLang();
  return (
    <Section tone={tone}>
      <div className={cx("grid gap-12", aside ? "lg:grid-cols-[1fr_1fr] lg:gap-16" : "")}>
        <div className="flex flex-col gap-5">
          {eyebrow ? (
            <Reveal>
              <Eyebrow>{t(eyebrow)}</Eyebrow>
            </Reveal>
          ) : null}
          <Reveal delay={1}>
            <h2 className="max-w-xl text-h2 font-medium text-balance text-ink-950">{t(title)}</h2>
          </Reveal>
          {lead ? (
            <Reveal delay={2}>
              <p className="max-w-lg text-lead text-ink-600">{t(lead)}</p>
            </Reveal>
          ) : null}
        </div>
        <div className="flex flex-col">
          {items.map((item, i) => (
            <Reveal key={item.title.en} delay={((i % 4) + 1) as 1 | 2 | 3 | 4}>
              <div
                className={cx(
                  "flex gap-5 border-t border-[var(--hairline)] py-6 last:border-b",
                )}
              >
                <span className="font-mono text-[0.9375rem] font-medium text-brand-500">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="flex flex-col gap-1.5">
                  <h3 className="text-[1.125rem] font-medium text-ink-900">{t(item.title)}</h3>
                  <p className="text-[0.9375rem] leading-relaxed text-ink-600">{t(item.body)}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </Section>
  );
}
