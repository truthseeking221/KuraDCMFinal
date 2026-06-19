import type { Metadata } from "next";
import {
  PageHero,
  StatShowcase,
  FeatureRows,
  Showcase,
  NumberedList,
  Testimonials,
  FaqSection,
  ResultPreview,
} from "@/components/sections";
import { Section } from "@/components/ui";
import { CTASection } from "@/components/site/CTASection";

export const metadata: Metadata = {
  title: "For doctors",
  description:
    "Order any lab test without owning a lab. Verified clinicians get daily courier pickup, e-signed MoH-compliant documents, and insurance paid in full. Kura takes 0%.",
};

export default function ForDoctorsPage() {
  return (
    <>
      <PageHero
        tone="default"
        eyebrow={{ en: "For doctors", km: "សម្រាប់គ្រូពេទ្យ" }}
        title={{ en: "Order labs,", km: "បញ្ជាទិញតេស្ត" }}
        titleAccent={{ en: "without owning one", km: "ដោយមិនចាំបាច់មានមន្ទីរពិសោធន៍" }}
        titleAfter={{ en: "." }}
        lead={{
          en: "Order any test from your cabinet. A courier collects it daily. Sign legally valid documents, and get insurance paid in full. Kura takes 0%.",
          km: "គ្រូពេទ្យតាមគ្លីនិកអាចបញ្ជាទិញតេស្តណាមួយ ទទួលការមករើសសំណាកប្រចាំថ្ងៃ ចុះហត្ថលេខាអេឡិចត្រូនិកលើឯកសារស្របច្បាប់ និងទទួលធានារ៉ាប់រងពេញ — Kura យក ០%។",
        }}
        primary={{ label: { en: "Apply to verify", km: "ដាក់ពាក្យផ្ទៀងផ្ទាត់" }, href: "/contact" }}
        secondary={{
          label: { en: "See how ordering works", km: "មើលរបៀបបញ្ជាទិញ" },
          href: "/how-it-works",
        }}
        aside={<ResultPreview />}
      />

      <StatShowcase
        tone="ink"
        eyebrow={{ en: "By the numbers", km: "តាមតួលេខ" }}
        title={{ en: "Built for private practice", km: "បង្កើតសម្រាប់ការអនុវត្តឯកជន" }}
        lead={{
          en: "A full lab workflow that pays out to you, not to a platform. Verification clears before the day is out.",
          km: "ដំណើរការមន្ទីរពិសោធន៍ពេញលេញដែលបង់ត្រឡប់ឱ្យអ្នក មិនមែនទៅវេទិកាទេ — ហើយផ្ទៀងផ្ទាត់រួចមុនចប់ថ្ងៃ។",
        }}
        items={[
          { value: "1,200+", label: { en: "Verified clinicians", km: "គ្រូពេទ្យផ្ទៀងផ្ទាត់" } },
          { value: "0%", label: { en: "Taken from insurance", km: "កាត់ពីធានារ៉ាប់រង" } },
          { value: "Same-day", label: { en: "Verification", km: "ការផ្ទៀងផ្ទាត់" } },
          { value: "24h", label: { en: "Typical results", km: "លទ្ធផល" } },
        ]}
      />

      <FeatureRows
        tone="default"
        numbered={true}
        eyebrow={{ en: "Why doctors choose Kura", km: "ហេតុអ្វីគ្រូពេទ្យជ្រើស Kura" }}
        title={{
          en: "Everything a cabinet needs, nothing it doesn't",
          km: "អ្វីៗដែលគ្លីនិកត្រូវការ",
        }}
        lead={{
          en: "No equipment. No upfront cost. No overhead. Just the parts of a lab a doctor actually needs.",
          km: "គ្មានឧបករណ៍ គ្មានចំណាយដំបូង គ្មានបន្ទុក — មានតែផ្នែកដែលគ្រូពេទ្យត្រូវការ។",
        }}
        items={[
          {
            title: { en: "Order from anywhere", km: "បញ្ជាទិញពីគ្រប់ទីកន្លែង" },
            body: {
              en: "Browse 500+ tests and panels, then order from your cabinet, your phone, or a home visit. No lab of your own required.",
              km: "មើលតេស្ត និងផេនែលជាង ៥០០ ហើយបញ្ជាទិញពីគ្លីនិក ទូរស័ព្ទ ឬពេលទៅពិនិត្យតាមផ្ទះ — ដោយមិនចាំបាច់មានមន្ទីរពិសោធន៍ផ្ទាល់ខ្លួន។",
            },
          },
          {
            title: { en: "Daily clinic courier sweep", km: "ការមករើសសំណាកប្រចាំថ្ងៃ" },
            body: {
              en: "A courier swings by your clinic every day, the \"milkman\" pickup, collecting the day's samples so you never touch logistics.",
              km: "អ្នកដឹកជញ្ជូនមកគ្លីនិករបស់អ្នករាល់ថ្ងៃ ដើម្បីយកសំណាកប្រចាំថ្ងៃ ដូច្នេះអ្នកមិនបាច់រវល់ពីការដឹកជញ្ជូន។",
            },
          },
          {
            title: { en: "E-signed Dx & Rx", km: "ការវិនិច្ឆ័យ និងវេជ្ជបញ្ជាចុះហត្ថលេខាអេឡិចត្រូនិក" },
            body: {
              en: "Issue MoH-compliant diagnoses and prescriptions with ICD-10 coding, on your own letterhead, e-signed and legally valid.",
              km: "ចេញការវិនិច្ឆ័យ និងវេជ្ជបញ្ជាស្របតាមក្រសួងសុខាភិបាល ជាមួយលេខកូដ ICD-10 លើក្បាលលិខិតរបស់អ្នក ចុះហត្ថលេខាអេឡិចត្រូនិក និងស្របច្បាប់។",
            },
          },
          {
            title: { en: "Insurance paid in full. Kura takes 0%", km: "ទទួលធានារ៉ាប់រងពេញ — Kura យក ០%" },
            body: {
              en: "Forte EmCare, NSSF, cash, and KHQR all settle to you in full. Kura takes 0% from insurance.",
              km: "Forte EmCare, NSSF, សាច់ប្រាក់ និង KHQR ត្រូវបង់ឱ្យអ្នកពេញលេញ។ Kura យក ០% ពីធានារ៉ាប់រង។",
            },
          },
          {
            title: { en: "Public directory profile", km: "ប្រវត្តិរូបក្នុងបញ្ជីសាធារណៈ" },
            body: {
              en: "Verified clinicians get a profile in the Kura directory, so patients searching for care can find you and trust you.",
              km: "គ្រូពេទ្យដែលបានផ្ទៀងផ្ទាត់ ទទួលបានប្រវត្តិរូបក្នុងបញ្ជី Kura ដើម្បីឱ្យអ្នកជំងឺអាចស្វែងរក និងទុកចិត្តលើអ្នក។",
            },
          },
        ]}
      />

      <Showcase
        tone="tint"
        side="left"
        visual={<ResultPreview />}
        eyebrow={{ en: "Built for how you practise", km: "សម្រាប់របៀបអ្នកអនុវត្ត" }}
        title={{ en: "Clinical tools, in one place", km: "ឧបករណ៍ព្យាបាល ក្នុងកន្លែងតែមួយ" }}
        lead={{
          en: "Read results, code diagnoses, sign documents, and reach your patients, all from the same screen.",
          km: "អានលទ្ធផល ដាក់លេខកូដការវិនិច្ឆ័យ ចុះហត្ថលេខាលើឯកសារ និងទាក់ទងអ្នកជំងឺ — ទាំងអស់ពីអេក្រង់តែមួយ។",
        }}
        items={[
          {
            icon: "signature",
            title: { en: "E-signed documents", km: "ឯកសារចុះហត្ថលេខាអេឡិចត្រូនិក" },
            body: {
              en: "Sign diagnoses and prescriptions once. They go out on your letterhead, legally valid.",
              km: "ចុះហត្ថលេខាលើការវិនិច្ឆ័យ និងវេជ្ជបញ្ជាម្តង។ វាចេញលើក្បាលលិខិតរបស់អ្នក និងស្របច្បាប់។",
            },
          },
          {
            icon: "report",
            title: { en: "Mandatory ICD-10 coding", km: "លេខកូដ ICD-10 ចាំបាច់" },
            body: {
              en: "Every diagnosis is coded to ICD-10, so your records stay clean and insurance-ready.",
              km: "រាល់ការវិនិច្ឆ័យត្រូវដាក់លេខកូដ ICD-10 ដើម្បីឱ្យកំណត់ត្រាស្អាត និងត្រៀមសម្រាប់ធានារ៉ាប់រង។",
            },
          },
          {
            icon: "flask",
            title: { en: "SI / US units toggle", km: "ប្តូរឯកតា SI / US" },
            body: {
              en: "Read results in SI or conventional US units. Switch with a tap to match how you read.",
              km: "អានលទ្ធផលជាឯកតា SI ឬ US — ប្តូរបានភ្លាមៗតាមរបៀបដែលអ្នកអាន។",
            },
          },
          {
            icon: "send",
            title: { en: "Telegram + SMS patient comms", km: "ការទំនាក់ទំនងតាម Telegram និង SMS" },
            body: {
              en: "Reports reach your patients on Telegram and SMS, in plain language they can understand.",
              km: "របាយការណ៍ទៅដល់អ្នកជំងឺតាម Telegram និង SMS ជាភាសាងាយយល់។",
            },
          },
        ]}
      />

      <Section id="verify" tone="default">
        <NumberedList
          tone="default"
          eyebrow={{ en: "Know Your Doctor", km: "ស្គាល់គ្រូពេទ្យរបស់អ្នក" }}
          title={{ en: "Verified in a day", km: "ផ្ទៀងផ្ទាត់ក្នុងមួយថ្ងៃ" }}
          lead={{
            en: "Four short steps to unlock ordering. Verification never blocks the catalog. It only gates real orders and legal documents.",
            km: "បួនជំហានខ្លី ដើម្បីដោះសោការបញ្ជាទិញ។ ការផ្ទៀងផ្ទាត់មិនរារាំងការមើលបញ្ជីតេស្តទេ — វាគ្រាន់តែគ្រប់គ្រងការបញ្ជាទិញពិត និងឯកសារស្របច្បាប់។",
          }}
          items={[
            {
              title: { en: "Licence", km: "អាជ្ញាប័ណ្ណ" },
              body: {
                en: "Upload your medical licence. We confirm you're cleared to practise in Cambodia.",
                km: "បញ្ចូលអាជ្ញាប័ណ្ណវេជ្ជសាស្ត្ររបស់អ្នក ដើម្បីយើងបញ្ជាក់ថាអ្នកមានសិទ្ធិអនុវត្តវិជ្ជាជីវៈនៅកម្ពុជា។",
              },
            },
            {
              title: { en: "Identity", km: "អត្តសញ្ញាណ" },
              body: {
                en: "A quick liveness selfie and your national ID match you to your licence in seconds.",
                km: "រូបថតផ្ទាល់ខ្លួនរហ័ស និងអត្តសញ្ញាណប័ណ្ណ ផ្គូផ្គងអ្នកជាមួយអាជ្ញាប័ណ្ណក្នុងពេលប៉ុន្មានវិនាទី។",
              },
            },
            {
              title: { en: "Practice details", km: "ព័ត៌មានគ្លីនិក" },
              body: {
                en: "Your clinic name, address, and specialty become the letterhead on every document you issue.",
                km: "ឈ្មោះគ្លីនិក អាសយដ្ឋាន និងជំនាញរបស់អ្នក ក្លាយជាក្បាលលិខិតលើឯកសារទាំងអស់ដែលអ្នកចេញ។",
              },
            },
            {
              title: { en: "Review & submit", km: "ពិនិត្យ និងដាក់ស្នើ" },
              body: {
                en: "Check it once, submit, and most clinicians are cleared to order the same day.",
                km: "ពិនិត្យម្តង ដាក់ស្នើ ហើយគ្រូពេទ្យភាគច្រើនអាចបញ្ជាទិញបាននៅថ្ងៃតែមួយ។",
              },
            },
          ]}
        />
      </Section>

      <Testimonials tone="tint" />

      <FaqSection audience="doctors" tone="default" />

      <CTASection
        title={{ en: "Verify the same day, order today.", km: "ផ្ទៀងផ្ទាត់ក្នុងថ្ងៃតែមួយ បញ្ជាទិញថ្ងៃនេះ។" }}
        subtitle={{
          en: "Apply once, clear the same day, and start ordering labs from your cabinet.",
          km: "ដាក់ពាក្យម្តង ទទួលការអនុញ្ញាតថ្ងៃតែមួយ ហើយចាប់ផ្តើមបញ្ជាទិញតេស្តពីគ្លីនិករបស់អ្នក។",
        }}
        primary={{ label: { en: "Apply to verify", km: "ដាក់ពាក្យផ្ទៀងផ្ទាត់" }, href: "/contact" }}
        secondary={{ label: { en: "Provider login", km: "ចូលគណនីអ្នកផ្តល់សេវា" }, href: "/contact" }}
      />
    </>
  );
}
