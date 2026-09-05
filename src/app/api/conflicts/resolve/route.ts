import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getActiveSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    const session = await getActiveSession();
    const patientId = session.patientId;

    const { conflictId, choice, notes } = await req.json();

    const conflict = db.getConflicts(patientId).find(c => c.id === conflictId);
    if (!conflict) {
      return NextResponse.json({ error: "Conflict not found" }, { status: 404 });
    }

    if (choice === "keep_profile") {
      db.updateConflict(conflictId, {
        status: "resolved",
        resolutionNotes: `Patient resolved conflict: Kept profile value ("${conflict.fieldA}"). Notes: ${notes || "No additional notes"}`,
        resolvedAt: new Date().toISOString(),
      });
      const allergies = db.getAllergies(patientId);
      if (allergies[0]) {
        db.updateAllergy(allergies[0].id, { verified: true });
      }
    } else if (choice === "use_document") {
      db.updateConflict(conflictId, {
        status: "resolved",
        resolutionNotes: `Patient resolved conflict: Adopted document value ("${conflict.fieldB}"). Notes: ${notes || "No additional notes"}`,
        resolvedAt: new Date().toISOString(),
      });
      const allergies = db.getAllergies(patientId);
      if (allergies[0]) {
        db.updateAllergy(allergies[0].id, {
          allergen: "Penicillin",
          reaction: "Cutaneous urticaria / rash reported 2021",
          status: "active",
          verified: true,
        });
      }
    } else if (choice === "unresolved") {
      db.updateConflict(conflictId, {
        status: "unresolved",
        resolutionNotes: `Marked unresolved for clinical follow-up: ${notes || ""}`,
      });
    }

    const verItem = db.getVerificationItems(patientId).find(v => v.type === "allergy_conflict");
    if (verItem && choice !== "unresolved") {
      db.updateVerificationItem(verItem.id, { status: "resolved" });
    }

    db.logAudit({
      patientId,
      action: "CONFLICT_RESOLVED",
      targetType: "conflict",
      targetId: conflictId,
      newValue: `Choice: ${choice}. Notes: ${notes || "none"}`,
    });

    db.addTimelineEvent({
      id: `evt_cnf_${Date.now()}`,
      patientId,
      eventDate: new Date().toISOString().split("T")[0],
      eventType: "conflict_resolved",
      title: "Data Conflict Resolved",
      description: `Patient resolved discrepancy regarding ${conflict.title}. (${choice})`,
      category: "system",
      statusHighlight: "teal",
    });

    return NextResponse.json({ success: true, message: "Conflict resolution updated." });
  } catch (err) {
    return NextResponse.json({ error: "Failed to resolve conflict" }, { status: 500 });
  }
}
