"use client";

import Link from "next/link";
import { useLang, type Localized } from "@/i18n/LanguageProvider";
import { Section, SectionHeader, Reveal, Icon } from "@/components/ui";
import { cx } from "@/lib/cx";

const AGE_BANDS: { key: string; label: Localized; grad: string }[] = [
  { key: "u30", label: { en: "Under 30", km: "ក្រោម ៣០" }, grad: "from-brand-50 to-brand-100" },
  { key: "30-45", label: { en: "30 to 45", km: "៣០–៤៥" }, grad: "from-[#eef7f1] to-[#d7efe0]" },
  { key: "45-60", label: { en: "45 to 60", km: "៤៥–៦០" }, grad: "from-[#fdf1ec] to-[#fadfd3]" },
  { key: "60+", label: { en: "60+", km: "៦០+" }, grad: "from-[#f1eefc] to-[#e0d7f5]" },
];

function PersonGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none" aria-hidden="true">
      <circle cx="24" cy="17" r="8" className="fill-current opacity-80" />
      <path d="M9 44c0-9 7-15 15-15s15 6 15 15Z" className="fill-current opacity-80" />
    </svg>
  );
}

function AudienceCard({
  title,
  href,
  accent,
}: {
  title: Localized;
  href: string;
  accent: string;
}) {
  const { t } = useLang();
  return (
    <div className="flex flex-col gap-5 rounded-[var(--radius-xl)] border border-[var(--hairline)] bg-surface p-6 sm:p-7">
      <div className="flex items-center justify-between">
        <h3 className="text-h4 font-semibold text-ink-900">{t(title)}</h3>
        <Link
          href={href}
          className="inline-flex items-center gap-1 text-[0.8125rem] font-semibold text-brand-600 hover:text-brand-700"
        >
          {t({ en: "View all", km: "មើលទាំងអស់" })}
          <Icon name="chevron-right" size={14} />
        </Link>
      </div>
      <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:grid sm:grid-cols-4 sm:gap-3 sm:overflow-visible">
        {AGE_BANDS.map((band) => (
          <Link
            key={band.key}
            href={href}
            className="group/age flex w-[7rem] shrink-0 flex-col items-center gap-2 sm:w-auto"
          >
            <span
              className={cx(
                "relative grid aspect-square w-full place-items-end overflow-hidden rounded-[var(--radius-lg)] bg-gradient-to-br transition-transform duration-300 group-hover/age:-translate-y-1",
                band.grad,
              )}
            >
              <PersonGlyph className={cx("absolute inset-x-0 bottom-0 mx-auto h-[78%] w-[78%]", accent)} />
            </span>
            <span className="text-[0.8125rem] font-medium text-ink-700">{t(band.label)}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function CheckupsByAudience({ tone = "tint" }: { tone?: "default" | "tint" }) {
  const { t } = useLang();
  return (
    <Section tone={tone}>
      <SectionHeader
        eyebrow={t({ en: "By life stage", km: "តាមដំណាក់កាលជីវិត" })}
        title={t({ en: "The right checkup for where you are", km: "ការត្រួតពិនិត្យ សម្រាប់គ្រប់វ័យ" })}
        lead={t({
          en: "What to check for changes with your age and sex. Tell us yours and we will show the packages that fit.",
          km: "អ្វីដែលត្រូវត្រួតពិនិត្យផ្លាស់ប្តូរតាមអាយុ និងភេទ — ជ្រើសរបស់អ្នក។",
        })}
      />
      <div className="mt-12 grid gap-5 lg:grid-cols-2">
        <Reveal delay={1}>
          <AudienceCard
            title={{ en: "Checkups for men", km: "ការត្រួតពិនិត្យសម្រាប់បុរស" }}
            href="/packages/mens-wellness"
            accent="text-brand-500"
          />
        </Reveal>
        <Reveal delay={2}>
          <AudienceCard
            title={{ en: "Checkups for women", km: "ការត្រួតពិនិត្យសម្រាប់ស្ត្រី" }}
            href="/packages/womens-wellness"
            accent="text-[#c2569b]"
          />
        </Reveal>
      </div>
    </Section>
  );
}
