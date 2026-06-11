/* Order catalog — pure data shared by OrdersTab, the order-draft cart, and the
   lab → catalog mapping. No React, no component imports. */

export type OrderCategoryId =
  | "glycemic"
  | "lipids"
  | "renal"
  | "liver"
  | "hematology"
  | "endocrine"
  | "infectious";
export type OrderFilterId = "all" | "bundles" | OrderCategoryId;
export type OrderSpecimenId = "blood" | "urine" | "saliva" | "swab";

export type OrderItem = {
  id: string;
  name: string;
  /* short lab code, searchable (e.g. "HBA1C") */
  code: string;
  categoryId: OrderCategoryId;
  price: number;
  specimens: OrderSpecimenId[];
  /* turnaround time, e.g. "Same-day", "24h" */
  tat: string;
  /* preparation flag shown on the tile and the cart line */
  prep?: string;
  note?: string;
  alert?: string;
  /* temporarily not orderable — tile disabled with the reason */
  unavailable?: { reason: string };
};

export type OrderBundle = {
  id: string;
  name: string;
  price: number;
  tags: string[];
  testCount: number;
  specimenIds: OrderSpecimenId[];
  /* catalog items the bundle covers — drives partial-in-cart hints, the
     planned-state of lab rows, and tube derivation. May list fewer entries
     than testCount when some components aren't individually orderable. */
  memberItemIds: string[];
};

export type SuggestedOrder = {
  id: string;
  title: string;
  description: string;
  tone: "danger" | "warning" | "info";
  targetId: string;
};

export const orderCategories: Array<{ id: OrderCategoryId; label: string }> = [
  { id: "glycemic", label: "Glycemic control" },
  { id: "lipids", label: "Lipids" },
  { id: "renal", label: "Renal function" },
  { id: "liver", label: "Liver function" },
  { id: "hematology", label: "Hematology" },
  { id: "endocrine", label: "Endocrine" },
  { id: "infectious", label: "Infectious" },
];

export const specimenFilters: Array<{ id: OrderSpecimenId; label: string }> = [
  { id: "blood", label: "Blood" },
  { id: "urine", label: "Urine" },
  { id: "saliva", label: "Saliva" },
  { id: "swab", label: "Swab" },
];

export const orderBundles: OrderBundle[] = [
  {
    id: "bundle-diabetes-panel",
    name: "Diabetes panel",
    price: 28,
    tags: ["HbA1c", "glucose", "microalb", "+1"],
    testCount: 4,
    specimenIds: ["blood", "urine"],
    memberItemIds: ["hba1c", "fasting-glucose", "microalbumin", "creatinine-egfr"],
  },
  {
    id: "bundle-cardiac-panel",
    name: "Cardiac panel",
    price: 42,
    tags: ["lipid", "CBC", "troponin", "ECG", "+1"],
    testCount: 5,
    specimenIds: ["blood"],
    /* troponin / ECG aren't individually orderable yet */
    memberItemIds: ["lipid-panel", "cbc"],
  },
];

