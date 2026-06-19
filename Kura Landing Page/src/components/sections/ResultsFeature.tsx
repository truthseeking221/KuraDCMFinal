"use client";

import { useLang } from "@/i18n/LanguageProvider";
import { Section, Eyebrow, Button, Reveal, Icon, type IconName } from "@/components/ui";
import { BiomarkerDetail } from "./BiomarkerDetail";

const FEATURES: { icon: IconName; title: { en: string; km: string }; body: { en: string; km: string } }[] = [
  {
    icon: "pulse",
    title: { en: "Verdicts in plain language", km: "ការវិនិច្ឆ័យជាភាសាសាមញ្ញ" },
    body: { en: "Every result tells you what's in range and what needs attention. No jargon.", km: "រាល់លទ្ធផលប្រាប់ច្បាស់ថាអ្វីធម្មតា និងអ្វីត្រូវយកចិត្តទុកដាក់។" },
  },
  {
    icon: "report",
    title: { en: "Reference ranges you can see", km: "កម្រិតយោង បង្ហាញជារូបភាព" },
    body: { en: "A coloured band shows exactly where your value sits. No math required.", km: "របារពណ៌បង្ហាញកន្លែងតម្លៃរបស់អ្នកស្ថិតនៅ។" },
  },
  {
    icon: "send",
    title: { en: "Delivered to Telegram", km: "ផ្ញើទៅ Telegram" },
    body: { en: "Results land where you already are, in Khmer or English, with SI or US units.", km: "លទ្ធផលមកដល់កន្លែងដែលអ្នកនៅ ជាខ្មែរ ឬអង់គ្លេស។" },
  },
];

export function ResultsFeature({ tone = "default" }: { tone?: "default" | "tint" }) {
  const { t } = useLang();
  return (
    <Section tone={tone}>
      <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <div className="flex flex-col gap-6">
          <Reveal>
            <Eyebrow>{t({ en: "Results you actually understand", km: "លទ្ធផលដែលអ្នកយល់" })}</Eyebrow>
          </Reveal>
          <Reveal delay={1}>
            <h2 className="text-h2 font-medium text-balance text-ink-950">
              {t({ en: "A lab report shouldn't need a translator.", km: "របាយការណ៍ឈាមមិនគួរត្រូវការអ្នកបកប្រែទេ។" })}
            </h2>
          </Reveal>
          <Reveal delay={2}>
            <p className="max-w-lg text-lead text-ink-600">
              {t({
                en: "Kura turns a dense lab PDF into something anyone can read: a clear verdict, a visual range, and a short note on what to do next.",
                km: "Kura ប្រែក្លាយ PDF ឈាមស្មុគស្មាញ ទៅជាអ្វីដែលនរណាក៏អានបាន។",
              })}
            </p>
          </Reveal>
          <div className="mt-2 flex flex-col gap-5">
            {FEATURES.map((f, i) => (
              <Reveal key={f.title.en} delay={((i % 3) + 2) as 2 | 3 | 4}>
                <div className="flex gap-4">
                  <span className="grid size-10 shrink-0 place-items-center rounded-[var(--radius-md)] bg-brand-50 text-brand-600">
                    <Icon name={f.icon} size={20} />
                  </span>
                  <div className="flex flex-col gap-0.5">
                    <h3 className="text-[1.0625rem] font-medium text-ink-900">{t(f.title)}</h3>
                    <p className="text-[0.9375rem] leading-relaxed text-ink-600">{t(f.body)}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={4}>
            <Button href="/results" variant="soft" iconRight="arrow-right" className="mt-2 self-start">
              {t({ en: "See how results work", km: "ស្វែងយល់បទពិសោធន៍លទ្ធផល" })}
            </Button>
          </Reveal>
        </div>

        <Reveal delay={2}>
          <BiomarkerDetail />
        </Reveal>
      </div>
    </Section>
  );
}
