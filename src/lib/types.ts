/**
 * MedLens Domain & Data Types
 * Pure TypeScript interfaces - safe for both Client and Server execution.
 */

export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  createdAt: string;
}

export interface PatientProfile {
  id: string;
  userId: string;
  fullName: string;
  dob: string;
  sex: "Female" | "Male" | "Other";
  phone: string;
  emergencyContact: string;
  isPrivacyMode: boolean;
  notes?: string;
  isOnboarded: boolean;
  isDemo?: boolean;
}

export interface Symptom {
  id: string;
  patientId: string;
  symptom: string;
  onset: string;
  duration?: string;
  notes?: string;
  source: "user_input" | "extracted";
  verified: boolean;
}

export interface Condition {
  id: string;
  patientId: string;
  condition: string;
  diagnosedDate: string;
  status: "active" | "managed" | "resolved";
  source: "user_input" | "extracted";
  verified: boolean;
}

export interface Allergy {
  id: string;
  patientId: string;
  allergen: string;
  reaction?: string;
  status: "active" | "no_known";
  source: "user_input" | "extracted";
  verified: boolean;
}

export interface Medication {
  id: string;
  patientId: string;
  name: string;
  dose: string;
  unit: string;
  frequency: string;
  date: string;
  sourceDocumentId?: string;
  sourceDocumentName?: string;
  source: "user_input" | "extracted";
  confidence: number;
  verificationStatus: "pending" | "confirmed" | "edited" | "rejected";
  rawSnippet?: string;
}

export interface MedicalDocument {
  id: string;
  patientId: string;
  filename: string;
  fileType: string;
  docType:
    | "CBC"
    | "Thyroid Profile"
    | "Lipid Profile"
    | "Liver Function Test"
    | "Kidney Function Test"
    | "Prescription"
    | "Discharge Summary"
    | "General Laboratory Report"
    | "Other Medical Record";
  reportDate: string;
  rawText: string;
  fileUrl: string;
  contentHash: string;
  uploadedAt: string;
  classificationConfidence: number;
  summary?: string;
}

export type LabStatus =
  | "low"
  | "normal"
  | "high"
  | "range_not_provided"
  | "requires_verification";

export interface LabResult {
  id: string;
  documentId: string;
  patientId: string;
  testName: string;
  value: number | string;
  unit: string;
  refRangeLow?: number | null;
  refRangeHigh?: number | null;
  refRangeText?: string | null;
  status: LabStatus;
  statusExplanation: string;
  observation?: string;
  confidence: number;
  verificationState: "confirmed" | "pending" | "edited" | "rejected";
  rawSnippet: string;
  reportDate: string;
  sourceDocumentName: string;
  verifiedByUser?: boolean;
}

export interface VerificationItem {
  id: string;
  patientId: string;
  type:
    | "unclear_dosage"
    | "allergy_conflict"
    | "missing_range"
    | "missing_context"
    | "low_confidence";
  title: string;
  description: string;
  targetType: "medication" | "lab_result" | "allergy" | "context";
  targetId: string;
  status: "pending" | "resolved" | "dismissed";
  confidence?: number;
  sourceSnippet?: string;
  sourceDocumentName?: string;
  createdAt: string;
}

export interface Conflict {
  id: string;
  patientId: string;
  title: string;
  fieldA: string;
  fieldB: string;
  sourceA: string;
  sourceB: string;
  status: "unresolved" | "resolved";
  resolutionNotes?: string;
  resolvedAt?: string;
}

export interface TimelineEvent {
  id: string;
  patientId: string;
  eventDate: string;
  eventType:
    | "report_uploaded"
    | "lab_result"
    | "prescription_added"
    | "medication_verified"
    | "conflict_detected"
    | "conflict_resolved"
    | "symptom_logged";
  title: string;
  description: string;
  category: "labs" | "prescriptions" | "medications" | "symptoms" | "conditions" | "system";
  documentId?: string;
  badge?: string;
  statusHighlight?: "teal" | "amber" | "coral" | "lavender";
}

