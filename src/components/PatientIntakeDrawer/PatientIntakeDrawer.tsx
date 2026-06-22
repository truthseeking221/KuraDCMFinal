"use client";

/* Patient Start-intake — doctor-side identity intake.

   This is NOT a reception visit, a sample draw, or a booking. It resolves WHO the
   patient is from a face-to-face phone check, then lets the doctor choose to open
   the chart or create a lab booking. Per mastersource: a verified phone is a
   contact key, not an identity; OTP confirms SIM control, not the person; and the
   PSC/reception still owns confirm + draw. Reuses the identityGraph resolution
   engine that backs the booking-rail gate, so the two surfaces never drift. */

import { useMemo, useState } from "react";
import { Avatar, Badge, Button, Drawer, OtpInput, PhoneInput } from "@/components/ui";
import {
  ArrowLeft as ArrowLeftIcon,
  CheckCircle as CheckCircleIcon,
  CheckShield as ShieldIcon,
  ChevronRight as ChevronRightIcon,
  Patient as PatientIcon,
  Warning as WarningIcon,
} from "@/icons/components";
import { cx } from "@/lib/cx";
import {
  BOOKING_PATIENTS,
  type BookingPatient,
  type GuarantorPhoneGraph,
  type IdentityGraphMember,
} from "@/components/OrderDraft/bookingSeeds";
import {
  LOOKUP_DEMOGRAPHICS,
  ageFromValue,
  dedupHits,
  deriveYearOfBirth,
  digitsOf,
  identityStatusFor,
  maskPhone,
  memberToPatient,
  normalizePhone,
  relationshipLabel,
  resolveGuarantorPhone,
} from "@/components/OrderDraft/identityGraph";
import type { DoctorIdentityDecision, DoctorPatientAssurance } from "@/components/OrderDraft/types";
import "./PatientIntakeDrawer.css";

const DEMO_OTP_CODE = "123456";
const DEMO_YEAR = 2026;

type PatientSex = NonNullable<BookingPatient["sex"]>;
type ProvisionalIdentityKind = Extract<
  DoctorIdentityDecision["kind"],
  "unknown-phone-provisional" | "shared-phone-provisional" | "guarantor-provisional"
>;
type IntakeStep = "phone" | "otp" | "candidates" | "relationship" | "provisional" | "preflight" | "resolved";

/* The resolved handoff payload — the same shape the booking rail freezes onto a
   placed order, so a booking created from here carries the identity decision. */
export type ResolvedIntake = {
  patient: BookingPatient;
  decision: DoctorIdentityDecision;
  assurance: DoctorPatientAssurance;
};

export type PatientIntakeDrawerProps = {
  open: boolean;
  onClose: () => void;
  onOpenChart: (resolved: ResolvedIntake) => void;
  onCreateBooking: (resolved: ResolvedIntake) => void;
};

const SEX_OPTIONS: Array<{ label: string; value: PatientSex }> = [
  { label: "Female", value: "female" },
  { label: "Male", value: "male" },
  { label: "Other", value: "other" },
];

/* Scripted demo phones — quick-fill chips so the flow is exercisable without a
   real directory. Each resolves to a different identity path. */
const DEMO_PHONES: Array<{ label: string; value: string }> = [
  { label: "Known", value: "070 123 496" },
  { label: "Shared", value: "010 000 999" },
  { label: "Guardian", value: "012 777 088" },
  { label: "New", value: "099 111 222" },
];

/* ---- local format helpers (mirror the booking-rail gate) ----------------- */

function isValidCambodiaPhone(raw: string): boolean {
  const d = digitsOf(raw);
  const local = d.startsWith("855") ? d.slice(3) : d.replace(/^0+/, "");
  return local.length >= 8 && local.length <= 9;
}

function maskOtpPhone(raw: string): string {
  const d = digitsOf(raw);
  const local = d.startsWith("855") ? d.slice(3) : d.replace(/^0+/, "");
  if (local.length < 5) return normalizePhone(raw) || raw.trim() || "phone";
  return `+855 ${local.slice(0, 2)} ••• ${local.slice(-3)}`;
}

function slugifyPatientName(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "patient"
  );
}

