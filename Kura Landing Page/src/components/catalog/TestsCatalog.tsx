"use client";

import { useMemo, useState } from "react";
import { useLang } from "@/i18n/LanguageProvider";
import { CATEGORIES, TESTS } from "@/data/catalog";
import { Container, Icon } from "@/components/ui";
import { TestCard } from "./TestCard";
import { cx } from "@/lib/cx";

export function TestsCatalog({
  initialCategory = "all",
  initialQuery = "",
}: {
  initialCategory?: string;
  initialQuery?: string;
}) {
  const { t } = useLang();
  const [category, setCategory] = useState(initialCategory);
  const [query, setQuery] = useState(initialQuery);
  const [fastingOnly, setFastingOnly] = useState(false);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return TESTS.filter((test) => {
      if (category !== "all" && test.category !== category) return false;
      if (fastingOnly && !test.fasting) return false;
      if (!q) return true;
      const hay = [
        test.name.en,
        test.name.km ?? "",
        test.short,
        test.category,
        ...test.analytes,
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [category, query, fastingOnly]);

  const chips = [
    { slug: "all", name: { en: "All", km: "ទាំងអស់" }, icon: "flask" as const },
    ...CATEGORIES.map((c) => ({ slug: c.slug, name: c.name, icon: c.icon })),
  ];

  return (
    <section className="section-y">
      <Container>
        {/* Controls */}
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex w-full items-center gap-2.5 rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-surface px-3.5 py-2.5 sm:max-w-sm focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-500/10">
              <Icon name="search" size={18} className="shrink-0 text-ink-400" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label={t({ en: "Search tests, panels and analytes", km: "ស្វែងរកតេស្ត ផ្គុំ និងតម្លៃ" })}
                placeholder={t({ en: "Search tests, panels, analytes…", km: "ស្វែងរកតេស្ត…" })}
                className="min-w-0 flex-1 bg-transparent text-[0.9375rem] text-ink-900 placeholder:text-ink-400 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-4">
              <label className="flex cursor-pointer select-none items-center gap-2 text-[0.875rem] text-ink-600">
                <input
                  type="checkbox"
                  checked={fastingOnly}
                  onChange={(e) => setFastingOnly(e.target.checked)}
                  className="size-4 accent-[var(--brand-500)]"
                />
                {t({ en: "Fasting only", km: "តមអាហារ" })}
              </label>
              <span className="whitespace-nowrap text-[0.875rem] font-medium text-ink-500">
                {results.length} {t({ en: "results", km: "លទ្ធផល" })}
              </span>
            </div>
          </div>

          <div className="-mx-[var(--gutter)] flex gap-2 overflow-x-auto px-[var(--gutter)] pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
            {chips.map((c) => (
              <button
                key={c.slug}
                type="button"
                onClick={() => setCategory(c.slug)}
                className={cx(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-pill border px-3.5 py-2 text-[0.8125rem] font-medium transition-colors",
                  category === c.slug
                    ? "border-brand-500 bg-brand-500 text-white"
                    : "border-[var(--hairline)] bg-surface text-ink-700 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700",
                )}
              >
                <Icon name={c.icon} size={14} className={category === c.slug ? "text-white" : "text-brand-500"} />
                {t(c.name)}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        {results.length > 0 ? (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((test) => (
              <TestCard key={test.slug} test={test} />
            ))}
          </div>
        ) : (
          <div className="mt-12 flex flex-col items-center gap-3 rounded-[var(--radius-lg)] border border-dashed border-[var(--border-strong)] py-16 text-center">
            <Icon name="search" size={28} className="text-ink-300" />
            <p className="text-[0.9375rem] text-ink-500">
              {t({ en: "No tests match your search.", km: "គ្មានតេស្តត្រូវនឹងការស្វែងរក។" })}
            </p>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setCategory("all");
                setFastingOnly(false);
              }}
              className="text-[0.875rem] font-medium text-brand-600 hover:text-brand-700"
            >
              {t({ en: "Clear filters", km: "សម្អាតតម្រង" })}
            </button>
          </div>
        )}
      </Container>
    </section>
  );
}
