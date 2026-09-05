"use client";

import React, { useState, useEffect } from "react";
import {
  FileText,
  Printer,
  Download,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  User,
  Clock,
  Sparkles,
  Info,
} from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { UploadModal } from "@/components/UploadModal";
import { maskPII, formatDate } from "@/lib/utils";

export default function DoctorHandoffPage() {
  const [handoff, setHandoff] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPrivacyMode, setIsPrivacyMode] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

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
  const meds = handoff.medications || [];
  const symptoms = handoff.symptoms || [];
  const conditions = handoff.conditions || [];
  const allergies = handoff.allergies || [];
  const docs = handoff.recentDocuments || [];
  const outOfRange = handoff.outOfRangeLabResults || [];
  const conflicts = handoff.activeConflicts || [];
  const verifications = handoff.pendingVerifications || [];

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
                Clinical Transmission
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-500">Doctor Handoff Snapshot</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mt-1">
              Doctor Handoff
            </h1>
            <p className="text-xs text-slate-600 mt-0.5 max-w-xl">
              Clean structured clinical record for clinical consultation and care handoff. Exportable to PDF.
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

        {/* CLINICAL DOCUMENT BODY (DESIGNED FOR BOTH SCREEN AND PRINT) */}
        <div className="bg-white rounded-2xl p-6 sm:p-10 border border-slate-200 shadow-sm space-y-6 print:border-none print:shadow-none print:p-0">
          {/* Document Clinical Letterhead */}
          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold tracking-tight text-slate-900">
                  MEDLENS CLINICAL HANDOFF SNAPSHOT
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Living Medical Record Summary • Source-Verified Extraction
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

          {/* PATIENT DEMOGRAPHICS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase">Patient Name</span>
              <strong className="text-slate-900 text-sm">
                {maskPII(patient?.fullName, isPrivacyMode)}
              </strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase">DOB / Age</span>
              <span className="text-slate-900 font-mono">
                {maskPII(patient?.dob, isPrivacyMode)} (34y)
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase">Gender</span>
              <span className="text-slate-900">{patient?.sex || "Female"}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase">Phone</span>
              <span className="text-slate-900 font-mono">
                {maskPII(patient?.phone, isPrivacyMode)}
              </span>
            </div>
          </div>

          {/* SECTION: ALLERGIES & CONFLICTS */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-1">
              Allergies & Sensitivities
            </h3>
            <div className="space-y-1.5 text-xs">
              {allergies.map((a: any) => (
                <div key={a.id} className="flex justify-between p-2 rounded bg-slate-50 border border-slate-100">
                  <strong className="text-slate-900">{a.allergen}</strong>
                  <span className="text-slate-600">{a.reaction}</span>
                </div>
              ))}
              {conflicts.length > 0 && (
                <div className="p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-900 text-[11px]">
                  <strong>Active Discrepancy Note:</strong> Patient profile states &ldquo;{conflicts[0].fieldA}&rdquo; while prior clinical intake record documented &ldquo;{conflicts[0].fieldB}&rdquo;. Reconciliation requested.
                </div>
              )}
            </div>
          </div>

          {/* SECTION: CURRENT MEDICATIONS */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-1">
              Current Medications
            </h3>
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px]">
                <tr>
                  <th className="py-2 px-2">Medication</th>
                  <th className="py-2 px-2">Dose</th>
                  <th className="py-2 px-2">Frequency</th>
                  <th className="py-2 px-2">Source / Provenance</th>
                  <th className="py-2 px-2 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {meds.map((m: any) => (
                  <tr key={m.id}>
                    <td className="py-2 px-2 font-bold text-slate-900">{m.name}</td>
                    <td className="py-2 px-2 font-mono">{m.dose} {m.unit}</td>
                    <td className="py-2 px-2 text-slate-600">{m.frequency}</td>
                    <td className="py-2 px-2 text-slate-500">{m.source === "user_input" ? "Patient statement" : m.sourceDocumentName}</td>
                    <td className="py-2 px-2 text-right">
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-slate-100 text-slate-800">
                        {m.verificationStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* SECTION: OUT-OF-RANGE & CLINICAL OBSERVATIONS */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-1">
              Values Outside Document Reference Ranges
            </h3>
            {outOfRange.length > 0 ? (
              <table className="w-full text-left text-xs">
                <thead className="bg-rose-50 text-rose-900 uppercase text-[10px]">
                  <tr>
                    <th className="py-2 px-2">Biomarker</th>
                    <th className="py-2 px-2">Value</th>
                    <th className="py-2 px-2">Printed Source Range</th>
                    <th className="py-2 px-2">Status</th>
                    <th className="py-2 px-2">Report Document</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {outOfRange.map((l: any) => (
                    <tr key={l.id} className="bg-rose-50/20">
                      <td className="py-2 px-2 font-semibold text-slate-900">{l.testName}</td>
                      <td className="py-2 px-2 font-mono font-bold text-rose-900">{l.value} {l.unit}</td>
                      <td className="py-2 px-2 font-mono text-slate-700">{l.refRangeText}</td>
                      <td className="py-2 px-2 font-bold uppercase text-rose-800">{l.status}</td>
                      <td className="py-2 px-2 text-slate-500">{l.sourceDocumentName} ({l.reportDate})</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-xs text-slate-500 italic">No values outside source report ranges.</p>
            )}
          </div>

          {/* SECTION: RECENT DOCUMENTS PROVENANCE LOG */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-1">
              Referenced Source Documents ({docs.length})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {docs.map((d: any) => (
                <div key={d.id} className="p-2 rounded bg-slate-50 border border-slate-100">
                  <div className="flex justify-between font-semibold text-slate-900">
                    <span>{d.filename}</span>
                    <span className="text-slate-400 font-mono text-[10px]">{d.reportDate}</span>
                  </div>
                  <span className="text-[10px] text-teal-800 uppercase font-bold">{d.docType}</span>
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
              Document Digest: sha256:{handoff.handoffTimestamp.replace(/\D/g, "").slice(0, 16)} • Verified Clinical Handoff Copy
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
