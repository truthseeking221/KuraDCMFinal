import type { Metadata } from "next";
import { DoctorMobileApp } from "@/components/DoctorMobile";

export const metadata: Metadata = {
  title: "Lab Catalog · Kura Doctor Mobile",
};

export default function DoctorMobileCatalogPage() {
  return <DoctorMobileApp initialSection="catalog" />;
}
