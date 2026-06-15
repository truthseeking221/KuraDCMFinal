import type { Metadata } from "next";
import { DoctorMobileApp } from "@/components/DoctorMobile";

export const metadata: Metadata = {
  title: "More · Kura Doctor Mobile",
};

export default function DoctorMobileMorePage() {
  return <DoctorMobileApp initialSection="more" />;
}
