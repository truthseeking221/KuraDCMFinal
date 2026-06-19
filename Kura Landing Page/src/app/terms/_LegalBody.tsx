"use client";

import { useLang, type Localized } from "@/i18n/LanguageProvider";
import { Section } from "@/components/ui";

type LegalSection = { heading: Localized; paragraphs: Localized[] };

const UPDATED: Localized = {
  en: "Last updated: June 2026",
  km: "ធ្វើបច្ចុប្បន្នភាពចុងក្រោយ៖ ខែមិថុនា ឆ្នាំ២០២៦",
};

const SECTIONS: LegalSection[] = [
  {
    heading: { en: "Acceptance of terms", km: "ការទទួលយកលក្ខខណ្ឌ" },
    paragraphs: [
      {
        en: "By accessing or using Kura, including our website, ordering tools, collection services and result delivery, you agree to these terms. If you do not agree, please do not use the service.",
        km: "ដោយការចូលប្រើ ឬប្រើប្រាស់ Kura — គេហទំព័រ ឧបករណ៍បញ្ជាទិញ សេវាប្រមូលសំណាក និងការផ្ញើលទ្ធផល — អ្នកយល់ព្រមនឹងលក្ខខណ្ឌទាំងនេះ។ ប្រសិនបើអ្នកមិនយល់ព្រម សូមកុំប្រើប្រាស់សេវាកម្មនេះ។",
      },
      {
        en: "These terms apply alongside our Privacy Policy. Where a separate written agreement exists between Kura and a clinic or partner, that agreement governs in case of conflict.",
        km: "លក្ខខណ្ឌទាំងនេះអនុវត្តរួមជាមួយគោលការណ៍ឯកជនភាពរបស់យើង។ ក្នុងករណីមានកិច្ចព្រមព្រៀងជាលាយលក្ខណ៍អក្សរដាច់ដោយឡែករវាង Kura និងគ្លីនិក ឬដៃគូ កិច្ចព្រមព្រៀងនោះនឹងមានអាទិភាពពេលមានជម្លោះ។",
      },
    ],
  },
  {
    heading: { en: "Who can use Kura", km: "អ្នកណាអាចប្រើ Kura" },
    paragraphs: [
      {
        en: "Kura serves three audiences. Doctors order tests and review results for their patients. Patients are sampled at a collection centre or at home and receive their reports. Businesses and clinics arrange diagnostics for their staff or members.",
        km: "Kura បម្រើអ្នកប្រើបីប្រភេទ។ វេជ្ជបណ្ឌិតបញ្ជាទិញតេស្ត និងពិនិត្យលទ្ធផលសម្រាប់អ្នកជំងឺ។ អ្នកជំងឺត្រូវបានយកសំណាកនៅមណ្ឌលប្រមូល ឬនៅផ្ទះ ហើយទទួលរបាយការណ៍។ អាជីវកម្ម និងគ្លីនិករៀបចំការធ្វើតេស្តសម្រាប់បុគ្គលិក ឬសមាជិករបស់ខ្លួន។",
      },
      {
        en: "You must be at least 18 years old to create an account or place an order. Tests for minors must be arranged by a parent, legal guardian or a verified doctor acting within their scope of practice.",
        km: "អ្នកត្រូវមានអាយុយ៉ាងតិច ១៨ ឆ្នាំ ដើម្បីបង្កើតគណនី ឬបញ្ជាទិញ។ ការធ្វើតេស្តសម្រាប់អនីតិជនត្រូវរៀបចំដោយឪពុកម្តាយ អាណាព្យាបាលស្របច្បាប់ ឬវេជ្ជបណ្ឌិតដែលបានផ្ទៀងផ្ទាត់។",
      },
    ],
  },
  {
    heading: { en: "Medical disclaimer", km: "សេចក្តីបដិសេធផ្នែកវេជ្ជសាស្ត្រ" },
    paragraphs: [
      {
        en: "Kura provides laboratory testing and clinician-reviewed reports to support clinical decisions. Our results and plain-language explanations are intended to inform, not to replace, the judgement of a qualified doctor.",
        km: "Kura ផ្តល់សេវាធ្វើតេស្តមន្ទីរពិសោធន៍ និងរបាយការណ៍ដែលត្រួតពិនិត្យដោយគ្រូពេទ្យ ដើម្បីគាំទ្រការសម្រេចចិត្តផ្នែកព្យាបាល។ លទ្ធផល និងការពន្យល់ជាភាសាសាមញ្ញរបស់យើងមានបំណងជូនព័ត៌មាន មិនមែនជំនួសការវិនិច្ឆ័យរបស់វេជ្ជបណ្ឌិតមានសមត្ថភាពនោះទេ។",
      },
      {
        en: "Always consult a doctor before acting on a result. If you have a medical emergency, contact local emergency services. Do not rely on Kura for urgent care.",
        km: "សូមពិគ្រោះជាមួយវេជ្ជបណ្ឌិតជានិច្ច មុនពេលធ្វើសកម្មភាពតាមលទ្ធផល។ ប្រសិនបើអ្នកមានអាសន្នផ្នែកវេជ្ជសាស្ត្រ សូមទាក់ទងសេវាសង្គ្រោះបន្ទាន់ក្នុងតំបន់ — កុំពឹងផ្អែកលើ Kura សម្រាប់ការថែទាំបន្ទាន់។",
      },
    ],
  },
  {
    heading: {
      en: "Doctor verification & responsibilities",
      km: "ការផ្ទៀងផ្ទាត់ និងទំនួលខុសត្រូវរបស់វេជ្ជបណ្ឌិត",
    },
    paragraphs: [
      {
        en: "Doctors who order through Kura must complete verification of their licence and identity. You agree to keep your credentials accurate and to order only within your scope of practice and applicable Cambodian regulations.",
        km: "វេជ្ជបណ្ឌិតដែលបញ្ជាទិញតាម Kura ត្រូវបំពេញការផ្ទៀងផ្ទាត់អាជ្ញាប័ណ្ណ និងអត្តសញ្ញាណរបស់ខ្លួន។ អ្នកយល់ព្រមរក្សាព័ត៌មានសម្គាល់ឱ្យត្រឹមត្រូវ ហើយបញ្ជាទិញតែក្នុងវិសាលភាពនៃការអនុវត្ត និងបទប្បញ្ញត្តិកម្ពុជាដែលពាក់ព័ន្ធ។",
      },
      {
        en: "You are responsible for obtaining your patient's consent, interpreting results, and communicating clinical advice. You must not share your account access with anyone else.",
        km: "អ្នកមានទំនួលខុសត្រូវក្នុងការទទួលការយល់ព្រមពីអ្នកជំងឺ បកស្រាយលទ្ធផល និងផ្តល់ការណែនាំផ្នែកព្យាបាល។ អ្នកមិនត្រូវចែករំលែកសិទ្ធិចូលប្រើគណនីរបស់អ្នកជាមួយអ្នកដទៃឡើយ។",
      },
    ],
  },
  {
    heading: { en: "Payments & insurance", km: "ការទូទាត់ និងធានារ៉ាប់រង" },
    paragraphs: [
      {
        en: "Prices for tests and packages are shown before you order. Payment is due at the time of booking unless a separate billing arrangement is in place with your clinic or employer.",
        km: "តម្លៃតេស្ត និងកញ្ចប់ត្រូវបានបង្ហាញមុនពេលអ្នកបញ្ជាទិញ។ ការទូទាត់ត្រូវធ្វើនៅពេលកក់ លុះត្រាតែមានការរៀបចំវិក្កយបត្រដាច់ដោយឡែកជាមួយគ្លីនិក ឬនិយោជករបស់អ្នក។",
      },
      {
        en: "Kura takes 0% from insurance. When a test is covered, your insurer's reimbursement goes to you in full. We are paid only for the diagnostic service we provide.",
        km: "Kura យក ០% ពីធានារ៉ាប់រង។ ពេលតេស្តត្រូវបានធានា ការសងវិញពីក្រុមហ៊ុនធានារ៉ាប់រងរបស់អ្នកត្រូវផ្តល់ឱ្យអ្នកពេញលេញ — យើងទទួលប្រាក់តែសម្រាប់សេវាធ្វើតេស្តដែលយើងផ្តល់ប៉ុណ្ណោះ។",
      },
    ],
  },
  {
    heading: { en: "Acceptable use", km: "ការប្រើប្រាស់ដែលអាចទទួលយកបាន" },
    paragraphs: [
      {
        en: "Use Kura only for lawful purposes. Do not misuse the service, attempt to access accounts or data that are not yours, interfere with our systems, or place orders you are not authorised to place.",
        km: "ប្រើ Kura សម្រាប់គោលបំណងស្របច្បាប់ប៉ុណ្ណោះ។ កុំប្រើខុស កុំព្យាយាមចូលប្រើគណនី ឬទិន្នន័យដែលមិនមែនជារបស់អ្នក កុំរំខានប្រព័ន្ធរបស់យើង ឬបញ្ជាទិញដែលអ្នកគ្មានសិទ្ធិធ្វើ។",
      },
      {
        en: "We may suspend or close accounts that breach these terms, that we reasonably believe to be fraudulent, or that put patient safety at risk.",
        km: "យើងអាចផ្អាក ឬបិទគណនីដែលរំលោភលក្ខខណ្ឌទាំងនេះ ដែលយើងជឿជាក់ដោយសមហេតុផលថាក្លែងបន្លំ ឬដែលធ្វើឱ្យសុវត្ថិភាពអ្នកជំងឺមានហានិភ័យ។",
      },
    ],
  },
  {
    heading: { en: "Liability", km: "ការទទួលខុសត្រូវ" },
    paragraphs: [
      {
        en: "We work hard to deliver accurate results through accredited partner labs. To the extent permitted by law, Kura is not liable for indirect or consequential losses, or for clinical decisions made on the basis of our reports.",
        km: "យើងខិតខំផ្តល់លទ្ធផលត្រឹមត្រូវតាមរយៈមន្ទីរពិសោធន៍ដៃគូដែលមានការទទួលស្គាល់។ ក្នុងវិសាលភាពដែលច្បាប់អនុញ្ញាត Kura មិនទទួលខុសត្រូវចំពោះការខាតបង់ដោយប្រយោល ឬជាលទ្ធផល ឬចំពោះការសម្រេចចិត្តផ្នែកព្យាបាលផ្អែកលើរបាយការណ៍របស់យើងឡើយ។",
      },
      {
        en: "Nothing in these terms limits any liability that cannot lawfully be limited, including liability for death or personal injury caused by negligence.",
        km: "គ្មានអ្វីក្នុងលក្ខខណ្ឌទាំងនេះកំណត់ការទទួលខុសត្រូវដែលមិនអាចកំណត់ដោយស្របច្បាប់បានឡើយ រួមទាំងការទទួលខុសត្រូវចំពោះមរណភាព ឬរបួសផ្ទាល់ខ្លួនដែលបណ្តាលមកពីការធ្វេសប្រហែស។",
      },
    ],
  },
  {
    heading: { en: "Changes to these terms", km: "ការផ្លាស់ប្តូរលក្ខខណ្ឌ" },
    paragraphs: [
      {
        en: "We may update these terms as the service evolves. When changes are material, we will note the new date below and, where appropriate, let you know in advance.",
        km: "យើងអាចធ្វើបច្ចុប្បន្នភាពលក្ខខណ្ឌទាំងនេះ ពេលសេវាកម្មរីកចម្រើន។ ពេលមានការផ្លាស់ប្តូរសំខាន់ៗ យើងនឹងសម្គាល់កាលបរិច្ឆេទថ្មីខាងក្រោម ហើយជូនដំណឹងជាមុនពេលសមរម្យ។",
      },
      {
        en: "Continuing to use Kura after a change takes effect means you accept the updated terms.",
        km: "ការបន្តប្រើ Kura បន្ទាប់ពីការផ្លាស់ប្តូរមានប្រសិទ្ធភាព មានន័យថាអ្នកទទួលយកលក្ខខណ្ឌដែលបានធ្វើបច្ចុប្បន្នភាព។",
      },
    ],
  },
  {
    heading: { en: "Contact", km: "ទំនាក់ទំនង" },
    paragraphs: [
      {
        en: "Questions about these terms? Reach our team and we will respond promptly.",
        km: "មានសំណួរអំពីលក្ខខណ្ឌទាំងនេះ? ទាក់ទងក្រុមការងាររបស់យើង ហើយយើងនឹងឆ្លើយតបយ៉ាងឆាប់រហ័ស។",
      },
    ],
  },
];

export function LegalBody() {
  const { t } = useLang();

  return (
    <Section width="narrow">
      <div className="flex flex-col gap-12">
        <p className="text-caption text-ink-500">{t(UPDATED)}</p>
        {SECTIONS.map((section) => (
          <div key={section.heading.en} className="flex flex-col gap-4">
            <h2 className="text-h4 font-medium text-ink-950">{t(section.heading)}</h2>
            {section.paragraphs.map((paragraph, i) => (
              <p key={i} className="text-body text-ink-600 text-pretty">
                {t(paragraph)}
              </p>
            ))}
          </div>
        ))}
      </div>
    </Section>
  );
}
