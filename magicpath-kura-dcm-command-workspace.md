---
name: Kura DCM Command Workspace
type: magicpath-import-brief
version: 2026-06-19
target: MagicPath canvas component
componentName: KuraDcmCommandWorkspace
defaultTheme: light
recommendedCanvas:
  desktop:
    width: 1440
    height: 960
  mobile:
    width: 390
    height: 844
sourceContext:
  - README.md
  - design.md
  - KuraDCM Specs.md
  - Kura Order Cart Design Specs.md
  - Kura Phone Gate Modal Spec.md
---

# Kura DCM Command Workspace

Build one highly polished, fully interactive MagicPath canvas component for the Kura doctor workspace. This should feel like a calm healthcare operating system for Cambodian private-practice doctors who manage patients, order labs, review results, and coordinate sample logistics without owning a lab.

This is not a landing page. The first screen must be the usable product experience.

## Import Instructions For MagicPath

Use this entire Markdown file as the design prompt.

Create a single responsive React component named `KuraDcmCommandWorkspace`.

The component must be one self-contained app in one frame. Do not create multiple frames stacked inside the canvas. Use internal React state for navigation, drawers, sheets, modals, filters, order steps, and success states.

The component must work at desktop and mobile widths:

- Desktop target: 1440 x 960.
- Mobile target: 390 x 844.
- The layout must fluidly adapt between those sizes.
- Do not draw an iPhone, browser, laptop, desktop monitor, status bar, address bar, notch, or any device mockup.
- The canvas itself is the device.

If implementing through the MagicPath code workflow:

- Keep `src/App.tsx` slim and only render the generated component.
- Implement the component in `src/components/generated/KuraDcmCommandWorkspace.tsx`.
- Add any helpers as sibling files under `src/components/generated/`.
- Keep all custom CSS in `src/index.css` or colocated generated component CSS if available.
- Use Tailwind v4 syntax if Tailwind is present: `@import 'tailwindcss';`.
- Do not edit `package.json`, lockfiles, `vite.config.*`, or `src/main.tsx`.

## Product Summary

Kura is a doctor-facing healthcare operating system for Cambodia. It helps private-practice doctors:

- Manage bridged patient records.
- Order blood and urine tests from a distributed lab network.
- Send patients to Patient Service Centers, called PSCs.
- Draw blood in clinic and hand samples to scheduled courier sweep routes.
- Communicate by Telegram and SMS.
- Handle KHQR, cash, insurance, and deferred payment.
- Review lab results and reflex add-ons.
- Maintain identity, consent, billing, and audit safety.

The interface should communicate trust, operational speed, clinical safety, and low cognitive load. It should feel dense enough for real work but calm enough for repeated clinical use.

## Primary Persona

Primary user: verified doctor, T1 or T2.

Context:

- Works in a small cabinet or private clinic.
- Sees patients during short consult windows.
- Needs to order labs without switching tools.
- May delegate payment, identity, or sample handling to reception or PSC staff.
- Needs strong cues around patient identity, sample custody, payment, and abnormal results.

Secondary state to support: Explorer doctor, T0.

Explorer users can browse the catalog and demo patient, but ordering is locked behind license verification.

## Design North Star

Kura should feel like a clinical command surface, not a decorative SaaS dashboard.

Prioritize:

- Patient identity safety.
- Clear next action.
- Fast scanning in 5 to 10 seconds.
- Honest missing-data states.
- Calm visual hierarchy.
- Practical density.
- Plain copy.
- Accessible keyboard and screen reader behavior.
- Reduced risk of wrong patient, wrong test, wrong sample, wrong payment, or silent failure.

Avoid:

- Marketing hero sections.
- Decorative blob or orb backgrounds.
- Card-inside-card layouts.
- Loud gradients.
- Generic KPI dashboard clutter.
- Unclear icons without labels or tooltips.
- Vague copy such as "OK", "Submit", "Done", or "Something went wrong".
- Color-only clinical meaning.
- Static fake buttons.

## Visual Language

Use a restrained clinical palette.

Core colors:

```css
:root {
  --kura-brand-25: #eef7ff;
  --kura-brand-50: #e9f3ff;
  --kura-brand-100: #d4e8ff;
  --kura-brand-500: #268cff;
  --kura-brand-600: #1e70cc;
  --kura-brand-700: #175499;

  --kura-ink-0: #ffffff;
  --kura-ink-25: #f8f9fc;
  --kura-ink-50: #f6f7fa;
  --kura-ink-100: #eef0f5;
  --kura-ink-150: #e3e6ee;
  --kura-ink-200: #d6dae5;
  --kura-ink-400: #8d94a8;
  --kura-ink-500: #6b7388;
  --kura-ink-600: #475066;
  --kura-ink-700: #2a3447;
  --kura-ink-900: #0b1424;

  --kura-success-bg: #e7f8ee;
  --kura-success-fg: #128a52;
  --kura-warning-bg: #fff8e6;
  --kura-warning-fg: #8a5600;
  --kura-danger-bg: #fdecec;
  --kura-danger-fg: #b22929;
  --kura-info-bg: #e6f9fd;
  --kura-info-fg: #0e7490;
  --kura-ai-bg: #f1ecfb;
  --kura-ai-fg: #6a35c0;

  --kura-surface: #ffffff;
  --kura-surface-2: #fafbfd;
  --kura-surface-bg: #f6f7fa;
  --kura-surface-sunken: #eef0f5;
  --kura-border: #e6e9f1;
  --kura-border-strong: #d6dae5;
  --kura-focus: rgba(38, 140, 255, 0.32);

  --kura-radius-sm: 6px;
  --kura-radius-md: 8px;
  --kura-radius-lg: 12px;
  --kura-radius-xl: 16px;
  --kura-radius-pill: 999px;
}
```

Typography:

