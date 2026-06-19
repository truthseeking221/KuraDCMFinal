import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TESTS, getTest } from "@/data/catalog";
import { TestDetail } from "@/components/catalog/TestDetail";
import { CTASection } from "@/components/site/CTASection";

export function generateStaticParams() {
  return TESTS.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const test = getTest(slug);
  if (!test) return { title: "Test not found" };
  return {
    title: `${test.name.en}: price, what's included, and turnaround`,
    description: test.whatIs.en,
  };
}

export default async function TestDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const test = getTest(slug);
  if (!test) notFound();
  return (
    <>
      <TestDetail test={test} />
      <CTASection
        eyebrow={{ en: "Ready when you are", km: "ត្រៀមរួចរាល់" }}
        title={{ en: "Order this test in minutes", km: "បញ្ជាទិញតេស្តនេះក្នុងពេលប៉ុន្មាននាទី" }}
        subtitle={{
          en: "Book online, give a sample nearby or at home, and get clinician-reviewed results on Telegram.",
          km: "កក់តាមអ៊ីនធឺណិត ផ្តល់សំណាក ហើយទទួលលទ្ធផលតាម Telegram។",
        }}
      />
    </>
  );
}
