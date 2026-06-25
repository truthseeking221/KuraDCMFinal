"use client";

import { useMemo, useState } from "react";
import { Avatar, Breadcrumb, Button, Checkbox, Input, OtpInput, PhoneInput, Search, SegmentedToggle, Stepper } from "@/components/ui";
import type { StepperStatus } from "@/components/ui";
import {
  ArrowLeft as ArrowLeftIcon,
  ArrowRight as ArrowRightIcon,
  Cart as CartIcon,
  CheckCircle as CheckCircleIcon,
  Close as CloseIcon,
  CreditCard as CreditCardIcon,
  Flask as FlaskIcon,
  Patient as PatientIcon,
  Pin as PinIcon,
  Plus as PlusIcon,
  Warning as WarningIcon,
} from "@/icons/components";
import { cx } from "@/lib/cx";
import {
  dedupHits,
  formatKhr,
  formatMoney,
  memberToPatient,
  orderBundleById,
  orderBundles,
  orderCategories,
  orderItemById,
  orderItems,
  relationshipLabel,
  resolveGuarantorPhone,
  useOrderDraft,
} from "@/components/OrderDraft";
import type { DoctorIdentityDecision, DoctorPatientAssurance, PlacedOrderSummary, PscPayChoice } from "@/components/OrderDraft";
import {
  BOOKING_PATIENTS,
  type BookingPatient,
  type GuarantorPhoneGraph,
  type IdentityGraphMember,
} from "@/components/OrderDraft/bookingSeeds";
import "./BookingComposer.css";

/* =============================================================================
   Doctor booking builder — Phone gate → Patient identity → Tests → Payment →
   Review → Code. This is the doctor-app /orders front door. Internal PSC
   reception owns confirm-and-draw; Catalog only seeds tests into this flow.
   ========================================================================== */

type Step = "phone" | "patient" | "tests" | "confirm" | "placed";
type ProvisionalIdentityKind = Extract<
  DoctorIdentityDecision["kind"],
  "unknown-phone-provisional" | "shared-phone-provisional" | "guarantor-provisional"
>;
/* Review folds payment + confirm into one screen so the doctor sees the total,
   picks how the patient pays, and sends — without a throwaway payment step. */
const STEP_ORDER: Step[] = ["phone", "patient", "tests", "confirm"];
const STEP_LABEL: Record<Step, string> = {
  phone: "Verify phone",
  patient: "Choose patient",
  tests: "Tests",
  confirm: "Review",
  placed: "Placed",
};

const CATEGORY_LABEL = new Map(orderCategories.map((c) => [c.id, c.label]));
const DEMO_YEAR = 2026;

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

function maskPhone(raw: string) {
  const d = digitsOf(raw);
  if (d.length < 6) return raw.trim() || "Phone not entered";
  return `${d.slice(0, 3)} ••• ${d.slice(-3)}`;
}

