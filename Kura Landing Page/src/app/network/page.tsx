import type { Metadata } from "next";
import { PageHero, CoverageMap, FeatureRows, StatShowcase, NumberedList, FaqSection } from "@/components/sections";
import { CTASection } from "@/components/site/CTASection";

export const metadata: Metadata = {
  title: "Collection network",
  description:
    "12 collection centres across 8 provinces, home visits, and daily courier sweeps from clinics. Sampling happens wherever care does.",
};

export default function NetworkPage() {
  return (
    <>
      <PageHero
        eyebrow={{ en: "National network", km: "បណ្តាញទូទាំងប្រទេស" }}
        title={{ en: "Sampling,", km: "ការប្រមូលសំណាក" }}
        titleAccent={{ en: "wherever care happens", km: "គ្រប់ទីកន្លែងដែលមានការថែទាំ" }}
        titleAfter={{ en: "." }}
        lead={{
          en: "Twelve collection centres across eight provinces. Plus home visits and a daily courier sweep from your clinic.",
          km: "មជ្ឈមណ្ឌលប្រមូលសំណាក ១២ កន្លែង នៅ ៨ ខេត្ត ព្រមទាំងការមកដល់ផ្ទះ និងការប្រមូលប្រចាំថ្ងៃពីគ្លីនិក។",
        }}
        primary={{ label: { en: "Find nearest centre", km: "រកមជ្ឈមណ្ឌលជិតបំផុត" }, href: "#map" }}
        secondary={{ label: { en: "Book a home visit", km: "កក់ការមកដល់ផ្ទះ" }, href: "/contact" }}
      />

      <div id="map">
        <CoverageMap tone="tint" />
      </div>

      <FeatureRows
        tone="default"
        numbered={false}
        eyebrow={{ en: "Three ways to give a sample", km: "បីវិធីផ្តល់សំណាក" }}
        title={{ en: "Come to us, or we come to you", km: "មកយើង ឬយើងមកអ្នក" }}
        items={[
          {
            icon: "map-pin",
            title: { en: "Walk in to a centre", km: "ដើរចូលមជ្ឈមណ្ឌល" },
            body: {
              en: "Twelve centres across eight provinces, open daily. Walk in and you're done in minutes.",
              km: "មជ្ឈមណ្ឌល ១២ កន្លែង នៅ ៨ ខេត្ត បើកជារៀងរាល់ថ្ងៃសម្រាប់ការប្រមូលសំណាករហ័ស។",
            },
          },
          {
            icon: "droplet",
            title: { en: "A phlebotomist visits home or office", km: "បុគ្គលិកមកដល់ផ្ទះ ឬការិយាល័យ" },
            body: {
              en: "Book a trained phlebotomist to draw your sample at home or at the office.",
              km: "កក់បុគ្គលិកដែលបានបណ្តុះបណ្តាល មកយកសំណាកនៅផ្ទះ ឬការិយាល័យ។",
            },
          },
          {
            icon: "truck",
            title: { en: "Daily courier sweep from your clinic", km: "ការប្រមូលប្រចាំថ្ងៃពីគ្លីនិករបស់អ្នក" },
            body: {
              en: "A courier collects from your clinic every day and runs the samples to the lab.",
              km: "អ្នកដឹកជញ្ជូនមកប្រមូលពីគ្លីនិករបស់អ្នកជារៀងរាល់ថ្ងៃ ហើយនាំសំណាកទៅមន្ទីរពិសោធន៍។",
            },
          },
        ]}
      />

      <StatShowcase
        tone="ink"
        eyebrow={{ en: "By the numbers", km: "តាមតួលេខ" }}
        title={{ en: "A network built for reach", km: "បណ្តាញសម្រាប់ការគ្របដណ្តប់" }}
        lead={{
          en: "Centres, partner clinics and daily courier routes. Accredited testing within reach of every province.",
          km: "មជ្ឈមណ្ឌល គ្លីនិកដៃគូ និងផ្លូវដឹកជញ្ជូនប្រចាំថ្ងៃ ដែលនាំការធ្វើតេស្តដែលមានវិញ្ញាបនបត្រ ឱ្យជិតគ្រប់ខេត្ត។",
        }}
      />

      <NumberedList
        tone="tint"
        eyebrow={{ en: "The daily sweep", km: "ការប្រមូលប្រចាំថ្ងៃ" }}
        title={{ en: "The daily sweep", km: "ការប្រមូលប្រចាំថ្ងៃ" }}
        lead={{
          en: "Think of the morning milk round. A courier loops through partner clinics on a fixed schedule, so nothing waits and nothing spoils.",
          km: "ដូចការដឹកទឹកដោះគោពេលព្រឹក អ្នកដឹកជញ្ជូនធ្វើដំណើរទៅគ្លីនិកដៃគូតាមកាលវិភាគថេរ ដូច្នេះគ្មានអ្វីត្រូវរង់ចាំ ហើយគ្មានអ្វីខូចឡើយ។",
        }}
        items={[
          {
            title: { en: "Order in the morning", km: "បញ្ជាទិញពេលព្រឹក" },
            body: {
              en: "Place tests for your patients as the day begins. No minimum, no paperwork to chase.",
              km: "បញ្ជាទិញតេស្តសម្រាប់អ្នកជំងឺនៅពេលថ្ងៃចាប់ផ្តើម គ្មានកម្រិតអប្បបរមា គ្មានឯកសារត្រូវតាមដាន។",
            },
          },
          {
            title: { en: "Courier collects by midday", km: "អ្នកដឹកជញ្ជូនមកប្រមូលពេលថ្ងៃត្រង់" },
            body: {
              en: "A courier sweeps your clinic before noon and carries the samples in temperature-controlled transit.",
              km: "អ្នកដឹកជញ្ជូនមកប្រមូលនៅគ្លីនិកមុនពេលថ្ងៃត្រង់ ហើយដឹកសំណាកក្នុងលក្ខខណ្ឌគ្រប់គ្រងសីតុណ្ហភាព។",
            },
          },
          {
            title: { en: "Samples reach the lab same day", km: "សំណាកមកដល់មន្ទីរពិសោធន៍ថ្ងៃតែមួយ" },
            body: {
              en: "Specimens arrive at an accredited lab the same afternoon and go straight into the queue.",
              km: "សំណាកមកដល់មន្ទីរពិសោធន៍ដែលមានការទទួលស្គាល់នៅរសៀលថ្ងៃតែមួយ ហើយចូលជួរភ្លាមៗ។",
            },
          },
          {
            title: { en: "Signed results that evening", km: "លទ្ធផលដែលបានចុះហត្ថលេខានៅល្ងាចនោះ" },
            body: {
              en: "A clinician reviews and signs off, and results return to you the same evening.",
              km: "គ្រូពេទ្យពិនិត្យ និងចុះហត្ថលេខា ហើយលទ្ធផលត្រឡប់មកអ្នកវិញនៅល្ងាចថ្ងៃតែមួយ។",
            },
          },
        ]}
      />

      <FaqSection audience="general" tone="default" />

      <CTASection
        title={{ en: "Bring sampling to your clinic", km: "នាំការប្រមូលសំណាកមកគ្លីនិករបស់អ្នក" }}
        subtitle={{
          en: "Join the daily courier route or refer a patient for a home visit. We'll set it up.",
          km: "ចូលរួមផ្លូវដឹកជញ្ជូនប្រចាំថ្ងៃ ឬបញ្ជូនអ្នកជំងឺសម្រាប់ការមកដល់ផ្ទះ យើងនឹងរៀបចំជូន។",
        }}
        primary={{ label: { en: "Add my clinic", km: "បន្ថែមគ្លីនិករបស់ខ្ញុំ" }, href: "/contact" }}
        secondary={{ label: { en: "See how it works", km: "មើលរបៀបដំណើរការ" }, href: "/how-it-works" }}
      />
    </>
  );
}
