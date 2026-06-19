"use client";

import { useLang } from "@/i18n/LanguageProvider";
import { Pill } from "@/components/ui";
import { cx } from "@/lib/cx";

// Sample: Vitamin D trending below the optimal band.
const POINTS = [
  { m: { en: "Feb", km: "កុម្ភៈ" }, v: 19 },
  { m: { en: "May", km: "ឧសភា" }, v: 21 },
  { m: { en: "Aug", km: "សីហា" }, v: 23 },
];
const MIN = 0;
const MAX = 100;
const OPT_LO = 45;
const OPT_HI = 80;

function y(v: number) {
  return 100 - ((v - MIN) / (MAX - MIN)) * 100;
}

export function BiomarkerDetail({ className }: { className?: string }) {
  const { t } = useLang();
  return (
    <div
      className={cx(
        "flex flex-col gap-6 rounded-[var(--radius-xl)] border border-[var(--hairline)] bg-surface p-6 shadow-[var(--shadow-md)] sm:p-7",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h3 className="text-h4 font-medium text-ink-900">
            {t({ en: "Vitamin D (25-OH)", km: "វីតាមីន D" })}
          </h3>
          <Pill tone="danger" dot="danger">
            {t({ en: "Out of range · 23 ng/mL", km: "ហួសកម្រិត · 23 ng/mL" })}
          </Pill>
        </div>
      </div>

      {/* Mini trend with shaded optimal band */}
      <div className="relative h-36 w-full overflow-hidden rounded-[var(--radius-md)] bg-ink-25">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full">
          <rect
            x={0}
            y={y(OPT_HI)}
            width={100}
            height={y(OPT_LO) - y(OPT_HI)}
            className="fill-success-200/50"
          />
          <line x1={0} y1={y(OPT_LO)} x2={100} y2={y(OPT_LO)} className="stroke-success-200" strokeWidth={0.5} strokeDasharray="2 2" />
          <polyline
            points={POINTS.map((p, i) => `${10 + i * 40},${y(p.v)}`).join(" ")}
            className="fill-none stroke-danger-400"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <span className="absolute right-2 top-2 rounded bg-success-500/10 px-1.5 py-0.5 text-[0.75rem] font-medium text-success-600">
          {t({ en: "Optimal", km: "ល្អបំផុត" })}
        </span>
        {POINTS.map((p, i) => (
          <span
            key={i}
            className="absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-danger-500 ring-4 ring-danger-500/15"
            style={{ left: `${10 + i * 40}%`, top: `${y(p.v)}%` }}
          />
        ))}
        <div className="absolute inset-x-3 bottom-1.5 flex justify-between text-[0.75rem] text-ink-400">
          {POINTS.map((p, i) => (
            <span key={i}>{t(p.m)}</span>
          ))}
        </div>
      </div>

      {/* Latest vs optimal */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-[var(--radius-md)] border border-[var(--hairline)] p-3.5">
          <p className="text-[0.75rem] uppercase tracking-wide text-ink-400">
            {t({ en: "Latest result", km: "លទ្ធផលចុងក្រោយ" })}
          </p>
          <p className="text-lg font-medium text-danger-600">23 ng/mL</p>
        </div>
        <div className="rounded-[var(--radius-md)] border border-[var(--hairline)] p-3.5">
          <p className="text-[0.75rem] uppercase tracking-wide text-ink-400">
            {t({ en: "Optimal range", km: "កម្រិតល្អបំផុត" })}
          </p>
          <p className="text-lg font-medium text-ink-900">45 to 80 ng/mL</p>
        </div>
      </div>

      {/* Plain-language insight */}
      <div className="flex flex-col gap-3 border-t border-[var(--hairline)] pt-5">
        {[
          {
            q: { en: "What is it?", km: "តើវាជាអ្វី?" },
            a: { en: "Vitamin D supports bones, mood and immunity.", km: "វីតាមីន D ជួយឆ្អឹង អារម្មណ៍ និងភាពស៊ាំ។" },
          },
          {
            q: { en: "Why it matters", km: "ហេតុអ្វីសំខាន់" },
            a: { en: "A low level is common and easy to correct.", km: "កម្រិតទាបកើតមានញឹកញាប់ ហើយងាយកែ។" },
          },
        ].map((row) => (
          <div key={row.q.en} className="flex flex-col gap-0.5">
            <p className="text-[0.8125rem] font-medium text-ink-800">{t(row.q)}</p>
            <p className="text-[0.8125rem] leading-relaxed text-ink-500">{t(row.a)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
