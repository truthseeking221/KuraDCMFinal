import type { Metadata } from "next";
import { DoctorMobileApp } from "@/components/DoctorMobile";

export const metadata: Metadata = {
  title: "Encounter Note · Kura Doctor Mobile",
};

/* An encounter id resolves to its patient's chart — the encounter loop (note /
   ICD / Rx / referral / follow-up / claim) is mobile-local state inside the
   chart. The seeded encounter id doubles as the patient id for deep links. */
export default async function DoctorMobileEncounterPage({
  params,
}: {
  params: Promise<{ encounterId: string }>;
}) {
  const { encounterId } = await params;
  return <DoctorMobileApp initialSection="patients" initialPatientId={encounterId} />;
}
