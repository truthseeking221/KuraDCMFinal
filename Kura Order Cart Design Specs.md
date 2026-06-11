# Kura Unified Order Cart — Figma Design Specs

One order-cart design system serving two personas (Receptionist, Doctor) across all ordering surfaces. Source of truth: Receptionist app (richest payment/consent business), Pierre DCM (richest doctor flows), Kura UI kit tokens (FINAL DCM).

> **Built in Figma:** `00 Kura Brand` → page `Master Cart` → section `Final Cart`
> (node 515-280939). 20 `Cart /*` component sets + assemblies, all bound to Kura DS
> variables (Kura Colors / Spacing / Sizing), text styles, and existing Badge/Button/icon sets.

## 0. Foundations

### 0.1 Tokens (use existing Kura kit styles in Figma)

- Colors: brand-500 #268cff, ink-900→ink-50 ramp, success/warn/danger 500+600, status-*-bg/fg pills, surface / surface-2 / surface-sunken, border. Severity dots: danger-500, warn-500, warn-200 (below-range), success-500, ink-200 (neutral).
- Type: 11/12/13/14/16/18/20/24, weights regular/medium/semibold. Numbers always tabular-nums.
- Spacing 4-grid (space-1=4 → space-10=40), radius sm/md/lg/pill, shadow none on segmented active (flat).
- Density variants (receptionist requirement): Compact (row 36) / Regular (row 44) / Spacious (row 52). Every list-row component gets a density variant. **In Figma: bind to Kura Sizing collection modes Compact / Cozy / Comfortable.**
- Currency: every price has dual display — `$8` primary, `៛32,800` secondary (rate 4,100). Component prop `currency: USD | KHR` flips primary/secondary. **In Figma: `Cart / PriceText`.**

### 0.2 Order kinds (6) — icon + tone set

visit (blue) · lab (jade) · imaging (terracotta) · ecg (rose) · vitals (violet) · telecon (green). Doctor surfaces use lab only; receptionist uses all 6. **In Figma: `Cart / KindIcon`** — Patient/Flask/Scan/Heart/Blood Drop/TeleConsultation icons on ramp-50 bg + ramp-600 fg (Info/Success/Warn/Danger/Purple/Success-700).

### 0.3 Personas & where the cart appears

| Surface | Persona | Cart form |
| --- | --- | --- |
| Reception 6-step check-in wizard | Receptionist | Sticky right rail, always visible across steps |
| Doctor patient chart | Doctor | Quick Order panel (right rail card) |
| Doctor order wizard (4 steps) | Doctor | Read-only draft card right rail |
| Lab catalog page | Doctor | Sticky catalog cart (items-first) |
| Bookings list / booking detail | Doctor | Edit-tests inline panel/modal |
| Lab result (flagged) | Doctor | Reflex add-on card |
| Mobile patient page | Patient | (out of scope here — see KuraDCM Specs C.1.1) |

---

## 1. Component: TestPicker

The single test-selection component. Figma variants: `layout = full | cards | mini`, `density`, `persona = reception | doctor`. **In Figma: assembly `TestPicker — full (reception)` + `TestPicker — mini (QuickOrder dropdown)`; row = `Cart / TestRow`.**

### 1.1 Views (tabs inside picker)

1. **Suggested** ("Smart") — AI + previous tests merged. Each row carries a ReasonHint ("LDL was 162 mg/dL", "T2DM follow-up · due"). Doctor: ranked by patient conditions. Reception: AI + history.
2. **Bundles** — curated packages (Annual physical, Diabetes follow-up, Cardiac risk, Antenatal, Pre-employment…, 14 total). Bundle row: name, purpose line, component pills (first 3 + "+N"), honest sum price, Add-all button. State: partially-in-cart ("2 of 6 already in cart — add remaining 4"). **`Cart / BundleGroup` State=Partial.**
3. **Previous** — patient's historical orders, with date chips; sensitive results masked behind "Sensitive" badge.
4. **Categories / Panels** — reception: 30 diagnostic panels grid (General Health, STDs, Cancer, Cardiology, Diabetes…); doctor: 12 lab categories chips with counts.
5. **Search** — global, always available `/` field; searches name + code (HBA1C) + category; top-8 dropdown in mini layout.
6. **Booking-code intake** (reception only) — input `BC-XXXXXXX-XXXX`; states: empty → valid-format → resolved (shows the prescribed test list with checkboxes, "Add all") → invalid → already-consumed ("This code was already used · {date}"). **Built: `Booking-code intake — states` strip (5 states).**

