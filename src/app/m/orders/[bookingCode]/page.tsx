import type { Metadata } from "next";
import { DoctorMobileApp } from "@/components/DoctorMobile";

export const metadata: Metadata = {
  title: "Order Detail · Kura Doctor Mobile",
};

export default async function DoctorMobileOrderDetailPage({
  params,
}: {
  params: Promise<{ bookingCode: string }>;
}) {
  const { bookingCode } = await params;
  return <DoctorMobileApp initialSection="bookings" initialBookingCode={bookingCode} />;
}
