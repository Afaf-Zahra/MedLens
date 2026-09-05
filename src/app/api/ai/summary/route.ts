import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { runSafetyPipeline, MANDATORY_DISCLAIMER } from "@/lib/safety-pipeline";
import { getActiveSession } from "@/lib/session";

export async function GET() {
  const session = await getActiveSession();
  const patientId = session.patientId;
  const profile = session.profile;

  const docs = db.getDocuments(patientId);
  const labs = db.getLabResults(patientId);
  const meds = db.getMedications(patientId);
  const conditions = db.getConditions(patientId);
  const allergies = db.getAllergies(patientId);
  const verifications = db.getVerificationItems(patientId).filter(v => v.status === "pending");
  const conflicts = db.getConflicts(patientId).filter(c => c.status === "unresolved");

  const outOfRangeLabs = labs.filter(l => l.status === "low" || l.status === "high");
  const unclassifiedLabs = labs.filter(l => l.status === "range_not_provided");

  const sections = [
    {
      title: "Record Overview",
      content: docs.length > 0
        ? `The Living Medical Record for ${profile?.fullName || "Patient"} currently contains ${docs.length} uploaded medical documents spanning ${docs[docs.length - 1]?.reportDate || "earlier this year"} through ${docs[0]?.reportDate || "recent months"}. A total of ${labs.length} structured laboratory values and ${meds.length} medication entries have been cataloged with verifiable source provenance.`
        : `Patient profile established for ${profile?.fullName || "Patient"} with ${meds.length} patient-provided medication(s), ${conditions.length} condition(s), and ${allergies.length} allergy record(s). No laboratory documents uploaded yet.`,
    },
    {
      title: "Recent Reports",
      content: docs.length > 0
        ? docs.slice(0, 3).map(d => `• ${d.filename} (${d.reportDate}): Classified as ${d.docType}. ${d.summary || ""}`).join("\n")
        : "No laboratory documents uploaded yet. Upload reports to enable chronological comparison.",
    },
    {
      title: "Current Medications",
      content: meds.length > 0
        ? meds.map(m => `• ${m.name} (${m.dose} ${m.unit}, ${m.frequency}) — Source: ${m.source === "user_input" ? "Patient entered" : m.sourceDocumentName || "Report extraction"} [${m.verificationStatus.toUpperCase()}]`).join("\n")
        : "No active prescription medications recorded.",
    },
    {
      title: "Patient-Reported Conditions",
      content: conditions.length > 0
        ? conditions.map(c => `• ${c.condition} (Noted: ${c.diagnosedDate}, Status: ${c.status})`).join("\n")
        : "No pre-existing conditions recorded.",
    },
    {
      title: "Allergies & Inconsistencies",
      content: allergies.length > 0
        ? allergies.map(a => `• ${a.allergen} (${a.reaction || "No reaction documented"}). ${conflicts.length > 0 ? "⚠️ Note: Discrepancy detected with clinical intake note." : "Status confirmed."}`).join("\n")
        : "No allergies recorded.",
    },
    {
      title: "Values Outside Source Ranges",
      content: outOfRangeLabs.length > 0
        ? outOfRangeLabs.map(l => `• ${l.testName}: ${l.value} ${l.unit} (Source printed range: ${l.refRangeText || "Specified in report"}) — Marked ${l.status.toUpperCase()} strictly using document's printed interval.`).join("\n")
        : "No values currently outside their respective printed document ranges.",
    },
    {
      title: "Information Requiring Verification",
      content: verifications.length > 0
        ? `${verifications.length} item(s) are awaiting human verification in your Verification Inbox, including ${verifications.map(v => v.title).join("; ")}.`
        : "All extracted and patient-provided information has been confirmed.",
    }
  ];

  const combinedText = sections.map(s => `## ${s.title}\n${s.content}`).join("\n\n");
  const safetyResult = runSafetyPipeline(combinedText);

  return NextResponse.json({
    sections,
    isSafe: safetyResult.isSafe,
    disclaimer: MANDATORY_DISCLAIMER,
    generatedAt: new Date().toISOString(),
  });
}
