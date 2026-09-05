"use client";

import React, { useState, useEffect } from "react";
import confetti from "canvas-confetti";
import {
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Clock,
  ShieldCheck,
  Edit3,
  XCircle,
  FileText,
  Sparkles,
  ArrowRight,
  Check,
  RotateCcw,
} from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { UploadModal } from "@/components/UploadModal";
import { SideBySideReviewModal } from "@/components/SideBySideReviewModal";

export default function VerificationInboxPage() {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPrivacyMode, setIsPrivacyMode] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [sideBySideItem, setSideBySideItem] = useState<any | null>(null);

  // Conflict modal state
  const [selectedConflict, setSelectedConflict] = useState<any | null>(null);
  const [conflictNotes, setConflictNotes] = useState("");
  const [isResolving, setIsResolving] = useState(false);

  const fetchRecords = async () => {
    try {
      const res = await fetch("/api/records");
      const json = await res.json();
      setData(json);
      setIsPrivacyMode(json.patient?.isPrivacyMode || false);
    } catch (e) {
      console.error(e);
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
      if (json.success) setIsPrivacyMode(json.isPrivacyMode);
    } catch (e) {
      console.error(e);
    }
  };

  const handleQuickConfirm = async (item: any) => {
    try {
      await fetch("/api/verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          verificationId: item.id,
          action: "confirm",
          targetType: item.targetType,
          targetId: item.targetId,
        }),
      });
      fetchRecords();
      confetti({ particleCount: 60, spread: 50 });
    } catch (err) {
      console.error(err);
    }
  };

  const handleResolveConflict = async (choice: "keep_profile" | "use_document") => {
    if (!selectedConflict) return;
    setIsResolving(true);
    try {
      await fetch("/api/conflicts/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conflictId: selectedConflict.id,
          choice,
          notes: conflictNotes,
        }),
      });
      setSelectedConflict(null);
      setConflictNotes("");
      fetchRecords();
      confetti({ particleCount: 70, spread: 60 });
    } finally {
      setIsResolving(false);
    }
  };

  const patient = data?.patient;
  const readiness = data?.readiness || { score: 82, breakdown: [] };
  const verificationItems = (data?.verificationItems || []).filter(
    (v: any) => v.status === "pending"
  );
  const conflicts = (data?.conflicts || []).filter((c: any) => c.status === "unresolved");
  const labs = data?.labResults || [];
  const meds = data?.medications || [];

  return (
    <div className="min-h-screen bg-[#FBFBFA] flex flex-col">
      <Navigation
        isPrivacyMode={isPrivacyMode}
        onTogglePrivacy={handleTogglePrivacy}
        onOpenUpload={() => setIsUploadOpen(true)}
        readinessScore={readiness.score}
        readinessBreakdown={readiness.breakdown}
        patientName={patient?.fullName}
      />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300">
                Human-in-the-Loop
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-500">Uncertainty Triage Engine</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mt-1">
              Verification Inbox
            </h1>
            <p className="text-xs text-slate-600 mt-0.5 max-w-xl">
              MedLens makes AI uncertainty visible rather than hiding it. Review lower-confidence extractions, resolve data conflicts, and inspect missing source ranges.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-xs font-bold text-amber-900">
              {verificationItems.length} review item(s) • {conflicts.length} conflict(s)
            </span>
          </div>
        </div>

        {/* SECTION 1: DATA CONFLICTS (CRITICAL TRIAGE) */}
        {conflicts.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-rose-800">
              <AlertTriangle className="w-4 h-4 text-rose-700" />
              <span>Information Conflicts Requiring Resolution</span>
            </div>

            {conflicts.map((cnf: any) => (
              <div
                key={cnf.id}
                className="p-5 sm:p-6 rounded-2xl bg-rose-50/50 border border-rose-200 shadow-xs space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-200/80 text-rose-900">
                      Discrepancy Detected
                    </span>
                    <h3 className="text-base font-bold text-slate-900 mt-1">{cnf.title}</h3>
                    <p className="text-xs text-slate-600 mt-0.5">
                      MedLens detected two contradictory statements across your records. As an information engine, MedLens will not guess which is true.
                    </p>
                  </div>
                </div>

                {/* Conflict Comparison Ribbon */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-white border border-rose-200 space-y-1">
                    <span className="text-[10px] font-bold uppercase text-slate-400">
                      Source A: {cnf.sourceA}
                    </span>
                    <p className="font-bold text-slate-900 text-sm">&ldquo;{cnf.fieldA}&rdquo;</p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white border border-rose-200 space-y-1">
                    <span className="text-[10px] font-bold uppercase text-slate-400">
                      Source B: {cnf.sourceB}
                    </span>
                    <p className="font-bold text-slate-900 text-sm">&ldquo;{cnf.fieldB}&rdquo;</p>
                  </div>
                </div>

                {/* Resolution Action */}
                <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-rose-200/60">
                  <button
                    onClick={() => handleResolveConflict("keep_profile")}
                    className="px-4 py-2 rounded-md bg-white border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-800 cursor-pointer"
                  >
                    Keep Profile (&ldquo;{cnf.fieldA}&rdquo;)
                  </button>
                  <button
                    onClick={() => handleResolveConflict("use_document")}
                    className="px-4 py-2 rounded-md bg-rose-800 hover:bg-rose-900 text-white text-xs font-semibold shadow-xs cursor-pointer"
                  >
                    Adopt Document Record (&ldquo;{cnf.fieldB}&rdquo;)
                  </button>
                </div>
              </div>
            ))}
          </section>
        )}

        {/* SECTION 2: VERIFICATION ITEMS */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Extraction Review Queue ({verificationItems.length})
            </span>
          </div>

          {verificationItems.length === 0 && conflicts.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
              <CheckCircle2 className="w-12 h-12 text-teal-700 mx-auto" />
              <h3 className="text-base font-bold text-slate-900">
                Verification Inbox is All Clear!
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                All extracted facts and clinical records have been verified. Your Living Medical Record is up to date.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {verificationItems.map((item: any) => {
                const isDosage = item.type === "unclear_dosage";
                const isRange = item.type === "missing_range";
                const isContext = item.type === "missing_context";

                return (
                  <div
                    key={item.id}
                    className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 shadow-xs transition-all space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            isRange
                              ? "bg-slate-100 text-slate-700 border border-slate-200"
                              : isContext
                              ? "bg-indigo-50 text-indigo-800 border border-indigo-200"
                              : "bg-amber-100 text-amber-900 border border-amber-300"
                          }`}
                        >
                          {item.type.replace("_", " ")}
                        </span>
                        {item.confidence && (
                          <span className="text-[11px] font-medium text-slate-500">
                            Confidence: {item.confidence}%
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400">
                        Source: {item.sourceDocumentName || "Document"}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{item.title}</h4>
                      <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                        {item.description}
                      </p>
                    </div>

                    {item.sourceSnippet && (
                      <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono text-slate-700">
                        &ldquo;{item.sourceSnippet}&rdquo;
                      </div>
                    )}

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                      {isContext ? (
                        <button
                          onClick={() => setIsUploadOpen(true)}
                          className="px-4 py-1.5 rounded-md bg-indigo-800 hover:bg-indigo-900 text-white text-xs font-semibold"
                        >
                          Upload Prior Record
                        </button>
                      ) : isRange ? (
                        <button
                          onClick={() => {
                            const lab = labs.find((l: any) => l.id === item.targetId);
                            if (lab) setSideBySideItem(lab);
                          }}
                          className="px-4 py-1.5 rounded-md bg-teal-800 hover:bg-teal-900 text-white text-xs font-semibold"
                        >
                          Inspect Source
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              const target =
                                item.targetType === "medication"
                                  ? meds.find((m: any) => m.id === item.targetId)
                                  : labs.find((l: any) => l.id === item.targetId);
                              if (target) setSideBySideItem(target);
                            }}
                            className="px-3 py-1.5 rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-medium"
                          >
                            Side-by-Side Review
                          </button>
                          <button
                            onClick={() => handleQuickConfirm(item)}
                            className="px-4 py-1.5 rounded-md bg-teal-800 hover:bg-teal-900 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Confirm Fact</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* MODALS */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSuccess={() => fetchRecords()}
      />

      <SideBySideReviewModal
        item={sideBySideItem}
        isOpen={!!sideBySideItem}
        onClose={() => setSideBySideItem(null)}
        onVerificationDone={() => fetchRecords()}
      />
    </div>
  );
}
