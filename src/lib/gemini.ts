/**
 * MEDLENS GOOGLE GEMINI SERVICE LAYER
 * Primary intelligence layer powered by Google Gemini (gemini-2.5-flash).
 * Strictly server-side: GEMINI_API_KEY is never exposed to client bundles.
 * All outputs pass through the MedLens Trust Engine and Safety Pipeline.
 */

import { GoogleGenAI } from "@google/genai";
import { runSafetyPipeline } from "./safety-pipeline";
import type {
  StructuredDocumentExtraction,
  DetectedDocType,
  EvidenceCoverage,
  GeminiExplanation,
  HealthStoryEvent,
  ConflictDetectiveItem,
  VisitPrepData,
  DoctorHandoffData,
  LabResult,
  Medication,
  MedicalDocument,
  Allergy,
  Condition,
  PatientProfile,
} from "./types";
import { classifyDocument, extractStructuredData } from "./extractor";
import { buildLongitudinalTrends, calculateEvidenceCoverage } from "./evidence-graph";

export const GEMINI_MODEL = "gemini-2.5-flash";

/**
 * Check if the Gemini API Key is configured on the server.
 */
export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0);
}

/**
 * Returns a configured Google GenAI client, or null if API key is absent.
 */
function getGenAIClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;
  try {
    return new GoogleGenAI({ apiKey });
  } catch (err) {
    console.error("Failed to initialize GoogleGenAI client:", err);
    return null;
  }
}

// -----------------------------------------------------------------------------
// FEATURE 1 & 15: MULTIMODAL MEDICAL DOCUMENT INTELLIGENCE
// -----------------------------------------------------------------------------

const EXTRACTION_SYSTEM_INSTRUCTION = `
You are the Google Gemini Medical Document Intelligence engine for MedLens.
Your goal is to extract strictly factual, structured medical information from the provided medical document.
CRITICAL SAFETY & NON-DIAGNOSTIC RULES:
1. Extract ONLY information explicitly stated in the document.
2. NEVER diagnose diseases or assume conditions not explicitly recorded by the clinician.
3. NEVER invent reference ranges, laboratory values, dates, or clinician names.
4. If a reference range is present in the document, extract it exactly.
5. If extraction is uncertain, set confidence lower and preserve original raw snippet.
6. Return valid JSON adhering to the specified schema.
`;

export async function extractMedicalDocumentWithGemini(params: {
  content: string | Buffer;
  mimeType: string;
  filename: string;
  docTypeOverride?: DetectedDocType;
}): Promise<StructuredDocumentExtraction> {
  const { content, mimeType, filename, docTypeOverride } = params;
  const client = getGenAIClient();

  // If Gemini is not configured, fall back to MedLens deterministic extractor
  if (!client) {
    console.warn("GEMINI_API_KEY not configured. Falling back to MedLens deterministic extractor.");
    return fallbackDeterministicExtraction(content, filename, docTypeOverride);
  }

  try {
    const contentsPayload: any[] = [];

    if (Buffer.isBuffer(content)) {
      contentsPayload.push({
        inlineData: {
          data: content.toString("base64"),
          mimeType,
        },
      });
      contentsPayload.push({
        text: `Analyze this medical document (${filename}). Extract all laboratory tests, values, units, reference intervals, medications, conditions, allergies, and follow-up instructions into the structured JSON schema.`,
      });
    } else if (typeof content === "string" && content.startsWith("data:")) {
      // Data URL from browser FileReader
      const matches = content.match(/^data:([a-zA-Z0-9/+-]+);base64,(.+)$/);
      if (matches) {
        const urlMime = matches[1];
        const base64Data = matches[2];
        contentsPayload.push({
          inlineData: {
            data: base64Data,
            mimeType: urlMime,
          },
        });
        contentsPayload.push({
          text: `Analyze this medical document (${filename}). Extract all tests, values, units, reference intervals, medications, conditions, allergies, and follow-up instructions into structured JSON.`,
        });
      } else {
        contentsPayload.push({
          text: `Document Name: ${filename}\n\nDocument Content:\n${content}\n\nExtract all tests, values, units, reference intervals, medications, conditions, allergies, and follow-up instructions into structured JSON.`,
        });
      }
    } else {
      contentsPayload.push({
        text: `Document Name: ${filename}\n\nDocument Content:\n${content}\n\nExtract all tests, values, units, reference intervals, medications, conditions, allergies, and follow-up instructions into structured JSON.`,
      });
    }

    const response = await client.models.generateContent({
      model: GEMINI_MODEL,
      contents: contentsPayload,
      config: {
        systemInstruction: EXTRACTION_SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
      },
    });

    const responseText = response.text?.trim() || "";
    if (!responseText) {
      throw new Error("Empty response received from Gemini.");
    }

    const parsed = JSON.parse(responseText);
    return sanitizeExtractedData(parsed, filename, docTypeOverride);
  } catch (error: any) {
    console.error("Gemini document extraction encountered an issue, using fallback:", error?.message || error);
    return fallbackDeterministicExtraction(content, filename, docTypeOverride);
  }
}

