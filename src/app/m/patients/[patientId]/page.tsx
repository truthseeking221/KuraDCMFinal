import type { Metadata } from "next";
import { DoctorMobileApp } from "@/components/DoctorMobile";

export const metadata: Metadata = {
  title: "Patient Chart · Kura Doctor Mobile",
};

export default async function DoctorMobilePatientChartPage({
  params,
}: {
  params: Promise<{ patientId: string }>;
}) {
  const { patientId } = await params;
  return <DoctorMobileApp initialSection="patients" initialPatientId={patientId} />;
}
