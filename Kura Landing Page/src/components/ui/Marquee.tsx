"use client";

import { useState, type ReactNode } from "react";
import { useLang } from "@/i18n/LanguageProvider";
import { cx } from "@/lib/cx";

/**
 * Slow, pausable logo/badge marquee. Duplicates its children once so the loop
 * is seamless. Pauses on hover and via an accessible toggle.
 */
export function Marquee({
  children,
  speed = 38,
  className,
  fade = true,
}: {
  children: ReactNode;
  /** Seconds per loop. */
  speed?: number;
  className?: string;
  fade?: boolean;
}) {
  const [paused, setPaused] = useState(false);
  const { t } = useLang();
  return (
    <div
      className={cx("group/marquee relative w-full overflow-hidden", className)}
      style={
        fade
          ? {
              maskImage:
                "linear-gradient(to right, transparent, #000 8%, #000 92%, transparent)",
              WebkitMaskImage:
                "linear-gradient(to right, transparent, #000 8%, #000 92%, transparent)",
            }
          : undefined
      }
    >
      <button
        type="button"
        aria-label={paused ? t({ en: "Resume motion", km: "បន្តចលនា" }) : t({ en: "Pause motion", km: "ផ្អាកចលនា" })}
        aria-pressed={paused}
        onClick={() => setPaused((p) => !p)}
        className="absolute right-0 top-1/2 z-10 -translate-y-1/2 text-[0.75rem] uppercase tracking-wider text-ink-400 opacity-0 transition-opacity group-hover/marquee:opacity-100 focus-visible:opacity-100"
      >
        {paused ? t({ en: "Play", km: "លេង" }) : t({ en: "Pause", km: "ផ្អាក" })}
      </button>
      <div
        className="flex w-max items-center gap-14"
        style={{
          animation: `kura-marquee ${speed}s linear infinite`,
          animationPlayState: paused ? "paused" : "running",
        }}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div className="flex shrink-0 items-center gap-14">{children}</div>
        <div className="flex shrink-0 items-center gap-14" aria-hidden>
          {children}
        </div>
      </div>
    </div>
  );
}
