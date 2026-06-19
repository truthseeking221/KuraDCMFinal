"use client";

import Link from "next/link";
import { useLang } from "@/i18n/LanguageProvider";
import { type Package } from "@/data/catalog";
import { Container, Button, Pill, Icon, Reveal } from "@/components/ui";

const TIER_LABEL = {
  essential: { en: "Essential", km: "សំខាន់" },
  advance: { en: "Advance", km: "កម្រិតខ្ពស់" },
  comprehensive: { en: "Comprehensive", km: "ពេញលេញ" },
} as const;

export function PackageDetail({ pkg }: { pkg: Package }) {
  const { t } = useLang();
  const save = Math.round(((pkg.refUSD - pkg.priceUSD) / pkg.refUSD) * 100);

  return (
    <>
      <section className="border-b border-[var(--hairline)] pt-[calc(var(--header-h)+2rem)]">
        <Container>
          <nav className="flex items-center gap-2 py-5 text-[0.8125rem] text-ink-500">
            <Link href="/packages" className="hover:text-ink-800">
              {t({ en: "Packages", km: "កញ្ចប់" })}
            </Link>
            <Icon name="chevron-right" size={14} className="text-ink-300" />
            <span>{t(TIER_LABEL[pkg.tier])}</span>
          </nav>
        </Container>
      </section>

      <section className="section-y !pt-12">
        <Container>
          <div className="grid gap-12 lg:grid-cols-[1.6fr_1fr] lg:gap-16">
            <div className="flex flex-col gap-10">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <Pill tone="brand">{t(TIER_LABEL[pkg.tier])}</Pill>
                  {pkg.popular ? <Pill tone="success" dot="success">{t({ en: "Most popular", km: "ពេញនិយម" })}</Pill> : null}
                </div>
                <h1 className="text-h1 font-medium text-ink-950">{t(pkg.name)}</h1>
                <p className="max-w-xl text-lead text-ink-600">{t(pkg.tagline)}</p>
                <p className="text-[0.9375rem] text-ink-500">
                  <span className="font-medium text-ink-700">{t({ en: "Best for: ", km: "សមរម្យសម្រាប់៖ " })}</span>
                  {t(pkg.forWho)}
                </p>
              </div>

              {/* Included, grouped by system */}
              <div className="flex flex-col gap-5">
                <h2 className="text-h3 font-medium text-ink-900">
                  {t({ en: `What's included`, km: "អ្វីដែលរួមបញ្ចូល" })}
                  <span className="ml-2 text-[1rem] font-medium text-ink-400">
                    {t({ en: `${pkg.testCount} tests`, km: `តេស្ត ${pkg.testCount}` })}
                  </span>
                </h2>
                <div className="grid gap-px overflow-hidden rounded-[var(--radius-lg)] border border-[var(--hairline)] bg-[var(--hairline)]">
                  {pkg.groups.map((g) => (
                    <Reveal key={g.label.en} className="bg-surface">
                      <div className="flex flex-col gap-3 p-5">
                        <h3 className="text-[0.8125rem] font-medium uppercase tracking-wide text-brand-600">
                          {t(g.label)}
                        </h3>
                        {g.items.length > 0 ? (
                          <ul className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
                            {g.items.map((item) => (
                              <li key={item} className="flex items-center gap-2.5 text-[0.9375rem] text-ink-700">
                                <Icon name="check" size={16} className="shrink-0 text-success-500" />
                                {item}
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    </Reveal>
                  ))}
                </div>
              </div>
            </div>

            {/* Price card */}
            <div className="lg:relative">
              <div className="flex flex-col gap-5 rounded-[var(--radius-xl)] border border-[var(--hairline)] bg-surface p-6 shadow-[var(--shadow-md)] lg:sticky lg:top-[calc(var(--header-h)+1.5rem)]">
                <div className="flex items-end gap-3">
                  <span className="text-h1 font-medium tracking-tight text-ink-900">${pkg.priceUSD}</span>
                  <div className="mb-2 flex flex-col">
                    <span className="text-[0.9375rem] text-ink-400 line-through">${pkg.refUSD}</span>
                    <span className="text-[0.8125rem] font-medium text-success-600">
                      {t({ en: `Save ${save}%`, km: `សន្សំ ${save}%` })}
                    </span>
                  </div>
                </div>
                <p className="text-[0.8125rem] text-ink-500">
                  {t({
                    en: `That's about $${(pkg.priceUSD / pkg.testCount).toFixed(2)} per test.`,
                    km: `ប្រហែល $${(pkg.priceUSD / pkg.testCount).toFixed(2)} ក្នុងមួយតេស្ត។`,
                  })}
                </p>

                <Button href="/contact" full size="lg" iconRight="arrow-right">
                  {t({ en: "Book this package", km: "កក់កញ្ចប់នេះ" })}
                </Button>

                <ul className="flex flex-col gap-2.5 border-t border-[var(--hairline)] pt-5">
                  {pkg.highlights.map((h) => (
                    <li key={h.en} className="flex items-center gap-2.5 text-[0.875rem] text-ink-700">
                      <Icon name="check-circle" size={17} className="shrink-0 text-success-500" />
                      {t(h)}
                    </li>
                  ))}
                  <li className="flex items-center gap-2.5 text-[0.875rem] text-ink-700">
                    <Icon name="clock" size={17} className="shrink-0 text-ink-400" />
                    {t(pkg.turnaround)} · {pkg.fasting ? t({ en: "Fasting required", km: "ត្រូវតមអាហារ" }) : t({ en: "No fasting", km: "មិនតមអាហារ" })}
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
