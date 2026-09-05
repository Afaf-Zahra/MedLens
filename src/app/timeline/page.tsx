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
} from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { UploadModal } from "@/components/UploadModal";
import { formatDate } from "@/lib/utils";

export default function TimelinePage() {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPrivacyMode, setIsPrivacyMode] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("all");

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

  const patient = data?.patient;
  const readiness = data?.readiness || { score: 82, breakdown: [] };
  const timelineEvents = data?.timelineEvents || [];

  const filteredEvents = timelineEvents.filter((evt: any) => {
    if (categoryFilter === "all") return true;
    return evt.category === categoryFilter;
  });

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
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-teal-100 text-teal-900">
                Story Rail
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-500">Chronological Medical Continuum</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mt-1">
              Living Medical Timeline
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">
              Continuously updated story connecting laboratory investigations, prescriptions, verified facts, and clinical actions.
            </p>
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

        {/* TIMELINE STORY RAIL */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs">
          <div className="relative pl-8 sm:pl-10 space-y-8 before:content-[''] before:absolute before:left-3.5 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-gradient-to-b before:from-teal-700 before:via-slate-300 before:to-slate-200">
            {filteredEvents.map((evt: any) => {
              const isCoral = evt.statusHighlight === "coral";
              const isAmber = evt.statusHighlight === "amber";
              const isLavender = evt.statusHighlight === "lavender";

              return (
                <div key={evt.id} className="relative group">
                  {/* Pin Node */}
                  <div
                    className={`absolute -left-[37px] sm:-left-[39px] top-1 w-4 h-4 rounded-full border-3 bg-white shadow-xs transition-transform group-hover:scale-125 ${
                      isCoral
                        ? "border-rose-600 ring-4 ring-rose-50"
                        : isAmber
                        ? "border-amber-500 ring-4 ring-amber-50"
                        : isLavender
                        ? "border-indigo-600 ring-4 ring-indigo-50"
                        : "border-teal-700 ring-4 ring-teal-50"
                    }`}
                  />

                  {/* Event Card */}
                  <div className="p-4 sm:p-5 rounded-xl bg-slate-50/70 border border-slate-200 hover:border-slate-300 hover:bg-white transition-all shadow-2xs space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-teal-900 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                          {formatDate(evt.eventDate)}
                        </span>
                        {evt.badge && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-200/70 text-slate-700">
                            {evt.badge}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 capitalize">
                        {evt.category} event
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900">{evt.title}</h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {evt.description}
                    </p>

                    {evt.documentId && (
                      <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                        <span className="text-slate-500 flex items-center gap-1">
                          <FileText className="w-3 h-3 text-slate-400" />
                          <span>Linked to original source record</span>
                        </span>
                        <span className="text-teal-800 font-semibold flex items-center gap-0.5">
                          <span>Traceable</span>
                          <CheckCircle2 className="w-3 h-3" />
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSuccess={() => fetchRecords()}
      />
    </div>
  );
}
