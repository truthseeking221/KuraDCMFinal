"use client";

/* IdentityGate — the reusable phone -> OTP -> resolve steps shared by the
   new-booking composer and the catalog attach flow. A verified phone is a
   contact key, NOT an identity: this gate verifies the number, then resolves
   WHO the patient is (guarantor member picker, or the provisional path with a
   duplicate preflight). It hands the caller a fully-formed BookingPatient plus
   a DoctorIdentityDecision; it never mints a booking itself. */

import { useMemo, useState } from "react";
import { CheckShield, IDCard, Refresh, User, Warning } from "@/icons";
import { Input, OtpInput, PhoneInput, SegmentedToggle } from "@/components/ui";
import { cx } from "@/lib/cx";
import {
  BOOKING_PATIENTS,
  bookingPatientById,
  type BookingPatient,
  type GuarantorPhoneGraph,
  type IdentityGraphMember,
} from "@/components/OrderDraft/bookingSeeds";
import {
  ageFromValue,
  dedupHits,
  identityStatusFor,
  memberToPatient,
  relationshipLabel,
  resolveGuarantorPhone,
  LOOKUP_DEMOGRAPHICS,
} from "@/components/OrderDraft/identityGraph";
import type {
  DoctorIdentityDecision,
  DoctorPatientAssurance,
} from "@/components/OrderDraft/types";
import base from "@/components/DoctorMobile/DoctorMobileApp.module.css";
import { ListRow, Pill } from "@/components/DoctorMobile/components/primitives";
import styles from "./composer.module.css";

/* The resolved identity the gate produces. patientId/patient are ready to drop
   straight into originateDoctorBooking / placeStandaloneOrder. */
export type ResolvedIdentity = {
  patientId: string;
  patient: BookingPatient;
  assurance: DoctorPatientAssurance;
  decision: DoctorIdentityDecision;
};

type SexValue = "" | "female" | "male" | "other";

/* Internal phases of the gate. */
type Phase = "phone" | "otp" | "member-pick" | "provisional";

export type IdentityGateProps = {
  /* Fired once the doctor has fully resolved an identity (member picked, or a
     provisional confirmed past the dedup preflight). */
  onResolved: (resolved: ResolvedIdentity) => void;
  /* Optional: render an external footer (the composer owns its sticky dock and
     drives continue via these). When omitted the gate shows its own inline
     actions. */
  renderActions?: (actions: GateActions) => React.ReactNode;
};

/* Surfaced so the composer's sticky footer can drive the gate. */
export type GateActions = {
  phase: Phase;
  /* member-pick has no primary action — progression happens by tapping a member
     ListRow (pickMember). When true the footer renders no primary button so
     there is no dead/disabled control. */
  hidePrimary?: boolean;
  primaryLabel: string;
  primaryDisabled: boolean;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
};

function normalizeForResolve(dial: string, raw: string) {
  return `${dial} ${raw}`.trim();
}

