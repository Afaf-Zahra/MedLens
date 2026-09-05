"use client";

import React, { useState, useEffect } from "react";
import {
  FileSpreadsheet,
  Plus,
  Search,
  Filter,
  ShieldCheck,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  ExternalLink,
  FileText,
  User,
  Trash2,
  X,
} from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { UploadModal } from "@/components/UploadModal";
import { SourcePassportModal } from "@/components/SourcePassportModal";
import { SideBySideReviewModal } from "@/components/SideBySideReviewModal";
import { maskPII, formatDate } from "@/lib/utils";

export default function LivingRecordPage() {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPrivacyMode, setIsPrivacyMode] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  // Filter & Search
  const [labFilter, setLabFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [passportItem, setPassportItem] = useState<any | null>(null);
  const [sideBySideItem, setSideBySideItem] = useState<any | null>(null);

  // Add Item Modals
  const [addModalType, setAddModalType] = useState<"symptom" | "condition" | "medication" | null>(null);
  const [newSymptom, setNewSymptom] = useState({ symptom: "", onset: "", notes: "" });
  const [newCondition, setNewCondition] = useState({ condition: "", diagnosedDate: "", status: "active" });
  const [newMed, setNewMed] = useState({ name: "", dose: "", unit: "mg", frequency: "" });

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

  const handleAddSymptom = async () => {
    if (!newSymptom.symptom) return;
    // Add locally and to database
    await fetch("/api/patient/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        notes: `${data.patient?.notes || ""}\nAdded symptom: ${newSymptom.symptom}`,
      }),
    });
    setAddModalType(null);
    fetchRecords();
  };

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-[#FBFBFA] flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-2 border-teal-800 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500">Loading structured clinical records...</p>
        </div>
      </div>
    );
  }

  const patient = data.patient;
  const symptoms = data.symptoms || [];
  const conditions = data.conditions || [];
  const allergies = data.allergies || [];
  const meds = data.medications || [];
  const docs = data.documents || [];
  const labs = data.labResults || [];
  const conflicts = data.conflicts || [];
  const readiness = data.readiness || { score: 82, breakdown: [] };

  // Filtered labs
  const filteredLabs = labs.filter((l: any) => {
    const matchesSearch =
      l.testName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.sourceDocumentName.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (labFilter === "out_of_range") return l.status === "low" || l.status === "high";
    if (labFilter === "normal") return l.status === "normal";
    if (labFilter === "no_range") return l.status === "range_not_provided";
    return true;
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

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
        {/* PAGE HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-teal-50 text-teal-800 border border-teal-200">
                Continuous Provenance
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-500">
                Patient: <strong>{maskPII(patient?.fullName, isPrivacyMode)}</strong>
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
              Living Medical Record
            </h1>
            <p className="text-xs text-slate-600 mt-0.5 max-w-xl">
              Unified structured patient history. Every fact links to its original source report or user statement.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsUploadOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-teal-800 hover:bg-teal-900 text-white text-xs font-semibold shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Document</span>
            </button>
          </div>
        </div>

        {/* SECTION 1: DEMOGRAPHICS & INTAKE CONTEXT */}
        <section className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-teal-800" />
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Patient Demographics & Provenance
              </h2>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
              Patient Provided
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-slate-500">Full Name</span>
              <p className="text-sm font-bold text-slate-900 mt-0.5">
                {maskPII(patient?.fullName, isPrivacyMode)}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-slate-500">Date of Birth / Age</span>
              <p className="text-sm font-bold text-slate-900 mt-0.5">
                {maskPII(patient?.dob, isPrivacyMode)} (34y)
              </p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-slate-500">Sex / Gender</span>
              <p className="text-sm font-bold text-slate-900 mt-0.5">
                {patient?.sex || "Female"}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-slate-500">Contact / Phone</span>
              <p className="text-sm font-mono font-bold text-slate-900 mt-0.5">
                {maskPII(patient?.phone, isPrivacyMode)}
              </p>
            </div>
          </div>
        </section>

        {/* SECTION 2: PATIENT FACTS (SYMPTOMS, CONDITIONS, ALLERGIES) */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Symptoms */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Symptoms ({symptoms.length})
              </h3>
              <span className="text-[10px] text-teal-800 font-semibold bg-teal-50 px-1.5 py-0.2 rounded border border-teal-200">
                Patient reported
              </span>
            </div>
            <div className="space-y-2">
              {symptoms.map((s: any) => (
                <div key={s.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                  <div className="font-semibold text-slate-900">{s.symptom}</div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Onset: {s.onset} • {s.duration || "Intermittent"}
                  </p>
                  {s.notes && (
                    <p className="text-[11px] text-slate-600 mt-1 italic">&ldquo;{s.notes}&rdquo;</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Conditions */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Known Conditions ({conditions.length})
              </h3>
              <span className="text-[10px] text-teal-800 font-semibold bg-teal-50 px-1.5 py-0.2 rounded border border-teal-200">
                Patient confirmed
              </span>
            </div>
            <div className="space-y-2">
              {conditions.map((c: any) => (
                <div key={c.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                  <div className="font-semibold text-slate-900">{c.condition}</div>
                  <div className="flex justify-between items-center text-[11px] text-slate-500 mt-1">
                    <span>Noted: {c.diagnosedDate}</span>
                    <span className="px-1.5 py-0.2 rounded bg-teal-100 text-teal-800 uppercase font-bold text-[9px]">
                      {c.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Allergies & Conflict state */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Allergies ({allergies.length})
              </h3>
              {conflicts.length > 0 ? (
                <span className="text-[10px] text-rose-800 font-bold bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200 animate-pulse">
                  Conflict Active
                </span>
              ) : (
                <span className="text-[10px] text-teal-800 font-semibold bg-teal-50 px-1.5 py-0.2 rounded border border-teal-200">
                  Verified
                </span>
              )}
            </div>
            <div className="space-y-2">
              {allergies.map((a: any) => (
                <div
                  key={a.id}
                  className={`p-2.5 rounded-lg text-xs border ${
                    conflicts.length > 0
                      ? "bg-rose-50/50 border-rose-200"
                      : "bg-slate-50 border-slate-100"
                  }`}
                >
                  <div className="font-semibold text-slate-900">{a.allergen}</div>
                  <p className="text-[11px] text-slate-500 mt-0.5">{a.reaction}</p>
                </div>
              ))}
              {conflicts.length > 0 && (
                <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-900">
                  <strong>Notice:</strong> Old clinical intake document recorded Penicillin sensitivity. See Verification Inbox to resolve.
                </div>
              )}
            </div>
          </div>
        </section>

        {/* SECTION 3: MEDICATIONS WITH PROVENANCE & VERIFICATION RINGS */}
        <section className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-teal-800" />
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Current Medications ({meds.length})
              </h2>
            </div>
            <span className="text-xs text-slate-500">
              Provenance-Linked Pharmacotherapy
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {meds.map((m: any) => {
              const isPending = m.verificationStatus === "pending";
              return (
                <div
                  key={m.id}
                  onClick={() => setPassportItem(m)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer group ${
                    isPending
                      ? "bg-amber-50/40 border-amber-300 ring-1 ring-amber-300/60"
                      : "bg-slate-50/60 border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-slate-900">{m.name}</h4>
                        {isPending ? (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-amber-100 text-amber-900 border border-amber-300">
                            Needs Verification
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-teal-100 text-teal-800">
                            Confirmed
                          </span>
                        )}
                      </div>
                      <p className="font-mono text-base font-extrabold text-teal-900 mt-1">
                        {m.dose} {m.unit}
                      </p>
                      <p className="text-xs text-slate-600 mt-0.5">{m.frequency}</p>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">
                        Provenance
                      </span>
                      <p className="text-[11px] font-medium text-slate-700">
                        {m.source === "user_input" ? "Patient entered" : m.sourceDocumentName}
                      </p>
                      <p className="text-[10px] text-teal-800 flex items-center justify-end gap-0.5 group-hover:underline mt-2">
                        <span>Source Passport</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* SECTION 4: STRUCTURED LABORATORY RESULTS WITH SEARCH & FILTERS */}
        <section className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-teal-800" />
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Structured Laboratory Results ({labs.length})
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Every value preserves its source document and printed reference range
              </p>
            </div>

            {/* Filter chips */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              {[
                { id: "all", label: "All Tests" },
                { id: "out_of_range", label: "Outside Source Range" },
                { id: "normal", label: "Within Range" },
                { id: "no_range", label: "Range Omitted" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setLabFilter(tab.id)}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                    labFilter === tab.id
                      ? "bg-teal-800 text-white font-semibold"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search tests (e.g. Hemoglobin, TSH, Platelets) or document name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-700"
            />
          </div>

          {/* LAB TABLE */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Test Name</th>
                  <th className="py-2.5 px-3">Result</th>
                  <th className="py-2.5 px-3">Source Reference Range</th>
                  <th className="py-2.5 px-3">Classification</th>
                  <th className="py-2.5 px-3">Report & Date</th>
                  <th className="py-2.5 px-3 text-right">Passport</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLabs.map((lab: any) => (
                  <tr
                    key={lab.id}
                    onClick={() => setPassportItem(lab)}
                    className="hover:bg-teal-50/40 transition-colors cursor-pointer group"
                  >
                    <td className="py-3 px-3 font-semibold text-slate-900">
                      {lab.testName}
                    </td>
                    <td className="py-3 px-3 font-mono font-extrabold text-sm text-slate-900">
                      {lab.value} <span className="text-xs font-normal text-slate-500">{lab.unit}</span>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-600">
                      {lab.refRangeText ? (
                        <span>{lab.refRangeText}</span>
                      ) : (
                        <span className="text-amber-800 italic">Not provided in source</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          lab.status === "normal"
                            ? "bg-teal-100 text-teal-800"
                            : lab.status === "low" || lab.status === "high"
                            ? "bg-rose-100 text-rose-800"
                            : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {lab.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      <p className="font-medium text-slate-800">{lab.sourceDocumentName}</p>
                      <span className="text-[10px] text-slate-400">{lab.reportDate}</span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button className="text-teal-800 hover:text-teal-900 font-semibold text-xs flex items-center justify-end gap-1 ml-auto group-hover:underline">
                        <span>Inspect</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* SECTION 5: SOURCE DOCUMENTS ARCHIVE */}
        <section className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-teal-800" />
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Preserved Source Documents ({docs.length})
              </h2>
            </div>
            <span className="text-xs text-slate-500">
              Unaltered Original Truth
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {docs.map((doc: any) => (
              <div
                key={doc.id}
                className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-teal-100 text-teal-800">
                      {doc.docType}
                    </span>
                    <span className="text-xs text-slate-500">{doc.reportDate}</span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm mt-1">{doc.filename}</h4>
                  <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                    {doc.summary || "Structured extraction complete."}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-xs">
                  <span className="text-[11px] font-mono text-slate-400">
                    Hash: {doc.contentHash?.substring(0, 12)}...
                  </span>
                  <button
                    onClick={() => {
                      const firstLab = labs.find((l: any) => l.documentId === doc.id);
                      if (firstLab) setSideBySideItem(firstLab);
                    }}
                    className="text-teal-800 font-semibold hover:underline flex items-center gap-1"
                  >
                    <span>Side-by-Side Review</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
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
