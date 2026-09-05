"use client";

import React, { useState, useEffect } from "react";
import {
  FileText,
  Printer,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  User,
  Clock,
  Sparkles,
  Info,
  TrendingUp,
} from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { UploadModal } from "@/components/UploadModal";
import { maskPII } from "@/lib/utils";

export default function DoctorHandoffPage() {
  const [handoff, setHandoff] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPrivacyMode, setIsPrivacyMode] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  useEffect(() => {
    const fetchHandoff = async () => {
      try {
        const res = await fetch("/api/doctor-handoff");
        const json = await res.json();
        setHandoff(json);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchHandoff();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  if (loading || !handoff) {
    return (
      <div className="min-h-screen bg-[#FBFBFA] flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-2 border-teal-800 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500">Compiling Doctor Handoff snapshot...</p>
        </div>
      </div>
    );
  }

  const patient = handoff.patient;
  const labs = handoff.labResults || [];
  const meds = handoff.documentedMedications || handoff.medications || [];
  const symptoms = handoff.symptoms || [];
  const conditions = handoff.documentedConditions || handoff.conditions || [];
  const allergies = handoff.recordedAllergies || handoff.allergies || [];
  const docs = handoff.sourceDocuments || handoff.recentDocuments || [];
  const outOfRange = handoff.recentInvestigations?.filter((l: any) => l.status === "low" || l.status === "high") || handoff.outOfRangeLabResults || [];
  const trends = handoff.longitudinalTrends || [];
  const conflicts = handoff.unresolvedConflicts || [];
  const followUps = handoff.followUpInstructionsFound || [];
  const summary = handoff.summary || "";
  const coverage = handoff.coverage || "STRONG RECORD COVERAGE";

  return (
    <div className="min-h-screen bg-[#FBFBFA] flex flex-col">
      <div className="no-print">
        <Navigation
          isPrivacyMode={isPrivacyMode}
          onTogglePrivacy={() => setIsPrivacyMode(!isPrivacyMode)}
          onOpenUpload={() => setIsUploadOpen(true)}
          patientName={patient?.fullName}
        />
      </div>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-7">
        {/* HEADER CONTROLS (HIDDEN IN PRINT) */}
        <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-teal-100 text-teal-900 border border-teal-300">
                Google Gemini Record Intelligence
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-500 font-medium">Clinical Consultation Handoff</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mt-1">
              Doctor Handoff
            </h1>
            <p className="text-xs text-slate-600 mt-0.5 max-w-xl">
              Concise evidence-grounded clinical summary for healthcare consultations. Grounded in verified documents and exportable to print or PDF.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-teal-800 hover:bg-teal-900 text-white text-xs font-semibold shadow-xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Export PDF / Print</span>
            </button>
          </div>
        </div>

        {/* CLINICAL DOCUMENT BODY */}
        <div className="bg-white rounded-2xl p-6 sm:p-10 border border-slate-200 shadow-sm space-y-6 print:border-none print:shadow-none print:p-0">
          {/* Document Clinical Letterhead */}
          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold tracking-tight text-slate-900">
                  MEDLENS CLINICAL HANDOFF SNAPSHOT
                </span>
                <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-teal-100 text-teal-900 border border-teal-200">
                  {coverage}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Longitudinal Medical Record Intelligence • Powered by Google Gemini
              </p>
            </div>
            <div className="text-right text-xs">
              <span className="font-mono text-slate-500 block">
                Generated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
              </span>
              <span className="text-[10px] text-teal-800 font-bold uppercase">
                Continuous Provenance Record
              </span>
            </div>
          </div>

          {/* EXECUTIVE CLINICAL SUMMARY */}
          {summary && (
            <div className="p-4 rounded-xl bg-teal-50/60 border border-teal-200 text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-teal-950 uppercase text-[10px] tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-teal-700" />
                <span>Executive Longitudinal Summary (Non-Diagnostic)</span>
              </div>
              <p className="text-slate-800 leading-relaxed">{summary}</p>
            </div>
          )}

          {/* PATIENT DEMOGRAPHICS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase">Patient Name</span>
              <strong className="text-slate-900 text-sm">
                {maskPII(patient?.fullName, isPrivacyMode)}
              </strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase">Date of Birth</span>
              <span className="text-slate-900 font-mono">
                {maskPII(patient?.dob, isPrivacyMode) || "Not specified"}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase">Gender</span>
              <span className="text-slate-900">{patient?.sex || "Not specified"}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase">Contact</span>
              <span className="text-slate-900 font-mono">
                {maskPII(patient?.phone, isPrivacyMode) || "On file"}
              </span>
            </div>
          </div>

          {/* SECTION: ALLERGIES & CONFLICTS */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-1">
              Recorded Allergies
            </h3>
            {allergies.length > 0 ? (
              <div className="space-y-1.5 text-xs">
                {allergies.map((a: any, idx: number) => (
                  <div key={idx} className="flex justify-between p-2 rounded bg-slate-50 border border-slate-100">
                    <strong className="text-slate-900">{a.allergen}</strong>
                    <span className="text-slate-600">{a.reaction || "Status: " + (a.status || "active")}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">No drug allergies recorded.</p>
            )}

            {conflicts.length > 0 && (
              <div className="mt-2 p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-900 text-[11px] space-y-1">
                <span className="font-bold block">Unresolved Record Conflicts / Discrepancies:</span>
                {conflicts.map((c: string, ci: number) => (
                  <p key={ci}>• {c}</p>
                ))}
              </div>
            )}
          </div>

          {/* SECTION: DOCUMENTED CONDITIONS */}
          {conditions.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-1">
                Documented Conditions
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {conditions.map((c: any, ci: number) => (
                  <div key={ci} className="p-2.5 rounded bg-slate-50 border border-slate-100 flex justify-between">
                    <div>
                      <strong className="text-slate-900">{c.condition}</strong>
                      <span className="text-[10px] text-slate-400 block">Status: {c.status}</span>
                    </div>
                    <span className="text-[10px] text-slate-500">{c.diagnosedDate || c.date || "Documented"}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION: DOCUMENTED MEDICATIONS */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-1">
              Documented Medications
            </h3>
            {meds.length > 0 ? (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px]">
                  <tr>
                    <th className="py-2 px-2">Medication</th>
                    <th className="py-2 px-2">Dose</th>
                    <th className="py-2 px-2">Frequency</th>
                    <th className="py-2 px-2">Provenance Source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {meds.map((m: any, idx: number) => (
                    <tr key={idx}>
                      <td className="py-2 px-2 font-bold text-slate-900">{m.name}</td>
                      <td className="py-2 px-2 font-mono">{m.dose} {m.unit || ""}</td>
                      <td className="py-2 px-2 text-slate-600">{m.frequency}</td>
                      <td className="py-2 px-2 text-slate-500">{m.source || m.sourceDocumentName || "Patient Input"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-xs text-slate-500 italic">No medications recorded.</p>
            )}
          </div>

          {/* SECTION: IMPORTANT LONGITUDINAL TRENDS */}
          {trends.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-1 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-teal-700" />
                <span>Important Longitudinal Trends</span>
              </h3>
              <div className="space-y-1.5 text-xs">
                {trends.map((t: any, idx: number) => (
                  <div key={idx} className="p-2.5 rounded bg-slate-50 border border-slate-100 flex justify-between items-center">
                    <div>
                      <strong className="text-slate-900">{t.biomarker}</strong>
                      <p className="text-slate-600 text-[11px]">{t.trendDescription}</p>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {t.sourceDates?.join(" → ")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION: OUT-OF-RANGE INVESTIGATIONS */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-1">
              Investigations Outside Printed Document Ranges
            </h3>
            {outOfRange.length > 0 ? (
              <table className="w-full text-left text-xs">
                <thead className="bg-rose-50 text-rose-900 uppercase text-[10px]">
                  <tr>
                    <th className="py-2 px-2">Biomarker</th>
                    <th className="py-2 px-2">Reported Value</th>
                    <th className="py-2 px-2">Status</th>
                    <th className="py-2 px-2">Source Document</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {outOfRange.map((l: any, idx: number) => (
                    <tr key={idx} className="bg-rose-50/20">
                      <td className="py-2 px-2 font-semibold text-slate-900">{l.testName}</td>
                      <td className="py-2 px-2 font-mono font-bold text-rose-900">{l.value} {l.unit || ""}</td>
                      <td className="py-2 px-2 font-bold uppercase text-rose-800">{l.status}</td>
                      <td className="py-2 px-2 text-slate-500">{l.source || l.sourceDocumentName} ({l.date || l.reportDate})</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-xs text-slate-500 italic">No values outside source report ranges.</p>
            )}
          </div>

          {/* SECTION: FOLLOW-UP INSTRUCTIONS FOUND */}
          {followUps.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-1">
                Follow-up Instructions Found in Documents
              </h3>
              <div className="space-y-1 text-xs">
                {followUps.map((f: string, fi: number) => (
                  <p key={fi} className="p-2 rounded bg-slate-50 border border-slate-100 text-slate-700">
                    • {f}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* SECTION: SOURCE DOCUMENTS PROVENANCE LOG */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-1">
              Referenced Source Documents ({docs.length})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {docs.map((d: any, idx: number) => (
                <div key={idx} className="p-2 rounded bg-slate-50 border border-slate-100">
                  <div className="flex justify-between font-semibold text-slate-900">
                    <span>{d.filename || d.name}</span>
                    <span className="text-slate-400 font-mono text-[10px]">{d.date || d.reportDate}</span>
                  </div>
                  <span className="text-[10px] text-teal-800 uppercase font-bold">{d.docType || d.type || "Report"}</span>
                </div>
              ))}
            </div>
          </div>

          {/* FOOTER DISCLAIMER */}
          <div className="pt-4 border-t border-slate-200 text-[10px] text-slate-500 space-y-1">
            <p>
              <strong>MedLens Safety Assurance:</strong> MedLens structures, connects, and traces medical records without diagnosing illness or prescribing treatments. All values reflect original source documents or confirmed patient entries.
            </p>
            <p className="font-mono text-slate-400">
              Clinical Digest Verification Copy • Powered by Google Gemini & MedLens Trust Engine
            </p>
          </div>
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
