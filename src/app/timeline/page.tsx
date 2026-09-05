"use client";

import React, { useState, useEffect } from "react";
import {
  Clock,
  Filter,
  FileText,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  ShieldCheck,
  Loader2,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { UploadModal } from "@/components/UploadModal";
import { SourcePassportModal } from "@/components/SourcePassportModal";
import { BiomarkerTrendChart } from "@/components/BiomarkerTrendChart";
import { buildLongitudinalTrends, generateSmartRecordAlerts } from "@/lib/evidence-graph";
import type { HealthStoryEvent, LongitudinalDataPoint, SmartRecordAlert } from "@/lib/types";

export default function TimelinePage() {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPrivacyMode, setIsPrivacyMode] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Health Story State
  const [healthStory, setHealthStory] = useState<HealthStoryEvent[]>([]);
  const [storyLoading, setStoryLoading] = useState(false);
  const [storyGenerated, setStoryGenerated] = useState(false);

  // Passport modal
  const [passportItem, setPassportItem] = useState<any | null>(null);

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

  const handleGenerateHealthStory = async () => {
    setStoryLoading(true);
    try {
      const res = await fetch("/api/ai/health-story");
      const json = await res.json();
      if (json.events) {
        setHealthStory(json.events);
        setStoryGenerated(true);
      }
    } catch (err) {
      console.error("Health Story generation error:", err);
    } finally {
      setStoryLoading(false);
    }
  };

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
  const timelineEvents = data?.timelineEvents || [];
  const labResults = data?.labResults || [];
  const documents = data?.documents || [];
  const allergies = data?.allergies || [];
  const medications = data?.medications || [];

  // Longitudinal Trends & Smart Alerts
  const trends = buildLongitudinalTrends(labResults);
  const alerts: SmartRecordAlert[] = generateSmartRecordAlerts({
    labResults,
    documents,
    allergies,
    medications,
  });

  const filteredEvents = timelineEvents.filter((evt: any) => {
    if (categoryFilter === "all") return true;
    return evt.category === categoryFilter;
  });

  const handleTrendPointSelect = (pt: LongitudinalDataPoint) => {
    setPassportItem({
      testName: pt.documentName,
      value: pt.value,
      unit: pt.unit,
      status: pt.status,
      refRangeText: pt.refRangeText,
      sourceDocumentName: pt.documentName,
      reportDate: pt.date,
      rawSnippet: pt.snippet || `${pt.value} ${pt.unit}`,
    });
  };

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

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-7">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-teal-100 text-teal-900 border border-teal-200">
                Google Gemini Record Intelligence
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-500 font-medium">Longitudinal Continuum</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mt-1">
              Living Medical Timeline & Story
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">
              Continuously updated chronicle connecting laboratory investigations, medications, and clinical records.
            </p>
          </div>

          {/* Action: Generate Gemini Health Story */}
          <button
            type="button"
            onClick={handleGenerateHealthStory}
            disabled={storyLoading || documents.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-800 hover:bg-teal-900 disabled:opacity-50 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer shrink-0"
          >
            {storyLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 text-amber-300" />
            )}
            <span>Generate My Health Story with Gemini</span>
          </button>
        </div>

        {/* FEATURE 10: SMART RECORD ALERTS */}
        {alerts.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                Smart Record Alerts ({alerts.length})
              </span>
              <span className="text-[11px] text-slate-400">Non-diagnostic record intelligence</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {alerts.slice(0, 4).map((alert) => (
                <div
                  key={alert.id}
                  className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                    alert.severity === "caution"
                      ? "bg-rose-50/70 border-rose-200 text-rose-950"
                      : alert.severity === "warning"
                      ? "bg-amber-50/70 border-amber-200 text-amber-950"
                      : "bg-teal-50/70 border-teal-200 text-teal-950"
                  }`}
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 opacity-80" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-xs">{alert.title}</h4>
                      <span className="text-[9px] font-semibold uppercase opacity-70">
                        {alert.coverage}
                      </span>
                    </div>
                    <p className="text-[11px] opacity-90 mt-0.5 leading-relaxed">{alert.message}</p>
                    <span className="text-[10px] text-slate-500 block mt-1">
                      Report: {alert.sourceDocumentName} ({alert.reportDate})
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FEATURE 8: GEMINI HEALTH STORY VIEW */}
        {storyGenerated && healthStory.length > 0 && (
          <section className="bg-gradient-to-br from-teal-900 via-teal-950 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-lg space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-teal-800/80 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span className="text-xs uppercase font-bold tracking-wider text-teal-200">
                    Gemini Health Story
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-bold mt-0.5">
                  Your Chronological Patient Journey
                </h3>
                <p className="text-xs text-teal-200/80 mt-0.5">
                  Synthesized strictly from {documents.length} verified patient document(s). Non-diagnostic.
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-teal-800/80 text-[11px] font-semibold text-teal-200 border border-teal-700">
                Strong Record Grounding
              </span>
            </div>

            {/* Interactive Timeline Milestones */}
            <div className="space-y-4">
              {healthStory.map((event, i) => (
                <div
                  key={event.id || i}
                  className="p-4 rounded-xl bg-white/10 hover:bg-white/15 backdrop-blur-xs border border-white/10 transition-colors flex flex-col sm:flex-row sm:items-start justify-between gap-3"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 text-xs text-amber-300 font-mono font-semibold">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{event.displayDate || event.date}</span>
                    </div>
                    <h4 className="text-sm font-bold text-white">{event.title}</h4>
                    <p className="text-xs text-teal-100/90 leading-relaxed">{event.narrative}</p>

                    {event.findings && event.findings.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {event.findings.map((f, fi) => (
                          <span
                            key={fi}
                            className="px-2 py-0.5 rounded bg-teal-800/60 text-teal-200 text-[10px] font-medium"
                          >
                            {f}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setPassportItem({
                        testName: event.title,
                        value: "Verified Milestone",
                        unit: "",
                        sourceDocumentName: event.sourceDocuments?.[0] || "Medical Document",
                        reportDate: event.date,
                        rawSnippet: event.findings?.join("; ") || event.narrative,
                      });
                    }}
                    className="px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-semibold cursor-pointer shrink-0 transition-colors flex items-center gap-1 self-start sm:self-center"
                  >
                    <span>View Source</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* FEATURE 9: VISUAL LONGITUDINAL BIOMARKER TREND CHART */}
        {trends.length > 0 && (
          <BiomarkerTrendChart
            trends={trends}
            onSelectPoint={handleTrendPointSelect}
          />
        )}

        {/* TIMELINE STORY RAIL */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-teal-800" />
                <span>Documented Continuum ({filteredEvents.length} events)</span>
              </h2>
            </div>

            {/* FILTERS */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              {[
                { id: "all", label: "All Events" },
                { id: "labs", label: "Labs" },
                { id: "prescriptions", label: "Prescriptions" },
                { id: "medications", label: "Medications" },
                { id: "system", label: "Verifications" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setCategoryFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                    categoryFilter === tab.id
                      ? "bg-teal-800 text-white font-semibold shadow-xs"
                      : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="relative pl-8 sm:pl-10 space-y-8 before:content-[''] before:absolute before:left-3.5 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-gradient-to-b before:from-teal-700 before:via-slate-300 before:to-slate-200">
            {filteredEvents.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                No events found for this filter.
              </div>
            ) : (
              filteredEvents.map((evt: any) => {
                const isCoral = evt.statusHighlight === "coral";
                return (
                  <div key={evt.id} className="relative group">
                    <div
                      className={`absolute -left-8 sm:-left-10 top-1 w-3.5 sm:w-4 h-3.5 sm:h-4 rounded-full border-2 border-white transition-all ${
                        isCoral ? "bg-rose-500 ring-4 ring-rose-100" : "bg-teal-700 ring-4 ring-teal-100"
                      }`}
                    />
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-slate-300 transition-all space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {evt.eventDate}
                        </span>
                        {evt.badge && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-white border border-slate-200 text-slate-700">
                            {evt.badge}
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-bold text-slate-900">{evt.title}</h4>
                      <p className="text-xs text-slate-600 leading-relaxed">{evt.description}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
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
      />
    </div>
  );
}
