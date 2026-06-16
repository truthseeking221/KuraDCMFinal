"use client";

import { useMemo, useState } from "react";
import { Avatar, Button, Checkbox, Input, Search, SegmentedToggle } from "@/components/ui";
import {
  ArrowLeft as ArrowLeftIcon,
  ArrowRight as ArrowRightIcon,
  Cart as CartIcon,
  CheckCircle as CheckCircleIcon,
  Clock as ClockIcon,
  CreditCard as CreditCardIcon,
  Flask as FlaskIcon,
  Patient as PatientIcon,
  Pin as PinIcon,
  Plus as PlusIcon,
  Tube as TubeIcon,
  Warning as WarningIcon,
} from "@/icons/components";
import { cx } from "@/lib/cx";
import {
  formatKhr,
  formatMoney,
  orderBundleById,
  orderBundles,
  orderCategories,
  orderItemById,
  orderItems,
  tubesForLines,
  useOrderDraft,
} from "@/components/OrderDraft";
import type { OrderDraftLine, OrderRouteId, PlacedOrderSummary, PscPayChoice } from "@/components/OrderDraft";
import { BOOKING_PATIENTS, type BookingPatient } from "@/components/OrderDraft/bookingSeeds";
import "./BookingComposer.css";

/* =============================================================================
   New booking wizard — Patient → Tests → Sample routing → Confirm → Placed.
   Patient-first, mirroring the GitHub OrdersView flow. Writes to the global
   queue via placeStandaloneOrder() (never mutates the active chart draft). KYD
   status is shown elsewhere but never blocks this demo flow. Intentional
   friction sits where a mistake is costly: tube readiness for a clinic draw,
   and explicit cash collection for a cash-now PSC booking.
   ========================================================================== */

type Step = "patient" | "tests" | "routing" | "confirm" | "placed";
const STEP_ORDER: Step[] = ["patient", "tests", "routing", "confirm"];
const STEP_LABEL: Record<Step, string> = {
  patient: "Patient",
  tests: "Tests",
  routing: "Sample routing",
  confirm: "Confirm",
  placed: "Placed",
};

const CATEGORY_LABEL = new Map(orderCategories.map((c) => [c.id, c.label]));

const SEX_OPTIONS = [
  { label: "Female", value: "female" as const },
  { label: "Male", value: "male" as const },
  { label: "Other", value: "other" as const },
];

function slugify(name: string) {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "patient"
  );
}

function digitsOf(value: string) {
  return value.replace(/\D/g, "");
}

/* Match the seeded "070 ••• 496" style so a freshly-registered patient reads the
   same as the rest of the queue. */
function maskPhone(raw: string) {
  const d = digitsOf(raw);
  if (d.length < 6) return raw.trim() || "Phone pending";
  return `${d.slice(0, 3)} ••• ${d.slice(-3)}`;
}

function priceFor(id: string): number {
  return orderItemById.get(id)?.price ?? orderBundleById.get(id)?.price ?? 0;
}

function nameFor(id: string): string {
  return orderItemById.get(id)?.name ?? orderBundleById.get(id)?.name ?? id;
}

function isBundle(id: string): boolean {
  return orderBundleById.has(id);
}

/* Minimal lines for the tube preview — tubesForLines only reads kind/itemId/
   displayName/labRefs, so we don't need the full catalog line builder. */
function tubeLinesFor(ids: string[]): OrderDraftLine[] {
  return ids.map((id, i) => ({
    lineId: id,
    kind: isBundle(id) ? "bundle" : "test",
    itemId: id,
    displayName: nameFor(id),
    price: priceFor(id),
    labRefs: [],
    source: "catalog-standalone",
    addedAt: i,
  }));
}

export type BookingComposerProps = {
  /* Back to bookings — returns to the queue. */
  onClose: () => void;
  /* Open the patient chart from the placed screen. */
  onOpenPatient: (patientId: string) => void;
  /* Open the just-placed booking in the queue drawer. */
  onOpenBooking: (code: string) => void;
};

