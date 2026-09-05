import type { DetectedDocType } from "./types";

/**
 * Pre-defined sample file templates for instant demo testing
 * Pure client-safe data with zero Node runtime dependencies
 */
export const SAMPLE_DOCUMENTS_FOR_DEMO = [
  {
    name: "CBC_August_2026.pdf",
    type: "CBC" as DetectedDocType,
    description: "Follow-up Complete Blood Count (August 2026). Triggers comparison with January 2026 CBC!",
    date: "2026-08-18",
    rawContent: `METROPOLITAN CLINICAL LABORATORIES
Patient: Eleanor Vance | DOB: 14-Apr-1992 | Sex: F
Ref Physician: Dr. Marcus Reed, MD
Specimen Date: 18-Aug-2026 09:15 AM
Test: COMPLETE BLOOD COUNT (CBC) WITH AUTOMATED DIFFERENTIAL

TEST NAME                 RESULT    UNIT        REFERENCE INTERVAL    STATUS
Hemoglobin                12.4      g/dL        12.0 - 16.0           NORMAL
Hematocrit                38.5      %           36.0 - 46.0           NORMAL
Red Blood Cells (RBC)     4.35      x10^6/uL    4.00 - 5.20           NORMAL
White Blood Cells (WBC)   7.1       x10^3/uL    4.5 - 11.0            NORMAL
Platelet Count            260       x10^3/uL    150 - 450             NORMAL
Mean Corpuscular Vol(MCV) 86.0      fL          80.0 - 100.0          NORMAL

Technician Notes: Normal erythrocyte morphology. Specimen integrity verified. Repeat CBC complete.`
  },
  {
    name: "Lipid_Profile_July_2026.pdf",
    type: "Lipid Profile" as DetectedDocType,
    description: "Cardiometabolic screening lipid panel with printed source ranges.",
    date: "2026-07-20",
    rawContent: `VALLEY ENDOCRINE & DIAGNOSTIC CENTER
Patient: Eleanor Vance | Age: 34 | Gender: Female
Ordering Clinic: St. Jude Community Health
Report Date: 20-Jul-2026

LIPID FRACTIONATION PANEL
Total Cholesterol         184       mg/dL       100 - 199             NORMAL
Triglycerides             135       mg/dL       0 - 149               NORMAL
HDL Cholesterol           58        mg/dL       50 - 90               NORMAL
LDL Cholesterol (Calc)    99        mg/dL       0 - 99                NORMAL

Clinical Note: Fasting state verified (12h).`
  }
];