/**
 * Validates and sanitizes structured extraction to guarantee schema integrity.
 */
function sanitizeExtractedData(
  parsed: any,
  filename: string,
  docTypeOverride?: DetectedDocType
): StructuredDocumentExtraction {
  const docType: DetectedDocType = docTypeOverride || parsed.documentType || "General Laboratory Report";
  const docDate = parsed.documentDate || parsed.reportDate || new Date().toISOString().split("T")[0];

  const tests = Array.isArray(parsed.tests)
    ? parsed.tests.map((t: any) => {
        let status = "normal";
        if (t.status === "low" || t.status === "high" || t.status === "range_not_provided") {
          status = t.status;
        } else if (typeof t.value === "number" && t.refRangeLow != null && t.refRangeHigh != null) {
          if (t.value < t.refRangeLow) status = "low";
          else if (t.value > t.refRangeHigh) status = "high";
        }

        return {
          testName: String(t.testName || "Biomarker").trim(),
          value: t.value !== undefined ? t.value : "N/A",
          unit: String(t.unit || "").trim(),
          referenceRange: t.referenceRange ? String(t.referenceRange) : undefined,
          refRangeLow: typeof t.refRangeLow === "number" ? t.refRangeLow : null,
          refRangeHigh: typeof t.refRangeHigh === "number" ? t.refRangeHigh : null,
          status: status as any,
          statusExplanation: t.statusExplanation || `Reported as ${t.value} ${t.unit || ""}`,
          observation: t.observation ? String(t.observation) : undefined,
          rawSnippet: String(t.rawSnippet || `${t.testName} ${t.value} ${t.unit || ""}`).trim(),
          pageOrSection: t.pageOrSection ? String(t.pageOrSection) : undefined,
        };
      })
    : [];

  const medicationsMentioned = Array.isArray(parsed.medicationsMentioned)
    ? parsed.medicationsMentioned.map((m: any) => ({
        name: String(m.name || "Medication").trim(),
        dose: String(m.dose || "").trim(),
        unit: String(m.unit || "mg").trim(),
        frequency: String(m.frequency || "daily").trim(),
        rawSnippet: String(m.rawSnippet || `${m.name} ${m.dose || ""}`).trim(),
        status: m.status ? String(m.status) : undefined,
      }))
    : [];

  const conditionsMentioned = Array.isArray(parsed.conditionsMentioned)
    ? parsed.conditionsMentioned.map((c: any) => ({
        condition: String(c.condition || c.name || "").trim(),
        status: c.status ? String(c.status) : "active",
        rawSnippet: String(c.rawSnippet || c.condition || "").trim(),
      }))
    : [];

  const allergiesMentioned = Array.isArray(parsed.allergiesMentioned)
    ? parsed.allergiesMentioned.map((a: any) => ({
        allergen: String(a.allergen || a.name || "").trim(),
        reaction: a.reaction ? String(a.reaction) : undefined,
        rawSnippet: String(a.rawSnippet || a.allergen || "").trim(),
      }))
    : [];

  const followUpInstructions = Array.isArray(parsed.followUpInstructions)
    ? parsed.followUpInstructions.map((f: any) => ({
        instruction: String(f.instruction || f.text || "").trim(),
        timeline: f.timeline ? String(f.timeline) : undefined,
        rawSnippet: String(f.rawSnippet || f.instruction || "").trim(),
      }))
    : [];

  const rawSummary = parsed.summary || `Structured extraction completed for ${filename}.`;
  const safeSummary = runSafetyPipeline(rawSummary).sanitizedText;

  return {
    documentType: docType,
    documentDate: docDate,
    provider: parsed.provider ? String(parsed.provider) : undefined,
    tests,
    medicationsMentioned,
    conditionsMentioned,
    symptomsMentioned: Array.isArray(parsed.symptomsMentioned) ? parsed.symptomsMentioned : [],
    allergiesMentioned,
    followUpInstructions,
    proceduresMentioned: Array.isArray(parsed.proceduresMentioned) ? parsed.proceduresMentioned : [],
    relevantObservations: Array.isArray(parsed.relevantObservations) ? parsed.relevantObservations : [],
    summary: safeSummary,
  };
}

/**
 * Deterministic fallback extractor when Gemini is unconfigured or unavailable.
 */
