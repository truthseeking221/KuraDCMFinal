"use client";

import { useLang, type Localized } from "@/i18n/LanguageProvider";
import { Section, SectionHeader, Reveal, Icon, type IconName } from "@/components/ui";
import { cx } from "@/lib/cx";

export type Feature = {
  icon: IconName;
  title: Localized;
  body: Localized;
};

export function FeatureGrid({
  eyebrow,
  title,
  lead,
  items,
  columns = 3,
  align = "left",
  tone = "default",
  variant = "card",
}: {
  eyebrow?: Localized;
  title?: Localized;
  lead?: Localized;
  items: Feature[];
  columns?: 2 | 3 | 4;
  align?: "left" | "center";
  tone?: "default" | "tint" | "ink";
  variant?: "card" | "plain";
}) {
  const { t } = useLang();
  const dark = tone === "ink";
  const cols =
    columns === 4
      ? "sm:grid-cols-2 lg:grid-cols-4"
      : columns === 2
        ? "sm:grid-cols-2"
        : "sm:grid-cols-2 lg:grid-cols-3";

  return (
    <Section tone={tone}>
      {title ? (
        <SectionHeader
          eyebrow={eyebrow ? t(eyebrow) : undefined}
          title={t(title)}
          lead={lead ? t(lead) : undefined}
          align={align}
          tone={dark ? "inverse" : "default"}
        />
      ) : null}
      <div className={cx("grid gap-5", title && "mt-14", cols)}>
        {items.map((f, i) => (
          <Reveal key={f.title.en} delay={((i % 3) + 1) as 1 | 2 | 3}>
            <div
              className={cx(
                "flex h-full flex-col gap-4",
                variant === "card" &&
                  (dark
                    ? "rounded-[var(--radius-lg)] border border-white/10 bg-white/[0.03] p-7"
                    : "rounded-[var(--radius-lg)] border border-[var(--hairline)] bg-surface p-7"),
              )}
            >
              <span
                className={cx(
                  "grid size-11 place-items-center rounded-[var(--radius-md)]",
                  dark ? "bg-white/10 text-brand-200" : "bg-brand-50 text-brand-600",
                )}
              >
                <Icon name={f.icon} size={22} />
              </span>
              <h3 className={cx("text-h4 font-medium", dark ? "text-white" : "text-ink-900")}>
                {t(f.title)}
              </h3>
              <p className={cx("text-[0.9375rem] leading-relaxed", dark ? "text-white/65" : "text-ink-600")}>
                {t(f.body)}
              </p>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
