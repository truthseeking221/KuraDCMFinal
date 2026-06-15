import type { Metadata } from "next";
import { DoctorMobileApp } from "@/components/DoctorMobile";

export const metadata: Metadata = {
  title: "Patient Chart · Kura Doctor Mobile",
};

export default function DoctorMobilePatientChartPage() {
  return <DoctorMobileApp initialSection="patients" />;
}
