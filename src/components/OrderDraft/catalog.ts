/* Order catalog — pure data shared by OrdersTab, the order-draft cart, and the
   lab → catalog mapping. No React, no component imports. */

import { deltaLabFacts } from "@/data/deltaLabResults";

export type OrderCategoryId =
  | "glycemic"
  | "lipids"
  | "renal"
  | "liver"
  | "hematology"
  | "cardiac"
  | "thyroid"
  | "endocrine"
  | "vitamins"
  | "hormones"
  | "infectious"
  | "tumorMarkers";
export type OrderFilterId = "all" | "bundles" | OrderCategoryId;
export type OrderSpecimenId = "blood" | "urine" | "saliva" | "swab";

export type OrderReferenceRange = {
  us: string;
  si: string;
};

export type OrderItem = {
  id: string;
  name: string;
  /* short lab code, searchable (e.g. "HBA1C") */
  code: string;
  /* long clinical name, e.g. "Glycated haemoglobin (A1c)" — detail popover only */
  fullName?: string;
  categoryId: OrderCategoryId;
  price: number;
  specimens: OrderSpecimenId[];
  /* turnaround time, e.g. "Same-day", "24h" */
  tat: string;
  /* preparation flag shown on the tile and the cart line */
  prep?: string;
  sample?: string;
  /* pre-analytics + analytical detail (detail popover only; all optional so
     rows render only when a test carries the data) */
  container?: string;
  volume?: string;
  stability?: string;
  transport?: string;
  method?: string;
  analyzer?: string;
  /* component analytes when this orderable IS a panel (a group), not a single
     analyte — drives the "Panel" marker in the catalog and the "Includes" list
     in the detail popover. Single analytes leave this undefined. */
  analytes?: string[];
  /* optional grouping for larger panels so the hover card can show every
     constituent without turning one long list into a wall of text. */
  analyteGroups?: Array<{ label: string; analytes: string[] }>;
  popular?: boolean;
  description?: string;
  indications?: string[];
  referenceRange?: OrderReferenceRange;
  note?: string;
  alert?: string;
  /* insurer position for the demo patient's plan (Forte). Undefined = covered
     at the standard 80% — only exceptions are annotated. */
  coverage?: "not-covered" | "unconfirmed";
  /* temporarily not orderable — tile disabled with the reason */
  unavailable?: { reason: string };
};

export const COVERAGE_LABEL: Record<"covered" | "not-covered" | "unconfirmed", string> = {
  covered: "Forte 80%",
  "not-covered": "Not covered",
  unconfirmed: "Coverage unconfirmed",
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
  { id: "cardiac", label: "Cardiac" },
  { id: "thyroid", label: "Thyroid" },
  { id: "endocrine", label: "Endocrine" },
  { id: "vitamins", label: "Vitamins" },
  { id: "hormones", label: "Hormones" },
  { id: "infectious", label: "Infectious" },
  { id: "tumorMarkers", label: "Tumor markers" },
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
    memberItemIds: ["lipid-panel", "cbc", "troponin-i", "nt-probnp", "hs-crp"],
  },
  {
    id: "bundle-renal-panel",
    name: "Renal panel",
    price: 48,
    tags: ["creatinine", "BUN", "microalb", "+2"],
    testCount: 5,
    specimenIds: ["blood", "urine"],
    memberItemIds: ["creatinine-egfr", "urea-bun", "microalbumin", "cystatin-c", "albumin-creatinine-ratio"],
  },
  {
    id: "bundle-metabolic-panel",
    name: "Metabolic panel",
    price: 34,
    tags: ["glucose", "electrolytes", "albumin", "+1"],
    testCount: 4,
    specimenIds: ["blood"],
    memberItemIds: ["fasting-glucose", "electrolytes-panel", "albumin", "total-protein"],
  },
];

