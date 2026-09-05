import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getActiveSession } from "@/lib/session";
import { detectConflictsWithGemini } from "@/lib/gemini";

export async function GET(req: NextRequest) {
  try {
    const session = await getActiveSession();
    const patientId = session.patientId;

    const docs = db.getDocuments(patientId);
    const allergies = db.getAllergies(patientId);
    const meds = db.getMedications(patientId);
    const labs = db.getLabResults(patientId);

    const conflicts = await detectConflictsWithGemini({
      documents: docs,
      allergies,
      medications: meds,
      labResults: labs,
    });

    return NextResponse.json({
      success: true,
      conflicts,
      count: conflicts.length,
    });
  } catch (err: any) {
    console.error("Conflict Detective API error:", err);
    return NextResponse.json(
      { error: "Failed to run Conflict Detective." },
      { status: 500 }
    );
  }
}
