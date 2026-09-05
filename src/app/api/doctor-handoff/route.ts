import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { MANDATORY_DISCLAIMER } from "@/lib/safety-pipeline";
import { getActiveSession } from "@/lib/session";
import { generateDoctorHandoffWithGemini, detectConflictsWithGemini, isGeminiConfigured } from "@/lib/gemini";

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

  const symptoms = db.getSymptoms(patientId);
  const conditions = db.getConditions(patientId);
  const allergies = db.getAllergies(patientId);
  const medications = db.getMedications(patientId);
  const documents = db.getDocuments(patientId);
  const labResults = db.getLabResults(patientId);
  const timeline = db.getTimelineEvents(patientId);

  const conflicts = await detectConflictsWithGemini({
    documents,
    allergies,
    medications,
    labResults,
  });

  const handoffData = await generateDoctorHandoffWithGemini({
    patientProfile: profile,
    documents,
    labResults,
    medications,
    allergies,
    conditions,
    conflicts,
  });

  return NextResponse.json({
    handoffTimestamp: new Date().toISOString(),
    patient: profile,
    demographics: {
      fullName: profile?.fullName,
      dob: profile?.dob,
      sex: profile?.sex,
      phone: profile?.phone,
      emergencyContact: profile?.emergencyContact,
    },
    summary: handoffData.summary,
    recentRecordChanges: handoffData.recentRecordChanges,
    documentedConditions: handoffData.documentedConditions,
    documentedMedications: handoffData.documentedMedications,
    recordedAllergies: handoffData.recordedAllergies,
    recentInvestigations: handoffData.recentInvestigations,
    longitudinalTrends: handoffData.longitudinalTrends,
    unresolvedConflicts: handoffData.unresolvedConflicts,
    followUpInstructionsFound: handoffData.followUpInstructionsFound,
    sourceDocuments: handoffData.sourceDocuments,
    coverage: handoffData.coverage,
    symptoms,
    timeline: timeline.slice(0, 10),
    disclaimer: MANDATORY_DISCLAIMER,
    geminiPowered: isGeminiConfigured(),
  });
}
