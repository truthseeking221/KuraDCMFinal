import type { Metadata } from "next";
import {
  PageHero,
  StickySteps,
  Showcase,
  ResultPreview,
  CoverageMap,
  StatShowcase,
  FaqSection,
} from "@/components/sections";
import type { IconName } from "@/components/ui";
import { CTASection } from "@/components/site/CTASection";
import { LIFECYCLE } from "@/data/team";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "One path from lab order to clear answer. Daily clinic courier sweeps, 12 collection centres with home visits, accredited labs, and plain-language results on Telegram within 24 hours.",
};

export default function HowItWorksPage() {
  return (
    <>
      <PageHero
        tone="default"
        eyebrow={{ en: "How it works", km: "របៀបដំណើរការ" }}
        title={{ en: "From order to answer,", km: "ពីការបញ្ជាទិញ ដល់លទ្ធផល" }}
        titleAccent={{ en: "in a day", km: "ក្នុងមួយថ្ងៃ" }}
        titleAfter={{ en: "." }}
        lead={{
          en: "One clear path for doctors and patients, built around how care actually moves in Cambodia.",
          km: "ផ្លូវតែមួយដ៏សាមញ្ញ សម្រាប់គ្រូពេទ្យ និងអ្នកជំងឺ ដែលរៀបចំតាមរបៀបពិតនៃការថែទាំនៅកម្ពុជា។",
        }}
        primary={{ label: { en: "Get started", km: "ចាប់ផ្តើម" }, href: "/contact" }}
        secondary={{ label: { en: "Find a test", km: "ស្វែងរកតេស្ត" }, href: "/tests" }}
      />

      <StickySteps
        tone="tint"
        eyebrow={{ en: "The journey", km: "ដំណើរ" }}
        title={{
          en: "From order to answer, in a day",
          km: "ពីការបញ្ជាទិញ ដល់លទ្ធផល ក្នុងមួយថ្ងៃ",
        }}
        steps={LIFECYCLE.map((l) => ({
          icon: l.icon as IconName,
          title: l.title,
          body: l.body,
        }))}
      />

      <Showcase
        tone="default"
        side="right"
        visual={<ResultPreview />}
        eyebrow={{ en: "What you get", km: "អ្វីដែលអ្នកទទួល" }}
        title={{ en: "Results you can act on", km: "លទ្ធផលដែលអ្នកអាចប្រើ" }}
        items={[
          {
            icon: "stethoscope",
            title: { en: "Clinician-reviewed", km: "ត្រួតពិនិត្យដោយគ្រូពេទ្យ" },
            body: {
              en: "A clinician reads every result and flags anything that needs attention before it reaches you.",
              km: "គ្រូពេទ្យ ពិនិត្យលទ្ធផលនីមួយៗ ហើយសម្គាល់អ្វីដែលត្រូវយកចិត្តទុកដាក់ មុនពេលផ្ញើទៅអ្នក។",
            },
          },
          {
            icon: "report",
            title: { en: "Plain-language ranges", km: "កម្រិតជាភាសាងាយយល់" },
            body: {
              en: "Every value sits beside a clear reference range, explained in everyday Khmer and English. No jargon.",
              km: "តម្លៃនីមួយៗ មានកម្រិតយោងច្បាស់លាស់ ពន្យល់ជាភាសាខ្មែរ និងអង់គ្លេសងាយយល់ ដោយគ្មានពាក្យបច្ចេកទេស។",
            },
          },
          {
            icon: "send",
            title: { en: "Delivered on Telegram", km: "ផ្ញើតាម Telegram" },
            body: {
              en: "Reports land on Telegram, usually within 24 hours. No line to wait in, no paper to lose.",
              km: "របាយការណ៍មកដល់តាម Telegram ជាធម្មតាក្នុង ២៤ ម៉ោង ដោយគ្មានការរង់ចាំ និងគ្មានក្រដាសបាត់ឡើយ។",
            },
          },
        ]}
      />

      <CoverageMap tone="tint" />

      <StatShowcase
        tone="ink"
        title={{ en: "A network built for speed", km: "បណ្តាញសម្រាប់ល្បឿន" }}
      />

      <FaqSection audience="general" tone="default" />

      <CTASection
        title={{ en: "Ready when you are", km: "ត្រៀមរួចរាល់នៅពេលអ្នកត្រៀម" }}
        subtitle={{
          en: "Order a test, book a sample, get a clear answer within a day.",
          km: "បញ្ជាទិញតេស្ត កក់សំណាក ហើយទទួលចម្លើយច្បាស់លាស់ក្នុងមួយថ្ងៃ។",
        }}
        primary={{ label: { en: "Get started", km: "ចាប់ផ្តើម" }, href: "/contact" }}
        secondary={{ label: { en: "Browse tests", km: "មើលតេស្ត" }, href: "/tests" }}
      />
    </>
  );
}
