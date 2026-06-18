---
name: Kura Design System
type: magicpath-design-system
version: 2026-06-16
defaultTheme: light
fontFamily: Kantumruy Pro
source:
  - src/styles/kura/variables.css
  - src/styles/kura/typography.css
  - src/components/ui
  - src/showcase
---

# Kura Design System

Use this file as the complete Kura theme and component brief when generating or adapting UI in MagicPath.

Kura is a healthcare operating system for doctor workspaces, patient records, lab workflows, field collection, receptionist operations, and patient self-service. The interface must feel calm, clinically credible, fast to scan, and safe for repeated operational use. It is not a marketing site, a decorative SaaS dashboard, or a generic admin template.

## MagicPath Theme Prompt

Build Kura UI as a calm healthcare operating system. Prioritize clarity, clinical safety, patient and staff trust, accessibility, and reduced cognitive load. Use dense but quiet layouts for staff workflows, with clear patient identity anchors, progressive disclosure, one obvious primary action, and semantic status language.

Use the Kura token system exactly. Prefer white and near-white surfaces, ink neutrals, brand blue for primary actions and focus, and semantic green/amber/red/cyan only for meaningful state. Never rely on color alone. Pair status color with labels, icons, or text.

Avoid generic SaaS clutter: no oversized marketing heroes, no decorative orb/blob backgrounds, no unnecessary pills, no loud dashboards, no card-inside-card layouts, no device mockups unless explicitly requested. Cards should be soft but precise; page sections should be unframed layouts or full-width bands.

Every generated component must be responsive, accessible, and interactive. Include hover, focus-visible, active, disabled, loading, empty, error, warning, offline/syncing, and permission or read-only states when the workflow requires them. Do not leave placeholder click handlers. Critical healthcare actions need prevention, preview, confirmation only when meaningful, recovery copy, and audit/context cues.

## Product Principles

- Clarity beats visual novelty.
- Safety and trust beat speed when there is clinical, identity, payment, specimen, or privacy risk.
- Speed matters when the action is reversible and routine.
- The header is a context anchor, not an action launcher.
- The right rail is for situational awareness and next actions, not a second page.
- Filters are lenses, not destructive deletion.
- Missing clinical data is never normal, zero, or silently ignored.
- Patient-facing screens should be reassuring and plain-language.
- Staff screens can be denser, but must still be scannable in seconds.
- Use progressive disclosure for secondary actions.
- One primary action per task cluster; secondary actions must not compete.

## Source Of Truth

- Token entry: `src/styles/kura/index.css`
- Color, radius, spacing, elevation: `src/styles/kura/variables.css`
- Typography utilities: `src/styles/kura/typography.css`
- UI kit barrel: `src/components/ui/index.ts`
- Living showcase: `src/showcase/registry.tsx`
- App shell/global aliases: `src/app/globals.css`
- Icon system: `src/icons/components` and `src/icons/raw`

## CSS Token Contract

Use these CSS custom properties instead of hardcoded colors, spacing, radius, font sizes, or shadows.