export interface ShareSession {
  id: string;
  patientId: string;
  shareToken: string;
  expiresAt: string;
  permissions: {
    basicInfo: boolean;
    allergies: boolean;
    medications: boolean;
    conditions: boolean;
    labResults: boolean;
    timeline: boolean;
    originalDocuments: boolean;
  };
  isActive: boolean;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  patientId: string;
  action: string;
  targetType: string;
  targetId: string;
  oldValue?: string;
  newValue?: string;
  timestamp: string;
}

export interface DatabaseSchema {
  users: User[];
  patientProfiles: PatientProfile[];
  symptoms: Symptom[];
  conditions: Condition[];
  allergies: Allergy[];
  medications: Medication[];
  medicalDocuments: MedicalDocument[];
  labResults: LabResult[];
  verificationItems: VerificationItem[];
  conflicts: Conflict[];
  timelineEvents: TimelineEvent[];
  shareSessions: ShareSession[];
  auditLogs: AuditLog[];
}

export type DetectedDocType =
  | "CBC"
  | "Thyroid Profile"
  | "Lipid Profile"
  | "Liver Function Test"
  | "Kidney Function Test"
  | "Prescription"
  | "Discharge Summary"
  | "General Laboratory Report"
  | "Other Medical Record";

export interface ClassificationResult {
  detectedType: DetectedDocType;
  confidence: number;
  reason: string;
}

export interface ExtractedLabItem {
  testName: string;
  value: number | string;
  unit: string;
  refRangeLow?: number | null;
  refRangeHigh?: number | null;
  refRangeText?: string | null;
  status: LabStatus;
  statusExplanation: string;
  confidence: number;
  rawSnippet: string;
  observation?: string;
}

export interface ExtractedMedicationItem {
  name: string;
  dose: string;
  unit: string;
  frequency: string;
  confidence: number;
  rawSnippet: string;
  verificationStatus: "pending" | "confirmed";
}

export interface ExtractionResult {
  documentType: DetectedDocType;
  reportDate: string;
  labResults: ExtractedLabItem[];
  medications: ExtractedMedicationItem[];
  missingContextDetected?: {
    phrase: string;
    description: string;
  } | null;
  summary: string;
}

// -------------------------------------------------------------
// GEMINI & EVIDENCE INTELLIGENCE TYPES
// -------------------------------------------------------------

export type EvidenceCoverage =
  | "STRONG RECORD COVERAGE"
  | "LIMITED RECORD COVERAGE"
  | "PATIENT PROVIDED"
  | "NEEDS VERIFICATION"
  | "CONFLICTING RECORDS"
  | "INSUFFICIENT EVIDENCE";

export type ProvenanceCategory =
  | "patient_provided"
  | "document_extracted"
  | "clinician_documented"
  | "system_derived";

export interface EvidenceSourceLink {
  documentId?: string;
  documentName: string;
  reportDate?: string;
  pageOrSection?: string;
  snippet?: string;
  provenance: ProvenanceCategory;
  coverage: EvidenceCoverage;
  supportingCount?: number;
  verificationState?: "confirmed" | "pending" | "edited" | "rejected";
}

export interface LongitudinalDataPoint {
  date: string;
  value: number;
  unit: string;
  status: LabStatus;
  documentId: string;
  documentName: string;
  snippet?: string;
  refRangeText?: string | null;
  provenance: ProvenanceCategory;
}

export interface LongitudinalTrend {
  biomarkerKey: string;
  displayName: string;
  unit: string;
  points: LongitudinalDataPoint[];
  latestStatus: LabStatus;
  coverage: EvidenceCoverage;
  hasSufficientData: boolean;
}

export interface EvidenceGraphNode {
  id: string;
  key: string;
  displayName: string;
  category: "measurement" | "medication" | "allergy" | "condition" | "symptom" | "procedure" | "instruction";
  coverage: EvidenceCoverage;
  provenance: ProvenanceCategory;
  supportingDocuments: {
    documentId: string;
    documentName: string;
    reportDate: string;
    snippet?: string;
  }[];
  points?: LongitudinalDataPoint[];
}

export interface GeminiExplanation {
  term: string;
  plainLanguageExplanation: string;
  whyInRecords: string;
  whatPatientRecordSays: string;
  sourceDocumentName?: string;
  sourceSnippet?: string;
  coverage: EvidenceCoverage;
  nonDiagnosticDisclaimer: string;
}

