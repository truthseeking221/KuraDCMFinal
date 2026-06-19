import type { Localized } from "@/i18n/LanguageProvider";

export type Testimonial = {
  quote: Localized;
  name: string;
  role: Localized;
  location: Localized;
  audience: "doctor" | "patient" | "business";
  initials: string;
};

export const TESTIMONIALS: Testimonial[] = [
  {
    audience: "doctor",
    quote: {
      en: "My clinic has no lab of its own. I order in the morning, a courier collects by noon, and signed results land the same day. It changed how I treat my patients.",
      km: "ខ្ញុំធ្វើការនៅគ្លីនិកដែលគ្មានមន្ទីរពិសោធន៍។ ជាមួយ Kura ខ្ញុំបញ្ជាទិញពេលព្រឹក ហើយលទ្ធផលត្រលប់មកក្នុងថ្ងៃតែមួយ។",
    },
    name: "Dr. Sokha Chann",
    role: { en: "General practitioner", km: "គ្រូពេទ្យទូទៅ" },
    location: { en: "Phnom Penh", km: "ភ្នំពេញ" },
    initials: "SC",
  },
  {
    audience: "patient",
    quote: {
      en: "My results came through on Telegram, in Khmer, with a plain note on what was high. For the first time, I understood my own blood test.",
      km: "លទ្ធផលរបស់ខ្ញុំមកដល់ Telegram ជាភាសាខ្មែរ ជាមួយកំណត់សម្គាល់ច្បាស់លាស់។ ជាលើកដំបូងដែលខ្ញុំយល់ពីលទ្ធផលឈាមរបស់ខ្ញុំ។",
    },
    name: "Dara Pich",
    role: { en: "Patient", km: "អ្នកជំងឺ" },
    location: { en: "Siem Reap", km: "សៀមរាប" },
    initials: "DP",
  },
  {
    audience: "business",
    quote: {
      en: "We screened 140 staff in two days across two provinces. My team saw one anonymised dashboard; every employee kept their own results private. Calm, clean, professional.",
      km: "យើងបានត្រួតពិនិត្យបុគ្គលិក ១៤០ នាក់ក្នុងរយៈពេលពីរថ្ងៃ។ ស្អាត និងវិជ្ជាជីវៈ។",
    },
    name: "Sophea Lim",
    role: { en: "HR Director", km: "នាយកធនធានមនុស្ស" },
    location: { en: "Battambang", km: "បាត់ដំបង" },
    initials: "SL",
  },
];
