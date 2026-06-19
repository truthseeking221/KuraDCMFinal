"use client";

import { useLang, type Localized } from "@/i18n/LanguageProvider";
import { Section, Eyebrow, Icon, RangeBar, Pill } from "@/components/ui";
import { DragScroller } from "@/components/ui/DragScroller";
import { Logomark } from "@/components/brand/Logo";
import { cx } from "@/lib/cx";
import type { ReactNode } from "react";

function Card({
  eyebrow,
  title,
  tone,
  children,
}: {
  eyebrow: Localized;
  title: Localized;
  tone: "white" | "tint" | "ink" | "brand";
  children: ReactNode;
}) {
  const { t } = useLang();
  const toneCls =
    tone === "ink"
      ? "bg-ink-950 text-white"
      : tone === "brand"
        ? "bg-gradient-to-br from-brand-700 via-brand-600 to-deep-500 text-white"
        : tone === "tint"
          ? "bg-ink-25 text-ink-900 ring-1 ring-[var(--hairline)]"
          : "bg-surface text-ink-900 ring-1 ring-[var(--hairline)]";
  return (
    <article
      className={cx(
        "group/g relative flex h-[26rem] w-[19rem] shrink-0 snap-start flex-col overflow-hidden rounded-[var(--radius-2xl)] sm:h-[28rem] sm:w-[22rem]",
        toneCls,
      )}
    >
      <div className="flex items-center justify-between p-6 pb-0">
        <Eyebrow className={tone === "ink" || tone === "brand" ? "text-white/70" : undefined}>
          {t(eyebrow)}
        </Eyebrow>
        <Logomark mono={tone === "ink" || tone === "brand"} className="h-3.5 w-auto opacity-60" />
      </div>
      <div className="relative flex flex-1 items-center justify-center overflow-hidden p-6">
        <div className="w-full transition-transform duration-500 ease-[var(--ease-out)] group-hover/g:scale-[1.04]">
          {children}
        </div>
      </div>
      <div className="p-6 pt-0">
        <p className={cx("text-[1.0625rem] font-semibold", tone === "ink" || tone === "brand" ? "text-white" : "text-ink-900")}>
          {t(title)}
        </p>
      </div>
    </article>
  );
}

