import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { MANDATORY_DISCLAIMER } from "@/lib/safety-pipeline";
import { getActiveSession } from "@/lib/session";

export async function GET() {
  const session = await getActiveSession();
  const patientId = session.patientId;
  const profile = session.profile;

  const docs = db.getDocuments(patientId);
  const labs = db.getLabResults(patientId);
  const meds = db.getMedications(patientId);
  const verifications = db.getVerificationItems(patientId).filter(v => v.status === "pending");
  const conflicts = db.getConflicts(patientId).filter(c => c.status === "unresolved");

  const outOfRangeLabs = labs.filter(l => l.status === "low" || l.status === "high");
  const unclassifiedLabs = labs.filter(l => l.status === "range_not_provided");

  const suggestedQuestions: { category: string; question: string; sourceDoc: string }[] = [];

  if (outOfRangeLabs.length > 0) {
    const firstOut = outOfRangeLabs[0];
    suggestedQuestions.push({
      category: "Laboratory Ranges",
      question: `In my ${firstOut.sourceDocumentName} report, ${firstOut.testName} was printed at ${firstOut.value} ${firstOut.unit}, which falls outside the lab's printed range (${firstOut.refRangeText}). What follow-up timeline do you advise for repeat testing?`,
      sourceDoc: firstOut.sourceDocumentName,
    });
  }

  if (unclassifiedLabs.length > 0) {
    const firstUnclass = unclassifiedLabs[0];
    suggestedQuestions.push({
      category: "Missing Range Verification",
      question: `My ${firstUnclass.testName} test reported ${firstUnclass.value} ${firstUnclass.unit}, but the testing laboratory omitted a reference interval on the release copy. What target threshold do you recommend for my demographic?`,
      sourceDoc: firstUnclass.sourceDocumentName,
    });
  }

  if (meds.length > 0) {
    suggestedQuestions.push({
      category: "Medication Reconciliation",
      question: `My profile lists ${meds.map(m => `${m.name} (${m.dose} ${m.unit})`).join(", ")}. Could we review whether my current dosing schedule remains aligned with my latest lab trends?`,
      sourceDoc: meds[0].sourceDocumentName || "Patient Profile",
    });
  }

  if (conflicts.length > 0) {
    suggestedQuestions.push({
      category: "Allergy Inconsistency",
      question: `MedLens detected a conflict between my onboarding statement ('${conflicts[0].fieldA}') and a previous clinical record noting '${conflicts[0].fieldB}'. Could we document an allergy reconciliation?`,
      sourceDoc: conflicts[0].sourceB,
    });
  }

  const visitItems = {
    patientName: profile?.fullName || "Patient",
    dob: profile?.dob || "Unspecified",
    totalDocumentsToDiscuss: docs.slice(0, 3).map(d => ({
      name: d.filename,
      date: d.reportDate,
      type: d.docType,
    })),
    outOfRangeFindings: outOfRangeLabs.map(l => ({
      testName: l.testName,
      value: `${l.value} ${l.unit}`,
      sourceRange: l.refRangeText,
      status: l.status.toUpperCase(),
      sourceDoc: l.sourceDocumentName,
    })),
    unclassifiedFindings: unclassifiedLabs.map(l => ({
      testName: l.testName,
      value: `${l.value} ${l.unit}`,
      reason: "Reference range omitted in source report",
      sourceDoc: l.sourceDocumentName,
    })),
    medicationsAwaitingReview: meds.filter(m => m.verificationStatus === "pending").map(m => ({
      name: m.name,
      dose: `${m.dose} ${m.unit}`,
      frequency: m.frequency,
      sourceDoc: m.sourceDocumentName || "Report",
    })),
    unresolvedConflicts: conflicts.map(c => ({
      title: c.title,
      discrepancy: `"${c.fieldA}" vs "${c.fieldB}"`,
    })),
    suggestedQuestions,
    disclaimer: MANDATORY_DISCLAIMER,
  };

  return NextResponse.json(visitItems);
}
