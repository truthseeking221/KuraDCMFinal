# Kura Clinic / Doctor App - Business Context & Logic

Source date: 2026-06-19

This document is the local project-goal source for the clinic / doctor app slice of Kura. It focuses on doctor-owned clinic workflows: patient chart, lab ordering, bookings, clinic draw, PSC routing, encounter documentation, and claim readiness.

Out of scope for this slice: public landing pages, patient app UX except where the doctor sends a booking to the patient, receptionist-only workflows, banking implementation details, and marketing copy.

## Product Goal

Kura lets private-practice doctors in Cambodia order and manage lab work without owning a lab. The doctor should be able to move from a clinical signal to a legally attributable lab order, route the sample through the right collection path, communicate with the patient, collect or defer payment, and close the loop through results review and claim-ready documentation.

The clinic / doctor app should feel like a mobile workbench for a cabinet doctor: fast enough for a consult, safe enough for specimen identity, and structured enough for billing, insurance, and audit.

## Business Context

Private clinics and cabinets need a way to offer lab diagnostics without building lab infrastructure. Kura supplies the network layer:

- PSC collection points where patients can walk in with a booking code.
- Courier or sweep pickup for samples drawn at the clinic.
- Lab catalog, pricing, prep, TAT, and specimen requirements.
- Telegram + SMS patient communication.
- Payment rails: cash collected by doctor, KHQR sent via Telegram, pay-at-PSC, and insurance/claim flows.
- Legal attribution through doctor verification, signed notes, ICD-10 coding, and auditable order records.

The doctor's job is not just to order tests. The doctor must decide who the patient is, why the test is clinically justified, how the sample will be collected, who pays, what the patient receives, and what action is needed when results return.

## Primary Actors

- Doctor: owns clinical decision, patient chart, order attribution, results review, treatment plan, and claim readiness.
- Clinic / cabinet: physical point where the doctor may see the patient, collect cash, draw blood, label tubes, and hand samples to a courier.
- Patient: receives booking code, QR, prep instructions, payment request, reminders, results/report when released.
- Phone holder / guarantor: may not be the patient. A verified phone is a contact route, not proof of patient identity.
- PSC: collection center that confirms patient visit, identity, sample draw, and counter payment when applicable.
- Kura courier: picks up clinic-drawn samples by scheduled sweep or urgent dispatch.
- Kura lab: receives samples, processes tests, holds eligible samples for add-on/reflex logic, returns results.
- Insurer / payer: may cover eligible tests after identity, ICD, signed note, evidence, and therapy plan gates are satisfied.
- Kura ops: escalation owner when locked bookings need amendment after sample/payment constraints have passed.

## Current Doctor App Surfaces

The mobile doctor app is structured as a shell with bottom tabs plus pushed views.

Bottom tabs:

- Home: daily worklist entry point.
- Patients: urgency-sorted patient roster.
- Bookings: cross-patient lab order queue.
- Catalog: lab catalog and catalog-first order building.
- More: settings, doctor verification, and account/admin surfaces.

Pushed views:

- Patient chart.
- Booking detail.
- New booking composer.
- Expanded order cart.
- Result review.
- Settings / verification.

The shell keeps a global search overlay, a sync strip, and a persistent mini cart dock when an order draft has lines.

## Doctor Verification / KYD Logic

The business target uses doctor verification to support legal attribution and claims. The current mobile implementation surfaces KYD state but does not hard-block ordering.

KYD states:

- `not-started`: doctor has not submitted medical licence and ID.
- `under-review`: documents submitted and being reviewed.
- `needs-resubmission`: Kura rejected or could not verify documents.
- `expired`: verification lapsed.
- `approved`: doctor identity is confirmed; orders and claims can be attributed, directory profile is live.

Important distinction:

- Business target: production may gate some legal/claim surfaces by doctor tier.
- Current mobile prototype: ordering still works while verification is surfaced as a status in More / Verification.

## Patient Identity Logic

Identity is a core clinic-app differentiator. A phone number is a contact key, not identity proof.

Identity flow:

1. Doctor enters a phone number.
2. Patient or phone holder reads/verifies a 6-digit OTP.
3. Kura resolves the phone graph.
4. Doctor confirms who the actual patient is.
5. If no existing patient fits, doctor creates a provisional patient after duplicate checks.
6. The order stores both `patientAssurance` and an `identityDecision`.

Identity outcomes:

- `known-confirmed`: verified phone maps to an existing patient and doctor confirms it is them.
- `dependent-confirmed`: verified phone belongs to a guarantor/guardian and doctor selects a dependent.
- `unknown-phone-provisional`: no record on this phone; doctor creates a provisional patient after dedup.
- `shared-phone-provisional`: phone is active on another patient, but this order is for a different person.
- `guarantor-provisional`: new dependent minted under a verified holder phone.

Assurance values:

- `known-reused`: Kura already knows the patient or the doctor selected an existing graph member.
- `provisional`: doctor created a new patient from the verified phone path; PSC/ops may need to confirm identity later.

Product rule: a PSC booking for a provisional patient may still be sent, but the doctor action copy must make the identity dependency visible. The PSC checks identity before drawing the sample.

## Ordering Model

The doctor app has one shared order draft model behind several surfaces.

Order lines can come from:

- Lab follow-up rows.
- Lab suggested/repeat rows.
- Catalog-first add actions.
- New booking composer test selection.
- Suggested clinical panels.
- Reorder/edit booking actions.

A draft contains:

- `patientId`.
- `status`: `building`, `preparing`, or `placed`.
- `lines`: tests, bundles, or unlisted lab-derived tests.
- `checkout`: route, STAT, payment choice, doctor fee.
- `prep`: tube set and scanned sample IDs while clinic draw is preparing.
- `lastPlaced`: just-placed receipt state.
- `placedOrders`: archived booking history.

## Core Ordering Surfaces

### New Booking Composer

Current mobile composer is PSC-first:

1. Patient identity: phone -> OTP -> known member / dependent / provisional.
2. Tests: bundles + catalog search/filter.
3. Payment: pay at PSC, cash now, or KHQR via Telegram.
4. Confirm: patient, identity, contact, collection, payment, tests, estimated total.
5. Place booking: creates a doctor-attributed PSC booking.

Business intent: this is the fast front door for a doctor to send the patient to a Kura PSC.

Current implementation details:

- `originateDoctorBooking` defaults route to `psc`.
- Booking is doctor-attributed.
- Patient assurance and identity decision are frozen onto the placed booking.
- Cash placement requires explicit cash confirmation in the composer before place.

### Shared Cart / Order Draft

The expanded cart is the cross-surface checkout surface. It supports both PSC and clinic draw.

Cart responsibilities:

- Show selected tests, line count, known subtotal, KHR mirror, and unpriced warnings.
- Bind the draft to the active chart patient.
- Select sample route: clinic draw or PSC walk-in.
- Select urgency: routine or STAT.
- Select PSC payment: cash now, KHQR now, or pay at PSC.
- Place the order or move clinic draw into tube prep.
- Show a boarding-pass receipt after placement.

Route logic:

- `psc`: commits immediately when booking is placed; patient receives code by Telegram + SMS.
- `clinic`: does not fully commit until tubes are prepared and confirmed.

### Catalog-First Ordering

The catalog lets doctors browse and build an order without starting from a patient.

Key logic:

- Search across name, code, category, specimen, and indication.
- Filter by favorites, categories, and specimens.
- Add individual tests or bundles.
- Build custom bundles.
- Review suggested orders from patient gaps when a patient context exists.
- When ready, use the identity gate to choose patient and send a PSC booking.

Business reason: sometimes the test is the starting point, not the patient chart.

### Patient Chart Ordering

The patient chart is where clinical context lives. The chart should let the doctor move from abnormal labs, care gaps, or follow-up needs into the shared order draft.

Chart tabs:

- Summary.
- Labs.
- Orders.
- Care plan.
- Records.

The chart header keeps patient identity, insurance, problem flags, recent abnormal/due bands, and visit actions visible.

### Bookings Worklist

The Bookings tab is the doctor's cross-patient order queue.

Filters:

- Time scope: Today, Upcoming, Past, All.
- Work state: Active, Needs you, Awaiting collection, Sample at lab, Results back, Cancelled.

Sort priority:

1. Needs action.
2. Results back.
3. Scheduled.
4. In progress.
5. Cancelled.

Business rule: bookings are sorted as a clinical worklist, not as a passive chronological ledger.

## Clinic Draw / Tube Prep Logic

Clinic draw is the path where the doctor or clinic staff draws blood/collects sample in the clinic.

Business principle: a clinic-drawn order should not appear as a fully placed booking until physical samples exist and are labeled.

Flow:

1. Doctor adds tests to draft.
2. Doctor chooses `Clinic draw` route.
3. Doctor places order.
4. Draft enters `preparing` state, not `placed`.
5. System derives minimal tube set.
6. Doctor labels/scans each tube.
7. All tubes must be scanned before confirmation.
8. Doctor confirms tubes ready.
9. Order commits to `placed` and receipt appears.