function fallbackDeterministicExtraction(
  content: string | Buffer,
  filename: string,
  docTypeOverride?: DetectedDocType
): StructuredDocumentExtraction {
  const text = typeof content === "string" ? content : content.toString("utf-8");
  const extracted = extractStructuredData(text, filename, docTypeOverride);

  return {
    documentType: extracted.documentType,
    documentDate: extracted.reportDate,
    tests: extracted.labResults.map((l) => ({
      testName: l.testName,
      value: l.value,
      unit: l.unit,
      refRangeLow: l.refRangeLow,
      refRangeHigh: l.refRangeHigh,
      referenceRange: l.refRangeText || `${l.refRangeLow || ""} - ${l.refRangeHigh || ""}`,
      status: l.status,
      statusExplanation: l.statusExplanation,
      rawSnippet: l.rawSnippet,
      observation: l.observation,
    })),
    medicationsMentioned: extracted.medications.map((m) => ({
      name: m.name,
      dose: m.dose,
      unit: m.unit,
      frequency: m.frequency,
      rawSnippet: m.rawSnippet,
    })),
    conditionsMentioned: [],
    symptomsMentioned: [],
    allergiesMentioned: [],
    followUpInstructions: extracted.missingContextDetected
      ? [{ instruction: extracted.missingContextDetected.description, rawSnippet: extracted.missingContextDetected.phrase }]
      : [],
    proceduresMentioned: [],
    relevantObservations: [],
    summary: extracted.summary,
  };
}

// -----------------------------------------------------------------------------
// FEATURE 5: GEMINI ASK MY RECORDS (STRICT GROUNDING & SOURCE CITATIONS)
// -----------------------------------------------------------------------------

const ASK_RECORDS_SYSTEM_INSTRUCTION = `
You are MedLens Ask Records, an AI assistant powered by Google Gemini.
Your SOLE purpose is to answer questions strictly grounded in the patient's uploaded medical records provided below.
CRITICAL GROUNDING & SAFETY RULES:
1. ONLY answer using facts present in the provided medical records.
2. If the records do NOT contain enough information to answer reliably, say clearly:
   "I couldn't find enough information in your uploaded records to answer this reliably."
3. DO NOT fill gaps with general medical knowledge to invent patient-specific history.
4. If general educational context is helpful to explain medical terminology, provide it under a separate section labeled:
   "GENERAL INFORMATION — NOT FROM YOUR MEDICAL RECORD"
5. For every clinical fact, cite the specific source document name and date.
6. MedLens is strictly NON-DIAGNOSTIC. Never diagnose, never prescribe, never advise stopping or changing medications.
`;

export async function askRecordsWithGemini(params: {
  query: string;
  patientProfile: PatientProfile;
  documents: MedicalDocument[];
  labResults: LabResult[];
  medications: Medication[];
  allergies: Allergy[];
  conditions: Condition[];
}): Promise<{
  answer: string;
  generalInfo?: string;
  citations: { documentName: string; reportDate?: string; snippet: string }[];
  coverage: EvidenceCoverage;
}> {
  const { query, patientProfile, documents, labResults, medications, allergies, conditions } = params;
  const client = getGenAIClient();

  // If no records uploaded
  if (documents.length === 0 && labResults.length === 0 && medications.length === 0) {
    return {
      answer: "I couldn't find enough information in your uploaded records to answer this reliably. Please upload your medical reports first.",
      citations: [],
      coverage: "INSUFFICIENT EVIDENCE",
    };
  }

  // Format context cleanly
  const recordsSummary = `
PATIENT: ${patientProfile.fullName}, DOB: ${patientProfile.dob || "Not specified"}, Sex: ${patientProfile.sex}

DOCUMENTS ON FILE:
${documents.map((d) => `- ${d.filename} (${d.docType}, Date: ${d.reportDate})`).join("\n")}

RECORDED LAB MEASUREMENTS:
${labResults.map((l) => `- ${l.testName}: ${l.value} ${l.unit} [Range: ${l.refRangeText || `${l.refRangeLow}-${l.refRangeHigh}`}] (${l.status}) | Source: ${l.sourceDocumentName} (${l.reportDate})`).join("\n")}

DOCUMENTED MEDICATIONS:
${medications.map((m) => `- ${m.name} ${m.dose} ${m.frequency} | Source: ${m.sourceDocumentName || "Patient reported"}`).join("\n")}

ALLERGIES:
${allergies.map((a) => `- ${a.allergen} (${a.status})`).join("\n")}

CONDITIONS:
${conditions.map((c) => `- ${c.condition} (${c.status})`).join("\n")}
`;

  if (!client) {
    // Deterministic grounded response
    return fallbackAskRecords(query, recordsSummary, documents, labResults);
  }

  try {
    const response = await client.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        {
          text: `PATIENT MEDICAL RECORDS:\n${recordsSummary}\n\nUSER QUESTION:\n${query}\n\nProvide an evidence-grounded answer with source citations. If general educational context is included, place it under "GENERAL INFORMATION — NOT FROM YOUR MEDICAL RECORD".`,
        },
      ],
      config: {
        systemInstruction: ASK_RECORDS_SYSTEM_INSTRUCTION,
        temperature: 0.1, // High fidelity, minimal hallucination
      },
    });

    const fullText = response.text?.trim() || "";
    const sanitized = runSafetyPipeline(fullText).sanitizedText;

    // Separate general info if present
    let answer = sanitized;
    let generalInfo: string | undefined;

    const generalMarker = "GENERAL INFORMATION — NOT FROM YOUR MEDICAL RECORD";
    if (sanitized.includes(generalMarker)) {
      const parts = sanitized.split(generalMarker);
      answer = parts[0].trim();
      generalInfo = parts[1].replace(/^[:\s-]+/, "").trim();
    }

    // Extract citations matched to documents
    const citations: { documentName: string; reportDate?: string; snippet: string }[] = [];
    for (const doc of documents) {
      if (sanitized.toLowerCase().includes(doc.filename.toLowerCase())) {
        citations.push({
          documentName: doc.filename,
          reportDate: doc.reportDate,
          snippet: `Referenced in answer from ${doc.docType}.`,
        });
      }
    }

    if (citations.length === 0 && documents.length > 0) {
      citations.push({
        documentName: documents[0].filename,
        reportDate: documents[0].reportDate,
        snippet: "Derived from primary uploaded health record.",
      });
    }

    const coverage: EvidenceCoverage =
      citations.length >= 2
        ? "STRONG RECORD COVERAGE"
        : citations.length === 1
        ? "LIMITED RECORD COVERAGE"
        : "INSUFFICIENT EVIDENCE";

    return {
      answer,
      generalInfo,
      citations,
      coverage,
    };
  } catch (error) {
    console.error("Gemini Ask Records error, using deterministic fallback:", error);
    return fallbackAskRecords(query, recordsSummary, documents, labResults);
  }
}

