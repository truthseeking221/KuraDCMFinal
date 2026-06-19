"use client";

import type { ReactNode } from "react";
import { useLang, type Localized } from "@/i18n/LanguageProvider";
import { Section, Eyebrow, Reveal, Icon, type IconName } from "@/components/ui";
import { cx } from "@/lib/cx";

/** Large dominant visual + a stacked capability list (incident.io pattern). */
export function Showcase({
  eyebrow,
  title,
  lead,
  visual,
  items,
  side = "left",
  tone = "default",
}: {
  eyebrow?: Localized;
  title: Localized;
  lead?: Localized;
  visual: ReactNode;
  items: { icon: IconName; title: Localized; body: Localized }[];
  side?: "left" | "right";
  tone?: "default" | "tint" | "ink";
}) {
  const { t } = useLang();
  const dark = tone === "ink";
  return (
    <Section tone={tone}>
      <div className="grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16">
        <Reveal className={cx("min-w-0", side === "right" && "lg:order-2")}>{visual}</Reveal>
        <div className={cx("flex flex-col gap-6", side === "right" && "lg:order-1")}>
          <div className="flex flex-col gap-4">
            {eyebrow ? <Eyebrow className={dark ? "text-brand-200" : undefined}>{t(eyebrow)}</Eyebrow> : null}
            <h2 className={cx("text-h2 font-medium text-balance", dark ? "text-white" : "text-ink-950")}>
              {t(title)}
            </h2>
            {lead ? <p className={cx("text-lead", dark ? "text-white/70" : "text-ink-600")}>{t(lead)}</p> : null}
          </div>
          <div className="flex flex-col">
            {items.map((it, i) => (
              <Reveal key={it.title.en} delay={((i % 4) + 1) as 1 | 2 | 3 | 4}>
                <div
                  className={cx(
                    "flex gap-4 border-t py-5 last:border-b",
                    dark ? "border-white/12" : "border-[var(--hairline)]",
                  )}
                >
                  <span
                    className={cx(
                      "grid size-10 shrink-0 place-items-center rounded-[var(--radius-md)]",
                      dark ? "bg-white/10 text-brand-200" : "bg-brand-50 text-brand-600",
                    )}
                  >
                    <Icon name={it.icon} size={20} />
                  </span>
                  <div className="flex flex-col gap-1">
                    <h3 className={cx("text-[1.0625rem] font-semibold", dark ? "text-white" : "text-ink-900")}>
                      {t(it.title)}
                    </h3>
                    <p className={cx("text-[0.9375rem] leading-relaxed", dark ? "text-white/65" : "text-ink-600")}>
                      {t(it.body)}
                    </p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
}