Tube derivation rules:

- Hematology and HbA1c -> EDTA purple 3 mL.
- Urine specimen tests -> Urine cup 10 mL.
- Chemistry / serology / endocrine / default -> SST gold 5 mL.
- Bundles expand to member tests before tube grouping.
- Unlisted lab tests infer from lab section; urine/cytology -> cup, otherwise SST.

Sample ID logic:

- Sample IDs are deterministic prototype IDs beginning with `26` and 10 generated digits.
- UI models scan per tube, undo per tube, and all-scanned gate before confirm.
- Business target from spec includes Code-128 sticker validation, duplicate rejection, and non-Kura code rejection.

Clinic logistics:

- Routine clinic draw uses scheduled sweep.
- STAT clinic draw uses urgent courier dispatch and a handover code.
- The handover code is what the clinic reads to the courier.

## PSC Booking Logic

PSC booking is the patient-in path.

Flow:

1. Doctor verifies/resolves patient identity.
2. Doctor selects tests.
3. Doctor chooses payment option.
4. Doctor places booking.
5. Kura generates internal `ORD-xxxx` and patient-facing booking code.
6. Patient receives Telegram + SMS slip.
7. Patient shows code at PSC.
8. PSC confirms identity and draw.
9. Booking moves from scheduled to in-progress.
10. Results return to doctor.

Business properties:

- The patient-facing code is friendly and excludes confusing characters.
- `scheduled` on a PSC booking means the code exists but the patient has not visited/drawn yet.
- A provisional patient booking exposes `PSC checks identity before draw` as a doctor action/detail.
- STAT PSC means urgent patient instructions; no clinic courier fee because patient transports themself.

## Payment & Ledger Logic

Payment is not just display copy; it affects doctor balance and cancellation rules.

Payment choices:

- `cash`: doctor collected cash in clinic.
- `khqr`: KHQR via Telegram; patient pays Kura.
- `later`: patient pays at PSC counter.

Payment statuses:

- `pending`: payment due at draw.
- `collected`: paid/collected.
- `waiting`: KHQR sent but not confirmed.
- `deferred`: pay later at PSC.
- `pending-claim`: insurer billed, not settled.
- `claimed`: claim settled.
- `refunded`: cancelled after payment was taken.
- `voided`: cancelled before settlement / claim voided.

Ledger rules in current implementation:

- Doctor commission rate: 15% of lab total.
- Doctor fee max: min($20, 30% of subtotal).
- Patient total = lab subtotal + STAT fee + doctor fee.
- Kura share = lab total minus doctor commission.
- Doctor earns = doctor commission + doctor fee.
- If cash is collected by doctor, ledger kind is `doctor-owes-kura`.
- If payment/claim is confirmed, ledger kind is `earning-confirmed`.
- Otherwise ledger kind is `earning-pending`.

Settlement copy examples:

- Cash: `Cash is with the clinic. Settle the Kura share after pickup.`
- Confirmed earning: `Earning is added after payment confirmation.`
- Pay later: `Earning stays pending until the PSC collects payment.`
- KHQR waiting: `Earning stays pending until the patient pays Kura.`

## Booking Lifecycle Logic

The app deliberately separates lifecycle, collection plan, payment, and doctor action. These should not be collapsed into one overloaded status.

Lifecycle:

```plain text
scheduled -> in-progress -> results-back
cancelled is an overlay
```

Doctor-facing lifecycle labels:

- PSC + scheduled -> `Awaiting visit`.
- Clinic + scheduled -> scheduled / waiting for pickup depending receipt.
- PSC + in-progress -> `Sample drawn`.
- Clinic + in-progress -> `Sample at lab`.
- results-back + flagged -> `Flagged`.
- results-back without flagged -> `Results back`.
- cancelled -> `Cancelled`.

Collection plan:

- PSC: `Send patient to PSC`.
- Clinic routine: `Send tubes to Kura` + sweep window.
- Clinic STAT: `Send tubes to Kura` + courier/handover detail.

Doctor action overlay:

- Flagged result -> doctor must review.
- Provisional PSC scheduled booking -> PSC checks identity first; doctor sees the dependency.
- Waiting KHQR or claim -> action/exception overlay, not lifecycle.
- Otherwise doctor may simply be waiting on patient, PSC, lab, or finance.

## Lock / Edit / Cancel Rules

