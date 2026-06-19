import type { Metadata } from "next";
import { PageHero, FaqSection } from "@/components/sections";
import { CTASection } from "@/components/site/CTASection";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Clear answers on ordering, sampling, results, pricing and privacy. For patients, doctors and businesses using Kura diagnostics in Cambodia.",
};

export default function FaqPage() {
  return (
    <>
      <PageHero
        tone="tint"
        eyebrow={{ en: "FAQ", km: "សំណួរញឹកញាប់" }}
        title={{ en: "Questions,", km: "សំណួរ" }}
        titleAccent={{ en: "answered", km: "ដែលមានចម្លើយ" }}
        titleAfter={{ en: "." }}
        lead={{
          en: "Ordering, sampling, results, pricing and privacy. Grouped by who's asking.",
          km: "អ្វីៗគ្រប់យ៉ាងអំពីការបញ្ជាទិញ ការយកសំណាក លទ្ធផល តម្លៃ និងឯកជនភាព ដែលរៀបចំតាមអ្នកសួរ។",
        }}
      />
      <FaqSection
        audience="general"
        tone="default"
        eyebrow={{ en: "Basics", km: "មូលដ្ឋាន" }}
        title={{ en: "General", km: "ទូទៅ" }}
        showContact={false}
      />
      <FaqSection
        audience="patients"
        tone="tint"
        eyebrow={{ en: "Patients", km: "អ្នកជំងឺ" }}
        title={{ en: "For patients", km: "សម្រាប់អ្នកជំងឺ" }}
        showContact={false}
      />
      <FaqSection
        audience="doctors"
        tone="default"
        eyebrow={{ en: "Doctors", km: "គ្រូពេទ្យ" }}
        title={{ en: "For doctors", km: "សម្រាប់គ្រូពេទ្យ" }}
        showContact={false}
      />
      <FaqSection
        audience="business"
        tone="tint"
        eyebrow={{ en: "Business", km: "អាជីវកម្ម" }}
        title={{ en: "For business", km: "សម្រាប់អាជីវកម្ម" }}
        showContact={true}
      />
      <CTASection
        title={{ en: "Didn't find your answer?", km: "រកចម្លើយមិនឃើញ?" }}
        subtitle={{
          en: "Ask us. We reply in plain language, usually the same day.",
          km: "ក្រុមការងាររបស់យើងឆ្លើយតបជាភាសាសាមញ្ញ ជាធម្មតាក្នុងថ្ងៃតែមួយ។",
        }}
        primary={{ label: { en: "Talk to our team", km: "ទាក់ទងក្រុមការងារ" }, href: "/contact" }}
        secondary={{ label: { en: "See how it works", km: "មើលរបៀបដំណើរការ" }, href: "/how-it-works" }}
      />
    </>
  );
}
