"use client";

import { PACKAGES } from "@/data/catalog";
import { PackageCarouselCard } from "@/components/catalog/PackageCarouselCard";
import { CardCarousel } from "./CardCarousel";

export function TopBookedPackages({ tone = "default" }: { tone?: "default" | "tint" | "ink" }) {
  const sorted = [...PACKAGES].sort((a, b) => Number(!!b.popular) - Number(!!a.popular));
  return (
    <CardCarousel
      tone={tone}
      eyebrow={{ en: "Top booked", km: "កក់ច្រើនជាងគេ" }}
      title={{ en: "Health checkup packages", km: "កញ្ចប់ត្រួតពិនិត្យសុខភាព" }}
      lead={{ en: "Chosen by doctors, trusted by patients.", km: "ជ្រើសរើសដោយគ្រូពេទ្យ ទុកចិត្តដោយអ្នកជំងឺ។" }}
      viewAllHref="/packages"
      viewAllLabel={{ en: "All packages", km: "កញ្ចប់ទាំងអស់" }}
    >
      {sorted.map((pkg) => (
        <PackageCarouselCard key={pkg.slug} pkg={pkg} />
      ))}
    </CardCarousel>
  );
}
