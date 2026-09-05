"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  Sparkles,
  ArrowRight,
  User,
  Lock,
  Mail,
  FileText,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

export default function AuthPage() {
  const router = useRouter();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const endpoint = isRegister ? "/api/auth/register" : "/api/auth/login";
    const payload = isRegister ? { name, email, password } : { email, password };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Authentication failed");
      }

      if (json.profile && json.profile.isOnboarded) {
        router.push("/");
      } else {
        router.push("/onboarding");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred during authentication.");
    } finally {
      setLoading(false);
    }
  };

  const handleStartDemo = async () => {
    setLoading(true);
    try {
      await fetch("/api/auth/demo-toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "demo" }),
      });
      router.push("/");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FBFBFA] flex flex-col justify-between selection:bg-teal-100 selection:text-teal-900">
      {/* Brand Header */}
      <header className="border-b border-slate-200 bg-white/70 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-teal-800 text-white flex items-center justify-center font-bold text-sm shadow-xs">
            M<span className="w-1 h-1 rounded-full bg-teal-300 ml-0.5"></span>
          </div>
          <div>
            <span className="font-semibold text-sm tracking-tight text-slate-900">MEDLENS</span>
            <span className="text-[10px] text-slate-400 block leading-tight">Provenance Intelligence</span>
          </div>
        </Link>
        <button
          onClick={handleStartDemo}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-semibold transition-colors cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
          <span>Try Demo (Eleanor Vance)</span>
        </button>
      </header>

      <main className="flex-1 max-w-md w-full mx-auto px-4 py-12 flex flex-col justify-center">
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="text-center space-y-1.5">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-teal-50 text-teal-800 border border-teal-200">
              Living Medical Record
            </span>
            <h1 className="text-xl font-bold text-slate-900">
              {isRegister ? "Create Patient Account" : "Sign In to MedLens"}
            </h1>
            <p className="text-xs text-slate-500">
              {isRegister
                ? "Begin your personalized structured clinical record."
                : "Access your continuous, traceable patient story."}
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <p>{errorMsg}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleAuthSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Your Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Alex Morgan"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-700"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  placeholder="patient@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-700"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-700"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-teal-800 hover:bg-teal-900 disabled:opacity-50 text-white text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>{isRegister ? "Create Account & Start Intake" : "Sign In"}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() => setIsRegister(!isRegister)}
              className="text-teal-800 hover:underline font-semibold"
            >
              {isRegister ? "Already have an account? Sign in" : "New patient? Create account"}
            </button>
          </div>

          {/* Explicit Demo Option */}
          <div className="pt-4 border-t border-slate-200/80 text-center space-y-2">
            <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
              Hackathon Demonstration
            </span>
            <button
              type="button"
              onClick={handleStartDemo}
              className="w-full py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-800 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Explore Preloaded Demo Patient (Eleanor Vance)</span>
            </button>
          </div>
        </div>
      </main>

      <footer className="py-4 text-center text-xs text-slate-400 border-t border-slate-200">
        MEDLENS • Clinical Information Intelligence • Safe Non-Diagnostic Architecture
      </footer>
    </div>
  );
}
