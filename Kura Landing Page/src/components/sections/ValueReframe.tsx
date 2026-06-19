"use client";

import { useLang } from "@/i18n/LanguageProvider";
import { Reveal } from "@/components/ui";

export function ValueReframe({ tone = "default" }: { tone?: "default" | "tint" }) {
  const { t } = useLang();
  return (
    <section className={tone === "tint" ? "bg-ink-25" : "bg-surface"}>
      <div className="container-narrow section-y text-center">
        <Reveal>
          <p className="eyebrow">{t({ en: "Affordable by design", km: "តម្លៃសមរម្យ" })}</p>
        </Reveal>
        <Reveal delay={1}>
          <p className="mt-6 text-h1 font-medium leading-[1.1] tracking-tight text-balance">
            {t({ en: "A hospital workup that costs ", km: "ការត្រួតពិនិត្យមន្ទីរពេទ្យដែលធ្លាប់ថ្លៃ " })}
            <span className="text-ink-300 line-through decoration-2">$150</span>
            {t({ en: " is ", km: " គឺ " })}
            <span className="text-gradient-brand">$29</span>
            {t({ en: " with Kura.", km: " ជាមួយ Kura ។" })}
          </p>
        </Reveal>
        <Reveal delay={2}>
          <p className="mx-auto mt-6 max-w-xl text-lead text-ink-600">
            {t({
              en: "No markup. No surprise add-ons. You see the price before you book, and the same panel costs the same whether you're in Phnom Penh or a province.",
              km: "គ្មានការបន្ថែមថ្លៃ គ្មានភាពភ្ញាក់ផ្អើល។ អ្នកឃើញតម្លៃមុនពេលកក់។",
            })}
          </p>
        </Reveal>
      </div>
    </section>
  );
}
