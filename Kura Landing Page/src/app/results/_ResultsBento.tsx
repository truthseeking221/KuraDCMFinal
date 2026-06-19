"use client";

import { useLang } from "@/i18n/LanguageProvider";
import { Section, Eyebrow, Icon, Reveal } from "@/components/ui";
import { BentoGrid, BentoCard } from "@/components/sections";

const STATUSES: { dot: string; label: { en: string; km: string }; note: { en: string; km: string } }[] = [
  {
    dot: "bg-success-500",
    label: { en: "In range", km: "ក្នុងកម្រិត" },
    note: { en: "Healthy. Nothing to act on.", km: "ធម្មតា — គ្មានអ្វីត្រូវធ្វើ។" },
  },
  {
    dot: "bg-warn-500",
    label: { en: "Borderline", km: "ប្រុងប្រយ័ត្ន" },
    note: { en: "Worth watching over time.", km: "គួរតាមដានតាមពេលវេលា។" },
  },
  {
    dot: "bg-danger-500",
    label: { en: "Out of range", km: "ហួសកម្រិត" },
    note: { en: "Needs attention. We say why.", km: "ត្រូវយកចិត្តទុកដាក់ — យើងពន្យល់មូលហេតុ។" },
  },
];

export function ResultsBento() {
  const { t } = useLang();
  return (
    <Section tone="default">
      <div className="mb-12 flex flex-col gap-4">
        <Eyebrow>{t({ en: "Reading a result", km: "ការអានលទ្ធផល" })}</Eyebrow>
        <h2 className="max-w-2xl text-h2 font-medium text-balance text-ink-950">
          {t({ en: "Three statuses, no guesswork", km: "ស្ថានភាពបី គ្មានការស្មាន" })}
        </h2>
        <p className="max-w-xl text-lead text-ink-600">
          {t({
            en: "Every marker is colour-coded so you can scan your report in seconds.",
            km: "រាល់សញ្ញាមានកូដពណ៌ ដើម្បីឱ្យអ្នកអានរបាយការណ៍បានក្នុងពេលប៉ុន្មានវិនាទី។",
          })}
        </p>
      </div>

      <Reveal>
        <BentoGrid>
          {/* (a) Three-status legend — tall brand cell */}
          <BentoCard span="lg:col-span-3 lg:row-span-2" tone="brand">
            <div className="flex h-full flex-col justify-between gap-8">
              <Eyebrow className="text-white/70">
                {t({ en: "Colour-coded verdicts", km: "ការវិនិច្ឆ័យតាមកូដពណ៌" })}
              </Eyebrow>
              <div className="flex flex-col">
                {STATUSES.map((s) => (
                  <div
                    key={s.label.en}
                    className="flex flex-col gap-1 border-t border-white/15 py-4 first:border-t-0 first:pt-0"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={`size-3 rounded-full ${s.dot}`} />
                      <span className="text-[1.0625rem] font-semibold text-white">{t(s.label)}</span>
                    </div>
                    <p className="pl-[1.4rem] text-[0.9375rem] leading-relaxed text-white/75">{t(s.note)}</p>
                  </div>
                ))}
              </div>
              <p className="text-[0.9375rem] font-medium text-white/85">
                {t({ en: "No numeracy required.", km: "មិនត្រូវការចំណេះដឹងលេខ។" })}
              </p>
            </div>
          </BentoCard>

          {/* (b) Delivered to Telegram */}
          <BentoCard span="lg:col-span-3" tone="default">
            <div className="flex h-full flex-col gap-3">
              <span className="grid size-10 place-items-center rounded-[var(--radius-md)] bg-brand-50 text-brand-600">
                <Icon name="send" size={20} />
              </span>
              <h3 className="text-h4 font-medium text-ink-900">
                {t({ en: "Delivered to Telegram", km: "ផ្ញើទៅ Telegram" })}
              </h3>
              <p className="text-[0.9375rem] leading-relaxed text-ink-600">
                {t({
                  en: "Results arrive where you already are, within 24 hours, ready to share.",
                  km: "លទ្ធផលមកដល់កន្លែងដែលអ្នកនៅ — ក្នុងរយៈពេល ២៤ ម៉ោង រួចរាល់ដើម្បីចែករំលែក។",
                })}
              </p>
            </div>
          </BentoCard>

          {/* (c) Clinician-reviewed */}
          <BentoCard span="lg:col-span-3" tone="ink">
            <div className="flex h-full flex-col gap-3">
              <span className="grid size-10 place-items-center rounded-[var(--radius-md)] bg-white/10 text-brand-200">
                <Icon name="stethoscope" size={20} />
              </span>
              <h3 className="text-h4 font-medium text-white">
                {t({ en: "Clinician-reviewed", km: "ត្រួតពិនិត្យដោយគ្រូពេទ្យ" })}
              </h3>
              <p className="text-[0.9375rem] leading-relaxed text-white/65">
                {t({
                  en: "A licensed clinician checks every report before it reaches you.",
                  km: "គ្រូពេទ្យមានអាជ្ញាប័ណ្ណពិនិត្យរាល់របាយការណ៍មុនពេលមកដល់អ្នក។",
                })}
              </p>
            </div>
          </BentoCard>

          {/* (d) Trends over time */}
          <BentoCard span="lg:col-span-3" tone="tint">
            <div className="flex h-full flex-col gap-3">
              <span className="grid size-10 place-items-center rounded-[var(--radius-md)] bg-brand-50 text-brand-600">
                <Icon name="pulse" size={20} />
              </span>
              <h3 className="text-h4 font-medium text-ink-900">
                {t({ en: "Trends over time", km: "និន្នាការតាមពេលវេលា" })}
              </h3>
              <p className="text-[0.9375rem] leading-relaxed text-ink-600">
                {t({
                  en: "See how each marker moves across visits. Direction matters as much as the value.",
                  km: "មើលពីរបៀបដែលសញ្ញានីមួយៗផ្លាស់ប្តូរតាមការមកពិនិត្យ — ទិសដៅសំខាន់ដូចតម្លៃ។",
                })}
              </p>
            </div>
          </BentoCard>

          {/* (e) Safety note */}
          <BentoCard span="lg:col-span-3" tone="default">
            <div className="flex h-full flex-col gap-3">
              <span className="grid size-10 place-items-center rounded-[var(--radius-md)] bg-brand-50 text-brand-600">
                <Icon name="shield" size={20} />
              </span>
              <h3 className="text-h4 font-medium text-ink-900">
                {t({ en: "A safety net, not a substitute", km: "សុវត្ថិភាព មិនមែនការជំនួស" })}
              </h3>
              <p className="text-[0.9375rem] leading-relaxed text-ink-600">
                {t({
                  en: "Kura supports, never replaces, a licensed clinician.",
                  km: "Kura ជាជំនួយ មិនជំនួសគ្រូពេទ្យមានអាជ្ញាប័ណ្ណឡើយ។",
                })}
              </p>
            </div>
          </BentoCard>
        </BentoGrid>
      </Reveal>
    </Section>
  );
}