function normalizePhone(raw: string) {
  const d = digitsOf(raw);
  if (!d) return "";
  if (d.startsWith("855")) return `+${d}`;
  return `+855${d.replace(/^0+/, "")}`;
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

function deriveYearOfBirth(value: string) {
  const trimmed = value.trim();
  const year = trimmed.match(/\b(19|20)\d{2}\b/)?.[0];
  if (year) return year;
  const age = Number.parseInt(trimmed, 10);
  if (Number.isFinite(age) && age > 0 && age < 120) return String(DEMO_YEAR - age);
  return undefined;
}

function candidateIdentity(patient: BookingPatient) {
  const mrnDigits = digitsOf(patient.mrn).slice(-2) || "unknown";
  return {
    name: patient.name,
    nid: `NID •••• ${mrnDigits}`,
    dob: patient.yearOfBirth ? `YOB ${patient.yearOfBirth.slice(0, 3)}•` : "DOB ••••",
    sex: patient.sex ? sexDisplay(patient.sex) : "sex unknown",
  };
}

function sexDisplay(sex: NonNullable<BookingPatient["sex"]>) {
  if (sex === "female") return "Female";
  if (sex === "male") return "Male";
  return "Other";
}

function phoneCandidateHits(phone: string, patients: BookingPatient[]) {
  const d = digitsOf(phone);
  if (d.length < 8) return [];
  const first = d.slice(0, 3);
  const last = d.slice(-3);
  const direct = patients.filter((p) => {
    const pd = digitsOf(p.phone ?? p.phoneMasked);
    return pd.length >= 6 && pd.slice(0, 3) === first && pd.slice(-3) === last;
  });
  if (direct.length > 0) return direct;
  if (first === "010") return patients.filter((p) => digitsOf(p.phone ?? p.phoneMasked).startsWith("010")).slice(0, 3);
  return [];
}

export type BookingComposerProps = {
  breadcrumbRootLabel?: string;
  initialItemIds?: string[];
  initialPatient?: BookingPatient | null;
  /* Pre-resolved identity (e.g. from Patient Start-intake). When all three of
     patient + decision + assurance are seeded, the composer skips the phone/OTP
     step and opens at Tests — the doctor already verified who this is. */
  initialIdentityDecision?: DoctorIdentityDecision | null;
  initialPatientAssurance?: DoctorPatientAssurance | null;
  onClose: () => void;
  onOpenPatient: (patientId: string) => void;
  onOpenBooking: (code: string) => void;
};

export function BookingComposer({
  breadcrumbRootLabel = "Bookings",
  initialItemIds = [],
  initialPatient = null,
  initialIdentityDecision = null,
  initialPatientAssurance = null,
  onClose,
  onOpenPatient,
  onOpenBooking,
}: BookingComposerProps) {
  const { originateDoctorBooking } = useOrderDraft();

  /* Identity already resolved upstream → seed it and land on Tests, no re-verify. */
  const identitySeeded = !!(initialPatient && initialIdentityDecision && initialPatientAssurance);

  const [step, setStep] = useState<Step>(identitySeeded ? "tests" : "phone");
  const [phoneCountry, setPhoneCountry] = useState("KH");
  const [phone, setPhone] = useState(initialPatient?.phone ?? "");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(identitySeeded);
  const [selectedPatient, setSelectedPatient] = useState<BookingPatient | null>(identitySeeded ? initialPatient : null);
  const [patientAssurance, setPatientAssurance] = useState<DoctorPatientAssurance | null>(
    identitySeeded ? initialPatientAssurance : null,
  );
  const [identityDecision, setIdentityDecision] = useState<DoctorIdentityDecision | null>(
    identitySeeded ? initialIdentityDecision : null,
  );
  const [provisionalKind, setProvisionalKind] = useState<ProvisionalIdentityKind | null>(null);
  const [candidateIdsForDecision, setCandidateIdsForDecision] = useState<string[]>([]);
  const [createdPatients, setCreatedPatients] = useState<BookingPatient[]>(
    identitySeeded && initialPatientAssurance === "provisional" && initialPatient ? [initialPatient] : [],
  );
  /* Identity-graph state: a guarantor phone routes to "who is the patient?", and
     the duplicate preflight holds probable existing patients before a mint. */
  const [guarantorGraph, setGuarantorGraph] = useState<GuarantorPhoneGraph | null>(null);
  const [dupCandidates, setDupCandidates] = useState<BookingPatient[]>([]);
  const [form, setForm] = useState<{ name: string; dobOrAge: string; sex: "" | "female" | "male" | "other" }>({
    name: "",
    dobOrAge: "",
    sex: "",
  });

  const [testQuery, setTestQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>(() => Array.from(new Set(initialItemIds)));
  const [pscPay, setPscPay] = useState<PscPayChoice>("later");
  const [cashCollected, setCashCollected] = useState(false);
  const [placed, setPlaced] = useState<PlacedOrderSummary | null>(null);

  const allPatients = useMemo(() => [...createdPatients, ...BOOKING_PATIENTS], [createdPatients]);
  const candidates = useMemo(() => (phoneVerified ? phoneCandidateHits(phone, allPatients) : []), [allPatients, phone, phoneVerified]);

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
  const normalizedPhone = normalizePhone(phone);
  const cashNow = pscPay === "cash";
  const paymentLabel =
    pscPay === "cash"
      ? "Cash at your office"
      : pscPay === "khqr"
        ? "KHQR link sent"
        : "Pay at PSC";
  const placeBlockedReason = !phoneVerified
    ? "Verify the phone first."
    : !selectedPatient || !patientAssurance || !identityDecision
      ? "Choose the patient first."
      : selectedIds.length === 0
        ? "Add at least one test."
        : cashNow && !cashCollected
          ? `Confirm cash received before sending ${formatMoney(total)}.`
          : null;

  const toggleId = (id: string) =>
    setSelectedIds((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]));

  const resetIdentity = (nextPhone: string) => {
    setPhone(nextPhone);
    setOtpSent(false);
    setOtp("");
    setPhoneVerified(false);
    setSelectedPatient(null);
    setPatientAssurance(null);
    setIdentityDecision(null);
    setProvisionalKind(null);
    setCandidateIdsForDecision([]);
    setGuarantorGraph(null);
    setDupCandidates([]);
    setForm({ name: "", dobOrAge: "", sex: "" });
  };

  const verifyOtp = (nextOtp = otp) => {
    if (digitsOf(nextOtp).length !== 6) return;
    setPhoneVerified(true);
    setDupCandidates([]);
    /* A guarantor/guardian phone resolves to a family, not a patient — route to
       relationship resolution before anyone is attached. */
    const graph = resolveGuarantorPhone(phone);
    if (graph) {
      setGuarantorGraph(graph);
      setCandidateIdsForDecision(graph.members.map((member) => member.id));
      return;
    }
    setGuarantorGraph(null);
    const matches = phoneCandidateHits(phone, allPatients);
    setCandidateIdsForDecision(matches.map((candidate) => candidate.id));
    if (matches.length === 0) {
      setProvisionalKind("unknown-phone-provisional");
      setStep("patient");
    }
  };

  const confirmKnownPatient = (patient: BookingPatient) => {
    setSelectedPatient({ ...patient, phone: patient.phone ?? normalizedPhone, identityTier: patient.identityTier ?? "panel" });
    setPatientAssurance("known-reused");
    setIdentityDecision({
      kind: "known-confirmed",
      verifiedPhone: normalizedPhone || phone.trim(),
      candidateIds: candidateIdsForDecision.length ? candidateIdsForDecision : candidates.map((candidate) => candidate.id),
      confirmedPatientId: patient.id,
      relationshipToPhoneHolder: "self",
    });
    setProvisionalKind(null);
    setDupCandidates([]);
    setStep("tests");
  };

  /* Attach a member chosen from a guarantor phone graph: the holder (self) is a
     known patient; a dependent is attached as dependent-confirmed. */
  const pickGraphMember = (member: IdentityGraphMember) => {
    if (!guarantorGraph) return;
    const patient = memberToPatient(member, phone);
    const isHolder = member.relationshipToHolder === "self";
    setSelectedPatient(patient);
    setPatientAssurance("known-reused");
    setIdentityDecision({
      kind: isHolder ? "known-confirmed" : "dependent-confirmed",
      verifiedPhone: normalizedPhone || phone.trim(),
      candidateIds: guarantorGraph.members.map((entry) => entry.id),
      confirmedPatientId: member.id,
      relationshipToPhoneHolder: member.relationshipToHolder,
      phoneHolderName: guarantorGraph.holderName,
    });
    setProvisionalKind(null);
    setStep("tests");
  };

  const beginProvisional = (kind: ProvisionalIdentityKind = candidates.length ? "shared-phone-provisional" : "unknown-phone-provisional") => {
    setSelectedPatient(null);
    setPatientAssurance(null);
    setIdentityDecision(null);
    setProvisionalKind(kind);
    setDupCandidates([]);
    setForm({ name: "", dobOrAge: "", sex: "" });
    setCandidateIdsForDecision(guarantorGraph ? guarantorGraph.members.map((m) => m.id) : candidates.map((candidate) => candidate.id));
    setStep("patient");
  };

  /* Mint the provisional record + attach. Called only after the dedup preflight
     is clear (or the doctor chose "create anyway"). */
  const attachProvisional = () => {
    const name = form.name.trim();
    if (!phoneVerified || !name || !form.dobOrAge.trim() || !form.sex) return;
    const p: BookingPatient = {
      id: `new-${slugify(name)}-${createdPatients.length + 1}`,
      name,
      mrn: `PROV-${String(createdPatients.length + 1).padStart(4, "0")}`,
      phoneMasked: maskPhone(phone),
      phone: normalizedPhone || phone.trim(),
      dobOrAge: form.dobOrAge.trim(),
      yearOfBirth: deriveYearOfBirth(form.dobOrAge),
      sex: form.sex,
      identityTier: "phone_verified",
      relationship: "new",
    };
    setCreatedPatients((current) => [p, ...current]);
    setSelectedPatient(p);
    setPatientAssurance("provisional");
    setIdentityDecision({
      kind: provisionalKind ?? "unknown-phone-provisional",
      verifiedPhone: normalizedPhone || phone.trim(),
      candidateIds: candidateIdsForDecision,
      relationshipToPhoneHolder: provisionalKind === "guarantor-provisional" ? "dependent" : "self",
      phoneHolderName: provisionalKind === "guarantor-provisional" ? guarantorGraph?.holderName : undefined,
      dedupChecked: true,
    });
    setDupCandidates([]);
    setStep("tests");
  };

  /* Provisional submit runs the duplicate preflight first. Hits surface a chooser
     in the patient step; a clear preflight mints immediately. */
  const submitProvisional = () => {
    const name = form.name.trim();
    if (!phoneVerified || !name || !form.dobOrAge.trim() || !form.sex) return;
    const dups = dedupHits(name, form.dobOrAge, form.sex, BOOKING_PATIENTS);
    if (dups.length) {
      setDupCandidates(dups);
      return;
    }
    attachProvisional();
  };

  const place = () => {
    if (placeBlockedReason || !selectedPatient || !patientAssurance || !identityDecision) return;
    const result = originateDoctorBooking({
      patientId: selectedPatient.id,
      patient: selectedPatient,
      itemIds: selectedIds,
      pscPay,
      patientAssurance,
      identityDecision,
    });
    if (!result) return;
    setPlaced(result);
    setStep("placed");
  };

  const resetForNewBooking = () => {
    setStep("phone");
    resetIdentity("");
    setTestQuery("");
    setSelectedIds([]);
    setPscPay("later");
    setCashCollected(false);
    setPlaced(null);
  };

  const currentIndex = STEP_ORDER.indexOf(step);
  const getStepStatus = (i: number): StepperStatus => (i < currentIndex ? "complete" : i === currentIndex ? "current" : "pending");
  const stepperItems = STEP_ORDER.map((s, i) => ({
    label: STEP_LABEL[s],
    value: s,
    status: getStepStatus(i),
  }));

  const goBack = () => {
    if (step === "tests") {
      setStep(patientAssurance === "known-reused" ? "phone" : "patient");
      return;
    }
    setStep(STEP_ORDER[Math.max(0, currentIndex - 1)]);
  };

  const goToStep = (next: string) => {
    if (next === "phone") {
      setStep("phone");
      return;
    }
    if (next === "patient" && phoneVerified) {
      setStep("patient");
      return;
    }
    if ((next === "tests" || next === "confirm") && selectedPatient && identityDecision) {
      if (next === "confirm" && selectedIds.length === 0) return;
      setStep(next as Step);
    }
  };

  return (
    <section className="bc" aria-label="New booking">
      <div className="bc-top">
        <Breadcrumb
          className="bc-breadcrumb"
          items={[
            { label: breadcrumbRootLabel, onClick: onClose },
            { label: "New booking" },
          ]}
        />
        {step !== "placed" && <Stepper aria-label="Booking steps" items={stepperItems} onStepClick={goToStep} />}
      </div>

      <div className="bc-body">
        {step !== "placed" ? (
          <div className="bc-workbench">
            <main className="bc-main">
              {step === "phone" && (
                <PhoneStep
                  phone={phone}
                  phoneCountry={phoneCountry}
                  setPhoneCountry={setPhoneCountry}
                  setPhone={resetIdentity}
                  otpSent={otpSent}
                  setOtpSent={setOtpSent}
                  otp={otp}
                  setOtp={setOtp}
                  phoneVerified={phoneVerified}
                  verifyOtp={verifyOtp}
                  candidates={candidates}
                  guarantorGraph={guarantorGraph}
                  onConfirmKnown={confirmKnownPatient}
                  onPickMember={pickGraphMember}
                  onCreateNew={beginProvisional}
                />
              )}

              {step === "patient" && (
                <PatientStep
                  phone={phone}
                  phoneCountry={phoneCountry}
                  provisionalKind={provisionalKind ?? "unknown-phone-provisional"}
                  guarantorName={guarantorGraph?.holderName ?? null}
                  form={form}
                  setForm={setForm}
                  dupCandidates={dupCandidates}
                  onSubmit={submitProvisional}
                  onUseExisting={confirmKnownPatient}
                  onCreateAnyway={attachProvisional}
                  onBackFromPreflight={() => setDupCandidates([])}
                />
              )}

              {step === "tests" && (
                <TestsStep
                  patientName={selectedPatient?.name ?? null}
                  testQuery={testQuery}
                  setTestQuery={setTestQuery}
                  testResults={testResults}
                  selectedIds={selectedIds}
                  toggleId={toggleId}
                />
              )}

              {step === "confirm" && selectedPatient && (
                <ConfirmStep
                  patient={selectedPatient}
                  selectedEntries={selectedEntries}
                  total={total}
                  pscPay={pscPay}
                  setPscPay={setPscPay}
                  paymentLabel={paymentLabel}
                  cashNow={cashNow}
                  cashCollected={cashCollected}
                  setCashCollected={setCashCollected}
                />
              )}
            </main>

            <BookingSummaryRail
              step={step}
              phone={phone}
              phoneVerified={phoneVerified}
              patient={selectedPatient}
              patientAssurance={patientAssurance}
              selectedEntries={selectedEntries}
              total={total}
              paymentLabel={paymentLabel}
              blockedReason={placeBlockedReason}
              onRemoveTest={toggleId}
            />
          </div>
        ) : placed && selectedPatient ? (
          <PlacedStep
            placed={placed}
            patient={selectedPatient}
            count={selectedIds.length}
            onOpenBooking={() => onOpenBooking(placed.code)}
            onOpenChart={() => onOpenPatient(selectedPatient.id)}
            onNewBooking={resetForNewBooking}
            onClose={onClose}
          />
        ) : null}
      </div>

      {step !== "placed" && (
        <div className="bc-footer">
          {step !== "phone" ? (
            <Button intent="ghost" onClick={goBack} leadingIcon={<ArrowLeftIcon size={14} variant="stroke" />}>
              Back
            </Button>
          ) : (
            <span />
          )}

          {step === "patient" && dupCandidates.length === 0 && (
            <Button
              intent="primary"
              disabled={!form.name.trim() || !form.dobOrAge.trim() || !form.sex}
              onClick={submitProvisional}
              trailingIcon={<ArrowRightIcon size={14} variant="stroke" />}
            >
              Check &amp; continue
            </Button>
          )}
          {step === "tests" && (
            <Button
              intent="primary"
              disabled={selectedIds.length === 0}
              onClick={() => setStep("confirm")}
              trailingIcon={<ArrowRightIcon size={14} variant="stroke" />}
            >
              {selectedIds.length === 0
                ? "Add tests to review"
                : `Review booking · ${formatMoney(total)}`}
            </Button>
          )}
          {step === "confirm" && (
            <Button
              intent="primary"
              disabled={!!placeBlockedReason}
              onClick={place}
              leadingIcon={<CheckCircleIcon size={14} variant="stroke" />}
            >
              {cashNow ? "Confirm cash and send" : "Send booking code"}
            </Button>
          )}
        </div>
      )}
    </section>
  );
}

function BookingSummaryRail({
  step,
  phone,
  phoneVerified,
  patient,
  patientAssurance,
  selectedEntries,
  total,
  paymentLabel,
  blockedReason,
  onRemoveTest,
}: {
  step: Step;
  phone: string;
  phoneVerified: boolean;
  patient: BookingPatient | null;
  patientAssurance: DoctorPatientAssurance | null;
  selectedEntries: Array<{ id: string; name: string; price: number; bundle: boolean }>;
  total: number;
  paymentLabel: string;
  blockedReason: string | null;
  onRemoveTest: (id: string) => void;
}) {
  const hasTests = selectedEntries.length > 0;
  const hasPhone = digitsOf(phone).length > 0;
  const showTestsSummary = hasTests || step === "tests" || step === "confirm";

  return (
    <aside className="bc-rail" aria-label="Booking summary">
      <header className="bc-rail-head">
        <h2>Booking summary</h2>
        {hasTests && <span className="bc-rail-count">{selectedEntries.length}</span>}
      </header>

      <div className="bc-rail-body">
        <section className="bc-rail-section">
          <span className="bc-rail-label">Phone</span>
          <div className="bc-rail-route">
            <strong>{hasPhone ? maskPhone(phone) : "Phone not entered"}</strong>
            <small>
              {phoneVerified
                ? "SMS code confirmed"
                : hasPhone
                  ? "Next: send SMS code"
                  : "Enter a phone number to start"}
            </small>
          </div>
        </section>

        {patient && (
          <section className="bc-rail-section">
            <span className="bc-rail-label">Patient</span>
            <div className="bc-rail-patient">
              <Avatar name={patient.name} size="sm" />
              <span>
                <strong>{patient.name}</strong>
                <small>
                  {patient.mrn} · {patient.phoneMasked}
                  {patientAssurance === "provisional" ? " · provisional" : ""}
                </small>
              </span>
            </div>
          </section>
        )}

        {hasTests ? (
          <section className="bc-rail-section">
            <span className="bc-rail-label">Tests</span>
            <ul className="bc-rail-tests">
              {selectedEntries.map((entry) => (
                <li key={entry.id}>
                  <span className="bc-rail-test-icon" aria-hidden>
                    <FlaskIcon size={14} variant="bulk" />
                  </span>
                  <span className="bc-rail-test-copy">
                    <strong>{entry.name}</strong>
                    <small>{entry.bundle ? "Panel" : "Catalog test"}</small>
                  </span>
                  <em>{formatMoney(entry.price)}</em>
                  <button type="button" onClick={() => onRemoveTest(entry.id)} aria-label={`Remove ${entry.name}`}>
                    <CloseIcon size={14} variant="stroke" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : showTestsSummary ? (
          <div className="bc-rail-empty">
            <span className="bc-rail-empty-badge" aria-hidden>
              <FlaskIcon size={16} variant="bulk" />
            </span>
            <span className="bc-rail-empty-copy">
              <strong>No tests selected</strong>
              <span>{patient ? "Add catalog tests for this booking." : "Verify the phone, then add tests."}</span>
            </span>
          </div>
        ) : null}

        {step === "confirm" && (
          <section className="bc-rail-section bc-rail-route">
            <div>
              <span className="bc-rail-label">Collection</span>
              <strong>PSC visit</strong>
              <small>Reception confirms draw later</small>
            </div>
            <div>
              <span className="bc-rail-label">Payment</span>
              <strong>{paymentLabel}</strong>
            </div>
          </section>
        )}
      </div>

      {hasTests && (
        <footer className="bc-rail-footer">
          <section className="bc-rail-total">
            <div className="bc-rail-total-row">
              <span>Total due</span>
              <strong>{formatMoney(total)}</strong>
            </div>
            <div className="bc-rail-total-sub">
              <small>{formatKhr(total)}</small>
            </div>
          </section>

          {blockedReason ? (
            <div className="bc-rail-blocker" role="status">
              <WarningIcon size={14} variant="stroke" />
              <span>{blockedReason}</span>
            </div>
          ) : (
            <div className="bc-rail-ready" role="status">
              <CheckCircleIcon size={14} variant="stroke" />
              <span>Ready to send the PSC code.</span>
            </div>
          )}
        </footer>
      )}
    </aside>
  );
}

function PhoneStep({
  phone,
  phoneCountry,
  setPhoneCountry,
  setPhone,
  otpSent,
  setOtpSent,
  otp,
  setOtp,
  phoneVerified,
  verifyOtp,
  candidates,
  guarantorGraph,
  onConfirmKnown,
  onPickMember,
  onCreateNew,
}: {
  phone: string;
  phoneCountry: string;
  setPhoneCountry: (v: string) => void;
  setPhone: (v: string) => void;
  otpSent: boolean;
  setOtpSent: (v: boolean) => void;
  otp: string;
  setOtp: (v: string) => void;
  phoneVerified: boolean;
  verifyOtp: (nextOtp?: string) => void;
  candidates: BookingPatient[];
  guarantorGraph: GuarantorPhoneGraph | null;
  onConfirmKnown: (p: BookingPatient) => void;
  onPickMember: (member: IdentityGraphMember) => void;
  onCreateNew: (kind?: ProvisionalIdentityKind) => void;
}) {
  const phoneReady = digitsOf(phone).length >= 8;
  const otpReady = digitsOf(otp).length === 6;
  const sharedPhone = candidates.length > 1;
  return (
    <div className="bc-step-pane bc-step-pane--patient">
      <header className="bc-pane-head">
        <h2>Verify phone number</h2>
        <p>Send a code, then choose the right patient before adding tests.</p>
      </header>

      <div className="bc-phone-gate">
        <div className="bc-phone-field">
          <span className="bc-field-label">Phone number</span>
          <PhoneInput
            country={phoneCountry}
            number={phone}
            onCountryChange={setPhoneCountry}
            onNumberChange={setPhone}
            placeholder="70 123 456"
            verified={phoneVerified}
            locked={phoneVerified}
            onUnlock={() => setPhone(phone)}
            lockedDescription="Phone verified for this booking. Change phone to restart."
          />
        </div>
        <Button intent="outline" disabled={!phoneReady || phoneVerified} onClick={() => setOtpSent(true)}>
          {otpSent ? "Code sent" : "Send code"}
        </Button>
      </div>

      {otpSent && !phoneVerified && (
        <div className="bc-otp-panel">
          <div className="bc-otp-copy">
            <span className="bc-rail-label">Phone verification</span>
            <strong>SMS sent to {maskPhone(phone)}</strong>
            <small>Ask the patient for the 6 digit code.</small>
          </div>
          <OtpInput
            value={otp}
            onChange={setOtp}
            onComplete={verifyOtp}
            autoFocus
            ariaLabel="6 digit patient phone verification code"
          />
          <Button intent="primary" disabled={!otpReady} onClick={() => verifyOtp()}>
            Verify phone
          </Button>
          <button className="bc-attach-resend" type="button" onClick={() => setOtpSent(true)}>
            Resend code
          </button>
        </div>
      )}

      {phoneVerified && guarantorGraph && (
        <section className="bc-phone-results" aria-live="polite">
          <div className="bc-phone-verified is-warning">
            <CheckCircleIcon size={15} variant="bulk" />
            <span>{maskPhone(phone)} belongs to {guarantorGraph.holderName} ({relationshipLabel(guarantorGraph.holderRelationship)}).</span>
          </div>

          <div className="bc-candidate-head">
            <strong>Who is the patient for this booking?</strong>
            <span>A phone holder is not automatically the patient. Choose the person who will take the tests.</span>
          </div>

          <ul className="bc-candidate-list">
            {guarantorGraph.members.map((member) => (
              <li key={member.id}>
                <div className="bc-candidate-row">
                  <Avatar name={member.name} size="md" />
                  <span className="bc-candidate-main">
                    <strong>{member.name}</strong>
                    <span>
                      {member.ageLabel}y · {member.relationshipToHolder === "self" ? "phone holder" : relationshipLabel(member.relationshipToHolder)}
                    </span>
                  </span>
                  <span className="bc-candidate-actions">
                    <button type="button" className="bc-candidate-primary" onClick={() => onPickMember(member)}>
                      Select
                    </button>
                  </span>
                </div>
              </li>
            ))}
          </ul>
          <button type="button" className="bc-add-patient" onClick={() => onCreateNew("guarantor-provisional")}>
            <PlusIcon size={14} variant="stroke" />
            Someone else not listed
          </button>
        </section>
      )}

      {phoneVerified && !guarantorGraph && candidates.length > 0 && (
        <section className="bc-phone-results" aria-live="polite">
          <div className="bc-phone-verified">
            <CheckCircleIcon size={15} variant="bulk" />
            <span>{maskPhone(phone)} verified. Confirm the person before ordering.</span>
          </div>

          <div className="bc-candidate-head">
            <strong>{sharedPhone ? "Shared phone candidates" : "Possible Kura record"}</strong>
            <span>
              {sharedPhone
                ? "This phone maps to more than one possible patient. Choose only after confirming with the person in front of you."
                : "Do not continue unless this is the person who will take the tests."}
            </span>
          </div>

          <ul className="bc-candidate-list">
            {candidates.map((candidate) => {
              const identity = candidateIdentity(candidate);
              return (
                <li key={candidate.id}>
                  <div className="bc-candidate-row">
                    <Avatar name={candidate.name} size="md" />
                    <span className="bc-candidate-main">
                      <strong>{identity.name}</strong>
                      <span>
                        {identity.dob} · {identity.sex} · {identity.nid}
                      </span>
                    </span>
                    <span className="bc-candidate-actions">
                      {!sharedPhone && (
                        <button type="button" className="bc-candidate-secondary" onClick={() => onCreateNew("shared-phone-provisional")}>
                          No, not this patient
                        </button>
                      )}
                      <button type="button" className="bc-candidate-primary" onClick={() => onConfirmKnown(candidate)}>
                        Yes, this is {identity.name}
                      </button>
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
          {sharedPhone && (
            <button type="button" className="bc-add-patient" onClick={() => onCreateNew("shared-phone-provisional")}>
              <PlusIcon size={14} variant="stroke" />
              None of these patients
            </button>
          )}
        </section>
      )}
    </div>
  );
}

function PatientStep({
  phone,
  phoneCountry,
  provisionalKind,
  guarantorName,
  form,
  setForm,
  dupCandidates,
  onSubmit,
  onUseExisting,
  onCreateAnyway,
  onBackFromPreflight,
}: {
  phone: string;
  phoneCountry: string;
  provisionalKind: ProvisionalIdentityKind;
  guarantorName: string | null;
  form: { name: string; dobOrAge: string; sex: "" | "female" | "male" | "other" };
  setForm: (f: { name: string; dobOrAge: string; sex: "" | "female" | "male" | "other" }) => void;
  dupCandidates: BookingPatient[];
  onSubmit: () => void;
  onUseExisting: (p: BookingPatient) => void;
  onCreateAnyway: () => void;
  onBackFromPreflight: () => void;
}) {
  const formValid = !!form.name.trim() && !!form.dobOrAge.trim() && !!form.sex;
  const sharedPhone = provisionalKind === "shared-phone-provisional";
  const guarantorChild = provisionalKind === "guarantor-provisional";

  /* Duplicate preflight: a Kura patient already matches the typed identity. */
  if (dupCandidates.length > 0) {
    return (
      <div className="bc-step-pane bc-step-pane--patient">
        <header className="bc-pane-head">
          <h2>Possible existing patient</h2>
          <p>Before creating a new record for {form.name.trim()}, check it is not one of these.</p>
        </header>

        <div className="bc-provisional-banner is-warning">
          <PatientIcon size={15} variant="stroke" />
          <span>
            <strong>A Kura patient already looks like this</strong>
            <small>Pick the existing record, or create the new patient only if none match.</small>
          </span>
        </div>

        <ul className="bc-candidate-list">
          {dupCandidates.map((candidate) => {
            const identity = candidateIdentity(candidate);
            return (
              <li key={candidate.id}>
                <div className="bc-candidate-row">
                  <Avatar name={candidate.name} size="md" />
                  <span className="bc-candidate-main">
                    <strong>{identity.name}</strong>
                    <span>
                      {identity.dob} · {identity.sex} · {identity.nid}
                    </span>
                  </span>
                  <span className="bc-candidate-actions">
                    <button type="button" className="bc-candidate-primary" onClick={() => onUseExisting(candidate)}>
                      Use this
                    </button>
                  </span>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="bc-register-actions">
          <button type="button" className="bc-attach-resend" onClick={onBackFromPreflight}>
            Back to details
          </button>
          <Button intent="outline" onClick={onCreateAnyway}>
            Create {form.name.trim() || "new patient"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bc-step-pane bc-step-pane--patient">
      <header className="bc-pane-head">
        <h2>New patient details</h2>
        <p>Add only what PSC reception needs to identify the patient.</p>
      </header>

      <div className={cx("bc-provisional-banner", (sharedPhone || guarantorChild) && "is-warning")}>
        <PatientIcon size={15} variant="stroke" />
        <span>
          <strong>
            {sharedPhone
              ? "Different person on a phone already in Kura"
              : guarantorChild
                ? `New dependent under ${guarantorName ?? "this phone"}`
                : "No patient found with this phone"}
          </strong>
          <small>
            {sharedPhone
              ? "Use only when the matched Kura patient is not the person being tested. PSC reception verifies before the draw."
              : guarantorChild
                ? "The patient is not in Kura yet. PSC reception verifies the dependent before the draw."
                : "We check this is not an existing patient before creating a provisional record."}
          </small>
        </span>
      </div>

      <div className="bc-register">
        <div className="bc-locked-phone-field">
          <span className="bc-field-label">Verified phone</span>
          <PhoneInput
            country={phoneCountry}
            number={phone}
            onCountryChange={() => undefined}
            onNumberChange={() => undefined}
            locked
            verified
            disabled
            lockedDescription="Phone is locked to this verified lookup. Go back to change phone."
          />
        </div>
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
            label="DOB or age"
            required
            value={form.dobOrAge}
            onChange={(e) => setForm({ ...form, dobOrAge: e.currentTarget.value })}
            placeholder="1971 or 54"
            autoComplete="off"
          />
          <div className="bc-field">
            <span className="bc-field-label">Sex</span>
            <SegmentedToggle
              aria-label="Sex"
              value={form.sex as "female" | "male" | "other"}
              onChange={(v) => setForm({ ...form, sex: v as "female" | "male" | "other" })}
              options={SEX_OPTIONS}
            />
          </div>
        </div>

        <div className="bc-register-actions">
          <Button intent="primary" disabled={!formValid} onClick={onSubmit} trailingIcon={<ArrowRightIcon size={14} variant="stroke" />}>
            Use provisional identity
          </Button>
        </div>
      </div>
    </div>
  );
}

function TestsStep({
  patientName,
  testQuery,
  setTestQuery,
  testResults,
  selectedIds,
  toggleId,
}: {
  patientName: string | null;
  testQuery: string;
  setTestQuery: (v: string) => void;
  testResults: typeof orderItems;
  selectedIds: string[];
  toggleId: (id: string) => void;
}) {
  return (
    <div className="bc-step-pane bc-step-pane--tests">
      <header className="bc-pane-head">
        <h2>{patientName ? `Order tests for ${patientName}` : "Order tests"}</h2>
        <p>Add the tests this patient needs.</p>
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
        {testResults.length === 0 && <li className="bc-test-empty">No tests match &quot;{testQuery}&quot;.</li>}
      </ul>
    </div>
  );
}

const PSC_PAY_OPTIONS: Array<{ id: PscPayChoice; label: string; sub: string }> = [
  { id: "later", label: "Pay at PSC", sub: "Patient pays at reception during the visit." },
  { id: "cash", label: "Cash at your office", sub: "Record cash received before sending." },
  { id: "khqr", label: "KHQR before visit", sub: "Send a payment link before the visit." },
];

function ConfirmStep({
  patient,
  selectedEntries,
  total,
  pscPay,
  setPscPay,
  paymentLabel,
  cashNow,
  cashCollected,
  setCashCollected,
}: {
  patient: BookingPatient;
  selectedEntries: Array<{ id: string; name: string; price: number; bundle: boolean }>;
  total: number;
  pscPay: PscPayChoice;
  setPscPay: (p: PscPayChoice) => void;
  paymentLabel: string;
  cashNow: boolean;
  cashCollected: boolean;
  setCashCollected: (v: boolean) => void;
}) {
  return (
    <div className="bc-step-pane">
      <header className="bc-pane-head">
        <h2>Review booking</h2>
        <p>
          Check the patient, tests, and payment, then send the booking code for the PSC visit.
          {cashNow ? " Nothing is charged until you confirm the cash below." : " No payment is taken now."}
        </p>
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
            <PinIcon size={13} variant="stroke" /> Collection
          </dt>
          <dd>
            <strong>PSC visit</strong>
            <span>Patient receives the code, QR, preparation notes, and PSC directions.</span>
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

      <section className="bc-pay">
        <span className="bc-field-label">How the patient pays</span>
        <div className="bc-pay-grid">
          {PSC_PAY_OPTIONS.map((p) => {
            const on = pscPay === p.id;
            return (
              <button
                key={p.id}
                type="button"
                className={cx("bc-pay-opt", on && "is-on")}
                aria-pressed={on}
                onClick={() => setPscPay(p.id)}
              >
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

      {cashNow && (
        <div className={cx("bc-gate bc-gate-cash", cashCollected && "is-confirmed")}>
          <Checkbox
            className="bc-cash-confirm-checkbox"
            checked={cashCollected}
            onChange={(e) => setCashCollected(e.currentTarget.checked)}
            label={
              <span className="bc-cash-confirm-label">
                <span>
                  <strong>Cash received</strong>
                  <small>We will mark this order as paid at your office.</small>
                </span>
                <em>{formatMoney(total)}</em>
              </span>
            }
          />
        </div>
      )}
    </div>
  );
}

function PlacedStep({
  placed,
  patient,
  count,
  onOpenBooking,
  onOpenChart,
  onNewBooking,
  onClose,
}: {
  placed: PlacedOrderSummary;
  patient: BookingPatient;
  count: number;
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
          <strong>Booking code sent</strong>
          <span>
            {count} test{count === 1 ? "" : "s"} for {patient.name} · awaiting PSC visit
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
            <span>Patient code</span>
            <strong>{placed.bookingCode}</strong>
          </div>
        )}
      </div>

      <p className="bc-placed-note">The booking is now in the doctor queue as Awaiting visit. PSC reception will confirm draw after the patient arrives.</p>

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
