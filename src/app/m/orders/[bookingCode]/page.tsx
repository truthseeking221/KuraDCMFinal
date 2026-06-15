import type { Metadata } from "next";
import { DoctorMobileApp } from "@/components/DoctorMobile";

export const metadata: Metadata = {
  title: "Order Detail · Kura Doctor Mobile",
};

export default function DoctorMobileOrderDetailPage() {
  return <DoctorMobileApp initialSection="orders" />;
}