### 1.2 TestRow anatomy (build as one component, many bool props)

`[KindIcon] [Name + code chip] [badges…] [meta line] [price] [Add/Added button]`

- Badges (each on/off): ⭐ Popular · ✨ Suggested + reason tooltip · Prev (with last date) · Sensitive · Coverage badge (4 states: "Covered 80% · Forte" green / "Not covered" gray / "Unconfirmed" amber outline / "Pre-auth required" amber → **`Cart / CoverageBadge`**) · Unavailable ("Reagents restocking · back 7 May" + "Notify me" link, row dimmed, Add disabled).
- Meta line: TAT (clock icon, "Same-day", "STAT 60 min") · sample type · prep flags (see 1.3).
- Price: dual currency (**`Cart / PriceText`**).
- Button states: Add (+) → Added (✓, jade, click removes) → flying-to-cart micro-animation (reception).
- Row states: default / hover / added / disabled-unavailable / disabled-explorer (locked, tooltip "Verify your MoH license to order"). **`Cart / TestRow` — 5 state variants; toggle badge layers per use.**

### 1.3 PrepBadge set (4)

Fasting (9–12h) · Alcohol-sensitive · Drugs/meds-sensitive · Vaccine-related. Icon + short label; tooltip with full text. Shown in TestRow meta AND in CartLine. **`Cart / PrepBadge`.**

### 1.4 Filters bar (reception full layout)

Price range slider + presets (<$10, $10–25, >$25) · Coverage filter (All / Covered / Not covered) · clear-all chip. Keyboard hints footer: `/ search · 1–9 views · ↑↓ navigate · Space add · Shift+Enter add & continue`. **Built into picker assembly.**

---

## 2. Component: CartRail (the cart itself)

Figma variants: `grouping = by-kind | flat`, `mode = editable | readOnly`, `density`, `state` (see 2.6). **In Figma: 9 `Rail /*` assemblies.**

### 2.1 Structure top→bottom

Header (title + item Counter + currency toggle USD/KHR + focus-mode expand) → Item lines (grouped) → Bundle groups → Promo block → Totals block → slot: ChargeBlock → slot: CheckinGate / CTA → footer (TAT estimate strip).

### 2.2 CartLine anatomy — **`Cart / CartLine`, 7 variants**

`[KindIcon] [Name (+bundle origin small)] [PayerChip] [badges: prep, coverage, consent] [price] [remove ✕]`

- PayerChip 5 variants: Direct (violet) / Insurance (blue) / Corporate (green) / Family (terracotta) / Other (gray). Click → opens payer popover (or Bill-split modal). **`Cart / PayerChip`.**
- Line sub-row (expandable): per-payer responsibility split — "Insurer pays $6.40 · Patient $1.60" (State=Split).
- Locked line (auto visit fee): no remove ✕, lock icon, tooltip "Visit fee — added automatically" (State=Locked).
- Supplemental line (added after payment confirmed): amber left border + "Added after payment" tag (State=Supplemental).
- Reflex line: ✨ tag "Reflex add-on · same sample" (State=Reflex).
- Consent badge on imaging lines: see §5 (State=Consent).
- Cancelled: strikethrough + Voided tag (State=Cancelled).
- Qty stepper only where qty>1 makes sense (reception services); default hidden.

### 2.3 Bundle group — **`Cart / BundleGroup` (Collapsed / Expanded / Partial)**

Collapsible: bundle name + purpose + n items + sum; children indented CartLines; "Remove bundle" affordance; removing last child removes group.

### 2.4 Promo block — **`Cart / PromoBlock` (Empty / Applied / 4 error states)**

Input + Apply; applied promo chips (code + label + −amount + ✕). Error states: "Code not found" / "Already applied" / "Conflicts with {CODE} — one percent discount max" / "Staff code — requires staff patient". Order of application: item-promo → fixed → percent.

### 2.5 Totals block — **`Cart / TotalsBlock` (Collapsed / Expanded / Supplemental)**

Collapsed: "Patient pays **$23.40**" + chevron. Expanded rows: Subtotal → promo lines (−) → "Insurance covers −$X (Forte 80%)" → "Corporate covers −$X" → divider → **Patient due** (24/medium) → payer split chips ("Direct $20 · Insurance $3.40"). KHR mirror line under total. Supplemental mode: "Previously paid $30 (R-58291) → New balance due $14".

