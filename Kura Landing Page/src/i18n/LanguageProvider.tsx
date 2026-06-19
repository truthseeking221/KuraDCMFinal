"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type Lang = "en" | "km";

/** A bilingual string. `km` is optional — falls back to `en`. */
export type Localized = { en: string; km?: string };

type LangContextValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  toggle: () => void;
  /** Resolve a bilingual pair to the active language. */
  t: (value: Localized) => string;
};

const LangContext = createContext<LangContextValue | null>(null);

const STORAGE_KEY = "kura.lang";

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // Always start at "en" so SSR markup matches first client render (no
  // hydration mismatch); restore the saved language right after mount.
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "km" || saved === "en") {
      const timer = window.setTimeout(() => setLangState(saved), 0);
      return () => window.clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore (private mode) */
    }
  }, []);

  const toggle = useCallback(() => {
    setLangState((prev) => {
      const next = prev === "en" ? "km" : "en";
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const value = useMemo<LangContextValue>(
    () => ({
      lang,
      setLang,
      toggle,
      t: (v) => (lang === "km" ? v.km ?? v.en : v.en),
    }),
    [lang, setLang, toggle],
  );

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang(): LangContextValue {
  const ctx = useContext(LangContext);
  if (!ctx) {
    throw new Error("useLang must be used within <LanguageProvider>");
  }
  return ctx;
}
