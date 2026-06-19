import type { Metadata } from "next";
import {
  PageHero,
  HowItWorks,
  FeatureGrid,
  ResultsFeature,
  CoverageMap,
  PackagesSection,
  ValueReframe,
  Testimonials,
  FaqSection,
  BiomarkerDetail,
  BrowseByConcern,
} from "@/components/sections";
import { CTASection } from "@/components/site/CTASection";
import { CATEGORIES } from "@/data/catalog";

export const metadata: Metadata = {
  title: "For patients",
  description:
    "Book a test or package, give your sample at a centre near you or at home, then read clinician-reviewed results in plain Khmer on Telegram within 24 hours.",
};

const categoryItems = CATEGORIES.map((c) => ({
  icon: c.icon,
  title: c.name,
  body: c.blurb,
}));

export default function ForPatientsPage() {
  return (
    <>
      <PageHero
        tone="default"
        eyebrow={{ en: "For patients", km: "សម្រាប់អ្នកជំងឺ" }}
        title={{ en: "Know your body.", km: "ធ្វើតេស្ត" }}
        titleAccent={{ en: "See it clearly", km: "យល់ច្បាស់គ្រប់យ៉ាង" }}
        titleAfter={{ en: "." }}
        lead={{
          en: "Book a test or package. Give your sample at a centre near you or at home. Read clinician-reviewed results in plain Khmer on Telegram within 24 hours.",
          km: "កក់តេស្ត ឬកញ្ចប់ ផ្តល់សំណាកនៅមជ្ឈមណ្ឌលក្បែរអ្នក ឬនៅផ្ទះ បន្ទាប់មកអានលទ្ធផលដែលគ្រូពេទ្យពិនិត្យ ជាភាសាខ្មែរច្បាស់លាស់ តាម Telegram ក្នុងរយៈពេល ២៤ ម៉ោង។",
        }}
        primary={{ label: { en: "Find a test", km: "ស្វែងរកតេស្ត" }, href: "/tests" }}
        secondary={{ label: { en: "How it works", km: "របៀបដំណើរការ" }, href: "/how-it-works" }}
        aside={<BiomarkerDetail />}
      />

      <HowItWorks tone="tint" />

      <FeatureGrid
        tone="default"
        align="center"
        columns={4}
        eyebrow={{ en: "What we test", km: "អ្វីដែលយើងធ្វើតេស្ត" }}
        title={{
          en: "From everyday checks to the deeper answers",
          km: "ពីការពិនិត្យប្រចាំថ្ងៃ ដល់ចម្លើយស៊ីជម្រៅ",
        }}
        items={categoryItems}
      />

      <ResultsFeature tone="tint" />

      <CoverageMap tone="default" />

      <PackagesSection tone="tint" />

      <BrowseByConcern tone="default" />

      <ValueReframe />

      <Testimonials tone="tint" />

      <FaqSection audience="patients" tone="default" />

      <CTASection
        title={{ en: "Ready when you are.", km: "រួចរាល់ពេលអ្នកត្រៀមរួច។" }}
        subtitle={{
          en: "Pick one test or a full package. Your results land on Telegram, in plain language.",
          km: "ស្វែងរកតេស្តតែមួយ ឬជ្រើសកញ្ចប់ លទ្ធផលមកដល់តាម Telegram ជាភាសាសាមញ្ញ។",
        }}
        primary={{ label: { en: "Find a test", km: "ស្វែងរកតេស្ត" }, href: "/tests" }}
        secondary={{ label: { en: "Browse packages", km: "មើលកញ្ចប់" }, href: "/packages" }}
      />
    </>
  );
}
