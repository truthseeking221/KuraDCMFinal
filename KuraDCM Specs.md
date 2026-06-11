# Kura — Product Analysis: Lab Orders · Patients · Bookings

In-depth analysis of the entire application, extracted from source code (src/App.jsx ~17,000 lines, Auth.jsx, Onboarding.jsx, Signing.jsx, pdfGenerators.js). Analysis date: 10 Jun 2026. In-app demo date: "Saturday, 9 May 2026".

## 0. APPLICATION OVERVIEW

### 0.1 What is Kura

Kura is a doctor-facing web application for Cambodia, solving the problem: private-practice doctors (cabinets) ordering blood/urine tests for patients without owning a lab. Kura provides:

- A PSC network (Patient Service Center — sample collection points): 12 locations in Phnom Penh + provinces (BKK1, Tuol Kork, Siem Reap, Battambang…).
- Couriers/shippers picking up samples at clinics on daily sweep routes ("scheduled sweep" — the "milkman" model).
- Patient communication via Telegram + SMS (Telegram is the dominant channel in Cambodia).
- Payments: cash, KHQR (Cambodia's national QR payment), insurance (Forte EmCare, NSSF).
- MoH (Cambodia Ministry of Health) legal compliance: lab orders (Dx) and prescriptions (Rx) as e-signed PDFs, mandatory ICD-10 codes.

This is a frontend-only prototype (React + Vite): auth via localStorage, mock in-memory data, no real backend. Order/booking state does not persist across reloads (by design).

### 0.2 Doctor tier model

| Tier | Name | Permissions |
|------|------|-------------|
| T0 | Explorer | Browse-only: catalog, 1 demo patient (Sokha Chann), product tour. No real orders, no legal documents. |
| T1 | Verified clinician | MoH license verified (eKYC): real PHI, lab orders, care plans, telehealth, public directory profile. |
| T2 | Billing-enabled ("done") | License + e-signature + bank account: receives insurance payments ("Kura takes 0%"). |

eKYC flow (4 steps): License (MoH license number + photo) → Identity (liveness selfie + national ID/passport) → Practice (cabinet name, address, phone, specialty — becomes the letterhead on documents) → Review & submit. Promise: "same-day verification".

Patient identity tier model (Bridge Tier):

- T3 · Cold — unverified, cannot bill insurance.
- T1 · Phone confirmed — patient self-confirms via Telegram.
- T2 · ID verified — national ID captured (self-capture via TG bot or at the clinic).

### 0.3 Navigation map

Top bar: Kura logo · global search (⌘K) · "+ Order labs" button · notification bell.

Sidebar — Workspace:

| Group | Item | Status |
|-------|------|--------|
| Core | Patients | Live |
| Core | Bookings (Orders) | Live |
| Core | Lab catalog | Live |
| Daily org | Inbox / Calendar / Tasks | Coming soon |
| Clinical | Telehealth / Care plans | Coming soon |
| Pharmacy | Dispensary / Supplies / Pharma calls | Coming soon |
| Business | Dashboard / Billing & Payments | Coming soon |
| Growth | Refer & earn (+$50) | Live (promo) |

Sidebar — Cabinet: Directory profile (preview) · e-Signature (Signing.jsx).

User menu (bottom left): Members, Preferences, Account/Org settings, Sign out.

Standalone pages via query param (bypassing the shell):

- `?bookingDemo=<code>` → the patient's mobile booking page (430×932 popup).
- `?prescription=<code>` → Dx lab order document (A4, printable).
- `?rx=<code>` → Rx prescription (payload passed via `localStorage["kura.rx.<code>"]`).
- `?reset=1` → clears all demo state.

Notable architecture decision: no dedicated booking/pickup detail page by URL — courier status is shown inline in the Bookings list; details expand inline (expand row).

### 0.4 Auth & Onboarding (context)

Magic-link sign-in: email → "Check your inbox" (shortcut opens Gmail/Outlook…) → enter OTP code. The email contains both the 6-digit code and a sign-in button (defends against enterprise link-scanners burning tokens). Google + Telegram OAuth supported. The login screen auto-detects language (EN/KM/VI).

Workspace auto-created from browser locale → new users land straight in the app at the Explorer tier (KYC deferred).

Doctolib-style onboarding: a modal with 3 directions — "Explore the lab catalog" (2 min), "Meet Sokha — demo patient" (3 min), "Verify your licence" (5 min, opens eKYC); a "First steps" widget at the bottom right tracks progress.

Demo accounts: pierretison19101994@gmail.com (T2, full data: 1.2k patients, 12 bookings); verified@gmail.com (T1, no billing yet); any other email → Explorer, 1 demo patient.

### 0.5 Preferences

- Lab units: SI (mmol/L, µmol/L) ⇄ Conventional/US (mg/dL) — converted at display time, source data unchanged (glucose ×0.0555, creatinine ×88.4, HbA1c % → mmol/mol…). Applies to both values and reference ranges, app-wide.
- Language: full English / partial Khmer ("drug names, units, and test codes always stay in English" — clinical safety).
- Theme: Light / Dark / System.

---

# PART A — LAB ORDERS

## A.1 Screens & components

### A.1.1 OrdersListView — "Recent bookings" list

The doctor's order-tracking hub. Header: "Bookings / Recent bookings — Track status, sign reports, and re-book" + "+ New booking" button.

- Explorer/empty state: "No bookings yet" empty state + MoH license verification CTA.
- 7-column table: Booking (mono code) · Patient (name + MRN) · Tests (chips) · Status (pill) · ETA · When · Actions.
- Search: by booking code, patient name, MRN, test name.
- Filter pills with counts: All · Today · Scheduled · In progress · Awaiting visit (derived filter: in-progress + PSC route — placed but the patient hasn't shown up) · Results back.
- Status pill: results-back "Results back" (jade) / in-progress "In progress" (amber) / scheduled "Scheduled" / "Cancelled" (strikethrough, 60% dim).
- ETA column (getOrderEta) — "what happens next" text, folding in the route: "Voided" / "Reported" / "Draw {when}" / "Visit {when}" / "Rider arriving" / "Rider ~20m" / "Sweep · 14:15" / "At lab" / "Awaiting visit".
- 3 actions per row: ✏️ edit tests (locked when cancelled) · 📤 resend booking slip (locked when cancelled) · ✖ cancel booking (only when scheduled/in-progress; locked tooltip: "Locked — tubes already at lab").

### A.1.2 OrderDetailView — booking detail

Breadcrumb Bookings › {code} + RelatedLinkBar (Patient chip always present; Pickup chip when a pickup record is attached to the booking — opens a new tab via the localStorage bridge).

Header: booking code ("FZ" + 5 chars), status pill, payment pill (getPaymentMeta), red "Flagged" pill when abnormal results exist. Subline: patient (click opens chart), route + icon, time, payment method + total.

BookingProgressStrip — 5 stages: Created → Scheduled → Sample → Results → Reported. "Reported" is only reached when results-back AND flagged === 0 (abnormal results hold the booking at "Results" until the doctor reviews).

Edit/cancel policy — explicit business rules:

- paymentSettled = payment "Collected"/"Paid"
- tubesAtLab = status "results-back"
- editsLocked = tubesAtLab ∨ cancelled → locks the Edit button
- cancelLocked = tubesAtLab ∨ cancelled ∨ paymentSettled → locks the Cancel button

Policy tooltip (expired rights struck through): add/remove tests until tubes leave the clinic; change route/patient until money is collected; cancel while money is uncollected and samples haven't reached the lab; "Once tubes reach the lab — everything locks, call Kura ops to amend."

Cancelled bookings have a "Restore order" link (demo).

Live tracking area: CourierTrackingCard (in-clinic + in-progress) or LiveETACard (ETA matrix by status × route — see C.2.8).

Tests card: each test with results when results-back (HbA1c 9.4% high → red; Microalbumin 34 mg/g → amber; Vit D 22 low; TSH 0.01 high — triggers reflex), "Awaiting results" otherwise.

ReflexTestingCard when order.reflexCandidate && results-back && TSH < 0.5 (see A.2.6).

Right column: Timeline (Created 9:14 → Scheduled → Sample 10:42 → Results 14:30 → Reported 15:01) · Billing ("Insurer: Forte · pending") · Notify patient ("Send Telegram reminder", hidden when cancelled).

### A.1.3 OrdersView — 4-step order wizard

Eyebrow "Orders · drafting" (+ red STAT badge when enabled). Accepts prefill from Quick Order on the chart → skips step 1, shows a "Quick order from chart" banner. StepNav: 1 Patient · 2 Tests · 3 Sample routing · 4 Confirm. Contextual right column: OrderDraftCard (always) + CourierRouteCard/WalkinPSCCard (steps 3–4 only).

### A.1.4 LabCatalogView — test catalog

"Every test Kura runs — 26+ assays". Reference ranges follow the doctor's US/SI preference.

- Personal library: FavoritesCard + BundlesCard (empty by default, managed via CatalogPicker) — resurfaces in the QuickOrderPanel on the chart.
- Search by name/code (HBA1C)/category; category chips with counts: All, ⭐ Favorites, Diabetes, Lipids, Renal, Liver, Thyroid, Hematology, Cardiac, Infectious, Vitamins, Hormones, Tumor markers.
- Each test row: tube icon, name, mono code chip, category, "⭐ Popular" badge; meta line TAT (clock) + sample type (drop) + preparation (fasting); dual pricing $8 / 32,000៛ ("Prices in USD · paid in KHR or via insurer"); ⭐ favorite button + +/🗑 cart button.
- Empty state → "Suggest a missing test" CTA; permanent footer "Test you need isn't here? Submit a request…".
- Adding a test → CatalogCart appears in the right column (12 → 8+4).

### A.1.5 SuggestTestModal — suggest a new test

"Doctor demand → lab ops backlog". Fields: Test name (required, pre-filled from query) · Sample type (if known) · Urgency: ASAP ("Blocking patient care now") / Within 1 mo / Nice to have · Expected volume: 1–5 / 6–20 / 20+ per month · Reason (optional). After submit: "lab-ops reviews weekly; if a vendor is already being qualified you'll get an ETA".

### A.1.6 CatalogCart — catalog cart

4-phase state machine: cart → patient → review → placed.

- Cart: list + total; CTA "Continue · find patient" — locked for Explorer: disabled button + lock + message "Explorer mode… requires an MoH license. Verify license →".
- Patient: search by "name, phone, ID, or Khmer name…", "+ Add new patient" (opens NewPatientModal), recents list (max 6).
- Review: patient summary ("Chart"/"Change" links), tests + prices, Route with 2 options: "Draw in clinic" / "Send to PSC", total, "Place order".
- Placed: generates code KO-{MRN digits}-{4 random digits}; "Booking code + QR sent via SMS + Telegram"; "Preview on mobile" link; CTA "Open {name}'s chart" / "Back to catalog".

### A.1.7 QuickOrderPanel — quick ordering from the patient chart

State machine: cart → route → placed-psc | placed-clinic-needs-pickup → placed-clinic-pickup-done.

- Cart: "AI suggested" group in the hero position — per patient (Sokha T2DM/HTN: HbA1c $8 "Glycemic control · due", Lipid $18 "LDL was 162", Microalbumin $12, CMP $15); Common group (CBC $9, TSH $12, Vit D $22, Urinalysis $6); fallback search box over the full LAB_CATALOG (top 8). CTA "Where to draw?".
- Route: 2 options "Draw in clinic" / "Send to PSC" (Home draw deliberately excluded — belongs to the telehealth context). PSC → shows the "Charge patient" block (see A.2.4). CTA relabels: "Draw blood" / "Send to PSC".
- placed-psc: success card with a large booking code (click → mobile preview), masked phone "+855 12 ••• 4471", nearest PSC "55 St. 178 · BKK1 · 1.2 km", payment status line.
- placed-clinic-needs-pickup: "Preparing order" + "Not yet placed" badge — in-clinic orders only commit when the doctor confirms tubes are ready (PSC commits as soon as the slip is sent). Contains the tube-labelling flow (A.2.5).
- placed-clinic-pickup-done: "Pickup scheduled" — regular sweep: "Tubes ready · 14:15–14:30 · next sweep · Sok S."; urgent: 4-character pickup code "read out to the rider at handover".

### A.1.8 BarcodeScannerModal — tube barcode scanning

Webcam + BarcodeDetector API (Code 128 + fallback). Validates the Kura sticker format `/^26\d{10}$/` (12 digits, prefix 26). States: starting → scanning → linked; errors: no-camera, unsupported, unknown (non-Kura code), duplicate (sticker already assigned to another tube in the order).

## A.2 Detailed flows

### A.2.1 Order wizard (4 steps)

**Step 1 — "Who's the patient?"** (search-first, realtime dedup)

- Unified search: the doctor's panel + Kura-wide records (other doctors' panels, PSC visits) by name/phone/ID/Khmer name. No query → "Recent in your panel" (top 5).
- Results in 2 groups: "Your panel" (direct select) and "Kura-wide records" (T1/T2 tier badge, provenance "In Dr. Lim's panel · BKK2", "Bridge →" button).
- Create mode: phone-first — the phone is the dedup key. From 8 digits on, realtime checks:
  - Hard phone match (last 8 digits match Kura-wide) → input turns amber + banner "Hard phone match — this person already exists at Kura": choose "Bridge to your panel →" or "Override — create new (logged)" (doctor-tier only, written to the audit trail).
  - Soft name match (≥3 chars, no hard match) → non-blocking info panel: "Similar names exist Kura-wide. Verify by phone… different phones, different people."
- Identity tier block: defaults to "T3 · Cold — no insurance billing until upgraded", 3 upgrade paths: ① "Send Telegram verification" (recommended, T3→T1, self-captured ID via TG bot → T2 — "the doctor doesn't photograph anything") ② "Capture national ID at cabinet" (T3→T2, for elderly/low-tech patients) ③ "Skip for now" (order runs as cash/self-pay).
- Validation: the create button locks if name is missing, phone <8 digits, or an unresolved hard match remains.

**Step 2 — "Pick tests"**

- "✨ Suggested for {patient}" with clinical reasons: HbA1c "T2DM follow-up", Lipid "Lipid trend (last LDL 142)", LFT "Statin monitoring", Creatinine "Renal screening".
- "Browse catalog": category chips (Chemistry, Hematology, Endocrinology, Immunology, Microbiology, Molecular, Allergy, Pap, Urinalysis) + TestCard (name, price, TAT).
- "Continue to routing" locked until at least one test is chosen.

**Step 3 — "Who draws the blood?"** (route + STAT)

- Group A — "I draw the blood": pickup "Tube pickup at your cabinet" — the doctor draws, Kura couriers collect on regional routes. Meta: "Courier (no medical contact)" · "T3 identity from your labels" · "Next pickup: today 16:40".
- Group B — "Kura draws the blood":
  - walkin "Booking code → patient walks into a Kura PSC" — patient receives code + QR, reception records identity (T1), a phlebotomist draws. "Closest PSC: BKK1 (1.2 km)".
  - dispatch "Home blood collection (HBC)" — "Phase-2 launch · Coming soon", disabled.
- STAT toggle (red, "STAT — urgent routing"), copy changes by route:
  - pickup: "Dispatch courier now (~30 min ETA)" + STAT fee + lab priority + SMS to patient. 2h TAT on the STAT panel (CBC, BMP, troponin, lipase, lactate).
  - walkin: "Patient must go to PSC now" — URGENT-framed SMS, no STAT fee (the patient transports themselves).
- STAT is an order attribute that propagates into SMS, dispatch, and the lab queue.
- Button locked until a route is chosen ("Pick a draw method to continue").

**Step 4 — "Confirm and place"**

ConfirmBlocks (each with "Edit"): Patient · Tests (n) + Subtotal (+ red STAT fee if any) · Sample routing (description per choice) · Billing ("{insurer} · billed direct… Patient owes at draw: $0.00") · "Patient will receive" (SMS + Telegram with code + QR + prep instructions; Smart report on the portal when results arrive; signed legal report).

Footer: "Save as draft" + "Place order ✓" (jade) / "Place STAT order ⚡" (red).

Persistent right column: OrderDraftCard (live summary) · CourierRouteCard (pickup route — Sopheap T.'s direct route KH-3401, stops, "ETA your cabinet 16:40"; STAT → "STAT dispatch initiated ~30 min") · WalkinPSCCard (nearest PSC; STAT → verbatim SMS preview: "🚨 URGENT — Dr. Chann needs blood work now… Booking code: 7K-2294").

### A.2.2 Catalog → Cart → Order

Browse the catalog → "+" adds a test (cart appears) → Explorer gate blocks checkout → pick/create a patient → review (clinic/PSC route) → "Place order" → KO- code → success screen (mobile preview, open chart).

### A.2.3 Quick Order — PSC branch

Pick tests (AI suggested / common / search) → "Where to draw?" → "Send to PSC" → payment decision (A.2.4) → send → friendly booking code (2 letters + 5 digits, excluding confusable characters I/O/0/1) → commits as soon as the slip is sent → success card.

### A.2.4 PSC payment — the conversion lever

The "Charge patient" block when route = PSC:

- Pay now ("Recommended" badge, "+40% show-up rate") vs Pay later ("At PSC counter").
- Pay now → Cash ("Collected at clinic now") or KHQR ("Sent to patient via Telegram").
- Friction branch: PSC + Pay now + Cash → CashConfirmModal blocks before placing: "Did you collect the cash? Confirm you have $X.XX in cash from {name} in your hand right now" — written to the reconciliation log. Buttons "No, not yet" / "Yes, I have $X.XX". All other combinations place directly.

### A.2.5 Quick Order — in-clinic branch: label → scan/print → ship to lab

"Draw in clinic" → "Draw blood" → state "Preparing order · Not yet placed".

The system computes the minimal tube set via tubesForTests (grouping tests by tube type: HbA1c & CBC → purple EDTA 3mL; Lipid/CMP → yellow SST 5mL; TSH & VitD → SST 3mL; urine → 10mL cup) + generates 1 sample ID per tube (Code-128, 12 digits, prefix 26).

Two labelling methods ("Scan" / "Barcode" tabs):

- Mobile scan (default): ① peel {n} labels from the Kura roll ② apply 1 label per tube ③ scan each tube to assign its ID (scanner modal; rejects malformed/duplicate codes; per-tube Undo/Redo). "Continue · Ship to lab" locked until all are scanned ("⚠ Scan {n} more tube(s) first").
- Thermal printer: ① link a printer (Zebra ZT411/Brother, NO PRINTER → CONNECTED chip) ② print {n} labels ③ apply — with a per-label barcode preview.

Ship to lab — the scheduled sweep model ("like the milkman… no dispatch, no surcharges"): "Next sweep · 14:15–14:30 — Sok S. visits BKK1-route cabinets daily, leave the tube bag at reception" → "Confirm — tubes ready" → generates a 4-character handover code → the order now officially commits into Bookings → "Pickup scheduled".

### A.2.6 Reflex testing — state machine

Trigger: an abnormal result matching a rule — demo: TSH 0.01 mIU/L (severely suppressed) → suggests FT3 + FT4 on the same sample ("No new draw needed"), sample-expiry countdown ("Sample expires in 47h"; "the lab holds the sample, auto-discard at 48h").

States: detected → patient-pending → running → completed | declined (expiry noted).

- detected: suggestion panel (FT3 $7 + FT4 $7 = $14) + "How does the patient pay?" — 4 ways: ① KHQR via Telegram (Recommended — "patient approves $14 in one tap") ② Auto-debit (pre-authorized at booking — "Frictionless, runs immediately without notification") ③ Forte EmCare insurance ("auto-claim if the reflex is covered under ICD-10 E05.x") ④ Skip (schedule a re-draw — slower). CTA "Approve & request payment" / "Skip reflex".
- patient-pending: "KHQR sent via Telegram · $14 … Auto-cancels at 48h if unpaid." Actions: Resend Telegram, Cancel reflex.
- running: "Reflex panel running · same sample. Results expected within 4h."
- completed: "paid $14 — suppressed TSH with elevated FT3/FT4 suggests primary hyperthyroidism" → "Check results" scrolls to lab history.
- declined: "Sample discarded after 48h… the patient must return" → "Reconsider" link.

### A.2.7 Maintenance from the list

- Edit booking tests inline (without leaving the list): search-add from the catalog (top 8), remove, live total, diff toast "+2 · −1". Save locked when nothing changed or 0 tests remain.
- Resend slip: anti-spam confirm modal ("double-pings reduce Telegram open-rates") → toast "Resent {code} · Telegram + SMS".
- Cancel booking: pre-lab only; consequences listed by route; "collected cash must be refunded manually".
- Suggest test: a demand-signal pipeline for lab ops.

### A.2.8 State machine summary

| Machine | States |
|---------|--------|
| Order status | scheduled → in-progress → results-back (+ cancelled overlay) |
| Progress strip | Created → Scheduled → Sample → Results → Reported (Reported only when flagged=0) |
| Booking meta | Confirmed → Redeemed / Cancelled |
| PSC payment | Cash/KHQR: Pending → Collected; cancel → Refunded |
| Clinic payment | "Insurance · Forte": Pending claim → Claimed; cancel → Voided |
| Courier | unassigned → assigned-elsewhere → en-route-to-you → arrived |
| Pickup record | pending → assigned → en-route → arrived → completed / cancelled |
| Reflex | detected → patient-pending → running → completed / declined |
| CatalogCart | cart → patient → review → placed |
| QuickOrderPanel | cart → route → placed-psc \| placed-clinic-needs-pickup → placed-clinic-pickup-done |
| Scanner | starting → scanning → linked / errors: no-camera, unsupported, unknown, duplicate |
| Doctor tier | explorer → verified → done |
| Patient identity | T3 Cold → T1 (TG phone) → T2 (national ID) |

## A.3 Jobs to be Done — Lab Orders

- "Order the right tests for this patient in under a minute, without leaving the chart." — QuickOrderPanel with AI suggestions ranked by underlying conditions.
- "Extend my clinic's reach without owning a lab." — In-clinic draw + courier sweep turns every cabinet into a collection point ("Geographic reach extension").
- "Get blood drawn for patients I can't/won't draw myself." — PSC walk-in route: code + QR, Kura phlebotomist.
- "Handle clinically urgent cases." — STAT: courier ~30 min or URGENT SMS, front of the lab queue, 2h TAT, push + SMS when results land.
- "Never lose a sample to mislabelling." — minimal tube set, Code-128 labels, scan-assign with duplicate rejection, handover code read to the rider.
- "Know where every order is without phoning anyone." — list ETAs, live courier map, progress strip, "Awaiting visit" filter to chase patients who haven't shown.
- "Avoid creating duplicate patients across the Kura network." — phone as the dedup key, bridge banner on hard match, soft-match warning, audited override.
- "Collect the right money and keep cash transparent." — pay-now (+40% show-up), cash/KHQR/insurance, cash confirmation modal feeding the reconciliation log.
- "Act on abnormal results immediately without a second needle." — reflex testing within the 48h window, patient approves via KHQR in Telegram.
- "Fix bookings after placing them." — add/remove tests, change route, resend slip, cancel — under explicit policy, locked once samples reach the lab.
- "Know what a test costs, requires, and means before ordering." — catalog with USD/KHR pricing, TAT, sample type, fasting, US/SI reference ranges.
- "Speed up high-frequency repeat orders." — favorites + bundles.
- "Influence the lab's menu." — Suggest-a-test with urgency + volume.

## A.4 User Stories — Lab Orders

**Bookings list**

- As a doctor, I want to see every booking with patient, tests, status, and a forward-looking ETA, so I can track all orders at a glance.
- As a doctor, I want to search by booking code, name, MRN, or test name, so I can find one order among many instantly.
- As a doctor, I want filter pills with counts (All / Today / Scheduled / In progress / Awaiting visit / Results back), so I can triage my workload.
- As a doctor, I want the "Awaiting visit" filter (PSC orders where the patient hasn't shown), so I can chase no-shows.
- As a doctor, I want to edit a booking's tests right in the list, so I can add a forgotten test without reopening the whole order.
- As a doctor, I want to resend the booking slip — behind a confirm dialog — so I can help a patient who lost their code without spamming the channel.
- As a doctor, I want cancellation to be possible only while scheduled/in-progress, with route-specific consequences spelled out, so I never void samples already at the lab.
- As an unverified doctor (Explorer), I want the empty state to explain that an MoH license unlocks ordering, so I know exactly what's blocking me.

**Order detail**

- As a doctor, I want the booking's full identity (code, status, payment, flagged, route, total) in one header, so I can answer any patient call in seconds.
- As a doctor, I want a visual progress strip (Created → Scheduled → Sample → Results → Reported), so I can see progress without reading a log.
- As a doctor, I want live courier tracking (rider name, plate, ETA, call/message buttons) when a rider is heading to me, so I can time the handover.
- As a clinic in a multi-clinic network, I want the courier map hidden while the rider is on another clinic's pickup, so other clinics' operations stay private.
- As a doctor, I want the edit/cancel policy displayed clearly (tooltip striking through lost rights), so I understand why a button is locked instead of just hitting a wall.
- As a doctor, I want results shown inline per test with reference ranges and high/low/warn colour flags, so abnormal values jump out.
- As a doctor, I want a one-button Telegram reminder to the patient, so a missed booking code doesn't kill the visit.
- As a doctor, I want related-entity chips (patient, pickup) opening in new tabs, so I can cross-navigate without losing the order context.

**Order wizard**

- As a doctor, I want to search my panel and Kura-wide (name/phone/ID/Khmer name) in one box, so I find the patient no matter where they first registered.
- As a doctor, I want a hard phone match to surface a "Bridge to your panel" action with provenance and identity tier, so I reuse an existing identity instead of splitting it.
- As a doctor, I want overriding a hard match to be deliberate and logged to the audit trail, so shared-phone cases remain workable but accountable.
- As a doctor, I want soft name matches to be informational, not blocking ("verify by phone… different phones, different people"), so common Khmer names don't block creation.
- As a doctor, I want new patients to default to T3 (cold, no insurance billing) with a Telegram-first self-serve verification path, so identity upgrades cost the clinic zero time.
- As a doctor with elderly/low-tech patients, I want a national-ID capture fallback at the cabinet (T3→T2), so no patient is excluded.
- As a doctor, I want a "skip for now" path that runs as cash/self-pay, so unverified identity never blocks care.
- As a doctor, I want patient-specific test suggestions with clinical reasons ("Lipid trend (last LDL 142)"), so routine monitoring panels are one tap.
- As a doctor, I want to choose who draws the blood — me at the cabinet (courier collects) vs Kura (PSC walk-in, future HBC) — so logistics match my practice style.
- As a doctor, I want HBC badged "Coming soon / Phase-2" and disabled, so I know the roadmap without being misled.
- As a doctor, I want the STAT toggle's copy, fee, SMS framing, and TAT to change with the chosen route, so I know exactly what urgency costs and triggers.
- As a doctor, I want to preview the verbatim walk-in STAT SMS (🚨 URGENT… with booking code), so I know what the patient will read.
- As a doctor, I want the confirm step to list patient, tests + prices, routing, billing ("Patient owes at draw: $0.00"), and what the patient receives, so nobody is surprised.
- As a doctor, I want "Save as draft" next to "Place order", so an interrupted consult doesn't lose the order.
- As a doctor, I want the right column to show the order draft + courier/PSC route cards only on steps 3–4, so logistics context appears only when relevant.
- As a doctor coming from a patient chart, I want step 1 prefilled and skipped (with a dismissible banner), so quick order is actually quick.

**Catalog & cart**

- As a doctor, I want to browse every assay with code, category, TAT, sample type, preparation, and dual USD/KHR pricing, so I can order and advise cost-sensitive patients accurately.
- As a doctor, I want to filter by 12 clinical categories with counts and a "Popular" badge, so common tests are within reach.
- As a doctor, I want a US ⇄ SI reference-unit toggle per my preference, so reference ranges match how I was trained.
- As a doctor, I want to star favorites and create named bundles in the catalog, so routine panels are one tap in quick order.
- As a doctor, I want to build a multi-test cart before picking the patient, so I can order "catalog-first" when the starting point is the test, not the patient.
- As an Explorer doctor, I want the cart checkout locked with a "Verify license →" prompt, so I can rehearse the flow before verifying.
- As a doctor, I want to suggest missing tests with urgency ("ASAP — blocking patient care now") and monthly volume, so lab ops prioritizes by real demand — and to be notified when the test goes live.

**Quick order, payment & logistics**

- As a doctor, I want AI test suggestions ranked by this patient's own conditions with a "why" hint, so I trust and act on the suggestions.
- As a doctor, I want every catalog test findable from the quick panel's search box, so the compact panel never forces me into the full catalog.
- As a doctor sending a patient to a PSC, I want to charge now (cash or KHQR-via-Telegram) or at the PSC counter, and to know "Pay now" lifts show-up by +40%, so I maximize order completion.
- As a doctor collecting cash, I want a hard confirmation ("Yes, I have $X.XX") feeding the reconciliation log, so till discrepancies are caught at the source.
- As a doctor, I want the PSC success card to show the booking code, masked phone, nearest PSC with distance/hours, and a "Preview as patient on mobile" link, so I can check exactly what the patient receives.
- As a doctor drawing in clinic, I want the order held at "Not yet placed" until I confirm tubes are ready, so Bookings never shows samples that don't physically exist.
- As a doctor, I want tests auto-grouped into a minimal tube set (purple EDTA / yellow SST / urine cup, with volumes), so I draw the fewest tubes.
- As a doctor, I want a 12-digit Code-128 sample ID per tube and a peel-stick-scan webcam flow that rejects malformed/used stickers, so sample identity is assigned at the bench, error-proofed.
- As a doctor, I want Undo/Redo on each scanned tube, so a mis-stick is recoverable.
- As a clinic with a thermal printer, I want to link a Zebra/Brother, print labels, and preview each barcode, so labelling matches the hardware I already own.
- As a doctor, I want the free daily courier sweep at a fixed window ("Next sweep · 14:15–14:30 · Sok S.") and an urgent on-demand option with a 4-character handover code, so transport matches urgency.
- As a doctor, I want to read the pickup code out to the rider, so the right rider takes the right tubes.

**Reflex testing**

- As a doctor, I want rule-based reflex suggestions (TSH < 0.5 → FT3 + FT4 on the same sample) with a sample-retention countdown, so I avoid a second draw.
- As a doctor, I want 4 reflex payment paths — KHQR Telegram (one-tap patient approval), pre-authorized auto-debit, insurance auto-claim by ICD-10, or skip — so payment friction doesn't kill a clinically urgent add-on.
- As a doctor, I want pending-payment reflexes to auto-cancel at 48h with resend/cancel buttons, so a held sample never hangs forever.
- As a doctor, I want completed reflex results interpreted in context ("suppressed TSH + elevated FT3/FT4 suggests primary hyperthyroidism") with a jump-to-flowsheet button.

---

# PART B — PATIENTS

## B.1 Screens & components

### B.1.1 PatientsView — "Today" dashboard

The home screen. Header: date + time-of-day greeting ("Good morning, Dr. Chann.") + "All 184 bridged patients in view" (pulsing jade dot).

TodayStrip — "Today — six threads need your attention", 6 SignalCards: ① "5 new results" (3 in range · 2 flagged) ② "8 patients off-target" (HbA1c, LDL trending up) ③ "Pickup at 16:40" (8 tubes awaiting courier · Sopheap T.) ④ "2 claim updates" (1 paid · 1 needs info · Forte) ⑤ "12 due for follow-up" (care plan cadence) ⑥ "2 referrals incoming" (Dr. Lim · Dr. Kosal, CTA "Open referrals").

Explorer: replaced by an onboarding card "Today — nothing here yet… 1 demo patient (Sokha Chann)… Verify your license".

Toggle: "Your panel (184)" vs "Referrals (2)" (ReferralsPanel — inbound/outbound referrals + reply letters).

Filter chips: All (184) · Off-target (8) · Overdue (14) · Unreliable (6) · No-show (4).

CohortTable: per row — FlagDot (critical red / warning amber / ok jade / muted grey), name, subline Khmer name · age+sex · MRN, clinical signal ("HbA1c 9.4% · trending up 2 quarters"), up to 2 tag pills, lastSeen. Row click opens the full chart.

### B.1.2 PatientDetail — quick-view pane

Preview card: MRN · ShieldCheck badge "Bridge: T1/T2" · insurance; name + Khmer name + age/sex + "last seen". Buttons: Call, Telegram, "Open chart →". AI recap banner (summary + "Next step:"). Tabs: flowsheet | trend (Recharts 5 quarters, dashed target line) | care plan (items typed Lab/Rx ongoing/Rx new/Telehealth + due) | notes | claims — each tab with an honest empty state.

### B.1.3 PatientDetailFull — full chart workspace

Breadcrumb "← Patients › {name} {MRN}".

Airbnb-style sticky header: details at the top, collapsing on scroll (collapse >120px, reopen <40px to avoid flicker). 64px avatar tinted by flag, 28px name, primary-problem pills (active red / managed jade), Khmer name, age/sex, MRN, masked phone, insurance, last seen. AI recap folds into the header ("longitudinal summary, refreshed daily").

Left column (8/12): ReflexTestingCard (only patient P-4421 Channary Sok — flagged TSH; reflexPhase is lifted so Lab history reacts: FT3/FT4 don't appear until approval + payment) · LabTrendTable.

Right column (4/12, sticky, independently scrolling): ① QuickOrderPanel ② PatientBookingsCard ③ "Suggested nudge" card (Sokha only) ④ MedicationsCard, DiagnosesCard ⑤ AllergiesCard, InsuranceCard, AlertsCard, VaccinationsCard ⑥ DocumentsCard ⑦ bento pair "Hospital refer — Surgery · imaging" / "Schedule — Cabinet · tele".

Quick-order feedback loop: order placed → a new booking row prepends with a sparkling "New" badge, the Bookings card scrolls into view, jade border glows ~3.8s then auto-fades.

isSokha vs scaffold: Sokha Chann (P-9134) is the data-rich demo patient (4 conditions E11.65/E78.5/I10/K76.0, 6 vitals, 4 active meds, sulfa allergy, 6 encounters, 8 lab panels, documents, AI suggestions). Every other patient gets honest sparse defaults: 1 condition, 4 normal vitals, 1 med, "no known allergies", 2 encounters, lipid panel only, 0 bookings/documents — "so the panel is honest about a brand-new chart".

### B.1.4 Right-column chart cards

- PatientBookingsCard: count + empty state "No bookings yet…". Each row: booking code, tests, when, status pill. Actions: Edit (scheduled only, opens EditBookingTestsPanel inline) · Reorder (clones the order with the same tests, new KO- code, scheduled status — even for cancelled orders) · Cancel (scheduled/in-progress).
- MedicationsCard: empty by default ("most patients arrive with 0 meds on file"). AI prescription suggestions (Sokha only): Empagliflozin 10mg OD (SGLT2i — trigger "A1c 9.4% · microalbumin 34", rationale "CV + renal protection"), Lisinopril, Atorvastatin 40mg. Added only on doctor click; added meds are editable (parseRxDose splits the dose; OD/BID/TID/QID/PRN sigla translated to plain language).
- DocumentsCard: ECG / chest X-ray / abdominal ultrasound — click opens the PDF ("the PDF is the source of truth; the row is just a pointer"). "+ Upload".
- DiagnosesCard: active ICD-10 codes + X remove button; "✨ AI suggestions" section: E11.65 (trigger "HbA1c 9.4% · trending up", confidence high), I10 ("BP 146/92 · 3 visits"), E78.5, N18.3 (confidence low). One-tap add; nothing auto-adds — the doctor has full control.
- AllergiesCard / InsuranceCard / AlertsCard: default "unknown" — "the realistic starting state of every new patient": Allergies "Not on file — capture at next visit"; Insurance "self-pay / No insurer on file" (when known: Forte, last claim Pending 2d, YTD billed $284.50 / paid $236); Alerts need labs+vitals+meds to run rules ("A1c trending up 4 quarters · consider SGLT2i").
- VaccinationsCard: 3 states keyed off the HBsAg result: unknown → "unscreened" + CTA "Order HBsAg"; vaccinated → ok; non-vaccinated → "susceptible" (red) + CTA "Order vaccine" — lab results lead directly to vaccination action.
- EncounterRow: lab/visit/rx/claim/tele timeline with distinct icons.
- TierBadge: T1 phone confirmed / T2 ID verified (jade) / T3 cold (amber).

### B.1.5 LabTrendTable — lab trend matrix

The heart of the chart: a panel × date-column matrix.

- Header "Lab history" + disabled "Import results [soon]" button (paste a lab PDF/photo, Kura extracts values).
- Toolbar: test/panel search · time range 7d / 3mo / 6mo / All (default 6m) · Collapse/Expand all.
- Filter warning banner: "You're viewing a filtered range — N earlier draws are hidden" + "Reset to all".
- Columns: newest first; "Today" column highlighted; per-cell age labels ("3mo ago", "1yr 2mo ago").
- Panel row (collapsible): name · "N tests" · "N abnormal" (red) · "last draw Xmo ago".
- Test row: unread dot (session-tracked), name, reference + unit (shown once per row), TrendDots sparkline (dots coloured by flag; BP drawn as systolic↔diastolic candles), LabValueChip cell coloured red/amber/jade; "—" when empty; tests without a reference → neutral grey; reflex sentinels: `_pending_pay_` → "⏱ awaiting pay", `_pending_run_` → "⏱ ETA 4h".
- Qualitative panels (STD/STI 13 tests with 1 "Positive" Gonorrhea NAAT; dipstick Neg/Trace/1+/2+/3+) are not expandable — no trend math.
- InlineTrendExpansion (row click): status headline ("Above range"…), large latest value + date + reference, "Order again" button; Recharts chart with RangeBar (BP: BPRangeBar with 2 normal zones, clinical ReferenceArea bands, custom tooltip).
- Re-test scheduling card (only when the latest value is out of range): "Re-test out-of-range biomarker — Recommended re-test in N months" (HbA1c defaults to 3 months) → choose 1/3/6 months → "Re-test scheduled · {date} — Reminder sent to patient via Telegram" + undo.
- Combined-chart panel: "Cycle hormones" — clicking E2/LH/FSH/P4 opens a 4-line overlay by cycle day, "ovulation" marker at day 14, per-day phase-specific reference bands.
- Units: useLabUnits flows through format/convert everywhere (chips, charts, references).

### B.1.6 PatientsListView — patient directory

Header "Your patients — All patients you've bridged into your cabinet" + "+ New patient".

Search "name, Khmer name, MRN, phone…" (matches Khmer script too) + Filters button.

Sortable table: Patient / Age·Sex / Last seen (default, lastSeenScore parses "today"/"3wk ago"/"2mo ago"; "210 days ago" → "7 months ago") / Status / Action.

Kura-wide search (privacy-by-design): network records are never browsable — they only appear with a query AND doctor opt-in (includeKuraWide). Purple badge "Search-result only · not your panel". Rows show provenance instead of clinical data ("In Dr. Lim's panel · BKK2", "Last seen at PSC BKK1, 1y ago"). Charts can't be opened — the only action: "Bridge to panel →". "Identity index integrity matters: doctors can't browse other doctors' panels."

### B.1.7 Action panels & modals

- RxWriterPanel — "Write prescription / Phase 1: PDF for any pharmacy": formulary typeahead (Empagliflozin, Dapagliflozin, Sitagliptin), Frequency OD–PRN, Duration 30/60/90/indefinite, Refills 0–5, free-text Sig; "Send to Kura pharmacy" checkbox (Phase 4); "Sign & PDF Rx". Right column: drug-interaction check ("✓ No major interactions — DDI source: First Databank, DECISION 24") + allergy check (warning "Patient has known allergy: Sulfa drugs").
- IcdPickerPanel — "Add ICD-10 diagnosis · Attaches to encounter and claim": searches 8 codes; codes already on the chart disabled "Already on chart"; note "ICD-10 in v1 (DECISION 21) · Cambodian payers haven't moved to ICD-11".
- ScribePanel — floating voice-notes widget ("speech to SOAP note"), browser Web Speech API (continuous, auto-restarts on silence). States: idle/recording/paused/summarizing; minimizes to a "Recording · MM:SS" pill. Languages: English US/UK, Français, ភាសាខ្មែរ (km-KH). Error handling: unsupported browser, mic denied. "Audio stays on-device."
- ConsultationNotePanel — Doctolib-style WYSIWYG note editor: "Reason for visit" (motif, seeded from the transcript's first sentence); contentEditable editor seeded from the scribe or scaffoldForPatient — every AI-attributed heading prefixed ✨ ("review before signing"); toolbar B/I/U/S, lists, block formats, Dictate, Regenerate; side rail: auto-extracted vitals (BP/Weight/Height/HR — "on Sign & lock, values flow into the flowsheet"), Suggested ICD-10 codes, Templates (T2DM follow-up, Hypertension review, URI/cold, Sports/school cert, Annual check-up); footer "Save draft" / "✓ Sign & lock".
- HospitalReferralModal — 3 steps (see B.2.7).
- NewPatientModal — phone-first dedup + OTP (see B.2.1).
- NudgePanel — Telegram re-engagement (see B.2.8).

## B.2 Detailed flows

### B.2.1 Create / look up a new patient (NewPatientModal)

Phone-first → lookup → verify → confirm-or-reject:

- lookup — "Look up by phone. Phone is the dedup key." +855 fixed, 8–9 digits. Footer: "N of 30 lookups today · audited"; lookups too fast (>2 within 800ms) → "Slow down — high lookup rate triggers an audit entry" + button locked (anti-enumeration).
- Registry branches:
  - no-match → "Phone is new in Kura" → create form.
  - own-panel → "Already in your panel" → "Open existing record →" (blocks duplicate creation).
  - otp (match in another panel / Kura-wide) → "We sent a 6-digit code to +855 12 ••• 345. Ask the patient to read it out — entering the code confirms they are the person on the record." 6-box OTPInput (paste-fill, auto-advance), resend after 30s.
- confirm — masked identity card: masked name ("C••••••y S•k"), age band instead of exact age ("45–49"), sex, MRN, provenance. "Yes →" adds to the panel + opens the chart; "No, not C••• →" → mismatch branch.
- mismatch — "Code holder is not the patient": bridge rejected + audit-logged; Kura support paged; "No PHI is revealed — the chart never opens for this lookup."
- create — form: Latin name, Khmer name (optional), age, sex (M/F/Other), insurance (Self-pay/Forte/NSSF). Note: "On save, the patient receives a Telegram welcome with an ID-confirmation link (T3 → T1)."

### B.2.2 Find & open a chart

Patients list → type name/Khmer name/MRN/phone → in-panel match → click opens PatientDetailFull. 0 results → suggests enabling "Also search Kura-wide" or creating new. Kura-wide results: provenance only, single action "Bridge to panel →". From the Today dashboard, cohort rows go straight to the full chart.

### B.2.3 Quick order from the chart

QuickOrderPanel (right column, always present) → place the order → toast → booking auto-prepends into PatientBookingsCard ("New" badge + glow + scroll). From any booking: 1-click Reorder, Edit tests while scheduled, Cancel. From the lab table: "Order again" inside the trend expansion.

### B.2.4 Prescribing

MedicationsCard "+ Add" / accept an AI candidate (shows trigger + rationale), or RxWriterPanel: search the formulary → frequency/duration/refills → Sig → automatic DDI check + allergy check → "Sign & PDF Rx" (Phase 1 = a PDF accepted by any pharmacy; Phase 4 = route to a Kura pharmacy).

### B.2.5 Picking ICD diagnoses

(a) DiagnosesCard → one-tap add from AI suggestions (with trigger evidence + confidence); (b) IcdPickerPanel → search code/description → "Add". Codes "attach to encounter and claim".

### B.2.6 AI scribe → draft → note editor

1. Tap the mic FAB → ScribePanel.
2. Pick a language (Khmer included) → Start → speak; live transcript accumulates; Pause/Resume/Stop; minimize to a pill and keep working.
3. "✨ Summarize → draft note" → buildNoteFromTranscript classifies sentences into HPI / Examination / Labs · today / Assessment / Plan (regex on plan verbs, lab tokens, exam tokens), generates ✨-flagged HTML + a "✨ Source transcript" blockquote + a "Personal notes" block.
4. The scribe closes, seeding ConsultationNotePanel.
5. The doctor edits WYSIWYG, adjusts auto-extracted vitals, adds suggested ICD codes, Regenerates/Dictates more, applies a template → "Save draft" or "✓ Sign & lock" (vitals flow into the flowsheet).

### B.2.7 Hospital referral

- Step 1 · Pick a service: Surgery / Imaging / Specialty consult / Inpatient admission / Mental health / Rehab·PT.
- Step 2 · Pick a destination: hospitals "ranked by Kura partner tier, distance from the patient, insurance match" — each card: distance, next slot ("Tomorrow 14:00", "Bed available"), cost band ("$1,200–$1,600", "Public · $0–$30"), insurance accepted (Forte/NSSF), Kura-partner / Verified / Public tags. "28 partner hospitals · Phnom Penh + Siem Reap."
- Step 3 · Compose the letter: patient summary auto-filled; Urgency: Routine / Urgent (1 week) / Stat (48h); referral reason; specific question; attachments (on by default): 12 months of labs · imaging from Documents · current meds + allergies. "Letter is signed by you · audit-trail logged on send" → "Send referral".
- Sent: code KR-9134-XXXX; estimated response time (stat 1–4h, urgent 24h, routine 2 business days); the patient gets a Telegram when a slot is confirmed; tracked in the Referrals view; withdrawable within 24h before hospital confirmation.

### B.2.8 Patient nudge / re-engagement (NudgePanel)

"Remote nudge — async re-engagement · TG → confirm → e-Rx." 3-step stepper:

1. Draft — "Why nudge" evidence box ("latest HbA1c 9.4% (3 months ago), trending up 4 quarters, SGLT2i recently added — recheck to assess response"); editable bilingual Telegram preview (Khmer opener "សួស្តី {name} — Dr. Chann here…"), walk-in invitation ("BKK1 is 1.2 km away… 30 minutes, no appointment needed") → "Send via Telegram".
2. Sent — sent/seen bubbles; "patients typically reply within 2 hours".
3. Confirmed — patient agrees → "Generate & send e-Rx code".
4. e-Rx sent — code KUR-9134-A1C: HbA1c only · pre-authorized at the PSC · routed to the nearest branch · billed to Forte by patient ID · results return to the chart automatically, auto-signed · expires in 14 days. Alternate channels: voice call / SMS (no TG) / reception call. "The patient doesn't book anything — they just carry the code in." + SMS reminder 1h before closing time.

### B.2.9 Reading lab trends

Open the chart → Lab history → (search test/panel) → pick a range (banner warns of hidden draws) → scan panel summaries (abnormal count, last draw) → read sparklines/BP candles → click a quantitative row → inline chart + reference + latest value → if out of range: Schedule re-test (1/3/6 months, Telegram reminder) or Order again. Cycle hormones → 4-line overlay. Global units mmol/L⇄mg/dL; session-scoped unread dots; reflex FT3/FT4 show "awaiting pay"/"ETA 4h" pills until done.

## B.3 Jobs to be Done — Patients

| Surface | The doctor's real job |
|---------|----------------------|
| TodayStrip | "Tell me, at a glance when I open the clinic, which threads need me today — results, off-target patients, couriers, claims, follow-ups, referrals." |
| Filter chips + CohortTable | "Triage my 184-patient panel by risk (off-target, overdue, unreliable, no-show) instead of flipping through charts." |
| AI recap | "Reload context on a patient I haven't seen in 12 days, in 5 seconds, with a suggested next step ready." |
| LabTrendTable | "See the patient's entire biochemical story — many panels, many years — as one matrix, and know immediately what's abnormal and which way it's heading." |
| Trend + re-test card | "Turn an out-of-range result into a scheduled re-test with a patient reminder in 2 clicks, without leaving the table." |
| Quick order + Bookings card | "Order labs mid-consult and confirm the order landed (status, edit, reorder, cancel) without a context switch." |
| InlinePickupDetail | "Answer 'where is the sample?' — custody chain, courier, ETA — without calling the lab." |
| Medications + RxWriter | "Prescribe safely (DDI + allergy checked) and export something every Phnom Penh pharmacy accepts (PDF), while the system suggests guideline-based meds with reasons." |
| Diagnoses / IcdPicker | "Code correctly for the claim, with evidence-backed suggestions, but I make the final call." |
| Scribe + Note | "Document without typing during the consult — speak (English/French/Khmer), get a clearly AI-flagged SOAP draft, edit, sign." |
| HospitalReferral | "Refer patients for surgery/imaging/specialty care with cost, wait-time, distance, and insurance transparency — with a letter that carries the chart." |
| NudgePanel | "Pull lapsed chronic patients back without an appointment — Telegram nudge → walk-in code — and results close the loop automatically." |
| NewPatientModal | "Add patients without creating duplicates, prove patient consent (OTP read out in front of me), and never expose another doctor's panel." |
| Kura-wide search | "Find a patient who exists somewhere in the Kura network and bridge their record into my care — with privacy guardrails." |
| Context cards | "Know what I don't know — 'unknown' is the honest state that points to what to collect at the next visit; screening results (HBsAg) convert straight into action (order the vaccine)." |
| TierBadge | "Know how much to trust this record (phone-confirmed vs ID-verified vs cold) before acting on it." |
| Unit system | "Read every value in the unit system I trained in (mg/dL vs mmol/L) without mental conversion." |

## B.4 User Stories — Patients

**Dashboard & cohort**

- As a doctor, I want a time-of-day greeting and today's date, so the dashboard feels like my morning desk.
- As a doctor, I want the 6 "Today" signal cards (new results, off-target patients, pickup, claims, follow-ups due, incoming referrals), so I can triage the whole day in one look.
- As an unverified doctor (Explorer), I want an honest empty Today card with 1 demo patient and a "Verify your license" link, so I can evaluate the product before onboarding real patients.
- As a doctor, I want Off-target / Overdue / Unreliable / No-show filter chips with counts, so I work by risk cohort rather than alphabetically.
- As a doctor, I want each cohort row to show a clinical signal sentence ("LDL 178 — uptrending despite statin") with tags and a severity dot, so I can prioritize before opening the chart.
- As a doctor, I want no-show flags ("Missed last 2 HBC bookings") with a suggested move ("Offer phlebotomist dispatch"), so missed bookings become outreach opportunities, not dead ends.
- As a doctor, I want low-trust identity flags ("Identity match low confidence — bridged via napkin intake. Phone unreachable last 2 attempts" + next step "Verify identity at next visit"), so I don't act on shaky records.

**Directory & network search**

- As a doctor, I want to search by Latin name, Khmer name, MRN, or phone, so Khmer-script records are findable both ways.
- As a doctor, I want sortable columns (name, age, last seen) with humanized recency ("7 months ago"), so I find lapsed patients fast.
- As a doctor, I want Kura-wide results to appear only when I type a query AND opt in, so I can find familiar patients without being able to browse colleagues' panels.
- As a doctor, I want Kura-wide rows to show provenance ("In Dr. Lim's panel · BKK2") instead of clinical data, and a "Bridge to panel" action instead of opening the chart, so PHI always sits behind a consent gate.
- As a compliance officer, I want every phone lookup counted ("N of 30 lookups today · audited") and rapid lookups throttled with an audit warning, so the registry cannot be enumerated.

**New patient / bridge / consent**

- As a doctor, I want phone-first lookup as the dedup key, so I never create duplicate records.
- As a doctor, I want duplicate creation blocked when the phone is already in my panel, with a 1-click "Open existing record".
- As a doctor, I want an SMS OTP the patient reads aloud in front of me before another doctor's record bridges into my panel, so record transfer is consent-based.
- As a doctor, I want the post-OTP confirmation card masked (name "C••••••y S•k", age band instead of exact age), so I verify identity without seeing PHI early.
- As a doctor, I want a "No, not this person" path that rejects the bridge, logs an audit entry, pages Kura support, and reveals no PHI, so stolen/shared phones can't leak charts.
- As a doctor, I want the create form to capture Latin name + optional Khmer name, age, sex (M/F/Other), insurance (Self-pay/Forte/NSSF), matching how Cambodian patients are actually identified and pay.
- As a doctor, I want new patients to receive a Telegram welcome with an ID-confirmation link upgrading T3 → T1, so cold records verify themselves.
- As a doctor, I want every chart to display its bridge tier (T1/T2/T3), so I calibrate trust per record.

**Reading the chart**

- As a doctor, I want a sticky header that collapses on scroll but keeps name, MRN, primary problems, and the AI recap, so context never leaves the screen.
- As a doctor, I want a daily-refreshed AI recap with an explicit "Next step", so every visit starts pre-briefed.
- As a doctor, I want chart cards (allergies, insurance, alerts, vaccinations) to default to an honest "unknown" state with collection hints, so missing data is visible rather than faked.
- As a doctor, I want an encounter timeline mixing labs, visits, prescriptions, claims, and telehealth, so the chart reads like a story over time.
- As a doctor, I want imaging documents (ECG/XR/US) to be pointers that open the PDF — the document, not the transcription, is the source of truth.
- As a doctor, I want the vaccination card to turn an HBsAg result into a labelled state (unscreened / ok / susceptible) with the matching CTA ("Order HBsAg" / "Order vaccine").

**Lab trends**

- As a doctor, I want labs grouped by panel with abnormal counts and last-draw age, so I can skip normal panels.
- As a doctor, I want date-range filtering (7d/3mo/6mo/All) with an explicit "N earlier draws are hidden" banner, so filtering never silently hides history.
- As a doctor, I want per-test sparklines and BP drawn as systolic/diastolic candles with clinical bands, because BP is two numbers, not one.
- As a doctor, I want values in mmol/L or mg/dL per my preference, with references converted too, so I never misread magnitude.
- As a doctor, I want qualitative results (STD positive, dipstick 1+/2+) shown as flagged text, with no meaningless trend lines.
- As a doctor, I want unread dots on test rows, so I know which results I've seen this session.
- As a doctor, I want reflex tests to show pipeline status right in the flowsheet ("awaiting pay" → "ETA 4h" → result), so pending values are distinguishable from missing values — and FT3/FT4 only appear after my approval and the patient's payment.
- As a doctor, I want 1-click "Order again" and out-of-range "Schedule re-test" (1/3/6 months, sensible per-analyte defaults, Telegram reminder) right in the trend expansion.
- As a doctor, I want multi-hormone panels (E2/LH/FSH/P4) overlaid on one cycle-day chart with an ovulation marker and phase-specific reference bands, because cycle hormones are only interpretable together.
- As a doctor, I want the (coming-soon) "Import results" path to paste a lab PDF/photo for value extraction into the flowsheet, so outside labs join the trends too.

**Ordering & bookings (in the chart)**

- As a doctor, I want a persistent Quick order panel on the chart, and the resulting booking glowing/scrolling into view, so I get visual confirmation the order landed.
- As a doctor, I want to edit scheduled bookings' tests inline, reorder any past booking in 1 click, and cancel scheduled/in-progress bookings.
- As a doctor, I want booking rows exposing status (Scheduled / In progress / Results back / Cancelled), per-test results once back, route, and total cost.
- As a doctor, I want to send a Telegram reminder for PSC bookings without results yet.
- As a doctor, I want the courier's sample custody chain (drawn → requested → assigned → en route → handed over → delivered) with driver name, ETA, tube list, and a "Call driver" button.

**Prescribing & coding**

- As a doctor, I want AI prescription candidates showing their trigger ("A1c 9.4% · microalbumin 34") and rationale ("CV + renal protection…"), so I can evaluate the suggestion myself.
- As a doctor, I want frequency sigla translated ("OD — Once daily"), so the dropdown is never cryptic.
- As a doctor, I want automatic DDI (First Databank) and allergy checks beside the Rx form before signing.
- As a doctor in Cambodia, I want the signed Rx as a PDF every pharmacy accepts (Phase 1), with a future "Send to Kura pharmacy" route (Phase 4).
- As a doctor, I want ICD-10 suggestions (not ICD-11, per local payers — DECISION 21) with confidence levels, nothing auto-added, duplicates marked "Already on chart", and codes attached to the encounter and claim.

**Documentation (scribe & note)**

- As a doctor, I want hands-free consult recording with pause/resume, a minimized pill, and a live transcript — in English, French, or Khmer.
- As a doctor, I want assurance audio stays on-device, with soft handling when the browser is unsupported or the mic is denied.
- As a doctor, I want "Summarize → draft note" to produce a structured SOAP draft with every AI section ✨-flagged and the source transcript preserved, so provenance survives into the signed record.
- As a doctor, I want auto-extracted, editable vitals flowing into the flowsheet on Sign & lock, so documentation feeds the data model.
- As a doctor, I want note templates (T2DM follow-up, Hypertension review, URI/cold, Sports cert, Annual check-up) and a Regenerate button, so starts are fast.
- As a doctor, I want Save draft vs Sign & lock as distinct states, so unsigned text is never mistaken for a legal record.

**Referral & re-engagement**

- As a doctor, I want to pick a referral service group, then compare destinations by distance, wait time, cost, insurance, and Kura partner tier, so patients get realistic options, not just famous hospitals.
- As a doctor, I want urgency tiers (Routine/Urgent/Stat) with expected response times, an auto-filled patient summary, a "specific question" field, and checkbox attachments (labs / imaging / meds+allergies), so the receiving side gets a complete package.
- As a doctor, I want sent referrals to have a reference code, be signed/audit-logged, notify the patient via Telegram when accepted, be trackable in the Referrals view, and be withdrawable within 24h.
- As a doctor, I want the nudge draft to carry evidence (the why-nudge box) and an editable Telegram message with a Khmer opener before sending, with SMS/voice/reception fallbacks for non-Telegram patients.
- As a doctor, I want a confirmed nudge to generate a scope-limited walk-in e-Rx code (1 test, nearest branch, pre-authorized, insurance-billed, 14-day expiry), so the patient never has to book — and results return straight to the chart, auto-signed.

---

# PART C — BOOKINGS (LIFECYCLE AFTER ORDERING)

## C.1 Screens & components

### C.1.1 MobileBookingPage — the patient-side booking page

Opened via openMobileBooking(code) — a 430×932 popup "simulating what a Cambodian patient sees on Android after the booking code arrives via Telegram". URL `?bookingDemo=<code>`.

- Top chrome: fake status bar (9:41 · 4G · 87%); demo strip with 3 buttons Walk in / Scheduled / Collected; jade header "Kura · Phnom Penh / Your lab order".
- Boarding-pass-style ticket (coloured by state amber/purple/jade): "BOOKING CODE" + 34px mono code; status line: walk-in "Not collected · walk in" / scheduled "Scheduled appointment" / collected "Sample collected". Below a perforated "tear here" line (hidden when collected): "Show this at reception" + 210px QR — payload `https://kura.med/booking?token=<code>` ("production will be a JWT").
- Greeting "Hi Sokha 👋" + state-specific copy, naming the doctor (Dr. Sopheak Chann).
- Walk-in location flow (gpsState: asking → granted | denied):
  - asking: "Find your nearest Kura PSC — save tuk-tuk money and see accurate opening hours." CTA "Share location · find nearest" (real geolocation, 8s timeout); confirmshame-style skip link "I'd rather walk further" (a code comment admits this is a deliberate dark pattern — "real product trade-off worth being honest about").
  - granted: "Nearest to you" — Kura PSC · BKK1, 55 St. 178, "1.2 km · 4 min by tuk-tuk", hours "Mon–Sat · 7:00–17:00" + "Open now" badge, masked phone. Directions button (real Google Maps) + Call PSC (tel:).
  - denied: jade recovery banner + amber banner "Location declined… distances and open-now status are hidden until you share location" → full alphabetical list of all 12 Phnom Penh PSCs, with addresses, no distances.
- Scheduled card: "Your appointment — Mon, 12 May · 09:30", "Bring an ID and your phone with this code"; Add to calendar + Directions buttons.
- Collected card: "Sample collected at Kura PSC · BKK1 · today · 14:18" + 3-step pipeline: ① Sample drawn (done, time) → ② Lab processing (running, "ETA today 17:00") → ③ Results delivered ("We'll notify you on this number").
- Preparation guidance (hidden when collected) — "Before you come" card: "Fast 9–12 hours (water is OK) — required for lipid panel" · "Bring an ID and this booking code" · "Stay hydrated".
- Tests in your order: list (demo: HbA1c, Lipid, Microalbumin); a "Processing" chip per test when collected.
- Dx download: "Download Dx prescription / Legal PDF · e-signed by Dr. Sopheak Chann" → opens `?prescription=<code>` ("Cambodia MoH wants a paper trail for any test order").
- Footer: "Sent to +855 12 ••• 4471 · code valid 7 days / Questions? Reply to this Telegram chat."

Note: the mobile page has no payment UI — KHQR/cash sits on the doctor side; the patient approves KHQR inside Telegram.

### C.1.2 PrescriptionGate — Explorer gate

Shown instead of the Dx/Rx legal documents when tier = explorer: "Dx prescription not available… we need to verify you're an MoH-licensed doctor". Requirements: MoH license number + front photo (verified within 24h), national ID matching the MoH registry, cabinet address for the letterhead. CTA "Verify my license". "Protects patients — and you — from liability when the system is abused."

### C.1.3 PrescriptionPage — Dx lab order (A4)

`?prescription=<code>` — an A4-style HTML page for the patient/PSC/insurance auditor to print or save as PDF ("Download · Print to PDF" button = window.print()).

Content: letterhead (Dr. Sopheak Chann, Médecin Généraliste, License MoH-CB / MPC-2014-3287, Cabinet Médical Chann · BKK1) · bilingual French-English title "Prescription · Ordonnance / Diagnostic Laboratory Tests" (Cambodian convention) · meta (issue date, booking code, 30-day validity) · patient (Sokha Chann, Khmer name ឆាន សុខា, 54F, MRN) · ICD-10 diagnoses auto-attached from the problem list ("MoH requires them on every Dx order so insurance and the audit trail reconcile"): E11.65, E78.5, I10 · clinical indication · tests table (code, sample, preparation) · instructions ("Present this order with an ID at any Kura partner PSC/lab… results return to the prescribing doctor") · signature block by tier: tier done → e-signature + "Verify authenticity at kura.med/verify/<code>"; tier verified → "Signature not on file" + "the document remains legally valid via the license stamp (License-stamped)" · footer "Document ID: kura-rx-<code>-001".

### C.1.4 RxPrescriptionPage — prescription (A4)

`?rx=<code>` — the mirror copy for medication ("the patient takes the PDF to any pharmacy"). Reads real items from `localStorage["kura.rx.<code>"]` (a localStorage bridge so medications don't leak in the URL); demo fallback (Empagliflozin/Lisinopril/Atorvastatin). Adds weight, allergies (NKDA). Per item: PO route, frequency sigla, Quantity = 90 days × doses/day (BID → 180 tablets), Refills 0, templated Sig line. Pharmacist notes: substitute bioequivalent generics, review renal dosing (borderline eGFR), lifestyle counselling, 90-day follow-up. Explorer → PrescriptionGate.

### C.1.5 BookingProgressStrip + OrderDetailView

(Described at A.1.2 — the booking detail is shared between the two modules.)

### C.1.6 Booking modals

- ResendBookingConfirmModal: "Resend booking slip? · Telegram + SMS" — "They'll receive the link, QR, and PSC directions again on both channels." Warning box: "Use sparingly — repeated pings reduce future open-rates on Telegram."
- CancelBookingConfirmModal: red header "Cancel this booking? / This can't be undone." Consequences: N tests voided; PSC → patient notified of cancellation via Telegram + SMS; in-clinic → courier dispatch cancelled; always: "Any cash collected will need to be refunded manually."
- EditBookingTestsPanel/Modal: the centralized test editor, used as a modal or inline beneath the booking row ("replacing the old flow that threw you into the full detail page in edit mode"). Current tests resolve via LAB_CATALOG (unknown names → temporary code, $0 price, still rendered and removable); add via search (top 8); new rows get a jade "New" chip; "marked for removal" list in red; Save locked when not dirty or 0 tests.

### C.1.7 CourierTrackingCard — rider tracking

4-state machine (demo button cycles):

| state | title | chip | map |
|-------|-------|------|-----|
| unassigned | "Awaiting dispatch — a rider will be assigned in the next pickup window" | PENDING (amber) | no |
| assigned-elsewhere | "Rider assigned · finishing another pickup" | ASSIGNED | no — deliberately hidden (the doctor doesn't see Sok's previous pickup — multi-clinic privacy) |
| en-route-to-you | "Driver's on the way to you — prepare the tube bag, read the pickup code at the door" | EN ROUTE (jade) | yes + "ETA 8 min" |
| arrived | "Rider is at your door — hand over tubes, confirm the pickup code" | ARRIVED | yes |

Stylized SVG map + "Live" dot, rider avatar "SK", "Sok S. · 1AB-7234" (plate), Message/Call rider buttons.

### C.1.8 ReflexTestingCard

(Details at A.2.6 — the card appears on the booking detail and on patient Channary's chart.)

### C.1.9 CalendarView — calendar (preview)

Belongs to "Cabinet", preview-locked + Explorer gate. "Schedule F2F follow-ups, telehealth slots, recurring visits. Bookable windows sync to public directory profile." Week grid Mon–Sat × 09:00–17:00 (13:00 empty — lunch), demo slots ("Sokha Chann · T2DM follow-up", "· Telehealth"). Week/Day/Month toggle, "New event". Stats: Booked 10, Open 38, No-show rate 8%, Avg F2F 22 min. Availability rules: Mon–Fri 09–17 F2F + tele; Sat 09–12 F2F; 30-min buffer; the public profile shows the next 4 weeks.

### C.1.10 Bookings in the chart + Pickups

PatientBookingsCard / InlineBookingDetail: (see B.1.4) — inline results when results-back (HbA1c 9.4% high; Microalbumin 34 warn; TSH 0.01 high; VitD 22 low), "Awaiting" otherwise; summary line "N tests · {route} · {when} · $total"; contextual actions: "View results" (results-back) / "Telegram reminder" (PSC, pre-results) / "Cancel".

Pickups (PICKUPS, PickupsListView, PickupDetailView, InlinePickupDetail): pickup records attached to bookings `{ id: "PU-…", bookingId, bookingCode, type: "regular", status, eta, driver }`. List: "Logistics / Pickups — Kura courier pickups for in-clinic draws"; filters Active/En route/Assigned/Completed/All. Detail: Samples to transport (tubes derived from tests via tubesForTests, "i of N") · Chain of custody (6 timestamped steps with actor: Sample drawn (Dr. Sopha 13:42) → Pickup requested → Courier assigned 13:51 → En route 14:02 → Tubes handed over 14:18 → Delivered to lab 14:54) · quick patient card (masked phone, cabinet, insurer, "Open chart") · driver card (★ 4.9 · 248 trips · 14 today, Honda Click · ABC-3492, shift from 07:00, "Call") · metadata "Scheduled sweep · daily".

### C.1.11 pdfGenerators.js — important note

This file does not generate the lab-order/prescription PDFs (those are HTML pages printed via window.print()). It generates imaging diagnostic report PDFs for the chart using jsPDF, drawn with primitives to keep the bundle light: ① 12-lead ECG (2 pages: mm grid, parameterized PQRST waves, measurements table — rate 78, PR 162ms, QTc 442ms, Sokolow-Lyon 38mm flagged, conclusion "Sinus rhythm · LVH criteria met") ② chest X-ray (drawn film, "No acute cardiopulmonary findings") ③ abdominal ultrasound (4 pages, calipers, "Hepatic steatosis · mild"). Shared frame: Kura Clinic letterhead, Report ID KU-XXXXXXX, e-signature block, footer "Confidential… signed and audit-logged". Opened via blob URL in a new tab, revoked after 60s.

## C.2 Detailed flows

### C.2.1 Booking lifecycle state machine

Status: scheduled → in-progress → results-back + a cancelled branch (UI overlay flag). The 5-stage display strip Created → Scheduled → Sample → Results → Reported:

- scheduled = Scheduled stage.
- in-progress = Sample stage (drawn/in transit/at lab).
- results-back + flagged > 0 = held at Results (doctor must review before it counts as Reported).
- results-back + flagged = 0 = Reported (auto-reports; timeline "Reported today, 3:01 PM").
- cancelled = no current stage; trailing "Cancelled" label; ETA "Voided".

Patient-side booking label (getBookingMeta): Cancelled / scheduled → "Confirmed" / results-back → "Redeemed". Derived booking code: "FZ" + (id tail + "00000").slice(0,5) — KO-9134-4821 → FZ48210.

### C.2.2 The three routes

1. PSC pickup — "Slip + QR sent to patient phone"; the patient goes to the PSC themselves (walk-in or appointment).
2. In-clinic draw — "Doctor draws · Kura shipper picks up"; generates a pickup record + courier flow.
3. Home draw — referenced only ("phlebotomist visit · GPS-tracked"), absent from the edit picker (Phase 2).

### C.2.3 Payment states (getPaymentMeta)

- PSC route: method Cash or KHQR; states: cancelled → "Refunded"; scheduled → "Pending"; otherwise → "Collected" (payment settles at draw).
- Clinic route: "Insurance · Forte"; cancelled → "Voided"; results-back → "Claimed"; otherwise → "Pending claim".
- Derived gate: paymentSettled = Collected|Paid.
- Reflex has its own payment rail: KHQR Telegram / pre-auth auto-debit / insurance auto-claim (conditional on ICD-10 E05.x) / skip.

### C.2.4 Edit policy (what's allowed when)

- Add/remove/duplicate tests until tubes leave the clinic.
- Change booking/route/patient info until money is collected.
- Cancel the whole order while money isn't settled and tubes haven't reached the lab.
- Tubes at the lab → everything locks — call Kura ops to amend.

Gates in code: tubesAtLab = results-back (prototype proxy); editsLocked = tubesAtLab ∨ cancelled; cancelLocked = tubesAtLab ∨ cancelled ∨ paymentSettled. In the chart card, editing is stricter: scheduled bookings only.

### C.2.5 Cancelling a booking (refund rules)

A friction modal (cancelling is destructive + triggers refunds + patient notification). Consequences: all tests voided; PSC → patient notified via Telegram+SMS; in-clinic → courier dispatch cancelled; "collected cash is refunded manually" (KHQR/insurance reverse automatically — payment meta flips to "Refunded"/"Voided"). Fully blocked once money settles or tubes are at the lab. The demo includes "Restore order".

### C.2.6 Resending confirmation

Channels: Telegram + SMS simultaneously (link + QR + PSC directions). Anti-spam guidance lives inside the modal. Also reachable via "Send Telegram reminder" (booking-detail right column; inline detail for PSC pre-results).

### C.2.7 Courier & pickups cycle

Booking-side courier states (In-clinic + in-progress only): unassigned → assigned-elsewhere → en-route-to-you → arrived. Pickup record: pending → assigned → en-route → arrived → completed / cancelled, mapping 1:1 to the courier card. Pickups are daily scheduled sweeps. Privacy rule: the live map shows only when the rider is heading to this clinic. Handover ritual: bag the tubes, read/confirm the pickup code at the door. The custody chain logs 6 checkpoints through lab delivery.

### C.2.8 ETA computation — two layers

- computeOrderETA(status, route) (LiveETACard, detail page): cancelled → "Order cancelled / Use 'Restore order'"; results-back → "Results back · 2:30 PM / Review and notify the patient"; scheduled+clinic → "Sample ready in clinic · Awaiting pickup"; scheduled+PSC → "Walk-in window · 9:00 AM–12:00 PM"; in-progress+clinic → "Shipper en route · Pickup ETA 14:30–14:50 · Driver Sok S. · GPS-tracked" (live, "updates 30s"); in-progress+PSC → "Patient checked in · 10:42 AM / Sample drawn at BKK1 · lab ETA today 4:00 PM".
- getOrderEta(order) (the list's "what's next" column): "Voided" / "Reported" / "Draw {when}" / "Visit {when}" / "Rider arriving" / "Rider ~20m" / "Sweep · 14:15" / "At lab" / "Awaiting visit".

### C.2.9 No-show handling

There is no booking-level no-show state. The system's posture: PSC bookings sit at "Awaiting visit" with payment "Pending"; booking codes expire after 7 days (mobile footer); the Dx order is valid 30 days; the doctor can send a Telegram reminder / full resend / cancel. "No-show rate 8%" appears only as a Calendar statistic; patient-level no-show flags live in the Patients cohort.

## C.3 Jobs to be Done — Bookings

**Doctor**

- After ordering labs, give the patient a frictionless path to the draw site (code + QR + directions) with zero clinic logistics.
- Know at a glance which stage every booking is at (progress strip, ETA column) and where the physical sample is (courier card, chain of custody).
- Fix mistakes cheaply — add/remove tests, change routes — within a clearly explained policy window, without calling anyone.
- Cancel safely: understand financial/notification consequences before clicking; be physically blocked when cancelling would corrupt money or samples.
- Capture clinically valuable add-on tests the moment results trigger them (reflex), without recalling the patient for a new draw.
- Generate regulator-grade paperwork (MoH-compliant Dx/Rx orders with ICD-10, license, e-signature) automatically from the order.
- Re-engage patients who haven't shown via Telegram/SMS without burning the channel.
- Review results in context (inline in the chart, flagged values prominent) and reorder routine panels in 1 click.
- Manage clinic capacity (calendar, availability rules, no-show stats — preview).

**Patient**

- Know what was ordered, by whom, and what to do next — in one mobile link.
- Find the most convenient PSC (distance, hours, open-now, directions, phone) — or keep location private at an acceptable cost.
- Arrive properly prepared (fasting, ID, hydration) so the trip isn't wasted.
- Prove identity/booking at reception with a scannable QR.
- Track post-draw progress and know when results land.
- Hold a legal order document (printable PDF) usable at any PSC, partner lab, pharmacy, or for insurance reimbursement.
- Approve incremental costs (reflex) with one KHQR tap inside Telegram.

**Courier (rider)**

- Receive sweep assignments and clear pickup targets (clinic, tubes, pickup code).
- Verified handover (code read-out) feeding the custody chain.
- Be reachable (call/message) without exposing other clinics' jobs.

**Kura ops / lab (implicit)**

- Lock edits once tubes reach the lab; serve as the escalation path ("call Kura ops to amend").
- Hold samples pending reflex decisions with a hard 48h discard rule.
- Reconcile payments (KHQR/cash/claims) and audits (ICD-10 on every Dx order, custody logs, Document IDs, verify URLs).

## C.4 User Stories — Bookings

**Doctor — lifecycle & tracking**

- As a doctor, I want a booking code (e.g. FZ48210) auto-generated at order placement, so the patient, PSC, and courier all reference one artifact.
- As a doctor, I want the progress strip (Created → Scheduled → Sample → Results → Reported) on every booking, so I read status at a glance rather than parsing a form.
- As a doctor, I want flagged results to show a red "Flagged" pill and hold the booking at "Results" instead of "Reported", so abnormal results can't silently self-close.
- As a doctor, I want list rows that say "what's next" ("Rider arriving", "Sweep · 14:15", "At lab", "Awaiting visit", "Draw tomorrow", "Reported", "Voided"), so I need no separate Route column or detail click.
- As a doctor, I want a live ETA card ("Shipper en route · ETA 14:30–14:50 · Driver Sok S. · GPS-tracked", 30s updates), so I can time the handover.
- As a doctor, I want a booking's related entities (chart, pickup) as 1-click chips, so I pivot between clinical and logistics views.
- As a doctor, I want the chart-embedded booking to pulse/"New"-highlight right after placing, so I get confirmation the order landed on the right patient.
- As a doctor, I want to expand a booking row inline and see per-test results with high/warn/low colours, so I triage without leaving the list.
- As a doctor, I want 1-click "Reorder same tests" on any past booking (even cancelled), so routine monitoring (HbA1c every 3 months) takes seconds.

**Doctor — edits & policy**

- As a doctor, I want to add/remove tests on a booking until tubes leave the clinic, so I can fix omissions the patient mentions on the way out.
- As a doctor, I want the catalog picker with search, a live total, and a "New"/"marked for removal" diff, so I see the financial impact before saving.
- As a doctor, I want Save locked until something changed and ≥1 test remains, so I can't accidentally create an empty or no-op order.
- As a doctor, I want route or patient-info changes allowed only until money is collected, so settled money never drifts from the order.
- As a doctor, I want disabled Edit/Cancel buttons with explanatory tooltips ("Tubes at lab — cancel locked", "Payment collected — cancel locked") and a hover policy card with lost rights struck through, so I understand why I'm locked instead of just hitting a wall.
- As a doctor, I want the escalation path documented ("tubes at the lab… call Kura ops"), so there's still a way forward after the lock.

**Doctor — cancelling**

- As a doctor, I want a pre-cancel confirm modal naming the patient, the code, and exactly which tests get voided, so I never cancel the wrong booking.
- As a doctor, I want the cancel modal to state route-specific consequences (Telegram+SMS notice for PSC; courier dispatch cancellation for in-clinic) and that cash refunds are manual, so I know the cleanup I'm signing up for.
- As a doctor, I want cancellation blocked once money settles or tubes are at the lab, so I can't orphan refunds or samples.
- As a doctor, I want cancelled bookings to remain visible (strikethrough, "Cancelled" chip, payment "Refunded"/"Voided") rather than deleted, so the audit trail survives.

**Doctor — patient communication**

- As a doctor, I want to resend the booking slip via Telegram + SMS in 2 clicks, so a patient who lost the link can still show up.
- As a doctor, I want the resend modal to warn that repeated pings reduce Telegram open-rates, so I don't burn the channel.
- As a doctor, I want the "Telegram reminder" action only on PSC bookings without results, so reminders appear exactly where the patient owes an action.

**Doctor — reflex**

- As a doctor, I want a rules engine detecting triggers (TSH 0.01 < 0.5 → FT3+FT4) and proposing a same-sample panel with prices + reference ranges, so I complete the workup without recalling the patient.
- As a doctor, I want the sample-expiry countdown visible ("expires in 47h", "auto-discard at 48h"), so I decide before the window closes.
- As a doctor, I want to pick how the patient pays for the add-on (KHQR Telegram / pre-auth / Forte insurance / skip), so payment friction matches my relationship with the patient.
- As a doctor, I want the pending-payment state to have resend + cancel and auto-cancel at 48h, so a hanging reflex never lives forever.
- As a doctor, I want completed reflex results to land in the flowsheet with an interpretation hint, so the add-on closes the clinical loop.
- As a doctor, I want a "Reconsider" path after skipping (while the sample lives), so one hasty decline isn't final before the sample is discarded.

**Doctor — documents & compliance**

- As a doctor, I want the legal Dx order auto-generated per booking (letterhead, ICD-10 from the problem list, per-test sample/prep, 30-day validity, e-signature, verify URL kura.med/verify/<code>), so I satisfy MoH/insurance without manual paperwork.
- As a "verified"-tier doctor without a signature image on file, I want documents issued with the license stamp + an explicit "signature not on file" note, so they remain legally valid while I finish onboarding.
- As an Explorer doctor, I want the gate page to explain exactly what verification needs (MoH license + photo, matching national ID, cabinet address) and how fast it is ("same day"), so I'm blocked from issuing legal documents but have a clear unlock path.
- As a doctor, I want the Rx to compute Sig and quantity from frequency (OD→90, BID→180 tablets, refills 0) with pharmacist notes, so any pharmacy dispenses without ambiguity.
- As a doctor, I want imaging reports (ECG/X-ray/ultrasound) generated as signed, audit-logged PDFs opening in a new tab, so I can print/share chart documents instantly.

**Doctor — calendar**

- As a doctor, I want a weekly calendar of typed visit slots with availability rules synced to my public directory profile, so patients can self-book (preview).
- As a doctor, I want week-level stats including the no-show rate, so I can quantify wasted capacity.

**Patient**

- As a patient, I want my booking as a boarding-pass-style ticket with a large code + QR, so reception pulls my order with one scan.
- As a patient, I want the page to greet me by name and say in plain words what my doctor ordered and what to do next (walk in / arrive 5 minutes early / wait for results), so I don't have to call the clinic.
- As a patient, I want to share my location once to get the nearest PSC with distance ("1.2 km · 4 min by tuk-tuk"), open-now status, hours, phone, and Google Maps directions, so the trip costs the least time and tuk-tuk money.
- As a patient declining location sharing, I still want the full list of 12 Phnom Penh PSCs to choose manually — accepting that distances and open-now status stay hidden until I share. (Note: this is a deliberate confirmshame dark pattern, acknowledged in code comments — should be flagged in product documentation.)
- As a patient with an appointment, I want the schedule (day, time, PSC, what to bring) with "Add to calendar" and directions, so I don't miss it.
- As a patient, I want fasting/preparation guidance shown before the test list ("Fast 9–12 hours (water is OK) — required for lipid panel", bring ID + code, stay hydrated), so my sample isn't rejected.
- As a patient post-draw, I want a live results pipeline (drawn 14:18 → lab processing, ETA 17:00 → results delivered to this number), so I know when to expect news.
- As a patient, I want each test tagged "Processing" after collection, so I see per-test progress.
- As a patient, I want to download/print the legal Dx order (with my Khmer name ឆាន សុខា), so I can use it at any partner lab or for insurance reimbursement.
- As a patient, I want to know the code's validity ("code valid 7 days") and how to ask questions ("Reply to this Telegram chat"), so expectations and support are clear.
- As a patient, I want my phone masked on shared surfaces (+855 12 ••• 4471), so my contact info doesn't leak to shoulder-surfers.
- As a patient with a reflex proposal, I want one-tap KHQR approval in Telegram for the exact amount ($14), so the add-on test needs no trip or phone call.
- As a pre-authorized patient, I want the reflex panel to auto-debit without notification friction, so the workup is never delayed (this consent boundary must be set at booking time).

**Courier**

- As a courier, I want my assignment, ETA, plate, and rating shown to clinics only when relevant, so I'm reachable without my other jobs being exposed (map hidden when "assigned elsewhere").
- As a courier, I want the pickup-code read-out ritual at handover, so tubes can't go to the wrong rider.
- As a courier, I want a tube manifest (type, volume, "1 of N" count) attached to the pickup, so I can verify the package before leaving.
- As a courier (and Kura ops), I want every leg timestamped in the chain-of-custody log through "Delivered to lab", so sample-integrity disputes are resolvable.

**Edge cases covered**

- Cancelled bookings remain reorderable; the demo has restore; cancelled pickups hide "Cancel pickup"/"Call driver" buttons.
- Flagged bookings block auto-report; clean bookings auto-report.
- Unknown test names in the edit panel → temporary code at $0, still rendered/removable.
- Corrupted localStorage on the Rx bridge → demo fallback items.
- Missing Geolocation API → treated as denied.
- Unknown Rx frequency → falls back to OD Sig.
- Empty bookings panel for new charts has instructional copy.
- Explorer is gated consistently across orders, calendar, pickups — always with an unlock CTA.

---

# APPENDIX — DATA MODEL

**Order / Booking**

```js
{
  id: "KO-9134-4821",          // KO-{MRN digits}-{4 digits}
  patient: "Sokha Chann", mrn: "P-9134",
  tests: ["HbA1c", ...],        // display names, resolved via LAB_CATALOG
  route: "PSC pickup" | "In-clinic draw" | "Home draw",
  status: "scheduled" | "in-progress" | "results-back",  // + UI-side cancelled flag
  total: 20.00, when: "today" | "20m ago" | ...,
  flagged: 0|1, reflexCandidate?: true
}
```

Booking code: "FZ" + 5 chars from the id tail. Display states: Confirmed/Redeemed/Cancelled.
Friendly code: 2 letters + 5 digits, excluding I/O/0/1. Shipper handover code: 4 chars. Sample ID: 26 + 10 digits, Code-128.

**Patient**

```js
{
  id: "P-9134", name, khmer, age, sex: "M"|"F"|"O",
  tags: ["off-target"|"overdue"|"unreliable"|"no-show"|"new-result"|...],
  lastSeen, bridge: "T1"|"T2"|"T3",
  insurance: "Forte"|"NSSF"|"Self-pay",
  flag: "critical"|"warning"|"ok"|"muted", flagText,
  summary, nextStep,            // feeds the AI recap
  metric, target, trend: [{q,v}], flowsheet: [{label,value,ref,flag}],
  plan: { title, items: [{label, due, kind}] },
  provenance?                   // Kura-wide records only
}
```

**Other**

- Pickup: `{ id: "PU-…", bookingId, bookingCode, type: "regular", status: pending|assigned|en-route|arrived|completed|cancelled, eta, driver }`.
- Lab panel/test: `{ name, tests: [{name, unit, ref, values[7], flags[7]}], combinedChart? }` — sentinels `_pending_pay_` / `_pending_run_`.
- Diagnosis: `{ code ICD-10, label, since, status: active|managed }` + AI candidate `{ trigger, confidence }`.
- Medication: `{ name, dose, freq: OD|BID|TID|QID|PRN, route: PO, refills, status }` + AI candidate `{ trigger, rationale }`.
- Referral: service + hospital `{ name, distance, wait, cost, insurance[], tag }` + `{ urgency, reason, question, attach* }`, code KR-9134-XXXX.
- LAB_CATALOG (26 entries): `{ code, name, category, sample, tat, prep, price: {usd, khr}, refUnit, ref, description, indications[], popular? }`. Prices $2 (RBG) → $32 (LPA "sent to Bangkok"). Cambodia-specific infectious set: HIV 4th-gen, HBsAg, Dengue NS1+IgM/IgG, Malaria smear+RDT. STAT: Troponin "60 min", Malaria "30 min".
- TUBE_FOR_TEST: HbA1c & CBC → purple EDTA 3mL; Lipid/CMP → yellow SST 5mL; TSH & VitD → SST 3mL; urine → 10mL cup.
- localStorage: kura.auth.session/workspace/kyc/billing, kura.onboarding.v1, kura.labUnits, kura.preferences.v1, kura.openPatient (cross-tab bridge), kura.rx.<code>.
- Legal documents: Dx valid 30 days, ICD-10 mandatory, Document ID kura-rx-<code>-001, verify at kura.med/verify/<code>. Booking codes valid 7 days. Nudge e-Rx expires in 14 days.
- Phase markers in copy: Rx PDF = Phase 1, mobile scribe = Phase 2, HBC = Phase 2, Kura pharmacy = Phase 4; DECISION 21 (ICD-10), DECISION 24 (First Databank DDI).

**Notable cross-cutting design invariants**

- Phone number is the global dedup key; identity trust follows tiers T1/T2/T3, upgraded via Telegram.
- Privacy by default: Kura-wide is search-only + opt-in, provenance-only rows, masked OTP cards, audited + rate-limited lookups, a no-PHI mismatch branch, courier map hidden while serving another clinic.
- AI suggests only: every AI artifact (✨ sections, ICD/Rx candidates with triggers, recap "Next step") requires an explicit doctor action.
- Telegram is the patient channel for everything: reminders, nudges, e-Rx codes, referral confirmations, reflex payments, welcome/ID confirmation — with SMS/voice/reception fallbacks.
- Honest empty states: "unknown" cards, 0-booking charts, the Explorer dashboard — the prototype deliberately simulates a new clinic's cold start.
- Money and samples are the locking boundaries: collected money locks route/patient changes; samples at the lab lock everything.
- Three price sources currently coexist (wizard TEST_CATALOG, full LAB_CATALOG, QuickOrder inline list — e.g. Lipid $14 vs $18, CBC $6 vs $9) — a consolidation candidate for the real build.
- A deliberate dark pattern exists in the mobile location flow (confirmshame) — acknowledged in code comments, needs an explicit product decision.
