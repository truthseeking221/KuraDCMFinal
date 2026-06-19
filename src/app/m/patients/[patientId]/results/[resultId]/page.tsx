import type { Metadata } from "next";
import { DoctorMobileApp } from "@/components/DoctorMobile";

export const metadata: Metadata = {
  title: "Result Review · Kura Doctor Mobile",
};

export default async function DoctorMobilePatientResultPage({
  params,
}: {
  params: Promise<{ patientId: string; resultId: string }>;
}) {
  const { patientId, resultId } = await params;
  return (
    <DoctorMobileApp
      initialSection="patients"
      initialView={{ kind: "chart-result", patientId, resultId }}
    />
  );
}
