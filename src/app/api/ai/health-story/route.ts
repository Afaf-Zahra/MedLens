import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getActiveSession } from "@/lib/session";
import { generateHealthStoryWithGemini, isGeminiConfigured } from "@/lib/gemini";

export async function GET(req: NextRequest) {
  try {
    const session = await getActiveSession();
    const patientId = session.patientId;

    const patientProfile = session.profile || db.getProfileById(patientId) || {
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
    const conditions = db.getConditions(patientId);

    const storyEvents = await generateHealthStoryWithGemini({
      patientProfile,
      documents: docs,
      labResults: labs,
      medications: meds,
      conditions,
    });

    return NextResponse.json({
      success: true,
      events: storyEvents,
      geminiPowered: isGeminiConfigured(),
    });
  } catch (err: any) {
    console.error("Health Story API error:", err);
    return NextResponse.json(
      { error: "Failed to generate health story." },
      { status: 500 }
    );
  }
}
