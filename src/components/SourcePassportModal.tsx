"use client";

import React, { useState } from "react";
import {
  FileText,
  Calendar,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ExternalLink,
  X,
  Sparkles,
  Info,
  BookOpen,
} from "lucide-react";
import type { LabResult, Medication, EvidenceCoverage } from "@/lib/types";
import { getWhyMarkedExplanation } from "@/lib/reference-range";
import { GeminiExplainModal } from "./GeminiExplainModal";
import { WhySeeingThisModal } from "./WhySeeingThisModal";
import { buildWhySeeingThisData } from "@/lib/evidence-graph";

interface SourcePassportModalProps {
  item: LabResult | Medication | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenSideBySide?: (item: any) => void;
}

export function SourcePassportModal({
  item,
  isOpen,
  onClose,
  onOpenSideBySide,
}: SourcePassportModalProps) {
  const [showExplain, setShowExplain] = useState(false);
  const [showWhySeeingThis, setShowWhySeeingThis] = useState(false);

  if (!isOpen || !item) return null;

  const isLab = "testName" in item;
  const name = isLab ? item.testName : item.name;
  const value = isLab ? `${item.value} ${item.unit}` : `${item.dose} ${item.unit}`;
  const docName = isLab ? item.sourceDocumentName : item.sourceDocumentName || "Patient Intake";
  const reportDate = isLab ? item.reportDate : (item.date || "Recent");
  const rawSnippet = item.rawSnippet || "Snippet preserved in original record.";

  // Evidence Coverage Label determination
  const hasRange = isLab ? Boolean(item.refRangeText || (item.refRangeLow != null && item.refRangeHigh != null)) : true;
  let evidenceLabel = "Document extracted";
  let coverageBadge: { label: string; bg: string; text: string } = {
    label: "Limited Record Coverage",
    bg: "bg-teal-50 border-teal-200",
    text: "text-teal-800",
  };

  if (!hasRange) {
    evidenceLabel = "Needs verification (Missing Range)";
    coverageBadge = {
      label: "Needs Verification",
      bg: "bg-amber-50 border-amber-200",
      text: "text-amber-800",
    };
  } else if (!isLab && item.source === "user_input") {
    evidenceLabel = "Patient provided";
    coverageBadge = {
      label: "Patient Provided",
      bg: "bg-teal-50 border-teal-200",
      text: "text-teal-800",
    };
  }

  const whyExplanation = isLab
    ? getWhyMarkedExplanation({
      testName: item.testName,
      value: item.value,
      unit: item.unit,
      status: item.status,
      refRangeLow: item.refRangeLow,
      refRangeHigh: item.refRangeHigh,
      refRangeText: item.refRangeText,
      sourceDocumentName: docName,
    })
    : null;

  const whySeeingThisData = buildWhySeeingThisData({
    title: `${name}: ${value}`,
    supportingDocuments: [
      {
        documentName: docName,
        date: reportDate,
        finding: `${name} = ${value}`,
      },
    ],
    reasoning: `This measurement was extracted from ${docName} (${reportDate}) and verified against the printed clinical reference range.`,
  });

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 backdrop-blur-xs p-4 overflow-y-auto">
        <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 my-8">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center font-bold">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-800 border border-indigo-200 rounded">
                    Evidence Passport
                  </span>
                  <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded border ${coverageBadge.bg} ${coverageBadge.text}`}>
                    {coverageBadge.label}
                  </span>
                </div>
                <h3 className="text-base font-semibold text-slate-900 mt-1">
                  Source Provenance & Evidence
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

          {/* FACT OVERVIEW */}
          <div className="py-4 space-y-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Grounded Medical Fact
                  </span>
                  <h4 className="text-lg font-bold text-slate-900 mt-0.5">{name}</h4>
                  <p className="text-xl font-extrabold text-teal-900 mt-1 font-mono tracking-tight">
                    {value}
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Evidence State</span>
                  <div className="mt-0.5">
                    <span className="inline-block px-2.5 py-1 rounded text-xs font-semibold bg-teal-100 text-teal-900 border border-teal-200">
                      {evidenceLabel}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">Supported by 1 source document</p>
                </div>
              </div>
            </div>

            {/* PASSPORT PROVENANCE DETAILS */}
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-slate-100">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  Source Document
                </span>
                <strong className="text-slate-900 font-medium">{docName}</strong>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-slate-100">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Document Date
                </span>
                <span className="text-slate-800 font-medium">{reportDate}</span>
              </div>

              {isLab && (
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-slate-100">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                    Printed Reference Range
                  </span>
                  <span className={`font-mono font-medium ${item.refRangeText ? "text-slate-800" : "text-amber-800 italic"}`}>
                    {item.refRangeText || "Reference range not provided in source"}
                  </span>
                </div>
              )}

              {isLab && (
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-slate-100">
                  <span className="text-slate-500">Status Classification</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${item.status === "normal"
                      ? "bg-teal-100 text-teal-800"
                      : item.status === "low" || item.status === "high"
                        ? "bg-rose-100 text-rose-800"
                        : "bg-slate-100 text-slate-700"
                      }`}
                  >
                    {(item.status ?? "unknown").replace("_", " ")}
                  </span>
                </div>
              )}

              {/* ORIGINAL TEXT SNIPPET */}
              <div className="p-3 rounded-lg bg-slate-900 text-slate-100 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Original Source Record Snippet
                  </span>
                  <span className="text-[10px] text-teal-400">Verifiable Evidence</span>
                </div>
                <p className="font-mono text-xs text-teal-300 break-words">
                  &ldquo;{rawSnippet}&rdquo;
                </p>
              </div>
            </div>

            {/* WHY IS THIS MARKED SECTION */}
            {whyExplanation && (
              <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-xs space-y-1.5">
                <div className="flex items-center gap-1.5 font-semibold text-amber-900">
                  <Info className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>{whyExplanation.title}</span>
                </div>
                <p className="text-slate-700 text-[11px] leading-relaxed">
                  {whyExplanation.statement}
                </p>
                <div className="pt-1 text-[11px] text-slate-600 flex justify-between border-t border-amber-200/60">
                  <span>Source Range: <strong>{whyExplanation.sourceRange}</strong></span>
                  <span>Report: <strong>{whyExplanation.sourceDocument}</strong></span>
                </div>
              </div>
            )}

            {/* QUICK ACTIONS: EXPLAIN WITH GEMINI & WHY AM I SEEING THIS */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowExplain(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-medium cursor-pointer transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                <span>Explain with Gemini</span>
              </button>

              <button
                type="button"
                onClick={() => setShowWhySeeingThis(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 text-xs font-medium cursor-pointer transition-colors"
              >
                <HelpCircle className="w-3.5 h-3.5 text-indigo-600" />
                <span>Why am I seeing this?</span>
              </button>
            </div>

            {/* ACTIONS */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-md text-xs font-medium text-slate-600 hover:bg-slate-100"
              >
                Close
              </button>
              {onOpenSideBySide && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenSideBySide(item);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-teal-800 hover:bg-teal-900 text-white text-xs font-semibold shadow-sm cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Side-by-Side Review</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sub-modals */}
      <GeminiExplainModal
        isOpen={showExplain}
        onClose={() => setShowExplain(false)}
        term={name}
        contextSnippet={rawSnippet}
        sourceDocumentName={docName}
      />

      <WhySeeingThisModal
        isOpen={showWhySeeingThis}
        onClose={() => setShowWhySeeingThis(false)}
        data={whySeeingThisData}
      />
    </>
  );
}
