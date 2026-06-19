import type { Localized } from "@/i18n/LanguageProvider";

export type Person = {
  name: string;
  initials: string;
  role: Localized;
  affiliation: Localized;
};

export const ADVISORS: Person[] = [
  { name: "Prof. Vannak Heng", initials: "VH", role: { en: "Chair, Medical Advisory Board", km: "ប្រធានក្រុមប្រឹក្សាវេជ្ជសាស្ត្រ" }, affiliation: { en: "Pathology · Phnom Penh", km: "រោគវិទ្យា · ភ្នំពេញ" } },
  { name: "Dr. Mealea Sok", initials: "MS", role: { en: "Endocrinology", km: "ក្រពេញវិទ្យា" }, affiliation: { en: "Calmette Hospital", km: "មន្ទីរពេទ្យកាល់ម៉ែត" } },
  { name: "Dr. Ratha Kong", initials: "RK", role: { en: "Infectious disease", km: "ជំងឺឆ្លង" }, affiliation: { en: "Institut Pasteur du Cambodge", km: "វិទ្យាស្ថានប៉ាស្ទ័រ" } },
  { name: "Dr. Chanthou Em", initials: "CE", role: { en: "Laboratory medicine", km: "វេជ្ជសាស្ត្រមន្ទីរពិសោធន៍" }, affiliation: { en: "ISO 15189 lead", km: "ប្រធាន ISO 15189" } },
  { name: "Dr. Pisey Nuon", initials: "PN", role: { en: "Cardiology", km: "បេះដូងវិទ្យា" }, affiliation: { en: "Royal Phnom Penh", km: "មន្ទីរពេទ្យរ៉ូយ៉ាល់" } },
  { name: "Dr. Sothea Va", initials: "SV", role: { en: "Family medicine", km: "វេជ្ជសាស្ត្រគ្រួសារ" }, affiliation: { en: "Siem Reap", km: "សៀមរាប" } },
];

export const LEADERS: Person[] = [
  { name: "Pierre Tison", initials: "PT", role: { en: "Co-founder & CEO", km: "សហស្ថាបនិក & នាយកប្រតិបត្តិ" }, affiliation: { en: "Health systems", km: "ប្រព័ន្ធសុខភាព" } },
  { name: "Leakhena Sar", initials: "LS", role: { en: "Co-founder & COO", km: "សហស្ថាបនិក & នាយកប្រតិបត្តិការ" }, affiliation: { en: "Lab operations", km: "ប្រតិបត្តិការមន្ទីរពិសោធន៍" } },
  { name: "David Meas", initials: "DM", role: { en: "Co-founder & CTO", km: "សហស្ថាបនិក & នាយកបច្ចេកវិទ្យា" }, affiliation: { en: "Engineering", km: "វិស្វកម្ម" } },
];

/** "How it works" lifecycle steps, reused across pages. */
export const LIFECYCLE: { n: string; title: Localized; body: Localized; icon: string }[] = [
  {
    n: "01",
    icon: "report",
    title: { en: "Order in seconds", km: "បញ្ជាទិញក្នុងវិនាទី" },
    body: { en: "A doctor orders from any device. A patient books a test or package online.", km: "គ្រូពេទ្យបញ្ជាទិញ ឬអ្នកជំងឺកក់តេស្តតាមអ៊ីនធឺណិត។" },
  },
  {
    n: "02",
    icon: "droplet",
    title: { en: "Give a sample", km: "ផ្តល់សំណាក" },
    body: { en: "Walk into a collection centre, or have a phlebotomist come to you at home. Couriers sweep clinics every day.", km: "ចូលមជ្ឈមណ្ឌល ឬអ្នកបច្ចេកទេសមកផ្ទះ។" },
  },
  {
    n: "03",
    icon: "flask",
    title: { en: "Accredited lab", km: "មន្ទីរពិសោធន៍មានស្តង់ដារ" },
    body: { en: "Your sample is run by ISO-accredited partner labs, under tight quality control.", km: "សំណាកត្រូវបានវិភាគដោយមន្ទីរពិសោធន៍មានស្តង់ដារ ISO។" },
  },
  {
    n: "04",
    icon: "pulse",
    title: { en: "Results you understand", km: "លទ្ធផលដែលអ្នកយល់" },
    body: { en: "Clinician-reviewed results land on Telegram in plain Khmer and English, usually within 24 hours.", km: "លទ្ធផលត្រួតពិនិត្យដោយគ្រូពេទ្យមកដល់ក្នុង ២៤ ម៉ោង។" },
  },
];
