"use client";

import { useLang, type Localized } from "@/i18n/LanguageProvider";
import { Section, SectionHeader, Button, Pill, Icon, Reveal } from "@/components/ui";
import { cx } from "@/lib/cx";

type Tier = {
  name: Localized;
  audience: Localized;
  price: Localized;
  priceNote: Localized;
  features: Localized[];
  cta: { label: Localized; href: string };
  featured?: boolean;
};

const TIERS: Tier[] = [
  {
    name: { en: "Patients", km: "អ្នកជំងឺ" },
    audience: { en: "Pay as you go", km: "បង់តាមការប្រើ" },
    price: { en: "From $4", km: "ចាប់ពី $4" },
    priceNote: { en: "per test, no membership", km: "ក្នុងមួយតេស្ត · គ្មានសមាជិកភាព" },
    features: [
      { en: "Any single test or package", km: "តេស្ត ឬកញ្ចប់ណាមួយ" },
      { en: "Pay by cash, KHQR or insurance", km: "សាច់ប្រាក់ KHQR ឬធានារ៉ាប់រង" },
      { en: "Collect at home or walk in", km: "ប្រមូលនៅផ្ទះ ឬចូលផ្ទាល់" },
      { en: "Results on Telegram, in plain words", km: "លទ្ធផលជាភាសាសាមញ្ញ" },
    ],
    cta: { label: { en: "Browse tests", km: "មើលតេស្ត" }, href: "/tests" },
  },
  {
    name: { en: "Clinics & doctors", km: "គ្លីនិក និងគ្រូពេទ្យ" },
    audience: { en: "For your practice", km: "សម្រាប់ការអនុវត្ត" },
    price: { en: "Free to join", km: "ចូលរួមឥតគិតថ្លៃ" },
    priceNote: { en: "we take 0% from insurance", km: "កាត់ ០% ពីធានារ៉ាប់រង" },
    featured: true,
    features: [
      { en: "Order any test from anywhere", km: "បញ្ជាទិញតេស្តពីគ្រប់ទីកន្លែង" },
      { en: "A courier collects from your clinic daily", km: "ប្រមូលសំណាករៀងរាល់ថ្ងៃ" },
      { en: "e-Signed diagnosis and prescription documents", km: "ឯកសារ Dx & Rx ស្របច្បាប់" },
      { en: "Keep every dollar of your insurance payout", km: "ទទួលធានារ៉ាប់រងពេញលេញ" },
      { en: "A public profile patients can find", km: "ប្រវត្តិរូបជាសាធារណៈ" },
    ],
    cta: { label: { en: "Apply to verify", km: "ដាក់ពាក្យផ្ទៀងផ្ទាត់" }, href: "/for-doctors" },
  },
  {
    name: { en: "Business & insurers", km: "អាជីវកម្ម និងធានារ៉ាប់រង" },
    audience: { en: "Enterprise", km: "សហគ្រាស" },
    price: { en: "Custom", km: "តាមតម្រូវការ" },
    priceNote: { en: "priced by volume", km: "តម្លៃតាមបរិមាណ" },
    features: [
      { en: "Everything clinics get, plus:", km: "អ្វីៗក្នុងគ្លីនិក បន្ថែម៖" },
      { en: "Screen your team at your workplace", km: "ត្រួតពិនិត្យបុគ្គលិកនៅកន្លែង" },
      { en: "HR dashboards that show the whole picture", km: "ផ្ទាំងគ្រប់គ្រងសម្រាប់ HR" },
      { en: "Claims and insurer systems, connected", km: "ការតភ្ជាប់ធានារ៉ាប់រង" },
      { en: "A dedicated team on your account", km: "ក្រុមគ្រប់គ្រងគណនី" },
    ],
    cta: { label: { en: "Talk to sales", km: "ទាក់ទងផ្នែកលក់" }, href: "/contact" },
  },
];

export function PricingTiers({ tone = "default" }: { tone?: "default" | "tint" }) {
  const { t } = useLang();
  return (
    <Section tone={tone}>
      <SectionHeader
        align="center"
        eyebrow={t({ en: "Plans", km: "គម្រោង" })}
        title={t({ en: "One network, priced for everyone", km: "បណ្តាញតែមួយ តម្លៃសម្រាប់គ្រប់គ្នា" })}
        lead={t({
          en: "Patients pay only for what they need. Clinics join free. Businesses get volume pricing. And we take 0% from insurance, always.",
          km: "អ្នកជំងឺបង់តែអ្វីដែលត្រូវការ។ គ្លីនិកចូលរួមឥតគិតថ្លៃ។ Kura យក ០% ពីធានារ៉ាប់រងជានិច្ច។",
        })}
      />
      <div className="mt-14 grid items-stretch gap-5 lg:grid-cols-3">
        {TIERS.map((tier, i) => (
          <Reveal key={tier.name.en} delay={(i + 1) as 1 | 2 | 3} className="h-full">
            <div
              className={cx(
                "relative flex h-full flex-col gap-6 rounded-[var(--radius-lg)] p-7 transition-[transform,box-shadow] duration-300 hover:-translate-y-1",
                tier.featured
                  ? "bg-surface ring-2 ring-brand-500 shadow-[var(--shadow-md)]"
                  : "bg-surface ring-1 ring-[var(--hairline)] hover:shadow-[var(--shadow-md)]",
              )}
            >
              {tier.featured ? (
                <span className="absolute -top-3 left-7 rounded-pill bg-brand-500 px-3 py-1 text-[0.75rem] font-medium uppercase tracking-wider text-white">
                  {t({ en: "Most popular", km: "ពេញនិយម" })}
                </span>
              ) : null}
              <div className="flex flex-col gap-1">
                <Pill tone={tier.featured ? "brand" : "neutral"} className="self-start">
                  {t(tier.audience)}
                </Pill>
                <h3 className="mt-2 text-h4 font-medium text-ink-900">{t(tier.name)}</h3>
              </div>
              <div className="flex flex-col">
                <span className="text-h3 font-medium tracking-tight text-ink-900">{t(tier.price)}</span>
                <span className="text-[0.8125rem] text-ink-500">{t(tier.priceNote)}</span>
              </div>
              <Button
                href={tier.cta.href}
                full
                variant={tier.featured ? "primary" : "outline"}
                iconRight="arrow-right"
              >
                {t(tier.cta.label)}
              </Button>
              <ul className="flex flex-col gap-2.5 border-t border-[var(--hairline)] pt-5">
                {tier.features.map((f) => (
                  <li key={f.en} className="flex items-start gap-2.5 text-[0.875rem] text-ink-700">
                    <Icon name="check-circle" size={17} className="mt-0.5 shrink-0 text-success-500" />
                    {t(f)}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
