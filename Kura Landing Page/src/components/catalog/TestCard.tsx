"use client";

import Link from "next/link";
import { useLang } from "@/i18n/LanguageProvider";
import { getCategory, type Test } from "@/data/catalog";
import { Icon, Pill } from "@/components/ui";
import { cx } from "@/lib/cx";

export function TestCard({ test, className }: { test: Test; className?: string }) {
  const { t } = useLang();
  const cat = getCategory(test.category);
  const save = test.refUSD ? test.refUSD - test.priceUSD : 0;
  return (
    <Link
      href={`/tests/${test.slug}`}
      className={cx(
        "group/test flex h-full flex-col gap-4 rounded-[var(--radius-lg)] border border-[var(--hairline)] bg-surface p-6 transition-[transform,box-shadow,border-color] duration-300 ease-[var(--ease-out)] hover:-translate-y-1 hover:border-brand-100 hover:shadow-[var(--shadow-md)]",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-[0.75rem] font-medium uppercase tracking-wide text-ink-400">
          {cat ? (
            <>
              <Icon name={cat.icon} size={14} className="text-brand-500" />
              {t(cat.name)}
            </>
          ) : null}
        </span>
        {test.fasting ? (
          <Pill tone="warn" icon="clock">
            {t({ en: "Fasting", km: "តមអាហារ" })}
          </Pill>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <h3 className="text-h4 font-medium text-ink-900">{t(test.name)}</h3>
        <p className="text-[0.875rem] leading-snug text-ink-600">{t(test.tagline)}</p>
      </div>

      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.75rem] text-ink-500">
        <span className="font-medium text-ink-700">
          {t({ en: `Includes ${test.analyteCount}`, km: `មាន ${test.analyteCount}` })}
          {test.analyteCount > 1 ? t({ en: " analytes", km: " តម្លៃ" }) : t({ en: " analyte", km: " តម្លៃ" })}
        </span>
        <span aria-hidden>·</span>
        <span>{t(test.specimen)}</span>
        <span aria-hidden>·</span>
        <span>{t(test.turnaround)}</span>
      </p>

      <div className="mt-auto flex items-end justify-between border-t border-[var(--hairline)] pt-4">
        <div className="flex flex-col">
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-medium text-ink-900">${test.priceUSD}</span>
            {test.refUSD ? (
              <span className="text-[0.875rem] text-ink-400 line-through">${test.refUSD}</span>
            ) : null}
          </div>
          {save > 0 ? (
            <span className="text-[0.75rem] font-medium text-success-600">
              {t({ en: `Save $${save}`, km: `សន្សំ $${save}` })}
            </span>
          ) : null}
        </div>
        <span className="inline-flex items-center gap-1 text-[0.875rem] font-medium text-brand-600">
          {t({ en: "View", km: "មើល" })}
          <Icon
            name="arrow-right"
            size={16}
            className="transition-transform duration-200 group-hover/test:translate-x-0.5"
          />
        </span>
      </div>
    </Link>
  );
}