function sexDisplay(sex: PatientSex): string {
  if (sex === "female") return "Female";
  if (sex === "male") return "Male";
  return "Other";
}

function redactPatientName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "Patient";
  if (parts.length === 1) return `${parts[0][0] ?? "P"}•••`;
  return `${parts[0]} ${parts.slice(1).map((part) => `${part[0] ?? ""}.`).join(" ")}`;
}

/* Phone candidates: loose first/last-3-digit match against the seed directory —
   the same heuristic resolveGuarantorPhone uses for graphs. */
function phoneCandidateHits(phone: string, patients: BookingPatient[]): BookingPatient[] {
  const d = digitsOf(phone);
  if (d.length < 8) return [];
  const first = d.slice(0, 3);
  const last = d.slice(-3);
  const direct = patients.filter((patient) => {
    const pd = digitsOf(patient.phone ?? patient.phoneMasked);
    return pd.length >= 6 && pd.slice(0, 3) === first && pd.slice(-3) === last;
  });
  if (direct.length > 0) return direct;
  if (first === "010") {
    return patients.filter((patient) => digitsOf(patient.phone ?? patient.phoneMasked).startsWith("010")).slice(0, 3);
  }
  return [];
}

function withLookupDemographics(patient: BookingPatient): BookingPatient {
  const demo = LOOKUP_DEMOGRAPHICS[patient.id];
  if (!demo) return patient;
  return {
    ...patient,
    sex: patient.sex ?? demo.sex,
    yearOfBirth: patient.yearOfBirth ?? demo.yearOfBirth,
    dobOrAge: patient.dobOrAge ?? demo.ageLabel,
  };
}

