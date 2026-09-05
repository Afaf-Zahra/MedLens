import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { computeContentHash } from "@/lib/extractor";
import { getActiveSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    const { filename, rawText } = await req.json();
    const session = await getActiveSession();
    const patientId = session.patientId;
    const docs = db.getDocuments(patientId);

    const hash = computeContentHash(rawText || filename);
    const existingByHash = db.findDocumentByHash(patientId, hash);

    if (existingByHash) {
      return NextResponse.json({
        isDuplicate: true,
        reason: "Exact content hash match",
        existingDoc: existingByHash,
      });
    }

    const existingByName = docs.find(
      d => d.filename.toLowerCase() === (filename || "").toLowerCase()
    );

    if (existingByName) {
      return NextResponse.json({
        isDuplicate: true,
        reason: `A document named "${filename}" was already uploaded on ${existingByName.reportDate}.`,
        existingDoc: existingByName,
      });
    }

    return NextResponse.json({ isDuplicate: false });
  } catch (e) {
    return NextResponse.json({ error: "Duplicate check failed" }, { status: 500 });
  }
}