- Primary font: Kantumruy Pro.
- Fallback: system sans-serif.
- Default body: 14px, line-height 1.45.
- Compact metadata: 12px or 13px.
- Card titles: 15px to 18px.
- Major page title: 20px to 24px.
- Avoid oversized display text inside operational panels.
- Use tabular numbers for lab values, money, counts, booking codes, and sample IDs.
- Letter spacing should be 0 unless used for tiny uppercase labels.

Spacing:

- Use a 4px grid.
- Common gaps: 4, 8, 12, 16, 20, 24, 32, 40.
- Desktop shell header height around 52px.
- Desktop left nav width around 72px.
- Desktop right rail width 360px to 420px.
- Mobile bottom nav height around 64px.
- Mobile primary touch targets at least 44px.

Surface style:

- Use white and near-white surfaces.
- Use hairline borders and precise dividers.
- Cards can have 8px or 12px radius.
- Use shadow sparingly for drawers, popovers, and active sheets.
- Do not nest cards inside cards.
- Page sections should not all become floating cards.

## App Information Architecture

The component should behave as a mini app with these top-level sections:

1. Home.
2. Patients.
3. Bookings.
4. Catalog.
5. Results.
6. More.

Desktop navigation:

- A fixed left rail.
- Each rail item uses an icon plus a short label.
- Active state uses brand blue and a small selected indicator.
- Include sections: Home, Patients, Bookings, Catalog, Results, More.

Mobile navigation:

- A top app bar with Kura logomark, current title, search button, sync button.
- A bottom nav with Home, Patients, Bookings, Catalog, More.
- Results can be reached from Home cards and patient chart.
- Include a persistent order cart dock when items are selected.

The default loaded section should be Home.

## Global Shell

Desktop shell:

- Root background: `--kura-surface-bg`.
- Left rail: white, right border, 72px width.
- Header: white, bottom border, 52px height.
- Header left: Kura logomark, workspace label `Mekong Clinic`, session label `AM session`.
- Header center: global search field with placeholder `Search patients, bookings, tests...`.
- Header right:
  - Sync pill: `Synced 2 min ago`.
  - Notification icon with count `5`.
  - Primary action: `New booking`.
- Main area: responsive grid with main content and right rail.
- Right rail: contextual next actions, order draft, active safety alerts.

Mobile shell:

- Full viewport app, no outer phone frame.
- Top bar:
  - Back button when a pushed view is open.
  - Kura mark when at root.
  - Eyebrow: `Mekong Clinic - AM session`.
  - Title changes by section.
  - Search and Sync icon buttons.
- Sync strip below top bar:
  - Green live dot.
  - Copy: `Synced 2 min ago - cached clinical tasks available offline`.
- Main content scrolls.
- Order cart dock floats above bottom nav when line count > 0.
- Bottom nav stays pinned.

## Global Interactions

All interactive elements must have real behavior:

- Nav buttons switch sections.
- Search opens a search overlay or filters current lists.
- Sync button shows a temporary success toast or inline confirmation.
- Filter chips toggle and update visible rows/counts.
- Patient rows open the patient chart.
- Booking rows open booking detail.
- Test add buttons add/remove tests from the order draft.
- Cart dock opens a cart sheet or rail.
- Route cards update order draft route state.
- Payment method tiles update payment state.
- Phone gate moves through phone -> OTP -> match/no match.
- Place order updates the draft to placed and shows success.
- Reflex actions move through detected -> patient pending -> running -> completed or declined.
- Modals and sheets close through buttons, Escape, and explicit cancel behavior.

Use stateful UI, not static markup.

## Seed Data

Use this seed data directly in the component.

Current clinician:

- Name: Dr. Chann.
- Workspace: Mekong Clinic.
- Tier: T2 billing-enabled.
- Locale: Cambodia.
- Preferred lab units: SI.
- Payment enabled: cash, KHQR, insurance.

Patients:

1. Sokha Chann
   - Khmer name: optional placeholder if Khmer script is not convenient.
   - MRN: P-9134.
   - Sex/age: Female, 32.
   - Phone: +855 12 *** 4471.
   - Bridge tier: T2 ID verified.
   - Insurance: Forte EmCare.
   - Primary problems: T2DM, hypertension, dyslipidemia.
   - Clinical signal: HbA1c 9.4 percent, up 2 quarters.
   - Tags: Off target, Repeat due.
   - Last seen: 12 days ago.

2. Channary Sok
   - MRN: P-4421.
   - Sex/age: Female, 47.
   - Bridge tier: T1 phone confirmed.
   - Insurance: Self-pay.
   - Clinical signal: TSH 0.01 mIU/L, reflex candidate.
   - Tags: Results back, Review.
   - Last seen: Today.

3. Dara Vann
   - MRN: P-2210.
   - Sex/age: Male, 58.
   - Bridge tier: T3 cold.
   - Insurance: NSSF pending.
   - Clinical signal: LDL 178 mg/dL, overdue follow-up.
   - Tags: Overdue, Identity cold.
   - Last seen: 7 months ago.

4. Malis Keo
   - MRN: P-6672.
   - Sex/age: Female, 29.
   - Bridge tier: T2 ID verified.
   - Insurance: Self-pay.
   - Clinical signal: Antenatal panel due.
   - Tags: Due today.
   - Last seen: 3 weeks ago.

5. Vicheka Lim
   - MRN: P-1188.
   - Sex/age: Male, 41.
   - Bridge tier: T1 phone confirmed.
   - Insurance: Forte EmCare.
   - Clinical signal: BP 146/92 across 3 visits.
   - Tags: Follow-up due.
   - Last seen: 1 month ago.

Today signals:

- 5 new results: 3 in range, 2 flagged.
- 8 patients off target: HbA1c and LDL rising.
- Pickup at 16:40: 8 tubes awaiting courier, rider Sopheap T.
- 2 claim updates: 1 paid, 1 needs info, Forte.
- 12 due for follow-up: chronic-care cadence.
- 2 referrals incoming: Dr. Lim and Dr. Kosal.

Bookings:

