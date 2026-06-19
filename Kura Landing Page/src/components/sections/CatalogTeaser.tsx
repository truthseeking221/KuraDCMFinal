"use client";

import Link from "next/link";
import { useLang } from "@/i18n/LanguageProvider";
import { CATEGORIES, popularTests } from "@/data/catalog";
import { Section, SectionHeader, Button, Reveal, Icon } from "@/components/ui";
import { TestCard } from "@/components/catalog/TestCard";

export function CatalogTeaser({ tone = "default" }: { tone?: "default" | "tint" }) {
  const { t } = useLang();
  const tests = popularTests().slice(0, 6);
  return (
    <Section tone={tone}>
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <SectionHeader
          eyebrow={t({ en: "Catalog", km: "បញ្ជីតេស្ត" })}
          title={t({ en: "500+ tests. One clear price each.", km: "តេស្តជាង ៥០០ តម្លៃច្បាស់លាស់" })}
          lead={t({
            en: "See what each panel includes, the specimen, and the turnaround. Before you order.",
            km: "រាល់ផ្គុំតេស្តបង្ហាញនូវអ្វីដែលរួមបញ្ចូល មុនពេលបញ្ជាទិញ។",
          })}
        />
        <Button href="/tests" variant="outline" iconRight="arrow-right" className="shrink-0">
          {t({ en: "Browse all", km: "មើលទាំងអស់" })}
        </Button>
      </div>

      <Reveal className="mt-8">
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <Link
              key={c.slug}
              href={`/tests?category=${c.slug}`}
              className="inline-flex items-center gap-1.5 rounded-pill border border-[var(--hairline)] bg-surface px-3.5 py-2 text-[0.8125rem] font-medium text-ink-700 transition-colors hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
            >
              <Icon name={c.icon} size={14} className="text-brand-500" />
              {t(c.name)}
            </Link>
          ))}
        </div>
      </Reveal>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tests.map((test, i) => (
          <Reveal key={test.slug} delay={((i % 3) + 1) as 1 | 2 | 3}>
            <TestCard test={test} />
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
