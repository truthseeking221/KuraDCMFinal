"use client";

import { useLang } from "@/i18n/LanguageProvider";
import { Button, Pill, Reveal, StatStrip } from "@/components/ui";
import { ResultPreview } from "./ResultPreview";

export function Hero() {
  const { t } = useLang();
  return (
    <section className="relative overflow-hidden pt-[calc(var(--header-h)+2.5rem)]">
      <div className="bg-grid pointer-events-none absolute inset-x-0 top-0 h-[680px]" />
      <div
        className="pointer-events-none absolute -top-40 left-1/2 h-[560px] w-[860px] -translate-x-1/2 rounded-full opacity-[0.5] blur-3xl"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(38,140,255,0.16), transparent 62%)",
        }}
      />
      <div className="container-wide relative flex flex-col gap-12 pb-16 pt-10 lg:grid lg:grid-cols-[1.05fr_minmax(0,0.95fr)] lg:items-center lg:gap-10 lg:pb-24">
        {/* Copy */}
        <div className="flex min-w-0 flex-col gap-7">
          <Reveal>
            <Pill tone="brand" dot="brand">
              {t({
                en: "Cambodia's diagnostics operating system",
                km: "ប្រព័ន្ធវេជ្ជសាស្ត្រវិនិច្ឆ័យរបស់កម្ពុជា",
              })}
            </Pill>
          </Reveal>
          <Reveal delay={1}>
            <h1 className="text-display font-medium text-balance text-ink-950">
              {t({ en: "The diagnostics ", km: "បណ្តាញ" })}
              <span className="text-gradient-brand">
                {t({ en: "network", km: "វេជ្ជសាស្ត្រវិនិច្ឆ័យ" })}
              </span>
              {t({ en: " for Cambodia.", km: "សម្រាប់កម្ពុជា។" })}
            </h1>
          </Reveal>
          <Reveal delay={2}>
            <p className="max-w-xl text-lead text-ink-600 text-pretty">
              {t({
                en: "Order any lab test. Get sampled nearby or at home. Read your results in plain Khmer and English, checked by a clinician, usually within 24 hours.",
                km: "បញ្ជាទិញតេស្តណាមួយ ផ្តល់សំណាកនៅជិត ឬនៅផ្ទះ ហើយអានលទ្ធផលដែលត្រួតពិនិត្យដោយគ្រូពេទ្យ ជាភាសាខ្មែរ និងអង់គ្លេស ជាធម្មតាក្នុង ២៤ ម៉ោង។",
              })}
            </p>
          </Reveal>
          <Reveal delay={3}>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button href="/contact" size="lg" iconRight="arrow-right">
                {t({ en: "Get started", km: "ចាប់ផ្តើម" })}
              </Button>
              <Button href="/how-it-works" size="lg" variant="outline">
                {t({ en: "See how it works", km: "មើលរបៀបដំណើរការ" })}
              </Button>
            </div>
          </Reveal>
          <Reveal delay={4}>
            <StatStrip
              className="mt-2 border-t border-[var(--hairline)] pt-8"
              items={[
                { value: "500+", label: t({ en: "Tests & panels", km: "តេស្ត និងផ្គុំ" }) },
                { value: "24h", label: t({ en: "Typical results", km: "លទ្ធផល" }) },
                { value: "12", label: t({ en: "Centres", km: "មជ្ឈមណ្ឌល" }), sub: t({ en: "8 provinces", km: "៨ ខេត្ត" }) },
              ]}
            />
          </Reveal>
        </div>

        {/* Product artifact */}
        <Reveal delay={2} className="min-w-0 lg:pl-6">
          <ResultPreview />
        </Reveal>
      </div>
    </section>
  );
}