function fallbackAskRecords(
  query: string,
  recordsSummary: string,
  documents: MedicalDocument[],
  labResults: LabResult[]
): {
  answer: string;
  generalInfo?: string;
  citations: { documentName: string; reportDate?: string; snippet: string }[];
  coverage: EvidenceCoverage;
} {
  const q = query.toLowerCase();
  const matchedLabs = labResults.filter((l) => q.includes(l.testName.toLowerCase()));

  if (matchedLabs.length > 0) {
    const lines = matchedLabs.map(
      (l) =>
        `- **${l.testName}**: ${l.value} ${l.unit} (${l.status}) recorded on ${l.reportDate} in *${l.sourceDocumentName}*.`
    );
    return {
      answer: `According to your uploaded records, here are the documented results for your inquiry:\n\n${lines.join(
        "\n"
      )}\n\n*MedLens summarizes recorded facts and does not provide clinical diagnosis.*`,
      citations: matchedLabs.map((l) => ({
        documentName: l.sourceDocumentName,
        reportDate: l.reportDate,
        snippet: l.rawSnippet,
      })),
      coverage: matchedLabs.length >= 2 ? "STRONG RECORD COVERAGE" : "LIMITED RECORD COVERAGE",
    };
  }

  return {
    answer:
      "I couldn't find enough information in your uploaded records to answer this reliably. MedLens only reports facts directly documented in your uploaded reports.",
    citations: [],
    coverage: "INSUFFICIENT EVIDENCE",
  };
}

// -----------------------------------------------------------------------------
// FEATURE 4: GEMINI "WHAT CHANGED?" LONGITUDINAL COMPARISON
// -----------------------------------------------------------------------------

