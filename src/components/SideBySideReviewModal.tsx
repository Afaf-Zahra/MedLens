"use client";

import React, { useState } from "react";
import {
  X,
  FileText,
  CheckCircle2,
  Edit3,
  XCircle,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  Save,
} from "lucide-react";
import type { LabResult, Medication } from "@/lib/types";

interface SideBySideReviewModalProps {
  item: LabResult | Medication | null;
  conflictItem?: {
    title: string;
    recordA: { sourceDocumentName: string; reportDate: string; statement: string; snippet?: string };
    recordB: { sourceDocumentName: string; reportDate: string; statement: string; snippet?: string };
    systemNote: string;
  } | null;
  isOpen: boolean;
  onClose: () => void;
  onVerificationDone: () => void;
}

export function SideBySideReviewModal({
  item,
  conflictItem,
  isOpen,
  onClose,
  onVerificationDone,
}: SideBySideReviewModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedValue, setEditedValue] = useState<string>("");
  const [editedUnit, setEditedUnit] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  if (!isOpen || (!item && !conflictItem)) return null;

  // Conflict view
  if (conflictItem) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto">
        <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 flex flex-col my-auto overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-amber-50/60">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-900 rounded">
                Gemini Conflict Detective
              </span>
              <h3 className="text-sm sm:text-base font-semibold text-slate-900">
                Possible Record Conflict Review
              </h3>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-md">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-4">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Conflict Topic</span>
              <h4 className="text-base font-bold text-slate-900 mt-0.5">{conflictItem.title}</h4>
              <p className="text-xs text-slate-600 mt-1">{conflictItem.systemNote}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-800">
                  Record A: {conflictItem.recordA.sourceDocumentName}
                </span>
                <p className="text-xs font-semibold text-slate-900">{conflictItem.recordA.statement}</p>
                {conflictItem.recordA.snippet && (
                  <div className="p-2.5 rounded bg-slate-900 text-teal-300 font-mono text-[11px]">
                    &ldquo;{conflictItem.recordA.snippet}&rdquo;
                  </div>
                )}
                <span className="text-[10px] text-slate-400 block">Date: {conflictItem.recordA.reportDate}</span>
              </div>

              <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                  Record B: {conflictItem.recordB.sourceDocumentName}
                </span>
                <p className="text-xs font-semibold text-slate-900">{conflictItem.recordB.statement}</p>
                {conflictItem.recordB.snippet && (
                  <div className="p-2.5 rounded bg-slate-900 text-amber-300 font-mono text-[11px]">
                    &ldquo;{conflictItem.recordB.snippet}&rdquo;
                  </div>
                )}
                <span className="text-[10px] text-slate-400 block">Date: {conflictItem.recordB.reportDate}</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-100 border border-slate-200 text-xs text-slate-600">
              <strong>MedLens Safety Principle:</strong> Gemini and MedLens do not decide which medical record is correct. Both records are preserved intact for clinical consultation.
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-md text-xs font-medium text-slate-600 hover:bg-slate-100"
              >
                Close
              </button>
              <button
                onClick={() => {
                  onVerificationDone();
                  onClose();
                }}
                className="px-5 py-2 rounded-md bg-teal-800 hover:bg-teal-900 text-white text-xs font-semibold"
              >
                Mark Reviewed
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Single Item Review
  if (!item) return null;

  const isLab = "testName" in item;
  const name = isLab ? item.testName : item.name;
  const initialValue = isLab ? String(item.value) : item.dose;
  const initialUnit = item.unit || "";
  const docName = isLab ? item.sourceDocumentName : item.sourceDocumentName || "Report Document";
  const rawSnippet = item.rawSnippet || "Original text snippet";

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "confirm",
          targetType: isLab ? "lab_result" : "medication",
          targetId: item.id,
        }),
      });
      if (res.ok) {
        setStatusMessage("Verified and confirmed in patient record.");
        setTimeout(() => {
          onVerificationDone();
          onClose();
        }, 600);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveEdit = async () => {
    setIsSubmitting(true);
    try {
      const updates = isLab
        ? { value: parseFloat(editedValue) || editedValue, unit: editedUnit }
        : { dose: editedValue, unit: editedUnit };

      const res = await fetch("/api/verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "edit",
          targetType: isLab ? "lab_result" : "medication",
          targetId: item.id,
          editedValue: updates,
        }),
      });
      if (res.ok) {
        setStatusMessage("Corrected value saved to Living Medical Record.");
        setTimeout(() => {
          onVerificationDone();
          onClose();
        }, 600);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!confirm("Are you sure you want to reject this extracted entry? It will be marked rejected.")) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reject",
          targetType: isLab ? "lab_result" : "medication",
          targetId: item.id,
        }),
      });
      if (res.ok) {
        setStatusMessage("Record rejected.");
        setTimeout(() => {
          onVerificationDone();
          onClose();
        }, 600);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 flex flex-col my-auto overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-teal-100 text-teal-900 rounded">
              Verification Engine
            </span>
            <h3 className="text-sm sm:text-base font-semibold text-slate-900">
              Side-by-Side Source Review: <span className="text-teal-900">{name}</span>
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* STATUS BANNER */}
        {statusMessage && (
          <div className="bg-teal-50 px-6 py-2 border-b border-teal-200 text-xs font-semibold text-teal-900 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-teal-700" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* DUAL PANE BODY */}
        <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
          {/* LEFT PANE: ORIGINAL SOURCE REPORT */}
          <div className="p-6 bg-slate-50/50 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  Original Source Report
                </span>
                <span className="text-[11px] font-medium text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {docName}
                </span>
              </div>

              {/* Source Visual Preview Box */}
              <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-3 font-mono text-xs">
                <div className="text-[10px] text-slate-400 border-b border-slate-100 pb-2">
                  CLINICAL RECORD EXCERPT | VERIFIED EVIDENCE
                </div>
                {/* HIGHLIGHTED SNIPPET */}
                <div className="p-3 rounded-md bg-amber-50 border-l-4 border-amber-500 text-slate-900 font-semibold shadow-xs">
                  <span className="text-[9px] uppercase tracking-wider text-amber-700 font-bold block mb-1 font-sans">
                    Extracted Line Region
                  </span>
                  &ldquo;{rawSnippet}&rdquo;
                </div>
                <div className="text-slate-600 line-clamp-2 opacity-60">
                  Preserved from uploaded medical documentation.
                </div>
              </div>
            </div>

            <div className="text-[11px] text-slate-500 bg-slate-100 p-2.5 rounded-lg border border-slate-200">
              <strong className="text-slate-700">Source of Truth Principle:</strong> MedLens preserves the exact raw text snippet above. Human review guarantees the extracted representation matches the original document.
            </div>
          </div>

          {/* RIGHT PANE: STRUCTURED EXTRACTED DATA */}
          <div className="p-6 bg-white flex flex-col justify-between space-y-5">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-teal-800 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-teal-700" />
                  Structured Data Representation
                </span>
                <div className="flex items-center gap-1 text-xs font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                  <Sparkles className="w-3 h-3 text-teal-600" />
                  <span>Document Extracted</span>
                </div>
              </div>

              {!isEditing ? (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <div>
                    <span className="text-xs text-slate-500">Biomarker / Fact</span>
                    <h4 className="text-base font-bold text-slate-900">{name}</h4>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500">Structured Value & Unit</span>
                    <p className="text-2xl font-extrabold text-teal-900 font-mono mt-0.5">
                      {isLab ? `${item.value} ${item.unit}` : `${item.dose} ${item.unit}`}
                    </p>
                  </div>
                  {isLab && (
                    <div className="pt-2 border-t border-slate-200 text-xs flex justify-between">
                      <span className="text-slate-500">Printed Reference Range:</span>
                      <strong className="text-slate-800 font-mono">
                        {item.refRangeText || "Range not provided in source"}
                      </strong>
                    </div>
                  )}
                  {isLab && (
                    <div className="text-xs flex justify-between">
                      <span className="text-slate-500">Classification:</span>
                      <span className="font-bold uppercase text-slate-800">
                        {item.status.replace("_", " ")}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                /* EDITING STATE */
                <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-300 space-y-3">
                  <div className="flex items-center gap-1 text-xs font-bold text-amber-900">
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Correction Mode</span>
                  </div>
                  <div>
                    <label className="text-xs text-slate-600 block mb-1">Correct Value</label>
                    <input
                      type="text"
                      defaultValue={initialValue}
                      onChange={(e) => setEditedValue(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-sm font-mono font-bold text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-600 block mb-1">Unit</label>
                    <input
                      type="text"
                      defaultValue={initialUnit}
                      onChange={(e) => setEditedUnit(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-sm text-slate-900"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      onClick={() => setIsEditing(false)}
                      className="px-3 py-1 rounded text-xs font-medium text-slate-600 hover:bg-slate-200 cursor-pointer"
                    >
                      Cancel Edit
                    </button>
                    <button
                      onClick={handleSaveEdit}
                      disabled={isSubmitting}
                      className="flex items-center gap-1 px-4 py-1 rounded bg-teal-800 hover:bg-teal-900 text-white text-xs font-bold cursor-pointer"
                    >
                      <Save className="w-3 h-3" />
                      <span>Save Correction</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* HUMAN VERIFICATION CONTROLS */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-2">
              <button
                onClick={handleReject}
                disabled={isSubmitting}
                className="flex items-center gap-1 px-3 py-2 rounded-md border border-rose-200 text-rose-800 hover:bg-rose-50 text-xs font-medium transition-colors cursor-pointer"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Reject</span>
              </button>

              <div className="flex items-center gap-2">
                {!isEditing && (
                  <button
                    onClick={() => {
                      setEditedValue(initialValue);
                      setEditedUnit(initialUnit);
                      setIsEditing(true);
                    }}
                    disabled={isSubmitting}
                    className="flex items-center gap-1 px-3 py-2 rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-medium cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Value</span>
                  </button>
                )}
                <button
                  onClick={handleConfirm}
                  disabled={isSubmitting}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-md bg-teal-800 hover:bg-teal-900 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm Fact</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
