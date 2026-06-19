"use client";

import { useLang } from "@/i18n/LanguageProvider";
import { TESTIMONIALS } from "@/data/testimonials";
import { Section, SectionHeader, Reveal, Icon } from "@/components/ui";
import { cx } from "@/lib/cx";

const AUDIENCE_LABEL = {
  doctor: { en: "Doctor", km: "គ្រូពេទ្យ" },
  patient: { en: "Patient", km: "អ្នកជំងឺ" },
  business: { en: "Business", km: "អាជីវកម្ម" },
} as const;

export function Testimonials({ tone = "default" }: { tone?: "default" | "tint" }) {
  const { t } = useLang();
  return (
    <Section tone={tone}>
      <SectionHeader
        align="center"
        eyebrow={t({ en: "Real outcomes", km: "លទ្ធផលពិត" })}
        title={t({ en: "Trusted on every side of care", km: "ជឿទុកចិត្តគ្រប់ផ្នែកនៃការថែទាំ" })}
        lead={t({
          en: "One platform, proven for the doctor ordering, the patient receiving, and the business running it.",
          km: "វេទិកាតែមួយ ដែលបង្ហាញតម្លៃសម្រាប់គ្រូពេទ្យ អ្នកជំងឺ និងអាជីវកម្ម។",
        })}
      />
      <div className="mt-14 grid gap-5 lg:grid-cols-3">
        {TESTIMONIALS.map((tm, i) => (
          <Reveal key={tm.name} delay={(i + 1) as 1 | 2 | 3}>
            <figure className="flex h-full flex-col gap-6 rounded-[var(--radius-lg)] border border-[var(--hairline)] bg-surface p-7">
              <Icon name="star" size={20} className="text-brand-400 [&_path]:fill-current" />
              <blockquote className="text-[1.0625rem] leading-relaxed text-ink-800 text-pretty">
                “{t(tm.quote)}”
              </blockquote>
              <figcaption className="mt-auto flex items-center gap-3 border-t border-[var(--hairline)] pt-5">
                <span
                  className={cx(
                    "grid size-11 shrink-0 place-items-center rounded-full text-[0.8125rem] font-medium text-white",
                    tm.audience === "doctor"
                      ? "bg-brand-500"
                      : tm.audience === "patient"
                        ? "bg-success-500"
                        : "bg-ink-700",
                  )}
                >
                  {tm.initials}
                </span>
                <span className="flex flex-col">
                  <span className="text-[0.9375rem] font-medium text-ink-900">{tm.name}</span>
                  <span className="text-[0.8125rem] text-ink-500">
                    {t(tm.role)} · {t(tm.location)}
                  </span>
                </span>
                <span className="ml-auto rounded-pill bg-ink-100 px-2.5 py-1 text-[0.75rem] font-medium uppercase tracking-wide text-ink-500">
                  {t(AUDIENCE_LABEL[tm.audience])}
                </span>
              </figcaption>
            </figure>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
