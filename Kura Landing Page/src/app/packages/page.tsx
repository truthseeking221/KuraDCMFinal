import type { Metadata } from "next";
import { PageHero, PackagesSection, FeatureGrid, FaqSection, CheckupsByAudience } from "@/components/sections";
import { CTASection } from "@/components/site/CTASection";

export const metadata: Metadata = {
  title: "Health packages",
  description:
    "Health checkups built for Cambodia: Essential, Advance, and Comprehensive. Dozens of tests at one clear price, with results sent free on Telegram.",
};

export default function PackagesPage() {
  return (
    <>
      <PageHero
        eyebrow={{ en: "Health packages", km: "កញ្ចប់សុខភាព" }}
        title={{ en: "A whole check-up,", km: "ការត្រួតពិនិត្យពេញលេញ" }}
        titleAccent={{ en: "one clear price", km: "ក្នុងតម្លៃច្បាស់លាស់តែមួយ" }}
        titleAfter={{ en: "." }}
        lead={{
          en: "Three tiers: Essential, Advance, and Comprehensive. Each bundles dozens of tests for far less than ordering them one by one.",
          km: "កម្រិតបី ដោយតម្លៃសមរម្យ ជាងការបញ្ជាទិញម្តងមួយៗ។",
        }}
        primary={{ label: { en: "Compare packages", km: "ប្រៀបធៀបកញ្ចប់" }, href: "#packages" }}
        secondary={{ label: { en: "Browse single tests", km: "មើលតេស្តតែមួយ" }, href: "/tests" }}
      />
      <CheckupsByAudience tone="tint" />
      <div id="packages">
        <PackagesSection tone="default" />
      </div>
      <FeatureGrid
        tone="tint"
        eyebrow={{ en: "Why a package", km: "ហេតុអ្វីកញ្ចប់" }}
        title={{ en: "More value, less guesswork", km: "តម្លៃច្រើន ការស្មានតិច" }}
        align="center"
        columns={3}
        items={[
          {
            icon: "wallet",
            title: { en: "Bundled savings", km: "សន្សំច្រើន" },
            body: { en: "Pay up to 50% less than ordering each test on its own.", km: "បង់តិចជាងការបញ្ជាទិញម្តងមួយៗរហូតដល់ ៥០%។" },
          },
          {
            icon: "report",
            title: { en: "Built by clinicians", km: "រៀបចំដោយគ្រូពេទ្យ" },
            body: { en: "Every package covers the markers that matter for what you came to check.", km: "រាល់កញ្ចប់គ្របដណ្តប់សញ្ញាសំខាន់ៗ។" },
          },
          {
            icon: "send",
            title: { en: "One clear report", km: "របាយការណ៍សាមញ្ញ" },
            body: { en: "Every result arrives together, in plain language, on Telegram.", km: "លទ្ធផលទាំងអស់មកដល់ជាមួយគ្នា តាម Telegram។" },
          },
        ]}
      />
      <FaqSection audience="patients" tone="default" limit={4} />
      <CTASection
        title={{ en: "Not sure which to pick?", km: "មិនច្បាស់ថាគួរជ្រើសមួយណា?" }}
        subtitle={{ en: "Tell us your age and what you want to know. We'll point you to the right check-up.", km: "ប្រាប់យើងពីអាយុ និងគោលដៅរបស់អ្នក។" }}
        primary={{ label: { en: "Get a recommendation", km: "ទទួលការណែនាំ" }, href: "/contact" }}
      />
    </>
  );
}
