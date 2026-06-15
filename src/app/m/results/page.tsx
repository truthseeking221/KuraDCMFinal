import type { Metadata } from "next";
import { DoctorMobileApp } from "@/components/DoctorMobile";

export const metadata: Metadata = {
  title: "Results · Kura Doctor Mobile",
};

export default function DoctorMobileResultsPage() {
  return <DoctorMobileApp initialSection="results" />;
}
