import { NextRequest, NextResponse } from "next/server";
import { db, MedicalDocument, LabResult, Medication, TimelineEvent, VerificationItem } from "@/lib/db";
import { computeContentHash } from "@/lib/extractor";
import { extractMedicalDocumentWithGemini, isGeminiConfigured } from "@/lib/gemini";
import { getActiveSession } from "@/lib/session";
import type { DetectedDocType } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const session = await getActiveSession();
    const patientId = session.patientId;

    const body = await req.json();
    const {
      filename,
      rawText,
      fileType = "application/pdf",
      docTypeOverride,
      forceUpload = false,
    } = body;

    if (!filename || !rawText) {
      return NextResponse.json(
        { error: "Filename and document content are required" },
        { status: 400 }
      );
    }

    const contentHash = computeContentHash(rawText);

    // Duplicate check if not forced
    if (!forceUpload) {
      const existingDoc = db.findDocumentByHash(patientId, contentHash);
      if (existingDoc) {
        return NextResponse.json(
          {
            isDuplicate: true,
            message: `Possible duplicate document. This appears identical to ${existingDoc.filename} uploaded previously.`,
            existingDoc,
          },
          { status: 409 }
        );
      }
    }

    // Call Gemini multimodal document intelligence (with deterministic fallback)
    const extraction = await extractMedicalDocumentWithGemini({
      content: rawText,
      mimeType: fileType,
      filename,
      docTypeOverride: docTypeOverride as DetectedDocType | undefined,
    });

    const docId = `doc_${Date.now()}`;
    const newDoc: MedicalDocument = {
      id: docId,
      patientId,
      filename,
      fileType,
      docType: extraction.documentType,
      reportDate: extraction.documentDate || new Date().toISOString().split("T")[0],
      rawText: typeof rawText === "string" ? rawText.slice(0, 50000) : "",
      fileUrl: `/sample-reports/${filename}`,
      contentHash,
      uploadedAt: new Date().toISOString(),
      classificationConfidence: 98,
      summary: extraction.summary,
    };

    db.addDocument(newDoc);

    // Save Extracted Lab Results
    const createdLabs: LabResult[] = [];
    for (const item of extraction.tests) {
      const lab: LabResult = {
        id: `lab_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        documentId: docId,
        patientId,
        testName: item.testName,
        value: item.value,
        unit: item.unit,
        refRangeLow: item.refRangeLow,
        refRangeHigh: item.refRangeHigh,
        refRangeText: item.referenceRange || null,
        status: item.status,
        statusExplanation: item.statusExplanation || `Reported as ${item.value} ${item.unit}`,
        confidence: 95,
        verificationState: "pending",
        rawSnippet: item.rawSnippet,
        reportDate: extraction.documentDate || newDoc.reportDate,
        sourceDocumentName: filename,
        observation: item.observation,
      };
      db.addLabResult(lab);
      createdLabs.push(lab);
    }

    // Save Extracted Medications
    const createdMeds: Medication[] = [];
    for (const medItem of extraction.medicationsMentioned) {
      const med: Medication = {
        id: `med_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        patientId,
        name: medItem.name,
        dose: medItem.dose,
        unit: medItem.unit,
        frequency: medItem.frequency,
        date: extraction.documentDate || newDoc.reportDate,
        sourceDocumentId: docId,
        sourceDocumentName: filename,
        source: "extracted",
        confidence: 90,
        verificationStatus: "pending",
        rawSnippet: medItem.rawSnippet,
      };
      db.addMedication(med);
      createdMeds.push(med);
    }

    // Save Extracted Conditions if explicitly present
    if (extraction.conditionsMentioned && extraction.conditionsMentioned.length > 0) {
      for (const condItem of extraction.conditionsMentioned) {
        db.addCondition({
          id: `cond_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          patientId,
          condition: condItem.condition,
          diagnosedDate: extraction.documentDate || newDoc.reportDate,
          status: (condItem.status as any) || "active",
          source: "extracted",
          verified: false,
        });
      }
    }

    // Follow-up instructions verification item
    if (extraction.followUpInstructions && extraction.followUpInstructions.length > 0) {
      for (const followUp of extraction.followUpInstructions) {
        db.addVerificationItem({
          id: `ver_fup_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          patientId,
          type: "missing_context",
          title: "Follow-Up Instruction Found in Document",
          description: followUp.instruction,
          targetType: "context",
          targetId: docId,
          status: "pending",
          confidence: 95,
          sourceSnippet: followUp.rawSnippet,
          sourceDocumentName: filename,
          createdAt: new Date().toISOString(),
        });
      }
    }

    // Register Living Medical Timeline Event
    const outOfRangeCount = createdLabs.filter(
      (l) => l.status === "low" || l.status === "high"
    ).length;

    const timelineEvent: TimelineEvent = {
      id: `evt_${Date.now()}`,
      patientId,
      eventDate: extraction.documentDate || newDoc.reportDate,
      eventType: "report_uploaded",
      title: `${extraction.documentType} Uploaded`,
      description: `${createdLabs.length} biomarker(s) and ${createdMeds.length} medication(s) extracted with Google Gemini. ${
        outOfRangeCount > 0
          ? `${outOfRangeCount} value(s) outside documented reference ranges.`
          : "All values within documented reference ranges."
      }`,
      category: "labs",
      documentId: docId,
      badge: extraction.documentType,
      statusHighlight: outOfRangeCount > 0 ? "coral" : "teal",
    };
    db.addTimelineEvent(timelineEvent);

    // Audit log
    db.logAudit({
      patientId,
      action: "DOCUMENT_UPLOADED",
      targetType: "medical_document",
      targetId: docId,
      newValue: `Uploaded ${filename} with ${createdLabs.length} labs and ${createdMeds.length} meds. Powered by Gemini.`,
    });

    return NextResponse.json({
      success: true,
      document: newDoc,
      labResults: createdLabs,
      medications: createdMeds,
      summary: extraction.summary,
      geminiPowered: isGeminiConfigured(),
    });
  } catch (error) {
    console.error("Upload route error:", error);
    return NextResponse.json(
      { error: "Failed to process document. Please ensure the file is valid and readable." },
      { status: 500 }
    );
  }
}
