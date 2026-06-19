"use client";

import { useState } from "react";
import Link from "next/link";
import { useLang, type Localized } from "@/i18n/LanguageProvider";
import { Section, SectionHeader, Button, Icon } from "@/components/ui";
import { cx } from "@/lib/cx";

type Concern = {
  group: string;
  title: Localized;
  desc: Localized;
  turnaround: Localized;
  params: number;
  priceUSD: number;
  refUSD: number;
  href: string;
};

const CHIPS: { key: string; label: Localized }[] = [
  { key: "all", label: { en: "All", km: "ទាំងអស់" } },
  { key: "diet", label: { en: "Junk food", km: "អាហារមិនល្អ" } },
  { key: "sedentary", label: { en: "Sedentary", km: "អង្គុយច្រើន" } },
  { key: "smoking", label: { en: "Smoking", km: "ការជក់បារី" } },
  { key: "alcohol", label: { en: "Alcohol", km: "គ្រឿងស្រវឹង" } },
  { key: "stress", label: { en: "Stress", km: "ភាពតានតឹង" } },
  { key: "sleep", label: { en: "Poor sleep", km: "គេងមិនលក់" } },
];

const CONCERNS: Concern[] = [
  { group: "diet", title: { en: "Cholesterol & Sugar Screen", km: "ពិនិត្យខ្លាញ់ និងជាតិស្ករ" }, desc: { en: "Spots early metabolic risk from a high-sugar, high-fat diet, while it is still easy to change.", km: "រកហានិភ័យមេតាបូលីសដំបូងពីអាហារ។" }, turnaround: { en: "Same day", km: "ថ្ងៃតែមួយ" }, params: 14, priceUSD: 18, refUSD: 34, href: "/packages/heart-metabolic" },
  { group: "sedentary", title: { en: "Metabolic Risk Panel", km: "ផ្គុំហានិភ័យមេតាបូលីស" }, desc: { en: "See how a sit-all-day routine is shifting your sugar, lipids and weight.", km: "របៀបដែលការអង្គុយច្រើនប៉ះពាល់ជាតិស្ករ និងខ្លាញ់។" }, turnaround: { en: "24 hours", km: "២៤ ម៉ោង" }, params: 28, priceUSD: 39, refUSD: 78, href: "/packages/heart-metabolic" },
  { group: "smoking", title: { en: "Smoking Impact Panel", km: "ផ្គុំផលប៉ះពាល់ការជក់បារី" }, desc: { en: "A deeper look at what smoking does to your body over the years.", km: "ការវាយតម្លៃផលប៉ះពាល់នៃការជក់បារី។" }, turnaround: { en: "24 hours", km: "២៤ ម៉ោង" }, params: 33, priceUSD: 29, refUSD: 62, href: "/tests?category=heart" },
  { group: "alcohol", title: { en: "Liver Function Panel", km: "ផ្គុំមុខងារថ្លើម" }, desc: { en: "See how regular drinking is treating your liver.", km: "ពិនិត្យឥទ្ធិពលនៃការផឹកលើថ្លើម។" }, turnaround: { en: "Same day", km: "ថ្ងៃតែមួយ" }, params: 7, priceUSD: 12, refUSD: 22, href: "/tests/lft" },
  { group: "stress", title: { en: "Stress & Thyroid Panel", km: "ផ្គុំស្ត្រេស និងក្រពេញ" }, desc: { en: "The cortisol and thyroid markers behind the fatigue and the mood swings.", km: "សញ្ញាក្រពេញ និងស្ត្រេសនៅពីក្រោយភាពអស់កម្លាំង។" }, turnaround: { en: "24 hours", km: "២៤ ម៉ោង" }, params: 9, priceUSD: 24, refUSD: 44, href: "/packages/thyroid-check" },
  { group: "sleep", title: { en: "Fatigue & Energy Panel", km: "ផ្គុំភាពអស់កម្លាំង" }, desc: { en: "Iron, thyroid and vitamin D. The usual suspects when your energy is low.", km: "ជាតិដែក ក្រពេញ និងវីតាមីន D ដែលធ្វើឲ្យអស់កម្លាំង។" }, turnaround: { en: "24 hours", km: "២៤ ម៉ោង" }, params: 16, priceUSD: 25, refUSD: 48, href: "/tests/ferritin" },
];

export function BrowseByConcern({ tone = "tint" }: { tone?: "default" | "tint" }) {
  const { t } = useLang();
  const [chip, setChip] = useState("all");
  const list = chip === "all" ? CONCERNS : CONCERNS.filter((c) => c.group === chip);

  return (
    <Section tone={tone} bleed pad>
      <div className="container-wide">
        <SectionHeader
          eyebrow={t({ en: "By lifestyle", km: "តាមរបៀបរស់នៅ" })}
          title={t({ en: "Your habits leave a trace. See it.", km: "របៀបដែលទម្លាប់ប្រចាំថ្ងៃប៉ះពាល់សុខភាព" })}
          lead={t({ en: "Pick the habit on your mind. We will show the tests that reveal what it is doing to your body.", km: "ជ្រើសទម្លាប់ដែលអ្នកចង់យល់ — មើលតេស្តដែលបង្ហាញផលប៉ះពាល់។" })}
        />
        <div className="mt-7 -mx-[var(--gutter)] flex gap-2 overflow-x-auto px-[var(--gutter)] pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {CHIPS.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => setChip(c.key)}
              className={cx(
                "shrink-0 rounded-pill border px-4 py-2 text-[0.8125rem] font-medium transition-colors",
                chip === c.key
                  ? "border-ink-900 bg-ink-900 text-white"
                  : "border-[var(--hairline)] bg-surface text-ink-700 hover:border-brand-200 hover:text-brand-700",
              )}
            >
              {t(c.label)}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-[var(--gutter)] pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {list.map((c) => {
          const save = Math.round(((c.refUSD - c.priceUSD) / c.refUSD) * 100);
          return (
            <article
              key={c.title.en}
              className="flex w-[19rem] shrink-0 snap-start flex-col rounded-[var(--radius-lg)] border border-[var(--hairline)] bg-surface sm:w-[21rem]"
            >
              <div className="flex flex-1 flex-col gap-3 p-6">
                <h3 className="text-h4 font-semibold text-ink-900">
                  <Link href={c.href} className="hover:text-brand-700">{t(c.title)}</Link>
                </h3>
                <div className="flex items-center gap-3 text-[0.8125rem] text-ink-500">
                  <span className="inline-flex items-center gap-1.5">
                    <Icon name="clock" size={14} className="text-ink-400" />
                    <span className="rounded bg-success-50 px-1.5 py-0.5 font-semibold text-success-600">{t(c.turnaround)}</span>
                  </span>
                  <span className="text-ink-200">|</span>
                  <span>{c.params} {t({ en: "params", km: "ប៉ារ៉ាម៉ែត្រ" })}</span>
                </div>
                <p className="text-[0.875rem] leading-relaxed text-ink-600">{t(c.desc)}</p>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-[var(--hairline)] bg-ink-25 px-6 py-4">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-bold text-ink-900">${c.priceUSD}</span>
                  <span className="text-[0.8125rem] text-ink-400 line-through">${c.refUSD}</span>
                  <span className="text-[0.6875rem] font-semibold text-success-600">{save}%</span>
                </div>
                <Button href={c.href} size="sm" iconRight="arrow-right">
                  {t({ en: "Book", km: "កក់" })}
                </Button>
              </div>
            </article>
          );
        })}
      </div>
    </Section>
  );
}
