"use client";

import { useEffect, useCallback, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLang } from "@/i18n/LanguageProvider";
import { NAV } from "@/data/site";
import { Logo } from "@/components/brand/Logo";
import { Button, Icon, LangToggle } from "@/components/ui";
import { cx } from "@/lib/cx";

export function SiteHeader() {
  const { t } = useLang();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [mobile, setMobile] = useState(false);
  const closeNavigation = useCallback(() => {
    setMobile(false);
    setOpen(null);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobile ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobile]);

  return (
    <header
      className={cx(
        "fixed inset-x-0 top-0 z-50 transition-[background,box-shadow,border-color] duration-300",
        scrolled
          ? "border-b border-[var(--hairline)] bg-white/85 backdrop-blur-xl"
          : "border-b border-transparent bg-transparent",
      )}
    >
      <div className="container-wide flex h-[var(--header-h)] items-center justify-between gap-4">
        <Link href="/" aria-label="Go to Kura home" className="shrink-0">
          <Logo className="h-8 w-auto" />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 lg:flex">
          {NAV.map((group) => {
            const isOpen = open === group.label.en;
            if (!group.items) {
              return (
                <Link
                  key={group.label.en}
                  href={group.href ?? "#"}
                  onClick={closeNavigation}
                  className={cx(
                    "rounded-md px-3 py-2 text-[0.9375rem] font-medium text-ink-700 transition-colors hover:text-ink-950",
                    pathname === group.href && "text-ink-950",
                  )}
                >
                  {t(group.label)}
                </Link>
              );
            }
            return (
              <div
                key={group.label.en}
                className="relative"
                onMouseEnter={() => setOpen(group.label.en)}
                onMouseLeave={() => setOpen((v) => (v === group.label.en ? null : v))}
              >
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setOpen(isOpen ? null : group.label.en)}
                  className="flex items-center gap-1 rounded-md px-3 py-2 text-[0.9375rem] font-medium text-ink-700 transition-colors hover:text-ink-950"
                >
                  {t(group.label)}
                  <Icon
                    name="chevron-down"
                    size={15}
                    className={cx("transition-transform duration-200", isOpen && "rotate-180")}
                  />
                </button>
                <div
                  className={cx(
                    "absolute left-0 top-full w-[20rem] pt-2 transition-all duration-200",
                    isOpen
                      ? "pointer-events-auto translate-y-0 opacity-100"
                      : "pointer-events-none translate-y-1 opacity-0",
                  )}
                >
                  <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--hairline)] bg-white p-2 shadow-[var(--shadow-lg)]">
                    {group.items.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={closeNavigation}
                        className="group/item flex items-start gap-3 rounded-[var(--radius-md)] p-3 transition-colors hover:bg-ink-25"
                      >
                        <span className="flex flex-col gap-0.5">
                          <span className="text-[0.9375rem] font-medium text-ink-900">
                            {t(item.label)}
                          </span>
                          {item.desc ? (
                            <span className="text-[0.8125rem] leading-snug text-ink-500">
                              {t(item.desc)}
                            </span>
                          ) : null}
                        </span>
                        <Icon
                          name="arrow-right"
                          size={16}
                          className="ml-auto mt-1 shrink-0 text-ink-300 transition-all duration-200 group-hover/item:translate-x-0.5 group-hover/item:text-brand-500"
                        />
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </nav>

        {/* Desktop actions */}
        <div className="hidden items-center gap-2 lg:flex">
          <LangToggle />
          <Button href="/contact" variant="ghost" size="sm">
            {t({ en: "Log in", km: "ចូលគណនី" })}
          </Button>
          <Button href="/contact" variant="primary" size="sm" iconRight="arrow-right">
            {t({ en: "Get started", km: "ចាប់ផ្តើម" })}
          </Button>
        </div>

        {/* Mobile trigger */}
        <button
          type="button"
          className="grid size-10 place-items-center rounded-md text-ink-800 lg:hidden"
          aria-label="Menu"
          aria-expanded={mobile}
          onClick={() => setMobile((v) => !v)}
        >
          <Icon name={mobile ? "close" : "menu"} size={24} />
        </button>
      </div>

      {/* Mobile drawer */}
      <div
        inert={!mobile}
        aria-hidden={!mobile}
        className={cx(
          "fixed inset-x-0 top-[var(--header-h)] bottom-0 z-40 overflow-y-auto bg-white px-[var(--gutter)] pb-10 pt-4 transition-all duration-300 lg:hidden",
          mobile ? "translate-x-0 opacity-100" : "pointer-events-none translate-x-2 opacity-0",
        )}
      >
        <nav className="flex flex-col">
          {NAV.map((group) => (
            <div key={group.label.en} className="border-b border-[var(--hairline)] py-2">
              {group.href && !group.items ? (
                <Link
                  href={group.href}
                  onClick={closeNavigation}
                  className="block py-3 text-lg font-medium text-ink-900"
                >
                  {t(group.label)}
                </Link>
              ) : (
                <>
                  <p className="py-3 text-[0.75rem] font-medium uppercase tracking-wider text-ink-400">
                    {t(group.label)}
                  </p>
                  <div className="flex flex-col pb-1">
                    {group.items?.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={closeNavigation}
                        className="flex items-center justify-between py-2.5 text-[1.0625rem] font-medium text-ink-700"
                      >
                        {t(item.label)}
                        <Icon name="chevron-right" size={18} className="text-ink-300" />
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </div>
          ))}
        </nav>
        <div className="mt-6 flex flex-col gap-3">
          <Button href="/contact" variant="outline" size="lg" full>
            {t({ en: "Log in", km: "ចូលគណនី" })}
          </Button>
          <Button href="/contact" variant="primary" size="lg" full iconRight="arrow-right">
            {t({ en: "Get started", km: "ចាប់ផ្តើម" })}
          </Button>
          <div className="mt-2 flex justify-center">
            <LangToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
