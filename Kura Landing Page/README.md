# Kura — Landing Site

Premium, bilingual (English default · Khmer) marketing site for Kura, Cambodia's
diagnostics operating system. Standalone **Next.js 16** App Router app, separate
from the `kura-patients` product app.

## Run

```bash
npm install
npm run dev      # http://localhost:3000
```

```bash
npm run build    # production build (static + SSG)
npm run lint
npx tsc --noEmit
```

## Design

- **Aesthetic** — Function Health's editorial structure (oversized headlines, one
  idea per band, progressive trust-stacking, whitespace as luxury, hairlines not
  boxes) rendered in **Kura's cool ink + brand-blue palette**. Data-visualisation
  (range tracks, panel roll-ups, shaded optimal bands — à la Superpower) is the
  imagery; no stock photography.
- **Tokens** — ported from the product (`globals.css`): ink neutral ramp, brand
  blue `#268cff`, semantic green/amber/pink for result status. Editorial display
  type scale + motion curves added for marketing. Font: Kantumruy Pro (Latin +
  Khmer, so the bilingual requirement is native to the brand font).
- **Motion** — scroll-reveal, count-up stats, pausable logo marquee, accordion
  height, hover lifts. Honors `prefers-reduced-motion`. CSS-driven, zero motion deps.

## i18n

Co-located bilingual strings via `t({ en, km })` (see `src/i18n/LanguageProvider`).
EN is the SSR default (SEO); the header/footer language toggle switches to Khmer
client-side and persists to `localStorage`. No locale routing.

## Structure

```
src/
  app/                Routes (App Router). Pages are server components exporting
                      metadata; interactive sections are "use client".
  components/
    brand/            Kura logo + mark (1:1 with product asset)
    ui/               Design-kit primitives (Button, Section, Stat, RangeBar, …)
    site/             SiteHeader, SiteFooter, CTASection
    sections/         Reusable marketing sections (Hero, FeatureGrid, CoverageMap…)
    catalog/          TestCard, PackageCard, TestsCatalog, Test/Package detail
  data/               Bilingual content: site, catalog, network, faqs, team, …
  i18n/               LanguageProvider + Localized type
  lib/                cx() classnames helper
```

## Routes

Home · For Doctors · For Patients · For Business · Tests (+ detail) · Packages
(+ detail) · Pricing · Network · How it works · Results · About · FAQ · Contact ·
Blog · Privacy · Terms.
