import type { Metadata } from "next";
import { PageHero, PricingTiers, PackagesSection, ValueReframe, FaqSection } from "@/components/sections";
import { CTASection } from "@/components/site/CTASection";
import { PayBento } from "./_PayBento";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Clear lab pricing in Cambodia. See the price before you book. The same panel costs the same in Phnom Penh or a province. Kura takes 0% from insurance.",
};

export default function PricingPage() {
  return (
    <>
      <PageHero
        eyebrow={{ en: "Pricing", km: "តម្លៃ" }}
        title={{ en: "Clear pricing,", km: "តម្លៃច្បាស់លាស់" }}
        titleAccent={{ en: "no surprises", km: "គ្មានការភ្ញាក់ផ្អើល" }}
        titleAfter={{ en: "." }}
        lead={{
          en: "You see the price before you book. The same panel costs the same in Phnom Penh or a province.",
          km: "អ្នកឃើញតម្លៃមុនពេលកក់ ហើយតេស្តដូចគ្នាមានតម្លៃដូចគ្នា ទោះនៅភ្នំពេញ ឬនៅខេត្ត។",
        }}
        primary={{ label: { en: "Browse tests", km: "មើលតេស្ត" }, href: "/tests" }}
        secondary={{ label: { en: "Compare packages", km: "ប្រៀបធៀបកញ្ចប់" }, href: "/packages" }}
      />
      <PricingTiers tone="tint" />
      <PackagesSection tone="default" />
      <ValueReframe tone="tint" />
      <PayBento />
      <FaqSection audience="general" tone="default" />
      <CTASection
        title={{ en: "No hidden fees. Ever.", km: "គ្មានថ្លៃលាក់កំបាំង មិនដែលមាន។" }}
        subtitle={{
          en: "Every price is published up front. What you see is what you pay.",
          km: "រាល់តម្លៃត្រូវបានបង្ហាញជាមុន។ អ្វីដែលអ្នកឃើញ គឺជាអ្វីដែលអ្នកបង់។",
        }}
        primary={{ label: { en: "Browse tests", km: "មើលតេស្ត" }, href: "/tests" }}
        secondary={{ label: { en: "Talk to us", km: "និយាយជាមួយយើង" }, href: "/contact" }}
      />
    </>
  );
}