1. FZ-48210
   - Patient: Sokha Chann.
   - Tests: HbA1c, Lipid Panel, Microalbumin.
   - Route: PSC walk-in.
   - Status: Scheduled.
   - Payment: KHQR sent.
   - ETA: Visit today before 17:30.
   - Total: USD 38, KHR 155800.

2. KO-9134-7742
   - Patient: Sokha Chann.
   - Tests: CBC, CMP.
   - Route: Clinic draw, scheduled sweep.
   - Status: In progress.
   - Payment: Forte pending claim.
   - ETA: Sweep 16:40.
   - Total: USD 24, KHR 98400.

3. FZ-77003
   - Patient: Channary Sok.
   - Tests: TSH.
   - Route: PSC walk-in.
   - Status: Results back.
   - Payment: Paid cash.
   - ETA: Review abnormal result.
   - Total: USD 12, KHR 49200.
   - Flag: Critical abnormal, reflex available.

4. KO-2210-1860
   - Patient: Dara Vann.
   - Tests: Lipid Panel, Creatinine.
   - Route: Clinic draw.
   - Status: Cancelled.
   - Payment: Voided.
   - ETA: Voided.
   - Total: USD 30, KHR 123000.

Catalog tests:

- HbA1c, code HBA1C, Diabetes, USD 8, KHR 32800, EDTA, same day, reason: Glycemic control due.
- Lipid Panel, code LIPID, Lipids, USD 18, KHR 73800, SST, fasting 9 to 12h, reason: LDL was 162.
- Microalbumin, code UACR, Renal, USD 12, KHR 49200, urine cup, same day, reason: renal screening.
- CMP, code CMP14, Liver/Renal, USD 15, KHR 61500, SST, same day.
- CBC, code CBC, Hematology, USD 9, KHR 36900, EDTA, same day.
- TSH, code TSH, Thyroid, USD 12, KHR 49200, SST, same day.
- FT3, code FT3, Thyroid, USD 7, KHR 28700, SST, reflex add-on.
- FT4, code FT4, Thyroid, USD 7, KHR 28700, SST, reflex add-on.
- Vitamin D, code VITD, Vitamins, USD 22, KHR 90200, SST.
- Urinalysis, code UA, Urinalysis, USD 6, KHR 24600, urine cup.

Lab results for Sokha:

- HbA1c: 9.4 percent, high, previous 8.8, 8.2, 7.9.
- LDL: 162 mg/dL, high, previous 148, 139, 132.
- Microalbumin: 34 mg/g, warning, previous 28, 21, 18.
- Creatinine: 0.9 mg/dL, in range.
- BP: 146/92, warning.

Lab results for Channary:

- TSH: 0.01 mIU/L, critical low.
- Reflex recommendation: add FT3 and FT4 on the same sample.
- Sample expires in 47h.
- Reflex total: USD 14, KHR 57400.

## Home Section

The Home section is the doctor's morning command surface.

Desktop layout:

- Header block with greeting:
  - Eyebrow: `Today - Friday, 19 June`.
  - Title: `Good morning, Dr. Chann.`
  - Subcopy: `Six clinical and operational threads need attention.`
- A row or responsive grid of six signal cards.
- Below, a cohort table.
- Right rail:
  - Next actions.
  - Active pickup.
  - Order draft if any tests are selected.
  - Safety notes.

Mobile layout:

- Greeting card at top.
- Signal cards in a horizontal scroll or two-column compact grid.
- Filter chips below.
- Patient cohort list as stacked rows.
- Cart dock overlays near bottom if cart has items.

Signal cards:

1. `5 new results`
   - Subcopy: `3 in range - 2 flagged`.
   - Tone: warning because flagged results exist.
   - Click opens Results section filtered to flagged.

2. `8 off target`
   - Subcopy: `HbA1c and LDL trending up`.
   - Tone: warning.
   - Click filters cohort to off-target.

3. `Pickup at 16:40`
   - Subcopy: `8 tubes - Sopheap T.`
   - Tone: info.
   - Click opens Bookings filtered to in-clinic pickup.

4. `2 claim updates`
   - Subcopy: `1 paid - 1 needs info`.
   - Tone: neutral/info.
   - Click opens More or a claim drawer.

5. `12 follow-ups`
   - Subcopy: `Chronic-care cadence due`.
   - Tone: neutral.
   - Click filters patients to overdue.

6. `2 referrals`
   - Subcopy: `Incoming replies`.
   - Tone: info.
   - Click opens referrals drawer.

Cohort filters:

- All 184.
- Off target 8.
- Overdue 14.
- Unreliable 6.
- No-show 4.

Cohort row anatomy:

- Severity dot with label, not color alone.
- Patient name and MRN.
- Clinical signal sentence.
- Bridge tier badge.
- Two tags max.
- Last seen.
- Chevron or row action.

Home interactions:

- Clicking a filter chip updates selected chip and visible rows.
- Clicking patient row opens Patient Chart.
- Clicking a signal card changes section or filter.
- `New booking` opens the booking composer.
- Keyboard: rows are focusable and Enter opens the row.

Home empty/Explorer state:

- If user tier is Explorer, replace signal cards with a clear unlock card:
  - Title: `Explore with Sokha's demo chart`.
  - Body: `Ordering real labs requires MoH license verification.`
  - Primary CTA: `Verify license`.
  - Secondary CTA: `Open demo patient`.

## Patients Section

The Patients section lets doctors search, triage, and open charts.

Desktop layout:

- Top title: `Your patients`.
- Subcopy: `All patients bridged into Mekong Clinic.`
- Search input: `Name, Khmer name, MRN, phone...`.
- Filter button and active filter chips.
- Sortable patient table.
- Kura-wide search opt-in control.

Patient table columns:

- Patient.
- Age/Sex.
- Last seen.
- Status.
- Action.

Patient row:

- Avatar tile with initials.
- Latin name.
- Optional Khmer name line.
- MRN.
- Bridge tier badge.
- Clinical status.
- `Open chart` action.

Kura-wide privacy behavior:

