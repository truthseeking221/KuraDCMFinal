"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLang } from "@/i18n/LanguageProvider";
import { popularTests } from "@/data/catalog";
import { Button, Pill, Reveal, Icon, StatStrip, Tilt } from "@/components/ui";

export function SearchHero() {
  const { t } = useLang();
  const router = useRouter();
  const [q, setQ] = useState("");
  const suggestions = popularTests().slice(0, 4);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = q.trim();
    router.push(query ? `/tests?q=${encodeURIComponent(query)}` : "/tests");
  };

  return (
    <section className="relative overflow-hidden pt-[calc(var(--header-h)+2rem)]">
      <div className="bg-grid pointer-events-none absolute inset-x-0 top-0 h-[560px]" />
      <div
        className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[820px] -translate-x-1/2 rounded-full opacity-50 blur-3xl"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(38,140,255,0.16), transparent 62%)",
        }}
      />
      <div className="container-wide relative flex flex-col gap-12 pb-14 pt-10 lg:grid lg:grid-cols-[1.15fr_minmax(0,0.85fr)] lg:items-center lg:gap-12 lg:pb-20">
        {/* Left: search-led */}
        <div className="flex min-w-0 flex-col gap-6">
          <Reveal>
            <Pill tone="brand" dot="brand">
              {t({ en: "Cambodia's diagnostics operating system", km: "ប្រព័ន្ធវេជ្ជសាស្ត្រវិនិច្ឆ័យរបស់កម្ពុជា" })}
            </Pill>
          </Reveal>
          <Reveal delay={1}>
            <h1 className="text-h1 font-medium text-balance text-ink-950 lg:text-display">
              {t({ en: "Lab tests, made ", km: "តេស្តពិសោធន៍ ធ្វើឲ្យ" })}
              <span className="text-gradient-brand">{t({ en: "clear", km: "ងាយស្រួល" })}</span>
              {t({ en: " for Cambodia.", km: " សម្រាប់កម្ពុជា។" })}
            </h1>
          </Reveal>

          {/* Search */}
          <Reveal delay={2}>
            <form onSubmit={submit} className="flex flex-col gap-3">
              <div className="flex items-center gap-2 rounded-[var(--radius-lg)] border border-[var(--border-strong)] bg-surface p-2 pl-4 shadow-[var(--shadow-sm)] transition-[border-color,box-shadow] focus-within:border-brand-500 focus-within:shadow-[var(--shadow-md)]">
                <Icon name="search" size={20} className="shrink-0 text-ink-400" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  aria-label={t({ en: "Search tests and packages", km: "ស្វែងរកតេស្ត និងកញ្ចប់" })}
                  placeholder={t({ en: "Find a test or package…", km: "ស្វែងរកតេស្ត ឬកញ្ចប់…" })}
                  className="min-w-0 flex-1 bg-transparent text-[1rem] text-ink-900 placeholder:text-ink-400 focus:outline-none"
                />
                <Button type="submit" size="md" iconRight="arrow-right" className="hidden sm:inline-flex">
                  {t({ en: "Search", km: "ស្វែងរក" })}
                </Button>
                <button
                  type="submit"
                  aria-label={t({ en: "Search", km: "ស្វែងរក" })}
                  className="grid size-10 shrink-0 place-items-center rounded-[var(--radius-md)] bg-brand-500 text-white sm:hidden"
                >
                  <Icon name="arrow-right" size={18} />
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[0.8125rem] text-ink-500">
                <span className="text-ink-400">{t({ en: "Popular:", km: "ពេញនិយម៖" })}</span>
                {suggestions.map((s) => (
                  <Link
                    key={s.slug}
                    href={`/tests/${s.slug}`}
                    className="rounded-pill border border-[var(--hairline)] px-2.5 py-1 font-medium text-ink-600 transition-colors hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
                  >
                    {t(s.name)}
                  </Link>
                ))}
              </div>
            </form>
          </Reveal>

          {/* Quick actions */}
          <Reveal delay={3}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Link
                href="/packages"
                className="group/qa flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--hairline)] bg-surface p-4 transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-[var(--shadow-md)]"
              >
                <span className="grid size-11 shrink-0 place-items-center rounded-[var(--radius-md)] bg-brand-50 text-brand-600">
                  <Icon name="report" size={22} />
                </span>
                <span className="flex flex-col">
                  <span className="text-[0.9375rem] font-semibold text-ink-900">
                    {t({ en: "Health packages", km: "កញ្ចប់សុខភាព" })}
                  </span>
                  <span className="text-[0.8125rem] text-ink-500">
                    {t({ en: "Checkups worth doing", km: "ការត្រួតពិនិត្យ" })}
                  </span>
                </span>
                <Icon name="arrow-right" size={18} className="ml-auto text-ink-300 transition-transform group-hover/qa:translate-x-0.5" />
              </Link>
              <Link
                href="/network"
                className="group/qa flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--hairline)] bg-surface p-4 transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-[var(--shadow-md)]"
              >
                <span className="grid size-11 shrink-0 place-items-center rounded-[var(--radius-md)] bg-brand-50 text-brand-600">
                  <Icon name="map-pin" size={22} />
                </span>
                <span className="flex flex-col">
                  <span className="text-[0.9375rem] font-semibold text-ink-900">
                    {t({ en: "Find a centre", km: "រកមជ្ឈមណ្ឌល" })}
                  </span>
                  <span className="text-[0.8125rem] text-ink-500">
                    {t({ en: "Or we come to you", km: "ឬកក់មកផ្ទះ" })}
                  </span>
                </span>
                <Icon name="arrow-right" size={18} className="ml-auto text-ink-300 transition-transform group-hover/qa:translate-x-0.5" />
              </Link>
            </div>
          </Reveal>

          <Reveal delay={4}>
            <StatStrip
              className="mt-1 border-t border-[var(--hairline)] pt-7"
              items={[
                { value: "500+", label: t({ en: "Tests & panels", km: "តេស្ត និងផ្គុំ" }) },
                { value: "24h", label: t({ en: "Typical results", km: "លទ្ធផល" }) },
                { value: "12", label: t({ en: "Centres", km: "មជ្ឈមណ្ឌល" }), sub: t({ en: "8 provinces", km: "៨ ខេត្ត" }) },
              ]}
            />
          </Reveal>
        </div>

        {/* Right: promo card */}
        <Reveal delay={2} className="min-w-0">
          <Tilt max={5}>
            <PromoCard />
          </Tilt>
        </Reveal>
      </div>
    </section>
  );
}