```css
:root {
  /* Brand */
  --color-brand-25: #eef7ff;
  --color-brand-50: #e9f3ff;
  --color-brand-100: #d4e8ff;
  --color-brand-500: #268cff;
  --color-brand-600: #1e70cc;
  --color-brand-700: #175499;
  --color-brand-800: #0f3866;

  /* Secondary */
  --color-secondary-deep-500: #10069f;

  /* Ink */
  --color-ink-0: #ffffff;
  --color-ink-25: #f8f9fc;
  --color-ink-50: #f6f7fa;
  --color-ink-100: #eef0f5;
  --color-ink-150: #e3e6ee;
  --color-ink-200: #d6dae5;
  --color-ink-400: #8d94a8;
  --color-ink-500: #6b7388;
  --color-ink-600: #475066;
  --color-ink-700: #2a3447;
  --color-ink-900: #0b1424;

  /* Success */
  --color-success-25: #edf9f3;
  --color-success-50: #e7f8ee;
  --color-success-100: #c7eed7;
  --color-success-200: #9ee4b9;
  --color-success-500: #1aa163;
  --color-success-600: #128a52;

  /* Warning */
  --color-warn-25: #fff9ea;
  --color-warn-50: #fff8e6;
  --color-warn-100: #fdecc4;
  --color-warn-200: #fbdb91;
  --color-warn-500: #d97706;
  --color-warn-600: #8a5600;

  /* Danger */
  --color-danger-25: #fff1f1;
  --color-danger-50: #fdecec;
  --color-danger-100: #fbd1d1;
  --color-danger-200: #f7a8a8;
  --color-danger-500: #d83a3a;
  --color-danger-600: #b22929;
  --color-danger-700: #891f1f;

  /* Info */
  --color-info-100: #c3eef7;
  --color-info-500: #0e7490;
  --color-info-600: #0a5a72;

  /* Text */
  --color-text-primary: #1a2335;
  --color-text-secondary: #475066;
  --color-text-tertiary: #6b7388;
  --color-text-disabled: #b3b9c9;
  --color-text-inverse: #ffffff;
  --color-text-on-brand: #ffffff;
  --color-text-brand: #268cff;
  --color-text-link: #175499;

  /* Surface */
  --color-surface: #ffffff;
  --color-surface-2: #fafbfd;
  --color-surface-sunken: #eef0f5;
  --color-surface-bg: #f6f7fa;

  /* Border */
  --color-border: #e6e9f1;
  --color-border-strong: #d6dae5;
  --color-border-emphasis: #b3b9c9;
  --color-border-focus: #268cff;

  /* Semantic status */
  --color-status-success-fg: #128a52;
  --color-status-success-bg: #e7f8ee;
  --color-status-warning-fg: #8a5600;
  --color-status-warning-bg: #fff8e6;
  --color-status-low-fg: #c5651c;
  --color-status-danger-fg: #b22929;
  --color-status-danger-bg: #fdecec;
  --color-status-neutral-fg: #475066;
  --color-status-neutral-bg: #eef0f5;
  --color-status-info-fg: #0e7490;
  --color-status-info-bg: #e6f9fd;
  --color-status-ai-fg: #6a35c0;
  --color-status-ai-bg: #f1ecfb;

  /* Badge roles */
  --color-badge-neutral-bg: #f8f9fc;
  --color-badge-neutral-fg: #2a3447;
  --color-badge-neutral-border: #e3e6ee;
  --color-badge-neutral-icon: #6b7388;
  --color-badge-warning-bg: #fff9ea;
  --color-badge-warning-fg: #6a4200;
  --color-badge-warning-icon: #d97706;

  /* Focus */
  --color-focus-ring: rgba(38, 140, 255, 0.32);

  /* Space */
  --space-0: 0;
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;

  /* Radius */
  --radius-sm: 6px;
  --radius-base: 8px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-pill: 999px;

  /* Shadow */
  --shadow-sm: 0 3px 1px -1px rgba(11, 20, 36, 0.07);
  --shadow-200:
    0 3px 1px -1px rgba(26, 26, 26, 0.07),
    inset 0 1px 0 0 rgba(204, 204, 204, 0.5),
    inset 0 -1px 0 0 rgba(0, 0, 0, 0.17),
    inset -1px 0 0 0 rgba(0, 0, 0, 0.13),
    inset 1px 0 0 0 rgba(0, 0, 0, 0.13);
  --shadow-button-raised:
    0 1px 2px 0 rgba(11, 20, 36, 0.05),
    0 1px 0 0 rgba(11, 20, 36, 0.04),
    inset 0 -1px 0 0 #d6dae5;
  --shadow-button-pressed:
    inset 0 2px 3px 0 rgba(11, 20, 36, 0.1),
    inset 0 1px 1px 0 rgba(11, 20, 36, 0.06);
  --shadow-button-pressed-filled:
    inset 0 1.5px 1px 0 rgba(0, 0, 0, 0.22),
    inset 0 0 2px 0 rgba(0, 0, 0, 0.12);
  --shadow-focus-ring: 0 0 0 2px #ffffff, 0 0 0 4px var(--color-border-focus);
}
```

## App Alias Tokens

Some existing app screens use shorter aliases. When adapting older Kura screens, map these to the design tokens above.

