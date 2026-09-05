import fs from "fs";
import path from "path";
import { calculateAge } from "./utils";
import type {
  User,
  PatientProfile,
  Symptom,
  Condition,
  Allergy,
  Medication,
  MedicalDocument,
  LabStatus,
  LabResult,
  VerificationItem,
  Conflict,
  TimelineEvent,
  ShareSession,
  AuditLog,
  DatabaseSchema,
} from "./types";

// Re-export types and utilities for server-side consumers
export type {
  User,
  PatientProfile,
  Symptom,
  Condition,
  Allergy,
  Medication,
  MedicalDocument,
  LabStatus,
  LabResult,
  VerificationItem,
  Conflict,
  TimelineEvent,
  ShareSession,
  AuditLog,
  DatabaseSchema,
};
export { calculateAge };


const DATA_FILE = path.join(process.cwd(), ".medlens_data.json");

function getInitialData(): DatabaseSchema {
  const now = new Date().toISOString();

  // 1. ISOLATED DEMO PATIENT: Eleanor Vance (Available only under "Try Demo")
  const demoUserId = "usr_demo_eleanor";
  const demoPatientId = "pat_demo_eleanor";

  const demoUser: User = {
    id: demoUserId,
    email: "eleanor.vance@example.org",
    name: "Eleanor Vance",
    passwordHash: "demo_hash_eleanor2026",
    createdAt: "2026-01-05T09:00:00Z",
  };

  const demoProfile: PatientProfile = {
    id: demoPatientId,
    userId: demoUserId,
    fullName: "Eleanor Vance",
    dob: "1992-04-14",
    sex: "Female",
    phone: "+1 (555) 234-8901",
    emergencyContact: "Thomas Vance (Spouse) - +1 (555) 234-8902",
    isPrivacyMode: false,
    notes: "Patient managing mild fatigue and metabolic monitoring. Consistent compliance with lab schedule.",
    isOnboarded: true,
    isDemo: true,
  };

  // Demo Symptoms
  const demoSymptoms: Symptom[] = [
    {
      id: "sym_demo_1",
      patientId: demoPatientId,
      symptom: "Mild post-exertional fatigue",
      onset: "2025-11-10",
      duration: "3 months intermittent",
      notes: "Worse in the late afternoons, improves after adequate sleep.",
      source: "user_input",
      verified: true,
    },
    {
      id: "sym_demo_2",
      patientId: demoPatientId,
      symptom: "Occasional cold intolerance",
      onset: "2026-02-01",
      duration: "4 weeks",
      notes: "Noted hands and feet feeling cold during office hours.",
      source: "user_input",
      verified: true,
    },
  ];

  // Demo Conditions
  const demoConditions: Condition[] = [
    {
      id: "cnd_demo_1",
      patientId: demoPatientId,
      condition: "Subclinical Hypothyroidism monitoring",
      diagnosedDate: "2026-03-12",
      status: "active",
      source: "user_input",
      verified: true,
    },
    {
      id: "cnd_demo_2",
      patientId: demoPatientId,
      condition: "Iron deficiency anemia (managed)",
      diagnosedDate: "2026-01-18",
      status: "managed",
      source: "user_input",
      verified: true,
    },
  ];

  // Demo Allergies
  const demoAllergies: Allergy[] = [
    {
      id: "alg_demo_1",
      patientId: demoPatientId,
      allergen: "No known drug allergies (Patient stated)",
      reaction: "None reported by patient at onboarding",
      status: "no_known",
      source: "user_input",
      verified: false,
    },
  ];

  // Demo Documents
  const doc1Id = "doc_cbc_jan2026";
  const doc2Id = "doc_thyroid_mar2026";
  const doc3Id = "doc_rx_apr2026";
  const doc4Id = "doc_vitamind_may2026";

  const demoDocuments: MedicalDocument[] = [
    {
      id: doc1Id,
      patientId: demoPatientId,
      filename: "CBC_January_2026.pdf",
      fileType: "application/pdf",
      docType: "CBC",
      reportDate: "2026-01-15",
      uploadedAt: "2026-01-16T10:15:00Z",
      contentHash: "a1b2c3d4e5f601010101010101010101",
      classificationConfidence: 99,
      fileUrl: "/sample-reports/CBC_January_2026.pdf",
      summary: "Complete blood count showing Hemoglobin and Hematocrit below report's reference ranges. Platelets and WBC count within limits.",
      rawText: `METROPOLITAN CLINICAL LABORATORIES\nPatient: Eleanor Vance | DOB: 14-Apr-1992 | Sex: F\nRef Physician: Dr. Marcus Reed, MD\nSpecimen Date: 15-Jan-2026 08:30 AM\nTest: COMPLETE BLOOD COUNT (CBC) WITH AUTOMATED DIFFERENTIAL\n\nTEST NAME                 RESULT    UNIT        REFERENCE INTERVAL    STATUS\nHemoglobin                10.8      g/dL        12.0 - 16.0           LOW\nHematocrit                33.2      %           36.0 - 46.0           LOW\nRed Blood Cells (RBC)     4.10      x10^6/uL    4.00 - 5.20           NORMAL\nWhite Blood Cells (WBC)   6.8       x10^3/uL    4.5 - 11.0            NORMAL\nPlatelet Count            240       x10^3/uL    150 - 450             NORMAL\nMean Corpuscular Vol(MCV) 81.0      fL          80.0 - 100.0          NORMAL\n\nTechnician Notes: Mild microcytic tendency noted. Specimen integrity verified.`
    },
    {
      id: doc2Id,
      patientId: demoPatientId,
      filename: "Thyroid_Panel_March_2026.pdf",
      fileType: "application/pdf",
      docType: "Thyroid Profile",
      reportDate: "2026-03-10",
      uploadedAt: "2026-03-11T14:30:00Z",
      contentHash: "b2c3d4e5f60202020202020202020202",
      classificationConfidence: 98,
      fileUrl: "/sample-reports/Thyroid_Panel_March_2026.pdf",
      summary: "Thyroid evaluation report. TSH is elevated above the laboratory's printed reference range. Free T4 is within printed limits.",
      rawText: `VALLEY ENDOCRINE & DIAGNOSTIC CENTER\nPatient: Eleanor Vance | Age: 33 | Gender: Female\nOrdering Clinic: St. Jude Community Health\nReport Date: 10-Mar-2026\n\nTHYROID COMPREHENSIVE PANEL\nTest                      Result    Unit        Reference Range       Flag\nThyroid Stimulating Horm  5.40      uIU/mL      0.40 - 4.50           HIGH\nFree Thyroxine (FT4)      1.05      ng/dL       0.80 - 1.80           NORMAL\nTotal Triiodothyronine(T3)115       ng/dL       80 - 200              NORMAL\n\nClinical Note: Repeat TSH recommended in 12 weeks for longitudinal trend confirmation.`
    },
    {
      id: doc3Id,
      patientId: demoPatientId,
      filename: "Prescription_Clinic_Apr2026.pdf",
      fileType: "application/pdf",
      docType: "Prescription",
      reportDate: "2026-04-22",
      uploadedAt: "2026-04-23T11:00:00Z",
      contentHash: "c3d4e5f6030303030303030303030303",
      classificationConfidence: 96,
      fileUrl: "/sample-reports/Prescription_Clinic_Apr2026.pdf",
      summary: "Outpatient clinical prescription specifying Metformin with dietary instructions. Contains reference to continuing previous vitamin supplementation.",
      rawText: `DR. MARCUS REED, MD - INTERNAL MEDICINE\nLic: MD-982341 | St. Jude Medical Plaza\nDate: 22-Apr-2026\nPatient: Eleanor Vance\n\nRx:\n1. Metformin HCl 500 mg oral tablet\n   Sig: 1 tablet twice daily with meals.\n   Qty: 60 tablets. Refills: 2.\n   Indication: Glycemic support.\n\nInstructions & Context:\n- Hydrate well.\n- Continue previous medication and vitamin supplementation as directed previously.\n- Lab follow-up in 90 days.`
    },
    {
      id: doc4Id,
      patientId: demoPatientId,
      filename: "VitaminD_Specialty_May2026.pdf",
      fileType: "application/pdf",
      docType: "General Laboratory Report",
      reportDate: "2026-05-05",
      uploadedAt: "2026-05-06T16:20:00Z",
      contentHash: "d4e5f604040404040404040404040404",
      classificationConfidence: 94,
      fileUrl: "/sample-reports/VitaminD_Specialty_May2026.pdf",
      summary: "Specialty metabolic investigation for 25-Hydroxy Vitamin D. No reference range provided by the testing laboratory in the source document.",
      rawText: `BIO-ANALYTICS REGIONAL TESTING SERVICE\nSpecimen: Serum | Collection Date: 05-May-2026\nPatient: Eleanor Vance | Ref: Clinic ID 49102\n\nINVESTIGATION: 25-HYDROXY VITAMIN D (TOTAL)\nMethod: Chemiluminescent Microparticle Immunoassay (CMIA)\nRESULT: 18.0 ng/mL\n\n* LABORATORY ADVISORY NOTE:\nInstitutional reference interval calibration pending. Consult clinical guidance for population-specific thresholds. Reference range omitted on this release copy.`
    },
  ];

  // Demo Lab Results
  const demoLabResults: LabResult[] = [
    {
      id: "lab_demo_1",
      documentId: doc1Id,
      patientId: demoPatientId,
      testName: "Hemoglobin",
      value: 10.8,
      unit: "g/dL",
      refRangeLow: 12.0,
      refRangeHigh: 16.0,
      refRangeText: "12.0 - 16.0 g/dL",
      status: "low",
      statusExplanation: "Reported value 10.8 g/dL is below the printed range of 12.0 - 16.0 g/dL.",
      observation: "Microcytic tendency noted",
      confidence: 98,
      verificationState: "confirmed",
      rawSnippet: "Hemoglobin 10.8 g/dL 12.0 - 16.0 LOW",
      reportDate: "2026-01-15",
      sourceDocumentName: "CBC_January_2026.pdf",
      verifiedByUser: true,
    },
    {
      id: "lab_demo_2",
      documentId: doc1Id,
      patientId: demoPatientId,
      testName: "Hematocrit",
      value: 33.2,
      unit: "%",
      refRangeLow: 36.0,
      refRangeHigh: 46.0,
      refRangeText: "36.0 - 46.0 %",
      status: "low",
      statusExplanation: "Reported value 33.2% is below the printed range of 36.0 - 46.0%.",
      confidence: 97,
      verificationState: "confirmed",
      rawSnippet: "Hematocrit 33.2 % 36.0 - 46.0 LOW",
      reportDate: "2026-01-15",
      sourceDocumentName: "CBC_January_2026.pdf",
      verifiedByUser: true,
    },
    {
      id: "lab_demo_3",
      documentId: doc1Id,
      patientId: demoPatientId,
      testName: "Platelet Count",
      value: 240,
      unit: "x10^3/uL",
      refRangeLow: 150,
      refRangeHigh: 450,
      refRangeText: "150 - 450 x10^3/uL",
      status: "normal",
      statusExplanation: "Reported value 240 x10^3/uL falls within printed range of 150 - 450 x10^3/uL.",
      confidence: 99,
      verificationState: "confirmed",
      rawSnippet: "Platelet Count 240 x10^3/uL 150 - 450 NORMAL",
      reportDate: "2026-01-15",
      sourceDocumentName: "CBC_January_2026.pdf",
      verifiedByUser: true,
    },
    {
      id: "lab_demo_4",
      documentId: doc1Id,
      patientId: demoPatientId,
      testName: "White Blood Cells (WBC)",
      value: 6.8,
      unit: "x10^3/uL",
      refRangeLow: 4.5,
      refRangeHigh: 11.0,
      refRangeText: "4.5 - 11.0 x10^3/uL",
      status: "normal",
      statusExplanation: "Reported value 6.8 x10^3/uL falls within printed range of 4.5 - 11.0 x10^3/uL.",
      confidence: 99,
      verificationState: "confirmed",
      rawSnippet: "White Blood Cells (WBC) 6.8 x10^3/uL 4.5 - 11.0 NORMAL",
      reportDate: "2026-01-15",
      sourceDocumentName: "CBC_January_2026.pdf",
      verifiedByUser: true,
    },
    {
      id: "lab_demo_5",
      documentId: doc2Id,
      patientId: demoPatientId,
      testName: "Thyroid Stimulating Hormone (TSH)",
      value: 5.40,
      unit: "uIU/mL",
      refRangeLow: 0.40,
      refRangeHigh: 4.50,
      refRangeText: "0.40 - 4.50 uIU/mL",
      status: "high",
      statusExplanation: "Reported value 5.40 uIU/mL exceeds the printed reference range of 0.40 - 4.50 uIU/mL.",
      confidence: 98,
      verificationState: "confirmed",
      rawSnippet: "Thyroid Stimulating Horm 5.40 uIU/mL 0.40 - 4.50 HIGH",
      reportDate: "2026-03-10",
      sourceDocumentName: "Thyroid_Panel_March_2026.pdf",
      verifiedByUser: true,
    },
    {
      id: "lab_demo_6",
      documentId: doc2Id,
      patientId: demoPatientId,
      testName: "Free Thyroxine (FT4)",
      value: 1.05,
      unit: "ng/dL",
      refRangeLow: 0.80,
      refRangeHigh: 1.80,
      refRangeText: "0.80 - 1.80 ng/dL",
      status: "normal",
      statusExplanation: "Reported value 1.05 ng/dL falls within printed reference range of 0.80 - 1.80 ng/dL.",
      confidence: 98,
      verificationState: "confirmed",
      rawSnippet: "Free Thyroxine (FT4) 1.05 ng/dL 0.80 - 1.80 NORMAL",
      reportDate: "2026-03-10",
      sourceDocumentName: "Thyroid_Panel_March_2026.pdf",
      verifiedByUser: true,
    },
    {
      id: "lab_demo_7",
      documentId: doc4Id,
      patientId: demoPatientId,
      testName: "25-Hydroxy Vitamin D",
      value: 18.0,
      unit: "ng/mL",
      refRangeLow: null,
      refRangeHigh: null,
      refRangeText: null,
      status: "range_not_provided",
      statusExplanation: "Reference range not provided in source document. MedLens refuses to infer medical normality thresholds.",
      observation: "Omitted on release copy per laboratory advisory note",
      confidence: 96,
      verificationState: "pending",
      rawSnippet: "RESULT: 18.0 ng/mL - Reference range omitted on this release copy.",
      reportDate: "2026-05-05",
      sourceDocumentName: "VitaminD_Specialty_May2026.pdf",
      verifiedByUser: false,
    }
  ];

  // Demo Medications
  const demoMedications: Medication[] = [
    {
      id: "med_demo_1",
      patientId: demoPatientId,
      name: "Metformin HCl",
      dose: "500",
      unit: "mg",
      frequency: "Twice daily with meals",
      date: "2026-04-22",
      sourceDocumentId: doc3Id,
      sourceDocumentName: "Prescription_Clinic_Apr2026.pdf",
      source: "extracted",
      confidence: 72,
      verificationStatus: "pending",
      rawSnippet: "Metformin HCl 500 mg oral tablet | Sig: 1 tablet twice daily with meals.",
    },
    {
      id: "med_demo_2",
      patientId: demoPatientId,
      name: "Ferrous Fumarate (Iron supplement)",
      dose: "210",
      unit: "mg",
      frequency: "Once daily morning",
      date: "2026-01-20",
      source: "user_input",
      confidence: 100,
      verificationStatus: "confirmed",
    },
  ];

  // Demo Verification Items
  const demoVerifications: VerificationItem[] = [
    {
      id: "ver_demo_1",
      patientId: demoPatientId,
      type: "unclear_dosage",
      title: "Medication Extraction Needs Confirmation",
      description: "Metformin 500 mg extracted with 72% confidence from Prescription_Clinic_Apr2026.pdf. Please confirm dose and frequency.",
      targetType: "medication",
      targetId: "med_demo_1",
      status: "pending",
      confidence: 72,
      sourceSnippet: "Metformin HCl 500 mg oral tablet | Sig: 1 tablet twice daily with meals.",
      sourceDocumentName: "Prescription_Clinic_Apr2026.pdf",
      createdAt: "2026-04-23T11:05:00Z",
    },
    {
      id: "ver_demo_2",
      patientId: demoPatientId,
      type: "allergy_conflict",
      title: "Allergy Inconsistency Detected",
      description: "Patient profile states 'No known drug allergies', but historical clinic record notes 'Penicillin allergy reported by patient in 2021'.",
      targetType: "allergy",
      targetId: "alg_demo_1",
      status: "pending",
      confidence: 95,
      sourceSnippet: "Intake archive: Penicillin allergy noted (cutaneous urticaria, 2021).",
      sourceDocumentName: "St. Jude Clinic Historical Intake Record",
      createdAt: "2026-04-24T09:00:00Z",
    },
    {
      id: "ver_demo_3",
      patientId: demoPatientId,
      type: "missing_range",
      title: "Source Document Omitted Reference Range",
      description: "VitaminD_Specialty_May2026.pdf did not provide a reference interval for 25-Hydroxy Vitamin D (18.0 ng/mL). MedLens will not classify this as low or normal without source data.",
      targetType: "lab_result",
      targetId: "lab_demo_7",
      status: "pending",
      confidence: 96,
      sourceSnippet: "INVESTIGATION: 25-HYDROXY VITAMIN D (TOTAL) RESULT: 18.0 ng/mL (Range omitted)",
      sourceDocumentName: "VitaminD_Specialty_May2026.pdf",
      createdAt: "2026-05-06T16:25:00Z",
    },
    {
      id: "ver_demo_4",
      patientId: demoPatientId,
      type: "missing_context",
      title: "Missing Prior Context Detected",
      description: "Prescription_Clinic_Apr2026.pdf instructs to 'Continue previous medication and vitamin supplementation', but earlier supplement records are not uploaded.",
      targetType: "context",
      targetId: doc3Id,
      status: "pending",
      confidence: 90,
      sourceSnippet: "Continue previous medication and vitamin supplementation as directed previously.",
      sourceDocumentName: "Prescription_Clinic_Apr2026.pdf",
      createdAt: "2026-04-23T11:06:00Z",
    }
  ];

  // Demo Conflicts
  const demoConflicts: Conflict[] = [
    {
      id: "cnf_demo_1",
      patientId: demoPatientId,
      title: "Allergy Record Discrepancy",
      fieldA: "No known drug allergies",
      fieldB: "Penicillin (rash / urticaria reported 2021)",
      sourceA: "Patient Profile Onboarding",
      sourceB: "Clinical Intake Document Note",
      status: "unresolved",
    }
  ];

  // Demo Timeline
  const demoTimeline: TimelineEvent[] = [
    {
      id: "evt_demo_1",
      patientId: demoPatientId,
      eventDate: "2026-01-15",
      eventType: "report_uploaded",
      title: "CBC Laboratory Report Uploaded",
      description: "Complete blood count with 5 extracted biomarkers. Hemoglobin (10.8 g/dL) outside source reference range.",
      category: "labs",
      documentId: doc1Id,
      badge: "CBC",
      statusHighlight: "coral",
    },
    {
      id: "evt_demo_2",
      patientId: demoPatientId,
      eventDate: "2026-01-20",
      eventType: "symptom_logged",
      title: "Iron Supplementation Initiated",
      description: "Ferrous Fumarate 210 mg once daily added to profile.",
      category: "medications",
      badge: "Patient Entry",
      statusHighlight: "teal",
    },
    {
      id: "evt_demo_3",
      patientId: demoPatientId,
      eventDate: "2026-03-10",
      eventType: "report_uploaded",
      title: "Thyroid Panel Uploaded",
      description: "TSH reported at 5.40 uIU/mL (High vs 0.40 - 4.50 uIU/mL source range). FT4 within normal limits.",
      category: "labs",
      documentId: doc2Id,
      badge: "Thyroid",
      statusHighlight: "amber",
    },
    {
      id: "evt_demo_4",
      patientId: demoPatientId,
      eventDate: "2026-04-22",
      eventType: "prescription_added",
      title: "Prescription Extracted: Metformin",
      description: "Metformin HCl 500 mg extracted. Low confidence flag triggered verification item.",
      category: "prescriptions",
      documentId: doc3Id,
      badge: "Prescription",
      statusHighlight: "lavender",
    },
    {
      id: "evt_demo_5",
      patientId: demoPatientId,
      eventDate: "2026-05-05",
      eventType: "report_uploaded",
      title: "Specialty Report: Vitamin D",
      description: "25-Hydroxy Vitamin D reported as 18.0 ng/mL. Reference range omitted by laboratory.",
      category: "labs",
      documentId: doc4Id,
      badge: "Specialty Lab",
      statusHighlight: "amber",
    },
  ];

  // 2. DEFAULT REAL PATIENT (Clean, un-onboarded initial state)
  const defaultRealUserId = "usr_real_default";
  const defaultRealPatientId = "pat_real_default";

  const defaultRealUser: User = {
    id: defaultRealUserId,
    email: "user@medlens.health",
    name: "New Patient",
    passwordHash: "default_real_hash_2026",
    createdAt: now,
  };

  const defaultRealProfile: PatientProfile = {
    id: defaultRealPatientId,
    userId: defaultRealUserId,
    fullName: "",
    dob: "",
    sex: "Other",
    phone: "",
    emergencyContact: "",
    isPrivacyMode: false,
    isOnboarded: false, // Must complete Intake flow!
    isDemo: false,
    notes: "",
  };

  return {
    users: [defaultRealUser, demoUser],
    patientProfiles: [defaultRealProfile, demoProfile],
    symptoms: [...demoSymptoms],
    conditions: [...demoConditions],
    allergies: [...demoAllergies],
    medications: [...demoMedications],
    medicalDocuments: [...demoDocuments],
    labResults: [...demoLabResults],
    verificationItems: [...demoVerifications],
    conflicts: [...demoConflicts],
    timelineEvents: [...demoTimeline],
    shareSessions: [],
    auditLogs: [],
  };
}

