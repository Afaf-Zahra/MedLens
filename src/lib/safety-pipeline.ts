/**
 * MEDLENS SAFETY PIPELINE
 * Multi-stage safety verification ensuring no AI-generated content makes diagnoses,
 * prescribes medications, recommends dosages, or asserts clinical assumptions.
 */

const FORBIDDEN_PATTERNS = [
  /\byou have\b/i,
  /\byou are suffering from\b/i,
  /\byou may be suffering from\b/i,
  /\bdiagnosed with\b/i,
  /\bthis proves\b/i,
  /\btake this medication\b/i,
  /\bincrease your dose\b/i,
  /\bdecrease your dose\b/i,
  /\bstop taking\b/i,
  /\byou should stop\b/i,
  /\bprescribe\b/i,
  /\btreatment plan\b/i,
  /\bprobability of disease\b/i,
  /\bsurvival rate\b/i,
  /\byou need surgery\b/i,
  /\bemergency medical condition\b/i,
  /\bdefinitely indicates\b/i,
];

export interface SafetyCheckResult {
  isSafe: boolean;
  violations: string[];
  sanitizedText: string;
  mandatoryDisclaimer: string;
}

export const MANDATORY_DISCLAIMER =
  "MedLens organizes available medical information and does not provide diagnosis or treatment recommendations. The original reports and clinical consultations remain your source of truth.";

/**
 * Validates text against safety rules and sanitizes any potential diagnostic or prescriptive phrases.
 */
export function runSafetyPipeline(rawContent: string): SafetyCheckResult {
  const violations: string[] = [];
  let sanitized = rawContent;

  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(sanitized)) {
      const match = sanitized.match(pattern)?.[0] || "forbidden term";
      violations.push(`Diagnostic/prescriptive phrase detected: "${match}"`);

      // Automatic re-phrasing / replacement
      sanitized = sanitized.replace(
        pattern,
        "[Note: MedLens is non-diagnostic; discussion with physician recommended]"
      );
    }
  }

  // Ensure prompt injections or hidden chains of thought are filtered out
  sanitized = sanitized.replace(/```thinking[\s\S]*?```/gi, "").trim();
  sanitized = sanitized.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

  return {
    isSafe: violations.length === 0,
    violations,
    sanitizedText: sanitized,
    mandatoryDisclaimer: MANDATORY_DISCLAIMER,
  };
}

/**
 * Evaluates patient queries in Ask My Records to detect diagnostic/prescriptive requests
 * and produce a polite, safe, record-grounded redirection.
 */
export function evaluateQuerySafety(userQuery: string): {
  isRefusalRequired: boolean;
  safeResponse?: string;
  category?: "diagnosis" | "medication_advice" | "dosage_change" | "general_medical";
} {
  const query = userQuery.toLowerCase().trim();

  const diagnosticQuestions = [
    "do i have",
    "am i suffering from",
    "is it cancer",
    "is it diabetes",
    "do i have anemia",
    "why am i sick",
    "what disease",
    "could this be",
  ];

  const prescriptiveQuestions = [
    "what medicine should i take",
    "which medicine",
    "should i stop",
    "should i increase",
    "should i decrease",
    "can i take",
    "how much should i take",
    "cure for",
  ];

  for (const phrase of diagnosticQuestions) {
    if (query.includes(phrase)) {
      return {
        isRefusalRequired: true,
        category: "diagnosis",
        safeResponse:
          "MedLens cannot diagnose medical conditions or predict illnesses. I can only organize the facts contained in your uploaded records, show where each value came from, and compare past test results for your upcoming doctor visit.",
      };
    }
  }

  for (const phrase of prescriptiveQuestions) {
    if (query.includes(phrase)) {
      return {
        isRefusalRequired: true,
        category: "medication_advice",
        safeResponse:
          "MedLens cannot recommend medications, alter dosages, or advise on treatment plans. Please consult your prescribing healthcare provider before starting, stopping, or changing any medication.",
      };
    }
  }

  return {
    isRefusalRequired: false,
  };
}
