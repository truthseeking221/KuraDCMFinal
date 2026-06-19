"use client";

import { useState } from "react";
import Link from "next/link";
import { useLang } from "@/i18n/LanguageProvider";
import { SITE, FOOTER, LEGAL } from "@/data/site";
import { Logo } from "@/components/brand/Logo";
import { Icon, LangToggle } from "@/components/ui";

export function SiteFooter() {
  const { t } = useLang();
  const [sent, setSent] = useState(false);

  return (
    <footer className="bg-ink-950 text-white [--hairline:rgba(255,255,255,0.1)]">
      <div className="container-wide section-y !pb-10">
        <div className="grid gap-x-8 gap-y-12 lg:grid-cols-[1.4fr_2.6fr]">
          {/* Brand + newsletter */}
          <div className="flex max-w-sm flex-col gap-6">
            <Logo mono className="h-8 w-auto text-white" />
            <p className="text-[1.0625rem] leading-relaxed text-white/60">
              {t({
                en: "Diagnostics built for Cambodia. Order a test, give a sample, understand your results, anywhere.",
                km: "វេជ្ជសាស្ត្រវិនិច្ឆ័យសម្រាប់កម្ពុជា — បញ្ជាទិញ ផ្តល់សំណាក និងយល់ គ្រប់ទីកន្លែង។",
              })}
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setSent(true);
              }}
              className="flex flex-col gap-2"
            >
              <label className="text-[0.75rem] font-medium uppercase tracking-wider text-white/45">
                {t({ en: "Health notes worth reading, now and then", km: "ព័ត៌មានសុខភាព ម្តងម្កាល" })}
              </label>
              <div className="flex items-center gap-2 rounded-pill border border-white/15 bg-white/5 p-1 pl-4 focus-within:border-white/40">
                <input
                  type="email"
                  required
                  placeholder={t({ en: "you@email.com", km: "you@email.com" })}
                  className="min-w-0 flex-1 bg-transparent text-[0.9375rem] text-white placeholder:text-white/35 focus:outline-none"
                />
                <button
                  type="submit"
                  className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-500 text-white transition-colors hover:bg-brand-600"
                  aria-label="Subscribe"
                >
                  <Icon name={sent ? "check" : "arrow-right"} size={18} />
                </button>
              </div>
              {sent ? (
                <p className="text-[0.8125rem] text-success-200">
                  {t({ en: "You're on the list. Thank you.", km: "អរគុណ — អ្នកបានចុះឈ្មោះ។" })}
                </p>
              ) : null}
            </form>
          </div>

          {/* Link columns */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-4">
            {FOOTER.map((col) => (
              <div key={col.heading.en} className="flex flex-col gap-3">
                <p className="text-[0.75rem] font-medium uppercase tracking-wider text-white/45">
                  {t(col.heading)}
                </p>
                <ul className="flex flex-col gap-2.5">
                  {col.links.map((link) => (
                    <li key={link.href + t(link.label)}>
                      <Link
                        href={link.href}
                        className="text-[0.9375rem] text-white/70 transition-colors hover:text-white"
                      >
                        {t(link.label)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-6 border-t border-white/10 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[0.8125rem] text-white/45">
            <span>© {2026} {SITE.legalName}</span>
            {LEGAL.map((l) => (
              <Link key={l.href + t(l.label)} href={l.href} className="hover:text-white/80">
                {t(l.label)}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-4">
            <a href={`tel:${SITE.contact.phone.replace(/\s/g, "")}`} className="text-[0.8125rem] text-white/60 hover:text-white">
              {SITE.contact.phone}
            </a>
            <LangToggle tone="inverse" />
          </div>
        </div>
      </div>
    </footer>
  );
}
