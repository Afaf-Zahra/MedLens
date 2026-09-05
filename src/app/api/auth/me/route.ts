import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getActiveSession } from "@/lib/session";

export async function GET() {
  const session = await getActiveSession();
  const profile = session.profile;
  const readiness = profile ? db.calculateRecordReadiness(profile.id) : null;

  return NextResponse.json({
    authenticated: true,
    user: session.user,
    profile,
    isOnboarded: session.isOnboarded,
    isDemoMode: session.isDemoMode,
    readiness,
  });
}
