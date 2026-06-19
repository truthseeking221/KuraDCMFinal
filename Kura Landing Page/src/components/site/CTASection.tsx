"use client";

import { useLang, type Localized } from "@/i18n/LanguageProvider";
import { Button, Reveal, Magnetic } from "@/components/ui";
import { SITE } from "@/data/site";

export function CTASection({
  eyebrow,
  title,
  subtitle,
  primary = { label: { en: "Get started", km: "ចាប់ផ្តើម" }, href: "/contact" },
  secondary = { label: { en: "Talk to us", km: "ទាក់ទងយើង" }, href: "/contact" },
}: {
  eyebrow?: Localized;
  title?: Localized;
  subtitle?: Localized;
  primary?: { label: Localized; href: string };
  secondary?: { label: Localized; href: string };
}) {
  const { t } = useLang();
  return (
    <section className="bg-ink-950 text-white [--hairline:rgba(255,255,255,0.12)]">
      <div className="container-kura section-y">
        <div className="relative overflow-hidden rounded-[var(--radius-2xl)] bg-gradient-to-br from-brand-700 via-brand-600 to-deep-500 px-8 py-16 sm:px-16 sm:py-24">
          <div className="bg-dot pointer-events-none absolute inset-0 opacity-[0.15]" />
          <div className="relative flex max-w-2xl flex-col gap-6">
            <Reveal>
              <p className="eyebrow text-white/70">
                {t(eyebrow ?? { en: "Start with Kura", km: "ចាប់ផ្តើមជាមួយ Kura" })}
              </p>
            </Reveal>
            <Reveal delay={1}>
              <h2 className="text-h1 font-medium text-balance text-white">
                {t(title ?? { en: "Better diagnostics. Within reach.", km: "វេជ្ជសាស្ត្រវិនិច្ឆ័យល្អ ក្នុងដៃអ្នក។" })}
              </h2>
            </Reveal>
            <Reveal delay={2}>
              <p className="text-lead text-white/75">
                {t(
                  subtitle ?? {
                    en: `${SITE.signOff.en} Order a test, verify your practice, or screen your team. It takes minutes.`,
                    km: `${SITE.signOff.km} បញ្ជាទិញតេស្ត ផ្ទៀងផ្ទាត់ ឬត្រួតពិនិត្យក្រុមរបស់អ្នក។`,
                  },
                )}
              </p>
            </Reveal>
            <Reveal delay={3}>
              <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-start">
                <Magnetic strength={0.4}>
                  <Button
                    href={primary.href}
                    size="lg"
                    iconRight="arrow-right"
                    className="!bg-white !text-brand-700 hover:!bg-white/90 hover:!shadow-[var(--shadow-lg)]"
                  >
                    {t(primary.label)}
                  </Button>
                </Magnetic>
                <Button
                  href={secondary.href}
                  size="lg"
                  variant="outline"
                  className="!text-white !ring-white/30 hover:!bg-white/10 hover:!ring-white/50"
                >
                  {t(secondary.label)}
                </Button>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
