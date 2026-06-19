"use client";

import type { ReactNode } from "react";
import { useLang, type Localized } from "@/i18n/LanguageProvider";
import { Button, Pill, Reveal, Tilt } from "@/components/ui";
import { cx } from "@/lib/cx";

export function PageHero({
  eyebrow,
  title,
  titleAccent,
  titleAfter,
  lead,
  primary,
  secondary,
  aside,
  tone = "default",
}: {
  eyebrow?: Localized;
  title: Localized;
  /** Gradient-accent fragment appended after `title`. */
  titleAccent?: Localized;
  /** Plain fragment appended after the accent. */
  titleAfter?: Localized;
  lead?: Localized;
  primary?: { label: Localized; href: string };
  secondary?: { label: Localized; href: string };
  aside?: ReactNode;
  tone?: "default" | "tint" | "ink";
}) {
  const { t } = useLang();
  const split = Boolean(aside);
  const dark = tone === "ink";

  return (
    <section
      className={cx(
        "relative overflow-hidden pt-[calc(var(--header-h)+2.5rem)]",
        tone === "tint" && "bg-ink-25",
        dark && "bg-ink-950 text-white [--hairline:rgba(255,255,255,0.12)]",
      )}
    >
      <div className="bg-grid pointer-events-none absolute inset-x-0 top-0 h-[520px] opacity-70" />
      <div
        className={cx(
          "container-wide relative flex flex-col gap-12 pb-16 pt-10 lg:pb-24",
          split && "lg:grid lg:grid-cols-[1.05fr_minmax(0,0.95fr)] lg:items-center",
        )}
      >
        <div className={cx("flex min-w-0 flex-col gap-6", !split && "max-w-3xl")}>
          {eyebrow ? (
            <Reveal>
              <Pill tone={dark ? "inverse" : "brand"} dot="brand">
                {t(eyebrow)}
              </Pill>
            </Reveal>
          ) : null}
          <Reveal delay={1}>
            <h1
              className={cx(
                "text-h1 font-medium text-balance lg:text-display",
                dark ? "text-white" : "text-ink-950",
              )}
            >
              {t(title)}
              {titleAccent ? (
                <>
                  {" "}
                  <span className="text-gradient-brand">{t(titleAccent)}</span>
                </>
              ) : null}
              {titleAfter ? t(titleAfter) : null}
            </h1>
          </Reveal>
          {lead ? (
            <Reveal delay={2}>
              <p
                className={cx(
                  "max-w-xl text-lead text-pretty",
                  dark ? "text-white/70" : "text-ink-600",
                )}
              >
                {t(lead)}
              </p>
            </Reveal>
          ) : null}
          {primary || secondary ? (
            <Reveal delay={3}>
              <div className="mt-2 flex flex-col gap-3 sm:flex-row">
                {primary ? (
                  <Button href={primary.href} size="lg" iconRight="arrow-right">
                    {t(primary.label)}
                  </Button>
                ) : null}
                {secondary ? (
                  <Button
                    href={secondary.href}
                    size="lg"
                    variant="outline"
                    className={dark ? "!text-white !ring-white/30 hover:!bg-white/10" : undefined}
                  >
                    {t(secondary.label)}
                  </Button>
                ) : null}
              </div>
            </Reveal>
          ) : null}
        </div>

        {split ? (
          <Reveal delay={2} className="min-w-0 lg:pl-6">
            <Tilt max={5}>{aside}</Tilt>
          </Reveal>
        ) : null}
      </div>
    </section>
  );
}
