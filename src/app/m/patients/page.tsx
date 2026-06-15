import type { Metadata } from "next";
import { DoctorMobileApp } from "@/components/DoctorMobile";

export const metadata: Metadata = {
  title: "Patients · Kura Doctor Mobile",
};

export default function DoctorMobilePatientsPage() {
  return <DoctorMobileApp initialSection="patients" />;
}
