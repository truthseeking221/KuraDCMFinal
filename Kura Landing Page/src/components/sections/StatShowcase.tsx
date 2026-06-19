"use client";

import { useLang, type Localized } from "@/i18n/LanguageProvider";
import { STATS } from "@/data/site";
import { Section, Eyebrow, Button, Reveal } from "@/components/ui";
import { cx } from "@/lib/cx";

/**
 * Asymmetric oversized-number band (Sana pattern): a statement column on the
 * left, an unequal stat grid on the right where numbers are the hero and
 * captions sit beneath, separated by hairlines with generous empty space.
 */
export function StatShowcase({
  eyebrow,
  title,
  lead,
  cta,
  items,
  tone = "ink",
}: {
  eyebrow?: Localized;
  title: Localized;
  lead?: Localized;
  cta?: { label: Localized; href: string };
  items?: { value: string; label: Localized; sub?: Localized }[];
  tone?: "ink" | "tint" | "default";
}) {
  const { t } = useLang();
  const dark = tone === "ink";
  const data = (items ?? STATS).slice(0, 4);

  return (
    <Section tone={tone}>
      <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        <div className="flex flex-col gap-5">
          {eyebrow ? (
            <Eyebrow className={dark ? "text-brand-200" : undefined}>{t(eyebrow)}</Eyebrow>
          ) : null}
          <Reveal>
            <h2 className={cx("text-h2 font-medium text-balance", dark ? "text-white" : "text-ink-950")}>
              {t(title)}
            </h2>
          </Reveal>
          {lead ? (
            <p className={cx("max-w-md text-lead", dark ? "text-white/70" : "text-ink-600")}>{t(lead)}</p>
          ) : null}
          {cta ? (
            <Button
              href={cta.href}
              variant={dark ? "primary" : "outline"}
              iconRight="arrow-right"
              className={cx("mt-2 self-start", dark && "!bg-white !text-brand-700 hover:!bg-white/90")}
            >
              {t(cta.label)}
            </Button>
          ) : null}
        </div>

        <div
          className={cx(
            "grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-lg)]",
            dark ? "bg-white/10" : "bg-[var(--hairline)]",
          )}
        >
          {data.map((s, i) => (
            <Reveal
              key={i}
              delay={((i % 4) + 1) as 1 | 2 | 3 | 4}
              className={cx(dark ? "bg-ink-900" : "bg-surface")}
            >
              <div className="flex min-h-[9.5rem] flex-col justify-between gap-6 p-6 sm:min-h-[12rem] sm:p-8">
                <span
                  className={cx(
                    "text-[2.75rem] font-semibold leading-none tracking-tight tabular-nums sm:text-[3.5rem]",
                    dark ? "text-white" : "text-ink-950",
                  )}
                >
                  {s.value}
                </span>
                <span className="flex flex-col">
                  <span className={cx("text-[0.9375rem] font-medium", dark ? "text-white/70" : "text-ink-700")}>
                    {t(s.label)}
                  </span>
                  {s.sub ? (
                    <span className={cx("text-[0.8125rem]", dark ? "text-white/45" : "text-ink-400")}>
                      {t(s.sub)}
                    </span>
                  ) : null}
                </span>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </Section>
  );
}