- Network records only appear after a query and opt-in.
- Kura-wide rows do not show clinical data.
- Show provenance only, for example: `In Dr. Lim's panel - BKK2`.
- Only action: `Bridge to panel`.
- Opening chart is disabled until bridge consent.

Patients interactions:

- Search filters local patient rows.
- `Also search Kura-wide` toggles network result group.
- `Bridge to panel` opens phone/OTP consent drawer.
- Patient row opens Patient Chart.
- `New patient` opens Phone Gate modal.

## Patient Chart Section

The Patient Chart is the core clinical workspace.

Default patient: Sokha Chann.

Desktop layout:

- Sticky patient header.
- Main left column: lab history and clinical timeline.
- Right rail: Quick Order, bookings, medications, diagnoses, safety cards.
- Right rail should be sticky and independently scrollable if needed.

Mobile layout:

- Header collapses into compact patient identity bar.
- Content uses segmented tabs:
  - Overview.
  - Labs.
  - Orders.
  - Meds.
  - Notes.
- Quick Order opens as bottom sheet.

Patient header:

- Breadcrumb: `Patients / Sokha Chann`.
- Avatar tile.
- Name: `Sokha Chann`.
- Metadata: `Female - 32 - MRN P-9134 - +855 12 *** 4471`.
- Bridge badge: `T2 ID verified`.
- Insurance badge: `Forte EmCare`.
- Problem pills: `T2DM`, `Hypertension`, `Dyslipidemia`.
- Last seen: `12 days ago`.
- Primary action: `Order labs`.
- Secondary actions: Call, Telegram, More.

AI recap banner:

- Tone: AI purple, but subtle.
- Label: `AI recap - refreshed daily`.
- Body: `HbA1c and LDL are rising despite current plan. Microalbumin is newly elevated. Consider repeat HbA1c and renal-protective therapy review.`
- Next step: `Order HbA1c + microalbumin repeat`.
- Include `Review before acting` microcopy.

Lab history matrix:

- Header: `Lab history`.
- Search: `Find test or panel`.
- Range segmented control: 7d, 3mo, 6mo, All.
- Warning banner when filtered: `You are viewing a filtered range - 4 earlier draws are hidden.`
- Panels:
  - Diabetes.
  - Lipids.
  - Renal.
  - Thyroid.
  - Hematology.
- Each panel row:
  - Name.
  - Test count.
  - Abnormal count.
  - Last draw age.
  - Expand/collapse.
- Each test row:
  - Test name.
  - Reference range and unit.
  - Small trend dots.
  - Newest value.
  - Previous value cells.
  - Status label: High, Low, In range, Awaiting pay, ETA 4h.

Lab value color rules:

- Danger: critical abnormal or action required.
- Warning: out of range, pending review, below/above reference.
- Success: in range or resolved.
- Neutral: no reference, missing, or not yet resulted.
- Always include text labels, not color alone.

Trend expansion:

- Clicking HbA1c row expands inline.
- Show latest value: `9.4 percent - Above range`.
- Show compact line chart or dot chart.
- Show reference range.
- Show action card:
  - Title: `Re-test out-of-range biomarker`.
  - Recommended interval: `3 months`.
  - Choices: 1 month, 3 months, 6 months.
  - CTA: `Schedule re-test`.
- After scheduling, show success: `Re-test scheduled - reminder sent by Telegram`.

Right rail cards:

1. Quick Order.
2. Patient bookings.
3. Suggested nudge.
4. Medications.
5. Diagnoses.
6. Allergies and safety.
7. Documents.

Patient chart interactions:

- `Order labs` scrolls or focuses Quick Order.
- Quick Order add buttons update cart.
- `Order again` on a lab row adds that test to cart.
- `Schedule re-test` moves to scheduled state and shows undo.
- Patient booking `Edit` opens edit-tests panel.
- Patient booking `Reorder` clones tests into cart.
- Medication suggestion `Add` moves medication to active medications.
- Diagnosis suggestion `Add` adds ICD code and disables duplicate.

Patient chart required states:

- Default rich patient.
- Sparse new patient.
- Loading chart.
- Offline cached chart.
- Missing allergies: `Not on file - capture at next visit`.
- Missing insurance: `Self-pay - no insurer on file`.
- Permission denied for Kura-wide unbridged chart.
- Read-only signed document state.

## Quick Order Panel

Quick Order is the fastest route from chart to lab order.

Panel title: `Quick order`.
Subcopy: `Order from this chart without leaving the consult.`

State machine:

1. Cart.
2. Route.
3. PSC payment.
4. Clinic tube prep.
5. Placed PSC.
6. Placed clinic pickup done.

Cart state:

- Groups:
  - `Suggested for Sokha`.
  - `Common`.
  - `Search catalog`.
- Suggested rows:
  - HbA1c, USD 8, reason `Glycemic control - due`.
  - Lipid Panel, USD 18, reason `LDL was 162`.
  - Microalbumin, USD 12, reason `Renal screening`.
  - CMP, USD 15, reason `Statin monitoring`.
- Each row:
  - Test name and code.
  - Reason hint.
  - Price.
  - Add or Added button.
- CTA:
  - Disabled if no tests: `Add at least one test`.
  - Enabled: `Where to draw?`.

Route state:

- Two enabled route cards:
  1. `Draw in clinic`
     - Copy: `You draw blood. Kura courier collects tubes on the sweep route.`
     - Meta: `Next pickup today 16:40`.
  2. `Send to PSC`
     - Copy: `Patient receives code and QR by Telegram/SMS.`
     - Meta: `BKK1 PSC - 1.2 km`.
- Disabled third route:
  - `Home blood collection`
  - Badge: `Phase 2 - coming soon`.
- STAT toggle:
  - Off by default.
  - If route = clinic: `Dispatch courier now, about 30 min, STAT fee applies.`
  - If route = PSC: `Patient must go now - urgent SMS, no STAT fee.`
