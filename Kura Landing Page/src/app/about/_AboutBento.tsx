"use client";

import { useLang } from "@/i18n/LanguageProvider";
import { Section, Eyebrow, Icon, Reveal } from "@/components/ui";
import { BentoGrid, BentoCard } from "@/components/sections";

const VALUES = [
  {
    icon: "shield" as const,
    tone: "default" as const,
    title: { en: "Accuracy", km: "ភាពត្រឹមត្រូវ" },
    body: {
      en: "Every result runs through accredited labs and a clinician's review.",
      km: "រាល់លទ្ធផលឆ្លងកាត់មន្ទីរពិសោធន៍ដែលមានវិញ្ញាបនបត្រ និងការត្រួតពិនិត្យដោយគ្រូពេទ្យ។",
    },
  },
  {
    icon: "map-pin" as const,
    tone: "tint" as const,
    title: { en: "Access", km: "ភាពងាយស្រួល" },
    body: {
      en: "Collection centres and home visits bring testing to every province.",
      km: "មជ្ឈមណ្ឌលប្រមូលសំណាក និងការមកដល់ផ្ទះ នាំការធ្វើតេស្តទៅគ្រប់ខេត្ត។",
    },
  },
  {
    icon: "wallet" as const,
    tone: "default" as const,
    title: { en: "Affordability", km: "តម្លៃសមរម្យ" },
    body: {
      en: "One clear price per test. No surprises at the counter.",
      km: "តម្លៃច្បាស់លាស់មួយក្នុងមួយតេស្ត — គ្មានការភ្ញាក់ផ្អើលនៅពេលបង់ប្រាក់។",
    },
  },
  {
    icon: "lock" as const,
    tone: "tint" as const,
    title: { en: "Trust", km: "ការទុកចិត្ត" },
    body: {
      en: "Your health data stays private, encrypted and yours to control.",
      km: "ទិន្នន័យសុខភាពរបស់អ្នកនៅឯកជន អ៊ិនគ្រីប និងស្ថិតក្រោមការគ្រប់គ្រងរបស់អ្នក។",
    },
  },
];

export function AboutBento() {
  const { t } = useLang();
  return (
    <Section tone="default">
      <Reveal>
        <BentoGrid>
          {/* Mission statement — tall brand cell */}
          <BentoCard span="lg:col-span-4 lg:row-span-2" tone="brand">
            <div className="flex h-full flex-col justify-between gap-8">
              <Eyebrow className="text-white/70">
                {t({ en: "Our mission", km: "បេសកកម្មរបស់យើង" })}
              </Eyebrow>
              <div className="flex flex-col gap-4">
                <p className="text-h3 font-medium text-balance text-white">
                  {t({
                    en: "Any doctor in Cambodia can order the right test, and any patient can understand the result.",
                    km: "គ្រូពេទ្យគ្រប់រូបក្នុងប្រទេសកម្ពុជា អាចបញ្ជាទិញតេស្តត្រឹមត្រូវ ហើយអ្នកជំងឺគ្រប់រូបអាចយល់លទ្ធផល។",
                  })}
                </p>
                <p className="max-w-md text-[0.9375rem] leading-relaxed text-white/75">
                  {t({
                    en: "Mission first, clinically rigorous. Diagnostics built for the whole country, not just the capital.",
                    km: "បេសកកម្មមុនគេ ហើយម៉ត់ចត់តាមវេជ្ជសាស្ត្រ — ការវិនិច្ឆ័យសម្រាប់ប្រទេសទាំងមូល មិនមែនត្រឹមតែរាជធានីទេ។",
                  })}
                </p>
              </div>
            </div>
          </BentoCard>

          {/* Four value cells */}
          {VALUES.map((v) => (
            <BentoCard key={v.title.en} span="lg:col-span-2" tone={v.tone}>
              <div className="flex h-full flex-col gap-3">
                <span className="grid size-10 place-items-center rounded-[var(--radius-md)] bg-brand-50 text-brand-600">
                  <Icon name={v.icon} size={20} />
                </span>
                <h3 className="text-h4 font-medium text-ink-900">{t(v.title)}</h3>
                <p className="text-[0.9375rem] leading-relaxed text-ink-600">
                  {t(v.body)}
                </p>
              </div>
            </BentoCard>
          ))}

          {/* Big stat cell */}
          <BentoCard span="lg:col-span-2" tone="ink">
            <div className="flex h-full flex-col justify-between gap-6">
              <Eyebrow className="text-brand-200">
                {t({ en: "Aligned with patients", km: "នៅខាងអ្នកជំងឺ" })}
              </Eyebrow>
              <div className="flex flex-col">
                <span className="text-[3.5rem] font-semibold leading-none tracking-tight tabular-nums text-white sm:text-[4rem]">
                  0%
                </span>
                <span className="mt-3 text-[0.9375rem] font-medium text-white/70">
                  {t({
                    en: "taken from insurance reimbursements",
                    km: "កាត់ពីការទូទាត់ធានារ៉ាប់រង",
                  })}
                </span>
              </div>
            </div>
          </BentoCard>
        </BentoGrid>
      </Reveal>
    </Section>
  );
}
