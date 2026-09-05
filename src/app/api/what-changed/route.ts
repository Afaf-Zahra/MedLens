import { NextRequest, NextResponse } from "next/server";
import { db, LabResult } from "@/lib/db";
import { getActiveSession } from "@/lib/session";
import { analyzeWhatChangedWithGemini } from "@/lib/gemini";
import { buildWhySeeingThisData } from "@/lib/evidence-graph";

export interface TestComparisonItem {
  testName: string;
  unit: string;
  previous: {
    reportDate: string;
    documentName: string;
    value: number | string;
    status: string;
    refRangeText: string;
  } | null;
  latest: {
    reportDate: string;
    documentName: string;
    value: number | string;
    status: string;
    refRangeText: string;
  };
  delta: number | null;
  direction: "up" | "down" | "unchanged" | "non_numeric";
  statusShift: "normalized" | "diverged" | "unchanged" | "unclassified";
  trendHistory: {
    date: string;
    value: number;
    documentName: string;
  }[];
}

export async function GET(req: NextRequest) {
  const session = await getActiveSession();
  const patientId = session.patientId;
  const searchParams = req.nextUrl.searchParams;
  const docTypeFilter = searchParams.get("docType") || "CBC";

  const allDocs = db.getDocuments(patientId);
  const matchingDocs = allDocs
    .filter((d) => d.docType.toLowerCase() === docTypeFilter.toLowerCase())
    .sort((a, b) => new Date(a.reportDate).getTime() - new Date(b.reportDate).getTime());

  const allLabs = db.getLabResults(patientId);
  const allMeds = db.getMedications(patientId);

  if (matchingDocs.length === 0) {
    const labDocs = allDocs
      .filter((d) => d.docType !== "Prescription")
      .sort((a, b) => new Date(a.reportDate).getTime() - new Date(b.reportDate).getTime());

    if (labDocs.length === 0) {
      return NextResponse.json({
        availableDocs: [],
        comparisons: [],
        safeSummary:
          "No laboratory reports currently available for longitudinal comparison. Upload medical reports to begin tracking biomarkers across time.",
        geminiChanges: [],
      });
    }
  }

  const latestDoc = matchingDocs[matchingDocs.length - 1] || allDocs[0];
  const previousDoc = matchingDocs.length >= 2 ? matchingDocs[matchingDocs.length - 2] : null;

  const latestLabs = allLabs.filter((l) => l.documentId === latestDoc?.id);
  const previousLabs = previousDoc ? allLabs.filter((l) => l.documentId === previousDoc.id) : [];

  const comparisons: TestComparisonItem[] = [];

  for (const latestLab of latestLabs) {
    const prevMatch = previousLabs.find(
      (p) => p.testName.toLowerCase() === latestLab.testName.toLowerCase()
    );

    const latestNum = typeof latestLab.value === "number" ? latestLab.value : parseFloat(latestLab.value);
    const prevNum = prevMatch
      ? typeof prevMatch.value === "number"
        ? prevMatch.value
        : parseFloat(prevMatch.value)
      : null;

    let delta: number | null = null;
    let direction: "up" | "down" | "unchanged" | "non_numeric" = "non_numeric";
    let statusShift: "normalized" | "diverged" | "unchanged" | "unclassified" = "unchanged";

    if (prevNum !== null && !isNaN(prevNum) && !isNaN(latestNum)) {
      delta = parseFloat((latestNum - prevNum).toFixed(2));
      if (delta > 0) direction = "up";
      else if (delta < 0) direction = "down";
      else direction = "unchanged";

      if ((prevMatch?.status === "low" || prevMatch?.status === "high") && latestLab.status === "normal") {
        statusShift = "normalized";
      } else if (prevMatch?.status === "normal" && (latestLab.status === "low" || latestLab.status === "high")) {
        statusShift = "diverged";
      } else if (latestLab.status === "range_not_provided" || prevMatch?.status === "range_not_provided") {
        statusShift = "unclassified";
      } else {
        statusShift = "unchanged";
      }
    }

    const biomarkerHistory = allLabs
      .filter((l) => l.testName.toLowerCase() === latestLab.testName.toLowerCase())
      .sort((a, b) => new Date(a.reportDate).getTime() - new Date(b.reportDate).getTime())
      .map((l) => ({
        date: l.reportDate,
        value: typeof l.value === "number" ? l.value : parseFloat(l.value) || 0,
        documentName: l.sourceDocumentName,
      }));

    comparisons.push({
      testName: latestLab.testName,
      unit: latestLab.unit,
      previous: prevMatch
        ? {
            reportDate: prevMatch.reportDate,
            documentName: prevMatch.sourceDocumentName,
            value: prevMatch.value,
            status: prevMatch.status,
            refRangeText: prevMatch.refRangeText || "Not provided in source",
          }
        : null,
      latest: {
        reportDate: latestLab.reportDate,
        documentName: latestLab.sourceDocumentName,
        value: latestLab.value,
        status: latestLab.status,
        refRangeText: latestLab.refRangeText || "Not provided in source",
      },
      delta,
      direction,
      statusShift,
      trendHistory: biomarkerHistory,
    });
  }

  let safeSummary = "";
  let geminiChanges: any[] = [];

  if (previousDoc && latestDoc) {
    const geminiAnalysis = await analyzeWhatChangedWithGemini({
      previousDoc,
      latestDoc,
      labResults: allLabs,
      medications: allMeds,
    });
    safeSummary = geminiAnalysis.comparisonNarrative;
    geminiChanges = geminiAnalysis.changes;
  } else if (latestDoc) {
    safeSummary = `One ${latestDoc?.docType || "report"} (${latestDoc?.filename}) is currently recorded with ${latestLabs.length} structured tests. Upload a follow-up or prior report to see side-by-side longitudinal changes.`;
  }

  const whySeeingThis = previousDoc && latestDoc
    ? buildWhySeeingThisData({
        title: `What Changed: ${previousDoc.filename} vs ${latestDoc.filename}`,
        supportingDocuments: [
          { documentName: previousDoc.filename, date: previousDoc.reportDate },
          { documentName: latestDoc.filename, date: latestDoc.reportDate },
        ],
        reasoning: "Comparative analysis of matching laboratory measurements across sequential dates.",
        isComparison: true,
      })
    : null;

  return NextResponse.json({
    latestDoc,
    previousDoc,
    availableDocTypes: Array.from(new Set(allDocs.map((d) => d.docType))),
    comparisons,
    safeSummary,
    geminiChanges,
    whySeeingThis,
  });
}