export function IdentityGate({ onResolved, renderActions }: IdentityGateProps) {
  const [phase, setPhase] = useState<Phase>("phone");
  const [country, setCountry] = useState("KH");
  const [dial, setDial] = useState("+855");
  const [number, setNumber] = useState("");
  const [code, setCode] = useState("");
  const [otpError, setOtpError] = useState(false);

  const [graph, setGraph] = useState<GuarantorPhoneGraph | null>(null);

  /* provisional registration fields */
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [sex, setSex] = useState<SexValue>("");
  const [dupChecked, setDupChecked] = useState(false);

  const verifiedPhone = useMemo(() => normalizeForResolve(dial, number), [dial, number]);
  const digits = number.replace(/\D/g, "");

  function handleCountry(iso: string) {
    setCountry(iso);
    const map: Record<string, string> = {
      KH: "+855", VN: "+84", TH: "+66", LA: "+856", MY: "+60",
      SG: "+65", US: "+1", GB: "+44", FR: "+33", AU: "+61",
    };
    setDial(map[iso] ?? "+855");
  }

  function sendCode() {
    if (digits.length < 6) return;
    setPhase("otp");
    setCode("");
    setOtpError(false);
  }

  function verifyCode(value: string) {
    /* demo gate: any 6 digits verify. Resolve who the patient is next. */
    if (value.length < 6) {
      setOtpError(true);
      return;
    }
    setOtpError(false);
    const resolved = resolveGuarantorPhone(verifiedPhone);
    if (resolved) {
      setGraph(resolved);
      setPhase("member-pick");
    } else {
      setGraph(null);
      setDupChecked(false);
      setPhase("provisional");
    }
  }

  function pickMember(member: IdentityGraphMember) {
    const isHolder = member.relationshipToHolder === "self";
    const patient = memberToPatient(member, verifiedPhone);
    /* prefer the canonical seed if the picked member already exists in Kura */
    const seed = bookingPatientById.get(member.id);
    const finalPatient: BookingPatient = seed
      ? { ...seed, phone: patient.phone, phoneMasked: patient.phoneMasked }
      : patient;
    const decision: DoctorIdentityDecision = {
      kind: isHolder ? "known-confirmed" : "dependent-confirmed",
      verifiedPhone,
      candidateIds: graph ? graph.members.map((m) => m.id) : [member.id],
      confirmedPatientId: member.id,
      relationshipToPhoneHolder: member.relationshipToHolder,
      phoneHolderId: graph?.members[0]?.id,
      phoneHolderName: graph?.holderName,
    };
    onResolved({
      patientId: member.id,
      patient: finalPatient,
      assurance: "known-reused",
      decision,
    });
  }

  const dedupCandidates = useMemo(() => {
    if (phase !== "provisional" || !name.trim()) return [] as BookingPatient[];
    return dedupHits(name, dob, sex, BOOKING_PATIENTS);
  }, [phase, name, dob, sex]);

  function useExisting(patient: BookingPatient) {
    const decision: DoctorIdentityDecision = {
      kind: "known-confirmed",
      verifiedPhone,
      candidateIds: dedupCandidates.map((p) => p.id),
      confirmedPatientId: patient.id,
      dedupChecked: true,
    };
    onResolved({
      patientId: patient.id,
      patient: { ...patient, phone: verifiedPhone },
      assurance: "known-reused",
      decision,
    });
  }

  function createProvisional() {
    const id = `prov-${digits.slice(-6) || "000000"}-${name.trim().toLowerCase().replace(/\s+/g, "-").slice(0, 16) || "new"}`;
    const ageLabel = (() => {
      const age = ageFromValue(dob);
      return age != null ? String(age) : dob.trim();
    })();
    const patient: BookingPatient = {
      id,
      name: name.trim(),
      mrn: "Pending",
      phone: verifiedPhone,
      phoneMasked: maskLocal(verifiedPhone),
      dobOrAge: ageLabel,
      yearOfBirth: undefined,
      sex: sex || undefined,
      identityTier: "phone_verified",
      relationship: "new",
    };
    const sharedPhone = !!graph; /* never true here (graph routes to picker) */
    const decision: DoctorIdentityDecision = {
      kind: sharedPhone ? "shared-phone-provisional" : "unknown-phone-provisional",
      verifiedPhone,
      candidateIds: dedupCandidates.map((p) => p.id),
      dedupChecked: true,
    };
    onResolved({ patientId: id, patient, assurance: "provisional", decision });
  }

  /* ---- per-phase actions for the external footer ------------------------- */
  const actions: GateActions = (() => {
    switch (phase) {
      case "phone":
        return {
          phase,
          primaryLabel: "Send code",
          primaryDisabled: digits.length < 6,
          onPrimary: sendCode,
        };
      case "otp":
        return {
          phase,
          primaryLabel: "Verify",
          primaryDisabled: code.length < 6,
          onPrimary: () => verifyCode(code),
          secondaryLabel: "Change number",
          onSecondary: () => setPhase("phone"),
        };
      case "member-pick":
        return {
          phase,
          hidePrimary: true,
          primaryLabel: "",
          primaryDisabled: true,
          onPrimary: () => undefined,
          secondaryLabel: "Change number",
          onSecondary: () => setPhase("phone"),
        };
      case "provisional":
        return {
          phase,
          primaryLabel: dedupCandidates.length && !dupChecked ? "Check for duplicates" : "Create new patient",
          primaryDisabled: !name.trim() || !dob.trim() || !sex,
          onPrimary: () => {
            if (dedupCandidates.length && !dupChecked) {
              setDupChecked(true);
              return;
            }
            createProvisional();
          },
          secondaryLabel: "Change number",
          onSecondary: () => setPhase("phone"),
        };
    }
  })();

  return (
    <div className={base.sectionStack}>
      {phase === "phone" && (
        <div className={base.tabPanel}>
          <div className={base.composerStepHead}>
            <p className={base.eyebrow}>Verify contact</p>
          </div>
          <p className={base.muted} style={{ margin: 0, fontSize: 13 }}>
            A phone is a contact key, not an identity. Verify it first — we resolve who the
            patient is next.
          </p>
          <PhoneInput
            country={country}
            number={number}
            onCountryChange={handleCountry}
            onNumberChange={setNumber}
            placeholder="12 345 678"
          />
          {renderActions ? renderActions(actions) : (
            <button
              className={base.primaryButton}
              type="button"
              disabled={actions.primaryDisabled}
              onClick={actions.onPrimary}
            >
              Send code
            </button>
          )}
          <p className={base.muted} style={{ margin: 0, fontSize: 12 }}>
            Demo: 012 777 088 resolves to a guarantor with dependents.
          </p>
        </div>
      )}

      {phase === "otp" && (
        <div className={base.tabPanel}>
          <div className={base.composerStepHead}>
            <p className={base.eyebrow}>Enter code</p>
            <small>{dial} {number}</small>
          </div>
          <p className={base.muted} style={{ margin: 0, fontSize: 13 }}>
            We sent a 6-digit code. Enter it to confirm the doctor is reaching this number.
          </p>
          <OtpInput
            value={code}
            onChange={(v) => { setCode(v); setOtpError(false); }}
            onComplete={verifyCode}
            invalid={otpError}
            autoFocus
          />
          {otpError && (
            <div className={cx(base.banner, base.tone_danger)}>
              <Warning size={16} variant="stroke" aria-hidden="true" />
              <div><strong>Enter all 6 digits</strong></div>
            </div>
          )}
          <button className={base.textButton} type="button" onClick={() => { setCode(""); setOtpError(false); }}>
            <Refresh size={14} variant="stroke" aria-hidden="true" /> Resend code
          </button>
          {renderActions ? renderActions(actions) : (
            <div className={base.stickyCta}>
              <button className={base.secondaryButton} type="button" onClick={actions.onSecondary}>Change number</button>
              <button className={base.primaryButton} type="button" disabled={actions.primaryDisabled} onClick={actions.onPrimary}>Verify</button>
            </div>
          )}
        </div>
      )}

      {phase === "member-pick" && graph && (
        <div className={base.tabPanel}>
          <div className={cx(base.banner, base.tone_info)}>
            <CheckShield size={16} variant="stroke" aria-hidden="true" />
            <div>
              <strong>{graph.holderName}&rsquo;s phone</strong>
              <span>This number belongs to a {relationshipLabel(graph.holderRelationship)}. Who is the patient?</span>
            </div>
          </div>
          <div className={base.composerStepHead}>
            <p className={base.eyebrow}>Choose patient</p>
          </div>
          <div className={base.cardGroup}>
            {graph.members.map((member) => (
              <ListRow
                key={member.id}
                leading={member.relationshipToHolder === "self" ? <User size={16} variant="stroke" aria-hidden="true" /> : <IDCard size={16} variant="stroke" aria-hidden="true" />}
                title={member.name}
                meta={`${member.sex} · ${member.ageLabel}y · ${member.mrn}`}
                sub={member.relationshipToHolder === "self" ? "Phone holder" : `${relationshipLabel(member.relationshipToHolder)} of ${graph.holderName}`}
                onClick={() => pickMember(member)}
              />
            ))}
          </div>
          {!renderActions && (
            <button className={base.secondaryButton} type="button" onClick={actions.onSecondary}>Change number</button>
          )}
        </div>
      )}

      {phase === "provisional" && (
        <ProvisionalForm
          verifiedPhone={`${dial} ${number}`}
          name={name}
          setName={(v) => { setName(v); setDupChecked(false); }}
          dob={dob}
          setDob={(v) => { setDob(v); setDupChecked(false); }}
          sex={sex}
          setSex={(v) => { setSex(v); setDupChecked(false); }}
          dedupCandidates={dupChecked ? dedupCandidates : []}
          onUseExisting={useExisting}
          onCreate={createProvisional}
          showActions={!renderActions}
          actions={actions}
        />
      )}
    </div>
  );
}

