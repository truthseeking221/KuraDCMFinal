"use client";

import { useLang } from "@/i18n/LanguageProvider";
import { type Package } from "@/data/catalog";
import { Button, Icon, Pill } from "@/components/ui";
import { cx } from "@/lib/cx";

const TIER_LABEL = {
  essential: { en: "Essential", km: "សំខាន់" },
  advance: { en: "Advance", km: "កម្រិតខ្ពស់" },
  comprehensive: { en: "Comprehensive", km: "ពេញលេញ" },
} as const;

export function PackageCard({ pkg }: { pkg: Package }) {
  const { t } = useLang();
  const save = Math.round(((pkg.refUSD - pkg.priceUSD) / pkg.refUSD) * 100);
  const featured = pkg.popular;
  return (
    <div
      className={cx(
        "relative flex h-full flex-col gap-6 rounded-[var(--radius-lg)] p-7 transition-[transform,box-shadow] duration-300 ease-[var(--ease-out)] hover:-translate-y-1",
        featured
          ? "bg-surface ring-2 ring-brand-500 shadow-[var(--shadow-md)]"
          : "bg-surface ring-1 ring-[var(--hairline)] hover:shadow-[var(--shadow-md)]",
      )}
    >
      {featured ? (
        <span className="absolute -top-3 left-7 rounded-pill bg-brand-500 px-3 py-1 text-[0.75rem] font-medium uppercase tracking-wider text-white shadow-[var(--shadow-sm)]">
          {t({ en: "Most popular", km: "ពេញនិយម" })}
        </span>
      ) : null}

      <div className="flex items-center justify-between">
        <Pill tone={featured ? "brand" : "neutral"}>{t(TIER_LABEL[pkg.tier])}</Pill>
        <span className="text-[0.8125rem] font-medium text-ink-500">
          {t({ en: `${pkg.testCount} tests`, km: `តេស្ត ${pkg.testCount}` })}
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        <h3 className="text-h3 font-medium text-ink-900">{t(pkg.name)}</h3>
        <p className="text-[0.9375rem] leading-snug text-ink-600">{t(pkg.tagline)}</p>
      </div>

      <div className="flex items-end gap-3">
        <span className="text-h2 font-medium tracking-tight text-ink-900">${pkg.priceUSD}</span>
        <div className="mb-1.5 flex flex-col">
          <span className="text-[0.875rem] text-ink-400 line-through">${pkg.refUSD}</span>
          <span className="text-[0.75rem] font-medium text-success-600">
            {t({ en: `Save ${save}%`, km: `សន្សំ ${save}%` })}
          </span>
        </div>
      </div>

      <Button
        href={`/packages/${pkg.slug}`}
        full
        variant={featured ? "primary" : "outline"}
        iconRight="arrow-right"
      >
        {t({ en: "View package", km: "មើលកញ្ចប់" })}
      </Button>

      <ul className="flex flex-col gap-2.5 border-t border-[var(--hairline)] pt-5">
        {pkg.highlights.map((h) => (
          <li key={h.en} className="flex items-center gap-2.5 text-[0.875rem] text-ink-700">
            <Icon name="check-circle" size={17} className="shrink-0 text-success-500" />
            {t(h)}
          </li>
        ))}
      </ul>
    </div>
  );
}
