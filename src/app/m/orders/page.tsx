import type { Metadata } from "next";
import { DoctorMobileApp } from "@/components/DoctorMobile";

export const metadata: Metadata = {
  title: "Orders · Kura Doctor Mobile",
};

export default function DoctorMobileOrdersPage() {
  return <DoctorMobileApp initialSection="orders" />;
}
