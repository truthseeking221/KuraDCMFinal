import type { Localized } from "@/i18n/LanguageProvider";

export type Faq = { q: Localized; a: Localized; audience: "general" | "doctors" | "patients" | "business" };

export const FAQS: Faq[] = [
  {
    audience: "general",
    q: { en: "What exactly is Kura?", km: "តើ Kura ជាអ្វី?" },
    a: {
      en: "Kura is Cambodia's diagnostics platform. A doctor orders your tests. You give a sample at a nearby collection centre or at home. Our partner labs run it, a clinician reviews it, and your results land on your phone, usually within 24 hours.",
      km: "Kura គឺជាវេទិកាវេជ្ជសាស្ត្រវិនិច្ឆ័យសម្រាប់កម្ពុជា។ គ្រូពេទ្យបញ្ជាទិញតេស្ត អ្នកជំងឺផ្តល់សំណាក ហើយលទ្ធផលមកដល់ក្នុង ២៤ ម៉ោង។",
    },
  },
  {
    audience: "general",
    q: { en: "How do I get my results?", km: "តើខ្ញុំទទួលលទ្ធផលដោយរបៀបណា?" },
    a: {
      en: "Your results arrive by Telegram and SMS with a secure link. Each one is written in plain language next to its reference range, so you can see at a glance what is healthy and what needs a closer look.",
      km: "លទ្ធផលផ្ញើតាម Telegram និង SMS ជាមួយតំណសុវត្ថិភាព ដោយបង្ហាញជាភាសាសាមញ្ញ។",
    },
  },
  {
    audience: "general",
    q: { en: "Is my data private?", km: "តើទិន្នន័យរបស់ខ្ញុំឯកជនទេ?" },
    a: {
      en: "Yes. Your health data is encrypted in transit and at rest, every access is logged, and we follow SOC 2 practices and Cambodia's health-data rules. You decide who can see your results.",
      km: "បាទ/ចាស។ ទិន្នន័យសុខភាពត្រូវបានអ៊ីនគ្រីប ហើយយើងធ្វើតាមស្តង់ដារ SOC 2។",
    },
  },
  {
    audience: "general",
    q: { en: "How much does it cost?", km: "តើតម្លៃប៉ុន្មាន?" },
    a: {
      en: "You see the price before you book. Single tests start at a few dollars. Curated packages bundle dozens of tests into one clear price. No hidden fees, ever.",
      km: "តម្លៃច្បាស់លាស់ បង្ហាញមុនពេលកក់ ដោយគ្មានថ្លៃលាក់។",
    },
  },
  {
    audience: "patients",
    q: { en: "Do I need a doctor to order a test?", km: "តើខ្ញុំត្រូវការគ្រូពេទ្យដើម្បីបញ្ជាទិញតេស្តទេ?" },
    a: {
      en: "Most tests and packages you can book on your own. A few clinical tests need a doctor's order. When they do, Kura connects you to a verified clinician for a quick review.",
      km: "តេស្តជាច្រើនអ្នកអាចកក់ដោយខ្លួនឯង។ តេស្តខ្លះត្រូវការការបញ្ជាពីគ្រូពេទ្យ។",
    },
  },
  {
    audience: "patients",
    q: { en: "Can someone collect my sample at home?", km: "តើអាចប្រមូលសំណាកនៅផ្ទះបានទេ?" },
    a: {
      en: "Yes. In Phnom Penh and several provinces, a certified phlebotomist comes to your home or office. Just pick a time slot when you book.",
      km: "បាទ/ចាស។ នៅភ្នំពេញ និងខេត្តមួយចំនួន អ្នកបច្ចេកទេសអាចមកដល់ផ្ទះអ្នក។",
    },
  },
  {
    audience: "patients",
    q: { en: "Do I need to fast?", km: "តើខ្ញុំត្រូវតមអាហារទេ?" },
    a: {
      en: "Only some tests need fasting, usually 8 to 12 hours. Every test and package tells you clearly whether to fast, right before you book.",
      km: "មានតែតេស្តខ្លះប៉ុណ្ណោះត្រូវការតមអាហារ (៨–១២ ម៉ោង)។",
    },
  },
  {
    audience: "doctors",
    q: { en: "How do I get verified?", km: "តើខ្ញុំផ្ទៀងផ្ទាត់ដោយរបៀបណា?" },
    a: {
      en: "Verification (KYD) is four short steps: licence, identity, practice details, and review. Most doctors are approved the same day. You can browse the full catalog and explore before you verify. KYD only gates real orders and legal documents.",
      km: "ការផ្ទៀងផ្ទាត់មាន ៤ ជំហាន ហើយជាធម្មតាអនុម័តក្នុងថ្ងៃតែមួយ។",
    },
  },
  {
    audience: "doctors",
    q: { en: "Can I issue legal Dx and Rx documents?", km: "តើខ្ញុំអាចចេញឯកសារ Dx និង Rx បានទេ?" },
    a: {
      en: "Yes. Verified clinicians issue e-signed lab orders (Dx) and prescriptions (Rx) as MoH-compliant PDFs, complete with mandatory ICD-10 coding and your own practice letterhead.",
      km: "បាទ/ចាស។ គ្រូពេទ្យដែលផ្ទៀងផ្ទាត់អាចចេញឯកសារ Dx និង Rx ស្របច្បាប់។",
    },
  },
  {
    audience: "doctors",
    q: { en: "What does Kura charge on insurance payments?", km: "តើ Kura យកថ្លៃលើការទូទាត់ធានារ៉ាប់រងប៉ុន្មាន?" },
    a: {
      en: "Nothing. With billing enabled, insurance payments reach you in full. Kura takes 0%. We support Forte EmCare, NSSF, cash, and KHQR.",
      km: "សូន្យ។ អ្នកទទួលការទូទាត់ធានារ៉ាប់រងពេញលេញ — Kura យក ០%។",
    },
  },
  {
    audience: "business",
    q: { en: "Can Kura run corporate health screening?", km: "តើ Kura អាចធ្វើការត្រួតពិនិត្យសុខភាពបុគ្គលិកបានទេ?" },
    a: {
      en: "Yes. We run on-site or PSC-based screening for teams of any size. HR sees an aggregate, de-identified dashboard. Each employee keeps their own private results.",
      km: "បាទ/ចាស។ យើងធ្វើការត្រួតពិនិត្យសុខភាពបុគ្គលិកគ្រប់ទំហំក្រុម។",
    },
  },
  {
    audience: "business",
    q: { en: "We're a clinic without a lab. Can we use Kura?", km: "យើងជាគ្លីនិកដែលគ្មានមន្ទីរពិសោធន៍។ តើអាចប្រើ Kura បានទេ?" },
    a: {
      en: "That's exactly who Kura is built for. Order any test from your clinic. Our courier sweeps samples daily, and results come back to you and your patient. No lab to build, no equipment to buy.",
      km: "នោះគឺជាគោលដៅរបស់ Kura ។ បញ្ជាទិញតេស្តពីគ្លីនិករបស់អ្នក ហើយយើងប្រមូលសំណាករៀងរាល់ថ្ងៃ។",
    },
  },
];

export const faqsFor = (audience: Faq["audience"]) =>
  FAQS.filter((f) => f.audience === audience || (audience !== "general" && f.audience === "general"));
