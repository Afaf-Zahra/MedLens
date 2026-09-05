"use client";

import React, { useState, useEffect } from "react";
import {
  ClipboardList,
  Calendar,
  AlertTriangle,
  HelpCircle,
  CheckCircle2,
  FileText,
  Printer,
  Sparkles,
  Info,
} from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { UploadModal } from "@/components/UploadModal";
import { maskPII } from "@/lib/utils";

export default function VisitPrepPage() {
  const [prepData, setPrepData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPrivacyMode, setIsPrivacyMode] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  useEffect(() => {
    const loadPrep = async () => {
      try {
        const res = await fetch("/api/visit-prep");
        const json = await res.json();
        setPrepData(json);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadPrep();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  if (loading || !prepData) {
    return (
      <div className="min-h-screen bg-[#FBFBFA] flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-2 border-teal-800 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500">Preparing doctor appointment packet...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FBFBFA] flex flex-col">
      <div className="no-print">
        <Navigation
          isPrivacyMode={isPrivacyMode}
          onTogglePrivacy={() => setIsPrivacyMode(!isPrivacyMode)}
          onOpenUpload={() => setIsUploadOpen(true)}
          patientName={prepData.patientName}
        />
      </div>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-7">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300">
                Clinical Consultation Packet
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-500">
                Patient: <strong>{maskPII(prepData.patientName, isPrivacyMode)}</strong>
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mt-1">
              Prepare for My Visit
            </h1>
            <p className="text-xs text-slate-600 mt-0.5 max-w-xl">
              Report-grounded clinical preparation checklist. Synthesizes recent test range flags, unverified records, and safe non-diagnostic questions.
            </p>
          </div>

          <button
            onClick={handlePrint}
            className="no-print flex items-center gap-1.5 px-4 py-2 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Packet</span>
          </button>
        </div>

        {/* SECTION 1: OUT-OF-RANGE FINDINGS TO DISCUSS */}
        <section className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <AlertTriangle className="w-4 h-4 text-rose-700" />
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Biomarkers Outside Document Ranges ({prepData.outOfRangeFindings?.length || 0})
            </h2>
          </div>

          <div className="space-y-3 text-xs">
            {prepData.outOfRangeFindings?.map((item: any, i: number) => (
              <div
                key={i}
                className="p-3.5 rounded-xl bg-rose-50/50 border border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{item.testName}</span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-rose-100 text-rose-800">
                      {item.status}
                    </span>
                  </div>
                  <p className="text-slate-600 text-[11px] mt-0.5">
                    Source: {item.sourceDoc} • Printed Range: <strong>{item.sourceRange}</strong>
                  </p>
                </div>
                <div className="font-mono font-extrabold text-sm sm:text-base text-rose-900">
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* SECTION 2: TESTS WITH RANGE OMITTED IN SOURCE */}
        {prepData.unclassifiedFindings?.length > 0 && (
          <section className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <HelpCircle className="w-4 h-4 text-amber-700" />
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Tests Missing Reference Intervals in Source
              </h2>
            </div>

            <div className="space-y-3 text-xs">
              {prepData.unclassifiedFindings.map((item: any, i: number) => (
                <div
                  key={i}
                  className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div>
                    <span className="font-bold text-slate-900 text-sm">{item.testName}</span>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      {item.sourceDoc} — {item.reason}
                    </p>
                  </div>
                  <div className="font-mono font-extrabold text-slate-800 text-sm">
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* SECTION 3: GROUNDED QUESTIONS FOR YOUR DOCTOR */}
        <section className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Sparkles className="w-4 h-4 text-teal-800" />
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Suggested Questions for Your Healthcare Provider
            </h2>
          </div>
          <p className="text-xs text-slate-500">
            Grounded strictly in your reports. MedLens generates observational questions about test thresholds rather than asking diagnostic questions.
          </p>

          <div className="space-y-3">
            {prepData.suggestedQuestions?.map((q: any, idx: number) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-teal-50/50 border border-teal-200 text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-teal-100 text-teal-900">
                    {q.category}
                  </span>
                  <span className="text-[10px] text-slate-500">Ref: {q.sourceDoc}</span>
                </div>
                <p className="font-semibold text-slate-900 text-sm leading-relaxed">
                  &ldquo;{q.question}&rdquo;
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* SECTION 4: UNRESOLVED CONFLICTS & MEDICATION RECONCILIATION */}
        {prepData.unresolvedConflicts?.length > 0 && (
          <section className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <AlertTriangle className="w-4 h-4 text-rose-700" />
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Clinical Discrepancies for Reconciliation
              </h2>
            </div>
            {prepData.unresolvedConflicts.map((c: any, i: number) => (
              <div key={i} className="p-3 rounded-lg bg-rose-50/60 border border-rose-200 text-xs">
                <span className="font-bold text-rose-950">{c.title}</span>
                <p className="text-slate-700 mt-0.5">Discrepancy: {c.discrepancy}</p>
              </div>
            ))}
          </section>
        )}

        {/* MANDATORY DISCLAIMER */}
        <div className="p-3.5 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-600 flex items-start gap-2">
          <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
          <p>{prepData.disclaimer}</p>
        </div>
      </main>

      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSuccess={() => {}}
      />
    </div>
  );
}