- CTA:
  - Route clinic: `Draw blood`.
  - Route PSC: `Send to PSC`.

PSC payment state:

- Charge block title: `Charge patient`.
- Pay when selector:
  - `Pay now - recommended`
  - `Pay later - at PSC counter`
- Copy: `Pay now improves show-up rate by 40 percent.`
- Method tiles:
  - Cash.
  - KHQR via Telegram.
  - Insurance, if covered.
- If Pay now + Cash:
  - Open Cash Confirm modal before placing.
  - Modal copy: `Did you collect the cash? Confirm you have USD 38 from Sokha Chann in your hand right now.`
  - Buttons: `No, not yet` and `Yes, I have USD 38`.
- If KHQR:
  - Show waiting state with countdown.
  - Allow `Mark as received` fallback.
- CTA: `Place order`.

Placed PSC success:

- Big booking code: `FZ-48210`.
- Copy: `Code and QR sent by Telegram and SMS.`
- Masked phone: `+855 12 *** 4471`.
- Nearest PSC: `55 St. 178 - BKK1 - 1.2 km - open until 18:00`.
- Payment line: `KHQR sent - waiting for payment`.
- Actions:
  - `Preview patient message`.
  - `Open chart`.
  - `Back to catalog`.

Clinic tube prep state:

- Banner: `Preparing order - not yet placed`.
- Copy: `The booking appears only after tubes are ready for pickup.`
- Derived tube list:
  - Purple EDTA 3mL: HbA1c.
  - Yellow SST 5mL: Lipid Panel, CMP.
  - Urine cup 10mL: Microalbumin.
- Method tabs:
  - Scan.
  - Print.
- Scan instructions:
  1. Peel labels from Kura roll.
  2. Apply one label per tube.
  3. Scan each tube to assign sample ID.
- Per-tube states:
  - Pending scan.
  - Scanned with 12-digit sample ID.
  - Undo available.
- Scanner modal states:
  - Starting camera.
  - Scanning.
  - Linked.
  - No camera.
  - Unsupported browser.
  - Not a Kura sticker.
  - Duplicate code.
- Gate:
  - Disabled: `Scan 2 more tubes first`.
  - Enabled: `Continue - ship to lab`.

Ship to lab state:

- Sweep card:
  - Title: `Next sweep - 16:40`.
  - Body: `Sopheap T. visits BKK1-route cabinets daily. Leave the tube bag at reception.`
- CTA: `Confirm - tubes ready`.
- Success:
  - Title: `Pickup scheduled`.
  - Large handover code: `K7A2`.
  - Copy: `Read this code to the rider at handover.`

## Order Draft Rail And Cart Dock

The order draft is persistent across Catalog, Patient Chart, and Booking Composer.

Desktop right rail:

- Header:
  - Title: `Order draft`.
  - Counter: number of selected tests.
  - Currency toggle: USD/KHR.
  - Clear icon with tooltip.
- Line list:
  - Test name.
  - Code.
  - Tube/prep badge.
  - Price.
  - Remove button.
- Totals:
  - Subtotal.
  - Insurance estimate if patient attached.
  - Patient due.
  - KHR mirror.
- Patient attach slot.
- Route slot.
- CTA slot.
- Footer: TAT estimate.

Mobile dock:

- Fixed pill above bottom nav.
- Hidden if no selected tests.
- Copy examples:
  - `Selected tests - 3 - USD 38`.
  - `Preparing - 3 - USD 38`.
  - `Placed - FZ-48210`.
- Tapping opens a bottom sheet with the full rail.

Cart states:

1. Empty.
2. Building.
3. Blocked Explorer.
4. Patient needed.
5. Route needed.
6. Payment pending.
7. Preparing tubes.
8. Placed.
9. Cancelled or voided.
10. Read-only draft.

Blocked Explorer copy:

- Title: `Ordering is locked in Explorer mode`.
- Body: `Verify your MoH license to place real lab orders. You can still browse the catalog and demo flow.`
- CTA: `Verify license`.

## Catalog Section

The Catalog is for test-first ordering.

Desktop layout:

- Page title: `Lab catalog`.
- Subcopy: `Every test Kura runs - prices, prep, sample type, and turnaround.`
- Search bar.
- Category chips with counts.
- Favorites and bundles strip.
- Test list.
- Sticky order draft rail.

Mobile layout:

- Search-first.
- Category chips horizontal scroll.
- Test rows as compact cards.
- Cart dock at bottom.

Category chips:

- All.
- Favorites.
- Diabetes.
- Lipids.
- Renal.
- Liver.
- Thyroid.
- Hematology.
- Cardiac.
- Infectious.
- Vitamins.
- Urinalysis.

Test row anatomy:

- Tube icon or colored sample dot.
- Test name.
- Code chip.
- Category.
- Badges:
  - Popular.
  - Suggested.
  - Fasting.
  - Unavailable.
  - Covered.
- Meta:
  - TAT.
  - Sample type.
  - Preparation.
- Price:
  - USD primary.
  - KHR secondary.
- Actions:
  - Favorite star.
  - Add/Added button.

Catalog interactions:

- Search filters by name, code, category.
- Category chip filters rows and updates count.
- Favorite toggles star and moves item into Favorites.
- Add toggles selected line in cart.
- Cart CTA opens patient attach if no patient selected.
- `Suggest missing test` opens modal.

Suggest missing test modal:

- Title: `Suggest a missing test`.
- Fields:
  - Test name, required.
  - Sample type, optional.
  - Urgency: ASAP, Within 1 month, Nice to have.
  - Expected volume: 1-5, 6-20, 20+ per month.
  - Reason, optional.
- Success copy: `Lab ops reviews demand weekly. If a vendor is already being qualified, we will share an ETA.`

## Phone Gate Modal

Use Phone Gate when sending a booking code without an attached patient, or when creating a patient from the catalog order draft.

Modal purpose:

- Capture Cambodia phone.
- Verify phone by OTP.
- Detect existing Kura patient.
- Let doctor choose existing patient or create temporary patient.
- Preserve safety by saying PSC can finish ID checks later.

