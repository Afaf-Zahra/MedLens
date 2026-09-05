"use client";

import React from "react";
import {
  HelpCircle,
  FileText,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  X,
} from "lucide-react";
import type { WhySeeingThisData } from "@/lib/types";

interface WhySeeingThisModalProps {
  data: WhySeeingThisData | null;
  isOpen: boolean;
  onClose: () => void;
}

export function WhySeeingThisModal({
  data,
  isOpen,
  onClose,
}: WhySeeingThisModalProps) {
  if (!isOpen || !data) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 my-8">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center font-bold">
              <HelpCircle className="w-5 h-5 text-indigo-700" />
            </div>
            <div>
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-800 border border-indigo-200 rounded">
                MedLens Transparency Layer
              </span>
              <h3 className="text-base font-semibold text-slate-900 mt-0.5">
                Why Am I Seeing This?
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
        <div className="py-4 space-y-4 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-400">Insight</span>
            <h4 className="text-sm font-bold text-slate-900 mt-0.5">{data.title}</h4>
            <p className="text-slate-600 text-xs mt-1 leading-relaxed">{data.reasoning}</p>
          </div>

          {/* Evidence Used */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Evidence Used ({data.recordsComparedCount} Source Document{data.recordsComparedCount === 1 ? "" : "s"})
              </span>
            </div>
            <div className="space-y-1.5">
              {data.evidenceUsed.map((doc, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 text-slate-800"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                    <span className="font-medium text-slate-900">{doc.documentName}</span>
                  </div>
                  {doc.date && <span className="text-[11px] text-slate-500">{doc.date}</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Separation of Roles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            <div className="p-3 rounded-lg bg-teal-50/60 border border-teal-200/80 space-y-1">
              <div className="flex items-center gap-1.5 text-teal-900 font-semibold text-[11px]">
                <Sparkles className="w-3.5 h-3.5 text-teal-700" />
                <span>Google Gemini Role</span>
              </div>
              <p className="text-[11px] text-teal-950 leading-relaxed">
                {data.geminiRole}
              </p>
            </div>

            <div className="p-3 rounded-lg bg-indigo-50/60 border border-indigo-200/80 space-y-1">
              <div className="flex items-center gap-1.5 text-indigo-900 font-semibold text-[11px]">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-700" />
                <span>MedLens Role</span>
              </div>
              <p className="text-[11px] text-indigo-950 leading-relaxed">
                {data.medlensRole}
              </p>
            </div>
          </div>

          {/* Safety & Non-Diagnostic Guarantee */}
          <div className="p-3 rounded-lg bg-slate-100 border border-slate-200 text-[10px] text-slate-600 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Responsible AI Guarantee:</strong> {data.nonDiagnosticNotice}
            </p>
          </div>

          <div className="flex items-center justify-end pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-md text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