export async function analyzeWhatChangedWithGemini(params: {
  previousDoc: MedicalDocument;
  latestDoc: MedicalDocument;
  labResults: LabResult[];
  medications: Medication[];
}): Promise<{
  comparisonNarrative: string;
  changes: {
    whatChanged: string;
    previousRecord: string;
    currentRecord: string;
    sourceDocuments: string[];
    coverage: EvidenceCoverage;
    category: "lab" | "medication" | "condition" | "general";
  }[];
}> {
  const { previousDoc, latestDoc, labResults, medications } = params;
  const client = getGenAIClient();

  const prevLabs = labResults.filter((l) => l.documentId === previousDoc.id);
  const currLabs = labResults.filter((l) => l.documentId === latestDoc.id);

  // Deterministic calculation of shifts
  const changesList: {
    whatChanged: string;
    previousRecord: string;
    currentRecord: string;
    sourceDocuments: string[];
    coverage: EvidenceCoverage;
    category: "lab" | "medication" | "condition" | "general";
  }[] = [];

  for (const curr of currLabs) {
    const prev = prevLabs.find(
      (p) => p.testName.toLowerCase() === curr.testName.toLowerCase()
    );
    if (prev) {
      const numPrev = parseFloat(String(prev.value));
      const numCurr = parseFloat(String(curr.value));
      if (!isNaN(numPrev) && !isNaN(numCurr) && numPrev !== numCurr) {
        const direction = numCurr > numPrev ? "increased" : "decreased";
        changesList.push({
          whatChanged: `${curr.testName} ${direction}`,
          previousRecord: `${prev.value} ${prev.unit} (${prev.status}) on ${prev.reportDate}`,
          currentRecord: `${curr.value} ${curr.unit} (${curr.status}) on ${curr.reportDate}`,
          sourceDocuments: [prev.sourceDocumentName, curr.sourceDocumentName],
          coverage: "STRONG RECORD COVERAGE",
          category: "lab",
        });
      }
    } else {
      changesList.push({
        whatChanged: `${curr.testName} newly documented`,
        previousRecord: "Not documented in previous report",
        currentRecord: `${curr.value} ${curr.unit} (${curr.status}) on ${curr.reportDate}`,
        sourceDocuments: [curr.sourceDocumentName],
        coverage: "LIMITED RECORD COVERAGE",
        category: "lab",
      });
    }
  }

  // Medication comparisons
  const prevMeds = medications.filter((m) => m.sourceDocumentId === previousDoc.id);
  const currMeds = medications.filter((m) => m.sourceDocumentId === latestDoc.id);
  for (const cm of currMeds) {
    if (!prevMeds.some((pm) => pm.name.toLowerCase() === cm.name.toLowerCase())) {
      changesList.push({
        whatChanged: `Medication newly documented: ${cm.name}`,
        previousRecord: "Not present in previous medication list",
        currentRecord: `${cm.name} ${cm.dose} ${cm.frequency}`,
        sourceDocuments: [latestDoc.filename],
        coverage: "LIMITED RECORD COVERAGE",
        category: "medication",
      });
    }
  }

  const deterministicNarrative = `Compared **${previousDoc.filename}** (${previousDoc.reportDate}) with **${latestDoc.filename}** (${latestDoc.reportDate}). Identified ${changesList.length} documented change(s). All observations reflect recorded values without diagnostic speculation.`;

  if (!client) {
    return {
      comparisonNarrative: deterministicNarrative,
      changes: changesList,
    };
  }

  try {
    const prompt = `
You are the MedLens Longitudinal Comparator powered by Google Gemini.
Compare these two patient records strictly on documented facts:
PREVIOUS RECORD: ${previousDoc.filename} (${previousDoc.reportDate}, ${previousDoc.docType})
CURRENT RECORD: ${latestDoc.filename} (${latestDoc.reportDate}, ${latestDoc.docType})

DOCUMENTED DELTAS:
${changesList.map((c) => `- ${c.whatChanged}: Previous (${c.previousRecord}) vs Current (${c.currentRecord})`).join("\n")}

Write a concise, objective, 2-3 sentence clinical summary describing WHAT CHANGED between these reports.
DO NOT diagnose the reason for the change (e.g. do NOT say "because of anemia"). State only what the documents say.
`;

    const res = await client.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ text: prompt }],
      config: { temperature: 0.1 },
    });

    const safeNarrative = runSafetyPipeline(res.text?.trim() || deterministicNarrative).sanitizedText;

    return {
      comparisonNarrative: safeNarrative,
      changes: changesList,
    };
  } catch (err) {
    console.error("Gemini What Changed error:", err);
    return {
      comparisonNarrative: deterministicNarrative,
      changes: changesList,
    };
  }
}

// -----------------------------------------------------------------------------
// FEATURE 6: GEMINI CONFLICT DETECTIVE
// -----------------------------------------------------------------------------

export async function detectConflictsWithGemini(params: {
  documents: MedicalDocument[];
  allergies: Allergy[];
  medications: Medication[];
  labResults: LabResult[];
}): Promise<ConflictDetectiveItem[]> {
  const { documents, allergies, medications, labResults } = params;
  const conflicts: ConflictDetectiveItem[] = [];

  // Deterministic checks
  // 1. Allergy conflicts (Active vs No Known Allergies)
  const activeAllergies = allergies.filter((a) => a.status === "active");
  const noKnown = allergies.filter((a) => a.status === "no_known");
  if (activeAllergies.length > 0 && noKnown.length > 0) {
    conflicts.push({
      id: "conflict_allergy_active_vs_nkda",
      title: "Allergy Documentation Discrepancy",
      category: "allergy",
      recordA: {
        sourceDocumentName: "Allergy Profile",
        reportDate: "Documented",
        statement: `Active allergy documented: ${activeAllergies[0].allergen}`,
      },
      recordB: {
        sourceDocumentName: "Clinical Record / Intake",
        reportDate: "Documented",
        statement: "No known drug allergies (NKDA) indicated",
      },
      status: "unresolved",
      systemNote: "These records appear inconsistent and may require clinical review. MedLens does not alter either record.",
    });
  }

  // 2. Medication dosage discrepancy across records
  const medMap = new Map<string, Medication[]>();
  for (const m of medications) {
    const key = m.name.toLowerCase().trim();
    if (!medMap.has(key)) medMap.set(key, []);
    medMap.get(key)!.push(m);
  }

  for (const [name, list] of medMap.entries()) {
    if (list.length >= 2) {
      const first = list[0];
      const second = list[1];
      if (first.dose !== second.dose || first.frequency !== second.frequency) {
        conflicts.push({
          id: `conflict_med_${name}`,
          title: `Differing Regimens Documented for ${first.name}`,
          category: "medication",
          recordA: {
            sourceDocumentName: first.sourceDocumentName || "Previous Record",
            reportDate: first.date || "Earlier",
            statement: `${first.name} ${first.dose} ${first.frequency}`,
            snippet: first.rawSnippet,
          },
          recordB: {
            sourceDocumentName: second.sourceDocumentName || "Subsequent Record",
            reportDate: second.date || "Recent",
            statement: `${second.name} ${second.dose} ${second.frequency}`,
            snippet: second.rawSnippet,
          },
          status: "unresolved",
          systemNote: "Differing dosages or frequencies detected between documents. Please verify current prescription with your doctor.",
        });
      }
    }
  }

  return conflicts;
}

