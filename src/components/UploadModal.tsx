"use client";

import React, { useState } from "react";
import {
  Upload,
  FileText,
  CheckCircle,
  AlertTriangle,
  Loader2,
  X,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  RotateCcw,
} from "lucide-react";
import { SAMPLE_DOCUMENTS_FOR_DEMO } from "@/lib/sample-docs";
import type { DetectedDocType } from "@/lib/types";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (documentId?: string) => void;
}

const AUTHENTIC_STAGES = [
  { id: "upload", label: "Uploading securely..." },
  { id: "gemini_read", label: "Understanding document with Gemini..." },
  { id: "extract", label: "Extracting structured medical information..." },
  { id: "validate", label: "Validating extracted evidence..." },
  { id: "connect", label: "Connecting information to your Living Record..." },
  { id: "history", label: "Checking historical records..." },
  { id: "conflicts", label: "Checking for conflicts..." },
  { id: "timeline", label: "Updating timeline..." },
  { id: "complete", label: "Complete." },
];

export function UploadModal({ isOpen, onClose, onSuccess }: UploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [demoSampleIndex, setDemoSampleIndex] = useState<number | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [fileType, setFileType] = useState<string>("application/pdf");
  const [filename, setFilename] = useState<string>("");
  const [docTypeOverride, setDocTypeOverride] = useState<DetectedDocType | "">("");
  const [detectedType, setDetectedType] = useState<string>("Laboratory Report — CBC");

  // Flow states
  const [isProcessing, setIsProcessing] = useState(false);
  const [completedStages, setCompletedStages] = useState<string[]>([]);
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [duplicateWarning, setDuplicateWarning] = useState<{
    isDuplicate: boolean;
    message: string;
    existingDoc?: any;
  } | null>(null);
  const [uploadComplete, setUploadComplete] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSelectSample = (index: number) => {
    const sample = SAMPLE_DOCUMENTS_FOR_DEMO[index];
    setDemoSampleIndex(index);
    setSelectedFile(null);
    setFilename(sample.name);
    setFileContent(sample.rawContent);
    setFileType("text/plain");
    setDetectedType(`Laboratory Report — ${sample.type}`);
    setDocTypeOverride(sample.type);
    setErrorMsg(null);
    setDuplicateWarning(null);
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFileInput(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFileInput(e.target.files[0]);
    }
  };

  const processFileInput = (file: File) => {
    // Validate file type
    const validTypes = ["application/pdf", "image/png", "image/jpeg", "image/jpg", "text/plain"];
    const isSupported = validTypes.includes(file.type) || file.name.match(/\.(pdf|png|jpe?g|txt)$/i);
    if (!isSupported) {
      setErrorMsg("This file type is not supported. Please upload a PDF, PNG, JPG, or JPEG.");
      return;
    }

    // Validate size (max 15MB)
    if (file.size > 15 * 1024 * 1024) {
      setErrorMsg("File size exceeds the 15MB limit. Please provide a lighter copy.");
      return;
    }

    setSelectedFile(file);
    setFilename(file.name);
    setFileType(file.type || (file.name.endsWith(".pdf") ? "application/pdf" : "image/jpeg"));
    setDemoSampleIndex(null);
    setErrorMsg(null);
    setDuplicateWarning(null);

    // Read real file data (Data URL for PDF/Images to allow multimodal Gemini understanding, or text)
    const reader = new FileReader();
    if (file.type === "text/plain" || file.name.endsWith(".txt")) {
      reader.onload = (event) => {
        setFileContent((event.target?.result as string) || "");
      };
      reader.readAsText(file);
    } else {
      reader.onload = (event) => {
        setFileContent((event.target?.result as string) || "");
      };
      reader.readAsDataURL(file);
    }
  };

  const runUploadPipeline = async (force = false) => {
    if (!filename || !fileContent) {
      setErrorMsg("Please select a medical document to upload.");
      return;
    }

    setIsProcessing(true);
    setDuplicateWarning(null);
    setErrorMsg(null);
    setCompletedStages([]);
    setCurrentStageIndex(0);

    try {
      // Stage 1: Uploading securely
      setCurrentStageIndex(0);
      setCompletedStages(["upload"]);

      // Stage 2: Understanding document with Gemini
      setCurrentStageIndex(1);

      // Perform genuine server call to Gemini multimodal intelligence API
      const res = await fetch("/api/documents/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename,
          rawText: fileContent,
          fileType,
          docTypeOverride: docTypeOverride || undefined,
          forceUpload: force,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409 && data.isDuplicate) {
          setDuplicateWarning({
            isDuplicate: true,
            message: data.message || "This document appears identical to a previously uploaded report.",
            existingDoc: data.existingDoc,
          });
          setIsProcessing(false);
          return;
        }
        throw new Error(data.error || "Failed to analyze document.");
      }

      // Authentic progression: All stages verified on server
      const stagesOrder = [
        "upload",
        "gemini_read",
        "extract",
        "validate",
        "connect",
        "history",
        "conflicts",
        "timeline",
        "complete",
      ];
      setCompletedStages(stagesOrder);
      setCurrentStageIndex(stagesOrder.length - 1);
      setUploadComplete(data);
    } catch (err: any) {
      setErrorMsg(err.message || "MedLens couldn't analyze this document right now. Your existing records remain unchanged.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFinish = () => {
    onSuccess(uploadComplete?.document?.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 my-8">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-teal-50 text-teal-800 border border-teal-200 rounded">
                Gemini Document Intelligence
              </span>
              <span className="text-[10px] text-slate-500">Multimodal (PDF & Images)</span>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mt-1">
              Upload Medical Document
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Structured fact extraction, source preservation, and Trust Engine validation
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BODY */}
        <div className="py-5 space-y-4">
          {/* Error Banner */}
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Upload Notice</p>
                <p>{errorMsg}</p>
              </div>
            </div>
          )}

          {/* DUPLICATE WARNING MODAL STATE */}
          {duplicateWarning && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-3">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0" />
                <div>
                  <h4 className="font-semibold text-sm text-amber-900">
                    Possible Duplicate Document
                  </h4>
                  <p className="mt-1 text-amber-800">{duplicateWarning.message}</p>
                  {duplicateWarning.existingDoc && (
                    <p className="mt-1 text-[11px] text-amber-700">
                      Existing report date: {duplicateWarning.existingDoc.reportDate} | Type: {duplicateWarning.existingDoc.docType}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-amber-200/60">
                <button
                  onClick={() => setDuplicateWarning(null)}
                  className="px-3 py-1.5 rounded-md text-xs font-medium text-amber-800 hover:bg-amber-100"
                >
                  Cancel
                </button>
                <button
                  onClick={() => runUploadPipeline(true)}
                  className="px-3 py-1.5 rounded-md text-xs font-semibold bg-amber-800 hover:bg-amber-900 text-white"
                >
                  Upload Anyway
                </button>
              </div>
            </div>
          )}

          {/* PROCESSING STATE WITH AUTHENTIC STAGES */}
          {isProcessing ? (
            <div className="py-6 px-4 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-5">
              <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
                <Loader2 className="w-12 h-12 text-teal-700 animate-spin" />
                <Sparkles className="w-5 h-5 text-teal-500 absolute" />
              </div>
              <div>
                <h4 className="font-semibold text-sm text-slate-800">
                  Analyzing Document with Google Gemini
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Extracting structured clinical evidence with provenance tracking
                </p>
              </div>

              {/* Authentic Progress Stages */}
              <div className="space-y-1.5 max-w-md mx-auto text-left">
                {AUTHENTIC_STAGES.map((stage, idx) => {
                  const isDone = completedStages.includes(stage.id);
                  const isCurrent = idx === currentStageIndex && !isDone;
                  return (
                    <div
                      key={stage.id}
                      className={`flex items-center gap-2.5 text-xs px-2.5 py-1 rounded transition-colors ${
                        isCurrent
                          ? "bg-teal-100 text-teal-900 font-semibold"
                          : isDone
                          ? "text-slate-600 font-medium"
                          : "text-slate-300"
                      }`}
                    >
                      {isDone ? (
                        <CheckCircle className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                      ) : isCurrent ? (
                        <div className="w-3.5 h-3.5 rounded-full border-2 border-teal-700 border-t-transparent animate-spin shrink-0" />
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full bg-slate-200 shrink-0" />
                      )}
                      <span>{stage.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : uploadComplete ? (
            /* UPLOAD COMPLETE SUMMARY VIEW */
            <div className="py-4 space-y-4">
              <div className="p-4 rounded-xl bg-teal-50 border border-teal-200 flex items-center gap-3">
                <CheckCircle className="w-8 h-8 text-teal-700 shrink-0" />
                <div>
                  <h4 className="font-semibold text-sm text-teal-950">
                    Record Successfully Extracted & Grounded
                  </h4>
                  <p className="text-xs text-teal-800 mt-0.5">
                    {uploadComplete.summary}
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between text-slate-700">
                  <span>Document Type:</span>
                  <strong className="text-slate-900">{uploadComplete.document?.docType}</strong>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>Report Date:</span>
                  <strong className="text-slate-900">{uploadComplete.document?.reportDate}</strong>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>Extracted Lab Biomarkers:</span>
                  <strong className="text-teal-800">{uploadComplete.labResults?.length || 0} findings</strong>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>Extracted Medications:</span>
                  <strong className="text-teal-800">{uploadComplete.medications?.length || 0} items</strong>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>Intelligence Engine:</span>
                  <span className="px-1.5 py-0.5 rounded bg-teal-100 text-teal-800 font-medium">
                    {uploadComplete.geminiPowered ? "Google Gemini (gemini-2.5-flash)" : "MedLens Deterministic Extractor"}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  onClick={handleFinish}
                  className="px-5 py-2 rounded-md bg-teal-800 hover:bg-teal-900 text-white text-xs font-semibold shadow-sm"
                >
                  View in Living Record
                </button>
              </div>
            </div>
          ) : (
            /* UPLOAD SELECTION FORM */
            <div className="space-y-4">
              {/* Optional Quick Demo Presets (for evaluation/testing) */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    Quick Testing Presets (Optional)
                  </span>
                  <span className="text-[10px] text-slate-500">Pre-formatted Reports</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {SAMPLE_DOCUMENTS_FOR_DEMO.map((sample, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectSample(idx)}
                      className={`text-left p-2.5 rounded-lg border text-xs transition-all cursor-pointer ${
                        demoSampleIndex === idx
                          ? "bg-teal-50 border-teal-500 text-teal-950 ring-1 ring-teal-400"
                          : "bg-white border-slate-200 hover:border-slate-300 text-slate-700"
                      }`}
                    >
                      <div className="font-semibold text-slate-900 flex items-center justify-between">
                        <span>{sample.name}</span>
                        <span className="text-[10px] font-bold text-teal-700 uppercase">{sample.type}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                        {sample.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Drag and Drop Zone */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleFileDrop}
                className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
                  selectedFile
                    ? "border-teal-500 bg-teal-50/30"
                    : "border-slate-300 hover:border-slate-400 bg-slate-50/50"
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-600 mb-2">
                  <Upload className="w-5 h-5 text-teal-700" />
                </div>
                {filename ? (
                  <div>
                    <p className="text-xs font-semibold text-slate-900">{filename}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Ready for Gemini multimodal analysis</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs font-semibold text-slate-800">
                      Drag & drop your medical document here, or{" "}
                      <label className="text-teal-700 hover:text-teal-800 underline cursor-pointer">
                        browse files
                        <input
                          type="file"
                          accept=".pdf,.png,.jpg,.jpeg,.txt"
                          onChange={handleFileInput}
                          className="hidden"
                        />
                      </label>
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Supports PDF, Scanned Reports, PNG, JPG, JPEG (Max 15MB)
                    </p>
                  </div>
                )}
              </div>

              {/* Classification Selection */}
              {filename && (
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Document Type:</span>
                    <strong className="text-teal-900">{detectedType}</strong>
                  </div>
                  <div className="flex items-center gap-2 pt-1 border-t border-slate-200">
                    <label className="text-slate-500 text-[11px] shrink-0">
                      Specify document category:
                    </label>
                    <select
                      value={docTypeOverride}
                      onChange={(e) => {
                        const val = e.target.value as DetectedDocType;
                        setDocTypeOverride(val);
                        setDetectedType(val);
                      }}
                      className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800"
                    >
                      <option value="">(Auto-detect with Gemini)</option>
                      <option value="CBC">Complete Blood Count (CBC)</option>
                      <option value="Thyroid Profile">Thyroid Profile</option>
                      <option value="Lipid Profile">Lipid Profile</option>
                      <option value="Liver Function Test">Liver Function Test</option>
                      <option value="Kidney Function Test">Kidney Function Test</option>
                      <option value="Prescription">Prescription</option>
                      <option value="Discharge Summary">Discharge Summary</option>
                      <option value="General Laboratory Report">General Laboratory Report</option>
                      <option value="Other Medical Record">Other Medical Record</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-md text-xs font-medium text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => runUploadPipeline(false)}
                  disabled={!filename}
                  className="px-5 py-2 rounded-md bg-teal-800 hover:bg-teal-900 disabled:opacity-50 text-white text-xs font-semibold shadow-sm flex items-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Analyze with Gemini</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
