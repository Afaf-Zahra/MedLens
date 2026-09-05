/**
 * MEDLENS TRUST ENGINE
 * Every extracted fact passes through the Trust Engine before landing in the Living Medical Record.
 * Replaces arbitrary percentage confidence with calibrated Evidence Coverage and provenance tracking.
 */

import type { EvidenceCoverage, ProvenanceCategory } from "./types";

export type TrustState = "confirmed" | "needs_verification" | "conflict" | "rejected";

export interface TrustEngineEvaluation {
  trustState: TrustState;
  coverage: EvidenceCoverage;
  evidenceLabel: string;
  provenance: ProvenanceCategory;
  factors: {
    sourceType: "user_input" | "extracted" | "ai_generated";
    sourceLabel: string;
    hasSourceDocument: boolean;
    hasReferenceRange: boolean;
    hasConflict: boolean;
    isHumanVerified: boolean;
    supportingRecordCount: number;
  };
  badge: {
    label: string;
    variant: "teal" | "amber" | "coral" | "lavender" | "slate";
    icon: "check-circle" | "alert-circle" | "shield-alert" | "sparkles" | "user";
  };
  summary: string;
}

export function evaluateFactTrust(params: {
  sourceType: "user_input" | "extracted" | "ai_generated";
  confidence?: number;
  hasSourceDocument?: boolean;
  hasReferenceRange?: boolean;
  hasConflict?: boolean;
  isHumanVerified?: boolean;
  isRejected?: boolean;
  supportingRecordCount?: number;
}): TrustEngineEvaluation {
  const {
    sourceType,
    hasSourceDocument = false,
    hasReferenceRange = true,
    hasConflict = false,
    isHumanVerified = false,
    isRejected = false,
    supportingRecordCount = 1,
  } = params;

  if (isRejected) {
    return {
      trustState: "rejected",
      coverage: "INSUFFICIENT EVIDENCE",
      evidenceLabel: "Rejected by Patient",
      provenance: "system_derived",
      factors: {
        sourceType,
        sourceLabel: "Rejected Record",
        hasSourceDocument,
        hasReferenceRange,
        hasConflict,
        isHumanVerified: true,
        supportingRecordCount: 0,
      },
      badge: {
        label: "Rejected by Patient",
        variant: "slate",
        icon: "alert-circle",
      },
      summary: "This entry was reviewed and rejected during patient verification.",
    };
  }

  if (hasConflict) {
    return {
      trustState: "conflict",
      coverage: "CONFLICTING RECORDS",
      evidenceLabel: "Possible conflict",
      provenance: "system_derived",
      factors: {
        sourceType,
        sourceLabel: "Conflicting Data",
        hasSourceDocument,
        hasReferenceRange,
        hasConflict: true,
        isHumanVerified,
        supportingRecordCount,
      },
      badge: {
        label: "Possible Conflict",
        variant: "coral",
        icon: "shield-alert",
      },
      summary: "Contradiction detected against existing patient or clinical records. Awaiting patient review.",
    };
  }

  if (sourceType === "user_input") {
    return {
      trustState: "confirmed",
      coverage: "PATIENT PROVIDED",
      evidenceLabel: "Patient provided",
      provenance: "patient_provided",
      factors: {
        sourceType,
        sourceLabel: "Patient Provided",
        hasSourceDocument: false,
        hasReferenceRange: true,
        hasConflict: false,
        isHumanVerified: true,
        supportingRecordCount: 1,
      },
      badge: {
        label: "Patient Provided",
        variant: "teal",
        icon: "user",
      },
      summary: "Directly reported by patient during onboarding or intake update.",
    };
  }

  if (sourceType === "ai_generated") {
    return {
      trustState: "needs_verification",
      coverage: supportingRecordCount >= 2 ? "STRONG RECORD COVERAGE" : "LIMITED RECORD COVERAGE",
      evidenceLabel: `Supported by ${supportingRecordCount} record${supportingRecordCount === 1 ? "" : "s"}`,
      provenance: "system_derived",
      factors: {
        sourceType,
        sourceLabel: "AI Generated",
        hasSourceDocument,
        hasReferenceRange,
        hasConflict: false,
        isHumanVerified,
        supportingRecordCount,
      },
      badge: {
        label: "AI Organized Summary",
        variant: "lavender",
        icon: "sparkles",
      },
      summary: `Synthesized overview grounded in ${supportingRecordCount} verified record(s). Non-diagnostic.`,
    };
  }

  // Extracted from medical document
  if (isHumanVerified) {
    const label = supportingRecordCount > 1 ? `Supported by ${supportingRecordCount} records` : "Document extracted (Verified)";
    return {
      trustState: "confirmed",
      coverage: supportingRecordCount >= 2 ? "STRONG RECORD COVERAGE" : "LIMITED RECORD COVERAGE",
      evidenceLabel: label,
      provenance: "document_extracted",
      factors: {
        sourceType,
        sourceLabel: "Verified Extraction",
        hasSourceDocument: true,
        hasReferenceRange,
        hasConflict: false,
        isHumanVerified: true,
        supportingRecordCount,
      },
      badge: {
        label: "Verified by Patient",
        variant: "teal",
        icon: "check-circle",
      },
      summary: "Extracted from source document and explicitly verified by patient.",
    };
  }

  if (!hasReferenceRange) {
    return {
      trustState: "needs_verification",
      coverage: "NEEDS VERIFICATION",
      evidenceLabel: "Needs verification",
      provenance: "document_extracted",
      factors: {
        sourceType,
        sourceLabel: "Missing Reference Range",
        hasSourceDocument: true,
        hasReferenceRange: false,
        hasConflict: false,
        isHumanVerified: false,
        supportingRecordCount,
      },
      badge: {
        label: "Needs Verification",
        variant: "amber",
        icon: "alert-circle",
      },
      summary: "Source document omitted reference range. Queued for patient review.",
    };
  }

  const label = supportingRecordCount > 1 ? `Supported by ${supportingRecordCount} records` : "Document extracted";
  return {
    trustState: "confirmed",
    coverage: supportingRecordCount >= 2 ? "STRONG RECORD COVERAGE" : "LIMITED RECORD COVERAGE",
    evidenceLabel: label,
    provenance: "document_extracted",
    factors: {
      sourceType,
      sourceLabel: "Extracted from Report",
      hasSourceDocument: true,
      hasReferenceRange,
      hasConflict: false,
      isHumanVerified: false,
      supportingRecordCount,
    },
    badge: {
      label: label,
      variant: "teal",
      icon: "check-circle",
    },
    summary: `Extracted from source document with calibrated evidence grounding.`,
  };
}
