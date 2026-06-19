"use client";

import Link from "next/link";
import { useLang, type Localized } from "@/i18n/LanguageProvider";
import { FAQS, type Faq } from "@/data/faqs";
import { Section, SectionHeader, Accordion, Icon } from "@/components/ui";

export function FaqSection({
  audience,
  tone = "default",
  limit,
  eyebrow,
  title,
  showContact = true,
}: {
  audience?: Faq["audience"];
  tone?: "default" | "tint";
  limit?: number;
  eyebrow?: Localized;
  title?: Localized;
  showContact?: boolean;
}) {
  const { t } = useLang();
  const list = (audience ? FAQS.filter((f) => f.audience === audience) : FAQS).slice(
    0,
    limit ?? undefined,
  );
  const items = list.map((f) => ({ q: t(f.q), a: t(f.a) }));

  return (
    <Section tone={tone} width="narrow">
      <SectionHeader
        align="center"
        eyebrow={t(eyebrow ?? { en: "FAQ", km: "សំណួរញឹកញាប់" })}
        title={t(title ?? { en: "Questions, answered", km: "សំណួរ និងចម្លើយ" })}
      />
      <div className="mt-10">
        <Accordion items={items} />
      </div>
      {showContact ? (
        <p className="mt-8 text-center text-[0.9375rem] text-ink-500">
          {t({ en: "Still wondering?", km: "នៅមានសំណួរ?" })}{" "}
          <Link href="/contact" className="inline-flex items-center gap-1 font-medium text-brand-600 hover:text-brand-700">
            {t({ en: "Talk to our team", km: "ទាក់ទងក្រុមការងារ" })}
            <Icon name="arrow-right" size={15} />
          </Link>
        </p>
      ) : null}
    </Section>
  );
}