Desktop modal:

- Centered dialog.
- Width about 790px.
- Two panes:
  - Left interaction pane, 528px.
  - Right safety pane, 262px.
- Close button outside top-right.
- Do not close on accidental backdrop click if data is entered.

Mobile modal:

- Full-width bottom sheet or near-full screen dialog.
- Safety pane stacks below the form before final Continue.

Persistent safety pane:

- Label: `BEFORE YOU SEND`.
- Body: `Confirm the phone and the person taking the tests. Reception can finish ID checks later.`
- Tone: warning, but calm.
- Never rely on color alone.

State 1: Enter phone.

- Title: `Choose patient`.
- Subtitle: `Start with a patient, guardian, or guarantor phone.`
- Country selector: KH +855.
- Phone placeholder: `12 345 678`.
- CTA: `Continue`.
- Disabled until valid Cambodia number.

State 2: Verify number.

- Back action: `Change phone`.
- Title: `Verify number`.
- Subtitle: `Enter the 6-digit SMS code sent to +855 70 ... 496.`
- Six OTP boxes.
- CTA: `Verify code`.
- Disabled until 6 digits.
- Include invalid, expired, resend countdown, and verifying states.

State 3: Known match.

- Title: `Is this the patient?`
- Patient card:
  - Initials: SC.
  - Name: Sokha Chann.
  - Meta: `Female - 32y - MRN ...34`.
  - Button: `Choose`.
- Secondary: `Patient is someone else`.

State 4: Different patient.

- Warning banner:
  - Title: `This looks like a different patient`.
  - Body: `This phone belongs to another Kura patient. Confirm this is a different person.`
- Verified phone row, locked.
- Fields:
  - Full name.
  - DOB or age.
  - Sex segmented control.
- CTA: `Continue`.
- Log this branch as audited.

State 5: No match.

- Info banner:
  - Title: `No match found`.
  - Body: `Add details. Kura will check for possible duplicates.`
- Verified phone row.
- Fields:
  - Full name.
  - DOB or age.
  - Sex.
- CTA: `Continue`.

Outcome for temporary patient:

- Draft card should show:
  - `For Pierre`.
  - `PROV-0001 - New patient - Phone checked`.
  - `PSC will confirm identity`.
  - `Phone checked. Not matched in Kura.`

Phone Gate accessibility:

- Use dialog semantics.
- Trap focus.
- Return focus to opener.
- OTP inputs labelled by digit number.
- Errors announced with aria-live.
- Every required field has clear inline error text.

## Bookings Section

Bookings is the tracking hub after an order is placed.

Desktop layout:

- Page title: `Bookings`.
- Subcopy: `Track status, sign reports, and re-book.`
- Primary CTA: `New booking`.
- Search.
- Filter chips.
- Table.
- Detail drawer or inline expansion.

Filters:

- All.
- Today.
- Scheduled.
- In progress.
- Awaiting visit.
- Results back.
- Cancelled.

Table columns:

- Booking.
- Patient.
- Tests.
- Status.
- ETA.
- When.
- Actions.

Row status labels:

- `Scheduled`.
- `In progress`.
- `Awaiting visit`.
- `Results back`.
- `Cancelled`.

ETA examples:

- `Visit today before 17:30`.
- `Sweep 16:40`.
- `Rider about 20m`.
- `At lab`.
- `Review abnormal result`.
- `Voided`.

Row actions:

- Edit tests.
- Resend slip.
- Cancel booking.
- Reorder.

Locked behavior:

- Edit locked when tubes are at lab or booking cancelled.
- Cancel locked when tubes are at lab, booking cancelled, or payment settled.
- Locked tooltip: `Tubes already at lab - call Kura ops to amend.`

Edit tests panel:

- Current tests list.
- Search add.
- New rows tagged `New`.
- Removed rows moved to `Marked for removal` with undo.
- Save disabled when no changes or zero tests remain.
- Save toast: `Updated FZ-48210 - 2 added - 1 removed`.

Cancel modal:

- Title: `Cancel booking FZ-48210?`
- Consequence copy changes by route.
- For PSC: `The patient code will stop working. Collected cash must be refunded manually.`
- For clinic draw: `Pickup will be cancelled if tubes have not left the clinic.`
- Buttons:
  - `Keep booking`.
  - `Cancel booking`.

Resend slip modal:

- Title: `Resend booking slip?`
- Body: `Double-pings can reduce Telegram open rates. Send only if the patient needs a new copy.`
- Buttons:
  - `Keep as is`.
  - `Resend Telegram + SMS`.

Booking detail:

- Header:
  - Booking code.
  - Status badge.
  - Payment badge.
  - Flag badge if abnormal.
  - Patient identity.
  - Route and time.
  - Total.
- Progress strip:
  - Created.
  - Scheduled.
  - Sample.
  - Results.
  - Reported.
- Results card:
  - Test values and flags.
- Timeline:
  - Created 09:14.
  - Scheduled.
  - Sample 10:42.
  - Results 14:30.
  - Reported pending if flagged.

## Results Section

Results helps doctors review abnormal results and reflex suggestions.

Default state:

- Header: `Results review`.
- Subcopy: `Flagged, unread, and recently completed results.`
- Filters:
  - Flagged.
  - Unread.
  - Today.
  - Awaiting reflex.
  - In range.

Result cards:

- Patient identity.
- Booking code.
- Test summary.
- Critical values.
- Time resulted.
- Primary action.

Flagged result for Channary:

- Title: `TSH 0.01 mIU/L`.
- Status: `Critical low`.
- Copy: `Suppressed TSH can indicate hyperthyroidism. FT3 and FT4 can run on the same sample.`
- Sample countdown: `Sample expires in 47h`.
- CTA: `Review reflex`.

Reflex prompt state machine:

1. Detected.
2. Patient pending.
3. Running.
4. Completed.
5. Declined or expired.

