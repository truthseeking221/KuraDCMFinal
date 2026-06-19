import type { Metadata } from "next";
import { PageHero, StatShowcase, FeatureRows, PeopleGrid } from "@/components/sections";
import { CTASection } from "@/components/site/CTASection";
import { ACCREDITATIONS } from "@/data/site";
import { ADVISORS, LEADERS } from "@/data/team";
import { AboutBento } from "./_AboutBento";

export const metadata: Metadata = {
  title: "About Kura",
  description:
    "Our mission, our science, our people. We built Kura so any doctor in Cambodia can order the right test and any patient can understand the result.",
};

export default function AboutPage() {
  return (
    <>
      <PageHero
        tone="tint"
        eyebrow={{ en: "About Kura", km: "អំពី Kura" }}
        title={{ en: "Care that", km: "ការថែទាំ" }}
        titleAccent={{ en: "travels", km: "ដែលគ្មានព្រំដែន" }}
        titleAfter={{ en: ".", km: "។" }}
        lead={{
          en: "We built Kura so a doctor anywhere in Cambodia can order the right test, and any patient can understand the result. Mission first. Clinically rigorous.",
          km: "Kura ត្រូវបានបង្កើតឡើង ដើម្បីឱ្យគ្រូពេទ្យគ្រប់ទីកន្លែងក្នុងប្រទេសកម្ពុជា អាចបញ្ជាទិញតេស្តត្រឹមត្រូវ ហើយអ្នកជំងឺគ្រប់រូបអាចយល់លទ្ធផល។ បេសកកម្មមុនគេ ហើយម៉ត់ចត់តាមវេជ្ជសាស្ត្រ។",
        }}
      />

      <AboutBento />

      <StatShowcase
        tone="ink"
        eyebrow={{ en: "By the numbers", km: "តាមតួលេខ" }}
        title={{ en: "Trusted at scale", km: "ទុកចិត្តក្នុងទ្រង់ទ្រាយធំ" }}
        lead={{
          en: "Doctors, patients and labs across Cambodia, and the network keeps growing.",
          km: "បណ្តាញកំពុងរីកចម្រើននៃគ្រូពេទ្យ អ្នកជំងឺ និងមន្ទីរពិសោធន៍នៅទូទាំងប្រទេសកម្ពុជា។",
        }}
      />

      <FeatureRows
        tone="default"
        numbered={false}
        eyebrow={{ en: "Science & quality", km: "វិទ្យាសាស្ត្រ និងគុណភាព" }}
        title={{ en: "Rigour you can check", km: "ភាពម៉ត់ចត់ដែលអ្នកអាចផ្ទៀងផ្ទាត់" }}
        lead={{
          en: "The accreditations, partners and standards behind every result we send back.",
          km: "វិញ្ញាបនបត្រ ដៃគូ និងស្តង់ដារ ដែលគាំទ្ររាល់លទ្ធផលដែលយើងផ្តល់ជូន។",
        }}
        items={ACCREDITATIONS.map((a, i) => ({
          icon: (["shield", "lock", "flask", "report"] as const)[i % 4],
          title: { en: a.name, km: a.name },
          body: a.note,
        }))}
      />

      <PeopleGrid
        people={ADVISORS}
        tone="tint"
        columns={3}
        eyebrow={{ en: "Medical advisory board", km: "ក្រុមប្រឹក្សាវេជ្ជសាស្ត្រ" }}
        title={{ en: "Built with Cambodia's doctors", km: "បង្កើតជាមួយគ្រូពេទ្យកម្ពុជា" }}
      />

      <PeopleGrid
        people={LEADERS}
        tone="default"
        columns={3}
        eyebrow={{ en: "Leadership", km: "ថ្នាក់ដឹកនាំ" }}
        title={{ en: "The people behind Kura", km: "ក្រុមនៅពីក្រោយ Kura" }}
      />

      <CTASection
        title={{ en: "Help us raise the standard.", km: "ចូលរួមជាមួយយើងក្នុងការលើកស្តង់ដារ។" }}
        primary={{ label: { en: "Work with Kura", km: "ធ្វើការជាមួយ Kura" }, href: "/contact" }}
      />
    </>
  );
}
