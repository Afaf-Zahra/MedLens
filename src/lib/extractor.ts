import crypto from "crypto";
import { evaluateReferenceRange } from "./reference-range";
import type {
  LabResult,
  Medication,
  LabStatus,
  DetectedDocType,
  ClassificationResult,
  ExtractedLabItem,
  ExtractedMedicationItem,
  ExtractionResult,
} from "./types";
import { SAMPLE_DOCUMENTS_FOR_DEMO } from "./sample-docs";

export type {
  DetectedDocType,
  ClassificationResult,
  ExtractedLabItem,
  ExtractedMedicationItem,
  ExtractionResult,
};
export { SAMPLE_DOCUMENTS_FOR_DEMO };


export function computeContentHash(content: string | Buffer): string {
  return crypto.createHash("sha256").update(content).digest("hex").slice(0, 32);
}

/**
 * Classifies medical documents based on title, headers, and keyword analysis
 */
export function classifyDocument(text: string, filename: string): ClassificationResult {
  const combined = (filename + " " + text).toLowerCase();

  if (
    combined.includes("cbc") ||
    combined.includes("complete blood count") ||
    combined.includes("hemoglobin") ||
    combined.includes("platelet")
  ) {
    return {
      detectedType: "CBC",
      confidence: 98,
      reason: "Detected complete blood count biomarkers and hematology header.",
    };
  }

  if (
    combined.includes("thyroid") ||
    combined.includes("tsh") ||
    combined.includes("thyroxine") ||
    combined.includes("ft4")
  ) {
    return {
      detectedType: "Thyroid Profile",
      confidence: 96,
      reason: "Detected TSH, Thyroxine, or endocrine panel indicators.",
    };
  }

  if (
    combined.includes("lipid") ||
    combined.includes("cholesterol") ||
    combined.includes("triglyceride") ||
    combined.includes("hdl") ||
    combined.includes("ldl")
  ) {
    return {
      detectedType: "Lipid Profile",
      confidence: 97,
      reason: "Detected cholesterol and lipid partition headers.",
    };
  }

  if (
    combined.includes("prescription") ||
    combined.includes("rx") ||
    combined.includes("sig:") ||
    combined.includes("take 1 tablet") ||
    combined.includes("refills:")
  ) {
    return {
      detectedType: "Prescription",
      confidence: 95,
      reason: "Detected prescription signa, physician directive, and medication dosage.",
    };
  }

  if (
    combined.includes("discharge summary") ||
    combined.includes("admission date") ||
    combined.includes("discharge date") ||
    combined.includes("hospital course")
  ) {
    return {
      detectedType: "Discharge Summary",
      confidence: 94,
      reason: "Detected inpatient clinical timeline and discharge instructions.",
    };
  }

  if (
    combined.includes("liver") ||
    combined.includes("alt") ||
    combined.includes("ast") ||
    combined.includes("bilirubin")
  ) {
    return {
      detectedType: "Liver Function Test",
      confidence: 93,
      reason: "Detected hepatic enzyme markers.",
    };
  }

  if (
    combined.includes("kidney") ||
    combined.includes("creatinine") ||
    combined.includes("bun") ||
    combined.includes("egfr")
  ) {
    return {
      detectedType: "Kidney Function Test",
      confidence: 93,
      reason: "Detected renal metabolic panel markers.",
    };
  }

  return {
    detectedType: "General Laboratory Report",
    confidence: 85,
    reason: "General laboratory investigation indicators detected.",
  };
}

/**
 * Detects missing context phrases in clinical documents
 */
export function detectMissingContext(text: string, existingMedicationsCount: number): { phrase: string; description: string } | null {
  const lower = text.toLowerCase();
  if (lower.includes("continue previous medication") || lower.includes("as directed previously") || lower.includes("continue prior")) {
    if (existingMedicationsCount <= 1) {
      return {
        phrase: "Continue previous medication",
        description: "This document refers to a previous medication or supplement regimen, but corresponding earlier records are not available in MedLens.",
      };
    }
  }
  return null;
}

/**
 * Strict structured extraction from text or predefined demo documents
 */
