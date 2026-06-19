import type { Localized } from "@/i18n/LanguageProvider";

export const SITE = {
  name: "Kura",
  legalName: "Kura Diagnostics (Cambodia)",
  domain: "kura.med",
  tagline: {
    en: "Cambodia's diagnostics operating system",
    km: "ប្រព័ន្ធប្រតិបត្តិការវេជ្ជសាស្ត្រវិនិច្ឆ័យរបស់កម្ពុជា",
  } satisfies Localized,
  signOff: {
    en: "Care that comes to you.",
    km: "ការថែទាំដែលធ្វើដំណើរដល់អ្នក។",
  } satisfies Localized,
  contact: {
    phone: "+855 23 900 100",
    telegram: "@kuramed",
    email: "hello@kura.med",
    address: {
      en: "No. 56, Street 240, BKK1, Phnom Penh, Cambodia",
      km: "លេខ ៥៦ ផ្លូវ ២៤០ បឹងកេងកង១ ភ្នំពេញ កម្ពុជា",
    } satisfies Localized,
  },
};

/** Headline trust numbers — used in stat strips across the site. */
export const STATS: { value: string; label: Localized; sub?: Localized }[] = [
  {
    value: "1,200+",
    label: { en: "Doctors verified", km: "គ្រូពេទ្យដែលបានផ្ទៀងផ្ទាត់" },
  },
  {
    value: "60,000+",
    label: { en: "Patients served", km: "អ្នកជំងឺបានទទួលសេវា" },
  },
  {
    value: "500+",
    label: { en: "Tests and panels", km: "តេស្ត និងផ្គុំតេស្ត" },
  },
  {
    value: "12",
    label: { en: "Collection centres", km: "មជ្ឈមណ្ឌលប្រមូលសំណាក" },
    sub: { en: "in 8 provinces", km: "ក្នុង ៨ ខេត្ត" },
  },
  {
    value: "24h",
    label: { en: "Typical result time", km: "រយៈពេលផ្តល់លទ្ធផល" },
  },
  {
    value: "0%",
    label: { en: "Tied to insurance", km: "កាត់ពីការទូទាត់ធានារ៉ាប់រង" },
  },
];

export const ACCREDITATIONS: { name: string; note: Localized }[] = [
  { name: "ISO 15189", note: { en: "Lab quality standard", km: "គុណភាពមន្ទីរពិសោធន៍" } },
  { name: "Cambodia MoH", note: { en: "Licensed for Dx and Rx", km: "អាជ្ញាប័ណ្ណ Dx & Rx" } },
  { name: "RIQAS", note: { en: "UK quality assurance", km: "ការត្រួតពិនិត្យគុណភាពពីចក្រភពអង់គ្លេស" } },
  { name: "SOC 2", note: { en: "Your data stays private", km: "សុវត្ថិភាពទិន្នន័យ" } },
  { name: "Forte EmCare", note: { en: "Insurance partner", km: "ដៃគូធានារ៉ាប់រង" } },
  { name: "NSSF", note: { en: "National social security", km: "បេឡាជាតិសន្តិសុខសង្គម" } },
];

/** Partner lab / payment / channel logos shown as a greyscale trust marquee. */
export const PARTNERS: string[] = [
  "Institut Pasteur",
  "Calmette",
  "Royal Phnom Penh",
  "Forte EmCare",
  "NSSF",
  "Telegram",
  "ABA · KHQR",
  "Wing",
];

export type NavItem = {
  label: Localized;
  href: string;
  desc?: Localized;
};

export type NavGroup = {
  label: Localized;
  href?: string;
  items?: NavItem[];
};

