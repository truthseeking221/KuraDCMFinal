"use client";

import Link from "next/link";
import { useLang } from "@/i18n/LanguageProvider";
import { getCategory, testsByCategory, type Test } from "@/data/catalog";
import { Container, Button, Icon, Reveal } from "@/components/ui";
import { TestCard } from "./TestCard";

export function TestDetail({ test }: { test: Test }) {
  const { t } = useLang();
  const cat = getCategory(test.category);
  const save = test.refUSD ? test.refUSD - test.priceUSD : 0;
  const related = testsByCategory(test.category)
    .filter((x) => x.slug !== test.slug)
    .slice(0, 3);

  const facts: { icon: Parameters<typeof Icon>[0]["name"]; label: string; value: string }[] = [
    { icon: "droplet", label: t({ en: "Specimen", km: "សំណាក" }), value: t(test.specimen) },
    { icon: "clock", label: t({ en: "Turnaround", km: "រយៈពេល" }), value: t(test.turnaround) },
    {
      icon: "flask",
      label: t({ en: "Fasting", km: "តមអាហារ" }),
      value: test.fasting ? t({ en: "Required", km: "ត្រូវការ" }) : t({ en: "Not required", km: "មិនត្រូវការ" }),
    },
    {
      icon: "report",
      label: t({ en: "Includes", km: "រួមបញ្ចូល" }),
      value: t({ en: `${test.analyteCount} analytes`, km: `${test.analyteCount} តម្លៃ` }),
    },
  ];

  const qa = [
    { q: { en: "What is it?", km: "តើវាជាអ្វី?" }, a: test.whatIs },
    { q: { en: "What does it measure?", km: "តើវាវាស់អ្វី?" }, a: test.whatDoes },
    { q: { en: "Why it matters", km: "ហេតុអ្វីសំខាន់" }, a: test.whyMatters },
  ];

  return (
    <>
      <section className="border-b border-[var(--hairline)] pt-[calc(var(--header-h)+2rem)]">
        <Container>
          <nav className="flex items-center gap-2 py-5 text-[0.8125rem] text-ink-500">
            <Link href="/tests" className="hover:text-ink-800">
              {t({ en: "Tests", km: "តេស្ត" })}
            </Link>
            <Icon name="chevron-right" size={14} className="text-ink-300" />
            {cat ? <span>{t(cat.name)}</span> : null}
          </nav>
        </Container>
      </section>

      <section className="section-y !pt-12">
        <Container>
          <div className="grid gap-12 lg:grid-cols-[1.6fr_1fr] lg:gap-16">
            {/* Main */}
            <div className="flex flex-col gap-10">
              <div className="flex flex-col gap-4">
                {cat ? (
                  <span className="inline-flex items-center gap-1.5 text-[0.8125rem] font-medium uppercase tracking-wide text-brand-600">
                    <Icon name={cat.icon} size={15} />
                    {t(cat.name)}
                  </span>
                ) : null}
                <h1 className="text-h1 font-medium text-ink-950">{t(test.name)}</h1>
                <p className="max-w-xl text-lead text-ink-600">{t(test.tagline)}</p>
              </div>

              {/* Q&A */}
              <div className="flex flex-col gap-6">
                {qa.map((row) => (
                  <Reveal key={row.q.en}>
                    <div className="flex flex-col gap-1.5">
                      <h2 className="text-[1.0625rem] font-medium text-ink-900">{t(row.q)}</h2>
                      <p className="max-w-2xl text-[0.9375rem] leading-relaxed text-ink-600">{t(row.a)}</p>
                    </div>
                  </Reveal>
                ))}
              </div>

              {/* What's included */}
              <div className="flex flex-col gap-4 rounded-[var(--radius-lg)] border border-[var(--hairline)] bg-ink-25 p-6">
                <h2 className="text-[1.0625rem] font-medium text-ink-900">
                  {t({ en: "What's included", km: "អ្វីដែលរួមបញ្ចូល" })}
                </h2>
                <ul className="grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
                  {test.analytes.map((a) => (
                    <li key={a} className="flex items-center gap-2.5 text-[0.9375rem] text-ink-700">
                      <Icon name="check" size={16} className="shrink-0 text-success-500" />
                      {a}
                    </li>
                  ))}
                </ul>
                {test.analyteCount > test.analytes.length ? (
                  <p className="text-[0.8125rem] text-ink-400">
                    {t({
                      en: `+ ${test.analyteCount - test.analytes.length} more parameters reported.`,
                      km: `+ ${test.analyteCount - test.analytes.length} ប៉ារ៉ាម៉ែត្របន្ថែម។`,
                    })}
                  </p>
                ) : null}
              </div>
            </div>

            {/* Sticky price card */}
            <div className="lg:relative">
              <div className="flex flex-col gap-5 rounded-[var(--radius-xl)] border border-[var(--hairline)] bg-surface p-6 shadow-[var(--shadow-md)] lg:sticky lg:top-[calc(var(--header-h)+1.5rem)]">
                <div className="flex items-end gap-3">
                  <span className="text-h2 font-medium tracking-tight text-ink-900">${test.priceUSD}</span>
                  {test.refUSD ? (
                    <div className="mb-1.5 flex flex-col">
                      <span className="text-[0.875rem] text-ink-400 line-through">${test.refUSD}</span>
                      {save > 0 ? (
                        <span className="text-[0.75rem] font-medium text-success-600">
                          {t({ en: `Save $${save}`, km: `សន្សំ $${save}` })}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                <Button href="/contact" full size="lg" iconRight="arrow-right">
                  {t({ en: "Add to booking", km: "បន្ថែមទៅការកក់" })}
                </Button>
                <Button href="/how-it-works" full variant="ghost" size="sm">
                  {t({ en: "How sampling works", km: "របៀបប្រមូលសំណាក" })}
                </Button>

                <dl className="flex flex-col gap-3 border-t border-[var(--hairline)] pt-5">
                  {facts.map((f) => (
                    <div key={f.label} className="flex items-center justify-between gap-3">
                      <dt className="inline-flex items-center gap-2 text-[0.8125rem] text-ink-500">
                        <Icon name={f.icon} size={15} className="text-ink-400" />
                        {f.label}
                      </dt>
                      <dd className="text-[0.875rem] font-medium text-ink-800">{f.value}</dd>
                    </div>
                  ))}
                </dl>

                <div className="flex items-center gap-2 rounded-[var(--radius-md)] bg-success-50 px-3 py-2.5">
                  <Icon name="shield" size={16} className="shrink-0 text-success-600" />
                  <span className="text-[0.8125rem] text-success-600">
                    {t({ en: "Processed by ISO-accredited labs", km: "ដំណើរការដោយមន្ទីរពិសោធន៍ស្តង់ដារ ISO" })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Related */}
          {related.length > 0 ? (
            <div className="mt-20 flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <h2 className="text-h3 font-medium text-ink-900">
                  {t({ en: "Related tests", km: "តេស្តពាក់ព័ន្ធ" })}
                </h2>
                {cat ? (
                  <Link
                    href={`/tests?category=${cat.slug}`}
                    className="inline-flex items-center gap-1 text-[0.875rem] font-medium text-brand-600 hover:text-brand-700"
                  >
                    {t({ en: "See all", km: "មើលទាំងអស់" })}
                    <Icon name="arrow-right" size={15} />
                  </Link>
                ) : null}
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {related.map((r) => (
                  <TestCard key={r.slug} test={r} />
                ))}
              </div>
            </div>
          ) : null}
        </Container>
      </section>
    </>
  );
}
