import type { Metadata } from "next";
import { PageHero } from "@/components/sections";
import { CTASection } from "@/components/site/CTASection";
import { ArticleGrid } from "./_ArticleGrid";

export const metadata: Metadata = {
  title: "Health knowledge",
  description:
    "Plain-language health guides in Khmer and English. Understand your tests, read your results and stay well. Written by Kura's clinical team.",
};

export default function BlogPage() {
  return (
    <>
      <PageHero
        tone="tint"
        eyebrow={{ en: "Health knowledge", km: "ចំណេះដឹងសុខភាព" }}
        title={{ en: "Plain-language health,", km: "សុខភាពជាភាសាសាមញ្ញ" }}
        titleAccent={{ en: "in Khmer & English", km: "ជាខ្មែរ និងអង់គ្លេស" }}
        titleAfter={{ en: "." }}
        lead={{
          en: "Clear, trustworthy guides on tests, results and staying well. Written by clinicians, free of jargon.",
          km: "មគ្គុទ្ទេសក៍ច្បាស់លាស់ និងគួរឱ្យទុកចិត្តស្តីពីតេស្ត លទ្ធផល និងការថែរក្សាសុខភាព សរសេរដោយគ្រូពេទ្យ ដោយគ្មានពាក្យបច្ចេកទេសស្មុគស្មាញ។",
        }}
      />
      <ArticleGrid />
      <CTASection
        title={{ en: "Health, explained simply.", km: "សុខភាព ពន្យល់យ៉ាងសាមញ្ញ។" }}
        subtitle={{
          en: "A few useful notes in your inbox, now and then.",
          km: "ទទួលអត្ថបទម្តងម្កាលក្នុងប្រអប់សំបុត្ររបស់អ្នក។",
        }}
        primary={{ label: { en: "Browse tests", km: "មើលតេស្ត" }, href: "/tests" }}
      />
    </>
  );
}