export class Database {
  private static instance: Database;
  private data: DatabaseSchema;

  private constructor() {
    this.data = this.loadData();
  }

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  private loadData(): DatabaseSchema {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, "utf-8");
        const parsed = JSON.parse(raw);
        if (parsed.users && parsed.patientProfiles && parsed.patientProfiles.some((p: any) => "isOnboarded" in p)) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn("Could not load existing data, resetting to fresh schema template", e);
    }
    const initial = getInitialData();
    this.saveData(initial);
    return initial;
  }

  public saveData(data?: DatabaseSchema): void {
    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(data || this.data, null, 2), "utf-8");
    } catch (err) {
      console.error("Failed to write to persistent data file:", err);
    }
  }

  public resetDemoData(): DatabaseSchema {
    this.data = getInitialData();
    this.saveData(this.data);
    return this.data;
  }

  // --- Users & Profiles ---
  public getUser(email: string): User | undefined {
    return this.data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  public getUserById(id: string): User | undefined {
    return this.data.users.find(u => u.id === id);
  }

  public createUser(user: User): User {
    this.data.users.push(user);
    this.saveData();
    return user;
  }

  public getProfileByUserId(userId: string): PatientProfile | undefined {
    return this.data.patientProfiles.find(p => p.userId === userId);
  }

  public getProfileById(patientId: string): PatientProfile | undefined {
    return this.data.patientProfiles.find(p => p.id === patientId);
  }

  public getNonDemoProfiles(): PatientProfile[] {
    return this.data.patientProfiles.filter(p => !p.isDemo);
  }

  public addPatientProfile(profile: PatientProfile): PatientProfile {
    this.data.patientProfiles.push(profile);
    this.saveData();
    return profile;
  }

  public updateProfile(patientId: string, updates: Partial<PatientProfile>): PatientProfile | null {
    const idx = this.data.patientProfiles.findIndex(p => p.id === patientId);
    if (idx === -1) return null;
    this.data.patientProfiles[idx] = { ...this.data.patientProfiles[idx], ...updates };
    this.saveData();
    return this.data.patientProfiles[idx];
  }

  // --- Symptoms, Conditions, Allergies ---
  public getSymptoms(patientId: string): Symptom[] {
    return this.data.symptoms.filter(s => s.patientId === patientId);
  }

  public addSymptom(symptom: Symptom): Symptom {
    this.data.symptoms.push(symptom);
    this.saveData();
    return symptom;
  }

  public getConditions(patientId: string): Condition[] {
    return this.data.conditions.filter(c => c.patientId === patientId);
  }

  public addCondition(condition: Condition): Condition {
    this.data.conditions.push(condition);
    this.saveData();
    return condition;
  }

  public getAllergies(patientId: string): Allergy[] {
    return this.data.allergies.filter(a => a.patientId === patientId);
  }

  public addAllergy(allergy: Allergy): Allergy {
    this.data.allergies.push(allergy);
    this.saveData();
    return allergy;
  }

  public updateAllergy(id: string, updates: Partial<Allergy>): Allergy | null {
    const idx = this.data.allergies.findIndex(a => a.id === id);
    if (idx === -1) return null;
    this.data.allergies[idx] = { ...this.data.allergies[idx], ...updates };
    this.saveData();
    return this.data.allergies[idx];
  }

  // --- Medications ---
  public getMedications(patientId: string): Medication[] {
    return this.data.medications.filter(m => m.patientId === patientId);
  }

  public addMedication(med: Medication): Medication {
    this.data.medications.push(med);
    this.saveData();
    return med;
  }

  public updateMedication(id: string, updates: Partial<Medication>): Medication | null {
    const idx = this.data.medications.findIndex(m => m.id === id);
    if (idx === -1) return null;
    this.data.medications[idx] = { ...this.data.medications[idx], ...updates };
    this.saveData();
    return this.data.medications[idx];
  }

  // --- Documents ---
  public getDocuments(patientId: string): MedicalDocument[] {
    return this.data.medicalDocuments
      .filter(d => d.patientId === patientId)
      .sort((a, b) => new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime());
  }

  public getDocumentById(docId: string): MedicalDocument | undefined {
    return this.data.medicalDocuments.find(d => d.id === docId);
  }

  public findDocumentByHash(patientId: string, hash: string): MedicalDocument | undefined {
    return this.data.medicalDocuments.find(d => d.patientId === patientId && d.contentHash === hash);
  }

  public addDocument(doc: MedicalDocument): MedicalDocument {
    this.data.medicalDocuments.push(doc);
    this.saveData();
    return doc;
  }

  public deleteDocument(docId: string): boolean {
    const initialLen = this.data.medicalDocuments.length;
    this.data.medicalDocuments = this.data.medicalDocuments.filter(d => d.id !== docId);
    this.data.labResults = this.data.labResults.filter(l => l.documentId !== docId);
    this.data.timelineEvents = this.data.timelineEvents.filter(t => t.documentId !== docId);
    this.saveData();
    return this.data.medicalDocuments.length < initialLen;
  }

  // --- Lab Results ---
  public getLabResults(patientId: string): LabResult[] {
    return this.data.labResults
      .filter(l => l.patientId === patientId)
      .sort((a, b) => new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime());
  }

  public getLabResultById(id: string): LabResult | undefined {
    return this.data.labResults.find(l => l.id === id);
  }

  public addLabResult(res: LabResult): LabResult {
    this.data.labResults.push(res);
    this.saveData();
    return res;
  }

  public updateLabResult(id: string, updates: Partial<LabResult>): LabResult | null {
    const idx = this.data.labResults.findIndex(l => l.id === id);
    if (idx === -1) return null;
    this.data.labResults[idx] = { ...this.data.labResults[idx], ...updates };
    this.saveData();
    return this.data.labResults[idx];
  }

  // --- Verification Items ---
  public getVerificationItems(patientId: string): VerificationItem[] {
    return this.data.verificationItems.filter(v => v.patientId === patientId);
  }

  public getVerificationItemById(id: string): VerificationItem | undefined {
    return this.data.verificationItems.find(v => v.id === id);
  }

  public addVerificationItem(item: VerificationItem): VerificationItem {
    this.data.verificationItems.push(item);
    this.saveData();
    return item;
  }

  public updateVerificationItem(id: string, updates: Partial<VerificationItem>): VerificationItem | null {
    const idx = this.data.verificationItems.findIndex(v => v.id === id);
    if (idx === -1) return null;
    this.data.verificationItems[idx] = { ...this.data.verificationItems[idx], ...updates };
    this.saveData();
    return this.data.verificationItems[idx];
  }

  // --- Conflicts ---
  public getConflicts(patientId: string): Conflict[] {
    return this.data.conflicts.filter(c => c.patientId === patientId);
  }

  public updateConflict(id: string, updates: Partial<Conflict>): Conflict | null {
    const idx = this.data.conflicts.findIndex(c => c.id === id);
    if (idx === -1) return null;
    this.data.conflicts[idx] = { ...this.data.conflicts[idx], ...updates };
    this.saveData();
    return this.data.conflicts[idx];
  }

  // --- Timeline Events ---
  public getTimelineEvents(patientId: string): TimelineEvent[] {
    return this.data.timelineEvents
      .filter(t => t.patientId === patientId)
      .sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime());
  }

  public addTimelineEvent(evt: TimelineEvent): TimelineEvent {
    this.data.timelineEvents.push(evt);
    this.saveData();
    return evt;
  }

  // --- Share Sessions ---
  public getShareSession(token: string): ShareSession | undefined {
    return this.data.shareSessions.find(s => s.shareToken === token && s.isActive);
  }

  public createShareSession(session: ShareSession): ShareSession {
    this.data.shareSessions.push(session);
    this.saveData();
    return session;
  }

  public revokeShareSession(token: string): boolean {
    const session = this.data.shareSessions.find(s => s.shareToken === token);
    if (session) {
      session.isActive = false;
      this.saveData();
      return true;
    }
    return false;
  }

  // --- Audit Logs ---
  public logAudit(log: Omit<AuditLog, "id" | "timestamp">): AuditLog {
    const audit: AuditLog = {
      ...log,
      id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
    };
    this.data.auditLogs.push(audit);
    this.saveData();
    return audit;
  }

  public getAuditLogs(patientId: string): AuditLog[] {
    return this.data.auditLogs
      .filter(a => a.patientId === patientId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  // --- Record Readiness Engine ---
  public calculateRecordReadiness(patientId: string): {
    score: number;
    breakdown: {
      label: string;
      status: "complete" | "pending" | "warning";
      detail: string;
    }[];
  } {
    const profile = this.getProfileById(patientId);
    const allergies = this.getAllergies(patientId);
    const meds = this.getMedications(patientId);
    const docs = this.getDocuments(patientId);
    const verifications = this.getVerificationItems(patientId).filter(v => v.status === "pending");
    const conflicts = this.getConflicts(patientId).filter(c => c.status === "unresolved");

    const breakdown: {
      label: string;
      status: "complete" | "pending" | "warning";
      detail: string;
    }[] = [];

    let totalPoints = 0;

    // 1. Profile completeness (20 pts)
    if (profile?.fullName && profile?.dob && profile?.sex && profile?.isOnboarded) {
      totalPoints += 20;
      breakdown.push({
        label: "Basic Profile",
        status: "complete",
        detail: "Full demographics and intake information recorded",
      });
    } else {
      breakdown.push({
        label: "Basic Profile",
        status: "pending",
        detail: "Patient intake incomplete",
      });
    }

    // 2. Allergies verification (20 pts)
    const allergyConflict = conflicts.some(c => c.title.toLowerCase().includes("allergy"));
    if (allergyConflict) {
      totalPoints += 5;
      breakdown.push({
        label: "Allergy Status",
        status: "warning",
        detail: "Unresolved allergy record conflict",
      });
    } else if (allergies.length > 0) {
      totalPoints += 20;
      breakdown.push({
        label: "Allergies",
        status: "complete",
        detail: `${allergies.length} allergy records on file`,
      });
    } else {
      breakdown.push({
        label: "Allergies",
        status: "pending",
        detail: "No allergy information provided yet",
      });
    }

    // 3. Medications (20 pts)
    const unverifiedMeds = meds.filter(m => m.verificationStatus === "pending");
    if (unverifiedMeds.length > 0) {
      totalPoints += 10;
      breakdown.push({
        label: "Current Medications",
        status: "warning",
        detail: `${unverifiedMeds.length} extracted medication awaiting review`,
      });
    } else if (meds.length > 0) {
      totalPoints += 20;
      breakdown.push({
        label: "Current Medications",
        status: "complete",
        detail: `${meds.length} verified medications on file`,
      });
    } else {
      totalPoints += 20;
      breakdown.push({
        label: "Current Medications",
        status: "complete",
        detail: "No active prescription medications recorded",
      });
    }

    // 4. Lab Reports available (20 pts)
    if (docs.length >= 2) {
      totalPoints += 20;
      breakdown.push({
        label: "Laboratory History",
        status: "complete",
        detail: `${docs.length} structured medical documents linked`,
      });
    } else if (docs.length === 1) {
      totalPoints += 10;
      breakdown.push({
        label: "Laboratory History",
        status: "pending",
        detail: "Only 1 document available; upload prior records to enable longitudinal comparison",
      });
    } else {
      breakdown.push({
        label: "Laboratory History",
        status: "pending",
        detail: "No medical documents uploaded yet",
      });
    }

    // 5. Verification Inbox Clearance (20 pts)
    if (verifications.length === 0 && conflicts.length === 0) {
      totalPoints += 20;
      breakdown.push({
        label: "Verification Inbox",
        status: "complete",
        detail: "All extraction items and conflicts resolved",
      });
    } else {
      const deduction = Math.min(15, (verifications.length + conflicts.length) * 5);
      totalPoints += Math.max(0, 20 - deduction);
      breakdown.push({
        label: "Verification Inbox",
        status: "warning",
        detail: `${verifications.length} review item(s) and ${conflicts.length} conflict(s) pending`,
      });
    }

    return {
      score: Math.min(100, Math.max(0, totalPoints)),
      breakdown,
    };
  }
}

export const db = Database.getInstance();
