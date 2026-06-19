"use client";

import { useEffect, useRef, useState } from "react";
import { useLang, type Localized } from "@/i18n/LanguageProvider";
import { Section, SectionHeader, Icon, type IconName } from "@/components/ui";
import { cx } from "@/lib/cx";

export type Step = {
  icon: IconName;
  title: Localized;
  body: Localized;
};

export function StickySteps({
  eyebrow,
  title,
  lead,
  steps,
  tone = "default",
}: {
  eyebrow?: Localized;
  title: Localized;
  lead?: Localized;
  steps: Step[];
  tone?: "default" | "tint";
}) {
  const { t } = useLang();
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) {
          const idx = refs.current.indexOf(visible.target as HTMLDivElement);
          if (idx >= 0) setActive(idx);
        }
      },
      { rootMargin: "-40% 0px -40% 0px", threshold: [0.1, 0.5, 1] },
    );
    refs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <Section tone={tone}>
      <SectionHeader eyebrow={eyebrow ? t(eyebrow) : undefined} title={t(title)} lead={lead ? t(lead) : undefined} />
      <div className="mt-12 grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
        {/* Sticky nav list */}
        <ol className="hidden flex-col gap-2 lg:sticky lg:top-[calc(var(--header-h)+3rem)] lg:flex lg:self-start">
          {steps.map((s, i) => {
            const on = i === active;
            return (
              <li key={s.title.en}>
                <button
                  type="button"
                  onClick={() => refs.current[i]?.scrollIntoView({ behavior: "smooth", block: "center" })}
                  className={cx(
                    "flex w-full items-center gap-3 rounded-[var(--radius-md)] px-4 py-3 text-left transition-all duration-300",
                    on ? "bg-surface shadow-[var(--shadow-sm)] ring-1 ring-[var(--hairline)]" : "opacity-50 hover:opacity-80",
                  )}
                >
                  <span
                    className={cx(
                      "font-mono text-[0.8125rem] font-semibold",
                      on ? "text-brand-500" : "text-ink-400",
                    )}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className={cx("text-[1.0625rem] font-semibold", on ? "text-ink-900" : "text-ink-600")}>
                    {t(s.title)}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>

        {/* Scrolling panels */}
        <div className="flex flex-col gap-6 lg:gap-10">
          {steps.map((s, i) => (
            <div
              key={s.title.en}
              ref={(el) => {
                refs.current[i] = el;
              }}
              className="flex flex-col gap-5 rounded-[var(--radius-xl)] border border-[var(--hairline)] bg-surface p-7 sm:p-10 lg:min-h-[60vh] lg:justify-center"
            >
              <div className="flex items-center gap-4">
                <span className="grid size-14 place-items-center rounded-[var(--radius-lg)] bg-brand-50 text-brand-600">
                  <Icon name={s.icon} size={28} />
                </span>
                <span className="font-mono text-[0.875rem] font-semibold text-ink-300">
                  {t({ en: "STEP", km: "ជំហាន" })} {String(i + 1).padStart(2, "0")}
                </span>
              </div>
              <h3 className="text-h3 font-medium text-ink-950">{t(s.title)}</h3>
              <p className="max-w-xl text-lead text-ink-600">{t(s.body)}</p>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}
