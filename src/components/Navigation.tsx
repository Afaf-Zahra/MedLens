"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  FileText,
  Clock,
  CheckCircle2,
  GitCompare,
  MessageSquare,
  ClipboardList,
  FileSpreadsheet,
  Shield,
  Upload,
  Eye,
  EyeOff,
  RotateCcw,
  Sparkles,
  Menu,
  X,
  AlertTriangle,
  Info,
  User,
  ArrowRightLeft,
} from "lucide-react";
import { maskPII } from "@/lib/utils";

interface NavigationProps {
  isPrivacyMode: boolean;
  onTogglePrivacy: () => void;
  onOpenUpload: () => void;
  readinessScore?: number;
  readinessBreakdown?: { label: string; status: string; detail: string }[];
  patientName?: string;
  isDemoMode?: boolean;
}

export function Navigation({
  isPrivacyMode,
  onTogglePrivacy,
  onOpenUpload,
  readinessScore = 82,
  readinessBreakdown = [],
  patientName = "Patient",
  isDemoMode = false,
}: NavigationProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [showReadinessModal, setShowReadinessModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSwitchingMode, setIsSwitchingMode] = useState(false);

  const navLinks = [
    { href: "/", label: "Overview", icon: FileText },
    { href: "/record", label: "Living Record", icon: FileSpreadsheet },
    { href: "/what-changed", label: "What Changed?", icon: GitCompare, badge: "Flagship" },
    { href: "/timeline", label: "Timeline", icon: Clock },
    { href: "/verification", label: "Verification", icon: CheckCircle2 },
    { href: "/ask", label: "Ask Records", icon: MessageSquare },
    { href: "/visit-prep", label: "Visit Prep", icon: ClipboardList },
    { href: "/handoff", label: "Doctor Handoff", icon: FileText },
    { href: "/privacy", label: "Privacy & Share", icon: Shield },
  ];

  const handleToggleDemo = async () => {
    setIsSwitchingMode(true);
    try {
      await fetch("/api/auth/demo-toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: isDemoMode ? "real" : "demo" }),
      });
      window.location.reload();
    } finally {
      setIsSwitchingMode(false);
    }
  };

  return (
    <>
      {/* Demo Mode Notification Bar */}
      {isDemoMode && (
        <div className="bg-amber-500 text-amber-950 px-4 py-1 text-xs font-semibold flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2 max-w-7xl mx-auto w-full">
            <Sparkles className="w-3.5 h-3.5 shrink-0 text-amber-900" />
            <span>
              <strong>Demo Patient Active:</strong> Viewing segregated sample records for Eleanor Vance. Real user records remain unaffected.
            </span>
            <button
              onClick={handleToggleDemo}
              disabled={isSwitchingMode}
              className="ml-auto underline hover:text-white cursor-pointer"
            >
              Exit Demo Mode
            </button>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-40 bg-[#FBFBFA]/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo & Clinical Brand */}
            <div className="flex items-center gap-3">
              <Link href="/" className="flex items-center gap-2.5 group">
                <div className="w-9 h-9 rounded-lg bg-teal-800 text-white flex items-center justify-center font-bold text-lg shadow-sm group-hover:bg-teal-700 transition-colors">
                  <span className="tracking-tighter">M</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-300 ml-0.5"></span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-lg tracking-tight text-slate-900">
                      MEDLENS
                    </span>
                    <span className="px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider bg-teal-50 text-teal-800 border border-teal-200 rounded">
                      Provenance Intelligence
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 hidden sm:block">
                    From scattered reports to one trusted medical story
                  </p>
                </div>
              </Link>
            </div>

            {/* Center / Right Header Utilities */}
            <div className="flex items-center gap-2 sm:gap-4">
              {/* Record Readiness Indicator */}
              <button
                onClick={() => setShowReadinessModal(true)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-white border border-slate-200 hover:border-slate-300 shadow-sm transition-all text-xs font-medium text-slate-700 group cursor-pointer"
                title="Record Readiness measures completeness and verification, not medical health."
              >
                <div className="relative w-5 h-5 flex items-center justify-center">
                  <svg className="w-5 h-5 -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-slate-100"
                      strokeWidth="4"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className="text-teal-600 transition-all duration-500"
                      strokeDasharray={`${readinessScore}, 100`}
                      strokeWidth="4"
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <span className="absolute text-[8px] font-bold text-slate-800">
                    {readinessScore}
                  </span>
                </div>
                <span className="hidden md:inline text-slate-600 group-hover:text-slate-900">
                  Readiness: <strong className="text-teal-800">{readinessScore}%</strong>
                </span>
              </button>

              {/* Privacy Mode Toggle */}
              <button
                onClick={onTogglePrivacy}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
                  isPrivacyMode
                    ? "bg-amber-50 border-amber-300 text-amber-900"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
                title={isPrivacyMode ? "Privacy Mode Active (PII Masked)" : "Click to mask PII for demonstration"}
              >
                {isPrivacyMode ? <EyeOff className="w-3.5 h-3.5 text-amber-700" /> : <Eye className="w-3.5 h-3.5 text-slate-500" />}
                <span className="hidden sm:inline">
                  {isPrivacyMode ? "Privacy Mode ON" : "Privacy Mode"}
                </span>
              </button>

              {/* Upload Action */}
              <button
                onClick={onOpenUpload}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-teal-800 hover:bg-teal-900 text-white text-xs font-medium shadow-sm transition-all cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span className="font-semibold">Add Record</span>
              </button>

              {/* Try Demo / Exit Demo Button */}
              <button
                onClick={handleToggleDemo}
                disabled={isSwitchingMode}
                className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold border transition-colors cursor-pointer ${
                  isDemoMode
                    ? "bg-amber-100 border-amber-300 text-amber-900 hover:bg-amber-200"
                    : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <ArrowRightLeft className="w-3 h-3 text-slate-600" />
                <span>{isDemoMode ? "Exit Demo" : "Try Demo"}</span>
              </button>

              {/* Mobile menu toggle */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-1.5 rounded text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Primary Desktop Navigation Bar */}
        <div className="hidden md:block border-t border-slate-200 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex space-x-1 lg:space-x-2 py-1.5 overflow-x-auto">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                      isActive
                        ? "bg-slate-100 text-teal-900 font-semibold"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? "text-teal-700" : "text-slate-400"}`} />
                    <span>{link.label}</span>
                    {link.badge && (
                      <span className="px-1.5 py-0.2 text-[9px] font-bold bg-teal-100 text-teal-800 rounded uppercase">
                        {link.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-2 pb-4 space-y-1 shadow-lg">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium ${
                    isActive ? "bg-teal-50 text-teal-900 font-semibold" : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 text-slate-500" />
                    <span>{link.label}</span>
                  </div>
                  {link.badge && (
                    <span className="px-1.5 py-0.5 text-[10px] font-bold bg-teal-100 text-teal-800 rounded">
                      {link.badge}
                    </span>
                  )}
                </Link>
              );
            })}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">Patient: {maskPII(patientName, isPrivacyMode)}</span>
              <button
                onClick={handleToggleDemo}
                className="text-xs text-teal-800 font-semibold underline"
              >
                {isDemoMode ? "Exit Demo" : "Try Demo"}
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Record Readiness Detail Modal */}
      {showReadinessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Record Readiness
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Completeness and verification state of this Living Medical Record
                </p>
              </div>
              <button
                onClick={() => setShowReadinessModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="my-5 p-4 rounded-lg bg-teal-50/70 border border-teal-200 flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-teal-800 text-white flex flex-col items-center justify-center shrink-0">
                <span className="text-lg font-bold leading-none">{readinessScore}%</span>
                <span className="text-[8px] uppercase tracking-wider text-teal-200 mt-0.5">Ready</span>
              </div>
              <div>
                <p className="text-xs font-medium text-teal-950">
                  Calculated Record Completeness
                </p>
                <p className="text-xs text-teal-800 mt-0.5">
                  Evaluates basic profile completeness, verified allergies, medication reconciliation, and uploaded documents.
                </p>
              </div>
            </div>

            <div className="space-y-2.5">
              <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Readiness Breakdown
              </h4>
              {readinessBreakdown.length > 0 ? (
                readinessBreakdown.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-start justify-between text-xs p-2 rounded bg-slate-50 border border-slate-100"
                  >
                    <div>
                      <span className="font-medium text-slate-800">{item.label}</span>
                      <p className="text-[11px] text-slate-500">{item.detail}</p>
                    </div>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold shrink-0 uppercase tracking-wider ${
                        item.status === "complete"
                          ? "bg-teal-100 text-teal-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500">Loading readiness components...</p>
              )}
            </div>

            <div className="mt-5 p-3 rounded-lg bg-slate-100 border border-slate-200 text-[11px] text-slate-600 flex items-start gap-2">
              <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
              <p>
                <strong>IMPORTANT:</strong> Record Readiness measures only how complete and verified your MedLens record is. <strong>It is not a medical health score.</strong> It does not imply clinical wellness or diagnosis.
              </p>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setShowReadinessModal(false)}
                className="px-4 py-2 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
