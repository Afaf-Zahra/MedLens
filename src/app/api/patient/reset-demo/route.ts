import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST() {
  const freshData = db.resetDemoData();
  return NextResponse.json({
    success: true,
    message: "Demo dataset reset to initial state successfully.",
    profile: freshData.patientProfiles[0],
  });
}
