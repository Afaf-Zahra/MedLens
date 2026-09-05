"use client";

import React, { useState, useEffect } from "react";
import {
  MessageSquare,
  Send,
  Sparkles,
  FileText,
  ShieldCheck,
  AlertTriangle,
  HelpCircle,
  Clock,
  ExternalLink,
} from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { UploadModal } from "@/components/UploadModal";
import { maskPII } from "@/lib/utils";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  citations?: { documentName: string; reportDate: string; snippet: string }[];
  isRefusal?: boolean;
  timestamp: string;
}

const SAMPLE_GROUNDED_PROMPTS = [
  "When was my latest CBC?",
  "Show my hemoglobin history.",
  "Which reports mention thyroid tests?",
  "What information still needs verification?",
  "Where did this medication entry come from?",
  "Which values were outside their source ranges?",
];

const SAMPLE_BOUNDARY_PROMPTS = [
  "Do I have diabetes?",
  "What medicine should I take?",
  "Should I stop taking my tablet?",
];

export default function AskMyRecordsPage() {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPrivacyMode, setIsPrivacyMode] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const [inputQuery, setInputQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hello Eleanor. I am Ask My Records. I can search, organize, and trace facts from your uploaded medical documents. Ask me about your test dates, past lab values, medication sources, or verification items.",
      timestamp: "Now",
    },
  ]);

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

  const handleSendQuery = async (queryText: string) => {
    const text = queryText.trim();
    if (!text || isSubmitting) return;

    const userMsg: ChatMessage = {
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery("");
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/ai/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: text }),
      });
      const resData = await res.json();

      const assistantMsg: ChatMessage = {
        role: "assistant",
        content: resData.answer,
        citations: resData.citations,
        isRefusal: resData.refusal,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const patient = data?.patient;
  const readiness = data?.readiness || { score: 82, breakdown: [] };

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

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex flex-col space-y-6">
        {/* HEADER */}
        <div className="border-b border-slate-200 pb-5">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-900 border border-indigo-200">
              Grounded Intelligence
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500">Record-Grounded Q&A</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mt-1">
            Ask My Records
          </h1>
          <p className="text-xs text-slate-600 mt-0.5 max-w-xl">
            Answers questions grounded <strong>strictly in your MedLens records</strong>. Every fact includes source citations. MedLens never diagnoses diseases or prescribes treatments.
          </p>
        </div>

        {/* QUICK PROMPT CHIPS */}
        <div className="space-y-2">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Grounded Questions:
          </span>
          <div className="flex flex-wrap gap-2">
            {SAMPLE_GROUNDED_PROMPTS.map((prompt, i) => (
              <button
                key={i}
                onClick={() => handleSendQuery(prompt)}
                className="px-2.5 py-1 rounded-full bg-white border border-slate-200 hover:border-teal-400 hover:bg-teal-50/40 text-slate-700 text-xs transition-colors cursor-pointer"
              >
                &ldquo;{prompt}&rdquo;
              </button>
            ))}
          </div>

          <div className="pt-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Safety Boundary Test Questions (Triggers Non-Diagnostic Guardrail):
            </span>
            <div className="flex flex-wrap gap-2 mt-1">
              {SAMPLE_BOUNDARY_PROMPTS.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => handleSendQuery(prompt)}
                  className="px-2.5 py-1 rounded-full bg-rose-50/60 border border-rose-200 hover:bg-rose-100 text-rose-900 text-xs transition-colors cursor-pointer"
                >
                  &ldquo;{prompt}&rdquo;
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* CHAT THREAD */}
        <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-6 flex flex-col justify-between min-h-[420px]">
          <div className="space-y-4 overflow-y-auto max-h-[500px] pr-2">
            {messages.map((msg, idx) => {
              const isUser = msg.role === "user";
              return (
                <div
                  key={idx}
                  className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`max-w-2xl rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                      isUser
                        ? "bg-teal-800 text-white rounded-br-xs"
                        : msg.isRefusal
                        ? "bg-rose-50 border border-rose-200 text-rose-950 rounded-bl-xs"
                        : "bg-slate-50 border border-slate-200 text-slate-900 rounded-bl-xs"
                    }`}
                  >
                    {!isUser && msg.isRefusal && (
                      <div className="flex items-center gap-1.5 font-bold text-rose-800 mb-1.5 text-xs">
                        <ShieldCheck className="w-4 h-4 text-rose-600" />
                        <span>MedLens Safety Boundary Guardrail</span>
                      </div>
                    )}
                    <p className="whitespace-pre-line">{msg.content}</p>

                    {/* CITATIONS */}
                    {msg.citations && msg.citations.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-200/80 space-y-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                          Grounded Citations:
                        </span>
                        {msg.citations.map((c, ci) => (
                          <div
                            key={ci}
                            className="p-2 rounded bg-white border border-slate-200 text-[11px] text-slate-700 font-mono space-y-0.5"
                          >
                            <div className="flex justify-between font-semibold text-teal-900 font-sans">
                              <span>{c.documentName}</span>
                              <span className="text-slate-400">{c.reportDate}</span>
                            </div>
                            <div className="text-slate-600 line-clamp-1">&ldquo;{c.snippet}&rdquo;</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 px-1">
                    {msg.timestamp}
                  </span>
                </div>
              );
            })}
            {isSubmitting && (
              <div className="flex items-center gap-2 text-xs text-slate-400 py-2">
                <div className="w-2 h-2 rounded-full bg-teal-700 animate-pulse" />
                <span>Searching structured records and checking safety boundaries...</span>
              </div>
            )}
          </div>

          {/* INPUT FORM */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendQuery(inputQuery);
            }}
            className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="Ask a question about your uploaded records (e.g. When was my latest CBC?)..."
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-700"
            />
            <button
              type="submit"
              disabled={!inputQuery.trim() || isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-teal-800 hover:bg-teal-900 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Ask</span>
            </button>
          </form>
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
