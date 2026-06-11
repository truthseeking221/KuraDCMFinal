# Kura Order Cart — Doctor Business Spec

Jobs to be Done · User Stories · Flows. Doctor persona only. Consolidates the five ordering surfaces of the doctor app into one cart system. Companions: `KuraDCM Specs.md` (full product analysis), `Kura Order Cart Design Specs.md` (Figma component spec).

## 1. Scope — where the doctor's cart lives

| # | Surface | Entry point | Cart shape |
|---|---------|-------------|------------|
| S1 | **Quick Order panel** | Patient chart, right rail (always present) | Mini cart → route → place |
| S2 | **Order wizard** | "+ Order labs" top bar, "+ New booking" | 4 steps, full cart in right-rail draft card |
| S3 | **Catalog cart** | Lab catalog page | Items-first cart → attach patient → review → place |
| S4 | **Edit booking** | Bookings list / booking detail / chart bookings card | Diff cart over a placed order |
| S5 | **Reflex add-on** | Flagged result (booking detail + chart) | Single-purpose approve cart on an existing sample |

One cart engine behind all five. Differences are entry order (patient-first vs items-first), commit semantics, and which blocks render.

---

## 2. Jobs to be Done

### Core jobs

1. **"Order the right tests for this patient in under a minute, without leaving the chart."**
   Success: from chart → placed order ≤ 60s; zero context switch; AI suggestions ranked by the patient's own conditions with a visible "why".

2. **"Get the sample drawn the way that fits my practice."**
   Success: choose per order — I draw (courier sweep collects) / Kura draws (PSC walk-in) / home draw (future). Route changes copy, fees, SMS, and logistics automatically.

3. **"Start from the test when the test is the starting point."**
   Success: build a multi-test cart from the catalog before knowing the patient; attach patient at checkout; nothing re-entered.

4. **"Handle a clinical emergency with one switch."**
   Success: STAT toggle re-prices (fee where applicable), re-routes (courier ~30 min / URGENT SMS), promises 2h TAT on the STAT panel, and shows me exactly what the patient will read.

5. **"Never lose a sample to a labelling mistake."**
   Success: minimal tube set auto-computed; every tube gets a scanned Code-128 identity; wrong/duplicate stickers rejected at the bench; rider handover verified by code.

6. **"Collect the right money at the right moment — and keep cash honest."**
   Success: pay-now (cash/KHQR-via-Telegram) vs pay-later at PSC; pay-now lifts show-up +40%; cash requires an in-hand confirmation that lands in the reconciliation log.

7. **"Fix an order after placing it — within rules I can see."**
   Success: add/remove tests until tubes leave the clinic; change route/patient until money is collected; cancel until paid or at lab; locked actions explain themselves; escalation path (Kura ops) documented.

8. **"Act on an abnormal result without a second needle."**
   Success: rule-triggered reflex panel on the held sample; patient approves payment in one Telegram tap; 48h window visible; result lands back in the flowsheet interpreted.

9. **"Never create a duplicate patient — across the whole Kura network."**
   Success: phone is the dedup key; hard match forces a bridge-or-override decision (override audited); soft name match informs without blocking.

10. **"Re-run routine monitoring in seconds."**
    Success: 1-click Reorder on any past booking (even cancelled); favorites + named bundles surface in quick order.

### Supporting jobs

11. "Know cost, prep, TAT, and meaning before ordering" — dual USD/KHR price, fasting flags, sample type, reference ranges in my unit system.
12. "Rehearse before I'm verified" — Explorer can build carts everywhere; checkout is gated with the exact unlock path (MoH license).
13. "Influence the lab menu" — suggest a missing test with urgency + expected volume.
14. "Trust what the patient receives" — preview the mobile booking page, the verbatim STAT SMS, the legal Dx PDF.

---

## 3. User Stories

### 3.1 Building the cart (all surfaces)

