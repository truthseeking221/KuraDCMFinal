# Kura Patients

Next.js implementation of the Figma `Patients — home` screen using mock patient data and the exported Kura/Figma assets. Also hosts the Kura UI component kit and its living showcase.

## Run

```bash
npm run dev
```

- [http://127.0.0.1:3000](http://127.0.0.1:3000) — Patients dashboard
- [http://127.0.0.1:3000/ui-kit](http://127.0.0.1:3000/ui-kit) — Kura UI kit showcase (all components + foundations)

## Checks

```bash
npm run lint
npx tsc --noEmit
npm run build
```

## Structure

```
src/
  app/              Next.js App Router routes (/ and /ui-kit)
  components/       App-specific components (LabHistory, button, filter-primitives, pagination)
    ui/             Kura UI kit — 26 reusable components, built 1:1 from the "00 Kura Brand" Figma file
  icons/            Kura icon system (React components + raw Figma SVG exports)
  lib/              Shared utilities (cx classnames joiner)
  showcase/         /ui-kit demo app (section registry + per-component demos)
  styles/kura/      Kura design tokens (variables.css, typography.css; reset.css kept for isolated use)
```

Conventions:

- Kit components live in `src/components/ui/<Name>/` (PascalCase dir, `<Name>.tsx` + `<Name>.css` + `index.ts`), are exported from the `@/components/ui` barrel, and carry `"use client"`.
- Kit CSS uses the namespaced `--color-*` / `--space-*` / `--radius-*` tokens from `src/styles/kura/`, loaded globally in `app/layout.tsx`.
- `src/components/LabHistory` (app version wired to the dashboard) and `src/components/ui/LabHistory` (kit version with embedded demo data) are intentionally separate components.
