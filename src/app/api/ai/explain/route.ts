import { NextRequest, NextResponse } from "next/server";
import { explainClinicalTermWithGemini } from "@/lib/gemini";
import { getActiveSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    await getActiveSession();
    const body = await req.json();
    const { term, contextSnippet, sourceDocumentName } = body;

    if (!term || typeof term !== "string") {
      return NextResponse.json(
        { error: "Clinical term is required." },
        { status: 400 }
      );
    }

    const explanation = await explainClinicalTermWithGemini({
      term: term.trim(),
      contextSnippet: contextSnippet ? String(contextSnippet).slice(0, 1000) : undefined,
      sourceDocumentName: sourceDocumentName ? String(sourceDocumentName) : undefined,
    });

    return NextResponse.json({
      success: true,
      explanation,
    });
  } catch (err: any) {
    console.error("Clinical term explainer error:", err);
    return NextResponse.json(
      { error: "Failed to generate plain-language explanation." },
      { status: 500 }
    );
  }
}