Detected:

- Headline: `TSH 0.01 - add FT3 + FT4 on the same sample`.
- Supporting copy: `No new draw needed. The lab holds this sample for 48h.`
- Rows:
  - FT3, USD 7.
  - FT4, USD 7.
  - Total USD 14.
- Payment options:
  - KHQR via Telegram, recommended.
  - Auto-debit, pre-authorized.
  - Forte insurance, auto-claim if ICD-10 E05.x.
  - Skip and schedule redraw.
- Primary CTA: `Approve and request payment`.
- Secondary CTA: `Skip reflex`.

Patient pending:

- Copy: `KHQR sent by Telegram - USD 14. Auto-cancels at 48h if unpaid.`
- Actions:
  - Resend Telegram.
  - Cancel reflex.

Running:

- Copy: `Reflex panel running - same sample. Results expected within 4h.`

Completed:

- Copy: `Paid USD 14 - suppressed TSH with elevated FT3/FT4 suggests primary hyperthyroidism.`
- CTA: `Check results`.

Declined/expired:

- Copy: `Sample discarded after 48h. The patient must return for redraw.`
- CTA: `Reconsider`, only while sample alive.

## More Section

More contains settings and operational account tasks.

Sections:

- Verification.
- Preferences.
- Billing and payments.
- Members.
- Directory profile.
- E-signature.
- Support.

Verification card:

- Title: `MoH license verification`.
- Status: `Verified` for T1/T2.
- Explorer variant:
  - Status: `Required to place orders`.
  - CTA: `Verify license`.
- Steps:
  1. License.
  2. Identity.
  3. Practice.
  4. Review.

Preferences:

- Lab units:
  - SI.
  - Conventional/US.
- Language:
  - English.
  - Khmer partial.
  - Vietnamese partial.
- Theme:
  - Light.
  - Dark.
  - System.

Billing:

- Payment methods:
  - Cash reconciliation.
  - KHQR.
  - Forte EmCare.
  - NSSF.
- Show calm status badges and clear recovery actions.

## Global Search Overlay

Search should be available from the shell.

Desktop:

- Command-palette style popover below header search.

Mobile:

- Full-screen overlay.

Search groups:

- Patients.
- Bookings.
- Tests.
- Actions.

Example queries:

- `Sokha`.
- `FZ-48210`.
- `HbA1c`.
- `TSH`.
- `verify license`.

Search interactions:

- Typing filters results.
- Arrow keys move selection.
- Enter opens selected result.
- Escape closes.
- Empty state: `Search patients, bookings, tests, or actions.`
- No results: `No matching records. Check spelling or search Kura-wide from Patients.`

## Toasts And Feedback

Use small, calm toasts for reversible feedback:

- `Synced just now`.
- `HbA1c added to order draft`.
- `Removed Lipid Panel`.
- `Booking slip resent by Telegram and SMS`.
- `Re-test scheduled - reminder sent`.
- `Diagnosis E11.65 added`.

For critical or blocking issues, use inline banners instead of only toasts.

## Required UI States Matrix

Design and implement the following states:

| Surface | States |
| --- | --- |
| Global shell | default, searching, offline cached, syncing, sync success |
| Home | default, filtered, Explorer locked, empty, loading |
| Patients | default, searching, no results, Kura-wide opt-in, permission denied |
| Patient chart | default, sparse patient, loading, offline, read-only |
| Lab history | collapsed, expanded, filtered range warning, no reference, abnormal, pending reflex |
| Quick Order | cart, route, payment, tube prep, placed PSC, placed clinic, Explorer locked |
| Cart | empty, building, patient needed, route needed, payment pending, preparing, placed, cancelled |
| Phone Gate | phone, OTP empty, OTP partial, OTP invalid, known match, different patient, no match, submitting |
| Catalog | default, filtered, favorites empty, test unavailable, Explorer disabled |
| Bookings | list, filtered, no bookings, edit tests, locked policy, detail, cancelled |
| Results | flagged, unread, in range, reflex detected, pending payment, running, completed, expired |
| More | verified, verification required, settings saved, payment setup incomplete |

## Accessibility Requirements

Use accessible semantics throughout:

- Real buttons for actions.
- Links only for navigation.
- Dialogs use `role="dialog"` and `aria-modal="true"`.
- Sheets and drawers trap focus while open.
- Escape closes non-destructive overlays.
- Return focus to the opener after closing.
- All icon-only buttons have `aria-label`.
- All unfamiliar icon buttons have tooltips.
- Form errors are associated with fields.
- Async errors use `aria-live="polite"`.
- Status changes should not rely on color alone.
- Touch targets are at least 32px, preferably 44px for mobile.
- Keyboard users can navigate filters, rows, tabs, segmented controls, modals, and drawers.
- Visible focus ring uses brand blue.

## Clinical Safety Requirements

Add intentional friction for:

- Patient identity matching.
- Creating a temporary patient when phone belongs to another patient.
- Cancelling bookings.
- Editing a paid order.
- Scanning tube labels.
- Confirming tubes ready for pickup.
- Approving reflex tests.
- Marking cash as collected.

Do not add friction for:

- Searching.
- Filtering.
- Opening a chart.
- Adding/removing draft tests before payment.
- Switching tabs.

Safety copy must be specific:

- Prefer: `Tubes already at lab - call Kura ops to amend.`
- Prefer: `Confirm you have USD 38 from Sokha Chann in your hand right now.`
- Prefer: `PSC will confirm identity.`
- Avoid: `Are you sure?`
- Avoid: `Submit`.
- Avoid: `Patient verified` unless actual ID verification happened.

## Interaction Detail Checklist

Implement these minimum interactions:

