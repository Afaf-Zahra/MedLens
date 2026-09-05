import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getActiveSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    const session = await getActiveSession();
    const patientId = session.patientId;
    const profile = db.getProfileById(patientId);
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const newPrivacyMode = !profile.isPrivacyMode;
    db.updateProfile(profile.id, { isPrivacyMode: newPrivacyMode });
    db.logAudit({
      patientId: profile.id,
      action: "PRIVACY_MODE_TOGGLED",
      targetType: "patient_profile",
      targetId: profile.id,
      newValue: `Privacy mode set to ${newPrivacyMode}`,
    });

    return NextResponse.json({ success: true, isPrivacyMode: newPrivacyMode });
  } catch (err) {
    return NextResponse.json({ error: "Failed to toggle privacy mode" }, { status: 500 });
  }
}
