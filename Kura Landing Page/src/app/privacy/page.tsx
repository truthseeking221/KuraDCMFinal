import type { Metadata } from "next";
import { PageHero } from "@/components/sections";
import { LegalBody } from "./_LegalBody";

export const metadata: Metadata = {
  title: "Privacy policy",
  description:
    "How Kura collects, uses, and protects your health data. What we share, how we keep it secure, and the rights you have over your information.",
};

export default function PrivacyPage() {
  return (
    <>
      <PageHero
        tone="tint"
        eyebrow={{ en: "Legal", km: "ផ្លូវច្បាប់" }}
        title={{ en: "Your data, protected", km: "គោលការណ៍ឯកជនភាព" }}
        lead={{
          en: "How Kura collects, uses, and protects your health data.",
          km: "របៀបដែល Kura ប្រមូល ប្រើ និងការពារទិន្នន័យសុខភាពរបស់អ្នក។",
        }}
      />
      <LegalBody />
    </>
  );
}
