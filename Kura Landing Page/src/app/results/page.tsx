import type { Metadata } from "next";
import {
  PageHero,
  Showcase,
  ResultPreview,
  BiomarkerDetail,
  Testimonials,
  FaqSection,
} from "@/components/sections";
import { CTASection } from "@/components/site/CTASection";
import { ResultsBento } from "./_ResultsBento";

export const metadata: Metadata = {
  title: "Results you understand",
  description:
    "Kura turns a dense lab PDF into a clear verdict, a visual range and a short note on what to do next. Clinician-reviewed, in Khmer or English, on Telegram.",
};

export default function ResultsPage() {
  return (
    <>
      <PageHero
        eyebrow={{ en: "Results you understand", km: "លទ្ធផលដែលអ្នកយល់" }}
        title={{ en: "A lab report shouldn't need", km: "របាយការណ៍ឈាមមិនគួរត្រូវការ" }}
        titleAccent={{ en: "a translator", km: "អ្នកបកប្រែ" }}
        titleAfter={{ en: "." }}
        lead={{
          en: "Kura turns a dense lab PDF into a clear verdict, a visual range, and a short note on what to do next. In Khmer or English.",
          km: "Kura ប្រែក្លាយ PDF ឈាមស្មុគស្មាញ ទៅជាការវិនិច្ឆ័យច្បាស់លាស់ របារបង្ហាញកម្រិត និងកំណត់ត្រាខ្លីៗ — ជាខ្មែរ ឬអង់គ្លេស។",
        }}
        primary={{ label: { en: "See a sample report", km: "មើលរបាយការណ៍គំរូ" }, href: "/contact" }}
        secondary={{ label: { en: "What we test", km: "អ្វីដែលយើងតេស្ត" }, href: "/tests" }}
        aside={<ResultPreview />}
      />

      <Showcase
        tone="tint"
        side="left"
        visual={<BiomarkerDetail />}
        eyebrow={{ en: "Results you understand", km: "លទ្ធផលដែលអ្នកយល់" }}
        title={{ en: "Every number, in plain language", km: "រាល់លេខ ជាភាសាសាមញ្ញ" }}
        items={[
          {
            icon: "pulse",
            title: { en: "Plain-language verdicts", km: "ការវិនិច្ឆ័យជាភាសាសាមញ្ញ" },
            body: {
              en: "Each marker tells you what's normal and what needs attention. No jargon to decode.",
              km: "រាល់សញ្ញាប្រាប់ច្បាស់ថាអ្វីធម្មតា និងអ្វីត្រូវយកចិត្តទុកដាក់ — គ្មានពាក្យបច្ចេកទេសពិបាកយល់។",
            },
          },
          {
            icon: "report",
            title: { en: "Reference ranges, visualised", km: "កម្រិតយោង បង្ហាញជារូបភាព" },
            body: {
              en: "A coloured band shows exactly where your value sits, so the number finally means something.",
              km: "របារពណ៌បង្ហាញកន្លែងតម្លៃរបស់អ្នកស្ថិតនៅ ដើម្បីឱ្យលេខមានន័យ។",
            },
          },
          {
            icon: "flask",
            title: { en: "SI & US units", km: "ឯកតា SI និង US" },
            body: {
              en: "Switch between the units your doctor uses and the ones you know.",
              km: "ប្តូររវាងឯកតាដែលគ្រូពេទ្យអ្នកប្រើ និងឯកតាដែលអ្នកស្គាល់។",
            },
          },
        ]}
      />

      <ResultsBento />

      <Testimonials tone="tint" />

      <FaqSection audience="general" tone="default" />

      <CTASection
        title={{ en: "See what a Kura report looks like", km: "មើលរបាយការណ៍ Kura មានរូបរាងបែបណា" }}
        subtitle={{
          en: "We'll send you a sample report, so you know exactly what to expect.",
          km: "យើងនឹងផ្ញើរបាយការណ៍គំរូ ដើម្បីឱ្យអ្នកដឹងច្បាស់ពីអ្វីដែលត្រូវរំពឹង។",
        }}
        primary={{ label: { en: "Request a sample", km: "ស្នើសុំគំរូ" }, href: "/contact" }}
        secondary={{ label: { en: "Browse tests", km: "មើលតេស្ត" }, href: "/tests" }}
      />
    </>
  );
}
