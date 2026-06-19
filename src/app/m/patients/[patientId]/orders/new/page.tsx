import type { Metadata } from "next";
import { DoctorMobileApp } from "@/components/DoctorMobile";

export const metadata: Metadata = {
  title: "New Order · Kura Doctor Mobile",
};

export default async function DoctorMobileNewOrderPage({
  params,
}: {
  params: Promise<{ patientId: string }>;
}) {
  await params;
  return <DoctorMobileApp initialSection="patients" initialView={{ kind: "composer" }} />;
}
