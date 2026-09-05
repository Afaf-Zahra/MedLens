import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { evaluateQuerySafety, MANDATORY_DISCLAIMER } from "@/lib/safety-pipeline";
import { getActiveSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json();

    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    const safetyCheck = evaluateQuerySafety(query);
    if (safetyCheck.isRefusalRequired) {
      return NextResponse.json({
        answer: safetyCheck.safeResponse,
        citations: [],
        refusal: true,
        disclaimer: MANDATORY_DISCLAIMER,
      });
    }

    const session = await getActiveSession();
    const patientId = session.patientId;
    const docs = db.getDocuments(patientId);
    const labs = db.getLabResults(patientId);
    const meds = db.getMedications(patientId);
    const verifications = db.getVerificationItems(patientId).filter(v => v.status === "pending");
    const conditions = db.getConditions(patientId);
    const allergies = db.getAllergies(patientId);

    const qLower = query.toLowerCase();
    let answer = "";
    const citations: { documentName: string; reportDate: string; snippet: string }[] = [];

    // Query 1: Latest CBC
    if (qLower.includes("cbc") || qLower.includes("complete blood count")) {
      const cbcDocs = docs.filter(d => d.docType === "CBC");
      if (cbcDocs.length > 0) {
        const latestCBC = cbcDocs[0];
        const cbcLabs = labs.filter(l => l.documentId === latestCBC.id);
        answer = `Your latest Complete Blood Count (CBC) was performed on ${latestCBC.reportDate} from document "${latestCBC.filename}". It contains ${cbcLabs.length} structured tests: ${cbcLabs.map(l => `${l.testName}: ${l.value} ${l.unit} (${l.status.toUpperCase()})`).join(", ")}.`;
        citations.push({
          documentName: latestCBC.filename,
          reportDate: latestCBC.reportDate,
          snippet: `Specimen Date: ${latestCBC.reportDate} | Test: COMPLETE BLOOD COUNT WITH DIFFERENTIAL`,
        });
      } else {
        answer = "No CBC reports found in your record. You can upload your CBC laboratory document using the 'Add Record' button.";
      }
    }
    // Query 2: Hemoglobin history
    else if (qLower.includes("hemoglobin")) {
      const hgbLabs = labs.filter(l => l.testName.toLowerCase().includes("hemoglobin"));
      if (hgbLabs.length > 0) {
        const historyText = hgbLabs
          .map(
            l =>
              `• ${l.reportDate}: ${l.value} ${l.unit} (${l.status.toUpperCase()} vs printed range ${l.refRangeText}) [Source: ${l.sourceDocumentName}]`
          )
          .join("\n");
        answer = `Here is your recorded Hemoglobin history across ${hgbLabs.length} report(s):\n${historyText}`;
        hgbLabs.forEach(l => {
          citations.push({
            documentName: l.sourceDocumentName,
            reportDate: l.reportDate,
            snippet: l.rawSnippet,
          });
        });
      } else {
        answer = "No Hemoglobin records found in your uploaded documents.";
      }
    }
    // Query 3: Thyroid tests
    else if (qLower.includes("thyroid") || qLower.includes("tsh")) {
      const thyroidLabs = labs.filter(
        l => l.testName.toLowerCase().includes("thyroid") || l.testName.toLowerCase().includes("tsh") || l.testName.toLowerCase().includes("ft4")
      );
      const thyroidDocs = docs.filter(d => d.docType === "Thyroid Profile");
      if (thyroidLabs.length > 0) {
        answer = `Your records include ${thyroidLabs.length} thyroid-related test(s) from ${thyroidDocs.map(d => d.filename).join(", ")}:\n` +
          thyroidLabs.map(l => `• ${l.testName}: ${l.value} ${l.unit} (${l.status.toUpperCase()} vs source range ${l.refRangeText})`).join("\n");
        thyroidLabs.forEach(l => {
          citations.push({
            documentName: l.sourceDocumentName,
            reportDate: l.reportDate,
            snippet: l.rawSnippet,
          });
        });
      } else {
        answer = "No thyroid test records found in your documents.";
      }
    }
    // Query 4: Verification items
    else if (qLower.includes("verification") || qLower.includes("review") || qLower.includes("pending")) {
      if (verifications.length > 0) {
        answer = `You currently have ${verifications.length} item(s) awaiting review in your Verification Inbox:\n` +
          verifications.map((v, i) => `${i + 1}. ${v.title}: ${v.description} (Source: ${v.sourceDocumentName || "Record Intake"})`).join("\n");
        verifications.forEach(v => {
          if (v.sourceDocumentName) {
            citations.push({
              documentName: v.sourceDocumentName,
              reportDate: "Pending Review",
              snippet: v.sourceSnippet || v.description,
            });
          }
        });
      } else {
        answer = "All extracted and patient-provided information has been verified. No pending items remain in your Verification Inbox.";
      }
    }
    // Query 5: Medications
    else if (qLower.includes("medication") || qLower.includes("medicine") || qLower.includes("drug")) {
      if (meds.length > 0) {
        answer = `Your current medications in MedLens:\n` +
          meds.map(m => `• ${m.name} (${m.dose} ${m.unit}, ${m.frequency}) — Provenance: ${m.source === "user_input" ? "Patient entered" : `Extracted from ${m.sourceDocumentName}`} (${m.confidence}% extraction confidence)`).join("\n");
        meds.forEach(m => {
          if (m.sourceDocumentName && m.rawSnippet) {
            citations.push({
              documentName: m.sourceDocumentName,
              reportDate: m.date,
              snippet: m.rawSnippet,
            });
          }
        });
      } else {
        answer = "No active medications recorded in your profile.";
      }
    }
    // Query 6: Values outside source ranges
    else if (qLower.includes("outside") || qLower.includes("high") || qLower.includes("low") || qLower.includes("abnormal")) {
      const outOfRange = labs.filter(l => l.status === "low" || l.status === "high");
      if (outOfRange.length > 0) {
        answer = `The following ${outOfRange.length} test result(s) were outside the laboratory's printed reference range in their respective source reports:\n` +
          outOfRange.map(l => `• ${l.testName} (${l.reportDate}): ${l.value} ${l.unit} [Classified ${l.status.toUpperCase()} because printed source range is ${l.refRangeText}] — Source: ${l.sourceDocumentName}`).join("\n") +
          "\n\nRemember: MedLens flags these strictly based on the printed range in each document, not as a diagnostic determination.";
        outOfRange.forEach(l => {
          citations.push({
            documentName: l.sourceDocumentName,
            reportDate: l.reportDate,
            snippet: l.rawSnippet,
          });
        });
      } else {
        answer = "None of your uploaded test results are currently outside their document reference ranges.";
      }
    }
    // Generic fallback
    else {
      answer = `Based on your records in MedLens, your profile has ${docs.length} uploaded medical documents, ${labs.length} structured laboratory results, and ${meds.length} recorded medications. You can ask me specific questions like "When was my latest CBC?", "Show my hemoglobin history", or "Which values were outside their source ranges?".`;
    }

    return NextResponse.json({
      answer,
      citations,
      refusal: false,
      disclaimer: MANDATORY_DISCLAIMER,
    });
  } catch (err) {
    return NextResponse.json({ error: "Failed to process question" }, { status: 500 });
  }
}
