export type TrustState = "confirmed" | "needs_verification" | "conflict" | "rejected";

export interface TrustEngineEvaluation {
  trustState: TrustState;
  score: number; // 0 - 100
  factors: {
    sourceType: "user_input" | "extracted" | "ai_generated";
    sourceLabel: string;
    hasSourceDocument: boolean;
    confidenceScore: number;
    hasReferenceRange: boolean;
    hasConflict: boolean;
    isHumanVerified: boolean;
  };
  badge: {
    label: string;
    variant: "teal" | "amber" | "coral" | "lavender" | "slate";
    icon: "check-circle" | "alert-circle" | "shield-alert" | "sparkles" | "user";
  };
  summary: string;
}

/**
 * MEDLENS TRUST ENGINE
 * Every extracted fact passes through the Trust Engine before landing in the Living Medical Record.
 */
export function evaluateFactTrust(params: {
  sourceType: "user_input" | "extracted" | "ai_generated";
  confidence?: number;
  hasSourceDocument?: boolean;
  hasReferenceRange?: boolean;
  hasConflict?: boolean;
  isHumanVerified?: boolean;
  isRejected?: boolean;
}): TrustEngineEvaluation {
  const {
    sourceType,
    confidence = 90,
    hasSourceDocument = false,
    hasReferenceRange = true,
    hasConflict = false,
    isHumanVerified = false,
    isRejected = false,
  } = params;

  if (isRejected) {
    return {
      trustState: "rejected",
      score: 0,
      factors: {
        sourceType,
        sourceLabel: "Rejected Record",
        hasSourceDocument,
        confidenceScore: 0,
        hasReferenceRange,
        hasConflict,
        isHumanVerified: true,
      },
      badge: {
        label: "Rejected by Patient",
        variant: "slate",
        icon: "alert-circle",
      },
      summary: "This entry was reviewed and rejected during human verification.",
    };
  }

  if (hasConflict) {
    return {
      trustState: "conflict",
      score: 30,
      factors: {
        sourceType,
        sourceLabel: "Conflicting Data",
        hasSourceDocument,
        confidenceScore: confidence,
        hasReferenceRange,
        hasConflict: true,
        isHumanVerified,
      },
      badge: {
        label: "Conflict Detected",
        variant: "coral",
        icon: "shield-alert",
      },
      summary: "Contradiction detected against existing patient or clinical records. Awaiting human resolution.",
    };
  }

  if (sourceType === "user_input") {
    return {
      trustState: "confirmed",
      score: 100,
      factors: {
        sourceType,
        sourceLabel: "Patient Provided",
        hasSourceDocument: false,
        confidenceScore: 100,
        hasReferenceRange: true,
        hasConflict: false,
        isHumanVerified: true,
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
      score: 75,
      factors: {
        sourceType,
        sourceLabel: "AI Generated",
        hasSourceDocument,
        confidenceScore: confidence,
        hasReferenceRange,
        hasConflict: false,
        isHumanVerified,
      },
      badge: {
        label: "AI Generated Summary",
        variant: "lavender",
        icon: "sparkles",
      },
      summary: "Synthesized overview generated from verified records. Non-diagnostic.",
    };
  }

  // Extracted from medical document
  if (isHumanVerified) {
    return {
      trustState: "confirmed",
      score: 98,
      factors: {
        sourceType,
        sourceLabel: "Confirmed Extraction",
        hasSourceDocument: true,
        confidenceScore: Math.max(confidence, 95),
        hasReferenceRange,
        hasConflict: false,
        isHumanVerified: true,
      },
      badge: {
        label: "Verified by Patient",
        variant: "teal",
        icon: "check-circle",
      },
      summary: "Extracted from source document and explicitly verified by patient.",
    };
  }

  if (confidence < 80 || !hasReferenceRange) {
    return {
      trustState: "needs_verification",
      score: confidence,
      factors: {
        sourceType,
        sourceLabel: "Awaiting Review",
        hasSourceDocument: true,
        confidenceScore: confidence,
        hasReferenceRange,
        hasConflict: false,
        isHumanVerified: false,
      },
      badge: {
        label: "Needs Verification",
        variant: "amber",
        icon: "alert-circle",
      },
      summary: !hasReferenceRange
        ? "Source document omitted reference range. Review in Verification Inbox."
        : `Extraction confidence is ${confidence}%. Queued in Verification Inbox.`,
    };
  }

  return {
    trustState: "confirmed",
    score: confidence,
    factors: {
      sourceType,
      sourceLabel: "Extracted from Report",
      hasSourceDocument: true,
      confidenceScore: confidence,
      hasReferenceRange,
      hasConflict: false,
      isHumanVerified: false,
    },
    badge: {
      label: "Extracted from Report",
      variant: "teal",
      icon: "check-circle",
    },
    summary: `Extracted from source document with ${confidence}% confidence.`,
  };
}
