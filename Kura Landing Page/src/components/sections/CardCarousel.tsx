"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useLang, type Localized } from "@/i18n/LanguageProvider";
import { Section, Eyebrow, Icon } from "@/components/ui";
import { cx } from "@/lib/cx";

/**
 * Horizontal card carousel — scroll-snap track with a peek of the next card,
 * prev/next arrow controls (dimmed at the ends) and edge fade. Children are
 * the cards; each should be `shrink-0 snap-start` with its own width.
 */
export function CardCarousel({
  eyebrow,
  title,
  lead,
  viewAllHref,
  viewAllLabel,
  tone = "default",
  children,
  innerTone,
}: {
  eyebrow?: Localized;
  title: Localized;
  lead?: Localized;
  viewAllHref?: string;
  viewAllLabel?: Localized;
  tone?: "default" | "tint" | "ink";
  /** Override header text color independent of the band tone. */
  innerTone?: "default" | "inverse";
  children: ReactNode;
}) {
  const { t } = useLang();
  const ref = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(true);
  const dark = innerTone === "inverse" || tone === "ink";

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 8);
    setCanNext(el.scrollLeft < el.scrollWidth - el.clientWidth - 8);
  }, []);

  useEffect(() => {
    update();
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [update]);

  const scroll = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: "smooth" });
  };

  const arrow = (dir: 1 | -1, enabled: boolean) => (
    <button
      type="button"
      onClick={() => scroll(dir)}
      disabled={!enabled}
      aria-label={dir === 1 ? t({ en: "Next", km: "បន្ទាប់" }) : t({ en: "Previous", km: "មុន" })}
      className={cx(
        "grid size-10 place-items-center rounded-full border transition-colors duration-200 disabled:opacity-30",
        dark
          ? "border-white/20 text-white hover:bg-white/10"
          : "border-[var(--border-strong)] text-ink-700 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600",
      )}
    >
      <Icon name={dir === 1 ? "chevron-right" : "arrow-right"} size={18} className={dir === -1 ? "rotate-180" : ""} />
    </button>
  );

  return (
    <Section tone={tone} bleed pad>
      <div className="container-wide flex items-end justify-between gap-6">
        <div className="flex max-w-2xl flex-col gap-3">
          {eyebrow ? (
            <Eyebrow className={dark ? "text-brand-200" : undefined}>{t(eyebrow)}</Eyebrow>
          ) : null}
          <h2 className={cx("text-h2 font-medium text-balance", dark ? "text-white" : "text-ink-950")}>
            {t(title)}
          </h2>
          {lead ? (
            <p className={cx("text-lead", dark ? "text-white/70" : "text-ink-600")}>{t(lead)}</p>
          ) : null}
        </div>
        <div className="hidden shrink-0 items-center gap-2 sm:flex">
          {viewAllHref ? (
            <Link
              href={viewAllHref}
              className={cx(
                "mr-1 inline-flex items-center gap-1 text-[0.875rem] font-semibold",
                dark ? "text-white hover:text-brand-200" : "text-brand-600 hover:text-brand-700",
              )}
            >
              {t(viewAllLabel ?? { en: "View all", km: "មើលទាំងអស់" })}
              <Icon name="arrow-right" size={15} />
            </Link>
          ) : null}
          {arrow(-1, canPrev)}
          {arrow(1, canNext)}
        </div>
      </div>

      <div
        ref={ref}
        onScroll={update}
        className="mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto px-[var(--gutter)] pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{
          maskImage:
            "linear-gradient(to right, transparent, #000 calc(var(--gutter) - 4px), #000 calc(100% - var(--gutter) + 4px), transparent)",
          WebkitMaskImage:
            "linear-gradient(to right, transparent, #000 calc(var(--gutter) - 4px), #000 calc(100% - var(--gutter) + 4px), transparent)",
        }}
      >
        {children}
      </div>

      {viewAllHref ? (
        <div className="container-wide mt-2 sm:hidden">
          <Link
            href={viewAllHref}
            className={cx(
              "inline-flex items-center gap-1 text-[0.875rem] font-semibold",
              dark ? "text-white" : "text-brand-600",
            )}
          >
            {t(viewAllLabel ?? { en: "View all", km: "មើលទាំងអស់" })}
            <Icon name="arrow-right" size={15} />
          </Link>
        </div>
      ) : null}
    </Section>
  );
}
