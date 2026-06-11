/* LabHistory row key → order catalog item id.
   Keys follow LabHistory's `"SECTION||Test"` convention (see RAW_CSV there).
   A lab test absent from this table becomes an "unlisted" draft line with no
   price — never silently substituted with a near-miss panel (mapping
   Magnesium → electrolytes-panel would order Na/K/Cl instead: clinically
   wrong). CBC constituents intentionally all map to the single `cbc` item:
   one CBC covers them, so adding any constituent plans the whole group. */

export const LAB_TO_CATALOG: Record<string, string> = {
  "GLYCOSYLATED HAEMOGLOBIN (Roche)||Hb A1c % (DCCT/NGSP)": "hba1c",
  "GLYCOSYLATED HAEMOGLOBIN (Roche)||Hb A1c (acc to IFCC)": "hba1c",
  "BIOCHEMISTRY||Glucose": "fasting-glucose",
  "BIOCHEMISTRY||Creatinine": "creatinine-egfr",
  "BIOCHEMISTRY||Urea Nitrogen (BUN)": "urea-bun",
  "URINE BIOCHEMISTRY (Microalbumin Roche)||Microalbumin/Cre Ratio": "microalbumin",
  "URINE BIOCHEMISTRY (Microalbumin Roche)||Urine Creatinine": "microalbumin",
  "URINE BIOCHEMISTRY (Microalbumin Roche)||Urine Microalbumin": "microalbumin",
  "BIOCHEMISTRY||Phosphorus": "phosphate",
  "BIOCHEMISTRY||Uric Acid": "uric-acid",
  "ELECTROLYTES||Sodium (Na+)": "electrolytes-panel",
  "ELECTROLYTES||Potassium (K+)": "electrolytes-panel",
  "ELECTROLYTES||Chlorures (Cl-)": "electrolytes-panel",
  "CELL BLOOD COUNT||White blood cell": "cbc",
  "CELL BLOOD COUNT||Red blood cell": "cbc",
  "CELL BLOOD COUNT||Haemoglobin": "cbc",
  "CELL BLOOD COUNT||Hematocrit": "cbc",
  "CELL BLOOD COUNT||M.C.V": "cbc",
  "CELL BLOOD COUNT||M.C.H": "cbc",
  "CELL BLOOD COUNT||M.C.H.C": "cbc",
  "CELL BLOOD COUNT||Platelet count": "cbc",
  "DIFFERENTIAL COUNT||Neutrophils": "cbc",
  "DIFFERENTIAL COUNT||Eosinophils": "cbc",
  "DIFFERENTIAL COUNT||Basophils": "cbc",
  "DIFFERENTIAL COUNT||Lymphocytes": "cbc",
  "DIFFERENTIAL COUNT||Monocytes": "cbc",
  "HEMATOLOGY||Erythrocyte Sedimentation Rate 1 hour": "esr",
  "BIOCHEMISTRY||Total Cholesterol": "total-cholesterol",
  "BIOCHEMISTRY||LDL-Cholesterol": "ldl-c",
  "BIOCHEMISTRY||Triglyceride": "triglycerides",
  "BIOCHEMISTRY||Albumin": "albumin",
  "ENZYMOLOGY||AST (Aspartate Aminotrans.)": "ast",
  "ENZYMOLOGY||ALT (Alanine Aminotrans.)": "alt",
  "THYROIDS||TSH (Thyreotrope)": "tsh",
  "URINE BIOCHEMISTRY||Protein": "albumin-creatinine-ratio",
};

export function mapLabKeyToItemId(labKey: string): string | null {
  return LAB_TO_CATALOG[labKey] ?? null;
}
