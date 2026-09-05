import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { MANDATORY_DISCLAIMER } from "@/lib/safety-pipeline";
import { getActiveSession } from "@/lib/session";
import { generateVisitPrepWithGemini, detectConflictsWithGemini, isGeminiConfigured } from "@/lib/gemini";

export async function GET() {
  const session = await getActiveSession();
  const patientId = session.patientId;
  const profile = session.profile || {
    id: patientId,
    userId: session.userId,
    fullName: "Patient",
    dob: "",
    sex: "Other",
    phone: "",
    emergencyContact: "",
    isPrivacyMode: false,
    isOnboarded: true,
  };

  const docs = db.getDocuments(patientId);
  const labs = db.getLabResults(patientId);
  const meds = db.getMedications(patientId);
  const allergies = db.getAllergies(patientId);

  const conflicts = await detectConflictsWithGemini({
    documents: docs,
    allergies,
    medications: meds,
    labResults: labs,
  });

  const visitPrepData = await generateVisitPrepWithGemini({
    patientProfile: profile,
    documents: docs,
    labResults: labs,
    medications: meds,
    allergies,
    conflicts,
  });

  const outOfRangeLabs = labs.filter((l) => l.status === "low" || l.status === "high");
  const unclassifiedLabs = labs.filter((l) => l.status === "range_not_provided");

  return NextResponse.json({
    patientName: profile?.fullName || "Patient",
    dob: profile?.dob || "Unspecified",
    summary: visitPrepData.summary,
    totalDocumentsToDiscuss: docs.slice(0, 5).map((d) => ({
      name: d.filename,
      date: d.reportDate,
      type: d.docType,
    })),
    recentRecordChanges: visitPrepData.recentRecordChanges,
    outOfRangeFindings: outOfRangeLabs.map((l) => ({
      testName: l.testName,
      value: `${l.value} ${l.unit}`,
      sourceRange: l.refRangeText || `${l.refRangeLow || ""} - ${l.refRangeHigh || ""}`,
      status: l.status.toUpperCase(),
      sourceDoc: l.sourceDocumentName,
    })),
    unclassifiedFindings: unclassifiedLabs.map((l) => ({
      testName: l.testName,
      value: `${l.value} ${l.unit}`,
      reason: "Reference range omitted in source report",
      sourceDoc: l.sourceDocumentName,
    })),
    medicationsAwaitingReview: meds
      .filter((m) => m.verificationStatus === "pending")
      .map((m) => ({
        name: m.name,
        dose: `${m.dose} ${m.unit}`,
        frequency: m.frequency,
        sourceDoc: m.sourceDocumentName || "Report",
      })),
    unresolvedConflicts: visitPrepData.unresolvedConflicts,
    suggestedQuestions: visitPrepData.suggestedQuestions.map((q) => ({
      category: "Clinician Discussion",
      question: q,
      sourceDoc: "Patient Records Summary",
    })),
    followUpInstructions: visitPrepData.followUpInstructions,
    coverage: visitPrepData.coverage,
    disclaimer: MANDATORY_DISCLAIMER,
    geminiPowered: isGeminiConfigured(),
  });
}
