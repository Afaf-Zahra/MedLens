import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { DEMO_PATIENT_ID, DEMO_USER_ID, getActiveSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const currentSession = await getActiveSession();

    // If explicit mode requested, use it; otherwise toggle
    const targetMode = body.mode || (currentSession.isDemoMode ? "real" : "demo");

    const response = NextResponse.json({
      success: true,
      mode: targetMode,
      isDemoMode: targetMode === "demo",
    });

    if (targetMode === "demo") {
      response.cookies.set("medlens_mode", "demo", { path: "/" });
      response.cookies.set("medlens_patient_id", DEMO_PATIENT_ID, { path: "/" });
      response.cookies.set("medlens_user_id", DEMO_USER_ID, { path: "/" });
    } else {
      response.cookies.set("medlens_mode", "real", { path: "/" });
      // Find or keep real patient ID
      const nonDemo = db.getNonDemoProfiles();
      if (nonDemo.length > 0) {
        response.cookies.set("medlens_patient_id", nonDemo[0].id, { path: "/" });
        response.cookies.set("medlens_user_id", nonDemo[0].userId, { path: "/" });
      } else {
        response.cookies.delete("medlens_patient_id");
        response.cookies.delete("medlens_user_id");
      }
    }

    return response;
  } catch (err) {
    return NextResponse.json({ error: "Failed to toggle demo mode" }, { status: 500 });
  }
}