export const orderItems: OrderItem[] = [
  {
    id: "hba1c",
    name: "HbA1c",
    code: "HBA1C",
    categoryId: "glycemic",
    price: 8,
    specimens: ["blood"],
    tat: "Same-day",
    alert: "Glycemic control - due",
  },
  { id: "fasting-glucose", name: "Fasting glucose", code: "GLUF", categoryId: "glycemic", price: 5, specimens: ["blood"], tat: "Same-day", prep: "Fasting 9–12h" },
  { id: "ogtt", name: "OGTT (gestational)", code: "OGTT", categoryId: "glycemic", price: 18, specimens: ["blood"], tat: "Same-day", prep: "Fasting 9–12h" },
  { id: "insulin", name: "Insulin", code: "INS", categoryId: "glycemic", price: 14, specimens: ["blood"], tat: "24h", prep: "Fasting 9–12h" },
  { id: "c-peptide", name: "C-peptide", code: "CPEP", categoryId: "glycemic", price: 18, specimens: ["blood"], tat: "24h" },
  { id: "fructosamine", name: "Fructosamine", code: "FRUC", categoryId: "glycemic", price: 14, specimens: ["blood"], tat: "24h" },
  { id: "random-glucose", name: "Random glucose", code: "GLUR", categoryId: "glycemic", price: 5, specimens: ["blood"], tat: "Same-day" },
  { id: "postprandial-glucose", name: "2h postprandial", code: "GLUPP", categoryId: "glycemic", price: 5, specimens: ["blood"], tat: "Same-day" },
  { id: "gad-antibodies", name: "GAD antibodies", code: "GAD65", categoryId: "glycemic", price: 24, specimens: ["blood"], tat: "5 days", unavailable: { reason: "Reagents restocking · back 18 Jun" } },
  { id: "lipid-panel", name: "Lipid panel", code: "LIPID", categoryId: "lipids", price: 18, specimens: ["blood"], tat: "Same-day", prep: "Fasting 9–12h", alert: "LDL was 162 mg/dL" },
  { id: "total-cholesterol", name: "Total cholesterol", code: "CHOL", categoryId: "lipids", price: 7, specimens: ["blood"], tat: "Same-day" },
  { id: "ldl-c", name: "LDL-C", code: "LDL", categoryId: "lipids", price: 7, specimens: ["blood"], tat: "Same-day", prep: "Fasting 9–12h" },
  { id: "hdl-c", name: "HDL-C", code: "HDL", categoryId: "lipids", price: 7, specimens: ["blood"], tat: "Same-day" },
  { id: "triglycerides", name: "Triglycerides", code: "TRIG", categoryId: "lipids", price: 7, specimens: ["blood"], tat: "Same-day", prep: "Fasting 9–12h" },
  { id: "apob", name: "Apolipoprotein B", code: "APOB", categoryId: "lipids", price: 16, specimens: ["blood"], tat: "48h" },
  { id: "lpa", name: "Lipoprotein(a)", code: "LPA", categoryId: "lipids", price: 16, specimens: ["blood"], tat: "5 days" },
  { id: "apo-ai", name: "Apo AI", code: "APOA1", categoryId: "lipids", price: 16, specimens: ["blood"], tat: "48h" },
  { id: "vldl", name: "VLDL", code: "VLDL", categoryId: "lipids", price: 8, specimens: ["blood"], tat: "Same-day" },
  { id: "non-hdl", name: "Non-HDL cholesterol", code: "NHDL", categoryId: "lipids", price: 7, specimens: ["blood"], tat: "Same-day" },
  { id: "creatinine-egfr", name: "Creatinine + eGFR", code: "CREA", categoryId: "renal", price: 8, specimens: ["blood"], tat: "Same-day" },
  { id: "urea-bun", name: "Urea (BUN)", code: "BUN", categoryId: "renal", price: 7, specimens: ["blood"], tat: "Same-day" },
  { id: "microalbumin", name: "Microalbumin", code: "MALB", categoryId: "renal", price: 8, specimens: ["urine"], tat: "Same-day", alert: "Early nephropathy" },
  { id: "cystatin-c", name: "Cystatin C", code: "CYSC", categoryId: "renal", price: 22, specimens: ["blood"], tat: "48h" },
  { id: "uric-acid", name: "Uric acid", code: "URIC", categoryId: "renal", price: 7, specimens: ["blood"], tat: "Same-day" },
  { id: "electrolytes-panel", name: "Electrolytes panel", code: "LYTES", categoryId: "renal", price: 13, specimens: ["blood"], tat: "Same-day" },
  { id: "albumin-creatinine-ratio", name: "Albumin/creatinine ratio", code: "ACR", categoryId: "renal", price: 10, specimens: ["urine"], tat: "Same-day" },
  { id: "phosphate", name: "Phosphate", code: "PHOS", categoryId: "renal", price: 7, specimens: ["blood"], tat: "Same-day" },
  { id: "creatinine-clearance", name: "Creatinine clearance", code: "CRCL", categoryId: "renal", price: 16, specimens: ["blood", "urine"], tat: "24h", prep: "24h urine collection" },
  { id: "alt", name: "ALT", code: "ALT", categoryId: "liver", price: 6, specimens: ["blood"], tat: "Same-day" },
  { id: "ast", name: "AST", code: "AST", categoryId: "liver", price: 6, specimens: ["blood"], tat: "Same-day" },
  { id: "alp", name: "ALP", code: "ALP", categoryId: "liver", price: 6, specimens: ["blood"], tat: "Same-day" },
  { id: "ggt", name: "GGT", code: "GGT", categoryId: "liver", price: 8, specimens: ["blood"], tat: "Same-day" },
  { id: "bilirubin-total", name: "Bilirubin total", code: "TBIL", categoryId: "liver", price: 6, specimens: ["blood"], tat: "Same-day" },
  { id: "bilirubin-direct", name: "Bilirubin direct", code: "DBIL", categoryId: "liver", price: 6, specimens: ["blood"], tat: "Same-day" },
  { id: "albumin", name: "Albumin", code: "ALB", categoryId: "liver", price: 6, specimens: ["blood"], tat: "Same-day" },
  { id: "total-protein", name: "Total protein", code: "TP", categoryId: "liver", price: 6, specimens: ["blood"], tat: "Same-day" },
  { id: "pt-inr", name: "PT / INR", code: "PTINR", categoryId: "liver", price: 11, specimens: ["blood"], tat: "Same-day" },
  { id: "cbc", name: "Complete blood count", code: "CBC", categoryId: "hematology", price: 9, specimens: ["blood"], tat: "Same-day" },
  { id: "esr", name: "ESR", code: "ESR", categoryId: "hematology", price: 7, specimens: ["blood"], tat: "Same-day" },
  { id: "ferritin", name: "Ferritin", code: "FERR", categoryId: "hematology", price: 14, specimens: ["blood"], tat: "24h" },
  { id: "iron-panel", name: "Iron panel", code: "IRON", categoryId: "hematology", price: 18, specimens: ["blood"], tat: "24h", prep: "Morning draw preferred" },
  { id: "reticulocyte", name: "Reticulocyte", code: "RETIC", categoryId: "hematology", price: 10, specimens: ["blood"], tat: "Same-day" },
  { id: "vitamin-b12", name: "Vitamin B12", code: "B12", categoryId: "hematology", price: 16, specimens: ["blood"], tat: "24h" },
  { id: "folate", name: "Folate", code: "FOL", categoryId: "hematology", price: 16, specimens: ["blood"], tat: "24h" },
  { id: "transferrin", name: "Transferrin", code: "TRF", categoryId: "hematology", price: 14, specimens: ["blood"], tat: "48h" },
  { id: "haptoglobin", name: "Haptoglobin", code: "HAPT", categoryId: "hematology", price: 18, specimens: ["blood"], tat: "48h" },
  { id: "tsh", name: "TSH", code: "TSH", categoryId: "endocrine", price: 12, specimens: ["blood"], tat: "24h" },
  { id: "free-t4", name: "Free T4", code: "FT4", categoryId: "endocrine", price: 12, specimens: ["blood"], tat: "24h" },
  { id: "free-t3", name: "Free T3", code: "FT3", categoryId: "endocrine", price: 12, specimens: ["blood"], tat: "24h" },
  { id: "cortisol", name: "Cortisol", code: "CORT", categoryId: "endocrine", price: 16, specimens: ["blood", "saliva"], tat: "24h", prep: "8am draw" },
  { id: "vitamin-d", name: "Vitamin D (25-OH)", code: "VITD", categoryId: "endocrine", price: 20, specimens: ["blood"], tat: "48h" },
  { id: "pth", name: "PTH", code: "PTH", categoryId: "endocrine", price: 22, specimens: ["blood"], tat: "48h" },
  { id: "prolactin", name: "Prolactin", code: "PRL", categoryId: "endocrine", price: 14, specimens: ["blood"], tat: "24h" },
  { id: "testosterone", name: "Testosterone", code: "TESTO", categoryId: "endocrine", price: 18, specimens: ["blood"], tat: "24h", prep: "Morning draw preferred" },
  { id: "estradiol", name: "Estradiol", code: "E2", categoryId: "endocrine", price: 18, specimens: ["blood"], tat: "24h" },
  { id: "hbsag", name: "HBsAg", code: "HBSAG", categoryId: "infectious", price: 4, specimens: ["blood"], tat: "24h", note: "Hepatitis B surface antigen · screening" },
  { id: "hiv-4gen", name: "HIV 4th-gen Ag/Ab", code: "HIV4G", categoryId: "infectious", price: 8, specimens: ["blood"], tat: "24h" },
];

