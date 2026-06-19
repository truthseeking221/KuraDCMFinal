"use client";

import Link from "next/link";
import { useLang } from "@/i18n/LanguageProvider";
import { SCREENING } from "@/data/screening";
import { Section, SectionHeader, Reveal, Button } from "@/components/ui";
import { MedIcon } from "@/components/ui/MedIcon";

export function CategoryGrid({ tone = "default" }: { tone?: "default" | "tint" }) {
  const { t } = useLang();
  return (
    <Section tone={tone}>
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <SectionHeader
          eyebrow={t({ en: "Browse by need", km: "ស្វែងរកតាមតម្រូវការ" })}
          title={t({ en: "Screening for every concern", km: "ការតាមដានសម្រាប់រាល់កង្វល់" })}
          lead={t({
            en: "From a yearly check to a specific worry. Pick a category and see the tests and packages that fit.",
            km: "ពីការត្រួតពិនិត្យប្រចាំឆ្នាំ ដល់កង្វល់ជាក់លាក់ — ជ្រើសប្រភេទ ហើយមើលតេស្ត និងកញ្ចប់ដែលសម។",
          })}
        />
        <Button href="/tests" variant="outline" iconRight="arrow-right" className="shrink-0">
          {t({ en: "All tests", km: "តេស្តទាំងអស់" })}
        </Button>
      </div>

      <div className="mt-10 grid grid-cols-3 gap-3 xs:grid-cols-4 sm:grid-cols-5 lg:grid-cols-8">
        {SCREENING.map((c, i) => (
          <Reveal key={c.key} delay={((i % 6) % 5 + 1) as 1 | 2 | 3 | 4 | 5}>
            <Link
              href={c.href}
              className="group/cat flex h-full flex-col items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--hairline)] bg-surface px-3 py-5 text-center transition-[transform,box-shadow,border-color] duration-300 ease-[var(--ease-out)] hover:-translate-y-1 hover:border-brand-200 hover:shadow-[var(--shadow-md)]"
            >
              <span className="grid size-14 place-items-center rounded-[var(--radius-md)] bg-brand-50 text-brand-600 transition-colors duration-300 group-hover/cat:bg-brand-100 group-hover/cat:text-brand-700">
                <MedIcon name={c.icon} size={28} />
              </span>
              <span className="text-[0.8125rem] font-medium leading-tight text-ink-700">
                {t(c.name)}
              </span>
            </Link>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
