"use client";

import { useLang } from "@/i18n/LanguageProvider";
import { Button } from "@/components/ui";

export default function NotFound() {
  const { t } = useLang();
  return (
    <section className="flex min-h-[70vh] items-center justify-center pt-[var(--header-h)]">
      <div className="container-narrow flex flex-col items-center gap-6 py-24 text-center">
        <p className="font-mono text-[0.875rem] font-medium tracking-widest text-brand-500">404</p>
        <h1 className="text-h1 font-medium text-balance text-ink-950">
          {t({ en: "We couldn't find that page", km: "យើងរកទំព័រនោះមិនឃើញ" })}
        </h1>
        <p className="max-w-md text-lead text-ink-600">
          {t({
            en: "The link may be out of date. Let's get you back to something useful.",
            km: "តំណនេះប្រហែលលែងប្រើ។ តោះនាំអ្នកត្រឡប់ទៅកន្លែងមានប្រយោជន៍វិញ។",
          })}
        </p>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row">
          <Button href="/" size="lg" iconRight="arrow-right">
            {t({ en: "Back to home", km: "ត្រឡប់ទៅទំព័រដើម" })}
          </Button>
          <Button href="/tests" size="lg" variant="outline">
            {t({ en: "Browse tests", km: "មើលតេស្ត" })}
          </Button>
        </div>
      </div>
    </section>
  );
}
