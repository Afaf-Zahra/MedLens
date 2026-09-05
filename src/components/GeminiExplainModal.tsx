"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  BookOpen,
  FileText,
  AlertCircle,
  X,
  Loader2,
  ShieldAlert,
} from "lucide-react";
import type { GeminiExplanation } from "@/lib/types";

interface GeminiExplainModalProps {
  term: string | null;
  contextSnippet?: string;
  sourceDocumentName?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function GeminiExplainModal({
  term,
  contextSnippet = "",
  sourceDocumentName,
  isOpen,
  onClose,
}: GeminiExplainModalProps) {
  const [loading, setLoading] = useState(false);
  const [explanation, setExplanation] = useState<GeminiExplanation | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && term) {
      fetchExplanation(term, contextSnippet, sourceDocumentName);
    } else {
      setExplanation(null);
      setError(null);
    }
  }, [isOpen, term]);

  const fetchExplanation = async (termToExplain: string, snippet: string, docName?: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          term: termToExplain,
          contextSnippet: snippet,
          sourceDocumentName: docName,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to explain term.");
      setExplanation(data.explanation);
    } catch (err: any) {
      setError(err.message || "Unable to explain this term right now.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !term) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 my-8">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5 text-teal-700" />
            </div>
            <div>
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-teal-50 text-teal-800 border border-teal-200 rounded">
                Google Gemini Medical Intelligence
              </span>
              <h3 className="text-base font-semibold text-slate-900 mt-0.5">
                Explain with Gemini
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="py-4 space-y-4">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-400">Medical Term</span>
            <h4 className="text-base font-bold text-slate-900 mt-0.5">{term}</h4>
            {sourceDocumentName && (
              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span>Found in {sourceDocumentName}</span>
              </p>
            )}
          </div>

          {loading ? (
            <div className="py-8 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-teal-700 animate-spin mx-auto" />
              <p className="text-xs text-slate-500">
                Translating clinical terminology with Google Gemini...
              </p>
            </div>
          ) : error ? (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Notice</p>
                <p>{error}</p>
              </div>
            </div>
          ) : explanation ? (
            <div className="space-y-3.5 text-xs">
              {/* Plain-language explanation */}
              <div className="p-3.5 rounded-xl bg-teal-50/50 border border-teal-200/70 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-900 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-teal-700" />
                  Plain-Language Explanation
                </span>
                <p className="text-slate-800 text-xs leading-relaxed">
                  {explanation.plainLanguageExplanation}
                </p>
              </div>

              {/* Why this term may appear in records */}
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Why this appears in medical records
                </span>
                <p className="text-slate-700 text-[11px] leading-relaxed">
                  {explanation.whyInRecords}
                </p>
              </div>

              {/* What this patient's document actually says */}
              <div className="p-3 rounded-lg bg-slate-900 text-slate-100 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  What your record specifically states
                </span>
                <p className="font-mono text-xs text-teal-300">
                  {explanation.whatPatientRecordSays}
                </p>
              </div>

              {/* Non-diagnostic notice */}
              <div className="p-2.5 rounded-lg bg-slate-100 border border-slate-200 text-[10px] text-slate-600 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-slate-500 shrink-0" />
                <span>
                  {explanation.nonDiagnosticDisclaimer}
                </span>
              </div>
            </div>
          ) : null}

          {/* Action */}
          <div className="flex items-center justify-end pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-md text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
