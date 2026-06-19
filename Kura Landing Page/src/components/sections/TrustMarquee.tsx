"use client";

import { useLang } from "@/i18n/LanguageProvider";
import { PARTNERS } from "@/data/site";
import { Marquee } from "@/components/ui";
import { cx } from "@/lib/cx";

export function TrustMarquee({
  tone = "default",
  label,
}: {
  tone?: "default" | "tint" | "ink";
  label?: string;
}) {
  const { t } = useLang();
  const dark = tone === "ink";
  return (
    <section
      className={cx(
        "border-y",
        dark
          ? "border-white/10 bg-ink-950 text-white"
          : tone === "tint"
            ? "border-[var(--hairline)] bg-ink-25"
            : "border-[var(--hairline)] bg-surface",
      )}
    >
      <div className="container-wide flex flex-col items-center gap-6 py-12">
        <p
          className={cx(
            "text-center text-[0.75rem] font-medium uppercase tracking-[0.14em]",
            dark ? "text-white/40" : "text-ink-400",
          )}
        >
          {label ??
            t({
              en: "Accredited labs · trusted partners · national coverage",
              km: "មន្ទីរពិសោធន៍មានស្តង់ដារ · ដៃគូជឿទុកចិត្ត · គ្របដណ្តប់ទូទាំងប្រទេស",
            })}
        </p>
        <Marquee speed={42}>
          {PARTNERS.map((p) => (
            <span
              key={p}
              className={cx(
                "whitespace-nowrap text-lg font-medium tracking-tight",
                dark ? "text-white/55" : "text-ink-400",
              )}
            >
              {p}
            </span>
          ))}
        </Marquee>
      </div>
    </section>
  );
}
