"use client";

import { useState } from "react";
import { useLang, type Localized } from "@/i18n/LanguageProvider";
import { Section, SectionHeader, Button, Icon, type IconName } from "@/components/ui";
import { cx } from "@/lib/cx";

export type FeatureTab = {
  key: string;
  tab: Localized;
  icon: IconName;
  title: Localized;
  body: Localized;
  bullets: Localized[];
  cta?: { label: Localized; href: string };
};

/** Pill-tabbed switcher — one section does the work of several (use sparingly). */
export function TabbedFeature({
  eyebrow,
  title,
  lead,
  tabs,
  tone = "default",
}: {
  eyebrow?: Localized;
  title: Localized;
  lead?: Localized;
  tabs: FeatureTab[];
  tone?: "default" | "tint";
}) {
  const { t } = useLang();
  const [active, setActive] = useState(0);
  const tab = tabs[active];

  return (
    <Section tone={tone}>
      <SectionHeader align="center" eyebrow={eyebrow ? t(eyebrow) : undefined} title={t(title)} lead={lead ? t(lead) : undefined} />

      <div className="mt-10 flex flex-wrap justify-center gap-2">
        {tabs.map((tb, i) => (
          <button
            key={tb.key}
            type="button"
            onClick={() => setActive(i)}
            className={cx(
              "inline-flex items-center gap-2 rounded-pill border px-4 py-2.5 text-[0.875rem] font-semibold transition-colors",
              i === active
                ? "border-ink-900 bg-ink-900 text-white"
                : "border-[var(--hairline)] bg-surface text-ink-700 hover:border-brand-200 hover:text-brand-700",
            )}
          >
            <Icon name={tb.icon} size={16} />
            {t(tb.tab)}
          </button>
        ))}
      </div>

      <div className="mt-10 grid items-center gap-10 rounded-[var(--radius-2xl)] border border-[var(--hairline)] bg-surface p-7 sm:p-10 lg:grid-cols-2 lg:gap-16">
        <div key={tab.key} className="flex animate-fade-up flex-col gap-5">
          <span className="grid size-12 place-items-center rounded-[var(--radius-md)] bg-brand-50 text-brand-600">
            <Icon name={tab.icon} size={24} />
          </span>
          <h3 className="text-h3 font-medium text-ink-950">{t(tab.title)}</h3>
          <p className="text-lead text-ink-600">{t(tab.body)}</p>
          <ul className="flex flex-col gap-2.5">
            {tab.bullets.map((b) => (
              <li key={b.en} className="flex items-center gap-2.5 text-[0.9375rem] text-ink-700">
                <Icon name="check-circle" size={18} className="shrink-0 text-success-500" />
                {t(b)}
              </li>
            ))}
          </ul>
          {tab.cta ? (
            <Button href={tab.cta.href} iconRight="arrow-right" className="mt-1 self-start">
              {t(tab.cta.label)}
            </Button>
          ) : null}
        </div>
        <div key={`${tab.key}-viz`} className="flex animate-fade-up items-center justify-center rounded-[var(--radius-xl)] bg-gradient-to-br from-ink-25 to-brand-50 p-10 lg:min-h-[20rem]">
          <Icon name={tab.icon} size={96} className="text-brand-200" />
        </div>
      </div>
    </Section>
  );
}
