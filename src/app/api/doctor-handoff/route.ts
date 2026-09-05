import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { MANDATORY_DISCLAIMER } from "@/lib/safety-pipeline";
import { getActiveSession } from "@/lib/session";

export async function GET() {
  const session = await getActiveSession();
  const patientId = session.patientId;
  const profile = session.profile;

  const symptoms = db.getSymptoms(patientId);
  const conditions = db.getConditions(patientId);
  const allergies = db.getAllergies(patientId);
  const medications = db.getMedications(patientId);
  const documents = db.getDocuments(patientId);
  const labResults = db.getLabResults(patientId);
  const conflicts = db.getConflicts(patientId);
  const verificationItems = db.getVerificationItems(patientId).filter(v => v.status === "pending");
  const timeline = db.getTimelineEvents(patientId);

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
    symptoms,
    conditions,
    allergies,
    medications,
    recentDocuments: documents.slice(0, 5),
    labResults,
    outOfRangeLabResults: labResults.filter(l => l.status === "low" || l.status === "high"),
    unclassifiedLabResults: labResults.filter(l => l.status === "range_not_provided"),
    activeConflicts: conflicts.filter(c => c.status === "unresolved"),
    pendingVerifications: verificationItems,
    timeline: timeline.slice(0, 10),
    disclaimer: MANDATORY_DISCLAIMER,
  });
}
