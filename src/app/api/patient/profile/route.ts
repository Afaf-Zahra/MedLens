import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getActiveSession } from "@/lib/session";

export async function GET() {
  const session = await getActiveSession();
  const profile = session.profile;
  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }
  const readiness = db.calculateRecordReadiness(profile.id);
  return NextResponse.json({ profile, readiness });
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getActiveSession();
    const patientId = session.patientId;
    const body = await req.json();
    const updated = db.updateProfile(patientId, body);
    db.logAudit({
      patientId,
      action: "PROFILE_UPDATED",
      targetType: "patient_profile",
      targetId: patientId,
      newValue: JSON.stringify(body),
    });
    return NextResponse.json({ success: true, profile: updated });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
