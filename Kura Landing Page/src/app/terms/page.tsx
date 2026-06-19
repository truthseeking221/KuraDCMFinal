import type { Metadata } from "next";
import { PageHero } from "@/components/sections";
import { LegalBody } from "./_LegalBody";

export const metadata: Metadata = {
  title: "Terms of service",
  description:
    "The terms that govern your use of Kura, for doctors, patients, and business partners across Cambodia.",
};

export default function TermsPage() {
  return (
    <>
      <PageHero
        tone="tint"
        eyebrow={{ en: "Legal", km: "ផ្លូវច្បាប់" }}
        title={{ en: "The fine print, made plain", km: "លក្ខខណ្ឌនៃសេវាកម្ម" }}
        lead={{
          en: "The terms that govern how you use Kura.",
          km: "លក្ខខណ្ឌដែលគ្រប់គ្រងការប្រើប្រាស់ Kura របស់អ្នក។",
        }}
      />
      <LegalBody />
    </>
  );
}
