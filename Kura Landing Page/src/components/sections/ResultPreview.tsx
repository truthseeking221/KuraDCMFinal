"use client";

import { useLang } from "@/i18n/LanguageProvider";
import { Pill, RangeBar, SegmentBar, type RangeStatus } from "@/components/ui";
import { Logomark } from "@/components/brand/Logo";
import { cx } from "@/lib/cx";

type Row = {
  name: string;
  value: string;
  status: RangeStatus;
  pos: number;
  optimal: [number, number];
  cat: string;
};

const ROWS: Row[] = [
  { name: "HbA1c", value: "5.4%", status: "optimal", pos: 40, optimal: [30, 62], cat: "Metabolic" },
  { name: "LDL-C", value: "168 mg/dL", status: "out", pos: 88, optimal: [20, 55], cat: "Heart" },
  { name: "Vitamin D", value: "23 ng/mL", status: "out", pos: 16, optimal: [45, 80], cat: "Nutrition" },
  { name: "TSH", value: "2.1 mIU/L", status: "optimal", pos: 48, optimal: [32, 70], cat: "Thyroid" },
  { name: "Ferritin", value: "38 ng/mL", status: "borderline", pos: 30, optimal: [40, 78], cat: "Blood" },
];

const DOT: Record<RangeStatus, string> = {
  optimal: "bg-success-500",
  borderline: "bg-warn-500",
  out: "bg-danger-500",
};

const STATUS_LABEL: Record<RangeStatus, { en: string; km: string }> = {
  optimal: { en: "in range", km: "ក្នុងកម្រិត" },
  borderline: { en: "borderline", km: "ប្រុងប្រយ័ត្ន" },
  out: { en: "out of range", km: "ហួសកម្រិត" },
};

export function ResultPreview({
  className,
  floatBadges = true,
}: {
  className?: string;
  floatBadges?: boolean;
}) {
  const { t } = useLang();
  return (
    <div className={cx("relative", className)}>
      <div className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--hairline)] bg-white shadow-[var(--shadow-lg)]">
        {/* Window chrome */}
        <div className="flex items-center justify-between border-b border-[var(--hairline)] px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <Logomark className="h-4 w-auto" />
            <span className="text-[0.8125rem] font-medium text-ink-700">
              {t({ en: "Advance Check", km: "ការត្រួតពិនិត្យកម្រិតខ្ពស់" })}
            </span>
          </div>
          <span className="text-[0.75rem] text-ink-400">
            {t({ en: "Reviewed · 9 May", km: "ត្រួតពិនិត្យ · ៩ ឧសភា" })}
          </span>
        </div>

        <div className="flex flex-col gap-5 p-5">
          {/* Plain-language summary */}
          <p className="text-[0.875rem] leading-relaxed text-ink-600">
            {t({
              en: "Mostly in range. Two markers need attention: LDL and vitamin D.",
              km: "ភាគច្រើនស្ថិតក្នុងកម្រិត។ សញ្ញាពីរ — LDL និងវីតាមីន D — ត្រូវយកចិត្តទុកដាក់។",
            })}
          </p>

          {/* Roll-up */}
          <div className="flex flex-col gap-3 rounded-[var(--radius-md)] bg-ink-25 p-4">
            <div className="flex items-end justify-between">
              {[
                { n: "42", l: t({ en: "Total", km: "សរុប" }), c: "text-ink-900" },
                { n: "37", l: t({ en: "In range", km: "ក្នុងកម្រិត" }), c: "text-success-600" },
                { n: "3", l: t({ en: "Borderline", km: "ប្រុងប្រយ័ត្ន" }), c: "text-warn-600" },
                { n: "2", l: t({ en: "Out", km: "ហួសកម្រិត" }), c: "text-danger-600" },
              ].map((s) => (
                <div key={s.l} className="flex flex-col">
                  <span className={cx("text-xl font-medium tabular-nums", s.c)}>{s.n}</span>
                  <span className="text-[0.75rem] text-ink-500">{s.l}</span>
                </div>
              ))}
            </div>
            <SegmentBar optimal={37} borderline={3} out={2} />
          </div>

          {/* Rows */}
          <div className="flex flex-col">
            {ROWS.map((r, i) => (
              <div
                key={r.name}
                className={cx(
                  "grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 py-3",
                  i > 0 && "border-t border-[var(--hairline)]",
                )}
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-[0.75rem] uppercase tracking-wide text-ink-400">
                    {r.cat}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className={cx("size-1.5 rounded-full", DOT[r.status])} aria-hidden />
                    <span className="text-[0.9375rem] font-medium text-ink-900">{r.name}</span>
                    <span className="sr-only">{t(STATUS_LABEL[r.status])}</span>
                  </div>
                </div>
                <span className="row-start-2 text-right text-[0.9375rem] font-medium tabular-nums text-ink-700">
                  {r.value}
                </span>
                <div className="col-span-2 mt-1">
                  <RangeBar value={r.pos} optimal={r.optimal} status={r.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {floatBadges ? (
        <>
          <div className="absolute -left-4 top-1/3 hidden animate-[kura-fade-up_.6s_ease] rounded-pill border border-[var(--hairline)] bg-white px-3 py-2 shadow-[var(--shadow-md)] sm:flex">
            <Pill tone="info" icon="send">
              {t({ en: "Sent to Telegram", km: "ផ្ញើទៅ Telegram" })}
            </Pill>
          </div>
          <div className="absolute -right-3 bottom-8 hidden rounded-pill border border-[var(--hairline)] bg-white px-3 py-2 shadow-[var(--shadow-md)] sm:flex">
            <Pill tone="success" dot="success">
              {t({ en: "Clinician reviewed", km: "ត្រួតពិនិត្យដោយគ្រូពេទ្យ" })}
            </Pill>
          </div>
        </>
      ) : null}
    </div>
  );
}
