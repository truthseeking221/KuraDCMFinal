import type { Metadata } from "next";
import { DoctorMobileApp } from "@/components/DoctorMobile";

export const metadata: Metadata = {
  title: "Today · Kura Doctor Mobile",
};

export default function DoctorMobileTodayPage() {
  return <DoctorMobileApp initialSection="home" />;
}