```css
:root {
  --ink-0: var(--color-ink-0);
  --ink-25: var(--color-ink-25);
  --ink-100: var(--color-ink-100);
  --ink-150: var(--color-ink-150);
  --ink-400: var(--color-ink-400);
  --ink-500: var(--color-ink-500);
  --ink-600: var(--color-ink-600);
  --ink-700: var(--color-ink-700);
  --ink-900: var(--color-ink-900);
  --brand-25: var(--color-brand-25);
  --brand-50: var(--color-brand-50);
  --brand-500: var(--color-brand-500);
  --brand-700: var(--color-brand-700);
  --surface: var(--color-surface);
  --surface-2: var(--color-surface-2);
  --surface-sunken: var(--color-surface-sunken);
  --border: var(--color-border);
  --border-strong: var(--color-border-strong);
  --text-primary: var(--color-text-primary);
  --text-secondary: var(--color-text-secondary);
  --text-tertiary: var(--color-text-tertiary);
  --text-muted: var(--color-ink-400);
  --text-on-brand: var(--color-text-on-brand);
  --badge-neutral-bg: var(--color-badge-neutral-bg);
  --badge-neutral-fg: var(--color-badge-neutral-fg);
  --badge-warning-bg: var(--color-badge-warning-bg);
  --badge-warning-fg: var(--color-badge-warning-fg);
  --status-neutral-bg: var(--color-status-neutral-bg);
  --status-neutral-fg: var(--color-status-neutral-fg);
  --status-success-bg: var(--color-status-success-bg);
  --status-success-fg: var(--color-status-success-fg);
  --status-warning-bg: var(--color-status-warning-bg);
  --status-warning-fg: var(--color-status-warning-fg);
  --status-danger-bg: var(--color-status-danger-bg);
  --status-danger-fg: var(--color-status-danger-fg);
  --status-info-bg: var(--color-status-info-bg);
  --status-info-fg: var(--color-status-info-fg);
  --radius-card: var(--radius-lg);
  --shadow-popover: 0 8px 12px rgba(26, 31, 46, 0.12);
}
```

## Typography

