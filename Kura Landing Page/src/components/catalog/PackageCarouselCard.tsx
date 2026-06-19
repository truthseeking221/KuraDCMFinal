"use client";

import Link from "next/link";
import { useLang } from "@/i18n/LanguageProvider";
import { type Package } from "@/data/catalog";
import { Button, Icon } from "@/components/ui";
import { cx } from "@/lib/cx";

export function PackageCarouselCard({ pkg }: { pkg: Package }) {
  const { t } = useLang();
  const save = Math.round(((pkg.refUSD - pkg.priceUSD) / pkg.refUSD) * 100);
  const chips = pkg.groups.filter((g) => g.items.length > 0).slice(0, 5);
  const more = Math.max(0, pkg.groups.filter((g) => g.items.length > 0).length - chips.length);

  return (
    <article
      className={cx(
        "flex w-[19rem] shrink-0 snap-start flex-col rounded-[var(--radius-lg)] border bg-surface transition-[transform,box-shadow] duration-300 ease-[var(--ease-out)] hover:-translate-y-1 hover:shadow-[var(--shadow-md)] sm:w-[21rem]",
        pkg.popular ? "border-brand-200 ring-1 ring-brand-100" : "border-[var(--hairline)]",
      )}
    >
      <div className="flex flex-1 flex-col gap-4 p-6">
        <div className="flex items-center justify-between">
          <span
            className={cx(
              "rounded-pill px-2.5 py-1 text-[0.6875rem] font-semibold uppercase tracking-wide",
              pkg.popular ? "bg-brand-50 text-brand-700" : "bg-ink-100 text-ink-600",
            )}
          >
            {pkg.popular ? t({ en: "Most booked", km: "កក់ច្រើនជាងគេ" }) : t({ en: "Screening", km: "ការត្រួតពិនិត្យ" })}
          </span>
        </div>

        <div className="flex flex-col gap-1.5">
          <h3 className="text-h4 font-semibold text-ink-900">
            <Link href={`/packages/${pkg.slug}`} className="hover:text-brand-700">
              {t(pkg.name)}
            </Link>
          </h3>
          <Link
            href={`/packages/${pkg.slug}`}
            className="inline-flex w-fit items-center gap-1 text-[0.8125rem] font-semibold text-brand-600 hover:text-brand-700"
          >
            {t({ en: "View details", km: "មើលលម្អិត" })}
            <Icon name="chevron-right" size={14} />
          </Link>
        </div>

        {/* Meta */}
        <div className="flex items-center gap-3 border-y border-[var(--hairline)] py-3 text-[0.8125rem] text-ink-500">
          <span className="inline-flex items-center gap-1.5">
            <Icon name="clock" size={15} className="text-ink-400" />
            {t({ en: "Results", km: "លទ្ធផល" })}
            <span className="rounded bg-success-50 px-1.5 py-0.5 font-semibold text-success-600">
              {t(pkg.turnaround)}
            </span>
          </span>
          <span className="text-ink-200">|</span>
          <span className="inline-flex items-center gap-1.5">
            {t({ en: "Tests", km: "តេស្ត" })}
            <span className="rounded bg-ink-100 px-1.5 py-0.5 font-semibold text-ink-700">{pkg.testCount}</span>
          </span>
        </div>

        {/* System chips */}
        <div className="flex flex-wrap gap-1.5">
          {chips.map((g) => (
            <span
              key={g.label.en}
              className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] border border-[var(--hairline)] px-2 py-1 text-[0.75rem] text-ink-600"
            >
              <span className="size-1.5 rounded-full bg-brand-400" />
              {t(g.label)}
            </span>
          ))}
          {more > 0 ? (
            <span className="inline-flex items-center rounded-[var(--radius-sm)] bg-ink-100 px-2 py-1 text-[0.75rem] font-medium text-ink-600">
              +{more}
            </span>
          ) : null}
        </div>
      </div>

      {/* Footer: price + CTA */}
      <div className="flex items-center justify-between gap-3 rounded-b-[var(--radius-lg)] border-t border-[var(--hairline)] bg-ink-25 px-6 py-4">
        <div className="flex flex-col">
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-ink-900">${pkg.priceUSD}</span>
            <span className="text-[0.8125rem] text-ink-400 line-through">${pkg.refUSD}</span>
          </div>
          <span className="text-[0.6875rem] font-semibold text-success-600">
            {t({ en: `${save}% off`, km: `បញ្ចុះ ${save}%` })}
          </span>
        </div>
        <Button href={`/packages/${pkg.slug}`} size="sm" iconRight="arrow-right">
          {t({ en: "Book now", km: "កក់ឥឡូវ" })}
        </Button>
      </div>
    </article>
  );
}