function maskLocal(raw: string) {
  const d = raw.replace(/\D/g, "");
  if (d.length < 6) return raw.trim() || "Phone pending";
  return `${d.slice(0, 3)} ••• ${d.slice(-3)}`;
}

function ProvisionalForm({
  verifiedPhone,
  name,
  setName,
  dob,
  setDob,
  sex,
  setSex,
  dedupCandidates,
  onUseExisting,
  onCreate,
  showActions,
  actions,
}: {
  verifiedPhone: string;
  name: string;
  setName: (v: string) => void;
  dob: string;
  setDob: (v: string) => void;
  sex: SexValue;
  setSex: (v: SexValue) => void;
  dedupCandidates: BookingPatient[];
  onUseExisting: (p: BookingPatient) => void;
  onCreate: () => void;
  showActions: boolean;
  actions: GateActions;
}) {
  const status = identityStatusFor(null);
  return (
    <div className={base.tabPanel}>
      <div className={cx(base.banner, base.tone_warning)}>
        <Warning size={16} variant="stroke" aria-hidden="true" />
        <div>
          <strong>{status.label}</strong>
          <span>{status.sub} Register the patient below.</span>
        </div>
      </div>

      <div className={base.composerStepHead}>
        <p className={base.eyebrow}>Verified phone</p>
        <Pill tone="success">Verified</Pill>
      </div>
      <div className={base.reviewRow}>
        <span>Contact</span>
        <strong>{verifiedPhone}</strong>
      </div>

      <div className={styles.fieldStack}>
        <Input
          label="Full name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Sok Dara"
        />
        <Input
          label="Date of birth or age"
          required
          value={dob}
          onChange={(e) => setDob(e.target.value)}
          placeholder="1994 or 32"
          helpText="Year of birth or age in years"
        />
        <div className={styles.fieldLabel}>
          <span>Sex</span>
          <SegmentedToggle<"female" | "male" | "other">
            options={[
              { value: "female", label: "Female" },
              { value: "male", label: "Male" },
              { value: "other", label: "Other" },
            ]}
            value={(sex || "female") as "female" | "male" | "other"}
            onChange={(v) => setSex(v)}
          />
        </div>
      </div>

      {dedupCandidates.length > 0 && (
        <div className={base.sectionStack}>
          <div className={cx(base.banner, base.tone_info)}>
            <IDCard size={16} variant="stroke" aria-hidden="true" />
            <div>
              <strong>Possible existing patient</strong>
              <span>This name and age may already be in Kura. Reuse the record to avoid a duplicate.</span>
            </div>
          </div>
          <div className={base.cardGroup}>
            {dedupCandidates.map((candidate) => {
              const demo = LOOKUP_DEMOGRAPHICS[candidate.id];
              return (
                <ListRow
                  key={candidate.id}
                  leading={<IDCard size={16} variant="stroke" aria-hidden="true" />}
                  title={candidate.name}
                  meta={`${candidate.mrn}${demo ? ` · ${demo.sex} · ${demo.ageLabel}y` : ""}`}
                  trailing={<span className={cx(base.addChip, base.addChipActive)}>Use this</span>}
                  onClick={() => onUseExisting(candidate)}
                />
              );
            })}
          </div>
          <button className={base.secondaryButton} type="button" onClick={onCreate}>
            Create new anyway
          </button>
        </div>
      )}

      {showActions && (
        <div className={base.stickyCta}>
          <button className={base.secondaryButton} type="button" onClick={actions.onSecondary}>Change number</button>
          <button className={base.primaryButton} type="button" disabled={actions.primaryDisabled} onClick={actions.onPrimary}>{actions.primaryLabel}</button>
        </div>
      )}
    </div>
  );
}
