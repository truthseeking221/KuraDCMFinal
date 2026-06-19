import type { Metadata } from "next";
import { Kantumruy_Pro, Geist_Mono } from "next/font/google";
import { LanguageProvider } from "@/i18n/LanguageProvider";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import "./globals.css";

const kantumruy = Kantumruy_Pro({
  variable: "--font-kantumruy",
  subsets: ["khmer", "latin"],
  weight: ["300", "400", "500"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://kura.med"),
  title: {
    default: "Kura: Cambodia's diagnostics operating system",
    template: "%s · Kura",
  },
  description:
    "Doctors order lab tests, patients get sampled nearby or at home, and clinician-reviewed results arrive in plain Khmer and English, usually within 24 hours.",
  keywords: [
    "Cambodia diagnostics",
    "lab tests Phnom Penh",
    "blood test Cambodia",
    "health checkup",
    "Kura",
  ],
  openGraph: {
    title: "Kura: Cambodia's diagnostics operating system",
    description:
      "Order labs, get sampled nearby or at home, and understand your results. Built for Cambodia's doctors, patients and businesses.",
    type: "website",
    locale: "en_US",
    siteName: "Kura",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${kantumruy.variable} ${geistMono.variable} antialiased`}
    >
      <body>
        {/* If JS is unavailable, never leave scroll-reveal content hidden. */}
        <noscript>
          <style>{`.reveal{opacity:1 !important;transform:none !important}`}</style>
        </noscript>
        <LanguageProvider>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-ink-900 focus:px-4 focus:py-2 focus:text-white"
          >
            Skip to content
          </a>
          <SiteHeader />
          <main id="main">{children}</main>
          <SiteFooter />
        </LanguageProvider>
      </body>
    </html>
  );
}