function assuranceForDecision(kind: DoctorIdentityDecision["kind"]): DoctorPatientAssurance {
  return kind === "known-confirmed" || kind === "dependent-confirmed" ? "known-reused" : "provisional";
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "P";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

/* ---- component ----------------------------------------------------------- */

export function PatientIntakeDrawer({ open, onClose, onOpenChart, onCreateBooking }: PatientIntakeDrawerProps) {
  const [step, setStep] = useState<IntakeStep>("phone");
  const [phoneCountry, setPhoneCountry] = useState("KH");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [provisionalKind, setProvisionalKind] = useState<ProvisionalIdentityKind | null>(null);
  const [candidateIdsForDecision, setCandidateIdsForDecision] = useState<string[]>([]);
  const [guarantorGraph, setGuarantorGraph] = useState<GuarantorPhoneGraph | null>(null);
  const [dupCandidates, setDupCandidates] = useState<BookingPatient[]>([]);
  const [sharedMismatchAck, setSharedMismatchAck] = useState(false);
  const [form, setForm] = useState<{ name: string; dobOrAge: string; sex: "" | PatientSex }>({
    name: "",
    dobOrAge: "",
    sex: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [resolved, setResolved] = useState<ResolvedIntake | null>(null);

  const candidates = useMemo(() => phoneCandidateHits(phone, BOOKING_PATIENTS), [phone]);
  const normalizedPhone = normalizePhone(phone);
  const maskedPhone = maskPhone(phone);
  const verifiedPhone = normalizedPhone || phone.trim();

  const resetAll = () => {
    setStep("phone");
    setPhone("");
    setOtp("");
    setOtpSent(false);
    setProvisionalKind(null);
    setCandidateIdsForDecision([]);
    setGuarantorGraph(null);
    setDupCandidates([]);
    setSharedMismatchAck(false);
    setForm({ name: "", dobOrAge: "", sex: "" });
    setError(null);
    setResolved(null);
  };

  const handleClose = () => {
    resetAll();
    onClose();
  };

  /* Terminal: hold the resolved identity and show the choose screen. NEVER books
     or draws — the doctor still picks Open chart vs Create lab booking. */
  const resolve = (patient: BookingPatient, decision: DoctorIdentityDecision) => {
    setResolved({ patient, decision, assurance: assuranceForDecision(decision.kind) });
    setError(null);
    setStep("resolved");
  };

  const sendCode = () => {
    if (!isValidCambodiaPhone(phone)) {
      setError("Enter a valid Cambodia mobile number first.");
      return;
    }
    setSharedMismatchAck(false);
    setDupCandidates([]);
    setError(null);
    setOtp("");
    setOtpSent(true);
    setStep("otp");
  };

  /* A guarantor/guardian phone resolves to a FAMILY, not a patient → ask who the
     patient is before anyone is attached. Otherwise match phone candidates. */
  const resolvePhoneIdentity = () => {
    const graph = resolveGuarantorPhone(phone);
    if (graph) {
      setGuarantorGraph(graph);
      setCandidateIdsForDecision(graph.members.map((member) => member.id));
      setStep("relationship");
      return;
    }
    const matches = phoneCandidateHits(phone, BOOKING_PATIENTS);
    setGuarantorGraph(null);
    setCandidateIdsForDecision(matches.map((candidate) => candidate.id));
    if (matches.length === 0) {
      setProvisionalKind("unknown-phone-provisional");
      setStep("provisional");
      return;
    }
    setStep("candidates");
  };

  const verifyOtp = (code = otp) => {
    if (!otpSent) {
      setError("Send the code before verifying this phone.");
      return;
    }
    if (code.length < DEMO_OTP_CODE.length) {
      setError("Enter the 6-digit code read by the patient.");
      return;
    }
    if (code !== DEMO_OTP_CODE) {
      setError("That code does not match. Check the number and try again.");
      return;
    }
    setError(null);
    resolvePhoneIdentity();
  };

  const confirmKnownPatient = (patient: BookingPatient) => {
    const enriched = withLookupDemographics(patient);
    resolve(
      { ...enriched, phone: enriched.phone ?? normalizedPhone, identityTier: enriched.identityTier ?? "panel" },
      {
        kind: "known-confirmed",
        verifiedPhone,
        candidateIds: candidateIdsForDecision.length ? candidateIdsForDecision : candidates.map((c) => c.id),
        confirmedPatientId: enriched.id,
        relationshipToPhoneHolder: "self",
      },
    );
  };

  const pickGraphMember = (member: IdentityGraphMember) => {
    if (!guarantorGraph) return;
    const patient = memberToPatient(member, phone);
    const isHolder = member.relationshipToHolder === "self";
    resolve(patient, {
      kind: isHolder ? "known-confirmed" : "dependent-confirmed",
      verifiedPhone,
      candidateIds: guarantorGraph.members.map((entry) => entry.id),
      confirmedPatientId: member.id,
      relationshipToPhoneHolder: member.relationshipToHolder,
      phoneHolderName: guarantorGraph.holderName,
    });
  };

  const beginProvisional = (kind: ProvisionalIdentityKind) => {
    setProvisionalKind(kind);
    setDupCandidates([]);
    setSharedMismatchAck(false);
    setForm({ name: "", dobOrAge: "", sex: "" });
    setError(null);
    setStep("provisional");
  };

  const buildProvisional = (): BookingPatient => ({
    id: `intake-${slugifyPatientName(form.name.trim())}`,
    name: form.name.trim(),
    mrn: "PROV-0001",
    phone: verifiedPhone,
    phoneMasked: maskedPhone,
    dobOrAge: form.dobOrAge.trim(),
    yearOfBirth: deriveYearOfBirth(form.dobOrAge),
    sex: form.sex || undefined,
    identityTier: "phone_verified",
    relationship: "new",
  });

  const resolveProvisional = () => {
    const kind = provisionalKind ?? "unknown-phone-provisional";
    resolve(buildProvisional(), {
      kind,
      verifiedPhone,
      candidateIds: candidateIdsForDecision,
      relationshipToPhoneHolder: kind === "guarantor-provisional" ? "dependent" : "self",
      phoneHolderName: kind === "guarantor-provisional" ? guarantorGraph?.holderName : undefined,
      dedupChecked: true,
    });
  };

  /* Provisional submit ALWAYS runs the duplicate preflight first. Only a clear
     preflight (or explicit "create anyway") mints the record. */
  const submitProvisional = () => {
    const name = form.name.trim();
    if (!name || !form.dobOrAge.trim() || !form.sex) {
      setError("Add name, DOB or age, and sex before continuing.");
      return;
    }
    if (provisionalKind === "shared-phone-provisional" && !sharedMismatchAck) {
      setError("Confirm the matched Kura patient is not the person being tested.");
      return;
    }
    const dups = dedupHits(name, form.dobOrAge, form.sex, BOOKING_PATIENTS);
    if (dups.length) {
      setDupCandidates(dups);
      setError(null);
      setStep("preflight");
      return;
    }
    resolveProvisional();
  };

  /* ---- per-step bodies --------------------------------------------------- */

  const toPhone = () => {
    setStep("phone");
    setOtp("");
    setOtpSent(false);
    setError(null);
  };
  /* Back navigation. Candidate / relationship steps return to phone entry (wrong
     number → re-enter); the provisional form returns to whichever picker preceded
     it; preflight returns to the form. */
  const stepBack: Partial<Record<IntakeStep, () => void>> = {
    otp: toPhone,
    candidates: toPhone,
    relationship: toPhone,
    provisional: () => setStep(guarantorGraph ? "relationship" : candidates.length ? "candidates" : "otp"),
    preflight: () => setStep("provisional"),
  };

  const renderPhone = () => (
    <div className="pi-step">
      <p className="pi-lead">Read the patient&rsquo;s mobile number back to them, then send a one-time code to the SIM in the room.</p>
      <PhoneInput
        country={phoneCountry}
        number={phone}
        onCountryChange={setPhoneCountry}
        onNumberChange={(next) => {
          setPhone(next);
          setError(null);
        }}
        placeholder="12 345 678"
        invalid={!!error}
        autoFocus
      />
      <div className="pi-demo" role="group" aria-label="Demo phone numbers">
        <span className="pi-demo-label">Demo</span>
        {DEMO_PHONES.map((demo) => (
          <button
            key={demo.label}
            type="button"
            className="pi-demo-chip"
            onClick={() => {
              setPhone(digitsOf(demo.value));
              setError(null);
            }}
          >
            {demo.label}
          </button>
        ))}
      </div>
      <p className="pi-hint">OTP confirms SIM control, not full identity.</p>
    </div>
  );

  const renderOtp = () => (
    <div className="pi-step">
      <p className="pi-lead">
        Enter the 6-digit code sent to <strong>{maskOtpPhone(phone)}</strong>. Have the patient read it aloud.
      </p>
      <OtpInput
        value={otp}
        onChange={(next) => {
          setOtp(next);
          setError(null);
        }}
        onComplete={(code) => verifyOtp(code)}
        autoFocus
        invalid={!!error}
        ariaLabel="One-time code"
      />
      <p className="pi-hint">
        Demo code <strong>123456</strong>. OTP confirms SIM control, not full identity.
      </p>
    </div>
  );

  const renderCandidates = () => (
    <div className="pi-step">
      <p className="pi-lead">
        This phone matches {candidates.length === 1 ? "a Kura record" : `${candidates.length} Kura records`}. Confirm the person in
        front of you by sight — never by phone alone.
      </p>
      <ul className="pi-candidate-list">
        {candidates.map((candidate) => {
          const demo = LOOKUP_DEMOGRAPHICS[candidate.id];
          const mrnTail = digitsOf(candidate.mrn).slice(-2) || "—";
          const age = candidate.yearOfBirth
            ? `${DEMO_YEAR - Number(candidate.yearOfBirth)}y`
            : demo
              ? `${demo.ageLabel}y`
              : "age —";
          const sex = candidate.sex ? sexDisplay(candidate.sex) : demo ? sexDisplay(demo.sex) : "—";
          return (
            <li key={candidate.id}>
              <button type="button" className="pi-candidate" onClick={() => confirmKnownPatient(candidate)}>
                <Avatar name={candidate.name} size="sm" />
                <span className="pi-candidate-copy">
                  <strong>{redactPatientName(candidate.name)}</strong>
                  <small>
                    Kura record ••{mrnTail} · {age} · {sex}
                  </small>
                </span>
                <ChevronRightIcon aria-hidden size={16} variant="stroke" />
              </button>
            </li>
          );
        })}
      </ul>
      <button type="button" className="pi-text-action" onClick={() => beginProvisional("shared-phone-provisional")}>
        None of these — this is a different person
      </button>
    </div>
  );

  const renderRelationship = () => (
    <div className="pi-step">
      <p className="pi-lead">
        This number belongs to <strong>{guarantorGraph?.holderName}</strong> ({relationshipLabel(guarantorGraph?.holderRelationship ?? "guarantor")}).
        Who is being tested today?
      </p>
      <ul className="pi-candidate-list">
        {guarantorGraph?.members.map((member) => (
          <li key={member.id}>
            <button type="button" className="pi-candidate" onClick={() => pickGraphMember(member)}>
              <Avatar name={member.name} size="sm" />
              <span className="pi-candidate-copy">
                <strong>{member.name}</strong>
                <small>
                  {relationshipLabel(member.relationshipToHolder)} · {member.ageLabel}y · {sexDisplay(member.sex)}
                </small>
              </span>
              <ChevronRightIcon aria-hidden size={16} variant="stroke" />
            </button>
          </li>
        ))}
      </ul>
      <button type="button" className="pi-text-action" onClick={() => beginProvisional("guarantor-provisional")}>
        Someone else on this phone
      </button>
    </div>
  );

  const renderProvisional = () => (
    <div className="pi-step">
      <p className="pi-lead">
        {provisionalKind === "shared-phone-provisional"
          ? "Register the person being tested. The matched Kura record is a different patient on a shared phone."
          : provisionalKind === "guarantor-provisional"
            ? "Register the dependent being tested. The phone holder stays the contact."
            : "No Kura record on this phone yet. Capture the minimum to register — reception verifies identity later."}
      </p>
      <div className="pi-field">
        <label htmlFor="pi-name">Full name</label>
        <input
          id="pi-name"
          className="pi-input"
          value={form.name}
          onChange={(event) => {
            setForm((prev) => ({ ...prev, name: event.target.value }));
            setError(null);
          }}
          placeholder="As the patient says it"
          autoComplete="off"
        />
      </div>
      <div className="pi-field-row">
        <div className="pi-field">
          <label htmlFor="pi-dob">DOB or age</label>
          <input
            id="pi-dob"
            className="pi-input"
            value={form.dobOrAge}
            onChange={(event) => {
              setForm((prev) => ({ ...prev, dobOrAge: event.target.value }));
              setError(null);
            }}
            placeholder="e.g. 1994 or 32"
            autoComplete="off"
          />
        </div>
        <div className="pi-field">
          <span className="pi-field-label">Sex</span>
          <div className="pi-seg" role="radiogroup" aria-label="Sex">
            {SEX_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={form.sex === option.value}
                className={cx("pi-seg-btn", form.sex === option.value && "is-selected")}
                onClick={() => {
                  setForm((prev) => ({ ...prev, sex: option.value }));
                  setError(null);
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      {provisionalKind === "shared-phone-provisional" && (
        <label className="pi-check">
          <input
            type="checkbox"
            checked={sharedMismatchAck}
            onChange={(event) => {
              setSharedMismatchAck(event.target.checked);
              setError(null);
            }}
          />
          <span>I confirmed the matched Kura patient is not the person being tested.</span>
        </label>
      )}
    </div>
  );

  const renderPreflight = () => (
    <div className="pi-step">
      <p className="pi-lead">
        Before creating a new record — these existing Kura patients look similar. Use one if it&rsquo;s the same person.
      </p>
      <ul className="pi-candidate-list">
        {dupCandidates.map((candidate) => {
          const demo = LOOKUP_DEMOGRAPHICS[candidate.id];
          const mrnTail = digitsOf(candidate.mrn).slice(-2) || "—";
          const age = demo ? `${demo.ageLabel}y` : candidate.dobOrAge ?? "age —";
          const sex = candidate.sex ? sexDisplay(candidate.sex) : demo ? sexDisplay(demo.sex) : "—";
          return (
            <li key={candidate.id}>
              <button type="button" className="pi-candidate" onClick={() => confirmKnownPatient(candidate)}>
                <Avatar name={candidate.name} size="sm" />
                <span className="pi-candidate-copy">
                  <strong>{redactPatientName(candidate.name)}</strong>
                  <small>
                    Kura record ••{mrnTail} · {age} · {sex}
                  </small>
                </span>
                <span className="pi-candidate-use">Use this</span>
              </button>
            </li>
          );
        })}
      </ul>
      <button type="button" className="pi-text-action" onClick={resolveProvisional}>
        None match — create a new provisional record
      </button>
    </div>
  );

  const renderResolved = () => {
    if (!resolved) return null;
    const status = identityStatusFor(resolved.decision);
    const provisional = resolved.assurance === "provisional";
    return (
      <div className="pi-step">
        <div className="pi-resolved-card">
          <Avatar name={resolved.patient.name} size="md" />
          <div className="pi-resolved-id">
            <strong>{resolved.patient.name}</strong>
            <small>
              {resolved.patient.mrn} · {resolved.patient.phoneMasked}
            </small>
          </div>
          <Badge
            tone={status.tone === "ok" ? "success" : "warning"}
            icon={status.tone === "ok" ? <CheckCircleIcon size={13} variant="stroke" /> : <ShieldIcon size={13} variant="stroke" />}
          >
            {status.label}
          </Badge>
        </div>
        {provisional ? (
          <p className="pi-resolved-note tone-warning">
            <WarningIcon aria-hidden size={14} variant="bulk" />
            <span>
              <strong>Provisional · PSC verifies</strong> identity documents before the sample is drawn. This is not a confirmed Kura
              record yet.
            </span>
          </p>
        ) : (
          <p className="pi-resolved-note tone-success">
            <CheckCircleIcon aria-hidden size={14} variant="stroke" />
            <span>{status.sub}. No visit or sample is created — pick what to do next.</span>
          </p>
        )}
      </div>
    );
  };

  const body = (() => {
    switch (step) {
      case "phone":
        return renderPhone();
      case "otp":
        return renderOtp();
      case "candidates":
        return renderCandidates();
      case "relationship":
        return renderRelationship();
      case "provisional":
        return renderProvisional();
      case "preflight":
        return renderPreflight();
      case "resolved":
        return renderResolved();
    }
  })();

  /* ---- footer: pinned step action --------------------------------------- */

  const footer = (() => {
    if (step === "phone") {
      return (
        <Button fullWidth intent="primary" disabled={!isValidCambodiaPhone(phone)} onClick={sendCode}>
          Send code
        </Button>
      );
    }
    if (step === "otp") {
      return (
        <Button fullWidth intent="primary" disabled={otp.length < DEMO_OTP_CODE.length} onClick={() => verifyOtp()}>
          Verify number
        </Button>
      );
    }
    if (step === "provisional") {
      return (
        <Button fullWidth intent="primary" onClick={submitProvisional}>
          Continue
        </Button>
      );
    }
    if (step === "resolved" && resolved) {
      return (
        <div className="pi-resolved-actions">
          <Button
            fullWidth
            intent="primary"
            leadingIcon={<PatientIcon size={14} variant="stroke" />}
            onClick={() => {
              onOpenChart(resolved);
              handleClose();
            }}
          >
            Open chart
          </Button>
          <Button
            fullWidth
            intent="secondary"
            leadingIcon={<ChevronRightIcon size={14} variant="stroke" />}
            onClick={() => {
              onCreateBooking(resolved);
              handleClose();
            }}
          >
            Create lab booking
          </Button>
        </div>
      );
    }
    /* candidates / relationship / preflight resolve via inline row clicks. */
    return null;
  })();

  const back = stepBack[step];

  return (
    <Drawer
      className="patient-intake-drawer"
      open={open}
      onClose={handleClose}
      width={460}
      title={
        <span className="pi-title">
          {back && (
            <button type="button" className="pi-back" aria-label="Back" onClick={back}>
              <ArrowLeftIcon size={18} variant="stroke" />
            </button>
          )}
          Start patient intake
        </span>
      }
      subtitle="Face-to-face phone check, then choose or create patient"
      footer={footer ?? undefined}
    >
      {error && (
        <p className="pi-error" role="alert">
          <WarningIcon aria-hidden size={13} variant="bulk" />
          <span>{error}</span>
        </p>
      )}
      {body}
    </Drawer>
  );
}

export default PatientIntakeDrawer;