Use `Kantumruy Pro` as the primary typeface. Fallbacks: `-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `Roboto`, `Helvetica`, `Arial`, `sans-serif`.

```css
:root {
  --font-family-base: "Kantumruy Pro", -apple-system, BlinkMacSystemFont,
    "Segoe UI", Roboto, Helvetica, Arial, sans-serif;

  --font-size-10: 10px;
  --font-size-11: 11px;
  --font-size-12: 12px;
  --font-size-13: 13px;
  --font-size-14: 14px;
  --font-size-15: 15px;
  --font-size-16: 16px;
  --font-size-18: 18px;
  --font-size-20: 20px;
  --font-size-24: 24px;
  --font-size-32: 32px;

  --font-weight-regular: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;
}
```

Text styles:

| Style | Use |
| --- | --- |
| `.text-32-bold` | Rare page title or large identity anchor |
| `.text-24-semibold` | Major section title |
| `.text-20-semibold` | Page-level compact heading |
| `.text-18-semibold` | Card or drawer title |
| `.text-16-semibold` | Section title |
| `.text-15-semibold` | Compact title |
| `.text-14-regular`, `.text-14-medium`, `.text-14-semibold` | Default body, form labels, table cells |
| `.text-13-regular`, `.text-13-medium`, `.text-13-semibold` | Helper text, metadata, compact controls |
| `.text-12-regular`, `.text-12-medium`, `.text-12-semibold` | Badges, table headers, captions |
| `.text-11-medium`, `.text-11-semibold` | Nav labels, small counters |
| `.text-10-medium`, `.text-10-semibold` | Sidebar rail labels |

Guidance:

- Default body: 14px / 1.45.
- Operational metadata: 12px or 13px, never decorative.
- Use tabular numeric style for lab values, counters, monetary values, and compact numeric comparisons.
- Do not use oversized display type inside dashboards, panels, cards, sidebars, or dense tools.
- Keep letter spacing at 0 for generated MagicPath components unless reproducing the exact existing display text utility.

## Layout And Density

- Base spacing is a 4px scale.
- Common gaps: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64.
- Staff workflows should be dense but organized; prefer compact rows, clear columns, and predictable rhythm.
- Do not nest cards inside cards.
- Do not style every page section as a floating card.
- Use cards only for repeated items, modal/dialog surfaces, framed tools, or true contained summaries.
- For desktop operational surfaces, reserve left navigation width around 72px and header height around 52px.
- For drawers and contextual panels, default width is 440px unless content requires otherwise.
- Use responsive constraints: `width: 100%`, `max-width`, stable grid tracks, and stable fixed dimensions for toolbars, boards, icon buttons, counters, tiles, and table controls.

## Color Semantics

| Tone | Meaning | Foreground | Background |
| --- | --- | --- | --- |
| neutral | Normal, inactive, unknown, no-reference | `--color-status-neutral-fg` | `--color-status-neutral-bg` |
| info | Informational state | `--color-status-info-fg` | `--color-status-info-bg` |
| success | Completed, verified, in range, stable | `--color-status-success-fg` | `--color-status-success-bg` |
| warning | Pending, needs review, below/above reference, recoverable issue | `--color-status-warning-fg` | `--color-status-warning-bg` |
| danger | Critical, destructive, blocked, privacy/safety/payment failure | `--color-status-danger-fg` | `--color-status-danger-bg` |
| ai | AI-assisted suggestion or generated insight | `--color-status-ai-fg` | `--color-status-ai-bg` |
| brand | Primary action, selected nav, active focus | `--color-brand-500` | `--color-brand-50` |

Rules:

- Red is reserved for destructive or truly critical states.
- Amber carries review, abnormal-but-not-critical, pending, repeat due, and warning.
- Green means confirmed success, in-range, or completed. Do not use green as generic decoration.
- Grey means neutral, no structured reference, missing, disabled, or secondary metadata.
- Blue means primary action, active context, link, focus, or Kura brand.
- Purple/AI is only for AI-assisted functionality, never generic decoration.

## Component Inventory

The Kura UI kit exports these components:

- `ActionList`
- `Avatar`
- `Badge`
- `Banner`
- `Breadcrumb`
- `Button`
- `ButtonGroup`
- `Calendar`
- `CalloutCard`
- `Card`
- `CardSection`
- `Checkbox`
- `Chip`
- `ChoiceList`
- `Counter`
- `Drawer`
- `FilterButton`
- `FilterPanel`
- `FilterSection`
- `Header`
- `HeaderSearch`
- `HeaderIconButton`
- `IconButton`
- `Input`
- `LabHistory`
- `Pagination`
- `Search`
- `SearchInput`
- `SegmentedToggle`
- `Sidebar`
- `Table`
- `Tabs`
- `Tooltip`

## Components

### Button

Use for explicit commands. Keep labels verb-first and outcome-specific.

Variants:

- Intent: `primary`, `secondary`, `outline`, `ghost`, `destructive`
- Size: `sm` 32px, `md` 36px, `lg` 44px
- Optional: `leadingIcon`, `trailingIcon`, `disclosure`, `loading`, `fullWidth`

Behavior:

- `loading` sets `aria-busy` and disables interaction.
- Focus ring uses `--shadow-focus-ring`.
- Primary uses brand blue.
- Secondary is raised white.
- Outline is transparent with border.
- Ghost is quiet and should not compete with primary actions.
- Destructive uses danger red and must be reserved for real destructive outcomes.

### IconButton

Use when the action is a familiar symbol or space is constrained.

Variants:

- Variant: `default`, `primary`, `tertiary`
- Tone: `default`, `critical`, `success`
- Size: `micro`, `default`, `large`

Rules:

- Always include `aria-label`.
- Use tooltips for unfamiliar icons.
- Use `primary` only when the icon button is the main action in a compact surface.
- Use `critical` only for destructive or critical actions.

### Badge

Use for status, classification, or low-interaction labels.

Variants:

- Tone: `neutral`, `info`, `success`, `warning`, `danger`, `ai`, `brand`
- Appearance: `subtle`, `strong`
- Size: `medium` 20px, `large` 24px
- Optional leading `dot` or `icon`

Rules:

- Pair tone with specific text: `Stable`, `Review`, `Payment pending`, `Sample collected`, `Repeat due`.
- Do not use vague badge text like `OK`, `New`, or `Active` unless the operational meaning is clear.

### Chip

Use for quick filters and applied filters.

Variants:

- `choice`: toggle chip with `aria-pressed`; optional `count`.
- `removable`: applied filter with close control and `onRemove`.

Rules:

- Choice chips are for reversible filters.
- Removable chips represent current filter state.
- Never use chips as a replacement for primary actions.

### Counter

Use for compact counts in tabs, nav, chips, filters, and badges.

Tones:

- `neutral`
- `brand`
- `success`
- `danger`

Formatting:

- `99+` above max by default.
- `1.2k` for thousands.
- Use tabular numerals.

### Avatar

Use for clinicians, patients, users, and assignees.

Variants:

- Tone: `neutral`, `brand`, `info`, `success`, `warning`, `danger`
- Size: `xs` 20px, `sm` 28px, `md` 36px, `lg` 44px, `xl` 56px
- Content: image, initials, or person icon
- Status: `none`, `online`, `away`, `busy`

Rules:

- Avatar shape is a squircle tile, not a circle.
- Tone can be hashed from name when not explicitly set.
- Include accessible name when it represents a person.

### Tooltip

Use for secondary clarification on hover/focus.

Placements:

- `top`
- `bottom`
- `left`
- `right`

Rules:

- Tooltips must not contain critical instructions, errors, or required workflow content.
- Use for icon button labels, brief clarifications, or metadata.

### Checkbox

Use for binary or multi-select choices.

States:

- unchecked
- checked
- indeterminate
- disabled
- error
- focus
- hover

Variants:

- Tone: `default`, `ai`
- Optional label, help text, error text

Rules:

- Use clear labels with a help line when the consequence is not obvious.
- Error state must include a specific recovery message.

### ChoiceList

Use for grouped selections.

Modes:

- Single-select radio list.
- Multi-select checkbox list.

Rules:

- Include a fieldset title when the choices are not self-evident.
- Options may include help text and disabled state.
- Use error message below the group.

### SegmentedToggle

Use for compact mutually exclusive modes.

Rules:

- Two or three segments work best.
- Active segment lifts to a white pill on a sunken track.
- Use for modes such as `Match any` / `Match all`, `Day` / `Week` / `Month`.

### Banner

Use for important inline notices and persistent states.

Tones:

- `info`
- `success`
- `warning`
- `danger`
- `ai`

Structure:

- Tone icon
- Title
- Message
- Optional footer actions
- Optional dismiss

Rules:

- Banners should explain the state and the next step.
- For danger banners, include recovery or support action.
- Do not use banners for decorative announcements.

### Card

Use for contained summaries, repeated items, or framed tool surfaces.

Structure:

- Optional header title
- Optional header actions
- Body with optional padding
- Optional divided `CardSection`

Rules:

- Card radius is `--radius-lg`.
- Use `padded=false` for flush tables/media.
- Do not place cards inside cards.
- Keep card actions quiet unless the card is the main task surface.

### CalloutCard

Use for a single promotional or setup prompt inside product surfaces.

Structure:

- Title
- Supporting body
- Optional primary action
- Optional illustration
- Optional dismiss

Rules:

- Use sparingly.
- Keep illustration useful and small.
- Do not use as general page layout.

### Drawer

Use as a right-hand contextual workflow panel.

Defaults:

- Width: 440px
- Modal dialog
- Overlay click closes
- Escape closes
- Focus moves into dialog
- Optional subtitle and pinned footer

Rules:

- Use for clinical actions without leaving the patient record.
- Footer contains primary and secondary actions.
- Include clear save/submit state and recovery for failures.

### Input

Use for single-line form entry.

Structure:

- Label
- Required marker
- Input shell
- Optional leading icon
- Optional trailing node
- Help or error text

States:

- rest
- hover
- focus
- error
- disabled
- read-only

Rules:

- Required fields must be marked.
- Error copy must say what to fix.
- Read-only values should still be legible and selectable when useful.

### Search

Use for in-page search, global search trigger, and command-palette entry.

Variants:

- Density: `default` 36px, `compact` 28px, `large` 44px
- Surface: `light`, `dark`
- Mode: input or `asTrigger`
- Optional `kbd`, `onClear`, `trailingAction`

Rules:

- Use `asTrigger` for command palette launchers.
- Search placeholders should name searchable fields: `Search patient - name, phone, ID`.
- Show clear button when a value exists.
- Use compact search inside filters or dense rows.

### SearchInput

Existing shared list-header control for Patients and Bookings.

Rules:

- It is a button that opens global command search, not an inline filter.
- Default placeholder: `Search Name, Khmer Name, MRN, Phone...`
- Shows keyboard hint `Cmd K`.

### Tabs

Use for peer sections within a view.

Variants:

- Size: `md`, `sm`
- Fit: `hug`, `fill`
- Optional icon, count, disabled

Rules:

- Active tab uses brand label and 2px brand underline.
- Use counts only when they help scanning.
- Disabled tabs must explain unavailable state elsewhere if clinically relevant.

### ButtonGroup

Use to group related actions.

Variants:

- `segmented=true`: connected controls with shared borders.
- `segmented=false`: spaced action group.

Rules:

- Do not use button groups as navigation when tabs are clearer.

### Breadcrumb

Use for path navigation.

Rules:

- Last item is current page.
- Use chevron separators.
- Keep labels short.

### ActionList

Use for menu surfaces.

Structure:

- Optional sections
- Optional section titles
- Items with label, icon, disabled, destructive

Rules:

- Use `role=menu` and `role=menuitem`.
- Destructive action should be visually distinct and placed carefully.
- Group high-risk actions away from routine actions.

### Table

Use for dense operational lists.

Features:

- Sortable headers
- Select all and row selection
- Indeterminate selection
- Custom cell renderers
- Row click
- Loading skeleton
- Empty state
- Footer
- Density: `comfortable`, `compact`

Rules:

- Keep table headers short and concrete.
- Align numeric columns right.
- Use avatars and badges only where they improve scanning.
- Loading state should preserve approximate row geometry.
- Empty state should include recovery when possible.

### Calendar

Use for date and range picking.

Modes:

- `single`
- `range`

States:

- today
- selected
- range start
- range end
- in range
- outside month
- disabled by min/max

Rules:

- Use 42-cell month grid.
- Keep navigation controls accessible.
- Use exact dates in critical scheduling or specimen workflows.

### Sidebar

Use for collapsed app navigation rail.

Specs:

- Width: 72px
- Item: 56px x 56px in app shell or compact Kura UI rail item style
- Icon size: 24px
- Label size: 10px
- Active state: brand-25 background with brand text
- Logo pinned top
- Settings/account pinned bottom

Rules:

- Default icons use stroke; active icons use filled or bulk style when available.
- The active item must set `aria-current=page`.

### Header

Use for dark brand app bar.

Specs:

- Height: 52px
- Background: `--color-brand-800`
- Left: logo
- Center: translucent search
- Right: icon actions

Rules:

- Header search is global context search.
- Header actions should be icon buttons with labels.
- Do not overload the header with page-specific actions.

### Filter Primitives

Use for list/table filtering.

Components:

- `FilterButton`: trigger with icon, label, count, active/open state.
- `FilterPanel`: popover with title, reset, optional search, body, footer.
- `FilterSection`: titled section inside panel.

Rules:

- Show active count only when count > 0.
- Panel footer usually contains match toggle and apply button.
- Reset must be visible when filters can be cleared.
- Filters narrow the view; they do not delete or mutate records.

### Pagination

Use for table/list footers.

Features:

- Summary: `Showing 17-24 of 124 patients`
- Prev/Next buttons
- Current page
- Ellipsis for long ranges
- Optional controls-only mode

Rules:

- Hide pagination when all results fit on one page.
- Keep item noun specific: `patients`, `orders`, `results`.

### LabHistory

Use for DCM patient lab history and lab reasoning surfaces.

Core model:

- Two-pane layout: navigator plus content pane.
- Navigator covers views, signals, systems, and draws.
- Signal sections are built from clinical system cards.
- Each row includes severity bar, latest value, reference, sparkline, trend vs previous draw, and follow-up action.
- Hover or focus previews a row.
- Click or Enter pins the detail card.
- Escape closes detail.
- Older draw selection re-anchors every signal to what was known at that draw.

Clinical grouping:

- `out`: latest result outside reference.
- `watch`: abnormal finding or repeat due.
- `resolved`: prior abnormal now in range/cleared.
- `stale`: missing in current draw, single result, or not repeated.
- `noref`: no machine-readable reference.
- `ok`: in range or unremarkable.

Severity:

- `normal`: In range, green.
- `low`: Below reference, amber/yellow.
- `high`: Above reference, orange.
- `crit_high`: Markedly above reference, red.
- `crit_low`: Markedly below reference, red.
- `qnorm`: Unremarkable qualitative result, green.
- `qpos`: Qualitative finding, orange.
- `none`: No reference, neutral.
- `missing`: No structured result, grey.

Clinical domains:

- Kidney function
- Diabetes
- Anemia
- Mineral bone
- Urine
- Inflammation
- Liver
- Lipids
- Thyroid
- Other

Rules:

- Missing cells are explicit gaps, never zero or normal.
- Search runs across every draw, not only the current draw.
- Counts stay global when filters are applied.
- Red is reserved for marked/critical readings.
- Above/below reference and repeat due should read as warning unless critical.
- Repeat-due copy should lead with clinical position and gap, for example `Above range - no repeat since Jan 15`.
- Follow-up, repeat, and remove actions live in the card footer.

## Icon System

Use Kura icons from `src/icons`. Icons inherit `currentColor` and support size props. Prefer stroke icons in default/rest states and filled/bulk icons for active nav states when available.

Compiled icon names:

`ArrowDown`, `ArrowDownLeft`, `ArrowDownRight`, `ArrowLeft`, `ArrowRight`, `ArrowUp`, `ArrowUpLeft`, `ArrowUpRight`, `Bell`, `BloodDrop`, `Booking`, `Calendar`, `Cart`, `Cash`, `Catalog`, `Check`, `CheckCircle`, `CheckShield`, `CheckwCircle`, `CheckwCircle2`, `ChevronDown`, `ChevronLeft`, `ChevronRight`, `ChevronUp`, `Clock`, `Close`, `Collapse1`, `Collapsed`, `Collapsed2`, `Corporate`, `CreditCard`, `Delete`, `Edit`, `Expand1`, `Expand2`, `Filter`, `Flask`, `Heart`, `Home`, `Hormone`, `IDCard`, `Info`, `Kidney`, `Lock`, `Male`, `MedicalMask`, `Minus`, `More`, `Note`, `Patient`, `Pill`, `Pin`, `Plus`, `Receipt`, `Refresh`, `Scan`, `Search`, `Setting`, `Share`, `SortDescending`, `TeleConsultation`, `Tube`, `Upload`, `User`, `Warning`.

Aliases and manual icons:

- `X` aliases `Close`.
- `Trash` aliases `Delete`.
- `MoreHorizontal` aliases `More`.
- `AlertTriangle` aliases `Warning`.
- `Settings` aliases `Setting`.
- Manual: `AlertCircle`, `Sparkles`, `Star`, `Users`, `Book`, `Download`.
- Brand: `KuraLogo`, `KuraLogomark`.

Raw icon variants in the Figma export include size 16, 20, 24, 28, 32 and styles such as stroke, duotone, twotone, solid, and bulk where available.

## Healthcare UI States

For critical healthcare screens and generated components, cover the relevant states:

- Default
- Loading
- Empty
- Partial data
- Success
- Warning
- Error
- Offline
- Syncing
- Disabled with reason
- Permission denied
- Expired
- Conflict
- Read-only
- History or audit trail when appropriate

Critical surfaces include patient identity, appointment accuracy, lab orders/results, specimen handling, medication decisions, diagnoses, referrals, payment/insurance, privacy, claims readiness, and audit trails.

## Product Surface Guidance

### DCM Doctor Workspace

The patient detail view is a treatment workspace, not just a record viewer.

Prioritize:

- Patient identity and safety context.
- Active problems.
- Vitals.
- Lab trends.
- Medications.
- Allergies.
- Encounter timeline.
- Notes.
- Diagnosis capture.
- Lab ordering.
- Prescribing.
- Referrals.
- Follow-up scheduling.
- Patient-specific care plan.
- Claims readiness.

Design around clinical reasoning and next best action.

### Care Plan

Global care plans are templates/program libraries. Patient-detail care plans are patient-specific instances.

They should answer:

- What are we trying to improve for this patient?
- What needs to happen next?
- Who owns it?
- What is overdue or blocked?
- What should be reviewed at the next encounter?

### Right Rail

Use durable sections:

- Next actions.
- In progress.
- Safety.

Avoid long mixed lists where every alert has equal weight.

### Patient PWA

Optimize for reassurance and comprehension.

Use:

- Plain language.
- One clear next step.
- Transparent payment/pricing state.
- Preparation instructions that are easy to follow.
- Calm confirmations.
- Helpful recovery from failed payment, missing result, or reschedule states.

### Phlebo Field Workflows

Optimize for one-handed mobile use, field conditions, and specimen safety.

Prioritize:

- Identity verification.
- Large touch targets.
- Clear visit status.
- Offline and retry behavior.
- Scan/manual fallback.
- Exception handling.
- Specimen labels and handoff state.

### Receptionist Operations

Optimize for scanning, queue resolution, and exception handling.

Prioritize:

- Fast patient and appointment search.
- Duplicate prevention.
- Applied filters and no-result recovery.
- Payment/document status.
- Clear handoffs.
- Handling time reduction.

## Copy Rules

Kura copy should be calm, specific, and non-judgmental.

Prefer:

- Specific verbs: `Order HbA1c`, `Confirm sample`, `Send follow-up`.
- Clear outcomes: `The patient will receive the reminder by SMS.`
- Concrete states: `Syncing`, `Payment pending`, `Sample collected`.
- Recovery guidance: `Check date of birth and try again.`
- Explicit consequences: `Cancelling this appointment releases the current slot.`

Avoid:

- `OK`
- `Submit`
- `Continue` when the outcome is unclear
- `Something went wrong`
- `Are you sure?` without a concrete consequence
- Decorative marketing copy inside operational tools

## Accessibility Contract

- All icon-only buttons need `aria-label`.
- Current navigation item uses `aria-current=page`.
- Tabs use `role=tablist`, `role=tab`, and `aria-selected`.
- Menus use `role=menu` and `role=menuitem`.
- Dialog/drawer uses `role=dialog`, `aria-modal=true`, Escape close, overlay close, focus entry, and a visible close button.
- Inputs with errors use `aria-invalid=true` and visible error copy.
- Selection tables include select-all, row labels, and indeterminate state.
- Color must never be the only status signifier.
- Focus-visible states must be strong and visible.
- Disabled controls must be accompanied by a reason when blocking a critical workflow.

## Interaction Rules For MagicPath Components

- Build actual interactive state, not static screenshots.
- Buttons, filters, drawers, tabs, menus, chips, calendars, search, and forms must respond to user input.
- Use controlled inputs for forms.
- Use hover, focus, active, loading, disabled, error, empty, and success states when applicable.
- For multi-view flows, use internal state navigation in one component unless separate frames are explicitly requested.
- Never stack multiple separate screens inside one frame.
- Do not draw a phone, browser, or laptop mockup unless explicitly asked.
- Center short components inside the canvas, but keep the component responsive at any width.
- Use real Kura tokens and CSS variables; avoid hardcoded brand colors.

## Visual Do And Do Not

Do:

- Use quiet hierarchy.
- Use precise borders and dividers.
- Use brand blue sparingly for active/primary/focus states.
- Use semantic badges for state.
- Use compact tables and lists for operational scanning.
- Use drawers for contextual actions.
- Use tabs for peer sections.
- Use segmented toggles for modes.
- Use filters as reversible lenses.

Do not:

- Use decorative gradient blobs, bokeh, or orbs.
- Use a marketing hero for operational apps.
- Use card-heavy layouts for every section.
- Put cards inside cards.
- Use purple except for AI-specific surfaces.
- Use red for non-critical emphasis.
- Hide critical instructions in tooltips.
- Use color-only status.
- Treat missing clinical data as normal.

## Metrics To Consider

Product metrics:

- Task success
- Time on task
- Error rate
- Drop-off
- Search success
- Form completion
- Error recovery
- Confidence/trust rating

Operational metrics:

- Appointment completion
- Reschedule rate
- Support tickets
- Front-desk handling time
- Visit completion
- Sample rejection/relabel/exception rate
- No-show rate
- Payment issue rate
- Status sync latency
- Audit trail completeness

Do not use NPS as a substitute for usability validation.

## MagicPath Output Checklist

Before accepting generated Kura UI:

- Uses `Kantumruy Pro`.
- Uses Kura CSS variables.
- Has calm clinical hierarchy.
- Has one obvious primary action.
- Has state labels, not color-only status.
- Includes empty/loading/error/offline states where relevant.
- Does not use decorative generic SaaS motifs.
- Does not put cards inside cards.
- Is responsive across mobile and desktop.
- Icon buttons have labels/tooltips.
- Form errors include recovery.
- Critical actions show consequence and recovery.
- Healthcare data semantics are preserved.