- As a doctor, I want an **AI-suggested group ranked by this patient's conditions** with a reason per test ("HbA1c — glycemic control · due", "Lipid — LDL was 162"), so routine follow-up panels are one tap.
- As a doctor, I want a **Common group** (CBC, TSH, Vit D, Urinalysis) and a **search box that reaches the entire catalog** (name, code, category — top 8), so the compact panel never forces me into the full catalog page.
- As a doctor, I want **favorites and named bundles** I curated in the catalog to appear in quick order, so my high-frequency panels are pre-assembled.
- As a doctor, I want each candidate row to show **price (USD/KHR), TAT, sample type, prep flags**, and a coverage badge when the patient has an insurer, so there are no surprises downstream.
- As a doctor, I want **added tests to show ✓ and be removable from both the picker and the cart**, with a live total, so the cart state is always obvious.
- As a doctor, I want **unavailable tests visibly disabled** with a reason and return date, so I don't build impossible orders.
- As an Explorer (T0), I want to **build carts freely but hit a single locked checkout** with "Verify your MoH license →", so I can evaluate the product honestly.

### 3.2 Attaching the patient

- As a doctor, I want **one search across my panel + Kura-wide records** (name / phone / ID / Khmer name), with my panel selectable directly and network records showing **provenance only** ("In Dr. Lim's panel · BKK2") plus a single "Bridge →" action, so I reuse identities without browsing colleagues' panels.
- As a doctor, I want **phone-first creation** where ≥8 digits triggers realtime dedup: **hard match** → amber field + forced choice (Bridge / Override-logged); **soft name match** → non-blocking note ("different phones, different people"), so common Khmer names never block and shared phones never fork silently.
- As a doctor, I want new patients to default **T3 · Cold** with three upgrade paths (Telegram self-verify → T1/T2 · capture ID at cabinet → T2 · skip = cash/self-pay), so identity never blocks care and never costs me time.
- As a doctor arriving from a chart (S1) or from "Reorder", I want the **patient pre-attached and the step skipped**, with a dismissible banner, so quick order is actually quick.

### 3.3 Route & STAT

- As a doctor, I want **two live route choices** — "I draw the blood" (tube pickup at cabinet, courier, no medical contact, next sweep time shown) vs "Kura draws" (PSC walk-in, code + QR, nearest PSC + distance) — and **HBC visibly "Phase 2 · Coming soon"**, so logistics match reality.
- As a doctor, I want the **STAT toggle to adapt per route**: pickup → courier dispatch ~30 min + STAT fee + lab priority; walk-in → URGENT SMS (no fee) with a **verbatim SMS preview**, so I know what urgency costs and triggers.
- As a doctor, I want the right rail to show the **courier route card or PSC card only when routing is in play** (wizard steps 3–4, quick order route phase), so context appears exactly when relevant.

### 3.4 Payment (PSC route)

- As a doctor, I want a **Pay now (Recommended · +40% show-up) vs Pay later (at PSC counter)** decision when sending to PSC, so conversion economics are explicit.
- As a doctor choosing pay-now, I want **Cash** (collected at clinic) or **KHQR sent to the patient's Telegram**, so payment matches the patient in front of me.
- As a doctor collecting cash, I want a **hard confirm** — "Do you have $X.XX from {name} in your hand right now?" — that writes to the reconciliation log, so till discrepancies are caught at the source.
- As a doctor on the clinic route, I want billing to read **"Insurance · Forte — Patient owes at draw: $0.00"** and the claim to progress Pending → Claimed automatically at results, so insurance orders need zero handling.

### 3.5 Committing the order