### 2.6 Cart states (all 9 built as `Rail /*` assemblies)

1. Empty — quiet state: "No tests yet — pick from the catalog" (+ reception: auto visit-fee already listed).
2. Building — n items.
3. Blocked-explorer (doctor T0): cart visible, checkout CTA locked + "Verify license →".
4. Payment-pending / waiting (KHQR).
5. Paid — green receipt strip (receipt id, method, time) + receipt actions (Print / SMS / Email / Telegram).
6. Paid-then-edited interception — see §4.4 modal; result = Supplemental rail.
7. Checked-in / Placed — immutable: lines lose ✕, header tag "Checked in 09:42" / "Order placed".
8. Cancelled — strikethrough lines, "Refunded/Voided" payment tag, "Restore order" link.
9. ReadOnly (doctor wizard draft card) — no controls, live mirror of selections.

---

## 3. Component: PatientAttach — **`Cart / PatientAttach` (8 parts)**

Used by doctor wizard step 1, catalog cart, (reception keeps its own 6-step identity flow but reuses rows).

- Search field "name, phone, ID, or Khmer name…".
- Result groups: **Your panel** (selectable rows: avatar, name + Khmer, age/sex, MRN, TierBadge) and **Kura-wide records** (provenance-only row: "In Dr. Lim's panel · BKK2", TierBadge, single action "Bridge →"; never opens chart).
- TierBadge 3 variants: T1 phone-confirmed (jade outline) / T2 ID-verified (jade solid) / T3 cold (amber). **`Cart / TierBadge`.**
- Create-new (phone-first): phone field +855; live dedup states:
    - **Hard match** — field turns amber, banner "This person already exists at Kura" + actions [Bridge to your panel →] [Override — create new (logged)].
    - **Soft name match** — non-blocking info panel "Similar names exist Kura-wide. Verify by phone."
    - Rate-limit state: "Slow down — high lookup rate triggers an audit entry" (button disabled), counter "N of 30 lookups today · audited".
