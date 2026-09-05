import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const doc = db.getDocumentById(id);
  if (!doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const patientId = doc.patientId;
  const labs = db.getLabResults(patientId).filter(l => l.documentId === id);
  const meds = db.getMedications(patientId).filter(m => m.sourceDocumentId === id);

  return NextResponse.json({
    document: doc,
    labResults: labs,
    medications: meds,
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const doc = db.getDocumentById(id);
  if (!doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const success = db.deleteDocument(id);
  db.logAudit({
    patientId: doc.patientId,
    action: "DOCUMENT_DELETED",
    targetType: "medical_document",
    targetId: id,
    oldValue: doc.filename,
  });

  return NextResponse.json({ success });
}
