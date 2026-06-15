import type { Metadata } from "next";
import { DoctorMobileApp } from "@/components/DoctorMobile";

export const metadata: Metadata = {
  title: "Result Review · Kura Doctor Mobile",
};

export default function DoctorMobilePatientResultPage() {
  return <DoctorMobileApp initialSection="results" />;
}