export const NAV: NavGroup[] = [
  {
    label: { en: "Solutions", km: "ដំណោះស្រាយ" },
    items: [
      {
        label: { en: "For Doctors", km: "សម្រាប់គ្រូពេទ្យ" },
        href: "/for-doctors",
        desc: { en: "Order labs without running one", km: "បញ្ជាទិញតេស្តដោយមិនចាំបាច់មានមន្ទីរពិសោធន៍" },
      },
      {
        label: { en: "For Patients", km: "សម្រាប់អ្នកជំងឺ" },
        href: "/for-patients",
        desc: { en: "Get tested. Understand your results.", km: "ធ្វើតេស្ត និងយល់ពីលទ្ធផល" },
      },
      {
        label: { en: "For Business", km: "សម្រាប់អាជីវកម្ម" },
        href: "/for-business",
        desc: { en: "Clinics, employers, and insurers", km: "គ្លីនិក និយោជក និងធានារ៉ាប់រង" },
      },
    ],
  },
  {
    label: { en: "Catalog", km: "បញ្ជីតេស្ត" },
    items: [
      {
        label: { en: "Tests and panels", km: "តេស្ត និងផ្គុំតេស្ត" },
        href: "/tests",
        desc: { en: "Browse 500+ tests you can order", km: "មើលតេស្តជាង ៥០០" },
      },
      {
        label: { en: "Health packages", km: "កញ្ចប់សុខភាព" },
        href: "/packages",
        desc: { en: "Complete checkups, one price", km: "ការត្រួតពិនិត្យសុខភាពតម្លៃតែមួយ" },
      },
      {
        label: { en: "Results you understand", km: "លទ្ធផលដែលអ្នកយល់" },
        href: "/results",
        desc: { en: "Reports in plain language", km: "របាយការណ៍ភាសាសាមញ្ញ" },
      },
      {
        label: { en: "Pricing", km: "តម្លៃ" },
        href: "/pricing",
        desc: { en: "Clear prices, no surprises", km: "តម្លៃច្បាស់លាស់" },
      },
    ],
  },
  {
    label: { en: "How it works", km: "របៀបដំណើរការ" },
    href: "/how-it-works",
  },
  {
    label: { en: "Network", km: "បណ្តាញ" },
    href: "/network",
  },
  {
    label: { en: "Company", km: "ក្រុមហ៊ុន" },
    items: [
      {
        label: { en: "About Kura", km: "អំពី Kura" },
        href: "/about",
        desc: { en: "Our mission, science, and quality", km: "បេសកកម្ម វិទ្យាសាស្ត្រ និងគុណភាព" },
      },
      {
        label: { en: "Health knowledge", km: "ចំណេះដឹងសុខភាព" },
        href: "/blog",
        desc: { en: "Guides in Khmer and English", km: "មគ្គុទេសក៍ជាខ្មែរ និងអង់គ្លេស" },
      },
      {
        label: { en: "FAQ", km: "សំណួរញឹកញាប់" },
        href: "/faq",
      },
      {
        label: { en: "Contact", km: "ទំនាក់ទំនង" },
        href: "/contact",
      },
    ],
  },
];

export const FOOTER: { heading: Localized; links: NavItem[] }[] = [
  {
    heading: { en: "For Doctors", km: "សម្រាប់គ្រូពេទ្យ" },
    links: [
      { label: { en: "Order labs", km: "បញ្ជាទិញតេស្ត" }, href: "/for-doctors" },
      { label: { en: "Verification (KYD)", km: "ការផ្ទៀងផ្ទាត់" }, href: "/for-doctors#verify" },
      { label: { en: "e-Signed Dx and Rx", km: "ឯកសារចុះហត្ថលេខា" }, href: "/for-doctors#documents" },
      { label: { en: "Provider login", km: "ចូលគណនីគ្រូពេទ្យ" }, href: "/contact" },
    ],
  },
  {
    heading: { en: "For Patients", km: "សម្រាប់អ្នកជំងឺ" },
    links: [
      { label: { en: "Find a test", km: "ស្វែងរកតេស្ត" }, href: "/tests" },
      { label: { en: "Health packages", km: "កញ្ចប់សុខភាព" }, href: "/packages" },
      { label: { en: "Understand results", km: "យល់ពីលទ្ធផល" }, href: "/results" },
      { label: { en: "Collection centres", km: "មជ្ឈមណ្ឌលប្រមូលសំណាក" }, href: "/network" },
    ],
  },
  {
    heading: { en: "For Business", km: "សម្រាប់អាជីវកម្ម" },
    links: [
      { label: { en: "Clinics and cabinets", km: "គ្លីនិក" }, href: "/for-business#clinics" },
      { label: { en: "Corporate health", km: "សុខភាពបុគ្គលិក" }, href: "/for-business#corporate" },
      { label: { en: "Insurers", km: "ក្រុមហ៊ុនធានារ៉ាប់រង" }, href: "/for-business#insurers" },
      { label: { en: "Contact sales", km: "ទាក់ទងផ្នែកលក់" }, href: "/contact" },
    ],
  },
  {
    heading: { en: "Company", km: "ក្រុមហ៊ុន" },
    links: [
      { label: { en: "About", km: "អំពីយើង" }, href: "/about" },
      { label: { en: "How it works", km: "របៀបដំណើរការ" }, href: "/how-it-works" },
      { label: { en: "Health knowledge", km: "ចំណេះដឹងសុខភាព" }, href: "/blog" },
      { label: { en: "FAQ", km: "សំណួរញឹកញាប់" }, href: "/faq" },
    ],
  },
];

export const LEGAL: NavItem[] = [
  { label: { en: "Privacy", km: "ឯកជនភាព" }, href: "/privacy" },
  { label: { en: "Terms", km: "លក្ខខណ្ឌ" }, href: "/terms" },
  { label: { en: "Data policy", km: "គោលការណ៍ទិន្នន័យ" }, href: "/privacy#data" },
];
