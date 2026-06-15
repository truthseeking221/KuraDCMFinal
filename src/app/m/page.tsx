import type { Metadata } from "next";
import { DoctorMobileApp } from "@/components/DoctorMobile";

export const metadata: Metadata = {
  title: "Kura Doctor Mobile",
  description: "Mobile clinical companion for Kura doctors",
};

export default function DoctorMobilePage() {
  return <DoctorMobileApp />;
}