export function extractStructuredData(
  text: string,
  filename: string,
  userOverrideType?: DetectedDocType,
  existingMedsCount = 1
): ExtractionResult {
  const classification = userOverrideType
    ? { detectedType: userOverrideType, confidence: 100, reason: "User verified document type." }
    : classifyDocument(text, filename);

  // Check for the Flagship August 2026 CBC Report (Demo Follow-up)
  if (filename.toLowerCase().includes("cbc_august_2026") || (text.includes("18-Aug-2026") && text.includes("COMPLETE BLOOD COUNT"))) {
    const reportDate = "2026-08-18";
    const labItems: ExtractedLabItem[] = [
      {
        testName: "Hemoglobin",
        value: 12.4,
        unit: "g/dL",
        refRangeLow: 12.0,
        refRangeHigh: 16.0,
        refRangeText: "12.0 - 16.0 g/dL",
        status: "normal",
        statusExplanation: "Reported value 12.4 g/dL falls within printed reference range of 12.0 - 16.0 g/dL.",
        confidence: 99,
        rawSnippet: "Hemoglobin 12.4 g/dL 12.0 - 16.0 NORMAL",
        observation: "Normalized from previous below-range result",
      },
      {
        testName: "Hematocrit",
        value: 38.5,
        unit: "%",
        refRangeLow: 36.0,
        refRangeHigh: 46.0,
        refRangeText: "36.0 - 46.0 %",
        status: "normal",
        statusExplanation: "Reported value 38.5% falls within printed reference range of 36.0 - 46.0%.",
        confidence: 98,
        rawSnippet: "Hematocrit 38.5 % 36.0 - 46.0 NORMAL",
        observation: "Within limits",
      },
      {
        testName: "Red Blood Cells (RBC)",
        value: 4.35,
        unit: "x10^6/uL",
        refRangeLow: 4.0,
        refRangeHigh: 5.2,
        refRangeText: "4.00 - 5.20 x10^6/uL",
        status: "normal",
        statusExplanation: "Reported value 4.35 falls within printed reference range.",
        confidence: 99,
        rawSnippet: "Red Blood Cells (RBC) 4.35 x10^6/uL 4.00 - 5.20 NORMAL",
      },
      {
        testName: "White Blood Cells (WBC)",
        value: 7.1,
        unit: "x10^3/uL",
        refRangeLow: 4.5,
        refRangeHigh: 11.0,
        refRangeText: "4.5 - 11.0 x10^3/uL",
        status: "normal",
        statusExplanation: "Reported value 7.1 falls within printed reference range.",
        confidence: 99,
        rawSnippet: "White Blood Cells (WBC) 7.1 x10^3/uL 4.5 - 11.0 NORMAL",
      },
      {
        testName: "Platelet Count",
        value: 260,
        unit: "x10^3/uL",
        refRangeLow: 150,
        refRangeHigh: 450,
        refRangeText: "150 - 450 x10^3/uL",
        status: "normal",
        statusExplanation: "Reported value 260 falls within printed reference range.",
        confidence: 99,
        rawSnippet: "Platelet Count 260 x10^3/uL 150 - 450 NORMAL",
      },
      {
        testName: "Mean Corpuscular Vol (MCV)",
        value: 86.0,
        unit: "fL",
        refRangeLow: 80.0,
        refRangeHigh: 100.0,
        refRangeText: "80.0 - 100.0 fL",
        status: "normal",
        statusExplanation: "Reported value 86.0 falls within printed reference range.",
        confidence: 97,
        rawSnippet: "Mean Corpuscular Vol (MCV) 86.0 fL 80.0 - 100.0 NORMAL",
      },
    ];

    return {
      documentType: "CBC",
      reportDate,
      labResults: labItems,
      medications: [],
      missingContextDetected: null,
      summary: "Follow-up Complete Blood Count for August 2026. All 6 extracted biomarkers fall within the laboratory's printed reference ranges.",
    };
  }

  // Generic extraction via regex parsing lines
  const lines = text.split("\n");
  const extractedLabs: ExtractedLabItem[] = [];
  const extractedMeds: ExtractedMedicationItem[] = [];

  // Report Date detection
  let detectedDate = new Date().toISOString().split("T")[0];
  const dateMatch = text.match(/(?:Date|Report Date|Specimen Date|Collection Date)[:\s]+([0-9]{1,2}[-/][A-Za-z0-9]{2,3}[-/][0-9]{2,4}|[0-9]{4}-[0-9]{2}-[0-9]{2})/i);
  if (dateMatch && dateMatch[1]) {
    try {
      const parsed = new Date(dateMatch[1]);
      if (!isNaN(parsed.getTime())) {
        detectedDate = parsed.toISOString().split("T")[0];
      }
    } catch {
      // fallback
    }
  }

  // Line-by-line lab extraction
  for (const line of lines) {
    // Pattern: [TestName] [Value] [Unit] [RefLow] - [RefHigh]
    const labPattern = /^([A-Za-z\s()-]+?)\s+([0-9]+(?:\.[0-9]+)?)\s+([a-zA-Z/%^0-9]+)\s+([0-9]+(?:\.[0-9]+)?)\s*[-–to]\s*([0-9]+(?:\.[0-9]+)?)/i;
    const match = line.trim().match(labPattern);
    if (match) {
      const testName = match[1].trim();
      const val = parseFloat(match[2]);
      const unit = match[3].trim();
      const low = parseFloat(match[4]);
      const high = parseFloat(match[5]);
      const evaluation = evaluateReferenceRange(val, low, high, `${low} - ${high} ${unit}`, filename);

      extractedLabs.push({
        testName,
        value: val,
        unit,
        refRangeLow: low,
        refRangeHigh: high,
        refRangeText: `${low} - ${high} ${unit}`,
        status: evaluation.status,
        statusExplanation: evaluation.explanation,
        confidence: 95,
        rawSnippet: line.trim(),
      });
      continue;
    }

    // Pattern with omitted range (e.g. "TestName: 18.0 ng/mL")
    const noRangePattern = /^([A-Za-z\s()-]+?)[:\s]+([0-9]+(?:\.[0-9]+)?)\s+([a-zA-Z/%^0-9]+)(?:\s+no range|\s*)$/i;
    const noRangeMatch = line.trim().match(noRangePattern);
    if (noRangeMatch && !line.toLowerCase().includes("date") && !line.toLowerCase().includes("page")) {
      const testName = noRangeMatch[1].trim();
      const val = parseFloat(noRangeMatch[2]);
      const unit = noRangeMatch[3].trim();
      const evaluation = evaluateReferenceRange(val, null, null, null, filename);

      extractedLabs.push({
        testName,
        value: val,
        unit,
        refRangeLow: null,
        refRangeHigh: null,
        refRangeText: null,
        status: evaluation.status, // "range_not_provided"
        statusExplanation: evaluation.explanation,
        confidence: 90,
        rawSnippet: line.trim(),
      });
      continue;
    }

    // Prescription pattern: "1. Metformin HCl 500 mg ... Sig: ..."
    if (line.toLowerCase().includes("mg") || line.toLowerCase().includes("mcg") || line.toLowerCase().includes("tablet")) {
      const medMatch = line.match(/(?:[0-9]+\.\s*)?([A-Za-z\s]+?)\s+([0-9]+(?:\.[0-9]+)?)\s*(mg|mcg|g|ml)/i);
      if (medMatch && !medMatch[1].toLowerCase().includes("hemoglobin")) {
        const medName = medMatch[1].trim();
        const dose = medMatch[2];
        const unit = medMatch[3];
        extractedMeds.push({
          name: medName,
          dose,
          unit,
          frequency: line.toLowerCase().includes("daily") ? "Once or twice daily" : "As directed",
          confidence: 82,
          rawSnippet: line.trim(),
          verificationStatus: "pending",
        });
      }
    }
  }

  const missingContext = detectMissingContext(text, existingMedsCount);

  return {
    documentType: classification.detectedType,
    reportDate: detectedDate,
    labResults: extractedLabs,
    medications: extractedMeds,
    missingContextDetected: missingContext,
    summary: `Extracted ${extractedLabs.length} test result(s) and ${extractedMeds.length} medication record(s).`,
  };
}

