"use client";

import React, { useState, useEffect } from "react";
import {
  GitCompare,
  ArrowUp,
  ArrowDown,
  Minus,
  Calendar,
  FileText,
  Sparkles,
  Info,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Upload,
} from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { UploadModal } from "@/components/UploadModal";
import { SourcePassportModal } from "@/components/SourcePassportModal";
import { maskPII, formatDate } from "@/lib/utils";

export default function WhatChangedPage() {
  const [data, setData] = useState<any | null>(null);
  const [comparisonData, setComparisonData] = useState<any | null>(null);
  const [selectedDocType, setSelectedDocType] = useState("CBC");
  const [loading, setLoading] = useState(true);
  const [isPrivacyMode, setIsPrivacyMode] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedTrendBiomarker, setSelectedTrendBiomarker] = useState<string>("Hemoglobin");
  const [passportItem, setPassportItem] = useState<any | null>(null);

  const fetchRecords = async () => {
    try {
      const res = await fetch("/api/records");
      const json = await res.json();
      setData(json);
      setIsPrivacyMode(json.patient?.isPrivacyMode || false);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchComparison = async (type = selectedDocType) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/what-changed?docType=${encodeURIComponent(type)}`);
      const json = await res.json();
      setComparisonData(json);
      if (json.comparisons && json.comparisons.length > 0) {
        setSelectedTrendBiomarker(json.comparisons[0].testName);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
    fetchComparison("CBC");
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

  const patient = data?.patient;
  const readiness = data?.readiness || { score: 82, breakdown: [] };
  const comparisons = comparisonData?.comparisons || [];
  const latestDoc = comparisonData?.latestDoc;
  const previousDoc = comparisonData?.previousDoc;
  const safeSummary = comparisonData?.safeSummary;

  // Selected biomarker for trend chart
  const activeTrend = comparisons.find(
    (c: any) => c.testName.toLowerCase() === selectedTrendBiomarker.toLowerCase()
  );

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

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
        {/* HERO TITLE */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-teal-100 text-teal-900">
                Flagship Longitudinal Engine
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-500">Non-Diagnostic Delta Engine</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mt-1">
              What Changed Since My Last Report?
            </h1>
            <p className="text-xs text-slate-600 mt-0.5 max-w-2xl">
              Deterministic comparison across sequential clinical reports. Changes describe numeric shifts only without speculative clinical interpretation.
            </p>
          </div>

          {/* Document Type Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Compare panel:</span>
            <select
              value={selectedDocType}
              onChange={(e) => {
                setSelectedDocType(e.target.value);
                fetchComparison(e.target.value);
              }}
              className="bg-white border border-slate-300 rounded-md px-3 py-1.5 text-xs font-semibold text-slate-800"
            >
              <option value="CBC">Complete Blood Count (CBC)</option>
              <option value="Thyroid Profile">Thyroid Profile</option>
              <option value="Lipid Profile">Lipid Profile</option>
              <option value="General Laboratory Report">General Reports</option>
            </select>
          </div>
        </div>

        {/* COMPARISON METADATA BANNER */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Prior Baseline Report
            </span>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                {previousDoc ? previousDoc.filename : "Baseline report pending"}
              </h3>
              {previousDoc && (
                <span className="text-xs font-mono text-slate-500">{previousDoc.reportDate}</span>
              )}
            </div>
            <p className="text-[11px] text-slate-500">
              {previousDoc ? `Classified as ${previousDoc.docType}` : "Upload a prior record to establish longitudinal baseline"}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-teal-50/50 border border-teal-200 shadow-xs space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-teal-800">
              Latest Report Being Evaluated
            </span>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-teal-950">
                {latestDoc ? latestDoc.filename : "No report on file"}
              </h3>
              {latestDoc && (
                <span className="text-xs font-mono text-teal-800 font-semibold">{latestDoc.reportDate}</span>
              )}
            </div>
            <p className="text-[11px] text-teal-700">
              {latestDoc ? `Classified as ${latestDoc.docType}` : "Please upload a clinical document"}
            </p>
          </div>
        </div>

        {/* SAFE FACTUAL SUMMARY BOX (MANDATED SAFE REPORTING) */}
        {safeSummary && (
          <div className="p-4 rounded-xl bg-slate-100 border border-slate-200 text-xs space-y-2 text-slate-800">
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <Sparkles className="w-4 h-4 text-teal-700" />
              <span>Safe Longitudinal Factual Summary</span>
            </div>
            <p className="text-xs leading-relaxed text-slate-700">
              {safeSummary}
            </p>
            <div className="pt-1 text-[11px] text-slate-500 italic border-t border-slate-200/60">
              * Note: If source ranges differ between reports, MedLens displays each range separately and never assumes a single external threshold applies to both.
            </div>
          </div>
        )}

        {/* LONGITUDINAL COMPARISON TABLE */}
        <section className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <GitCompare className="w-4 h-4 text-teal-800" />
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Matching Test Comparison ({comparisons.length} biomarkers)
              </h2>
            </div>
            <span className="text-xs text-slate-500">
              Side-by-side values & source ranges
            </span>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Comparing matching tests...
            </div>
          ) : comparisons.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <p className="text-xs text-slate-500">
                No matching reports found for {selectedDocType}. Upload a follow-up or prior CBC report to see the side-by-side delta.
              </p>
              <button
                onClick={() => setIsUploadOpen(true)}
                className="px-4 py-2 rounded-md bg-teal-800 hover:bg-teal-900 text-white text-xs font-semibold"
              >
                Upload Follow-up Report
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-3">Test Name</th>
                    <th className="py-3 px-3">
                      Previous Result ({previousDoc?.reportDate || "Baseline"})
                    </th>
                    <th className="py-3 px-3">
                      Latest Result ({latestDoc?.reportDate || "Latest"})
                    </th>
                    <th className="py-3 px-3 text-center">Delta & Shift</th>
                    <th className="py-3 px-3 text-right">Trend Analysis</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {comparisons.map((item: any, idx: number) => {
                    const isSelectedTrend =
                      selectedTrendBiomarker.toLowerCase() === item.testName.toLowerCase();
                    return (
                      <tr
                        key={idx}
                        className={`hover:bg-slate-50 transition-colors ${
                          isSelectedTrend ? "bg-teal-50/40" : ""
                        }`}
                      >
                        {/* Test Name */}
                        <td className="py-3.5 px-3 font-semibold text-slate-900">
                          <span>{item.testName}</span>
                          <span className="block text-[10px] font-normal text-slate-400">
                            Unit: {item.unit}
                          </span>
                        </td>

                        {/* Previous Value & Range */}
                        <td className="py-3.5 px-3">
                          {item.previous ? (
                            <div>
                              <div className="font-mono font-bold text-slate-800 text-sm">
                                {item.previous.value} {item.unit}
                              </div>
                              <span className="text-[10px] text-slate-500 block">
                                Range: {item.previous.refRangeText}
                              </span>
                              <span
                                className={`inline-block mt-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                                  item.previous.status === "normal"
                                    ? "bg-teal-100 text-teal-800"
                                    : "bg-rose-100 text-rose-800"
                                }`}
                              >
                                {item.previous.status}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Not in prior report</span>
                          )}
                        </td>

                        {/* Latest Value & Range */}
                        <td className="py-3.5 px-3">
                          <div>
                            <div className="font-mono font-bold text-teal-950 text-sm">
                              {item.latest.value} {item.unit}
                            </div>
                            <span className="text-[10px] text-slate-500 block">
                              Range: {item.latest.refRangeText}
                            </span>
                            <span
                              className={`inline-block mt-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                                item.latest.status === "normal"
                                  ? "bg-teal-100 text-teal-800"
                                  : "bg-rose-100 text-rose-800"
                              }`}
                            >
                              {item.latest.status}
                            </span>
                          </div>
                        </td>

                        {/* Delta & Direction */}
                        <td className="py-3.5 px-3 text-center">
                          {item.delta !== null ? (
                            <div className="inline-flex flex-col items-center">
                              <span
                                className={`inline-flex items-center gap-1 font-mono font-extrabold text-xs px-2 py-0.5 rounded-full ${
                                  item.direction === "up"
                                    ? "bg-indigo-50 text-indigo-700"
                                    : item.direction === "down"
                                    ? "bg-amber-50 text-amber-700"
                                    : "bg-slate-100 text-slate-600"
                                }`}
                              >
                                {item.direction === "up" && <ArrowUp className="w-3 h-3" />}
                                {item.direction === "down" && <ArrowDown className="w-3 h-3" />}
                                {item.direction === "unchanged" && <Minus className="w-3 h-3" />}
                                <span>
                                  {item.delta > 0 ? `+${item.delta}` : item.delta} {item.unit}
                                </span>
                              </span>
                              {item.statusShift === "normalized" && (
                                <span className="text-[9px] font-bold text-teal-700 uppercase mt-0.5">
                                  Normalized
                                </span>
                              )}
                              {item.statusShift === "diverged" && (
                                <span className="text-[9px] font-bold text-rose-700 uppercase mt-0.5">
                                  Shifted Out
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px]">—</span>
                          )}
                        </td>

                        {/* Trend analysis trigger */}
                        <td className="py-3.5 px-3 text-right">
                          <button
                            onClick={() => setSelectedTrendBiomarker(item.testName)}
                            className="px-2.5 py-1 rounded text-xs font-semibold text-teal-800 hover:bg-teal-100/60 transition-colors"
                          >
                            View Trend
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* SECTION: HISTORICAL BIOMARKER TREND VIEW */}
        {activeTrend && activeTrend.trendHistory && (
          <section className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-teal-800" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Historical Progression: {activeTrend.testName} ({activeTrend.unit})
                </h3>
              </div>
              <span className="text-xs text-slate-500">
                Chronological values without predictive extrapolation
              </span>
            </div>

            {/* Simple Visual Trend Track */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {activeTrend.trendHistory.map((pt: any, i: number) => (
                  <div
                    key={i}
                    className="p-3 rounded-lg bg-white border border-slate-200 shadow-2xs text-center"
                  >
                    <span className="text-[10px] text-slate-400 block font-mono">
                      {pt.date}
                    </span>
                    <p className="text-lg font-mono font-extrabold text-teal-900 mt-1">
                      {pt.value} <span className="text-xs font-normal text-slate-500">{activeTrend.unit}</span>
                    </p>
                    <p className="text-[10px] text-slate-500 truncate mt-0.5">
                      {pt.documentName}
                    </p>
                  </div>
                ))}
              </div>

              <div className="p-3 rounded-lg bg-white border border-slate-200 text-xs text-slate-600 flex items-start gap-2">
                <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <p>
                  <strong>MedLens Safety Principle:</strong> Trend views display historical values chronologically. MedLens never forecasts future biomarkers or diagnoses causation.
                </p>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* MODALS */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSuccess={() => {
          fetchRecords();
          fetchComparison();
        }}
      />

      <SourcePassportModal
        item={passportItem}
        isOpen={!!passportItem}
        onClose={() => setPassportItem(null)}
      />
    </div>
  );
}