// -----------------------------------------------------------------------------
// FEATURE 7: GEMINI PATIENT EXPLANATION ("EXPLAIN WITH GEMINI")
// -----------------------------------------------------------------------------

export async function explainClinicalTermWithGemini(params: {
  term: string;
  contextSnippet?: string;
  sourceDocumentName?: string;
}): Promise<GeminiExplanation> {
  const { term, contextSnippet = "", sourceDocumentName } = params;
  const client = getGenAIClient();

  const fallback: GeminiExplanation = {
    term,
    plainLanguageExplanation: `${term} is a medical parameter or clinical term referenced in your report.`,
    whyInRecords: "Standard clinical marker monitored during routine or investigative care.",
    whatPatientRecordSays: contextSnippet || `Referenced in ${sourceDocumentName || "your medical record"}.`,
    sourceDocumentName,
    sourceSnippet: contextSnippet,
    coverage: "LIMITED RECORD COVERAGE",
    nonDiagnosticDisclaimer:
      "MedLens explains medical terminology in plain language. This is educational and does not constitute a clinical diagnosis or treatment recommendation.",
  };

  if (!client) return fallback;

  try {
    const prompt = `
You are MedLens Clinical Explainer powered by Google Gemini.
Explain the following medical term that appears in the patient's record:
TERM: "${term}"
PATIENT RECORD SNIPPET: "${contextSnippet}"
SOURCE DOCUMENT: "${sourceDocumentName || "Medical Report"}"

Respond with valid JSON containing:
{
  "plainLanguageExplanation": "Simple 1-2 sentence explanation of what this test or term means in non-medical words.",
  "whyInRecords": "Why clinicians typically measure or document this marker in routine or diagnostic care.",
  "whatPatientRecordSays": "Exact factual statement of what this patient's document actually says about this term, without diagnostic conclusions."
}

CRITICAL: Do not diagnose the patient. Do not give treatment advice.
`;

    const res = await client.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ text: prompt }],
      config: {
        responseMimeType: "application/json",
        temperature: 0.1,
      },
    });

    const parsed = JSON.parse(res.text?.trim() || "{}");
    return {
      term,
      plainLanguageExplanation: runSafetyPipeline(parsed.plainLanguageExplanation || fallback.plainLanguageExplanation).sanitizedText,
      whyInRecords: runSafetyPipeline(parsed.whyInRecords || fallback.whyInRecords).sanitizedText,
      whatPatientRecordSays: runSafetyPipeline(parsed.whatPatientRecordSays || fallback.whatPatientRecordSays).sanitizedText,
      sourceDocumentName,
      sourceSnippet: contextSnippet,
      coverage: "LIMITED RECORD COVERAGE",
      nonDiagnosticDisclaimer: fallback.nonDiagnosticDisclaimer,
    };
  } catch (err) {
    console.error("Gemini explanation error:", err);
    return fallback;
  }
}

// -----------------------------------------------------------------------------
// FEATURE 8: GEMINI HEALTH STORY (FLAGSHIP CHRONOLOGICAL TIMELINE)
// -----------------------------------------------------------------------------