export const suggestedOrders: SuggestedOrder[] = [
  {
    id: "suggest-hba1c",
    title: "HbA1c",
    description: "Glycemic control - due",
    tone: "danger",
    targetId: "hba1c",
  },
  {
    id: "suggest-lipid-panel",
    title: "Lipid panel",
    description: "LDL was 162 mg/dL",
    tone: "danger",
    targetId: "lipid-panel",
  },
  {
    id: "suggest-microalbumin",
    title: "Microalbumin",
    description: "Early nephropathy",
    tone: "danger",
    targetId: "microalbumin",
  },
];

export const orderItemById = new Map(orderItems.map((item) => [item.id, item]));
export const orderBundleById = new Map(orderBundles.map((bundle) => [bundle.id, bundle]));

export function resolveOrderable(id: string):
  | { kind: "test"; name: string; price: number }
  | { kind: "bundle"; name: string; price: number; tags: string[] }
  | null {
  const item = orderItemById.get(id);
  if (item) return { kind: "test", name: item.name, price: item.price };
  const bundle = orderBundleById.get(id);
  if (bundle) return { kind: "bundle", name: bundle.name, price: bundle.price, tags: bundle.tags };
  return null;
}

/* Demo exchange rate, USD → KHR */
export const KHR_RATE = 4100;

export function formatMoney(value: number) {
  return `$${value.toFixed(2)}`;
}

export function formatKhr(usd: number) {
  return `៛${Math.round(usd * KHR_RATE).toLocaleString("en-US")}`;
}
