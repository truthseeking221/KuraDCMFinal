import type { Metadata } from "next";
import { DoctorMobileApp } from "@/components/DoctorMobile";

export const metadata: Metadata = {
  title: "New Order · Kura Doctor Mobile",
};

export default function DoctorMobileNewOrderPage() {
  return <DoctorMobileApp initialOrderStep="select" initialSection="patients" />;
}
