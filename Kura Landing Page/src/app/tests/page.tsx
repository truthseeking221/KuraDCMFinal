import type { Metadata } from "next";
import { PageHero, TopBookedPackages } from "@/components/sections";
import { TestsCatalog } from "@/components/catalog/TestsCatalog";
import { CTASection } from "@/components/site/CTASection";

export const metadata: Metadata = {
  title: "Tests & panels",
  description:
    "Browse 500+ orderable lab tests and panels. Every one shows what's included, the specimen, fasting, and turnaround, at one clear price.",
};

export default async function TestsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string }>;
}) {
  const { category, q } = await searchParams;
  return (
    <>
      <PageHero
        eyebrow={{ en: "Catalog", km: "បញ្ជីតេស្ត" }}
        title={{ en: "Every test, with", km: "រាល់តេស្ត ដោយ" }}
        titleAccent={{ en: "nothing hidden", km: "គ្មានអ្វីលាក់បាំង" }}
        titleAfter={{ en: "." }}
        lead={{
          en: "Search 500+ orderable tests and panels. Every card tells you what's included, the specimen, whether to fast, and how long results take. You see it all before you order.",
          km: "ស្វែងរកតេស្តជាង ៥០០។ រាល់កាតបង្ហាញនូវអ្វីដែលរួមបញ្ចូល មុនពេលបញ្ជាទិញ។",
        }}
      />
      <TestsCatalog initialCategory={category ?? "all"} initialQuery={q ?? ""} />
      <TopBookedPackages tone="tint" />
      <CTASection
        title={{ en: "Can't find a test?", km: "រកតេស្តមិនឃើញ?" }}
        subtitle={{
          en: "We run 500+ assays through accredited partner labs. If you don't see it, ask us.",
          km: "យើងធ្វើតេស្តជាង ៥០០។ ប្រសិនបើមិនមានក្នុងបញ្ជី សូមសួរយើង។",
        }}
        primary={{ label: { en: "Ask our team", km: "សួរក្រុមការងារ" }, href: "/contact" }}
        secondary={{ label: { en: "View packages", km: "មើលកញ្ចប់" }, href: "/packages" }}
      />
    </>
  );
}