export async function generateHealthStoryWithGemini(params: {
  patientProfile: PatientProfile;
  documents: MedicalDocument[];
  labResults: LabResult[];
  medications: Medication[];
  conditions: Condition[];
}): Promise<HealthStoryEvent[]> {
  const { patientProfile, documents, labResults, medications, conditions } = params;

  if (documents.length === 0) {
    return [];
  }

  // Sort documents chronologically
  const sortedDocs = [...documents].sort((a, b) => {
    return new Date(a.reportDate).getTime() - new Date(b.reportDate).getTime();
  });

  const client = getGenAIClient();
  const events: HealthStoryEvent[] = [];

  for (const doc of sortedDocs) {
    const docLabs = labResults.filter((l) => l.documentId === doc.id);
    const docMeds = medications.filter((m) => m.sourceDocumentId === doc.id);

    const findings = [
      ...docLabs.slice(0, 4).map((l) => `${l.testName}: ${l.value} ${l.unit} (${l.status})`),
      ...docMeds.slice(0, 2).map((m) => `${m.name} ${m.dose} ${m.frequency}`),
    ];

    events.push({
      id: `story_${doc.id}`,
      date: doc.reportDate,
      displayDate: new Date(doc.reportDate).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
        day: "numeric",
      }),
      title: `${doc.docType} Record`,
      category: doc.docType === "Prescription" ? "medications" : "labs",
      findings: findings.length > 0 ? findings : ["Document recorded into MedLens."],
      narrative: `Record documented on ${doc.reportDate}. Contained ${docLabs.length} laboratory finding(s) and ${docMeds.length} prescription directive(s).`,
      sourceDocuments: [doc.filename],
      documentId: doc.id,
      coverage: "LIMITED RECORD COVERAGE",
    });
  }

  // If Gemini client available, enhance the narrative with grounded summaries
  if (client && events.length > 0) {
    try {
      const prompt = `
You are the MedLens Health Story narrator powered by Google Gemini.
Synthesize these ${events.length} chronological medical records into a factual patient journey.
Each story milestone must be strictly grounded in the document findings.
Do NOT diagnose or invent events.
DOCUMENTS:
${events.map((e) => `- Date: ${e.date}, Title: ${e.title}, Findings: ${e.findings.join(", ")}`).join("\n")}

Return JSON array of narrative objects:
[
  {
    "date": "YYYY-MM-DD",
    "narrative": "A concise, objective 2-sentence clinical narrative of what was recorded at this milestone."
  }
]
`;
      const res = await client.models.generateContent({
        model: GEMINI_MODEL,
        contents: [{ text: prompt }],
        config: { responseMimeType: "application/json", temperature: 0.1 },
      });
      const parsed = JSON.parse(res.text?.trim() || "[]");
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          const match = events.find((e) => e.date === item.date);
          if (match && item.narrative) {
            match.narrative = runSafetyPipeline(item.narrative).sanitizedText;
          }
        }
      }
    } catch (err) {
      console.error("Gemini Health Story enhancement error:", err);
    }
  }

  return events;
}

// -----------------------------------------------------------------------------
// FEATURE 11: GEMINI VISIT PREP
// -----------------------------------------------------------------------------

export async function generateVisitPrepWithGemini(params: {
  patientProfile: PatientProfile;
  documents: MedicalDocument[];
  labResults: LabResult[];
  medications: Medication[];
  allergies: Allergy[];
  conflicts: ConflictDetectiveItem[];
}): Promise<VisitPrepData> {
  const { patientProfile, documents, labResults, medications, allergies, conflicts } = params;
  const client = getGenAIClient();

  const outOfRange = labResults.filter((l) => l.status === "low" || l.status === "high");
  const trends = buildLongitudinalTrends(labResults);

  const fallbackQuestions = [
    outOfRange.length > 0
      ? `Can you review my recent ${outOfRange[0].testName} result of ${outOfRange[0].value} ${outOfRange[0].unit}?`
      : "Are there any routine screening tests recommended for my age group?",
    medications.length > 0
      ? `Should I continue taking ${medications[0].name} at the current frequency?`
      : "What preventive measures do you recommend based on my records?",
    conflicts.length > 0
      ? "Can we clarify my documented allergy records?"
      : "When should I schedule my next follow-up visit?",
  ];

  const recentChanges = trends
    .filter((t) => t.hasSufficientData)
    .slice(0, 3)
    .map((t) => {
      const prev = t.points[t.points.length - 2];
      const curr = t.points[t.points.length - 1];
      return {
        whatChanged: `${t.displayName} shift`,
        detail: `Shifted from ${prev.value} ${t.unit} to ${curr.value} ${t.unit}.`,
        sourceDocument: curr.documentName,
      };
    });

  const basePrep: VisitPrepData = {
    patientName: patientProfile.fullName,
    summary: `Visit preparation sheet generated from ${documents.length} verified patient document(s). Non-diagnostic.`,
    recentRecordChanges: recentChanges,
    unresolvedConflicts: conflicts.map((c) => ({ title: c.title, detail: c.systemNote })),
    recentInvestigations: labResults.slice(0, 6).map((l) => ({
      testName: l.testName,
      value: l.value,
      unit: l.unit,
      status: l.status,
      date: l.reportDate,
      sourceDocument: l.sourceDocumentName,
    })),
    followUpInstructions: documents
      .filter((d) => d.docType === "Discharge Summary")
      .map((d) => ({
        instruction: "Follow-up instructions documented in discharge summary.",
        sourceDocument: d.filename,
        date: d.reportDate,
      })),
    documentsToBring: documents.map((d) => `${d.filename} (${d.reportDate})`),
    suggestedQuestions: fallbackQuestions,
    coverage: documents.length >= 2 ? "STRONG RECORD COVERAGE" : "LIMITED RECORD COVERAGE",
  };

  if (!client) return basePrep;

  try {
    const prompt = `
You are the MedLens Clinical Visit Preparation Assistant powered by Google Gemini.
Generate 4-5 focused, thoughtful questions that the patient may want to discuss with their clinician.
CRITICAL RULES:
1. Frame strictly as: "Questions you may want to discuss with your clinician."
2. DO NOT diagnose or recommend treatments or medication changes.
3. Ground the questions directly in their recent findings and shifts:
Recent Labs: ${labResults.slice(0, 5).map((l) => `${l.testName}: ${l.value} ${l.unit} (${l.status})`).join(", ")}
Medications: ${medications.map((m) => m.name).join(", ")}
Allergies: ${allergies.map((a) => a.allergen).join(", ")}

Return JSON array of questions: ["Question 1", "Question 2", "Question 3"]
`;
    const res = await client.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ text: prompt }],
      config: { responseMimeType: "application/json", temperature: 0.1 },
    });
    const parsed = JSON.parse(res.text?.trim() || "[]");
    if (Array.isArray(parsed) && parsed.length > 0) {
      basePrep.suggestedQuestions = parsed.map((q) => runSafetyPipeline(String(q)).sanitizedText);
    }
    return basePrep;
  } catch (err) {
    console.error("Gemini Visit Prep error:", err);
    return basePrep;
  }
}