export interface HealthStoryEvent {
  id: string;
  date: string;
  displayDate: string;
  title: string;
  category: "labs" | "medications" | "conditions" | "investigations" | "general";
  findings: string[];
  narrative: string;
  sourceDocuments: string[];
  documentId?: string;
  coverage: EvidenceCoverage;
}

export interface SmartRecordAlert {
  id: string;
  type: "out_of_range" | "measurement_changed" | "allergy_conflict" | "medication_difference" | "followup_instruction";
  severity: "info" | "warning" | "caution";
  title: string;
  message: string;
  sourceDocumentName: string;
  reportDate: string;
  coverage: EvidenceCoverage;
  actionLabel?: string;
}

export interface WhySeeingThisData {
  title: string;
  recordsComparedCount: number;
  evidenceUsed: {
    documentName: string;
    date?: string;
    finding?: string;
  }[];
  reasoning: string;
  geminiRole: string;
  medlensRole: string;
  nonDiagnosticNotice: string;
}

export interface ConflictDetectiveItem {
  id: string;
  title: string;
  category: "allergy" | "medication" | "lab_result" | "demographic";
  recordA: {
    sourceDocumentName: string;
    reportDate: string;
    statement: string;
    snippet?: string;
  };
  recordB: {
    sourceDocumentName: string;
    reportDate: string;
    statement: string;
    snippet?: string;
  };
  status: "unresolved" | "reviewed" | "resolved";
  systemNote: string;
}

export interface StructuredDocumentExtraction {
  documentType: DetectedDocType;
  documentDate?: string;
  provider?: string;
  tests: {
    testName: string;
    value: number | string;
    unit: string;
    referenceRange?: string;
    refRangeLow?: number | null;
    refRangeHigh?: number | null;
    status: LabStatus;
    statusExplanation?: string;
    observation?: string;
    rawSnippet: string;
    pageOrSection?: string;
  }[];
  medicationsMentioned: {
    name: string;
    dose: string;
    unit: string;
    frequency: string;
    rawSnippet: string;
    status?: string;
  }[];
  conditionsMentioned: {
    condition: string;
    status?: string;
    rawSnippet: string;
  }[];
  symptomsMentioned: {
    symptom: string;
    onset?: string;
    rawSnippet: string;
  }[];
  allergiesMentioned: {
    allergen: string;
    reaction?: string;
    rawSnippet: string;
  }[];
  followUpInstructions: {
    instruction: string;
    timeline?: string;
    rawSnippet: string;
  }[];
  proceduresMentioned: {
    procedure: string;
    date?: string;
    rawSnippet: string;
  }[];
  relevantObservations: string[];
  summary: string;
}

export interface VisitPrepData {
  patientName: string;
  summary: string;
  recentRecordChanges: {
    whatChanged: string;
    detail: string;
    sourceDocument: string;
  }[];
  unresolvedConflicts: {
    title: string;
    detail: string;
  }[];
  recentInvestigations: {
    testName: string;
    value: string | number;
    unit: string;
    status: LabStatus;
    date: string;
    sourceDocument: string;
  }[];
  followUpInstructions: {
    instruction: string;
    sourceDocument: string;
    date: string;
  }[];
  documentsToBring: string[];
  suggestedQuestions: string[];
  coverage: EvidenceCoverage;
}

export interface DoctorHandoffData {
  patientName: string;
  generatedDate: string;
  summary: string;
  recentRecordChanges: string[];
  documentedConditions: {
    condition: string;
    status: string;
    source: string;
    date: string;
  }[];
  documentedMedications: {
    name: string;
    dose: string;
    frequency: string;
    source: string;
    date: string;
  }[];
  recordedAllergies: {
    allergen: string;
    reaction?: string;
    source: string;
  }[];
  recentInvestigations: {
    testName: string;
    value: string | number;
    unit: string;
    status: LabStatus;
    date: string;
    source: string;
  }[];
  longitudinalTrends: {
    biomarker: string;
    trendDescription: string;
    sourceDates: string[];
  }[];
  unresolvedConflicts: string[];
  followUpInstructionsFound: string[];
  sourceDocuments: {
    filename: string;
    date: string;
    docType: string;
  }[];
  coverage: EvidenceCoverage;
}

