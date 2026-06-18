/* Patient Identity Gate v2 — shared resolution helpers.

   A verified phone is a contact key, not a patient identity. These helpers back
   the identity gate on every booking surface (Lab Catalog rail, New booking
   wizard): resolve a phone against a guarantor graph, run a duplicate preflight
   before minting a provisional, and describe the resulting assurance. There is
   no backend — matching runs over the scripted seeds. */

import {
  GUARANTOR_PHONE_GRAPHS,
  type BookingPatient,
  type GuarantorPhoneGraph,
  type IdentityGraphMember,
} from "./bookingSeeds";
import type { DoctorIdentityDecision, PhoneHolderRelationship } from "./types";

const DEMO_YEAR = 2026;
type PatientSex = NonNullable<BookingPatient["sex"]>;

/* Demographics the lookup "knows" for seeded patients — drives the duplicate
   preflight (age/sex match) and the masked candidate rows. */
export const LOOKUP_DEMOGRAPHICS: Record<string, { sex: PatientSex; yearOfBirth: string; ageLabel: string }> = {
  "sokha-chan": { sex: "female", yearOfBirth: "1994", ageLabel: "32" },
  "dara-pich": { sex: "male", yearOfBirth: "1968", ageLabel: "58" },
  "bopha-lim": { sex: "female", yearOfBirth: "1981", ageLabel: "45" },
  "sovann-tep": { sex: "male", yearOfBirth: "1959", ageLabel: "67" },
  "sreymom-sok": { sex: "female", yearOfBirth: "1974", ageLabel: "52" },
  "sophea-chea": { sex: "female", yearOfBirth: "1988", ageLabel: "38" },
  "rithy-kong": { sex: "male", yearOfBirth: "1972", ageLabel: "54" },
  "visal-heng": { sex: "male", yearOfBirth: "1967", ageLabel: "59" },
};

function digitsOf(value: string) {
  return value.replace(/\D/g, "");
}

function maskPhone(raw: string) {
  const d = digitsOf(raw);
  if (d.length < 6) return raw.trim() || "Phone pending";
  return `${d.slice(0, 3)} ••• ${d.slice(-3)}`;
}

function normalizePhone(raw: string) {
  const d = digitsOf(raw);
  if (!d) return "";
  if (d.startsWith("855")) return `+${d}`;
  return `+855${d.replace(/^0+/, "")}`;
}

function deriveYearOfBirth(value: string) {
  const trimmed = value.trim();
  const year = trimmed.match(/\b(19|20)\d{2}\b/)?.[0];
  if (year) return year;
  const age = Number.parseInt(trimmed, 10);
  if (Number.isFinite(age) && age > 0 && age < 120) return String(DEMO_YEAR - age);
  return undefined;
}

export function ageFromValue(value: string): number | null {
  const year = deriveYearOfBirth(value);
  if (!year) return null;
  const age = DEMO_YEAR - Number(year);
  return Number.isFinite(age) ? age : null;
}

/* A verified phone may belong to a guarantor/guardian rather than the patient.
   Match the scripted identity graph by first/last digits (same loose match the
   candidate lookup uses) so the gate can ask "who is the patient?" first. */
export function resolveGuarantorPhone(phone: string): GuarantorPhoneGraph | null {
  const d = digitsOf(phone);
  if (d.length < 8) return null;
  const first = d.slice(0, 3);
  const last = d.slice(-3);
  return (
    GUARANTOR_PHONE_GRAPHS.find((graph) => {
      const gd = digitsOf(graph.phone);
      return gd.slice(0, 3) === first && gd.slice(-3) === last;
    }) ?? null
  );
}

/* Duplicate preflight: before minting a provisional, look for an existing Kura
   patient that the typed name / age / sex probably already describes. Demo-only
   matching over the seed demographics — a stand-in for a real dedup service. */
export function dedupHits(name: string, dobOrAge: string, sex: "" | PatientSex, patients: BookingPatient[]) {
  const typedTokens = name.toLowerCase().split(/\s+/).filter(Boolean);
  if (!typedTokens.length) return [] as BookingPatient[];
  const typedAge = ageFromValue(dobOrAge);
  return patients
    .filter((patient) => {
      const demo = LOOKUP_DEMOGRAPHICS[patient.id];
      const patientTokens = patient.name.toLowerCase().split(/\s+/).filter(Boolean);
      const shared = typedTokens.filter((token) => patientTokens.includes(token)).length;
      const nameStrong = shared >= 2 || (shared >= 1 && typedTokens[0] === patientTokens[0]);
      const ageMatch = !!demo && typedAge != null && Number(demo.ageLabel) === typedAge;
      const sexMatch = !!demo && !!sex && demo.sex === sex;
      return nameStrong || (shared >= 1 && ageMatch && sexMatch);
    })
    .slice(0, 3);
}

export function relationshipLabel(relationship: PhoneHolderRelationship): string {
  switch (relationship) {
    case "self":
      return "the phone holder";
    case "parent":
      return "parent";
    case "child":
      return "child";
    case "guardian":
      return "guardian";
    case "guarantor":
      return "guarantor";
    case "dependent":
      return "dependent";
    case "caregiver":
      return "caregiver";
  }
}

/* Turn a scripted identity-graph member into an attachable patient. The verified
   number is the holder's contact phone, kept as contact only — for a dependent
   it is NOT promoted to a personal primary phone elsewhere. */
export function memberToPatient(member: IdentityGraphMember, phone: string): BookingPatient {
  return {
    id: member.id,
    name: member.name,
    mrn: member.mrn,
    phone: normalizePhone(phone) || phone.trim(),
    phoneMasked: maskPhone(phone),
    dobOrAge: member.ageLabel,
    yearOfBirth: String(DEMO_YEAR - Number(member.ageLabel)),
    sex: member.sex,
    identityTier: "panel",
    relationship: "kura_known",
  };
}

/* Identity assurance shown on the rail + booking. Verified vs provisional drives
   both the badge and the post-send booking sub-status. */
export function identityStatusFor(decision: DoctorIdentityDecision | null): {
  tone: "ok" | "warn";
  label: string;
  sub: string;
} {
  const verified = decision?.kind === "known-confirmed" || decision?.kind === "dependent-confirmed";
  if (verified) {
    const viaDependent = decision?.kind === "dependent-confirmed";
    return {
      tone: "ok",
      label: "Identity verified",
      sub: viaDependent ? "Dependent confirmed under guarantor phone" : "Matched in Kura · confirmed by doctor",
    };
  }
  return {
    tone: "warn",
    label: "Provisional identity",
    sub: "Phone verified · identity not matched · PSC verifies at visit",
  };
}
