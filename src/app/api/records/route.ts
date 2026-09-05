import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getActiveSession } from "@/lib/session";

export async function GET() {
  const session = await getActiveSession();
  const patientId = session.patientId;
  const profile = session.profile;

  if (!profile || !session.isOnboarded) {
    return NextResponse.json({
      patient: null,
      symptoms: [],
      conditions: [],
      allergies: [],
      medications: [],
      documents: [],
      labResults: [],
      verificationItems: [],
      conflicts: [],
      timelineEvents: [],
      readiness: { score: 0, breakdown: [] },
      isOnboarded: false,
      isDemoMode: false,
    });
  }

  const symptoms = db.getSymptoms(patientId);
  const conditions = db.getConditions(patientId);
  const allergies = db.getAllergies(patientId);
  const medications = db.getMedications(patientId);
  const documents = db.getDocuments(patientId);
  const labResults = db.getLabResults(patientId);
  const verificationItems = db.getVerificationItems(patientId);
  const conflicts = db.getConflicts(patientId);
  const timelineEvents = db.getTimelineEvents(patientId);
  const readiness = db.calculateRecordReadiness(patientId);

  return NextResponse.json({
    patient: profile,
    symptoms,
    conditions,
    allergies,
    medications,
    documents,
    labResults,
    verificationItems,
    conflicts,
    timelineEvents,
    readiness,
    isOnboarded: session.isOnboarded,
    isDemoMode: session.isDemoMode,
  });
}
