import type { Localized } from "@/i18n/LanguageProvider";

export type PSC = {
  slug: string;
  name: Localized;
  city: Localized;
  province: Localized;
  address: Localized;
  hours: Localized;
  phone: string;
  services: ("walk-in" | "home" | "sweep")[];
  flagship?: boolean;
  /** Approximate position on the stylized Cambodia map (0–100%). */
  pos: { x: number; y: number };
};

export const SERVICE_LABEL: Record<PSC["services"][number], Localized> = {
  "walk-in": { en: "Walk-in", km: "ចូលផ្ទាល់" },
  home: { en: "Home collection", km: "ប្រមូលនៅផ្ទះ" },
  sweep: { en: "Daily clinic sweep", km: "ប្រមូលពីគ្លីនិក" },
};

export const PSCS: PSC[] = [
  {
    slug: "bkk1",
    name: { en: "Kura BKK1 Flagship", km: "Kura បឹងកេងកង១" },
    city: { en: "Phnom Penh", km: "ភ្នំពេញ" },
    province: { en: "Phnom Penh", km: "ភ្នំពេញ" },
    address: { en: "No. 56, Street 240, BKK1", km: "លេខ ៥៦ ផ្លូវ ២៤០ បឹងកេងកង១" },
    hours: { en: "Mon to Sun · 6:30 to 19:00", km: "ច័ន្ទ–អាទិត្យ · ៦:៣០–១៩:០០" },
    phone: "+855 23 900 100",
    services: ["walk-in", "home", "sweep"],
    flagship: true,
    pos: { x: 58, y: 64 },
  },
  {
    slug: "toul-kork",
    name: { en: "Kura Tuol Kork", km: "Kura ទួលគោក" },
    city: { en: "Phnom Penh", km: "ភ្នំពេញ" },
    province: { en: "Phnom Penh", km: "ភ្នំពេញ" },
    address: { en: "Street 315, Tuol Kork", km: "ផ្លូវ ៣១៥ ទួលគោក" },
    hours: { en: "Mon to Sun · 6:30 to 18:00", km: "ច័ន្ទ–អាទិត្យ · ៦:៣០–១៨:០០" },
    phone: "+855 23 900 101",
    services: ["walk-in", "sweep"],
    pos: { x: 56, y: 61 },
  },
  {
    slug: "chamkarmon",
    name: { en: "Kura Chamkarmon", km: "Kura ចំការមន" },
    city: { en: "Phnom Penh", km: "ភ្នំពេញ" },
    province: { en: "Phnom Penh", km: "ភ្នំពេញ" },
    address: { en: "Norodom Blvd, Chamkarmon", km: "មហាវិថីព្រះនរោត្តម" },
    hours: { en: "Mon to Sat · 7:00 to 17:00", km: "ច័ន្ទ–សៅរ៍ · ៧:០០–១៧:០០" },
    phone: "+855 23 900 102",
    services: ["walk-in", "home"],
    pos: { x: 59, y: 66 },
  },
  {
    slug: "sen-sok",
    name: { en: "Kura Sen Sok", km: "Kura សែនសុខ" },
    city: { en: "Phnom Penh", km: "ភ្នំពេញ" },
    province: { en: "Phnom Penh", km: "ភ្នំពេញ" },
    address: { en: "Hanoi Road, Sen Sok", km: "ផ្លូវហាណូយ សែនសុខ" },
    hours: { en: "Mon to Sun · 6:30 to 18:00", km: "ច័ន្ទ–អាទិត្យ · ៦:៣០–១៨:០០" },
    phone: "+855 23 900 103",
    services: ["walk-in", "sweep"],
    pos: { x: 55, y: 58 },
  },
  {
    slug: "siem-reap",
    name: { en: "Kura Siem Reap", km: "Kura សៀមរាប" },
    city: { en: "Siem Reap", km: "សៀមរាប" },
    province: { en: "Siem Reap", km: "សៀមរាប" },
    address: { en: "Sivatha Road, Svay Dangkum", km: "ផ្លូវសិវត្ថា ស្វាយដង្គំ" },
    hours: { en: "Mon to Sun · 7:00 to 18:00", km: "ច័ន្ទ–អាទិត្យ · ៧:០០–១៨:០០" },
    phone: "+855 63 900 110",
    services: ["walk-in", "home", "sweep"],
    flagship: true,
    pos: { x: 44, y: 33 },
  },
  {
    slug: "battambang",
    name: { en: "Kura Battambang", km: "Kura បាត់ដំបង" },
    city: { en: "Battambang", km: "បាត់ដំបង" },
    province: { en: "Battambang", km: "បាត់ដំបង" },
    address: { en: "Street 3, Svay Por", km: "ផ្លូវ ៣ ស្វាយប៉ោ" },
    hours: { en: "Mon to Sat · 7:00 to 17:00", km: "ច័ន្ទ–សៅរ៍ · ៧:០០–១៧:០០" },
    phone: "+855 53 900 120",
    services: ["walk-in", "sweep"],
    pos: { x: 30, y: 36 },
  },
  {
    slug: "sihanoukville",
    name: { en: "Kura Sihanoukville", km: "Kura ព្រះសីហនុ" },
    city: { en: "Sihanoukville", km: "ព្រះសីហនុ" },
    province: { en: "Preah Sihanouk", km: "ព្រះសីហនុ" },
    address: { en: "Ekareach Street", km: "ផ្លូវឯករាជ្យ" },
    hours: { en: "Mon to Sun · 7:00 to 18:00", km: "ច័ន្ទ–អាទិត្យ · ៧:០០–១៨:០០" },
    phone: "+855 34 900 130",
    services: ["walk-in", "home"],
    pos: { x: 42, y: 84 },
  },
  {
    slug: "kampong-cham",
    name: { en: "Kura Kampong Cham", km: "Kura កំពង់ចាម" },
    city: { en: "Kampong Cham", km: "កំពង់ចាម" },
    province: { en: "Kampong Cham", km: "កំពង់ចាម" },
    address: { en: "Preah Monivong Blvd", km: "មហាវិថីព្រះមុនីវង្ស" },
    hours: { en: "Mon to Sat · 7:00 to 17:00", km: "ច័ន្ទ–សៅរ៍ · ៧:០០–១៧:០០" },
    phone: "+855 42 900 140",
    services: ["walk-in", "sweep"],
    pos: { x: 66, y: 55 },
  },
  {
    slug: "kampot",
    name: { en: "Kura Kampot", km: "Kura កំពត" },
    city: { en: "Kampot", km: "កំពត" },
    province: { en: "Kampot", km: "កំពត" },
    address: { en: "Old Market area", km: "តំបន់ផ្សារចាស់" },
    hours: { en: "Mon to Sat · 7:00 to 17:00", km: "ច័ន្ទ–សៅរ៍ · ៧:០០–១៧:០០" },
    phone: "+855 33 900 150",
    services: ["walk-in", "home"],
    pos: { x: 50, y: 82 },
  },
  {
    slug: "ta-khmau",
    name: { en: "Kura Ta Khmau", km: "Kura តាខ្មៅ" },
    city: { en: "Ta Khmau", km: "តាខ្មៅ" },
    province: { en: "Kandal", km: "កណ្ដាល" },
    address: { en: "National Road 2, Ta Khmau", km: "ផ្លូវជាតិលេខ ២ តាខ្មៅ" },
    hours: { en: "Mon to Sun · 6:30 to 18:00", km: "ច័ន្ទ–អាទិត្យ · ៦:៣០–១៨:០០" },
    phone: "+855 24 900 160",
    services: ["walk-in", "sweep"],
    pos: { x: 58, y: 70 },
  },
  {
    slug: "poipet",
    name: { en: "Kura Poipet", km: "Kura ប៉ោយប៉ែត" },
    city: { en: "Poipet", km: "ប៉ោយប៉ែត" },
    province: { en: "Banteay Meanchey", km: "បន្ទាយមានជ័យ" },
    address: { en: "National Road 5, Poipet", km: "ផ្លូវជាតិលេខ ៥" },
    hours: { en: "Mon to Sat · 7:00 to 17:00", km: "ច័ន្ទ–សៅរ៍ · ៧:០០–១៧:០០" },
    phone: "+855 54 900 170",
    services: ["walk-in"],
    pos: { x: 26, y: 26 },
  },
  {
    slug: "kep",
    name: { en: "Kura Kep", km: "Kura កែប" },
    city: { en: "Kep", km: "កែប" },
    province: { en: "Kep", km: "កែប" },
    address: { en: "Seaside Road, Kep", km: "ផ្លូវឆ្នេរ កែប" },
    hours: { en: "Mon to Sat · 7:30 to 16:30", km: "ច័ន្ទ–សៅរ៍ · ៧:៣០–១៦:៣០" },
    phone: "+855 36 900 180",
    services: ["walk-in", "home"],
    pos: { x: 54, y: 85 },
  },
];

export const PROVINCES = Array.from(
  new Set(PSCS.map((p) => p.province.en)),
);