// -----------------------------------------------------------------------------
// FEATURE 12: GEMINI DOCTOR HANDOFF
// -----------------------------------------------------------------------------

export async function generateDoctorHandoffWithGemini(params: {
  patientProfile: PatientProfile;
  documents: MedicalDocument[];
  labResults: LabResult[];
  medications: Medication[];
  allergies: Allergy[];
  conditions: Condition[];
  conflicts: ConflictDetectiveItem[];
}): Promise<DoctorHandoffData> {
  const { patientProfile, documents, labResults, medications, allergies, conditions, conflicts } = params;
  const client = getGenAIClient();

  const trends = buildLongitudinalTrends(labResults);
  const longitudinalTrends = trends
    .filter((t) => t.hasSufficientData)
    .map((t) => {
      const prev = t.points[t.points.length - 2];
      const curr = t.points[t.points.length - 1];
      return {
        biomarker: t.displayName,
        trendDescription: `Shifted from ${prev.value} ${t.unit} (${prev.date}) to ${curr.value} ${t.unit} (${curr.date}).`,
        sourceDates: [prev.date, curr.date],
      };
    });

  const baseHandoff: DoctorHandoffData = {
    patientName: patientProfile.fullName,
    generatedDate: new Date().toISOString().split("T")[0],
    summary: `Longitudinal medical record summary synthesized from ${documents.length} verified source document(s). Provided as an evidence index for clinical consultation.`,
    recentRecordChanges: longitudinalTrends.map((t) => `${t.biomarker}: ${t.trendDescription}`),
    documentedConditions: conditions.map((c) => ({
      condition: c.condition,
      status: c.status,
      source: c.source === "extracted" ? "Extracted Report" : "Patient Intake",
      date: c.diagnosedDate,
    })),
    documentedMedications: medications.map((m) => ({
      name: m.name,
      dose: m.dose,
      frequency: m.frequency,
      source: m.sourceDocumentName || "Patient Input",
      date: m.date,
    })),
    recordedAllergies: allergies.map((a) => ({
      allergen: a.allergen,
      reaction: a.reaction,
      source: a.source === "extracted" ? "Extracted Report" : "Patient Input",
    })),
    recentInvestigations: labResults.slice(0, 8).map((l) => ({
      testName: l.testName,
      value: l.value,
      unit: l.unit,
      status: l.status,
      date: l.reportDate,
      source: l.sourceDocumentName,
    })),
    longitudinalTrends,
    unresolvedConflicts: conflicts.map((c) => `${c.title}: ${c.systemNote}`),
    followUpInstructionsFound: documents
      .filter((d) => d.docType === "Discharge Summary")
      .map((d) => `Discharge summary (${d.reportDate}): instructions recorded.`),
    sourceDocuments: documents.map((d) => ({
      filename: d.filename,
      date: d.reportDate,
      docType: d.docType,
    })),
    coverage: documents.length >= 2 ? "STRONG RECORD COVERAGE" : "LIMITED RECORD COVERAGE",
  };

  if (!client) return baseHandoff;

  try {
    const prompt = `
You are the MedLens Clinical Handoff Synthesizer powered by Google Gemini.
Write an objective, non-diagnostic 2-3 sentence executive clinical summary for a consulting physician.
Facts on file:
Patient: ${patientProfile.fullName}, DOB: ${patientProfile.dob}
Recent labs: ${labResults.slice(0, 4).map((l) => `${l.testName} ${l.value} ${l.unit}`).join(", ")}
Medications: ${medications.map((m) => m.name).join(", ")}
Source documents count: ${documents.length}
`;
    const res = await client.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ text: prompt }],
      config: { temperature: 0.1 },
    });
    if (res.text) {
      baseHandoff.summary = runSafetyPipeline(res.text.trim()).sanitizedText;
    }
    return baseHandoff;
  } catch (err) {
    console.error("Gemini Doctor Handoff error:", err);
    return baseHandoff;
  }
}