- As a doctor placing a **PSC order**, I want commit at slip-send: booking code (2 letters + 5 digits, no I/O/0/1) + QR delivered via SMS + Telegram, success card with masked phone, nearest PSC, payment status, and a "Preview as patient" link.
- As a doctor drawing **in clinic**, I want the order held at **"Preparing order · Not yet placed"** until I confirm tubes are ready, so Bookings never lists samples that don't physically exist.
- As a doctor, I want the system to compute the **minimal tube set** (EDTA purple / SST gold / urine cup, with volumes) and assign one Code-128 sample ID per tube via **peel–stick–scan** (webcam; rejects non-Kura and duplicate stickers; per-tube Undo) or **thermal print** (Zebra/Brother link, per-label preview), so identity is bound at the bench.
- As a doctor, I want shipping by **daily sweep** ("Next sweep 14:15–14:30 · Sok S. · leave the bag at reception") or urgent on-demand with a **4-character handover code read to the rider**, so transport matches urgency without dispatch fees.
- As a doctor in the wizard, I want a **Confirm step** listing patient, tests + subtotal (+ red STAT fee), routing, billing, and "what the patient receives", each block with Edit, plus **Save as draft**, so interruptions never lose an order.
- As a doctor, I want the placed booking to **prepend into the chart's bookings card with a "New" badge, glow, and scroll-into-view**, so I get visual confirmation it landed on the right patient.

### 3.6 After placement — maintain

- As a doctor, I want to **edit tests inline** from the list or chart (search-add top-8, remove, live total, "New"/"marked for removal" diff, toast "+2 · −1"), with Save locked unless dirty ∧ ≥1 test, so corrections are cheap and safe.
- As a doctor, I want the **edit/cancel policy visible**: add/remove until tubes leave the clinic; change route/patient until money collected; cancel until paid or at lab; at lab → everything locks, "call Kura ops". Locked buttons get tooltips; the policy card strikes through expired rights.
- As a doctor, I want **cancel** to demand a confirm modal naming patient, code, voided tests, and route-specific consequences (PSC → Telegram+SMS notice; clinic → courier dispatch cancelled; cash → manual refund), and to be **blocked entirely** once money settled or tubes at lab.
- As a doctor, I want cancelled bookings to **stay visible** (strikethrough, Refunded/Voided) with **Reorder still available**, so the audit trail survives and recurring panels restart in one click.
- As a doctor, I want **resend slip** (Telegram + SMS) behind an anti-spam confirm ("repeated pings reduce open-rates"), and a **Telegram reminder** action only on PSC bookings still awaiting the visit.

### 3.7 Reflex add-on

- As a doctor, I want rule-triggered proposals (TSH 0.01 < 0.5 → FT3 + FT4, same sample, "No new draw needed") with a **sample-expiry countdown** ("expires in 47h · auto-discard at 48h").
- As a doctor, I want **four payment rails**: KHQR via Telegram (recommended, 1-tap), pre-authorized auto-debit (frictionless), insurance auto-claim (gated by ICD-10 E05.x), or skip (re-draw later).
- As a doctor, I want pending-payment reflexes to show **Resend / Cancel** and auto-cancel at 48h; completed results to land in the flowsheet **interpreted** ("suppressed TSH + elevated FT3/FT4 suggests primary hyperthyroidism"); skipped ones to offer **Reconsider** while the sample lives.
- As a doctor, I want the flowsheet to show reflex pipeline state inline ("⏱ awaiting pay" → "⏱ ETA 4h" → value), so pending ≠ missing, and FT3/FT4 only appear after approval + payment.

---

## 4. Flows

### F1 — Quick order from chart → PSC (happy path + payment branches)

