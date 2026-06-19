"use client";

import Link from "next/link";
import { useLang, type Localized } from "@/i18n/LanguageProvider";
import { Section, Eyebrow, Reveal, Icon, type IconName } from "@/components/ui";
import { cx } from "@/lib/cx";

export type FeatureRow = {
  icon?: IconName;
  title: Localized;
  body: Localized;
  href?: string;
};

/**
 * Dense, hairline-separated alternating rows (Square/Faire pattern): a numbered
 * or icon marker, a heading + 2-3 line description, and an optional link —
 * packs many features into the height a padded card grid would waste.
 */
export function FeatureRows({
  eyebrow,
  title,
  lead,
  items,
  numbered = true,
  tone = "default",
}: {
  eyebrow?: Localized;
  title: Localized;
  lead?: Localized;
  items: FeatureRow[];
  numbered?: boolean;
  tone?: "default" | "tint";
}) {
  const { t } = useLang();
  return (
    <Section tone={tone}>
      {/* Asymmetric header: title held to the left ~half */}
      <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
        <div className="flex flex-col gap-4 lg:sticky lg:top-[calc(var(--header-h)+2rem)] lg:self-start">
          {eyebrow ? <Eyebrow>{t(eyebrow)}</Eyebrow> : null}
          <h2 className="text-h2 font-medium text-balance text-ink-950">{t(title)}</h2>
          {lead ? <p className="max-w-md text-lead text-ink-600">{t(lead)}</p> : null}
        </div>

        <div className="flex flex-col">
          {items.map((item, i) => {
            const inner = (
              <>
                <span className="flex w-12 shrink-0 items-start">
                  {numbered ? (
                    <span className="font-mono text-[0.9375rem] font-semibold text-brand-500">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  ) : item.icon ? (
                    <span className="grid size-10 place-items-center rounded-[var(--radius-md)] bg-brand-50 text-brand-600">
                      <Icon name={item.icon} size={20} />
                    </span>
                  ) : null}
                </span>
                <span className="flex flex-1 flex-col gap-1.5">
                  <span className="flex items-center gap-2 text-[1.0625rem] font-semibold text-ink-900">
                    {t(item.title)}
                  </span>
                  <span className="text-[0.9375rem] leading-relaxed text-ink-600">{t(item.body)}</span>
                </span>
                {item.href ? (
                  <Icon
                    name="arrow-right"
                    size={18}
                    className="mt-1 shrink-0 text-ink-300 transition-transform duration-200 group-hover/row:translate-x-0.5 group-hover/row:text-brand-500"
                  />
                ) : null}
              </>
            );
            const cls = cx(
              "flex gap-5 border-t border-[var(--hairline)] py-6 last:border-b",
              item.href && "group/row transition-colors hover:bg-ink-25/60",
            );
            return (
              <Reveal key={item.title.en} delay={((i % 4) + 1) as 1 | 2 | 3 | 4}>
                {item.href ? (
                  <Link href={item.href} className={cls}>
                    {inner}
                  </Link>
                ) : (
                  <div className={cls}>{inner}</div>
                )}
              </Reveal>
            );
          })}
        </div>
      </div>
    </Section>
  );
}
