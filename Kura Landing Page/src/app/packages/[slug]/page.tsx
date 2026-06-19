import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PACKAGES, getPackage } from "@/data/catalog";
import { PackageDetail } from "@/components/catalog/PackageDetail";
import { CTASection } from "@/components/site/CTASection";

export function generateStaticParams() {
  return PACKAGES.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const pkg = getPackage(slug);
  if (!pkg) return { title: "Package not found" };
  return {
    title: `${pkg.name.en}: ${pkg.testCount} tests for $${pkg.priceUSD}`,
    description: pkg.tagline.en,
  };
}

export default async function PackageDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const pkg = getPackage(slug);
  if (!pkg) notFound();
  return (
    <>
      <PackageDetail pkg={pkg} />
      <CTASection
        eyebrow={{ en: "Book in minutes", km: "កក់ក្នុងពេលប៉ុន្មាននាទី" }}
        title={{ en: `Ready for your ${pkg.name.en}?`, km: "ត្រៀមរួចហើយឬនៅ?" }}
        subtitle={{
          en: "Choose a collection centre or home visit, give one sample, and get every result together.",
          km: "ជ្រើសរើសមជ្ឈមណ្ឌល ឬការមកផ្ទះ ហើយទទួលលទ្ធផលទាំងអស់ជាមួយគ្នា។",
        }}
      />
    </>
  );
}
