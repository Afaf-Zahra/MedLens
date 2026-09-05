"use client";

import React, { useState, useEffect } from "react";
import {
  Shield,
  Eye,
  EyeOff,
  Share2,
  Lock,
  Download,
  Trash2,
  CheckCircle2,
  Copy,
  QrCode,
  AlertTriangle,
  FileText,
  Sparkles,
} from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { UploadModal } from "@/components/UploadModal";
import { maskPII, formatDate } from "@/lib/utils";

export default function PrivacyPage() {
  const [data, setData] = useState<any | null>(null);
  const [shareData, setShareData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPrivacyMode, setIsPrivacyMode] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Controlled sharing checkboxes
  const [permissions, setPermissions] = useState({
    basicInfo: true,
    allergies: true,
    medications: true,
    conditions: true,
    labResults: true,
    timeline: true,
    originalDocuments: false,
  });

  const fetchRecords = async () => {
    try {
      const res = await fetch("/api/records");
      const json = await res.json();
      setData(json);
      setIsPrivacyMode(json.patient?.isPrivacyMode || false);

      const shareRes = await fetch("/api/share");
      const shareJson = await shareRes.json();
      setShareData(shareJson);
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

  const handleCreateShare = async () => {
    try {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions }),
      });
      const json = await res.json();
      if (json.success) {
        setShareData((prev: any) => ({ ...prev, activeSession: json.session }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRevokeShare = async () => {
    if (!shareData?.activeSession) return;
    try {
      await fetch("/api/share", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: shareData.activeSession.shareToken }),
      });
      setShareData((prev: any) => ({ ...prev, activeSession: null }));
    } catch (e) {
      console.error(e);
    }
  };

  const handleDownloadFullExport = () => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `medlens_patient_record_${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const patient = data?.patient;
  const readiness = data?.readiness || { score: 82, breakdown: [] };
  const shareUrl = shareData?.activeSession
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/shared/${shareData.activeSession.shareToken}`
    : "";

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
        <div className="border-b border-slate-200 pb-5">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-900 border border-indigo-200">
              Patient Trust & Governance
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500">HIPAA Minded Architecture</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mt-1">
            Privacy Center & Controlled Sharing
          </h1>
          <p className="text-xs text-slate-600 mt-0.5 max-w-xl">
            You maintain complete control over your health information. Toggle Privacy Mode, configure expiring share links with granular permissions, and export your data anytime.
          </p>
        </div>

        {/* SECTION 1: ONE-CLICK PRIVACY MODE */}
        <section className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200">
                  {isPrivacyMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </span>
                <h2 className="text-base font-bold text-slate-900">
                  One-Click Demonstration Privacy Mode
                </h2>
              </div>
              <p className="text-xs text-slate-600 max-w-xl">
                Instantly masks Personally Identifiable Information (Full Name, Date of Birth, Email, Phone, Patient ID) across all screens while keeping clinical records fully readable.
              </p>
            </div>

            <button
              onClick={handleTogglePrivacy}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer ${
                isPrivacyMode
                  ? "bg-amber-600 hover:bg-amber-700 text-white"
                  : "bg-slate-900 hover:bg-slate-800 text-white"
              }`}
            >
              {isPrivacyMode ? "Disable Privacy Mode" : "Enable Privacy Mode"}
            </button>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-[10px] uppercase text-slate-400 block">Current Display Name</span>
              <strong className="text-slate-900">{maskPII(patient?.fullName, isPrivacyMode)}</strong>
            </div>
            <div>
              <span className="text-[10px] uppercase text-slate-400 block">Current Display Phone</span>
              <strong className="text-slate-900 font-mono">{maskPII(patient?.phone, isPrivacyMode)}</strong>
            </div>
            <div>
              <span className="text-[10px] uppercase text-slate-400 block">Status</span>
              <span className={`font-bold ${isPrivacyMode ? "text-amber-800" : "text-slate-600"}`}>
                {isPrivacyMode ? "PII Masking Active (Demo Safe)" : "Standard View"}
              </span>
            </div>
          </div>
        </section>

        {/* SECTION 2: CONTROLLED SHARING FLOW */}
        <section className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Share2 className="w-4 h-4 text-teal-800" />
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Controlled Sharing Engine
              </h2>
            </div>
            <span className="text-xs text-slate-500">Expiring Patient Token</span>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-slate-700">
              Select granular sections to include in share link:
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              {[
                { key: "basicInfo", label: "Basic Demographics" },
                { key: "allergies", label: "Allergies" },
                { key: "medications", label: "Medications" },
                { key: "conditions", label: "Conditions" },
                { key: "labResults", label: "Lab Results" },
                { key: "timeline", label: "Medical Timeline" },
                { key: "originalDocuments", label: "Raw PDF Documents" },
              ].map((perm) => (
                <label
                  key={perm.key}
                  className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={(permissions as any)[perm.key]}
                    onChange={(e) =>
                      setPermissions((prev) => ({
                        ...prev,
                        [perm.key]: e.target.checked,
                      }))
                    }
                    className="rounded text-teal-800 focus:ring-teal-700"
                  />
                  <span className="text-slate-800 font-medium text-[11px]">{perm.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* ACTIVE SHARE LINK STATUS */}
          {shareData?.activeSession ? (
            <div className="p-4 rounded-xl bg-teal-50/70 border border-teal-200 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-teal-100 text-teal-900">
                    Active Share Link
                  </span>
                  <p className="text-xs font-semibold text-teal-950 mt-1 font-mono">
                    Token: {shareData.activeSession.shareToken}
                  </p>
                  <p className="text-[11px] text-teal-800">
                    Expires: {formatDate(shareData.activeSession.expiresAt)}
                  </p>
                </div>

                <button
                  onClick={handleRevokeShare}
                  className="px-3 py-1.5 rounded-md bg-rose-800 hover:bg-rose-900 text-white text-xs font-semibold shrink-0 cursor-pointer"
                >
                  Revoke Share Access
                </button>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-teal-200/60">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  className="flex-1 bg-white border border-teal-300 rounded px-3 py-1 text-xs font-mono text-slate-800"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(shareUrl);
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 2000);
                  }}
                  className="px-3 py-1 rounded bg-teal-800 hover:bg-teal-900 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  {copiedLink ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? "Copied" : "Copy Link"}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="pt-2">
              <button
                onClick={handleCreateShare}
                className="px-4 py-2 rounded-md bg-teal-800 hover:bg-teal-900 text-white text-xs font-semibold shadow-xs cursor-pointer"
              >
                Generate Expiring Share Link
              </button>
            </div>
          )}
        </section>

        {/* SECTION 3: DATA EXPORT & AUDIT */}
        <section className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Download className="w-4 h-4 text-teal-800" />
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Complete Record Export (JSON)
              </h2>
            </div>
            <span className="text-xs text-slate-500">Data Portability Guarantee</span>
          </div>

          <p className="text-xs text-slate-600">
            Download your full Living Medical Record including original document text, extracted biomarkers with reference ranges, medication logs, and audit trails.
          </p>

          <button
            onClick={handleDownloadFullExport}
            className="flex items-center gap-2 px-4 py-2 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download My Medical Records (JSON)</span>
          </button>
        </section>
      </main>

      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSuccess={() => fetchRecords()}
      />
    </div>
  );
}
