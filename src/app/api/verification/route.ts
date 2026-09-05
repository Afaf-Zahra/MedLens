import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getActiveSession } from "@/lib/session";

export async function GET() {
  const session = await getActiveSession();
  const patientId = session.patientId;
  const items = db.getVerificationItems(patientId);
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  try {
    const session = await getActiveSession();
    const patientId = session.patientId;

    const body = await req.json();
    const {
      verificationId,
      action,
      targetType,
      targetId,
      editedValue,
    } = body;

    const verificationItem = db.getVerificationItemById(verificationId);

    if (action === "confirm") {
      if (targetType === "medication") {
        db.updateMedication(targetId, { verificationStatus: "confirmed" });
      } else if (targetType === "lab_result") {
        db.updateLabResult(targetId, { verificationState: "confirmed", verifiedByUser: true });
      } else if (targetType === "allergy") {
        db.updateAllergy(targetId, { verified: true });
      }
      if (verificationId) {
        db.updateVerificationItem(verificationId, { status: "resolved" });
      }

      db.logAudit({
        patientId,
        action: "FACT_CONFIRMED",
        targetType,
        targetId,
        newValue: "Confirmed by patient",
      });

      db.addTimelineEvent({
        id: `evt_ver_${Date.now()}`,
        patientId,
        eventDate: new Date().toISOString().split("T")[0],
        eventType: "medication_verified",
        title: "Medical Record Verified",
        description: `Patient verified ${targetType} record (${targetId}).`,
        category: "system",
        statusHighlight: "teal",
      });

      return NextResponse.json({ success: true, message: "Record confirmed." });
    }

    if (action === "edit") {
      let oldValue = "";
      if (targetType === "medication") {
        const current = db.getMedications(patientId).find(m => m.id === targetId);
        oldValue = current ? `${current.dose} ${current.unit}, ${current.frequency}` : "";
        db.updateMedication(targetId, {
          ...editedValue,
          verificationStatus: "edited",
        });
      } else if (targetType === "lab_result") {
        const current = db.getLabResultById(targetId);
        oldValue = current ? `${current.value} ${current.unit}` : "";
        db.updateLabResult(targetId, {
          ...editedValue,
          verificationState: "edited",
          verifiedByUser: true,
        });
      }

      if (verificationId) {
        db.updateVerificationItem(verificationId, { status: "resolved" });
      }

      db.logAudit({
        patientId,
        action: "FACT_EDITED_BY_PATIENT",
        targetType,
        targetId,
        oldValue,
        newValue: JSON.stringify(editedValue),
      });

      return NextResponse.json({ success: true, message: "Record corrected and verified." });
    }

    if (action === "reject") {
      if (targetType === "medication") {
        db.updateMedication(targetId, { verificationStatus: "rejected" });
      } else if (targetType === "lab_result") {
        db.updateLabResult(targetId, { verificationState: "rejected" });
      }

      if (verificationId) {
        db.updateVerificationItem(verificationId, { status: "resolved" });
      }

      db.logAudit({
        patientId,
        action: "FACT_REJECTED",
        targetType,
        targetId,
        newValue: "Rejected by patient",
      });

      return NextResponse.json({ success: true, message: "Record rejected." });
    }

    if (action === "dismiss" && verificationId) {
      db.updateVerificationItem(verificationId, { status: "dismissed" });
      return NextResponse.json({ success: true, message: "Item dismissed." });
    }

    return NextResponse.json({ error: "Invalid action or target" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: "Verification update failed" }, { status: 500 });
  }
}