```
Chart right rail · QuickOrderPanel [phase: cart]
1. Pick tests: AI suggested (reasoned) / Common / search-all. Live total.
2. CTA "Where to draw?"                                  [phase: route]
3. Route = "Send to PSC"  →  Charge patient block appears:
   a. Pay later (at PSC counter)             → skip to 5
   b. Pay now → Cash                         → CashConfirmModal:
        "Do you have $X.XX in hand right now?"
        [No, not yet]→ back · [Yes]→ logged to reconciliation → 5
   c. Pay now → KHQR                          → "Sent to patient via Telegram" → 5
4. (STAT variant: walk-in URGENT SMS preview, no fee)
5. CTA "Send to PSC" → COMMIT (immediate)                 [phase: placed-psc]
   • Friendly code generated (2L+5D, no I/O/0/1) · Telegram+SMS slip+QR
   • Success card: big code (click = mobile preview), masked phone,
     nearest PSC (addr · 1.2 km · hours), payment status line
   • Booking prepends in chart card: "New" badge + glow + scroll
Edge: 0 tests → CTA disabled. Explorer → checkout locked + license CTA.
```

### F2 — Quick order from chart → In-clinic (deferred commit)

```
[phase: cart] pick tests → "Where to draw?" → "Draw in clinic" → CTA "Draw blood"
                                                [phase: preparing · NOT YET PLACED]
1. Tube set computed (HbA1c+CBC → EDTA 3mL · Lipid/CMP → SST 5mL · urine cup…)
   one sample ID per tube (Code-128, 26 + 10 digits)
2. Labelling — tab Scan (default):
   peel n → stick 1/tube → scan each
   Scanner states: starting → scanning → linked ✓
   Errors: no-camera · unsupported · unknown (non-Kura) · duplicate (re-used sticker)
   Per-tube Undo/Redo. Gate: "⚠ Scan {n} more tube(s) first"
   — or tab Print: link Zebra/Brother (NO PRINTER → CONNECTED) → print n → stick
3. "Continue · Ship to lab" → sweep card:
   regular: "Next sweep 14:15–14:30 · Sok S. · leave bag at reception"
   urgent: on-demand rider
4. "Confirm — tubes ready" → COMMIT (deferred)            [phase: pickup-done]
   • 4-char handover code "read to the rider"
   • Order NOW enters Bookings · pickup record created
Edge: abandon before confirm → nothing ever appears in Bookings.
```

### F3 — Order wizard (4 steps)

```
Step 1 · Who's the patient?
  search panel + Kura-wide → select | Bridge → | create:
    phone ≥8 digits → realtime dedup:
      HARD match  → amber + banner → [Bridge →] | [Override — create new (logged)]
      SOFT match  → info panel only (non-blocking)
    tier block: T3 default → TG verify (→T1/T2) | capture ID (→T2) | skip
    create locked while: no name · phone <8 · unresolved hard match
  (prefilled + skipped when entered from chart — banner "Quick order from chart")
Step 2 · Pick tests — ✨ suggested-with-reason + category browse; ≥1 to continue
Step 3 · Who draws? — pickup | PSC walk-in | HBC (disabled, Phase 2)
  STAT toggle: per-route fee/SMS/TAT copy; right rail = CourierRouteCard | WalkinPSCCard
Step 4 · Confirm — blocks w/ Edit: Patient · Tests+subtotal(+STAT fee) ·
  Routing · Billing ("Patient owes at draw: $0.00") · "Patient will receive"
  [Save as draft]  [Place order ✓ | Place STAT order ⚡]
→ COMMIT immediate → success (per route)
```

### F4 — Catalog-first cart

```
Catalog page → "+" on test rows → cart appears (right col)
[cart] list+total → "Continue · find patient"   ← Explorer locked here
[patient] search name/phone/ID/Khmer · "+ Add new patient" (modal F3-style dedup)
          recent panel list (top 6)
[review] patient (Chart/Change) · tests+prices · route: Draw in clinic | Send to PSC
         total → "Place order"
[placed] code KO-… · "code + QR sent SMS+Telegram" · [Preview on mobile]
         [Open {name}'s chart] [Back to catalog]
```

### F5 — Edit a placed booking (diff mode)

