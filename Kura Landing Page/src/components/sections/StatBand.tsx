"use client";

import { useLang, type Localized } from "@/i18n/LanguageProvider";
import { STATS } from "@/data/site";
import { Section, SectionHeader, StatStrip } from "@/components/ui";

export function StatBand({
  title,
  lead,
  eyebrow,
  items,
  tone = "ink",
}: {
  title?: Localized;
  lead?: Localized;
  eyebrow?: Localized;
  items?: { value: string; label: Localized; sub?: Localized }[];
  tone?: "default" | "tint" | "ink";
}) {
  const { t } = useLang();
  const dark = tone === "ink";
  const data = (items ?? STATS).map((s) => ({
    value: s.value,
    label: t(s.label),
    sub: s.sub ? t(s.sub) : undefined,
  }));
  return (
    <Section tone={tone}>
      {title ? (
        <SectionHeader
          align="center"
          tone={dark ? "inverse" : "default"}
          eyebrow={eyebrow ? t(eyebrow) : undefined}
          title={t(title)}
          lead={lead ? t(lead) : undefined}
          className="mb-14"
        />
      ) : null}
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-10 sm:gap-x-0">
        <StatStrip items={data} tone={dark ? "inverse" : "default"} />
      </div>
    </Section>
  );
}
