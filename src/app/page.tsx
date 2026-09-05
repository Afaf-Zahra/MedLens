"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  GitCompare,
  Upload,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Clock,
  MessageSquare,
  ClipboardList,
  Shield,
  FileText,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Activity,
  Layers,
  Search,
  ExternalLink,
  Plus,
} from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { UploadModal } from "@/components/UploadModal";
import { SourcePassportModal } from "@/components/SourcePassportModal";
import { SideBySideReviewModal } from "@/components/SideBySideReviewModal";
import { maskPII, formatDate, calculateAge } from "@/lib/utils";

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPrivacyMode, setIsPrivacyMode] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  // Modals
  const [passportItem, setPassportItem] = useState<any | null>(null);
  const [sideBySideItem, setSideBySideItem] = useState<any | null>(null);

  const fetchRecords = async () => {
    try {
      const res = await fetch("/api/records");
      const json = await res.json();
      
      // If user has not completed onboarding and is not in demo mode, redirect to intake flow!
      if (!json.isOnboarded && !json.isDemoMode) {
        router.push("/onboarding");
        return;
      }

      setData(json);
      setIsPrivacyMode(json.patient?.isPrivacyMode || false);
    } catch (e) {
      console.error("Failed to load records", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const handleTogglePrivacy = async () => {
    try {
      const res = await fetch("/api/patient/privacy-toggle", { method: "POST" });
      const json = await res.json();
      if (json.success) {
        setIsPrivacyMode(json.isPrivacyMode);
      }
    } catch (e) {
      console.error("Failed to toggle privacy", e);
    }
  };

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-[#FBFBFA] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-3 border-teal-800 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-medium text-slate-600 tracking-wide">
            Loading Living Medical Record...
          </p>
        </div>
      </div>
    );
  }

  const patient = data.patient;
  const docs = data.documents || [];
  const labs = data.labResults || [];
  const meds = data.medications || [];
  const symptoms = data.symptoms || [];
  const conditions = data.conditions || [];
  const allergies = data.allergies || [];
  const timeline = data.timelineEvents || [];
  const verifications = (data.verificationItems || []).filter((v: any) => v.status === "pending");
  const conflicts = (data.conflicts || []).filter((c: any) => c.status === "unresolved");
  const readiness = data.readiness || { score: 82, breakdown: [] };
  const isDemoMode = !!data.isDemoMode;

  const outOfRangeLabs = labs.filter((l: any) => l.status === "low" || l.status === "high");
  const unclassifiedLabs = labs.filter((l: any) => l.status === "range_not_provided");

  const ageDisplay = patient?.dob ? `${calculateAge(patient.dob)}y` : "";

  return (
    <div className="min-h-screen bg-[#FBFBFA] flex flex-col selection:bg-teal-100 selection:text-teal-900">
      <Navigation
        isPrivacyMode={isPrivacyMode}
        onTogglePrivacy={handleTogglePrivacy}
        onOpenUpload={() => setIsUploadOpen(true)}
        readinessScore={readiness.score}
        readinessBreakdown={readiness.breakdown}
        patientName={patient?.fullName}
        isDemoMode={isDemoMode}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-7">
        {/* HERO SECTION: PATIENT SNAPSHOT & PRIMARY ACTION */}
        <section className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/90 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-teal-50/50 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

          <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-teal-50 text-teal-800 border border-teal-200/70">
                  {isDemoMode ? "Sample Demo Record" : "Living Medical Record"}
                </span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs text-slate-500 font-mono">
                  DOB: {maskPII(patient?.dob, isPrivacyMode)} {ageDisplay && `(${ageDisplay})`}
                </span>
                {patient?.sex && (
                  <>
                    <span className="text-xs text-slate-400">•</span>
                    <span className="text-xs text-slate-500">{patient.sex}</span>
                  </>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                Good morning, {maskPII(patient?.fullName || "Patient", isPrivacyMode)}
              </h1>
              <p className="text-sm text-slate-600 max-w-2xl leading-relaxed">
                Your medical history is organized into one traceable, reviewable timeline. Every lab result, prescription, and allergy record preserves its original source.
              </p>
            </div>

            {/* RECORD STATS RIBBON */}
            <div className="flex flex-wrap sm:flex-nowrap gap-3 shrink-0">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center min-w-[90px]">
                <span className="text-xs text-slate-500">Documents</span>
                <p className="text-xl font-extrabold text-slate-900 mt-0.5">{docs.length}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center min-w-[90px]">
                <span className="text-xs text-slate-500">Lab Tests</span>
                <p className="text-xl font-extrabold text-teal-900 mt-0.5">{labs.length}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center min-w-[90px]">
                <span className="text-xs text-slate-500">Medications</span>
                <p className="text-xl font-extrabold text-slate-900 mt-0.5">{meds.length}</p>
              </div>
              <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-center min-w-[90px]">
                <span className="text-xs text-amber-800">Needs Review</span>
                <p className="text-xl font-extrabold text-amber-900 mt-0.5">
                  {verifications.length + conflicts.length}
                </p>
              </div>
            </div>
          </div>

          {/* FLAGSHIP HERO ACTION: "WHAT CHANGED SINCE MY LAST REPORT?" */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <Link
              href="/what-changed"
              className="group block relative p-5 sm:p-6 rounded-xl bg-gradient-to-r from-teal-900 to-slate-900 text-white shadow-md hover:shadow-lg transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-teal-400 text-teal-950">
                      Flagship Feature
                    </span>
                    <span className="text-xs text-teal-200">
                      Longitudinal Comparison Engine
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2 group-hover:text-teal-200 transition-colors">
                    <span>WHAT CHANGED SINCE MY LAST REPORT?</span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform" />
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
                    Instantly compare matching tests across reports. View numeric deltas, separate source-provided reference ranges, and safe factual summaries.
                  </p>
                </div>
                <div className="shrink-0">
                  <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-teal-700 hover:bg-teal-600 text-white text-xs font-bold transition-colors">
                    <GitCompare className="w-4 h-4" />
                    <span>Compare Reports</span>
                  </span>
                </div>
              </div>
            </Link>
          </div>
        </section>

        {/* ATTENTION BANNERS: VERIFICATION INBOX & CONFLICTS */}
        {(verifications.length > 0 || conflicts.length > 0) && (
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {verifications.length > 0 && (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 flex items-start justify-between gap-3 shadow-xs">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-200/70 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                      Verification Inbox Preview
                    </h3>
                    <p className="text-xs font-semibold text-amber-950 mt-0.5">
                      {verifications.length} items require your review
                    </p>
                    <p className="text-[11px] text-amber-800 mt-0.5">
                      Low-confidence extractions, unclear dosages, or missing source ranges.
                    </p>
                  </div>
                </div>
                <Link
                  href="/verification"
                  className="px-3 py-1.5 rounded-md bg-amber-800 hover:bg-amber-900 text-white text-xs font-bold shrink-0 shadow-xs"
                >
                  Review
                </Link>
              </div>
            )}

            {conflicts.length > 0 && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-950 flex items-start justify-between gap-3 shadow-xs">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-rose-200/70 text-rose-800 flex items-center justify-center shrink-0 mt-0.5">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-rose-900 uppercase tracking-wider">
                      Unresolved Record Conflict
                    </h3>
                    <p className="text-xs font-semibold text-rose-950 mt-0.5">
                      {conflicts[0].title}
                    </p>
                    <p className="text-[11px] text-rose-800 mt-0.5">
                      Contradiction between onboarding profile and clinical document.
                    </p>
                  </div>
                </div>
                <Link
                  href="/verification"
                  className="px-3 py-1.5 rounded-md bg-rose-800 hover:bg-rose-900 text-white text-xs font-bold shrink-0 shadow-xs"
                >
                  Resolve
                </Link>
              </div>
            )}
          </section>
        )}

        {/* EMPTY STATE OR LABS TABLE */}
        {docs.length === 0 ? (
          <section className="bg-white rounded-2xl p-8 sm:p-12 border border-slate-200/90 shadow-xs text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-800 flex items-center justify-center mx-auto border border-teal-200 shadow-2xs">
              <FileText className="w-7 h-7" />
            </div>
            <div className="max-w-md mx-auto space-y-1.5">
              <h2 className="text-lg font-bold text-slate-900">
                Your medical timeline starts here.
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                Upload your first medical record (CBC, Thyroid, Prescription, or Discharge Summary) to begin building your traceable, structured MedLens history.
              </p>
            </div>
            <div className="pt-2">
              <button
                onClick={() => setIsUploadOpen(true)}
                className="px-6 py-2.5 rounded-xl bg-teal-800 hover:bg-teal-900 text-white text-xs font-bold shadow-sm inline-flex items-center gap-2 transition-all cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>Upload Medical Record</span>
              </button>
            </div>

            {/* Baseline Intake Facts Summary */}
            <div className="pt-8 border-t border-slate-100 max-w-2xl mx-auto text-left space-y-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Patient-Reported Intake Baseline on File:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-slate-500 block">Symptoms:</span>
                  <strong className="text-slate-900">
                    {symptoms.length > 0 ? symptoms.map((s: any) => s.symptom).join(", ") : "None reported"}
                  </strong>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-slate-500 block">Conditions:</span>
                  <strong className="text-slate-900">
                    {conditions.length > 0 ? conditions.map((c: any) => c.condition).join(", ") : "None reported"}
                  </strong>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-slate-500 block">Allergies:</span>
                  <strong className="text-slate-900">
                    {allergies.length > 0 ? allergies.map((a: any) => a.allergen).join(", ") : "None reported"}
                  </strong>
                </div>
              </div>
            </div>
          </section>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* LEFT 2 COLUMNS: CLINICAL SUMMARY & OUT-OF-RANGE LOG */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-teal-800" />
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                      Source-Range Observations
                    </h3>
                  </div>
                  <span className="text-xs text-slate-500">
                    Strict Report Range Enforcement
                  </span>
                </div>

                {outOfRangeLabs.length > 0 || unclassifiedLabs.length > 0 ? (
                  <div className="space-y-3">
                    {outOfRangeLabs.map((lab: any) => (
                      <div
                        key={lab.id}
                        onClick={() => setPassportItem(lab)}
                        className="p-3 rounded-xl border border-rose-200 bg-rose-50/40 hover:bg-rose-50/80 transition-colors flex items-center justify-between cursor-pointer group"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-xs sm:text-sm">
                              {lab.testName}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-200">
                              {lab.status.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600">
                            Printed Range: <strong className="font-mono">{lab.refRangeText}</strong> ({lab.sourceDocumentName})
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-extrabold text-sm sm:text-base text-rose-900">
                            {lab.value} {lab.unit}
                          </span>
                          <p className="text-[10px] text-teal-800 flex items-center justify-end gap-0.5 group-hover:underline">
                            <span>Source Passport</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </p>
                        </div>
                      </div>
                    ))}

                    {unclassifiedLabs.map((lab: any) => (
                      <div
                        key={lab.id}
                        onClick={() => setPassportItem(lab)}
                        className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-100 transition-colors flex items-center justify-between cursor-pointer group"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-xs sm:text-sm">
                              {lab.testName}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-200 text-slate-700">
                              Range Not Provided
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500">
                            Source omitted reference interval ({lab.sourceDocumentName})
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-extrabold text-sm sm:text-base text-slate-800">
                            {lab.value} {lab.unit}
                          </span>
                          <p className="text-[10px] text-teal-800 flex items-center justify-end gap-0.5 group-hover:underline">
                            <span>Source Passport</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 py-4 text-center">
                    All structured lab results fall within their respective source-provided ranges.
                  </p>
                )}

                <div className="pt-2 text-[11px] text-slate-500 flex items-center justify-between">
                  <span>Values are classified using ONLY ranges printed in the source document.</span>
                  <Link href="/record" className="text-teal-800 font-semibold hover:underline">
                    View full record →
                  </Link>
                </div>
              </div>

              {/* Quick Feature Launchpad */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Link
                  href="/ask"
                  className="p-4 rounded-xl bg-white border border-slate-200 hover:border-slate-300 shadow-xs hover:shadow-sm transition-all group"
                >
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center mb-3">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 group-hover:text-teal-900">
                    Ask My Records
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Grounded conversational queries with exact citations.
                  </p>
                </Link>

                <Link
                  href="/visit-prep"
                  className="p-4 rounded-xl bg-white border border-slate-200 hover:border-slate-300 shadow-xs hover:shadow-sm transition-all group"
                >
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center mb-3">
                    <ClipboardList className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 group-hover:text-teal-900">
                    Visit Prep
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Prepare report-grounded questions for your doctor.
                  </p>
                </Link>

                <Link
                  href="/handoff"
                  className="p-4 rounded-xl bg-white border border-slate-200 hover:border-slate-300 shadow-xs hover:shadow-sm transition-all group"
                >
                  <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-800 flex items-center justify-center mb-3">
                    <FileText className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 group-hover:text-teal-900">
                    Doctor Handoff
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Export structured clinical snapshot & PDF.
                  </p>
                </Link>
              </div>
            </div>

            {/* RIGHT COLUMN: LIVING MEDICAL STORY RAIL (RECENT ACTIVITY) */}
            <div className="space-y-6">
              <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-teal-800" />
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                      Medical Story Rail
                    </h3>
                  </div>
                  <Link
                    href="/timeline"
                    className="text-xs font-medium text-teal-800 hover:underline"
                  >
                    Full Timeline
                  </Link>
                </div>

                <div className="relative pl-6 space-y-5 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  {timeline.slice(0, 5).map((evt: any) => (
                    <div key={evt.id} className="relative">
                      <div
                        className={`absolute -left-[23px] top-1 w-3 h-3 rounded-full border-2 bg-white ${
                          evt.statusHighlight === "coral"
                            ? "border-rose-600"
                            : evt.statusHighlight === "amber"
                            ? "border-amber-500"
                            : "border-teal-700"
                        }`}
                      />
                      <div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-slate-700">
                            {formatDate(evt.eventDate)}
                          </span>
                          {evt.badge && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-100 text-slate-600">
                              {evt.badge}
                            </span>
                          )}
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 mt-0.5">
                          {evt.title}
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                          {evt.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <button
                    onClick={() => setIsUploadOpen(true)}
                    className="w-full py-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-800 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5 text-teal-800" />
                    <span>Upload Medical Record</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODALS */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSuccess={() => fetchRecords()}
      />

      <SourcePassportModal
        item={passportItem}
        isOpen={!!passportItem}
        onClose={() => setPassportItem(null)}
        onOpenSideBySide={(item) => setSideBySideItem(item)}
      />

      <SideBySideReviewModal
        item={sideBySideItem}
        isOpen={!!sideBySideItem}
        onClose={() => setSideBySideItem(null)}
        onVerificationDone={() => {
          fetchRecords();
          setPassportItem(null);
        }}
      />
    </div>
  );
}