Booking safety rules are simple and visible.

Edit tests locked when:

- Booking is `results-back`.
- Booking is cancelled.

Cancel locked when:

- Booking is `results-back`.
- Booking is cancelled.
- Payment is settled (`collected` or `claimed`).

Edit behavior:

- Doctor can add/remove tests while unlocked.
- Booking must keep at least one test.
- Save recomputes total, unpriced count, and ledger impact.
- UI shows added/removed diff and live price delta.

Cancel behavior:

- PSC cancellation notifies patient by Telegram + SMS.
- Clinic cancellation cancels courier dispatch.
- If cash was collected, refund is manual and must be handled separately.
- Payment state becomes `refunded` only when PSC payment was collected; otherwise `voided`.

Reorder behavior:

- Reorder is recovery / repeat episode, not a shortcut during an active order.
- Allowed after cancellation or results-back.
- Clones tests, route, STAT, doctor attribution, identity decision, and patient assurance into a new scheduled booking.

## Result Review & Reflex Context

Current mobile implementation has result review and flagged booking logic. The broader product spec includes reflex add-on testing.

Business target for reflex:

- Trigger when an abnormal result can be clarified on the same retained sample.
- Example: suppressed TSH suggests FT3 + FT4 add-on.
- Sample has a visible expiry window, typically 48h.
- Payment rails can be KHQR via Telegram, pre-authorized auto-debit, insurance auto-claim, or skip/re-draw.
- Pending reflex should not look like missing data; flowsheet should show awaiting payment or ETA.

Current scope note:

- Reflex is documented in product/design specs as target logic.
- Mobile doctor app currently emphasizes flagged result review and result close-out, not a full reflex state machine yet.

## Encounter / Claim Logic

The patient chart includes an encounter engine for clinical documentation and claim readiness.

Encounter outputs:

- SOAP note scaffold seeded from chart signals.
- ICD-10 coding from chart-aware candidates plus WHO ICD-10 2019 searchable index.
- Medication list and signed Rx.
- Referral destination and patient notification.
- Follow-up scheduling.
- Self-reported finding resolution.
- Encounter timeline.

Claim readiness checks:

- ICD-10 coded.
- Signed note.
- Lab evidence on file.
- Identity verified / insurer active.
- Therapy plan present: Rx, referral, or follow-up.

When all checks pass, the system logs `Claim packet ready` with `ICD · signed note · lab evidence · therapy plan`.

Business principle: results alone are not enough for reimbursable clinical work. The doctor must close the loop with coding, signed record, and care plan.

## Clinical Roster Logic

The patient roster is urgency-sorted rather than alphabetical.

Patient decoration includes:

- Attention reason.
- Tone: danger, warning, info, neutral.
- Clinical context.
- Last activity.
- Next action.
- Labs-back flag.
- Acuity: urgent, watch, stable.
- Condition codes.

Sort order:

1. urgent.
2. watch.
3. stable.

Filters:

- All.
- Recently active.
- Needs attention.
- Needs review.
- Abnormal labs.
- Overdue follow-up.
- Screening due.

Business principle: the doctor app is a worklist for clinical attention, not just a CRM table.

## Important State Machines

```plain text
Doctor mobile navigation
section tab + pushed view stack
none -> patient | booking | composer | cart | settings | verification | result-review

Order draft
building -> preparing -> placed
building -> placed for PSC
preparing -> building if tube prep cancelled
placed -> building when starting a fresh draft

PSC booking
scheduled / awaiting visit -> in-progress / sample drawn -> results-back

Clinic booking
preparing tubes -> placed with sweep or handover -> in-progress / sample at lab -> results-back

Payment
waiting -> collected
pending-claim -> claimed
collected -> refunded only through eligible cancel
unsettled cancel -> voided

Encounter
note none -> draft -> signed
claimReady false -> true when ICD + signed note + lab evidence + identity + therapy plan all pass
```

## Implementation Map

Key source files in the current repo:

