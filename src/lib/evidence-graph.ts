/**
 * MEDLENS EVIDENCE GRAPH & LONGITUDINAL INTELLIGENCE ENGINE
 * Connects laboratory measurements, medications, allergies, and conditions across time.
 * Calculates Evidence Coverage and tracks provenance rigorously.
 */

import type {
  LabResult,
  Medication,
  Allergy,
  Condition,
  MedicalDocument,
  EvidenceCoverage,
  ProvenanceCategory,
  LongitudinalTrend,
  LongitudinalDataPoint,
  SmartRecordAlert,
  WhySeeingThisData,
} from "./types";

/**
 * Normalizes biomarker names for longitudinal grouping across different lab formats.
 */
export function normalizeBiomarkerName(name: string): { key: string; displayName: string } {
  const clean = name.toLowerCase().trim();

  if (clean.includes("hemoglobin") || clean.includes("hgb") || clean === "hb") {
    return { key: "hemoglobin", displayName: "Hemoglobin" };
  }
  if (clean.includes("glucose") || clean.includes("fbs") || clean.includes("blood sugar") || clean.includes("fasting sugar")) {
    return { key: "glucose", displayName: "Blood Glucose" };
  }
  if (clean.includes("tsh") || clean.includes("thyroid stimulating hormone")) {
    return { key: "tsh", displayName: "TSH (Thyroid Stimulating Hormone)" };
  }
  if (clean.includes("creatinine") || clean.includes("serum creatinine")) {
    return { key: "creatinine", displayName: "Serum Creatinine" };
  }
  if (clean.includes("cholesterol") && !clean.includes("hdl") && !clean.includes("ldl")) {
    return { key: "cholesterol", displayName: "Total Cholesterol" };
  }
  if (clean.includes("hdl")) {
    return { key: "hdl", displayName: "HDL Cholesterol" };
  }
  if (clean.includes("ldl")) {
    return { key: "ldl", displayName: "LDL Cholesterol" };
  }
  if (clean.includes("triglyceride")) {
    return { key: "triglycerides", displayName: "Triglycerides" };
  }
  if (clean.includes("platelet")) {
    return { key: "platelets", displayName: "Platelet Count" };
  }
  if (clean.includes("wbc") || clean.includes("white blood cell") || clean.includes("leukocyte")) {
    return { key: "wbc", displayName: "Total Leukocyte Count (WBC)" };
  }
  if (clean.includes("rbc") || clean.includes("red blood cell") || clean.includes("erythrocyte")) {
    return { key: "rbc", displayName: "Red Blood Cell Count (RBC)" };
  }
  if (clean.includes("alt") || clean.includes("sgpt")) {
    return { key: "alt", displayName: "ALT / SGPT" };
  }
  if (clean.includes("ast") || clean.includes("sgot")) {
    return { key: "ast", displayName: "AST / SGOT" };
  }
  if (clean.includes("bilirubin") && !clean.includes("direct")) {
    return { key: "bilirubin_total", displayName: "Total Bilirubin" };
  }
  if (clean.includes("hba1c") || clean.includes("glycated hemoglobin")) {
    return { key: "hba1c", displayName: "HbA1c" };
  }

  // Fallback to title-cased name
  const formattedName = name
    .replace(/[_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return {
    key: clean.replace(/[^a-z0-9]/g, "_"),
    displayName: formattedName,
  };
}

/**
 * Calculates Evidence Coverage based on verifiable supporting records.
 */
export function calculateEvidenceCoverage(params: {
  supportingRecordCount: number;
  hasConflict?: boolean;
  needsVerification?: boolean;
  isPatientProvided?: boolean;
}): EvidenceCoverage {
  const { supportingRecordCount, hasConflict, needsVerification, isPatientProvided } = params;

  if (hasConflict) {
    return "CONFLICTING RECORDS";
  }
  if (needsVerification) {
    return "NEEDS VERIFICATION";
  }
  if (isPatientProvided) {
    return "PATIENT PROVIDED";
  }
  if (supportingRecordCount >= 2) {
    return "STRONG RECORD COVERAGE";
  }
  if (supportingRecordCount === 1) {
    return "LIMITED RECORD COVERAGE";
  }
  return "INSUFFICIENT EVIDENCE";
}

/**
 * Extracts and sorts longitudinal data points for all repeated biomarkers.
 */
export function buildLongitudinalTrends(labResults: LabResult[]): LongitudinalTrend[] {
  const grouped: Record<
    string,
    {
      displayName: string;
      unit: string;
      points: LongitudinalDataPoint[];
    }
  > = {};

  for (const lab of labResults) {
    const numVal = typeof lab.value === "number" ? lab.value : parseFloat(String(lab.value).replace(/[^0-9.]/g, ""));
    if (isNaN(numVal)) continue;

    const { key, displayName } = normalizeBiomarkerName(lab.testName);

    if (!grouped[key]) {
      grouped[key] = {
        displayName,
        unit: lab.unit || "",
        points: [],
      };
    }

    // Determine provenance
    const provenance: ProvenanceCategory = lab.documentId ? "document_extracted" : "patient_provided";

    grouped[key].points.push({
      date: lab.reportDate || "Recent",
      value: numVal,
      unit: lab.unit || grouped[key].unit,
      status: lab.status,
      documentId: lab.documentId || "",
      documentName: lab.sourceDocumentName || "Uploaded Report",
      snippet: lab.rawSnippet,
      refRangeText: lab.refRangeText,
      provenance,
    });
  }

  const trends: LongitudinalTrend[] = [];

  for (const [key, item] of Object.entries(grouped)) {
    // Sort chronologically by date
    const sortedPoints = item.points.sort((a, b) => {
      const timeA = new Date(a.date).getTime() || 0;
      const timeB = new Date(b.date).getTime() || 0;
      return timeA - timeB;
    });

    const hasSufficientData = sortedPoints.length >= 2;
    const latestStatus = sortedPoints[sortedPoints.length - 1]?.status || "normal";
    const uniqueDocs = new Set(sortedPoints.map((p) => p.documentName)).size;

    const coverage = calculateEvidenceCoverage({
      supportingRecordCount: uniqueDocs,
      hasConflict: false,
      needsVerification: sortedPoints.some((p) => p.status === "requires_verification"),
    });

    trends.push({
      biomarkerKey: key,
      displayName: item.displayName,
      unit: item.unit,
      points: sortedPoints,
      latestStatus,
      coverage,
      hasSufficientData,
    });
  }

  // Sort: repeated biomarkers first, then alphabetical
  return trends.sort((a, b) => {
    if (a.hasSufficientData !== b.hasSufficientData) {
      return a.hasSufficientData ? -1 : 1;
    }
    return b.points.length - a.points.length;
  });
}

/**
 * Builds deterministic Smart Record Alerts from patient records.
 * Alerts are strictly non-diagnostic observation notices grounded in actual documents.
 */
export function generateSmartRecordAlerts(params: {
  labResults: LabResult[];
  documents: MedicalDocument[];
  allergies?: Allergy[];
  medications?: Medication[];
}): SmartRecordAlert[] {
  const { labResults, documents, allergies = [], medications = [] } = params;
  const alerts: SmartRecordAlert[] = [];

  // 1. Out-of-range lab results
  const outOfRange = labResults.filter((l) => l.status === "low" || l.status === "high");
  for (const lab of outOfRange.slice(0, 5)) {
    alerts.push({
      id: `alert_range_${lab.id}`,
      type: "out_of_range",
      severity: "warning",
      title: `${lab.testName} Outside Report Reference Range`,
      message: `${lab.testName} was reported as ${lab.value} ${lab.unit} (${lab.status.toUpperCase()}). Source reference range: ${lab.refRangeText || `${lab.refRangeLow} - ${lab.refRangeHigh}`}.`,
      sourceDocumentName: lab.sourceDocumentName,
      reportDate: lab.reportDate,
      coverage: "LIMITED RECORD COVERAGE",
      actionLabel: "View Source Report",
    });
  }

  // 2. Longitudinal measurement shifts
  const trends = buildLongitudinalTrends(labResults);
  for (const trend of trends.filter((t) => t.hasSufficientData)) {
    const pts = trend.points;
    const prev = pts[pts.length - 2];
    const curr = pts[pts.length - 1];
    const diff = curr.value - prev.value;
    const pct = Math.round((Math.abs(diff) / (prev.value || 1)) * 100);

    if (pct >= 10 && Math.abs(diff) > 0.1) {
      const direction = diff > 0 ? "increased" : "decreased";
      alerts.push({
        id: `alert_shift_${trend.biomarkerKey}`,
        type: "measurement_changed",
        severity: "info",
        title: `${trend.displayName} Changed Compared with Previous Record`,
        message: `${trend.displayName} ${direction} from ${prev.value} ${trend.unit} (${prev.date}) to ${curr.value} ${trend.unit} (${curr.date}).`,
        sourceDocumentName: curr.documentName,
        reportDate: curr.date,
        coverage: "STRONG RECORD COVERAGE",
        actionLabel: "Compare Reports",
      });
    }
  }

  // 3. Allergy discrepancies
  const activeAllergies = allergies.filter((a) => a.status === "active");
  const noKnown = allergies.filter((a) => a.status === "no_known");
  if (activeAllergies.length > 0 && noKnown.length > 0) {
    alerts.push({
      id: "alert_allergy_conflict",
      type: "allergy_conflict",
      severity: "caution",
      title: "Possible Allergy Record Discrepancy",
      message: `Your records contain both an active allergen record (${activeAllergies[0].allergen}) and a "No Known Allergies" documentation. Please review for clarity.`,
      sourceDocumentName: "Multiple Records",
      reportDate: "Recent",
      coverage: "CONFLICTING RECORDS",
      actionLabel: "Review Conflict",
    });
  }

  // 4. Follow-up instructions in latest document
  const latestDoc = [...documents].sort(
    (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
  )[0];

  if (latestDoc && latestDoc.docType === "Discharge Summary") {
    alerts.push({
      id: `alert_followup_${latestDoc.id}`,
      type: "followup_instruction",
      severity: "info",
      title: "Follow-up Instructions in Discharge Summary",
      message: `Follow-up directions were documented in ${latestDoc.filename}. Review your Visit Prep sheet before your next appointment.`,
      sourceDocumentName: latestDoc.filename,
      reportDate: latestDoc.reportDate,
      coverage: "LIMITED RECORD COVERAGE",
      actionLabel: "Prepare Visit",
    });
  }

  return alerts;
}

/**
 * Builds "Why am I seeing this?" transparency explanation for an AI or record insight.
 */
export function buildWhySeeingThisData(params: {
  title: string;
  supportingDocuments: { documentName: string; date?: string; finding?: string }[];
  reasoning: string;
  isComparison?: boolean;
}): WhySeeingThisData {
  const { title, supportingDocuments, reasoning, isComparison = false } = params;

  return {
    title,
    recordsComparedCount: supportingDocuments.length,
    evidenceUsed: supportingDocuments,
    reasoning,
    geminiRole: isComparison
      ? "Google Gemini organized historical laboratory values and summarized longitudinal shifts."
      : "Google Gemini extracted structured medical terms and structured facts directly from the document.",
    medlensRole:
      "MedLens verified source provenance, linked the evidence chronologically, and compared values strictly against documented laboratory reference ranges.",
    nonDiagnosticNotice:
      "MedLens is non-diagnostic. No medical conclusion, condition, or therapy is inferred beyond the facts documented in your original reports.",
  };
}