export function BookingComposer({ onClose, onOpenPatient, onOpenBooking }: BookingComposerProps) {
  const { placeStandaloneOrder } = useOrderDraft();

  const [step, setStep] = useState<Step>("patient");

  /* Patient */
  const [patientQuery, setPatientQuery] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<BookingPatient | null>(null);
  const [createdPatients, setCreatedPatients] = useState<BookingPatient[]>([]);
  const [registering, setRegistering] = useState(false);
  const [form, setForm] = useState<{ name: string; phone: string; dobOrAge: string; sex: "" | "female" | "male" | "other" }>({
    name: "",
    phone: "",
    dobOrAge: "",
    sex: "",
  });

  /* Tests */
  const [testQuery, setTestQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  /* Routing */
  const [route, setRoute] = useState<OrderRouteId>("clinic");
  const [stat, setStat] = useState(false);
  const [pscPay, setPscPay] = useState<PscPayChoice>("later");

  /* Confirm friction + result */
  const [tubesReady, setTubesReady] = useState(false);
  const [cashCollected, setCashCollected] = useState(false);
  const [placed, setPlaced] = useState<PlacedOrderSummary | null>(null);

  const allPatients = useMemo(() => [...createdPatients, ...BOOKING_PATIENTS], [createdPatients]);

  const patientHits = useMemo(() => {
    const q = patientQuery.trim().toLowerCase();
    if (!q) return allPatients.slice(0, 7);
    return allPatients
      .filter((p) =>
        [p.name, p.mrn, p.phoneMasked, p.phone ?? ""].join(" ").toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [allPatients, patientQuery]);

  /* Duplicate check for the registration form — same name, or same first+last
     phone digits as an existing record. */
  const duplicates = useMemo(() => {
    const name = form.name.trim().toLowerCase();
    const phone = digitsOf(form.phone);
    if (name.length < 2 && phone.length < 6) return [];
    return allPatients.filter((p) => {
      const pn = p.name.toLowerCase();
      const pp = digitsOf(p.phone ?? p.phoneMasked);
      const nameHit = name.length >= 2 && pn === name;
      const phoneHit =
        phone.length >= 6 && pp.length >= 6 && pp.slice(0, 3) === phone.slice(0, 3) && pp.slice(-3) === phone.slice(-3);
      return nameHit || phoneHit;
    });
  }, [allPatients, form]);

  const testResults = useMemo(() => {
    const q = testQuery.trim().toLowerCase();
    if (!q) return orderItems.filter((i) => i.popular);
    return orderItems.filter((i) =>
      [i.name, i.code, CATEGORY_LABEL.get(i.categoryId) ?? "", i.sample ?? ""].join(" ").toLowerCase().includes(q),
    );
  }, [testQuery]);

  const selectedEntries = useMemo(
    () => selectedIds.map((id) => ({ id, name: nameFor(id), price: priceFor(id), bundle: isBundle(id) })),
    [selectedIds],
  );
  const total = useMemo(() => selectedEntries.reduce((sum, e) => sum + e.price, 0), [selectedEntries]);
  const tubes = useMemo(() => (route === "clinic" ? tubesForLines(tubeLinesFor(selectedIds)) : []), [route, selectedIds]);

  const toggleId = (id: string) =>
    setSelectedIds((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]));

  const selectExisting = (p: BookingPatient) => {
    setSelectedPatient(p);
    setRegistering(false);
    setStep("tests");
  };

  const registerPatient = () => {
    const name = form.name.trim();
    if (!name || !form.phone.trim() || !form.dobOrAge.trim() || !form.sex) return;
    const p: BookingPatient = {
      id: `new-${slugify(name)}-${createdPatients.length + 1}`,
      name,
      mrn: `NEW-${String(createdPatients.length + 1).padStart(4, "0")}`,
      phoneMasked: maskPhone(form.phone),
      phone: form.phone.trim(),
      dobOrAge: form.dobOrAge.trim(),
      sex: form.sex,
      identityTier: "phone_unconfirmed",
    };
    setCreatedPatients((current) => [p, ...current]);
    selectExisting(p);
  };

  const cashNow = route === "psc" && pscPay === "cash";
  const placeBlockedReason = !selectedPatient
    ? "Choose a patient first."
    : selectedIds.length === 0
      ? "Add at least one test."
      : route === "clinic" && !tubesReady
        ? "Confirm the tubes are labelled and ready."
        : cashNow && !cashCollected
          ? `Confirm you collected ${formatMoney(total)} in cash.`
          : null;

  const place = () => {
    if (placeBlockedReason || !selectedPatient) return;
    const result = placeStandaloneOrder({
      patientId: selectedPatient.id,
      patient: selectedPatient,
      itemIds: selectedIds,
      route,
      stat,
      pscPay: route === "psc" ? pscPay : null,
    });
    if (!result) return;
    setPlaced(result);
    setStep("placed");
  };

  const resetForNewBooking = () => {
    setStep("patient");
    setPatientQuery("");
    setSelectedPatient(null);
    setRegistering(false);
    setForm({ name: "", phone: "", dobOrAge: "", sex: "" });
    setTestQuery("");
    setSelectedIds([]);
    setRoute("clinic");
    setStat(false);
    setPscPay("later");
    setTubesReady(false);
    setCashCollected(false);
    setPlaced(null);
  };

  const routeLabel = route === "psc" ? (stat ? "Send to PSC · urgent SMS" : "Send to PSC") : stat ? "Draw in clinic · STAT" : "Draw in clinic";
  const paymentLabel =
    route === "clinic"
      ? "Billed with the clinic draw"
      : pscPay === "cash"
        ? "Cash collected now"
        : pscPay === "khqr"
          ? "Paid by KHQR now"
          : "Pays at the PSC counter";
  const notifyLabel =
    route === "psc"
      ? "Patient gets the booking code by Telegram + SMS."
      : "Patient is drawn at the clinic — no patient code sent.";

  /* ----------------------------------- shell ------------------------------- */

  const currentIndex = STEP_ORDER.indexOf(step);

  return (
    <section className="bc" aria-label="New booking">
      <div className="bc-top">
        <button type="button" className="bc-back" onClick={onClose}>
          <ArrowLeftIcon size={15} variant="stroke" />
          Back to bookings
        </button>
        {step !== "placed" && (
          <ol className="bc-steps" aria-label="Booking steps">
            {STEP_ORDER.map((s, i) => {
              const state = i < currentIndex ? "done" : i === currentIndex ? "current" : "todo";
              const reachable = i < currentIndex;
              return (
                <li key={s} className={`bc-step is-${state}`}>
                  <button
                    type="button"
                    disabled={!reachable}
                    onClick={() => reachable && setStep(s)}
                    aria-current={state === "current" ? "step" : undefined}
                  >
                    <span className="bc-step-dot">{state === "done" ? <CheckCircleIcon size={13} variant="bulk" /> : i + 1}</span>
                    <span className="bc-step-label">{STEP_LABEL[s]}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      <div className="bc-body">
        {step === "patient" && (
          <PatientStep
            registering={registering}
            setRegistering={setRegistering}
            patientQuery={patientQuery}
            setPatientQuery={setPatientQuery}
            patientHits={patientHits}
            selectExisting={selectExisting}
            form={form}
            setForm={setForm}
            duplicates={duplicates}
            registerPatient={registerPatient}
          />
        )}

        {step === "tests" && (
          <TestsStep
            testQuery={testQuery}
            setTestQuery={setTestQuery}
            testResults={testResults}
            selectedIds={selectedIds}
            toggleId={toggleId}
            selectedEntries={selectedEntries}
            total={total}
          />
        )}

        {step === "routing" && (
          <RoutingStep route={route} setRoute={setRoute} stat={stat} setStat={setStat} pscPay={pscPay} setPscPay={setPscPay} />
        )}

        {step === "confirm" && selectedPatient && (
          <ConfirmStep
            patient={selectedPatient}
            selectedEntries={selectedEntries}
            total={total}
            route={route}
            stat={stat}
            routeLabel={routeLabel}
            paymentLabel={paymentLabel}
            notifyLabel={notifyLabel}
            tubes={tubes}
            tubesReady={tubesReady}
            setTubesReady={setTubesReady}
            cashNow={cashNow}
            cashCollected={cashCollected}
            setCashCollected={setCashCollected}
          />
        )}

        {step === "placed" && placed && selectedPatient && (
          <PlacedStep
            placed={placed}
            patient={selectedPatient}
            count={selectedIds.length}
            route={route}
            onOpenBooking={() => onOpenBooking(placed.code)}
            onOpenChart={() => onOpenPatient(selectedPatient.id)}
            onNewBooking={resetForNewBooking}
            onClose={onClose}
          />
        )}
      </div>

      {step !== "placed" && (
        <div className="bc-footer">
          {step === "tests" || step === "routing" || step === "confirm" ? (
            <Button
              intent="ghost"
              onClick={() => setStep(STEP_ORDER[Math.max(0, currentIndex - 1)])}
              leadingIcon={<ArrowLeftIcon size={14} variant="stroke" />}
            >
              Back
            </Button>
          ) : (
            <span />
          )}

          {step === "patient" && (
            <Button
              intent="primary"
              disabled={!selectedPatient}
              onClick={() => setStep("tests")}
              trailingIcon={<ArrowRightIcon size={14} variant="stroke" />}
            >
              Continue · tests
            </Button>
          )}
          {step === "tests" && (
            <Button
              intent="primary"
              disabled={selectedIds.length === 0}
              onClick={() => setStep("routing")}
              trailingIcon={<ArrowRightIcon size={14} variant="stroke" />}
            >
              Continue · routing
            </Button>
          )}
          {step === "routing" && (
            <Button intent="primary" onClick={() => setStep("confirm")} trailingIcon={<ArrowRightIcon size={14} variant="stroke" />}>
              Continue · review
            </Button>
          )}
          {step === "confirm" && (
            <Button
              intent="primary"
              disabled={!!placeBlockedReason}
              onClick={place}
              leadingIcon={<CheckCircleIcon size={14} variant="stroke" />}
            >
              {cashNow ? "Confirm cash · place booking" : "Place booking"}
            </Button>
          )}
        </div>
      )}
    </section>
  );
}

/* --------------------------------- patient -------------------------------- */

function PatientStep({
  registering,
  setRegistering,
  patientQuery,
  setPatientQuery,
  patientHits,
  selectExisting,
  form,
  setForm,
  duplicates,
  registerPatient,
}: {
  registering: boolean;
  setRegistering: (v: boolean) => void;
  patientQuery: string;
  setPatientQuery: (v: string) => void;
  patientHits: BookingPatient[];
  selectExisting: (p: BookingPatient) => void;
  form: { name: string; phone: string; dobOrAge: string; sex: "" | "female" | "male" | "other" };
  setForm: (f: { name: string; phone: string; dobOrAge: string; sex: "" | "female" | "male" | "other" }) => void;
  duplicates: BookingPatient[];
  registerPatient: () => void;
}) {
  const formValid = !!form.name.trim() && !!form.phone.trim() && !!form.dobOrAge.trim() && !!form.sex;
  return (
    <div className="bc-step-pane">
      <header className="bc-pane-head">
        <h2>Who is this booking for?</h2>
        <p>Find an existing patient, or register a new one. Identity is checked before the sample is collected.</p>
      </header>

      {!registering ? (
        <>
          <Search
            aria-label="Search patients"
            placeholder="Search name, phone, or MRN..."
            value={patientQuery}
            onChange={(e) => setPatientQuery(e.target.value)}
            onClear={() => setPatientQuery("")}
          />
          <ul className="bc-patient-list">
            {patientHits.map((p) => (
              <li key={p.id}>
                <button type="button" className="bc-patient-row" onClick={() => selectExisting(p)}>
                  <Avatar name={p.name} size="md" />
                  <span className="bc-patient-id">
                    <strong>{p.name}</strong>
                    <span>
                      {p.mrn} · {p.phoneMasked}
                      {p.identityTier === "phone_unconfirmed" ? " · new" : ""}
                    </span>
                  </span>
                  <ArrowRightIcon size={15} variant="stroke" />
                </button>
              </li>
            ))}
            {patientHits.length === 0 && (
              <li className="bc-patient-empty">No patient matches “{patientQuery}”. Register a new patient below.</li>
            )}
          </ul>
          <button type="button" className="bc-add-patient" onClick={() => setRegistering(true)}>
            <PlusIcon size={14} variant="stroke" />
            Register a new patient
          </button>
        </>
      ) : (
        <div className="bc-register">
          <div className="bc-register-grid">
            <Input
              label="Full name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.currentTarget.value })}
              placeholder="e.g. Sokha Chann"
              autoComplete="off"
            />
            <Input
              label="Phone"
              required
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.currentTarget.value })}
              placeholder="0xx xxx xxx"
              inputMode="tel"
              autoComplete="off"
            />
            <Input
              label="Date of birth or age"
              required
              value={form.dobOrAge}
              onChange={(e) => setForm({ ...form, dobOrAge: e.currentTarget.value })}
              placeholder="1971-04-09 or 54"
              autoComplete="off"
            />
            <div className="bc-field">
              <span className="bc-field-label">Sex</span>
              <SegmentedToggle
                aria-label="Sex"
                value={form.sex || "female"}
                onChange={(v) => setForm({ ...form, sex: v as "female" | "male" | "other" })}
                options={SEX_OPTIONS}
              />
            </div>
          </div>

          {duplicates.length > 0 && (
            <div className="bc-dupe" role="status">
              <WarningIcon size={14} variant="stroke" />
              <div>
                <strong>Possible duplicate</strong>
                <p>This patient may already exist. Open the existing record instead of creating a second one.</p>
                <div className="bc-dupe-list">
                  {duplicates.slice(0, 3).map((p) => (
                    <button key={p.id} type="button" onClick={() => selectExisting(p)}>
                      {p.name} · {p.mrn} · {p.phoneMasked}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="bc-register-actions">
            <Button intent="ghost" onClick={() => setRegistering(false)}>
              Cancel
            </Button>
            <Button intent="primary" disabled={!formValid} onClick={registerPatient} trailingIcon={<ArrowRightIcon size={14} variant="stroke" />}>
              Use this patient
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------- tests --------------------------------- */

function TestsStep({
  testQuery,
  setTestQuery,
  testResults,
  selectedIds,
  toggleId,
  selectedEntries,
  total,
}: {
  testQuery: string;
  setTestQuery: (v: string) => void;
  testResults: typeof orderItems;
  selectedIds: string[];
  toggleId: (id: string) => void;
  selectedEntries: Array<{ id: string; name: string; price: number; bundle: boolean }>;
  total: number;
}) {
  return (
    <div className="bc-step-pane">
      <header className="bc-pane-head">
        <h2>What tests are we ordering?</h2>
        <p>Add panels or individual tests. Search by name, code, or category.</p>
      </header>

      <div className="bc-bundles">
        {orderBundles.map((b) => {
          const on = selectedIds.includes(b.id);
          return (
            <button
              key={b.id}
              type="button"
              className={cx("bc-bundle", on && "is-on")}
              aria-pressed={on}
              onClick={() => toggleId(b.id)}
            >
              <span className="bc-bundle-ic">{on ? <CheckCircleIcon size={15} variant="bulk" /> : <CartIcon size={15} variant="stroke" />}</span>
              <span>
                <strong>{b.name}</strong>
                <small>
                  {b.testCount} tests · {formatMoney(b.price)}
                </small>
              </span>
            </button>
          );
        })}
      </div>

      <Search
        aria-label="Search tests"
        placeholder="Search tests by name, code, category..."
        value={testQuery}
        onChange={(e) => setTestQuery(e.target.value)}
        onClear={() => setTestQuery("")}
      />

      <ul className="bc-test-list">
        {testResults.map((item) => {
          const on = selectedIds.includes(item.id);
          const disabled = !!item.unavailable;
          return (
            <li key={item.id} className={cx(disabled && "is-disabled")}>
              <div className="bc-test-main">
                <strong>{item.name}</strong>
                <span>
                  {item.code} · {CATEGORY_LABEL.get(item.categoryId) ?? item.categoryId} · {item.tat}
                  {item.unavailable ? ` · ${item.unavailable.reason}` : ""}
                </span>
              </div>
              <span className="bc-test-price">{formatMoney(item.price)}</span>
              <Button
                size="sm"
                intent={on ? "outline" : "primary"}
                disabled={disabled}
                onClick={() => toggleId(item.id)}
                leadingIcon={on ? <CheckCircleIcon size={13} variant="stroke" /> : <PlusIcon size={13} variant="stroke" />}
              >
                {on ? "Added" : "Add"}
              </Button>
            </li>
          );
        })}
        {testResults.length === 0 && <li className="bc-test-empty">No tests match “{testQuery}”.</li>}
      </ul>

      {selectedEntries.length > 0 && (
        <div className="bc-selected">
          <div className="bc-selected-head">
            <span>
              {selectedEntries.length} selected · <strong>{formatMoney(total)}</strong>
            </span>
            <small>{formatKhr(total)}</small>
          </div>
          <div className="bc-selected-chips">
            {selectedEntries.map((e) => (
              <button key={e.id} type="button" className="bc-chip" onClick={() => toggleId(e.id)} aria-label={`Remove ${e.name}`}>
                {e.name}
                <span aria-hidden>×</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* --------------------------------- routing -------------------------------- */

function RoutingStep({
  route,
  setRoute,
  stat,
  setStat,
  pscPay,
  setPscPay,
}: {
  route: OrderRouteId;
  setRoute: (r: OrderRouteId) => void;
  stat: boolean;
  setStat: (v: boolean) => void;
  pscPay: PscPayChoice;
  setPscPay: (p: PscPayChoice) => void;
}) {
  const routes: Array<{ id: OrderRouteId; icon: typeof FlaskIcon; title: string; body: string }> = [
    { id: "clinic", icon: TubeIcon, title: "Draw in clinic", body: "Phlebotomist draws here. Tubes go on the next lab sweep." },
    { id: "psc", icon: PinIcon, title: "Send to PSC", body: "Patient walks into any Kura PSC with a booking code." },
  ];
  const pscPays: Array<{ id: PscPayChoice; label: string; sub: string }> = [
    { id: "later", label: "Pay at PSC", sub: "Patient pays at the counter on arrival." },
    { id: "cash", label: "Cash now", sub: "You collect cash before the patient leaves." },
    { id: "khqr", label: "KHQR", sub: "Patient scans and pays now." },
  ];

  return (
    <div className="bc-step-pane">
      <header className="bc-pane-head">
        <h2>How is the sample collected?</h2>
        <p>Pick the collection route. Mark STAT only when the result is needed urgently.</p>
      </header>

      <div className="bc-route-grid">
        {routes.map((r) => {
          const on = route === r.id;
          const Icon = r.icon;
          return (
            <button key={r.id} type="button" className={cx("bc-route", on && "is-on")} aria-pressed={on} onClick={() => setRoute(r.id)}>
              <span className="bc-route-ic">
                <Icon size={18} variant="stroke" />
              </span>
              <strong>{r.title}</strong>
              <span>{r.body}</span>
            </button>
          );
        })}
      </div>

      <button type="button" className={cx("bc-stat", stat && "is-on")} aria-pressed={stat} onClick={() => setStat(!stat)}>
        <ClockIcon size={15} variant="stroke" />
        <span>
          <strong>STAT · urgent</strong>
          <small>Flags the lab to prioritise. A STAT fee may apply.</small>
        </span>
        <span className="bc-switch" aria-hidden />
      </button>

      {route === "psc" && (
        <section className="bc-pay">
          <span className="bc-field-label">PSC payment</span>
          <div className="bc-pay-grid">
            {pscPays.map((p) => {
              const on = pscPay === p.id;
              return (
                <button key={p.id} type="button" className={cx("bc-pay-opt", on && "is-on")} aria-pressed={on} onClick={() => setPscPay(p.id)}>
                  <span className="bc-radio" aria-hidden />
                  <span>
                    <strong>{p.label}</strong>
                    <small>{p.sub}</small>
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

/* --------------------------------- confirm -------------------------------- */

function ConfirmStep({
  patient,
  selectedEntries,
  total,
  route,
  stat,
  routeLabel,
  paymentLabel,
  notifyLabel,
  tubes,
  tubesReady,
  setTubesReady,
  cashNow,
  cashCollected,
  setCashCollected,
}: {
  patient: BookingPatient;
  selectedEntries: Array<{ id: string; name: string; price: number; bundle: boolean }>;
  total: number;
  route: OrderRouteId;
  stat: boolean;
  routeLabel: string;
  paymentLabel: string;
  notifyLabel: string;
  tubes: ReturnType<typeof tubesForLines>;
  tubesReady: boolean;
  setTubesReady: (v: boolean) => void;
  cashNow: boolean;
  cashCollected: boolean;
  setCashCollected: (v: boolean) => void;
}) {
  return (
    <div className="bc-step-pane">
      <header className="bc-pane-head">
        <h2>Review before placing</h2>
        <p>Check the patient, tests, route, and payment. This creates a real entry in the clinic queue.</p>
      </header>

      <dl className="bc-summary">
        <div>
          <dt>
            <PatientIcon size={13} variant="stroke" /> Patient
          </dt>
          <dd>
            <strong>{patient.name}</strong>
            <span>
              {patient.mrn} · {patient.phoneMasked}
              {patient.dobOrAge ? ` · ${patient.dobOrAge}` : ""}
              {patient.sex ? ` · ${patient.sex}` : ""}
            </span>
          </dd>
        </div>
        <div>
          <dt>
            <FlaskIcon size={13} variant="stroke" /> Tests
          </dt>
          <dd>
            <strong>
              {selectedEntries.length} item{selectedEntries.length === 1 ? "" : "s"} · {formatMoney(total)}
            </strong>
            <span>{selectedEntries.map((e) => e.name).join(", ")}</span>
          </dd>
        </div>
        <div>
          <dt>
            <TubeIcon size={13} variant="stroke" /> Route
          </dt>
          <dd>
            <strong>{routeLabel}</strong>
            <span>{notifyLabel}</span>
          </dd>
        </div>
        <div>
          <dt>
            <CreditCardIcon size={13} variant="stroke" /> Payment
          </dt>
          <dd>
            <strong>{paymentLabel}</strong>
            <span>{formatKhr(total)} estimate</span>
          </dd>
        </div>
      </dl>

      {route === "clinic" && (
        <div className="bc-gate">
          <div className="bc-tubes">
            <span className="bc-tubes-head">
              <TubeIcon size={13} variant="stroke" /> Tubes to prepare
            </span>
            <ul>
              {tubes.map((t) => (
                <li key={t.id}>
                  <strong>{t.name}</strong>
                  <span>{t.tests.join(", ")}</span>
                </li>
              ))}
            </ul>
          </div>
          <Checkbox
            checked={tubesReady}
            onChange={(e) => setTubesReady(e.currentTarget.checked)}
            label="Tubes are labelled and ready for the lab sweep"
          />
        </div>
      )}

      {cashNow && (
        <div className="bc-gate bc-gate-cash">
          <Checkbox
            checked={cashCollected}
            onChange={(e) => setCashCollected(e.currentTarget.checked)}
            label={`Cash of ${formatMoney(total)} collected from the patient`}
            helpText="Required for a cash-now PSC booking — the receipt reconciles against this."
          />
        </div>
      )}

      {stat && (
        <p className="bc-stat-note">
          <ClockIcon size={13} variant="stroke" /> STAT is on — the lab will prioritise this booking.
        </p>
      )}
    </div>
  );
}

/* --------------------------------- placed --------------------------------- */

function PlacedStep({
  placed,
  patient,
  count,
  route,
  onOpenBooking,
  onOpenChart,
  onNewBooking,
  onClose,
}: {
  placed: PlacedOrderSummary;
  patient: BookingPatient;
  count: number;
  route: OrderRouteId;
  onOpenBooking: () => void;
  onOpenChart: () => void;
  onNewBooking: () => void;
  onClose: () => void;
}) {
  return (
    <div className="bc-step-pane bc-placed">
      <div className="bc-placed-banner">
        <CheckCircleIcon size={20} variant="bulk" />
        <div>
          <strong>Booking placed</strong>
          <span>
            {count} test{count === 1 ? "" : "s"} for {patient.name} · now in the clinic queue
          </span>
        </div>
      </div>

      <div className="bc-codes">
        <div>
          <span>Booking ref</span>
          <strong>{placed.code}</strong>
        </div>
        {placed.bookingCode && (
          <div>
            <span>Patient code (PSC)</span>
            <strong>{placed.bookingCode}</strong>
          </div>
        )}
        {placed.handoverCode && (
          <div>
            <span>Handover code</span>
            <strong>{placed.handoverCode}</strong>
          </div>
        )}
        {!placed.bookingCode && !placed.handoverCode && placed.sweep && (
          <div>
            <span>Clinic sweep</span>
            <strong>{placed.sweep}</strong>
          </div>
        )}
      </div>

      <p className="bc-placed-note">
        {route === "psc"
          ? "The booking code and QR are ready to send by Telegram + SMS."
          : "Tubes are queued for the next clinic sweep to the lab."}
      </p>

      <div className="bc-placed-actions">
        <Button intent="primary" onClick={onOpenBooking} trailingIcon={<ArrowRightIcon size={14} variant="stroke" />}>
          Open booking
        </Button>
        <Button intent="outline" onClick={onOpenChart} leadingIcon={<PatientIcon size={14} variant="stroke" />}>
          Open chart
        </Button>
        <Button intent="ghost" onClick={onNewBooking} leadingIcon={<PlusIcon size={14} variant="stroke" />}>
          New booking
        </Button>
        <Button intent="ghost" onClick={onClose}>
          Back to bookings
        </Button>
      </div>
    </div>
  );
}
