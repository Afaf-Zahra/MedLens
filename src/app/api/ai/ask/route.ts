import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { evaluateQuerySafety, MANDATORY_DISCLAIMER } from "@/lib/safety-pipeline";
import { getActiveSession } from "@/lib/session";
import { askRecordsWithGemini, isGeminiConfigured } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json();

    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    // Safety gate: Refuse diagnostic / prescriptive questions
    const safetyCheck = evaluateQuerySafety(query);
    if (safetyCheck.isRefusalRequired) {
      return NextResponse.json({
        answer: safetyCheck.safeResponse,
        citations: [],
        refusal: true,
        disclaimer: MANDATORY_DISCLAIMER,
        coverage: "INSUFFICIENT EVIDENCE",
        geminiPowered: isGeminiConfigured(),
      });
    }

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
    const allergies = db.getAllergies(patientId);
    const conditions = db.getConditions(patientId);

    // Call Gemini Grounded Ask Records engine
    const result = await askRecordsWithGemini({
      query: query.trim(),
      patientProfile,
      documents: docs,
      labResults: labs,
      medications: meds,
      allergies,
      conditions,
    });

    return NextResponse.json({
      answer: result.answer,
      generalInfo: result.generalInfo || null,
      citations: result.citations,
      coverage: result.coverage,
      refusal: false,
      disclaimer: MANDATORY_DISCLAIMER,
      geminiPowered: isGeminiConfigured(),
    });
  } catch (err: any) {
    console.error("Ask Records API error:", err);
    return NextResponse.json(
      { error: "MedLens couldn't process this question right now. Your records remain safe." },
      { status: 500 }
    );
  }
}
