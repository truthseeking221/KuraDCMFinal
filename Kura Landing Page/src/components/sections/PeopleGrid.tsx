"use client";

import { useLang, type Localized } from "@/i18n/LanguageProvider";
import type { Person } from "@/data/team";
import { Section, SectionHeader, Reveal } from "@/components/ui";
import { cx } from "@/lib/cx";

export function PeopleGrid({
  people,
  eyebrow,
  title,
  lead,
  tone = "default",
  columns = 3,
}: {
  people: Person[];
  eyebrow?: Localized;
  title: Localized;
  lead?: Localized;
  tone?: "default" | "tint";
  columns?: 2 | 3;
}) {
  const { t } = useLang();
  return (
    <Section tone={tone}>
      <SectionHeader
        eyebrow={eyebrow ? t(eyebrow) : undefined}
        title={t(title)}
        lead={lead ? t(lead) : undefined}
      />
      <div
        className={cx(
          "mt-12 grid gap-px overflow-hidden rounded-[var(--radius-lg)] border border-[var(--hairline)] bg-[var(--hairline)]",
          columns === 2 ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3",
        )}
      >
        {people.map((p, i) => (
          <Reveal key={p.name} delay={((i % 3) + 1) as 1 | 2 | 3} className="bg-surface">
            <div className="flex items-center gap-4 p-6">
              <span className="grid size-14 shrink-0 place-items-center rounded-full bg-ink-900 text-[0.9375rem] font-medium text-white">
                {p.initials}
              </span>
              <div className="flex flex-col gap-0.5">
                <span className="text-[1.0625rem] font-medium text-ink-900">{p.name}</span>
                <span className="text-[0.875rem] font-medium text-brand-600">{t(p.role)}</span>
                <span className="text-[0.8125rem] text-ink-500">{t(p.affiliation)}</span>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
