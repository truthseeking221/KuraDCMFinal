import type { Metadata } from "next";
import { PageHero, LeadForm, CoverageMap } from "@/components/sections";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Reach the right Kura team. Questions about a test, doctor verification, or a corporate health programme. We reply within one business day.",
};

export default function ContactPage() {
  return (
    <>
      <PageHero
        tone="tint"
        eyebrow={{ en: "Contact", km: "ទំនាក់ទំនង" }}
        title={{ en: "We're here", km: "យើងនៅទីនេះ" }}
        titleAccent={{ en: "to help", km: "ដើម្បីជួយ" }}
        titleAfter={{ en: "." }}
        lead={{
          en: "A test, your verification, a programme for your company. Tell us what you need and reach the right team.",
          km: "សំណួរអំពីតេស្ត ការផ្ទៀងផ្ទាត់ ឬកម្មវិធីសម្រាប់ក្រុមហ៊ុន — ទាក់ទងក្រុមការងារត្រឹមត្រូវ។",
        }}
        secondary={{ label: { en: "Read the FAQ", km: "មើលសំណួរញឹកញាប់" }, href: "/faq" }}
      />
      <LeadForm tone="default" withContact={true} />
      <CoverageMap tone="tint" />
    </>
  );
}