export function KuraGallery({ tone = "default" }: { tone?: "default" | "tint" | "ink" }) {
  const { t } = useLang();
  return (
    <Section tone={tone} bleed pad id="inside">
      <div className="container-wide flex items-end justify-between gap-6">
        <div className="flex max-w-2xl flex-col gap-3">
          <Eyebrow>{t({ en: "Inside Kura", km: "ខាងក្នុង Kura" })}</Eyebrow>
          <h2 className="text-h2 font-medium text-balance text-ink-950">
            {t({ en: "See how it comes together", km: "មើលរបៀបដែលវាដំណើរការ" })}
          </h2>
          <p className="text-lead text-ink-600">
            {t({ en: "From the order to the answer. Drag to explore the moments that make Kura.", km: "ពីការបញ្ជាទិញ ដល់លទ្ធផល — អូសដើម្បីស្វែងយល់។" })}
          </p>
        </div>
        <span className="hidden shrink-0 items-center gap-2 rounded-pill border border-[var(--hairline)] px-3.5 py-2 text-[0.75rem] font-medium text-ink-500 sm:inline-flex">
          <Icon name="arrow-right" size={14} className="-scale-x-100" />
          {t({ en: "Drag to explore", km: "អូសដើម្បីមើល" })}
          <Icon name="arrow-right" size={14} />
        </span>
      </div>

      <DragScroller className="mt-8 px-[var(--gutter)]">
        {/* Results */}
        <Card eyebrow={{ en: "Your report", km: "របាយការណ៍" }} title={{ en: "Results you understand", km: "លទ្ធផលដែលអ្នកយល់" }} tone="white">
          <div className="flex flex-col gap-3.5 rounded-[var(--radius-md)] bg-ink-25 p-4">
            {[
              { n: "HbA1c", v: "5.4%", s: "optimal" as const, p: 42, o: [30, 62] as [number, number] },
              { n: "LDL-C", v: "168", s: "out" as const, p: 88, o: [20, 55] as [number, number] },
              { n: "Vitamin D", v: "23", s: "out" as const, p: 16, o: [45, 80] as [number, number] },
              { n: "TSH", v: "2.1", s: "optimal" as const, p: 48, o: [32, 70] as [number, number] },
            ].map((r) => (
              <div key={r.n} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-[0.8125rem]">
                  <span className="font-semibold text-ink-800">{r.n}</span>
                  <span className="tabular-nums text-ink-500">{r.v}</span>
                </div>
                <RangeBar value={r.p} optimal={r.o} status={r.s} />
              </div>
            ))}
          </div>
        </Card>

        {/* Network */}
        <Card eyebrow={{ en: "National network", km: "បណ្តាញ" }} title={{ en: "A centre near you", km: "មជ្ឈមណ្ឌលក្បែរអ្នក" }} tone="tint">
          <div className="flex flex-col items-center gap-3 text-center">
            <span className="grid size-16 place-items-center rounded-full bg-brand-50 text-brand-600">
              <Icon name="map-pin" size={32} />
            </span>
            <span className="text-[3.5rem] font-semibold leading-none tracking-tight text-ink-950">12</span>
            <span className="text-[0.875rem] text-ink-500">{t({ en: "collection centres · 8 provinces", km: "មជ្ឈមណ្ឌល · ៨ ខេត្ត" })}</span>
          </div>
        </Card>

        {/* Telegram */}
        <Card eyebrow={{ en: "Delivery", km: "ការផ្ញើ" }} title={{ en: "Sent to Telegram in 24h", km: "ផ្ញើតាម Telegram ក្នុង ២៤ ម៉ោង" }} tone="brand">
          <div className="flex flex-col gap-3">
            <div className="ml-auto max-w-[80%] rounded-2xl rounded-tr-sm bg-white/15 px-4 py-3 text-[0.875rem] text-white backdrop-blur">
              {t({ en: "Your Advance Check results are ready ✓", km: "លទ្ធផលរបស់អ្នករួចរាល់ ✓" })}
            </div>
            <div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-white/95 px-4 py-3 text-[0.875rem] text-ink-800">
              {t({ en: "Mostly in range. 2 markers to review.", km: "ភាគច្រើនធម្មតា — ២ ត្រូវពិនិត្យ។" })}
            </div>
          </div>
        </Card>

        {/* Daily sweep */}
        <Card eyebrow={{ en: "Logistics", km: "ដឹកជញ្ជូន" }} title={{ en: "Daily clinic sweep", km: "ប្រមូលពីគ្លីនិកប្រចាំថ្ងៃ" }} tone="ink">
          <div className="flex flex-col items-center gap-4 text-center">
            <span className="grid size-16 place-items-center rounded-full bg-white/10 text-white">
              <Icon name="truck" size={32} />
            </span>
            <p className="text-[1.0625rem] font-medium text-white">
              {t({ en: "Order by morning, collected by midday.", km: "បញ្ជាទិញពេលព្រឹក ប្រមូលពេលថ្ងៃត្រង់។" })}
            </p>
          </div>
        </Card>

        {/* Doctor tools */}
        <Card eyebrow={{ en: "For doctors", km: "សម្រាប់គ្រូពេទ្យ" }} title={{ en: "e-Signed Dx & Rx", km: "ឯកសារចុះហត្ថលេខា" }} tone="white">
          <div className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-[var(--hairline)] p-4">
            <div className="flex items-center gap-2">
              <Icon name="report" size={18} className="text-brand-500" />
              <span className="text-[0.8125rem] font-semibold text-ink-800">{t({ en: "Lab order · ICD-10", km: "បញ្ជាតេស្ត · ICD-10" })}</span>
            </div>
            <div className="h-1.5 w-2/3 rounded bg-ink-100" />
            <div className="h-1.5 w-1/2 rounded bg-ink-100" />
            <div className="mt-2 flex items-end justify-between">
              <Icon name="signature" size={40} className="text-brand-500" />
              <Pill tone="success" dot="success">{t({ en: "Signed", km: "បានចុះហត្ថលេខា" })}</Pill>
            </div>
          </div>
        </Card>

        {/* Accredited */}
        <Card eyebrow={{ en: "Quality", km: "គុណភាព" }} title={{ en: "Accredited, every time", km: "មានស្តង់ដារ គ្រប់ពេល" }} tone="tint">
          <div className="grid grid-cols-2 gap-3">
            {["ISO 15189", "Cambodia MoH", "RIQAS", "SOC 2"].map((b) => (
              <span key={b} className="grid place-items-center rounded-[var(--radius-md)] bg-surface px-3 py-4 text-center text-[0.8125rem] font-semibold text-ink-600 ring-1 ring-[var(--hairline)]">
                {b}
              </span>
            ))}
          </div>
        </Card>
      </DragScroller>
    </Section>
  );
}
