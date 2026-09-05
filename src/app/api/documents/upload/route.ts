import { NextRequest, NextResponse } from "next/server";
import { db, MedicalDocument, LabResult, Medication, TimelineEvent, VerificationItem } from "@/lib/db";
import { extractStructuredData, computeContentHash, DetectedDocType } from "@/lib/extractor";
import { getActiveSession } from "@/lib/session";

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

    // Extract structured data
    const existingMeds = db.getMedications(patientId);
    const extraction = extractStructuredData(
      rawText,
      filename,
      docTypeOverride as DetectedDocType | undefined,
      existingMeds.length
    );

    const docId = `doc_${Date.now()}`;
    const newDoc: MedicalDocument = {
      id: docId,
      patientId,
      filename,
      fileType,
      docType: extraction.documentType,
      reportDate: extraction.reportDate,
      rawText,
      fileUrl: `/sample-reports/${filename}`,
      contentHash,
      uploadedAt: new Date().toISOString(),
      classificationConfidence: 98,
      summary: extraction.summary,
    };

    db.addDocument(newDoc);

    // Save Extracted Lab Results
    const createdLabs: LabResult[] = [];
    for (const item of extraction.labResults) {
      const lab: LabResult = {
        id: `lab_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        documentId: docId,
        patientId,
        testName: item.testName,
        value: item.value,
        unit: item.unit,
        refRangeLow: item.refRangeLow,
        refRangeHigh: item.refRangeHigh,
        refRangeText: item.refRangeText,
        status: item.status,
        statusExplanation: item.statusExplanation,
        confidence: item.confidence,
        verificationState: "pending",
        rawSnippet: item.rawSnippet,
        reportDate: extraction.reportDate,
        sourceDocumentName: filename,
        observation: item.observation,
      };
      db.addLabResult(lab);
      createdLabs.push(lab);
    }

    // Save Extracted Medications
    const createdMeds: Medication[] = [];
    for (const medItem of extraction.medications) {
      const med: Medication = {
        id: `med_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        patientId,
        name: medItem.name,
        dose: medItem.dose,
        unit: medItem.unit,
        frequency: medItem.frequency,
        date: extraction.reportDate,
        sourceDocumentId: docId,
        sourceDocumentName: filename,
        source: "extracted",
        confidence: medItem.confidence,
        verificationStatus: "pending",
        rawSnippet: medItem.rawSnippet,
      };
      db.addMedication(med);
      createdMeds.push(med);

      if (medItem.confidence < 85) {
        db.addVerificationItem({
          id: `ver_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          patientId,
          type: "unclear_dosage",
          title: `Verify Extracted Medication: ${medItem.name}`,
          description: `Dosage extracted with ${medItem.confidence}% confidence from ${filename}. Please confirm frequency.`,
          targetType: "medication",
          targetId: med.id,
          status: "pending",
          confidence: medItem.confidence,
          sourceSnippet: medItem.rawSnippet,
          sourceDocumentName: filename,
          createdAt: new Date().toISOString(),
        });
      }
    }

    // Check if missing context detected
    if (extraction.missingContextDetected) {
      db.addVerificationItem({
        id: `ver_ctx_${Date.now()}`,
        patientId,
        type: "missing_context",
        title: "Missing Clinical Context",
        description: extraction.missingContextDetected.description,
        targetType: "context",
        targetId: docId,
        status: "pending",
        confidence: 90,
        sourceSnippet: extraction.missingContextDetected.phrase,
        sourceDocumentName: filename,
        createdAt: new Date().toISOString(),
      });
    }

    // Register Living Medical Timeline Event
    const outOfRangeCount = createdLabs.filter(
      l => l.status === "low" || l.status === "high"
    ).length;

    const timelineEvent: TimelineEvent = {
      id: `evt_${Date.now()}`,
      patientId,
      eventDate: extraction.reportDate,
      eventType: "report_uploaded",
      title: `${extraction.documentType} Uploaded`,
      description: `${createdLabs.length} biomarker(s) extracted. ${outOfRangeCount > 0 ? `${outOfRangeCount} value(s) outside source ranges.` : "All values within source ranges."}`,
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
      newValue: `Uploaded ${filename} with ${createdLabs.length} labs and ${createdMeds.length} meds.`,
    });

    return NextResponse.json({
      success: true,
      document: newDoc,
      labResults: createdLabs,
      medications: createdMeds,
      summary: extraction.summary,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to process document. Please try again with a clear copy." },
      { status: 500 }
    );
  }
}