- OTP verify (bridge consent): 6-box input, resend 30s, masked confirm card (name "C••••••y S•k", age band "45–49") → [Yes, it's them] / [No, not this person] → mismatch state: "Bridge rejected · audit logged · support paged · no PHI revealed".
- Identity tier upsell block on create: default "T3 · Cold — no insurance billing", 3 paths: Telegram verification (Recommended) / Capture ID at cabinet / Skip for now.

---

## 4. Payment system

### 4.1 Component: ChargeBlock — **`Cart / ChargeBlock` (7 states)**

Variants by `context = reception-step6 | doctor-psc | reflex` and `state`.

**Pay-when selector** (doctor-psc): [Pay now — Recommended · +40% show-up] / [Pay later — at PSC counter].

**Method tiles**: Cash / KHQR (+ Insurance claim where clinic route). Disabled tiles carry reason tooltip ("No amount due", "Patient has no insurer on file").

**Cash flow states**:

1. Tendered input (USD or KHR) + quick-amount chips ($5/$10/$20/exact).
2. Change line auto-calc ("Change: $1.60 / ៛6,560").
3. Confirm enabled when tendered ≥ due.
4. **Cash-in-hand confirm modal** (doctor PSC + pay-now + cash): "Did you collect the cash? Confirm you have **$X.XX** from {Name} in your hand right now." [No, not yet] / [Yes, I have $X.XX] — note "recorded in reconciliation log". **`Cart / Modal` Type=Cash confirm.**
5. Confirmed: drawer-ding moment, receipt strip.

**KHQR flow states**:

1. Pushed — QR on customer display / sent via Telegram; "Waiting for customer to scan…" + countdown (10:00).
2. Confirmed (webhook) — auto.
3. Manual fallback button "Mark as received".
4. Expired — "QR expired" + [Regenerate].

**Other rails**: Pay later → status chip "Deferred — collect at counter/Step 6". Insurance → "Pending claim → Claimed" chips. Zero-due → "Fully covered — nothing to collect" (waived).

### 4.2 PaymentState chips — **`Cart / PaymentState` (11 variants)**

Pending · Waiting (KHQR) · Collected/Paid (green) · Deferred · Pending claim · Claimed · Refunded · Voided · Supplemental due (amber) · Waived · No charge.

### 4.3 Receipt strip — **`Cart / ReceiptStrip` (Paid / Voided)**

Amount + method icon + receipt id mono + time + cashier; actions row Print / SMS / Email / Telegram (each toasts).

### 4.4 Paid-edit interception modal — **`Cart / Modal` Type=Paid edit**

Trigger: any cart mutation after payment confirmed. Copy: "This order is already paid (R-58291 · $30)." Options (3 buttons):

- **Add as supplemental** — keep receipt, collect only the difference.
- **Void & recompute** — cancel receipt R-58291, recollect full new total.
- **Cancel edit**.
Result states feed §2.5 supplemental totals.

---

## 5. Consent system (reception)

### 5.1 ConsentGate on imaging CartLine — **`Cart / ConsentBadge` (5 states)**

Badge progression: `Needs consent` (amber) → `Sent — awaiting signature` (blue) → `Signed ✓ {time}` (green) / `Verbal ✓ by {nurse}` (green outline) / `Pregnancy gate — blocked` (danger).
Inline panel actions: [Send sign-off to patient device] / [Record verbal consent].

### 5.2 Verbal consent modal — **`Cart / Modal` Type=Verbal consent**

Nurse name + timestamp auto; if item `sensitive` (HIV/STI/genetic): supervisor PIN field + "witnessed" checkbox; audit note "Logged to audit trail".

### 5.3 Pregnancy gate modal — **`Cart / Modal` Type=Pregnancy gate**

Trigger: female patient + imaging/pregnancy-risk item added. "Any chance the patient could be pregnant?" [No] → clears. [Yes] / [Unsure] → doctor-override section (name + signature) before imaging unblocks. Declined → item stays blocked with badge.

---

## 6. CheckinGate (reception CTA zone) — **`Cart / CheckinGate` (4 states)**

- Blockers list ("Still needed"): each line icon + text, e.g. "Patient full name", "Date of birth", "≥1 verified contact (OTP or Telegram)", "Payer for 2 items", "Imaging consent — 1 unresolved", "Teleconsult — book or skip", "Payment — collect, defer, or $0".
- CTA "Check in & confirm order": disabled until empty list; enabled (brand); done state "✓ Patient checked in 09:42" (cart freezes).
- Variant for doctor: "Place order ✓" / "Place STAT order ⚡" (red) with gates: ≥1 test, patient attached, route chosen, not Explorer.

---

## 7. RoutePicker + STAT — **`Cart / RouteCard` (5 variants)**

- Route cards (variants `2-option compact` for QuickOrder, `3-card detailed` for wizard):
    1. **I draw the blood — Tube pickup at cabinet**: meta "Courier (no medical contact) · Next pickup today 16:40".
    2. **Kura draws — PSC walk-in**: "Code + QR via Telegram/SMS · Closest PSC BKK1 (1.2 km)".
    3. **Home blood collection** — badge "Phase 2 · Coming soon", disabled.
- STAT toggle (red): per-route copy variants —
    - pickup: "Dispatch courier now (~30 min) · STAT fee $X · lab priority · 2h TAT panel".
    - walk-in: "Patient must go to PSC now — URGENT SMS, no STAT fee". SMS preview block (verbatim message with 🚨 + booking code).
- Selecting route updates right-rail context card (CourierRouteCard / WalkinPSCCard) — both + STAT variants.

---

## 8. TubePrep (doctor in-clinic flow) — **`Cart / TubeRow` (6) + `Cart / TubePrep` (5 parts)**

Phase banner: "Preparing order · **Not yet placed**" (order commits only at sweep confirm).

1. **Tube list** (derived minimal set): row per tube — color dot (EDTA purple / SST gold / urine cup), tube name + volume, tests grouped under it, sample ID placeholder. Tube colors stay literal hex (not theme tokens) by design.
2. **Method tabs**: Scan (default) / Print.
    - Scan: 3-step instruction (peel n labels → stick 1 per tube → scan each); per-tube scan state: pending (dashed) → scanned ✓ (sample ID mono) with Undo; scanner modal states: starting / scanning (camera frame + guide) / linked ✓ / errors: no-camera, unsupported browser, unknown code ("Not a Kura sticker"), duplicate ("Already used on tube 2").
    - Print: printer chip NO PRINTER → CONNECTED (Zebra/Brother), [Print n labels], per-label barcode preview.
3. Gate: "Continue · Ship to lab" disabled until all scanned — "⚠ Scan 2 more tubes first".
4. **Ship to lab**: sweep card "Next sweep · 14:15–14:30 — Sok S. visits daily · leave bag at reception" + urgent alternative; [Confirm — tubes ready] → success: 4-char handover code (large mono `Cart / CodeDisplay` Type=Handover) "Read this code to the rider".

---

## 9. ReflexPrompt (add-on on existing sample) — **`Cart / ReflexPrompt` (5 phases)**

1. **Detected**: trigger headline "TSH 0.01 — suggests FT3 + FT4 on the same sample · No new draw needed" + countdown "Sample expires in 47h"; panel rows (FT3 $7, FT4 $7, total $14); payment rail picker (4 radio cards): KHQR via Telegram (Recommended — 1-tap approve) / Auto-debit (pre-authorized — runs immediately) / Insurance Forte (auto-claim if ICD-10 E05.x) / Skip (re-draw later). CTAs [Approve & request payment] / [Skip reflex].
2. **Patient-pending**: "KHQR sent via Telegram · $14 — auto-cancels at 48h if unpaid" + [Resend] [Cancel reflex].
3. **Running**: "Reflex panel running · same sample · results ~4h".
4. **Completed**: paid line + interpretation ("suppressed TSH + elevated FT3/FT4 suggests primary hyperthyroidism") + [Check results].
5. **Declined/Expired**: "Sample discarded after 48h — patient must return" + [Reconsider] (only while sample alive).
Flowsheet sentinels (lab table): "⏱ awaiting pay" / "⏱ ETA 4h" cell chips.

---

## 10. EditTestsDiff (edit existing booking) — **`Cart / EditTestsDiff` (Editing / Pristine / Locked)**

Inline (under booking row) and modal variants.

- Current tests list; newly added rows get jade "New" chip; removed collected in red "Marked for removal" group with undo.
- Search-add (top 8 results), live total.
- Save disabled unless dirty ∧ ≥1 test ("No changes yet" / "Order can't be empty").
- Locked state: panel replaced by policy card — "Tubes already at lab — edits locked · call Kura ops"; policy tooltip lists rights with expired ones struck through (add/remove until tubes leave clinic; change route/patient until money collected; cancel until paid or at lab).
- Save result toast: "Updated FZ48210 · +2 added · −1 removed".

---

## 11. OrderSuccess cards — **`Cart / OrderSuccess` (4 kinds)**

- **PSC**: big booking code (clickable → mobile preview); masked phone "+855 12 ••• 4471"; nearest PSC line (address · distance · open hours); payment status line.
- **Clinic sweep**: "Pickup scheduled — Tubes ready · 14:15–14:30 · Sok S."
- **Clinic urgent**: handover code display.
- **Generic (catalog/wizard)**: KO- ref + "Code + QR sent via SMS + Telegram" + [Open {name}'s chart] [Back].

---

## 12. Cross-cutting states matrix (QA checklist for every component)

| Dimension | Values to design |
| --- | --- |
| Persona | reception / doctor |
| Tier gate | T0 Explorer locked / T1 verified / T2 billing |
| Density | compact / regular / spacious |
| Currency | USD-primary / KHR-primary |
| Cart phase | empty / building / review / awaiting-prep / placed / editing / cancelled |
| Payment | idle / collecting-cash / waiting-khqr / confirmed / deferred / pending-claim / claimed / waived / refunded / voided / supplemental-due |
| Consent | n/a / needed / sent / signed / verbal / pregnancy-blocked |
| Item flags | auto-locked / supplemental / reflex / unavailable / sensitive / bundle-child |
| Errors | promo invalid ×4 / scan errors ×4 / dedup hard+soft / rate-limit / OTP mismatch / KHQR expired |
| Responsive | desktop rail 360–420px / tablet sheet / mobile bottom-sheet (CartSheet) |

## 13. Figma file organization (as built in `Final Cart` section)

- **00 · Cover** — title, kind-tone legend, density + currency notes.
- **02 · TestPicker** — full reception picker (search `/`, tabs, filters, suggested rows, kbd hints) · booking-code intake 5-state strip · mini QuickOrder dropdown.
- **03 · CartRail lifecycle** — 9 rails: Empty / Building / Blocked-Explorer / Payment pending / Paid / Supplemental due / Checked in / Cancelled / ReadOnly draft.
- **04 · Doctor surfaces** — Quick Order panel (✨ ranked, route, Place/STAT) · Catalog cart (items-first, attach-at-checkout nudge).
- **01 · Component library band** — 20 variant sets: KindIcon · PrepBadge · CoverageBadge · PayerChip · TierBadge · PaymentState · PriceText · CodeDisplay · TestRow · ConsentBadge · CartLine · BundleGroup · PromoBlock · TotalsBlock · ChargeBlock · ReceiptStrip · Modal · CheckinGate · RouteCard · TubeRow · TubePrep · ReflexPrompt · EditTestsDiff · OrderSuccess · PatientAttach.
- Prototype wiring per state machine in KuraDCM Specs A.2.8.

---

## Changelog — 2026-06-11 gap fill (build now ~98% of spec)

Added to the `Final Cart` section, zone **06 · Spec gap fill**:

- **Picker views** completed: Bundles (rows with component pills "+N", honest sum, Add-all, partial state) · Previous (date chips, result deltas, Sensitive masked "tap to reveal", Reorder) · Panels & categories (reception 9-of-30 panel grid + doctor 12 category chips with counts). Filters bar gained the price range slider ($4–$18 demo).
- **`Cart / RouteContext`** (new set, 4): Courier / Courier STAT / Walk-in / Walk-in STAT — right-rail card after route commit.
- **`Cart / PayerPopover`** (new): payer select + "Split between payers…" → **`Cart / Modal` Type=Bill split** (percent shares, 100% rule, pre-auth note).
- **`Cart / Modal` Type=Scanner**: camera viewport + dashed guide + linked/error states (not-a-sticker, duplicate, no-camera→Print).
- **`Cart / ChargeBlock` State=KHQR confirmed** (webhook auto-confirm).
- **`Cart / TubePrep`** += Part=Method tabs (Scan/Print segmented) and Part=Scan steps (peel → stick → scan).
- **`Cart / PatientAttach`** += Part=Search ("Name, phone, ID, or Khmer name…").
- **`Cart / EditTestsDiff`** += State=Modal (booking-detail variant wrapping the inline editor).
- **`Cart / ConsentInlinePanel`** (new): inline actions under imaging line — Send to patient device / Record verbal.
- **Rail anatomy restored** on R2: currency toggle USD/KHR + focus-expand icon + TAT footer strip.
- **Demos**: grouping=by-kind rail (kind section headers with counts/sums) · density rows Compact 36 / Cozy 44 / Comfortable 52 · **KHR-primary rail** (R2b, toggle flipped, ៛ primary) · **CartSheet** mobile bottom sheet 390 (grabber, condensed lines, sticky LG CTA; tablet = same anatomy as side sheet).

Intentional divergences from this spec (per design direction): borderless/hairline style; TestRow rows carry no decorative pills (full badge sets live in the component band); CartLine is single-currency at line level (totals carry the KHR mirror) and shows ✕ only on Hover.

---

## Re-organization — 2026-06-11 (final layout)

`Final Cart` section is now 8 stacked zone containers (sunken bg, numbered headers), top → bottom:

- **00 · Kura Unified Order Cart** — cover: kind legend, density/currency principles.
- **01 · Atoms & primitives** — KindIcon · PriceText · CodeDisplay · PrepBadge · CoverageBadge · PayerChip · TierBadge · ConsentBadge · PaymentState.
- **02 · TestPicker** — TestRow states · full reception picker (search/tabs/filters+slider/kbd) · Bundles / Previous / Panels views · booking-code intake · mini dropdown.
- **03 · Cart anatomy** — CartLine · BundleGroup · PromoBlock · TotalsBlock · by-kind grouping demo · density demo · KHR-primary rail.
- **04 · Payment** — ChargeBlock · ReceiptStrip · PayerPopover · Modal set (cash confirm / paid edit / verbal consent / pregnancy gate / bill split / scanner).
- **05 · Identity · consent · gates** — PatientAttach · ConsentInlinePanel · CheckinGate.
- **06 · Logistics & post-order** — RouteCard · RouteContext · TubeRow · TubePrep · ReflexPrompt · EditTestsDiff · OrderSuccess.
- **07 · End-to-end flows** — three labeled role rows with arrows: Receptionist R1→R8 · Doctor clinic-draw D1→D6 · Doctor PSC walk-in P1→P6 + CartSheet mobile.

Tall variant sets are arranged 2-column inside their set frames (Modal, PatientAttach, ChargeBlock, ReflexPrompt, EditTestsDiff, TubePrep, CartLine, PromoBlock, PaymentState, TestRow).
