"use client";

import { useLang } from "@/i18n/LanguageProvider";
import { LIFECYCLE } from "@/data/team";
import { Section, SectionHeader, Reveal, Icon, type IconName } from "@/components/ui";

export function HowItWorks({
  tone = "default",
  eyebrow,
  title,
  lead,
}: {
  tone?: "default" | "tint";
  eyebrow?: string;
  title?: string;
  lead?: string;
}) {
  const { t } = useLang();
  return (
    <Section tone={tone}>
      <SectionHeader
        eyebrow={eyebrow ?? t({ en: "How it works", km: "របៀបដំណើរការ" })}
        title={title ?? t({ en: "From order to answer, in a day", km: "ពីការបញ្ជាទិញ ដល់លទ្ធផល ក្នុងមួយថ្ងៃ" })}
        lead={
          lead ??
          t({
            en: "One simple path for doctors and patients alike, designed around how care actually moves in Cambodia.",
            km: "ផ្លូវសាមញ្ញមួយសម្រាប់គ្រូពេទ្យ និងអ្នកជំងឺ — រៀបចំតាមរបៀបដែលការថែទាំធ្វើដំណើរនៅកម្ពុជា។",
          })
        }
      />
      <div className="mt-14 grid gap-px overflow-hidden rounded-[var(--radius-xl)] border border-[var(--hairline)] bg-[var(--hairline)] sm:grid-cols-2 lg:grid-cols-4">
        {LIFECYCLE.map((step, i) => (
          <Reveal key={step.n} delay={(i % 4) as 0 | 1 | 2 | 3} className="bg-surface">
            <div className="flex h-full flex-col gap-4 p-7">
              <div className="flex items-center justify-between">
                <span className="grid size-11 place-items-center rounded-[var(--radius-md)] bg-brand-50 text-brand-600">
                  <Icon name={step.icon as IconName} size={22} />
                </span>
                <span className="font-mono text-[0.8125rem] font-medium text-ink-300">
                  {step.n}
                </span>
              </div>
              <h3 className="text-h4 font-medium text-ink-900">{t(step.title)}</h3>
              <p className="text-[0.9375rem] leading-relaxed text-ink-600">{t(step.body)}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
