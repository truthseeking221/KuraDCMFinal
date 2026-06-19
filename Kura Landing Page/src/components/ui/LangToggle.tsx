"use client";

import { useLang, type Lang } from "@/i18n/LanguageProvider";
import { cx } from "@/lib/cx";

const OPTIONS: { value: Lang; label: string }[] = [
  { value: "en", label: "EN" },
  { value: "km", label: "ខ្មែរ" },
];

export function LangToggle({
  tone = "default",
  className,
}: {
  tone?: "default" | "inverse";
  className?: string;
}) {
  const { lang, setLang, t } = useLang();
  const inverse = tone === "inverse";
  return (
    <div
      role="group"
      aria-label={t({ en: "Language", km: "ភាសា" })}
      className={cx(
        "inline-flex items-center gap-0.5 rounded-pill p-0.5",
        inverse ? "bg-white/10" : "bg-ink-100",
        className,
      )}
    >
      {OPTIONS.map((opt) => {
        const active = lang === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => setLang(opt.value)}
            aria-pressed={active}
            className={cx(
              "rounded-pill px-2.5 py-1 text-[0.75rem] font-medium transition-colors duration-200",
              active
                ? inverse
                  ? "bg-white text-ink-900"
                  : "bg-white text-ink-900 shadow-[var(--shadow-xs)]"
                : inverse
                  ? "text-white/60 hover:text-white"
                  : "text-ink-500 hover:text-ink-800",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
