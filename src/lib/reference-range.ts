import type { LabStatus } from "./types";

export interface RangeEvaluation {
  status: LabStatus;
  statusLabel: string;
  explanation: string;
  badgeVariant: "emerald" | "amber" | "coral" | "slate";
  hasPrintedRange: boolean;
}

/**
 * STRICT REFERENCE RANGE ENGINE
 * 
 * CORE PRODUCT PHILOSOPHY:
 * MedLens classifies values as LOW, NORMAL, or HIGH ONLY when the original source 
 * document contains an explicit usable reference range.
 * 
 * RULES:
 * 1. NEVER invent a normal range.
 * 2. NEVER use an external medical database to fill missing thresholds.
 * 3. NEVER ask an LLM to guess or infer a range.
 * 4. If the source report does NOT provide a range:
 *    Status is `range_not_provided`.
 *    Label is "Reference range not provided in source."
 * 5. If ambiguous: `requires_verification`.
 */
export function evaluateReferenceRange(
  value: number | string,
  low?: number | null,
  high?: number | null,
  refRangeText?: string | null,
  sourceDocumentName?: string
): RangeEvaluation {
  const numVal = typeof value === "number" ? value : parseFloat(value);

  // Case 1: No reference range is printed or available in the source
  if (
    (low === undefined || low === null) &&
    (high === undefined || high === null) &&
    (!refRangeText || refRangeText.trim() === "" || refRangeText.toLowerCase().includes("omit") || refRangeText.toLowerCase().includes("not provided"))
  ) {
    return {
      status: "range_not_provided",
      statusLabel: "Range Not Provided",
      explanation: `The source document (${sourceDocumentName || "this report"}) does not contain a printed reference range for this test. Per MedLens safety policy, reference ranges are never inferred or fetched from third-party databases.`,
      badgeVariant: "slate",
      hasPrintedRange: false,
    };
  }

  // Case 2: Value is non-numeric or cannot be parsed
  if (isNaN(numVal)) {
    return {
      status: "requires_verification",
      statusLabel: "Requires Verification",
      explanation: `The reported value "${value}" could not be compared numerically against the source interval (${refRangeText || "provided"}). Human review requested.`,
      badgeVariant: "amber",
      hasPrintedRange: true,
    };
  }

  // Case 3: Both Low and High bounds exist
  if (low !== null && low !== undefined && high !== null && high !== undefined) {
    if (numVal < low) {
      return {
        status: "low",
        statusLabel: "Low",
        explanation: `Reported value (${numVal}) is below the laboratory's printed lower limit of ${low}. (Source range: ${refRangeText || `${low} - ${high}`}).`,
        badgeVariant: "coral",
        hasPrintedRange: true,
      };
    }
    if (numVal > high) {
      return {
        status: "high",
        statusLabel: "High",
        explanation: `Reported value (${numVal}) exceeds the laboratory's printed upper limit of ${high}. (Source range: ${refRangeText || `${low} - ${high}`}).`,
        badgeVariant: "coral",
        hasPrintedRange: true,
      };
    }
    return {
      status: "normal",
      statusLabel: "Normal",
      explanation: `Reported value (${numVal}) falls within the laboratory's printed range of ${low} to ${high}.`,
      badgeVariant: "emerald",
      hasPrintedRange: true,
    };
  }

  // Case 4: Only Low bound exists (e.g. "> 50")
  if (low !== null && low !== undefined && (high === null || high === undefined)) {
    if (numVal < low) {
      return {
        status: "low",
        statusLabel: "Below Source Threshold",
        explanation: `Reported value (${numVal}) is below the printed threshold of ${low}.`,
        badgeVariant: "coral",
        hasPrintedRange: true,
      };
    }
    return {
      status: "normal",
      statusLabel: "Within Source Threshold",
      explanation: `Reported value (${numVal}) meets or exceeds the printed threshold of ${low}.`,
      badgeVariant: "emerald",
      hasPrintedRange: true,
    };
  }

  // Case 5: Only High bound exists (e.g. "< 200")
  if (high !== null && high !== undefined && (low === null || low === undefined)) {
    if (numVal > high) {
      return {
        status: "high",
        statusLabel: "Above Source Cutoff",
        explanation: `Reported value (${numVal}) exceeds the printed cutoff of ${high}.`,
        badgeVariant: "coral",
        hasPrintedRange: true,
      };
    }
    return {
      status: "normal",
      statusLabel: "Within Source Cutoff",
      explanation: `Reported value (${numVal}) is within the printed cutoff limit of ${high}.`,
      badgeVariant: "emerald",
      hasPrintedRange: true,
    };
  }

  return {
    status: "requires_verification",
    statusLabel: "Verification Needed",
    explanation: "Reference range structure in the source document requires human verification.",
    badgeVariant: "amber",
    hasPrintedRange: false,
  };
}

/**
 * Generates the transparent explanation for "Why is this marked Low / High?"
 */
export function getWhyMarkedExplanation(params: {
  testName: string;
  value: number | string;
  unit: string;
  status: LabStatus;
  refRangeLow?: number | null;
  refRangeHigh?: number | null;
  refRangeText?: string | null;
  sourceDocumentName: string;
}) {
  const { testName, value, unit, status, refRangeText, refRangeLow, refRangeHigh, sourceDocumentName } = params;

  if (status === "range_not_provided") {
    return {
      title: `Why is ${testName} unclassified?`,
      reportedValue: `${value} ${unit}`.trim(),
      sourceRange: "None printed in document",
      classification: "Unclassified (Range Omitted in Source)",
      sourceDocument: sourceDocumentName,
      statement: "MedLens refused to classify this result because no reference range was printed in the original source report. MedLens will never guess clinical thresholds or use third-party assumptions.",
    };
  }

  const rangeDisplay = refRangeText || (refRangeLow != null && refRangeHigh != null ? `${refRangeLow} – ${refRangeHigh} ${unit}` : "Unspecified");

  let classLabel = "Within Report Range";
  if (status === "low") classLabel = "Below Report Range";
  if (status === "high") classLabel = "Above Report Range";
  if (status === "requires_verification") classLabel = "Needs Verification";

  return {
    title: `Why is ${testName} marked ${(status ?? "unknown").toUpperCase()}?`,
    reportedValue: `${value} ${unit}`.trim(),
    sourceRange: rangeDisplay,
    classification: classLabel,
    sourceDocument: sourceDocumentName,
    statement: `MedLens classified this result using only the reference range printed directly in ${sourceDocumentName}. It does not represent a medical diagnosis.`,
  };
}
