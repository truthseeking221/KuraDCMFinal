"use client";

import Link from "next/link";
import { useLang, type Localized } from "@/i18n/LanguageProvider";
import { Section, SectionHeader, Reveal, Icon, type IconName } from "@/components/ui";

type Audience = {
  href: string;
  icon: IconName;
  title: Localized;
  promise: Localized;
  body: Localized;
  points: Localized[];
};

const AUDIENCES: Audience[] = [
  {
    href: "/for-doctors",
    icon: "stethoscope",
    title: { en: "For Doctors", km: "សម្រាប់គ្រូពេទ្យ" },
    promise: { en: "Order labs without owning one", km: "បញ្ជាទិញតេស្តដោយមិនចាំបាច់មានមន្ទីរ" },
    body: {
      en: "Verify once. Order any test, sign your diagnosis and prescription, and receive insurance. Kura takes 0%.",
      km: "ផ្ទៀងផ្ទាត់ម្តង រួចបញ្ជាទិញតេស្ត ចុះហត្ថលេខា និងទទួលធានារ៉ាប់រង — Kura យក ០%។",
    },
    points: [
      { en: "Verified the same day", km: "ផ្ទៀងផ្ទាត់ក្នុងថ្ងៃ" },
      { en: "Legal documents, e-signed", km: "ឯកសារស្របច្បាប់" },
      { en: "Daily courier to your clinic", km: "ប្រមូលសំណាករៀងរាល់ថ្ងៃ" },
    ],
  },
  {
    href: "/for-patients",
    icon: "droplet",
    title: { en: "For Patients", km: "សម្រាប់អ្នកជំងឺ" },
    promise: { en: "Get tested. Understand your results", km: "ធ្វើតេស្ត និងយល់ពីលទ្ធផល" },
    body: {
      en: "Book a test or package, give a sample near you or at home, and read your results in plain Khmer.",
      km: "កក់តេស្ត ផ្តល់សំណាកនៅជិត ឬនៅផ្ទះ ហើយអានលទ្ធផលជាភាសាខ្មែរ។",
    },
    points: [
      { en: "Collection at home or walk-in", km: "ប្រមូលនៅផ្ទះ ឬចូលផ្ទាល់" },
      { en: "Results on Telegram", km: "លទ្ធផលតាម Telegram" },
      { en: "Prices you can see upfront", km: "តម្លៃច្បាស់លាស់" },
    ],
  },
  {
    href: "/for-business",
    icon: "building",
    title: { en: "For Business", km: "សម្រាប់អាជីវកម្ម" },
    promise: { en: "Clinics, employers and insurers", km: "គ្លីនិក និយោជក និងធានារ៉ាប់រង" },
    body: {
      en: "Run a clinic without a lab, screen your workforce, or settle claims. All at national scale.",
      km: "ដំណើរការគ្លីនិកដោយគ្មានមន្ទីរ ត្រួតពិនិត្យបុគ្គលិក ឬទូទាត់ការទាមទារ។",
    },
    points: [
      { en: "Workforce health screening", km: "ត្រួតពិនិត្យសុខភាពបុគ្គលិក" },
      { en: "HR dashboards, kept private", km: "ផ្ទាំងគ្រប់គ្រងសម្រាប់ HR" },
      { en: "Built to work with insurers", km: "ការតភ្ជាប់ធានារ៉ាប់រង" },
    ],
  },
];

export function AudienceGrid({ tone = "default" }: { tone?: "default" | "tint" }) {
  const { t } = useLang();
  return (
    <Section tone={tone}>
      <SectionHeader
        align="center"
        eyebrow={t({ en: "Built for everyone in the loop", km: "សម្រាប់អ្នកពាក់ព័ន្ធទាំងអស់" })}
        title={t({ en: "One network. Three ways in.", km: "បណ្តាញតែមួយ ផ្លូវចូលបី" })}
        lead={t({
          en: "Doctors, patients and businesses run on the same trusted infrastructure. Each one gets a workflow built around them.",
          km: "គ្រូពេទ្យ អ្នកជំងឺ និងអាជីវកម្ម ប្រើប្រាស់ហេដ្ឋារចនាសម្ព័ន្ធតែមួយ។",
        })}
      />
      <div className="mt-14 grid gap-5 lg:grid-cols-3">
        {AUDIENCES.map((a, i) => (
          <Reveal key={a.href} delay={(i + 1) as 1 | 2 | 3}>
            <Link
              href={a.href}
              className="group/aud flex h-full flex-col gap-5 rounded-[var(--radius-lg)] border border-[var(--hairline)] bg-surface p-7 transition-[transform,box-shadow,border-color] duration-300 ease-[var(--ease-out)] hover:-translate-y-1 hover:border-brand-100 hover:shadow-[var(--shadow-md)]"
            >
              <span className="grid size-12 place-items-center rounded-[var(--radius-md)] bg-ink-900 text-white transition-colors group-hover/aud:bg-brand-500">
                <Icon name={a.icon} size={24} />
              </span>
              <div className="flex flex-col gap-2">
                <h3 className="text-h4 font-medium text-ink-900">{t(a.title)}</h3>
                <p className="text-[0.875rem] font-medium text-brand-600">{t(a.promise)}</p>
              </div>
              <p className="text-[0.9375rem] leading-relaxed text-ink-600">{t(a.body)}</p>
              <ul className="mt-auto flex flex-col gap-2 border-t border-[var(--hairline)] pt-5">
                {a.points.map((p) => (
                  <li key={p.en} className="flex items-center gap-2.5 text-[0.875rem] text-ink-700">
                    <Icon name="check" size={16} className="shrink-0 text-success-500" />
                    {t(p)}
                  </li>
                ))}
              </ul>
              <span className="inline-flex items-center gap-1.5 text-[0.875rem] font-medium text-brand-600">
                {t({ en: "Explore", km: "ស្វែងយល់" })}
                <Icon
                  name="arrow-right"
                  size={16}
                  className="transition-transform duration-200 group-hover/aud:translate-x-0.5"
                />
              </span>
            </Link>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