- `src/components/DoctorMobile/DoctorMobileApp.tsx`: mobile shell, tabs, pushed-view router.
- `src/components/DoctorMobile/state/MobileAppContext.tsx`: navigation stack, global search, active patient context.
- `src/components/DoctorMobile/data/kyd.ts`: doctor verification/KYD states.
- `src/components/DoctorMobile/data/clinical.ts`: patient roster, chart headers, clinical decoration.
- `src/components/DoctorMobile/data/encounter.ts`: ICD search, SOAP scaffold, Rx formulary, referral/follow-up fixtures.
- `src/components/DoctorMobile/state/EncounterContext.tsx`: note, ICD, Rx, referral, follow-up, claim readiness engine.
- `src/components/DoctorMobile/screens/composer/BookingComposerFlow.tsx`: PSC-first new booking wizard.
- `src/components/DoctorMobile/screens/composer/IdentityGate.tsx`: reusable phone/OTP/patient identity resolution.
- `src/components/DoctorMobile/screens/cart/CartScreen.tsx`: expanded shared cart, route/payment/STAT placement, receipt.
- `src/components/DoctorMobile/screens/cart/TubePrepSheet.tsx`: clinic draw tube prep and scan-confirm gate.
- `src/components/DoctorMobile/screens/catalog/CatalogScreen.tsx`: catalog-first order building and identity gate sheet.
- `src/components/DoctorMobile/screens/bookings/BookingsListScreen.tsx`: cross-patient booking queue and filters.
- `src/components/DoctorMobile/screens/bookings/BookingDetailScreen.tsx`: lifecycle detail, progress, payment, actions.
- `src/components/DoctorMobile/screens/bookings/BookingSheets.tsx`: edit/cancel/resend/reorder action sheets.
- `src/components/OrderDraft/OrderDraftContext.tsx`: shared draft, placed booking, lifecycle mutation engine.
- `src/components/OrderDraft/types.ts`: order, checkout, identity, payment, booking lifecycle types.
- `src/components/OrderDraft/ledger.ts`: commission, doctor fee, settlement, doctor balance logic.
- `src/components/OrderDraft/tubes.ts`: minimal tube-set derivation.
- `src/components/OrderDraft/bookingShared.tsx`: shared booking labels, status, actions, ETA, lock reasons.
- `Kura Order Cart — Doctor Business Spec.md`: target doctor ordering jobs, stories, flows.
- `KuraDCM Specs.md`: broader Kura doctor-facing product analysis.
- `Kura Order Cart Design Specs.md`: design-system-level cart components and target variants.

## Current Prototype vs Target Spec

Current mobile implementation:

- Has mobile shell with doctor tabs and pushed views.
- Has PSC-first booking composer.
- Has catalog-first building with identity gate.
- Has shared draft/cart with clinic draw support.
- Has tube prep sheet for clinic route.
- Has booking worklist/detail/action sheets.
- Has encounter/claim readiness engine.
- KYD is visible but not an ordering blocker.

Target/business spec still to fully align:

- Quick order panel embedded directly inside patient chart right rail on mobile.
- Full reflex add-on state machine in mobile result flow.
- Production-grade scanner using Code-128 validation and duplicate rejection.
- Full insurance claim submission integration.
- Real Telegram/SMS/KHQR backend confirmation.
- Real PSC/lab/courier event ingestion instead of demo lifecycle advance.
- Explicit MoH legal document generation from mobile flow.

## Open Product Decisions

- Should KYD block checkout in production, or only block legal PDFs/claims while allowing exploratory/PSC orders?
- Should mobile new booking remain PSC-first, or expose clinic draw in the composer as well as the shared cart?
- What is the exact rule for cash-now PSC orders: always allowed, or restricted by doctor verification / reconciliation risk?
- Should patient identity resolution happen before test selection in all flows, or only in composer while catalog remains tests-first?
- How much of reflex add-on belongs in doctor mobile v1 vs desktop/ops first?
- What backend event names map to current prototype lifecycle: `JUST_CREATED`, `SAMPLE_DRAWN`, `RESULTS_BACK`, `CLAIMED`, `CANCELLED`?
- Which actions require Kura ops escalation after lock: route change, patient reassignment, test amendment, payment refund, claim correction?

## Definition Of Done For Clinic / Doctor App Slice

The clinic / doctor app slice is coherent when:

- Doctor can identify or provision a patient with phone/OTP and dedup context.
- Doctor can add tests from chart, catalog, composer, or booking edit.
- Doctor can choose PSC or clinic draw where the surface supports it.
- PSC orders immediately generate patient-facing booking code and communication state.
- Clinic-draw orders require tube preparation before becoming placed bookings.
- Payment route creates the correct payment state and ledger impact.
- Booking list separates lifecycle, collection route, payment, and doctor action.
- Edit/cancel/reorder behavior follows lock policy and explains unavailable actions.
- Results-back/flagged bookings drive doctor review.
- Encounter documentation can produce ICD + signed note + therapy plan claim readiness.
- KYD status is visible and its production gating decision is explicit.
