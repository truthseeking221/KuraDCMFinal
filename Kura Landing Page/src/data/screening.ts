import type { Localized } from "@/i18n/LanguageProvider";
import type { MedIconName } from "@/components/ui/MedIcon";

export type ScreeningCategory = {
  key: string;
  name: Localized;
  icon: MedIconName;
  href: string;
};

/** "Screening by need" — modelled on Diag's category tile grid, adapted to Kura. */
export const SCREENING: ScreeningCategory[] = [
  { key: "general", icon: "general", name: { en: "General health", km: "សុខភាពទូទៅ" }, href: "/packages" },
  { key: "std", icon: "std", name: { en: "STDs", km: "ជំងឺកាមរោគ" }, href: "/tests?category=infectious" },
  { key: "cancer", icon: "cancer", name: { en: "Cancer markers", km: "សញ្ញាមហារីក" }, href: "/tests?category=infectious" },
  { key: "hpv", icon: "hpv", name: { en: "HPV", km: "HPV" }, href: "/tests?category=womens" },
  { key: "nipt", icon: "nipt", name: { en: "Prenatal (NIPT)", km: "មុនពេលសម្រាល" }, href: "/tests?category=womens" },
  { key: "hepatitis", icon: "hepatitis", name: { en: "Hepatitis", km: "រលាកថ្លើម" }, href: "/tests?category=infectious" },
  { key: "vitamin", icon: "vitamin", name: { en: "Vitamins", km: "វីតាមីន" }, href: "/tests?category=nutrition" },
  { key: "allergy", icon: "allergy", name: { en: "Allergy", km: "អាឡែកហ្ស៊ី" }, href: "/tests" },
  { key: "parasite", icon: "parasite", name: { en: "Parasites", km: "ប្រូសិត" }, href: "/tests?category=infectious" },
  { key: "diabetes", icon: "diabetes", name: { en: "Diabetes", km: "ទឹកនោមផ្អែម" }, href: "/tests?category=metabolic" },
  { key: "lipids", icon: "lipids", name: { en: "Cholesterol", km: "ខ្លាញ់ឈាម" }, href: "/tests?category=heart" },
  { key: "heart", icon: "heart", name: { en: "Heart", km: "បេះដូង" }, href: "/tests?category=heart" },
  { key: "liver", icon: "liver", name: { en: "Liver", km: "ថ្លើម" }, href: "/tests?category=organ" },
  { key: "kidney", icon: "kidney", name: { en: "Kidney", km: "តម្រងនោម" }, href: "/tests?category=organ" },
  { key: "thyroid", icon: "thyroid", name: { en: "Thyroid", km: "ក្រពេញទីរ៉ូអ៊ីត" }, href: "/tests?category=thyroid" },
  { key: "blood", icon: "lipids", name: { en: "Blood & anemia", km: "ឈាម" }, href: "/tests?category=blood" },
  { key: "reproductive", icon: "reproductive", name: { en: "Reproductive", km: "សុខភាពបន្តពូជ" }, href: "/tests?category=womens" },
  { key: "amh", icon: "ovary", name: { en: "Ovarian reserve", km: "ស្តុកស៊ុត (AMH)" }, href: "/tests?category=womens" },
  { key: "premarital", icon: "premarital", name: { en: "Pre-marital", km: "មុនរៀបការ" }, href: "/packages" },
  { key: "bone", icon: "bone", name: { en: "Bone health", km: "ឆ្អឹង" }, href: "/tests?category=nutrition" },
  { key: "arthritis", icon: "joint", name: { en: "Arthritis", km: "រលាកសន្លាក់" }, href: "/tests" },
  { key: "food", icon: "food", name: { en: "Food intolerance", km: "មិនទទួលអាហារ" }, href: "/tests?category=nutrition" },
  { key: "gestational", icon: "gestational", name: { en: "Gestational diabetes", km: "ទឹកនោមផ្អែមពេលមានគភ៌" }, href: "/tests?category=metabolic" },
  { key: "preeclampsia", icon: "preeclampsia", name: { en: "Preeclampsia", km: "ការប្រកាច់ពេលមានគភ៌" }, href: "/tests?category=womens" },
  { key: "pregnancy", icon: "pregnancy", name: { en: "Pregnancy", km: "ការមានគភ៌" }, href: "/tests?category=womens" },
  { key: "fever", icon: "fever", name: { en: "Fever workup", km: "ការពិនិត្យគ្រុនក្តៅ" }, href: "/tests?category=infectious" },
  { key: "uti", icon: "uti", name: { en: "Urinary (UTI)", km: "ការឆ្លងផ្លូវទឹកនោម" }, href: "/tests?category=organ" },
  { key: "fitness", icon: "fitness", name: { en: "Fitness", km: "ហ្វីតណេស" }, href: "/tests?category=metabolic" },
  { key: "respiratory", icon: "respiratory", name: { en: "Respiratory", km: "ផ្លូវដង្ហើម" }, href: "/tests?category=infectious" },
  { key: "substance", icon: "substance", name: { en: "Substance screen", km: "សារធាតុញៀន" }, href: "/tests" },
];