- Toggle every top nav section.
- Open and close search overlay.
- Filter Home cohort by chip.
- Open patient chart from cohort row.
- Expand and collapse at least one lab panel.
- Expand HbA1c trend row.
- Schedule and undo a re-test.
- Add and remove tests from Quick Order.
- Move Quick Order from cart to route.
- Select clinic route and PSC route.
- Toggle STAT and update route copy.
- Place PSC order through payment path.
- Show Cash Confirm modal when cash is selected.
- Move clinic order through tube prep with simulated scan buttons.
- Open cart dock on mobile.
- Search and filter Catalog.
- Open Phone Gate and move through OTP to known match.
- Use `Patient is someone else` branch.
- Open Booking detail.
- Edit tests on a scheduled booking.
- Show locked edit policy on results-back booking.
- Open Reflex prompt and move to patient-pending/running/completed.
- Open More preferences and toggle lab units.

## Responsive Behavior

At widths >= 1100px:

- Show desktop shell.
- Left nav fixed.
- Header search visible.
- Main content plus right rail.
- Tables can show all columns.

At widths 760px to 1099px:

- Keep top header.
- Collapse right rail into a side sheet or docked panel.
- Tables become denser or card/list hybrids.
- Left nav can remain compact or become top/side hybrid.

At widths < 760px:

- Use mobile shell.
- Hide left rail.
- Use bottom nav.
- Header search becomes icon overlay.
- Tables become cards.
- Right rail becomes bottom sheet.
- Cart rail becomes dock and sheet.
- Modals become bottom sheets or full-screen dialogs.

Never let text overflow buttons or cards. Use wrapping or truncate secondary metadata with accessible full labels.

## Motion And Feedback

Use subtle motion only where it helps understanding:

- Active nav transition 120ms.
- Drawer/sheet slide 180ms.
- Toast fade 160ms.
- Cart line add/remove transition 120ms.
- New booking row glow 3.8s then fade.
- Scanner success pulse once.
- Reflex state progress transition 180ms.

Respect reduced motion:

- If reduced motion is enabled, remove glows and slides; use instant state changes.

Avoid decorative animations.

## Icons

Use clean healthcare and operational icons:

- Home.
- Patient/person.
- Booking/calendar.
- Flask/test tube.
- Search.
- Bell.
- Refresh/sync.
- Chevron.
- Plus.
- X/close.
- Edit.
- Send.
- Warning triangle.
- Check.
- Lock.
- Shield.
- Credit card/payment.
- QR or scan.
- Truck/courier.

Icon rules:

- Use icon plus text for primary or unfamiliar actions.
- Icon-only buttons require `aria-label` and tooltip.
- Do not invent complex illustrations where a simple icon works.

## Content Tone

Kura copy is calm, specific, and non-judgmental.

Use:

- `Order HbA1c`.
- `Confirm sample`.
- `Send follow-up`.
- `Payment pending`.
- `Sample collected`.
- `Check date of birth and try again.`
- `Cancelling this booking releases the patient code.`

Avoid:

- `OK`.
- `Submit`.
- `Oops`.
- `Something went wrong`.
- `Everything looks good` when clinical data is missing.
- `Verified` for phone-only records.

## Analytics Events

Do not store raw OTP, phone, free-text medical notes, or sensitive values in event properties.

Track:

- `home_signal_clicked`.
- `patient_row_opened`.
- `patient_chart_opened`.
- `quick_order_test_added`.
- `quick_order_route_selected`.
- `quick_order_stat_toggled`.
- `order_payment_method_selected`.
- `cash_confirmed`.
- `phone_gate_opened`.
- `phone_gate_otp_verified`.
- `phone_gate_existing_patient_chosen`.
- `phone_gate_temp_patient_created`.
- `booking_created`.
- `booking_edit_started`.
- `booking_edit_saved`.
- `booking_cancelled`.
- `reflex_prompt_opened`.
- `reflex_payment_requested`.
- `reflex_completed`.
- `lab_units_changed`.

Useful properties:

- persona tier.
- section.
- route type.
- payment method.
- status.
- count of selected tests.
- booking status.
- non-sensitive error code.

## Build Quality Bar

The component is complete only when:

- It is one responsive app-like component, not stacked screens.
- It has no device mockup.
- It opens on a usable Home screen.
- Desktop and mobile layouts both work.
- Navigation is interactive.
- Order draft is interactive.
- Phone Gate is interactive.
- At least one booking detail is interactive.
- At least one reflex flow is interactive.
- Empty, warning, error, loading, offline, disabled, and success states are represented where relevant.
- Critical states include recovery copy.
- All clinical status colors have text labels.
- Focus states are visible.
- No text overlaps or spills out of controls.
- The visual style is calm, precise, and Kura-specific.

## Suggested Initial State

When the component first loads:

- Section: Home.
- User: Dr. Chann, T2.
- Selected patient: none.
- Cart: empty.
- Sync: synced 2 min ago.
- Home filter: All.
- One signal card, `5 new results`, has warning emphasis.
- Right rail shows:
  - `Next action: Review Channary's TSH`.
  - `Pickup at 16:40`.
  - `No active draft`.

Primary path for demo:

1. Click `5 new results`.
2. Open Channary result.
3. Review reflex prompt.
4. Request KHQR payment.
5. Return Home.
6. Open Sokha chart.
7. Add HbA1c, Lipid Panel, Microalbumin.
8. Send to PSC.
9. Confirm KHQR or cash.
10. See booking code `FZ-48210`.

Secondary path:

1. Open Catalog.
2. Search `TSH`.
3. Add TSH.
4. Open cart.
5. Attach patient through Phone Gate.
6. Choose existing patient after OTP.
7. Select route and place order.

Tertiary path:

1. Open Bookings.
2. Filter `Results back`.
3. Open `FZ-77003`.
4. See edit locked policy.
5. Open reflex prompt.

## Final Visual Direction

Make it feel like:

- A calm morning clinical workspace.
- A safe order-entry system.
- A patient chart with useful next actions.
- A logistics console for samples and payments.
- A trustworthy healthcare product built for repeated daily use.

Do not make it feel like:

- A marketing page.
- A generic analytics dashboard.
- A decorative fintech app.
- A futuristic cockpit.
- A static screenshot.
