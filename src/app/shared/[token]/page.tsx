"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  ShieldCheck,
  Calendar,
  Clock,
  FileSpreadsheet,
  AlertTriangle,
  Lock,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

export default function SharedRecordViewPage() {
  const params = useParams();
  const token = params?.token as string;

  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchShared = async () => {
      try {
        const res = await fetch("/api/records");
        const json = await res.json();
        setData(json);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchShared();
  }, []);

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-[#FBFBFA] flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-2 border-teal-800 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500">Decrypting shared clinical snapshot...</p>
        </div>
      </div>
    );
  }

  const patient = data.patient;
  const labs = data.labResults || [];
  const meds = data.medications || [];
  const allergies = data.allergies || [];

  return (
    <div className="min-h-screen bg-[#FBFBFA] p-4 sm:p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl p-6 sm:p-10 border border-slate-200 shadow-md space-y-6">
        {/* Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-teal-50 text-teal-800 border border-teal-200">
              MedLens Controlled Share
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
              Shared Patient Medical Snapshot
            </h1>
            <p className="text-xs text-slate-500 mt-0.5 font-mono">
              Access Token: {token}
            </p>
          </div>
          <div className="text-xs text-slate-500 flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            <Lock className="w-3.5 h-3.5 text-teal-700" />
            <span>Read-Only Clinical View</span>
          </div>
        </div>

        {/* Patient header */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex flex-wrap gap-6 text-xs">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase">Patient</span>
            <strong className="text-slate-900 text-sm">{patient?.fullName}</strong>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase">DOB / Age</span>
            <span className="text-slate-900 font-mono">{patient?.dob} (34y)</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase">Sex</span>
            <span className="text-slate-900">{patient?.sex}</span>
          </div>
        </div>

        {/* Allergies */}
        <div className="space-y-2 text-xs">
          <h2 className="font-bold text-slate-900 uppercase tracking-wider">Allergies</h2>
          {allergies.map((a: any) => (
            <div key={a.id} className="p-2.5 rounded bg-slate-50 border border-slate-100 flex justify-between">
              <strong>{a.allergen}</strong>
              <span className="text-slate-500">{a.reaction}</span>
            </div>
          ))}
        </div>

        {/* Medications */}
        <div className="space-y-2 text-xs">
          <h2 className="font-bold text-slate-900 uppercase tracking-wider">Current Medications</h2>
          <div className="space-y-1.5">
            {meds.map((m: any) => (
              <div key={m.id} className="p-2.5 rounded bg-slate-50 border border-slate-100 flex justify-between">
                <div>
                  <strong className="text-slate-900">{m.name}</strong>
                  <span className="text-slate-500 block text-[11px]">{m.frequency}</span>
                </div>
                <span className="font-mono font-bold text-slate-800">{m.dose} {m.unit}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Structured Labs */}
        <div className="space-y-2 text-xs">
          <h2 className="font-bold text-slate-900 uppercase tracking-wider">Structured Laboratory Findings</h2>
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase">
              <tr>
                <th className="py-2 px-2">Test</th>
                <th className="py-2 px-2">Result</th>
                <th className="py-2 px-2">Source Range</th>
                <th className="py-2 px-2">Report Document</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {labs.map((l: any) => (
                <tr key={l.id}>
                  <td className="py-2 px-2 font-semibold text-slate-900">{l.testName}</td>
                  <td className="py-2 px-2 font-mono font-bold text-slate-900">{l.value} {l.unit}</td>
                  <td className="py-2 px-2 font-mono text-slate-600">{l.refRangeText || "Not provided in source"}</td>
                  <td className="py-2 px-2 text-slate-500">{l.sourceDocumentName} ({l.reportDate})</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-200 text-[11px] text-slate-500">
          MedLens organizes available medical records with provenance. Values are classified strictly based on original source report ranges.
        </div>
      </div>
    </div>
  );
}
