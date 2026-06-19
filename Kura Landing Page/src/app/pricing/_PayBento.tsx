"use client";

import { useLang } from "@/i18n/LanguageProvider";
import { Section, Eyebrow, Icon, Reveal } from "@/components/ui";
import { BentoGrid, BentoCard } from "@/components/sections";

export function PayBento() {
  const { t } = useLang();
  return (
    <Section tone="default">
      <Reveal>
        <BentoGrid>
          {/* Big brand statement — Kura takes 0% from insurance */}
          <BentoCard span="lg:col-span-4 lg:row-span-2" tone="brand">
            <div className="flex h-full flex-col justify-between gap-8">
              <div className="flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-[var(--radius-md)] bg-white/15 text-white">
                  <Icon name="shield" size={22} />
                </span>
                <Eyebrow className="text-white/70">
                  {t({ en: "How payment works", km: "របៀបបង់ប្រាក់" })}
                </Eyebrow>
              </div>
              <div className="flex flex-col gap-4">
                <p className="text-h2 font-semibold text-balance text-white">
                  {t({
                    en: "Kura takes 0% from your insurance.",
                    km: "Kura យក ០% ពីធានារ៉ាប់រងរបស់អ្នក។",
                  })}
                </p>
                <p className="max-w-md text-[0.9375rem] leading-relaxed text-white/75">
                  {t({
                    en: "We take nothing from your insurance. The full benefit stays yours. Covered plans are billed directly, so you pay nothing out of pocket.",
                    km: "យើងមិនយកអ្វីពីធានារ៉ាប់រងរបស់អ្នកទេ — អត្ថប្រយោជន៍ពេញលេញនៅជារបស់អ្នក។ គម្រោងដែលគ្របដណ្តប់ត្រូវបានគិតប្រាក់ផ្ទាល់ ដូច្នេះអ្នកមិនបាច់បង់ខ្លួនឯងទេ។",
                  })}
                </p>
              </div>
            </div>
          </BentoCard>

          {/* Cash & KHQR */}
          <BentoCard span="lg:col-span-2" tone="default">
            <div className="flex h-full flex-col gap-3">
              <span className="grid size-10 place-items-center rounded-[var(--radius-md)] bg-brand-50 text-brand-600">
                <Icon name="wallet" size={20} />
              </span>
              <h3 className="text-h4 font-medium text-ink-900">
                {t({ en: "Cash & KHQR", km: "សាច់ប្រាក់ និង KHQR" })}
              </h3>
              <p className="text-[0.9375rem] leading-relaxed text-ink-600">
                {t({
                  en: "Pay in cash at the centre or scan KHQR from any local bank app.",
                  km: "បង់សាច់ប្រាក់នៅមជ្ឈមណ្ឌល ឬស្កេន KHQR ពីកម្មវិធីធនាគារក្នុងស្រុក។",
                })}
              </p>
            </div>
          </BentoCard>

          {/* Forte EmCare & NSSF */}
          <BentoCard span="lg:col-span-2" tone="tint">
            <div className="flex h-full flex-col gap-3">
              <span className="grid size-10 place-items-center rounded-[var(--radius-md)] bg-brand-50 text-brand-600">
                <Icon name="shield" size={20} />
              </span>
              <h3 className="text-h4 font-medium text-ink-900">
                {t({ en: "Forte EmCare & NSSF", km: "Forte EmCare និង NSSF" })}
              </h3>
              <p className="text-[0.9375rem] leading-relaxed text-ink-600">
                {t({
                  en: "Covered plans are billed directly, so you pay nothing out of pocket.",
                  km: "គម្រោងដែលគ្របដណ្តប់ត្រូវបានគិតប្រាក់ផ្ទាល់ ដូច្នេះអ្នកមិនបាច់បង់ខ្លួនឯងទេ។",
                })}
              </p>
            </div>
          </BentoCard>

          {/* Per-test or bundled packages */}
          <BentoCard span="lg:col-span-2" tone="ink">
            <div className="flex h-full flex-col gap-3">
              <span className="grid size-10 place-items-center rounded-[var(--radius-md)] bg-white/10 text-white">
                <Icon name="report" size={20} />
              </span>
              <h3 className="text-h4 font-medium text-white">
                {t({ en: "Per-test or bundled packages", km: "តាមតេស្ត ឬជាកញ្ចប់" })}
              </h3>
              <p className="text-[0.9375rem] leading-relaxed text-white/70">
                {t({
                  en: "Order a single test at its listed price, or save with a curated package.",
                  km: "បញ្ជាទិញតេស្តតែមួយតាមតម្លៃកំណត់ ឬសន្សំជាមួយកញ្ចប់ដែលរៀបចំជាស្រេច។",
                })}
              </p>
            </div>
          </BentoCard>
        </BentoGrid>
      </Reveal>
    </Section>
  );
}
