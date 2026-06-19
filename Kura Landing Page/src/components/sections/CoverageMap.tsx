"use client";

import { useState } from "react";
import { useLang } from "@/i18n/LanguageProvider";
import { PSCS, SERVICE_LABEL } from "@/data/network";
import { Section, SectionHeader, Reveal, Icon, Pill } from "@/components/ui";
import { cx } from "@/lib/cx";

// Stylized (non-cartographic) Cambodia landmass for an ambient coverage map.
const CAMBODIA =
  "M20,30 C24,19 40,14 53,16 C67,18 79,22 85,31 C91,40 88,53 82,63 C78,71 70,84 58,88 C48,91 39,90 35,83 C29,75 22,71 18,61 C13,51 14,40 20,30 Z";

export function CoverageMap({ tone = "tint" }: { tone?: "default" | "tint" }) {
  const { t } = useLang();
  const [active, setActive] = useState<string>(PSCS[0].slug);

  return (
    <Section tone={tone}>
      <SectionHeader
        eyebrow={t({ en: "National network", km: "បណ្តាញថ្នាក់ជាតិ" })}
        title={t({ en: "Sampling, wherever care happens", km: "ការប្រមូលសំណាក គ្រប់ទីកន្លែង" })}
        lead={t({
          en: "12 collection centres across 8 provinces. We also come to your home, and we sweep clinics by courier every day.",
          km: "មជ្ឈមណ្ឌលប្រមូលសំណាក ១២ ក្នុង ៨ ខេត្ត បូករួមការមកផ្ទះ និងការប្រមូលពីគ្លីនិក។",
        })}
      />

      <div className="mt-12 grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:gap-12">
        {/* Map */}
        <Reveal>
          <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-xl)] border border-[var(--hairline)] bg-surface">
            <div className="bg-dot absolute inset-0 opacity-60" />
            <svg viewBox="0 0 100 100" className="absolute inset-0 size-full" preserveAspectRatio="xMidYMid meet" aria-hidden role="presentation">
              <path d={CAMBODIA} className="fill-brand-50 stroke-brand-200" strokeWidth={0.4} />
              <ellipse cx="42" cy="40" rx="9" ry="5" className="fill-brand-100/70" />
              {PSCS.map((p) => {
                const isActive = p.slug === active;
                return (
                  <g key={p.slug} onMouseEnter={() => setActive(p.slug)}>
                    {isActive ? (
                      <circle cx={p.pos.x} cy={p.pos.y} r={3.4} className="fill-brand-500/20">
                        <animate attributeName="r" values="2.4;4;2.4" dur="2s" repeatCount="indefinite" />
                      </circle>
                    ) : null}
                    <circle
                      cx={p.pos.x}
                      cy={p.pos.y}
                      r={p.flagship ? 1.7 : 1.2}
                      className={cx(
                        "transition-all",
                        isActive ? "fill-brand-600" : "fill-brand-400",
                      )}
                    />
                  </g>
                );
              })}
            </svg>
          </div>
        </Reveal>

        {/* List */}
        <div className="flex max-h-[28rem] flex-col divide-y divide-[var(--hairline)] overflow-y-auto pr-1">
          {PSCS.map((p) => {
            const isActive = p.slug === active;
            return (
              <button
                key={p.slug}
                type="button"
                onMouseEnter={() => setActive(p.slug)}
                onFocus={() => setActive(p.slug)}
                className={cx(
                  "flex flex-col gap-2 rounded-[var(--radius-md)] px-4 py-4 text-left transition-colors",
                  isActive ? "bg-brand-50" : "hover:bg-ink-25",
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-[0.9375rem] font-medium text-ink-900">
                    <Icon name="map-pin" size={16} className="text-brand-500" />
                    {t(p.name)}
                  </span>
                  {p.flagship ? (
                    <Pill tone="brand">{t({ en: "Flagship", km: "មជ្ឈមណ្ឌលធំ" })}</Pill>
                  ) : null}
                </div>
                <span className="text-[0.8125rem] text-ink-500">{t(p.address)}</span>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.75rem] text-ink-500">
                  <span className="inline-flex items-center gap-1">
                    <Icon name="clock" size={13} /> {t(p.hours)}
                  </span>
                  {p.services.map((s) => (
                    <span key={s} className="inline-flex items-center gap-1 text-ink-400">
                      <span className="size-1 rounded-full bg-ink-300" />
                      {t(SERVICE_LABEL[s])}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </Section>
  );
}