function PromoCard() {
  const { t } = useLang();
  return (
    <div className="relative overflow-hidden rounded-[var(--radius-2xl)] bg-gradient-to-br from-brand-700 via-brand-600 to-deep-500 p-8 text-white shadow-[var(--shadow-lg)] sm:p-10">
      <div className="bg-dot pointer-events-none absolute inset-0 opacity-[0.15]" />
      <div className="relative flex flex-col gap-5">
        <Pill tone="inverse">{t({ en: "Most booked", km: "កក់ច្រើនជាងគេ" })}</Pill>
        <div className="flex flex-col gap-2">
          <p className="text-[0.8125rem] font-semibold uppercase tracking-wider text-white/70">
            {t({ en: "Advance Check", km: "ការត្រួតពិនិត្យកម្រិតខ្ពស់" })}
          </p>
          <p className="text-h2 font-medium leading-tight text-white">
            {t({ en: "42 tests, one morning,", km: "តេស្ត ៤២ មួយព្រឹក" })}{" "}
            <span className="whitespace-nowrap">{t({ en: "answers you can read.", km: "ចម្លើយច្បាស់លាស់។" })}</span>
          </p>
        </div>
        <div className="flex items-end gap-3">
          <span className="text-4xl font-semibold tracking-tight">$69</span>
          <div className="mb-1.5 flex flex-col">
            <span className="text-[0.9375rem] text-white/50 line-through">$128</span>
            <span className="text-[0.75rem] font-semibold text-white/90">{t({ en: "Save 46%", km: "សន្សំ ៤៦%" })}</span>
          </div>
        </div>
        <ul className="flex flex-col gap-2 text-[0.875rem] text-white/85">
          {[
            { en: "Read by a clinician, not just a machine", km: "ត្រួតពិនិត្យដោយគ្រូពេទ្យ" },
            { en: "On your Telegram within 24h", km: "ផ្ញើតាម Telegram ក្នុង ២៤ ម៉ោង" },
            { en: "At home or at a centre", km: "ប្រមូលនៅផ្ទះ ឬមជ្ឈមណ្ឌល" },
          ].map((f) => (
            <li key={f.en} className="flex items-center gap-2.5">
              <Icon name="check" size={16} className="shrink-0 text-white" />
              {t(f)}
            </li>
          ))}
        </ul>
        <Button
          href="/packages/advance-check"
          size="lg"
          iconRight="arrow-right"
          className="mt-1 !bg-white !text-brand-700 hover:!bg-white/90"
        >
          {t({ en: "Book now", km: "កក់ឥឡូវ" })}
        </Button>
      </div>
    </div>
  );
}
