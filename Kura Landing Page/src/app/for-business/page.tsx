import type { Metadata } from "next";
import {
  PageHero,
  TrustMarquee,
  TabbedFeature,
  StatShowcase,
  FeatureRows,
  LeadForm,
  FaqSection,
  ResultPreview,
} from "@/components/sections";
import { Section } from "@/components/ui";
import { CTASection } from "@/components/site/CTASection";

export const metadata: Metadata = {
  title: "For business",
  description:
    "Diagnostics built for scale in Cambodia. Run a clinic without a lab, screen your workforce, or settle insurance claims on one accredited platform.",
};

export default function ForBusinessPage() {
  return (
    <>
      <PageHero
        tone="ink"
        eyebrow={{ en: "For business", km: "សម្រាប់អាជីវកម្ម" }}
        title={{ en: "Diagnostics,", km: "ការធ្វើរោគវិនិច្ឆ័យ" }}
        titleAccent={{ en: "built for scale", km: "បង្កើតឡើងសម្រាប់ទ្រង់ទ្រាយធំ" }}
        titleAfter={{ en: "." }}
        lead={{
          en: "Run a clinic without a lab. Screen your workforce. Settle claims. One accredited platform, every province in Cambodia.",
          km: "ដំណើរការគ្លីនិកដោយគ្មានមន្ទីរពិសោធន៍ ត្រួតពិនិត្យបុគ្គលិក ឬដោះស្រាយការទាមទារធានារ៉ាប់រង — លើវេទិកាតែមួយ ទូទាំងកម្ពុជា។",
        }}
        primary={{ label: { en: "Contact sales", km: "ទាក់ទងផ្នែកលក់" }, href: "/contact" }}
        secondary={{ label: { en: "See solutions", km: "មើលដំណោះស្រាយ" }, href: "#solutions" }}
        aside={<ResultPreview />}
      />

      <TrustMarquee tone="ink" />

      <Section id="solutions">
        <TabbedFeature
          tone="default"
          eyebrow={{ en: "Solutions", km: "ដំណោះស្រាយ" }}
          title={{ en: "One platform, three jobs", km: "វេទិកាតែមួយ បីការងារ" }}
          lead={{
            en: "Run clinics, employ a workforce, or pay claims. The same accredited rails carry it, start to finish.",
            km: "ទោះអ្នកដំណើរការគ្លីនិក មានបុគ្គលិក ឬបង់ការទាមទារ — ប្រព័ន្ធដែលមានការទទួលស្គាល់តែមួយដោះស្រាយវាទាំងអស់ ពីដើមដល់ចប់។",
          }}
          tabs={[
            {
              key: "clinics",
              tab: { en: "Clinics", km: "គ្លីនិក" },
              icon: "building",
              title: { en: "Run a clinic without a lab", km: "ដំណើរការគ្លីនិកដោយគ្មានមន្ទីរ" },
              body: {
                en: "Order any test from your clinic. Our courier collects samples daily, and results come back to you and your patient.",
                km: "បញ្ជាទិញតេស្តណាមួយពីគ្លីនិករបស់អ្នក អ្នកដឹកជញ្ជូនយើងប្រមូលសំណាករៀងរាល់ថ្ងៃ ហើយលទ្ធផលត្រឡប់មកអ្នក និងអ្នកជំងឺរបស់អ្នក។",
              },
              bullets: [
                { en: "No lab investment", km: "គ្មានការវិនិយោគមន្ទីរពិសោធន៍" },
                { en: "Daily courier sweep", km: "ការប្រមូលដោយអ្នកដឹកជញ្ជូនរៀងរាល់ថ្ងៃ" },
                { en: "E-signed documents", km: "ឯកសារចុះហត្ថលេខាអេឡិចត្រូនិក" },
              ],
              cta: { label: { en: "Talk to us", km: "ទាក់ទងយើង" }, href: "/contact" },
            },
            {
              key: "corporate",
              tab: { en: "Corporate health", km: "សុខភាពបុគ្គលិក" },
              icon: "users",
              title: { en: "Screen your whole team", km: "ត្រួតពិនិត្យក្រុមទាំងមូល" },
              body: {
                en: "We screen your team on-site or at a collection centre. Every employee keeps their results private. HR sees the trends, never the names.",
                km: "នាំការត្រួតពិនិត្យមកកន្លែងធ្វើការ ឬមជ្ឈមណ្ឌលប្រមូល។ បុគ្គលិកម្នាក់ៗរក្សាលទ្ធផលឯកជន ផ្នែកធនធានមនុស្សឃើញតែនិន្នាការសរុប។",
              },
              bullets: [
                { en: "On-site or PSC screening", km: "ការត្រួតពិនិត្យនៅកន្លែងធ្វើការ ឬមជ្ឈមណ្ឌលប្រមូល" },
                { en: "Private individual results", km: "លទ្ធផលឯកជនសម្រាប់បុគ្គលម្នាក់ៗ" },
                { en: "Aggregate HR dashboards", km: "ផ្ទាំងទិន្នន័យសរុបសម្រាប់ធនធានមនុស្ស" },
              ],
            },
            {
              key: "insurers",
              tab: { en: "Insurers", km: "ធានារ៉ាប់រង" },
              icon: "shield",
              title: { en: "Settle claims with confidence", km: "ទូទាត់ការទាមទារដោយទំនុកចិត្ត" },
              body: {
                en: "Connect claims straight to Forte EmCare and NSSF. Every record is e-signed, hard to fake, and fully auditable.",
                km: "ភ្ជាប់ការទាមទារទៅ Forte EmCare និង NSSF ដោយមានកំណត់ត្រាចុះហត្ថលេខាអេឡិចត្រូនិកដែលការពារការក្លែងបន្លំ និងអាចត្រួតពិនិត្យបានពេញលេញ។",
              },
              bullets: [
                { en: "Forte EmCare + NSSF", km: "Forte EmCare + NSSF" },
                { en: "E-signed records", km: "កំណត់ត្រាចុះហត្ថលេខាអេឡិចត្រូនិក" },
                { en: "Fraud-resistant", km: "ការពារការក្លែងបន្លំ" },
              ],
            },
          ]}
        />
      </Section>

      <StatShowcase
        tone="tint"
        eyebrow={{ en: "By the numbers", km: "តាមតួលេខ" }}
        title={{ en: "Diagnostics at national scale", km: "វេជ្ជសាស្ត្រវិនិច្ឆ័យថ្នាក់ជាតិ" }}
        lead={{
          en: "Deep enough to serve a single clinic. Broad enough to cover a workforce in every province.",
          km: "បណ្តាញដែលជ្រៅគ្រប់គ្រាន់សម្រាប់គ្លីនិកតែមួយ និងធំទូលាយគ្រប់គ្រាន់សម្រាប់បុគ្គលិកនៅគ្រប់ខេត្ត។",
        }}
      />

      <FeatureRows
        tone="default"
        numbered={true}
        eyebrow={{ en: "Onboarding", km: "ការចាប់ផ្តើម" }}
        title={{ en: "Live in four steps", km: "ដំណើរការក្នុង ៤ ជំហាន" }}
        lead={{
          en: "From first conversation to ongoing reporting, we move at your pace. No infrastructure to buy up front.",
          km: "ពីការសន្ទនាដំបូងរហូតដល់របាយការណ៍ជាបន្តបន្ទាប់ យើងធ្វើតាមល្បឿនរបស់អ្នក ដោយមិនទាមទារហេដ្ឋារចនាសម្ព័ន្ធ។",
        }}
        items={[
          {
            title: { en: "Scope your need", km: "កំណត់តម្រូវការ" },
            body: {
              en: "We map your sites, volumes and goals, whether that's clinic ordering, workforce screening or claims.",
              km: "យើងវាយតម្លៃទីតាំង បរិមាណ និងគោលដៅរបស់អ្នក ទោះជាការបញ្ជាទិញ ការត្រួតពិនិត្យ ឬការទាមទារ។",
            },
          },
          {
            title: { en: "Pilot screening", km: "សាកល្បងជាមុន" },
            body: {
              en: "Start with one site or one team to prove the flow. Then we tune logistics and reporting together.",
              km: "ចាប់ផ្តើមជាមួយទីតាំង ឬក្រុមមួយ ដើម្បីបញ្ជាក់ដំណើរការ បន្ទាប់មកកែលម្អភ័ស្តុភារ និងរបាយការណ៍រួមគ្នា។",
            },
          },
          {
            title: { en: "Roll out across sites", km: "ពង្រីកគ្រប់ទីតាំង" },
            body: {
              en: "Extend to every location with shared accounts, standard panels and one point of contact.",
              km: "ពង្រីកទៅគ្រប់ទីតាំងជាមួយគណនីរួម តេស្តស្តង់ដារ និងចំណុចទំនាក់ទំនងតែមួយ។",
            },
          },
          {
            title: { en: "Ongoing reporting", km: "របាយការណ៍ជាបន្ត" },
            body: {
              en: "Get aggregate dashboards, trends and audit-ready records, reviewed and clear, every period.",
              km: "ទទួលផ្ទាំងទិន្នន័យសរុប និន្នាការ និងកំណត់ត្រាត្រៀមត្រួតពិនិត្យ ច្បាស់លាស់រាល់ដំណាក់កាល។",
            },
          },
        ]}
      />

      <LeadForm
        id="sales"
        tone="tint"
        title={{ en: "Talk to our sales team", km: "ទាក់ទងផ្នែកលក់" }}
        lead={{
          en: "Tell us about your clinic, your workforce or your claims volume. We reply within one business day.",
          km: "ប្រាប់យើងអំពីគ្លីនិក បុគ្គលិក ឬបរិមាណការទាមទាររបស់អ្នក ហើយយើងនឹងឆ្លើយតបក្នុងមួយថ្ងៃធ្វើការ។",
        }}
        withContact={true}
      />

      <FaqSection audience="business" tone="default" />

      <CTASection
        title={{ en: "Diagnostics that scale with you.", km: "ការធ្វើរោគវិនិច្ឆ័យដែលរីកធំជាមួយអ្នក។" }}
        subtitle={{
          en: "One accredited platform for clinics, employers and payers, across Cambodia.",
          km: "វេទិកាដែលមានការទទួលស្គាល់តែមួយ សម្រាប់គ្លីនិក និយោជក និងអ្នកបង់ ទូទាំងកម្ពុជា។",
        }}
        primary={{ label: { en: "Contact sales", km: "ទាក់ទងផ្នែកលក់" }, href: "/contact" }}
      />
    </>
  );
}
