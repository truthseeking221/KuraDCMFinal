"use client";

import { useLang } from "@/i18n/LanguageProvider";
import { PACKAGES } from "@/data/catalog";
import { Section, SectionHeader, Reveal } from "@/components/ui";
import { PackageCard } from "@/components/catalog/PackageCard";

export function PackagesSection({
  tone = "tint",
  eyebrow,
  title,
  lead,
}: {
  tone?: "default" | "tint" | "ink";
  eyebrow?: string;
  title?: string;
  lead?: string;
}) {
  const { t } = useLang();
  return (
    <Section tone={tone}>
      <SectionHeader
        align="center"
        tone={tone === "ink" ? "inverse" : "default"}
        eyebrow={eyebrow ?? t({ en: "Health packages", km: "កញ្ចប់សុខភាព" })}
        title={title ?? t({ en: "Curated checkups, one clear price", km: "ការត្រួតពិនិត្យ តម្លៃតែមួយ" })}
        lead={
          lead ??
          t({
            en: "Three tiers, good to comprehensive. Each bundles dozens of tests for far less than ordering one by one.",
            km: "កម្រិតបី ពីសាមញ្ញ ដល់ពេញលេញ ដោយតម្លៃសមរម្យ។",
          })
        }
      />
      <div className="mt-14 grid items-stretch gap-5 lg:grid-cols-3">
        {PACKAGES.map((pkg, i) => (
          <Reveal key={pkg.slug} delay={(i + 1) as 1 | 2 | 3} className="h-full">
            <PackageCard pkg={pkg} />
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