```
Entry: Bookings row ✏ · booking detail · chart bookings card (scheduled only)
Guard: editsLocked = tubesAtLab ∨ cancelled  → locked card + ops escalation
[editing] current tests · search-add (top 8) · added = "New" chip ·
          removed = red "marked for removal" + undo · live total
Save gate: dirty ∧ ≥1 test
Save → toast "Updated {code} · +2 · −1"
Unknown legacy test name → temp code @$0, still renders/removable
```

### F6 — Cancel · Resend · Reorder

```
CANCEL  guard: cancelLocked = tubesAtLab ∨ cancelled ∨ paymentSettled
  modal: patient + code + N tests voided
         PSC → patient notified TG+SMS · clinic → courier dispatch cancelled
         "Any cash collected must be refunded manually"
  → status Cancelled (strikethrough, ETA "Voided", payment Refunded/Voided)
  → demo "Restore order"
RESEND  confirm modal w/ anti-spam warning → "Resent {code} · Telegram + SMS"
REORDER 1 click on any booking (incl. cancelled) → clone tests → new KO- · scheduled
```

### F7 — Reflex add-on

```
Trigger: results-back ∧ rule hit (TSH < 0.5) ∧ sample within 48h
[detected]   FT3 $7 + FT4 $7 = $14 · countdown "expires in 47h"
             rails: KHQR-Telegram (rec) | auto-debit (pre-auth) | insurance (E05.x) | skip
             [Approve & request payment] | [Skip reflex]
[patient-pending]  KHQR sent · auto-cancel at 48h · [Resend] [Cancel]
[running]    same sample · results ~4h        (flowsheet: "⏱ ETA 4h")
[completed]  paid $14 · interpretation line · [Check results → flowsheet]
[declined]   sample discarded after 48h · patient must return · [Reconsider] (while alive)
```

### F8 — Explorer gating (cross-surface)

```
T0 can: browse catalog, build carts (S1–S3), tour demo patient
T0 cannot: pass any checkout → single locked CTA + "Explorer mode…
           requires an MoH license. Verify license →" (same-day eKYC)
Gate consistency: quick order CTA, catalog cart continue, wizard place, legal PDFs
```

---

## 5. State machines (summary)

| Machine | States |
|---|---|
| QuickOrderPanel | cart → route → placed-psc \| placed-clinic-needs-pickup → placed-clinic-pickup-done |
| CatalogCart | cart → patient → review → placed |
| Wizard | step1 → step2 → step3 → step4 → placed \| draft |
| Order status | scheduled → in-progress → results-back (+ cancelled overlay) |
| Payment (PSC) | Pending → Collected · cancel → Refunded |
| Payment (clinic) | Pending claim → Claimed · cancel → Voided |
| Tube prep | unlabelled → partially-scanned → all-scanned → shipped(committed) |
| Scanner | starting → scanning → linked · errors: no-camera/unsupported/unknown/duplicate |
| Reflex | detected → patient-pending → running → completed \| declined |
| Edit mode | viewing → editing(dirty?) → saved \| discarded |

## 6. Policy invariants

1. **Commit boundary**: PSC/wizard/catalog commit at place; in-clinic commits only at "tubes ready". Nothing enters Bookings before its sample can exist.
2. **Lock ladder**: tests editable until tubes leave clinic → route/patient editable until money collected → cancellable until paid ∨ at-lab → at-lab locks everything (ops escalation only).
3. **Money boundary**: settled payment (Collected/Paid) can never drift from the order — it blocks route/patient changes and cancellation.
4. **Phone = dedup key** network-wide; hard-match override always audited; bridging requires provenance display, never chart access.
5. **STAT is an order attribute**, not a route — it propagates to SMS framing, dispatch, lab queue, and TAT promise.
6. **One price source**: canonical catalog (USD + KHR); wizard/quick-order legacy price lists are dead.
7. **AI suggests, doctor decides**: every suggested test carries a reason; nothing enters the cart without an explicit tap.
8. **Honest gating**: every locked control states why and how to unlock (license, policy, sample state).