export const orderItems: OrderItem[] = [
  {
    id: "hba1c",
    name: "HbA1c",
    code: "HBA1C",
    fullName: "Glycated haemoglobin (A1c)",
    categoryId: "glycemic",
    price: 8,
    specimens: ["blood"],
    tat: "Same-day",
    sample: "Whole blood",
    container: "EDTA tube (purple)",
    volume: "3 mL",
    prep: "No fasting",
    stability: "7 d at 2–8°C · 3 d room temp",
    transport: "Refrigerated 2–8°C",
    method: "HPLC (ion-exchange)",
    analyzer: "Tosoh HLC-723 G11",
    popular: true,
    description: "Three-month glycemic exposure for diabetes diagnosis and monitoring.",
    indications: ["Diabetes follow-up", "Therapy titration", "Pre-op risk review"],
    referenceRange: { us: "<5.7% normal · <7.0% common diabetes goal", si: "<39 mmol/mol normal · <53 mmol/mol common diabetes goal" },
    alert: `${deltaLabFacts.hba1c.value} · ${deltaLabFacts.hba1c.repeatStatus}`,
  },
  { id: "fasting-glucose", name: "Fasting glucose", code: "GLUF", categoryId: "glycemic", price: 5, specimens: ["blood"], tat: "Same-day", prep: "Fasting 9–12h", sample: "Serum/plasma", popular: true, description: "Point-in-time fasting glucose for diagnosis and medication adjustment.", referenceRange: { us: "70–99 mg/dL", si: "3.9–5.5 mmol/L" } },
  { id: "ogtt", name: "OGTT (gestational)", code: "OGTT", categoryId: "glycemic", price: 18, specimens: ["blood"], tat: "Same-day", prep: "Fasting 9–12h", coverage: "not-covered" },
  { id: "insulin", name: "Insulin", code: "INS", categoryId: "glycemic", price: 14, specimens: ["blood"], tat: "24h", prep: "Fasting 9–12h" },
  { id: "c-peptide", name: "C-peptide", code: "CPEP", categoryId: "glycemic", price: 18, specimens: ["blood"], tat: "24h" },
  { id: "fructosamine", name: "Fructosamine", code: "FRUC", categoryId: "glycemic", price: 14, specimens: ["blood"], tat: "24h", coverage: "unconfirmed" },
  { id: "random-glucose", name: "Random glucose", code: "GLUR", categoryId: "glycemic", price: 5, specimens: ["blood"], tat: "Same-day" },
  { id: "postprandial-glucose", name: "2h postprandial", code: "GLUPP", categoryId: "glycemic", price: 5, specimens: ["blood"], tat: "Same-day" },
  { id: "gad-antibodies", name: "GAD antibodies", code: "GAD65", categoryId: "glycemic", price: 24, specimens: ["blood"], tat: "5 days", unavailable: { reason: "Reagents restocking · back 18 Jun" }, coverage: "not-covered" },
  { id: "lipid-panel", name: "Lipid panel", code: "LIPID", analytes: ["Total cholesterol", "LDL-C", "HDL-C", "Triglycerides"], categoryId: "lipids", price: 18, specimens: ["blood"], tat: "Same-day", prep: "Fasting 9–12h", sample: "Serum", popular: true, description: "Cholesterol fractions for ASCVD risk review and statin follow-up.", indications: ["Diabetes annual review", "Hypertension risk review", "Medication monitoring"], referenceRange: { us: "LDL goal often <100 mg/dL", si: "LDL goal often <2.6 mmol/L" }, alert: deltaLabFacts.ldl.summary },
  { id: "total-cholesterol", name: "Total cholesterol", code: "CHOL", categoryId: "lipids", price: 7, specimens: ["blood"], tat: "Same-day" },
  { id: "ldl-c", name: "LDL-C", code: "LDL", categoryId: "lipids", price: 7, specimens: ["blood"], tat: "Same-day", prep: "Fasting 9–12h" },
  { id: "hdl-c", name: "HDL-C", code: "HDL", categoryId: "lipids", price: 7, specimens: ["blood"], tat: "Same-day" },
  { id: "triglycerides", name: "Triglycerides", code: "TRIG", categoryId: "lipids", price: 7, specimens: ["blood"], tat: "Same-day", prep: "Fasting 9–12h" },
  { id: "apob", name: "Apolipoprotein B", code: "APOB", categoryId: "lipids", price: 16, specimens: ["blood"], tat: "48h", coverage: "not-covered" },
  { id: "lpa", name: "Lipoprotein(a)", code: "LPA", categoryId: "lipids", price: 16, specimens: ["blood"], tat: "5 days", coverage: "not-covered" },
  { id: "apo-ai", name: "Apo AI", code: "APOA1", categoryId: "lipids", price: 16, specimens: ["blood"], tat: "48h", coverage: "not-covered" },
  { id: "vldl", name: "VLDL", code: "VLDL", categoryId: "lipids", price: 8, specimens: ["blood"], tat: "Same-day" },
  { id: "non-hdl", name: "Non-HDL cholesterol", code: "NHDL", categoryId: "lipids", price: 7, specimens: ["blood"], tat: "Same-day" },
  { id: "creatinine-egfr", name: "Creatinine + eGFR", code: "CREA", analytes: ["Creatinine", "eGFR"], categoryId: "renal", price: 8, specimens: ["blood"], tat: "Same-day", sample: "Serum", popular: true, description: "Kidney filtration estimate for CKD staging and renal dose decisions.", indications: ["CKD monitoring", "Drug dose adjustment", "Hypertension review"], referenceRange: { us: "Creatinine 0.6–1.3 mg/dL · eGFR >=60", si: "Creatinine 53–115 µmol/L · eGFR >=60" } },
  { id: "urea-bun", name: "Urea (BUN)", code: "BUN", categoryId: "renal", price: 7, specimens: ["blood"], tat: "Same-day" },
  { id: "microalbumin", name: "Microalbumin", code: "MALB", categoryId: "renal", price: 8, specimens: ["urine"], tat: "Same-day", sample: "Spot urine", popular: true, description: "Albuminuria surveillance for diabetes and CKD risk.", referenceRange: { us: "<30 mg/g", si: "<3 mg/mmol" }, alert: deltaLabFacts.microalbuminCreatinineRatio.summary },
  { id: "cystatin-c", name: "Cystatin C", code: "CYSC", categoryId: "renal", price: 22, specimens: ["blood"], tat: "48h", coverage: "unconfirmed" },
  { id: "uric-acid", name: "Uric acid", code: "URIC", categoryId: "renal", price: 7, specimens: ["blood"], tat: "Same-day" },
  { id: "electrolytes-panel", name: "Electrolytes panel", code: "LYTES", analytes: ["Sodium", "Potassium", "Chloride", "Bicarbonate"], categoryId: "renal", price: 13, specimens: ["blood"], tat: "Same-day" },
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
  {
    id: "cbc",
    name: "Complete blood count",
    code: "CBC",
    analytes: [
      "White Blood Cell Count",
      "Neutrophils (%)",
      "Lymphocytes (%)",
      "Monocytes (%)",
      "Eosinophils (%)",
      "Basophils (%)",
      "Immature Granulocytes (%)",
      "Nucleated RBC (%)",
      "Neutrophils (Absolute)",
      "Lymphocytes (Absolute)",
      "Monocytes (Absolute)",
      "Eosinophils (Absolute)",
      "Basophils (Absolute)",
      "Immature Granulocytes (Absolute)",
      "Nucleated RBC (Absolute)",
      "Red Blood Cell Count",
      "Hemoglobin",
      "Hematocrit",
      "Mean Cell Volume",
      "Mean Cell Hemoglobin",
      "Mean Cell Hb Concentration",
      "Red Cell Distribution Width (CV)",
      "Red Cell Distribution Width (SD)",
      "Platelet Count",
      "Mean Platelet Volume",
      "Platelet Distribution Width",
      "Plateletcrit",
    ],
    analyteGroups: [
      { label: "White cells", analytes: ["White Blood Cell Count"] },
      {
        label: "Differential %",
        analytes: [
          "Neutrophils (%)",
          "Lymphocytes (%)",
          "Monocytes (%)",
          "Eosinophils (%)",
          "Basophils (%)",
          "Immature Granulocytes (%)",
          "Nucleated RBC (%)",
        ],
      },
      {
        label: "Differential absolute",
        analytes: [
          "Neutrophils (Absolute)",
          "Lymphocytes (Absolute)",
          "Monocytes (Absolute)",
          "Eosinophils (Absolute)",
          "Basophils (Absolute)",
          "Immature Granulocytes (Absolute)",
          "Nucleated RBC (Absolute)",
        ],
      },
      {
        label: "Red cells",
        analytes: [
          "Red Blood Cell Count",
          "Hemoglobin",
          "Hematocrit",
          "Mean Cell Volume",
          "Mean Cell Hemoglobin",
          "Mean Cell Hb Concentration",
          "Red Cell Distribution Width (CV)",
          "Red Cell Distribution Width (SD)",
        ],
      },
      {
        label: "Platelets",
        analytes: ["Platelet Count", "Mean Platelet Volume", "Platelet Distribution Width", "Plateletcrit"],
      },
    ],
    categoryId: "hematology",
    price: 9,
    specimens: ["blood"],
    tat: "Same-day",
    sample: "EDTA whole blood",
    container: "EDTA tube (purple)",
    volume: "3 mL",
    stability: "24h room temp · 48h at 2-8°C for most indices",
    transport: "Room temp or refrigerated 2-8°C",
    method: "Automated impedance / flow cytometry",
    popular: true,
    description: "Hemoglobin, platelets, and white-cell indices for anemia/infection review.",
    referenceRange: { us: "Hgb F 12-16 g/dL · M 13.5-17.5 g/dL", si: "Hgb F 120-160 g/L · M 135-175 g/L" },
  },
  { id: "esr", name: "ESR", code: "ESR", categoryId: "hematology", price: 7, specimens: ["blood"], tat: "Same-day" },
  { id: "ferritin", name: "Ferritin", code: "FERR", categoryId: "hematology", price: 14, specimens: ["blood"], tat: "24h" },
  { id: "iron-panel", name: "Iron panel", code: "IRON", analytes: ["Serum iron", "TIBC", "Transferrin saturation", "Ferritin"], categoryId: "hematology", price: 18, specimens: ["blood"], tat: "24h", prep: "Morning draw preferred" },
  { id: "reticulocyte", name: "Reticulocyte", code: "RETIC", categoryId: "hematology", price: 10, specimens: ["blood"], tat: "Same-day" },
  { id: "vitamin-b12", name: "Vitamin B12", code: "B12", categoryId: "vitamins", price: 16, specimens: ["blood"], tat: "24h", sample: "Serum", description: "B12 status for anemia, neuropathy, and metformin monitoring.", referenceRange: { us: "200–900 pg/mL", si: "148–664 pmol/L" } },
  { id: "folate", name: "Folate", code: "FOL", categoryId: "vitamins", price: 16, specimens: ["blood"], tat: "24h", sample: "Serum", referenceRange: { us: ">4 ng/mL", si: ">9 nmol/L" } },
  { id: "transferrin", name: "Transferrin", code: "TRF", categoryId: "hematology", price: 14, specimens: ["blood"], tat: "48h", coverage: "unconfirmed" },
  { id: "haptoglobin", name: "Haptoglobin", code: "HAPT", categoryId: "hematology", price: 18, specimens: ["blood"], tat: "48h", coverage: "unconfirmed" },
  { id: "tsh", name: "TSH", code: "TSH", categoryId: "thyroid", price: 12, specimens: ["blood"], tat: "24h", sample: "Serum", popular: true, description: "First-line thyroid function screen and treatment monitoring.", referenceRange: { us: "0.4–4.0 mIU/L", si: "0.4–4.0 mIU/L" } },
  { id: "free-t4", name: "Free T4", code: "FT4", categoryId: "thyroid", price: 12, specimens: ["blood"], tat: "24h", sample: "Serum", referenceRange: { us: "0.8–1.8 ng/dL", si: "10–23 pmol/L" } },
  { id: "free-t3", name: "Free T3", code: "FT3", categoryId: "thyroid", price: 12, specimens: ["blood"], tat: "24h", sample: "Serum", referenceRange: { us: "2.3–4.2 pg/mL", si: "3.5–6.5 pmol/L" } },
  { id: "cortisol", name: "Cortisol", code: "CORT", categoryId: "hormones", price: 16, specimens: ["blood", "saliva"], tat: "24h", prep: "8am draw", sample: "Serum or saliva", coverage: "unconfirmed" },
  { id: "vitamin-d", name: "Vitamin D (25-OH)", code: "VITD", categoryId: "vitamins", price: 20, specimens: ["blood"], tat: "48h", sample: "Serum", popular: true, description: "Vitamin D status for bone health and deficiency follow-up.", referenceRange: { us: "30–100 ng/mL", si: "75–250 nmol/L" } },
  { id: "pth", name: "PTH", code: "PTH", categoryId: "endocrine", price: 22, specimens: ["blood"], tat: "48h", coverage: "unconfirmed" },
  { id: "prolactin", name: "Prolactin", code: "PRL", categoryId: "hormones", price: 14, specimens: ["blood"], tat: "24h", coverage: "unconfirmed" },
  { id: "testosterone", name: "Testosterone", code: "TESTO", categoryId: "hormones", price: 18, specimens: ["blood"], tat: "24h", prep: "Morning draw preferred", coverage: "unconfirmed" },
  { id: "estradiol", name: "Estradiol", code: "E2", categoryId: "hormones", price: 18, specimens: ["blood"], tat: "24h", coverage: "unconfirmed" },
  { id: "troponin-i", name: "Troponin I", code: "TROP", categoryId: "cardiac", price: 20, specimens: ["blood"], tat: "Same-day", sample: "Serum/plasma", popular: true, description: "Cardiac injury marker for urgent chest-pain evaluation.", referenceRange: { us: "<0.04 ng/mL", si: "<40 ng/L" }, coverage: "unconfirmed" },
  { id: "nt-probnp", name: "NT-proBNP", code: "BNP", categoryId: "cardiac", price: 22, specimens: ["blood"], tat: "24h", sample: "Serum/plasma", description: "Heart-failure congestion marker for dyspnea and follow-up.", referenceRange: { us: "Age-dependent; often <125 pg/mL outpatient", si: "Age-dependent; often <125 ng/L outpatient" }, coverage: "unconfirmed" },
  { id: "hs-crp", name: "hs-CRP", code: "HSCRP", categoryId: "cardiac", price: 12, specimens: ["blood"], tat: "24h", sample: "Serum", referenceRange: { us: "<1 mg/L low CV risk", si: "<1 mg/L low CV risk" } },
  { id: "hbsag", name: "HBsAg", code: "HBSAG", categoryId: "infectious", price: 4, specimens: ["blood"], tat: "24h", sample: "Serum", note: "Hepatitis B surface antigen · screening", referenceRange: { us: "Non-reactive", si: "Non-reactive" } },
  { id: "hiv-4gen", name: "HIV 4th-gen Ag/Ab", code: "HIV4G", categoryId: "infectious", price: 8, specimens: ["blood"], tat: "24h", sample: "Serum", referenceRange: { us: "Non-reactive", si: "Non-reactive" } },
  { id: "hcv-ab", name: "HCV antibody", code: "HCVAB", categoryId: "infectious", price: 8, specimens: ["blood"], tat: "24h", sample: "Serum", referenceRange: { us: "Non-reactive", si: "Non-reactive" } },
  { id: "rpr", name: "Syphilis RPR", code: "RPR", categoryId: "infectious", price: 7, specimens: ["blood"], tat: "24h", sample: "Serum", referenceRange: { us: "Non-reactive", si: "Non-reactive" } },
  { id: "psa", name: "PSA", code: "PSA", categoryId: "tumorMarkers", price: 18, specimens: ["blood"], tat: "48h", sample: "Serum", referenceRange: { us: "<4.0 ng/mL", si: "<4.0 µg/L" }, coverage: "unconfirmed" },
  { id: "cea", name: "CEA", code: "CEA", categoryId: "tumorMarkers", price: 20, specimens: ["blood"], tat: "48h", sample: "Serum", referenceRange: { us: "<3 ng/mL non-smoker", si: "<3 µg/L non-smoker" }, coverage: "unconfirmed" },
  { id: "afp", name: "AFP", code: "AFP", categoryId: "tumorMarkers", price: 18, specimens: ["blood"], tat: "48h", sample: "Serum", referenceRange: { us: "<10 ng/mL", si: "<10 µg/L" }, coverage: "unconfirmed" },
  { id: "ca-125", name: "CA-125", code: "CA125", categoryId: "tumorMarkers", price: 24, specimens: ["blood"], tat: "48h", sample: "Serum", referenceRange: { us: "<35 U/mL", si: "<35 kU/L" }, coverage: "unconfirmed" },
];

/* descriptions stay tile-short — live lab context overrides where available */
export const suggestedOrders: SuggestedOrder[] = [
  {
    id: "suggest-hba1c",
    title: "HbA1c",
    description: `No repeat since ${deltaLabFacts.hba1c.shortDate}`,
    tone: "danger",
    targetId: "hba1c",
  },
  {
    id: "suggest-lipid-panel",
    title: "Lipid panel",
    description: `LDL in range · ${deltaLabFacts.ldl.shortDate}`,
    tone: "info",
    targetId: "lipid-panel",
  },
  {
    id: "suggest-microalbumin",
    title: "Microalbumin",
    description: `${deltaLabFacts.microalbuminCreatinineRatio.value} · above range`,
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
