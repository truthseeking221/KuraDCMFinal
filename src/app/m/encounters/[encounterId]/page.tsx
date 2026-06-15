import type { Metadata } from "next";
import { DoctorMobileApp } from "@/components/DoctorMobile";

export const metadata: Metadata = {
  title: "Encounter Note · Kura Doctor Mobile",
};

export default function DoctorMobileEncounterPage() {
  return <DoctorMobileApp initialSection="more" />;
}
