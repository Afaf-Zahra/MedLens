"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Calendar,
  Activity,
  HeartPulse,
  ShieldAlert,
  Pill,
  FileText,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Plus,
  Trash2,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  Clock,
} from "lucide-react";
import { calculateAge } from "@/lib/utils";

interface SymptomEntry {
  symptom: string;
  onset: string;
  duration: string;
  notes: string;
}

interface ConditionEntry {
  condition: string;
  diagnosedDate: string;
  status: "active" | "managed" | "resolved";
}

interface AllergyEntry {
  allergen: string;
  reaction: string;
  status: "active" | "no_known";
}

interface MedicationEntry {
  name: string;
  dose: string;
  unit: string;
  frequency: string;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const totalSteps = 6;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Clear any old/demo data from browser storage on intake entry
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.includes("demo") || key.includes("sample") || key.includes("eleanor") || key.includes("patient"))) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));
        sessionStorage.clear();
      } catch (e) {
        // Safe failover for private browsing storage restrictions
      }
    }
  }, []);

  // Step 1: Basic Information - starts 100% empty
  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [sex, setSex] = useState<"Female" | "Male" | "Other" | "">("");
  const [phone, setPhone] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");

  // Step 2: Symptoms
  const [symptoms, setSymptoms] = useState<SymptomEntry[]>([
    { symptom: "", onset: "", duration: "", notes: "" },
  ]);

  // Step 3: Conditions
  const [conditions, setConditions] = useState<ConditionEntry[]>([
    { condition: "", diagnosedDate: "", status: "active" },
  ]);

  // Step 4: Allergies
  const [hasNoKnownAllergies, setHasNoKnownAllergies] = useState(false);
  const [allergies, setAllergies] = useState<AllergyEntry[]>([
    { allergen: "", reaction: "", status: "active" },
  ]);

  // Step 5: Medications
  const [medications, setMedications] = useState<MedicationEntry[]>([
    { name: "", dose: "", unit: "mg", frequency: "" },
  ]);

  // Step 6: Relevant Medical History
  const [medicalHistory, setMedicalHistory] = useState("");

  const age = dob ? calculateAge(dob) : 0;

  // Helper functions for dynamic lists
  const addSymptomRow = () => {
    setSymptoms([...symptoms, { symptom: "", onset: "", duration: "", notes: "" }]);
  };
  const removeSymptomRow = (idx: number) => {
    setSymptoms(symptoms.filter((_, i) => i !== idx));
  };

  const addConditionRow = () => {
    setConditions([...conditions, { condition: "", diagnosedDate: "", status: "active" }]);
  };
  const removeConditionRow = (idx: number) => {
    setConditions(conditions.filter((_, i) => i !== idx));
  };

  const addAllergyRow = () => {
    setAllergies([...allergies, { allergen: "", reaction: "", status: "active" }]);
  };
  const removeAllergyRow = (idx: number) => {
    setAllergies(allergies.filter((_, i) => i !== idx));
  };

  const addMedicationRow = () => {
    setMedications([...medications, { name: "", dose: "", unit: "mg", frequency: "" }]);
  };
  const removeMedicationRow = (idx: number) => {
    setMedications(medications.filter((_, i) => i !== idx));
  };

  const handleNextStep = () => {
    if (step === 1) {
      if (!fullName.trim() || !dob || !sex) {
        setErrorMsg("Please enter your full legal name, date of birth, and select sex to continue.");
        return;
      }
    }
    setErrorMsg(null);
    if (step < totalSteps) {
      setStep(step + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handlePrevStep = () => {
    setErrorMsg(null);
    if (step > 1) {
      setStep(step - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleSubmitIntake = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);

    const filteredSymptoms = symptoms.filter((s) => s.symptom.trim().length > 0);
    const filteredConditions = conditions.filter((c) => c.condition.trim().length > 0);
    const filteredAllergies = hasNoKnownAllergies
      ? [{ allergen: "No known drug allergies (Patient stated)", reaction: "None reported", status: "no_known" as const }]
      : allergies.filter((a) => a.allergen.trim().length > 0);
    const filteredMedications = medications.filter((m) => m.name.trim().length > 0);

    const payload = {
      fullName,
      dob,
      sex,
      phone,
      emergencyContact,
      symptoms: filteredSymptoms,
      conditions: filteredConditions,
      allergies: filteredAllergies,
      medications: filteredMedications,
      medicalHistory,
    };

    try {
      const res = await fetch("/api/patient/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to submit intake information");
      }

      // Success! Move to Living Record Dashboard
      router.push("/");
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred during intake submission.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FBFBFA] flex flex-col justify-between text-slate-900 selection:bg-teal-100 selection:text-teal-900">
      {/* Top Calm Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-800 text-white flex items-center justify-center font-bold text-sm shadow-xs">
              M<span className="w-1 h-1 rounded-full bg-teal-300 ml-0.5"></span>
            </div>
            <div>
              <span className="font-semibold text-sm tracking-tight text-slate-900">MEDLENS</span>
              <span className="text-[10px] text-slate-500 block leading-tight">Patient Information Intake</span>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-slate-500 font-medium">
              Step {step} of {totalSteps}
            </span>
            <div className="w-24 h-2 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
              <div
                className="h-full bg-teal-700 transition-all duration-300"
                style={{ width: `${(step / totalSteps) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Multi-Step Form Container */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-8 sm:py-12">
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-sm space-y-8">
          {/* STEP HEADER */}
          <div className="border-b border-slate-100 pb-5">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-teal-50 text-teal-800 border border-teal-200">
                Provenance: user_input
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-500">Patient Provided Baseline</span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 mt-2">
              {step === 1 && "Basic Patient Information"}
              {step === 2 && "Current or Recent Symptoms"}
              {step === 3 && "Existing Diagnosed Conditions"}
              {step === 4 && "Allergies & Drug Sensitivities"}
              {step === 5 && "Current Prescription & OTC Medications"}
              {step === 6 && "Relevant Medical History & Confirmation"}
            </h1>

            <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
              {step === 1 && "Your basic demographics establish your Living Medical Record baseline. All facts entered here will be tagged with 'Patient provided' provenance."}
              {step === 2 && "Record any symptoms you are currently experiencing. These help correlate future laboratory findings."}
              {step === 3 && "Document any conditions diagnosed by a physician (e.g. Hypothyroidism, Hypertension, Asthma)."}
              {step === 4 && "List any allergic reactions to medications or foods, or confirm you have no known allergies."}
              {step === 5 && "Enter active medications, supplements, and vitamins you currently take."}
              {step === 6 && "Add optional relevant medical notes, review your intake summary, and initialize your MedLens Living Record."}
            </p>
          </div>

          {/* ERROR ALERT */}
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
              <p>{errorMsg}</p>
            </div>
          )}

          {/* STEP 1: BASIC INFORMATION */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Full Legal Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Full legal name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-700"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Date of Birth *
                  </label>
                  <input
                    type="date"
                    required
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-700"
                  />
                  {dob && (
                    <span className="text-[11px] text-teal-800 font-semibold mt-1 block">
                      Calculated Age: {age} years
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Sex *
                  </label>
                  <select
                    value={sex}
                    required
                    onChange={(e) => setSex(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-700"
                  >
                    <option value="">Select Sex...</option>
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Other">Other / Non-Binary</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Phone Number (Optional)
                  </label>
                  <input
                    type="tel"
                    placeholder="Phone number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-700"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Emergency Contact (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Name & Relationship"
                    value={emergencyContact}
                    onChange={(e) => setEmergencyContact(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-700"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: SYMPTOMS */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-3">
                {symptoms.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 relative"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Symptom #{idx + 1}
                      </span>
                      {symptoms.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeSymptomRow(idx)}
                          className="text-slate-400 hover:text-rose-600 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] text-slate-600 block mb-0.5">Symptom Description</label>
                        <input
                          type="text"
                          placeholder="e.g. Mild afternoon fatigue, joint stiffness"
                          value={item.symptom}
                          onChange={(e) => {
                            const updated = [...symptoms];
                            updated[idx].symptom = e.target.value;
                            setSymptoms(updated);
                          }}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] text-slate-600 block mb-0.5">Onset Date</label>
                        <input
                          type="date"
                          value={item.onset}
                          onChange={(e) => {
                            const updated = [...symptoms];
                            updated[idx].onset = e.target.value;
                            setSymptoms(updated);
                          }}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] text-slate-600 block mb-0.5">Duration</label>
                        <input
                          type="text"
                          placeholder="e.g. 2 weeks, intermittent"
                          value={item.duration}
                          onChange={(e) => {
                            const updated = [...symptoms];
                            updated[idx].duration = e.target.value;
                            setSymptoms(updated);
                          }}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-600 block mb-0.5">Notes / Triggers</label>
                        <input
                          type="text"
                          placeholder="e.g. Worse with cold weather"
                          value={item.notes}
                          onChange={(e) => {
                            const updated = [...symptoms];
                            updated[idx].notes = e.target.value;
                            setSymptoms(updated);
                          }}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={addSymptomRow}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-teal-700" />
                <span>Add Another Symptom</span>
              </button>
            </div>
          )}

          {/* STEP 3: CONDITIONS */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="space-y-3">
                {conditions.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 relative"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Condition #{idx + 1}
                      </span>
                      {conditions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeConditionRow(idx)}
                          className="text-slate-400 hover:text-rose-600 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-1">
                        <label className="text-[11px] text-slate-600 block mb-0.5">Condition Name</label>
                        <input
                          type="text"
                          placeholder="e.g. Hypothyroidism, Asthma"
                          value={item.condition}
                          onChange={(e) => {
                            const updated = [...conditions];
                            updated[idx].condition = e.target.value;
                            setConditions(updated);
                          }}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] text-slate-600 block mb-0.5">Diagnosed Date</label>
                        <input
                          type="date"
                          value={item.diagnosedDate}
                          onChange={(e) => {
                            const updated = [...conditions];
                            updated[idx].diagnosedDate = e.target.value;
                            setConditions(updated);
                          }}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] text-slate-600 block mb-0.5">Status</label>
                        <select
                          value={item.status}
                          onChange={(e) => {
                            const updated = [...conditions];
                            updated[idx].status = e.target.value as any;
                            setConditions(updated);
                          }}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900"
                        >
                          <option value="active">Active Monitoring</option>
                          <option value="managed">Managed with Medication</option>
                          <option value="resolved">Resolved</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={addConditionRow}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-teal-700" />
                <span>Add Another Condition</span>
              </button>
            </div>
          )}

          {/* STEP 4: ALLERGIES */}
          {step === 4 && (
            <div className="space-y-5">
              <div className="p-3.5 rounded-xl bg-teal-50/60 border border-teal-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-teal-950">No known drug allergies?</span>
                  <p className="text-[11px] text-teal-800">
                    If you have never experienced an adverse reaction to medications, you can record this immediately.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setHasNoKnownAllergies(!hasNoKnownAllergies)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${hasNoKnownAllergies
                    ? "bg-teal-800 text-white"
                    : "bg-white border border-teal-300 text-teal-900 hover:bg-teal-100"
                    }`}
                >
                  {hasNoKnownAllergies ? "✓ Confirmed No Known Allergies" : "Mark No Known Allergies"}
                </button>
              </div>

              {!hasNoKnownAllergies && (
                <div className="space-y-3">
                  {allergies.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 relative"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          Allergy #{idx + 1}
                        </span>
                        {allergies.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeAllergyRow(idx)}
                            className="text-slate-400 hover:text-rose-600 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] text-slate-600 block mb-0.5">Allergen / Substance</label>
                          <input
                            type="text"
                            placeholder="e.g. Penicillin, Sulfa, Peanuts"
                            value={item.allergen}
                            onChange={(e) => {
                              const updated = [...allergies];
                              updated[idx].allergen = e.target.value;
                              setAllergies(updated);
                            }}
                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] text-slate-600 block mb-0.5">Reaction Experienced</label>
                          <input
                            type="text"
                            placeholder="e.g. Hives, rash, facial swelling"
                            value={item.reaction}
                            onChange={(e) => {
                              const updated = [...allergies];
                              updated[idx].reaction = e.target.value;
                              setAllergies(updated);
                            }}
                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900"
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={addAllergyRow}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-teal-700" />
                    <span>Add Another Allergy</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* STEP 5: MEDICATIONS */}
          {step === 5 && (
            <div className="space-y-4">
              <div className="space-y-3">
                {medications.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 relative"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Medication #{idx + 1}
                      </span>
                      {medications.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeMedicationRow(idx)}
                          className="text-slate-400 hover:text-rose-600 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div className="sm:col-span-2">
                        <label className="text-[11px] text-slate-600 block mb-0.5">Medication Name</label>
                        <input
                          type="text"
                          placeholder="e.g. Levothyroxine, Metformin, Vitamin D3"
                          value={item.name}
                          onChange={(e) => {
                            const updated = [...medications];
                            updated[idx].name = e.target.value;
                            setMedications(updated);
                          }}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] text-slate-600 block mb-0.5">Dosage & Unit</label>
                        <div className="flex gap-1">
                          <input
                            type="text"
                            placeholder="50"
                            value={item.dose}
                            onChange={(e) => {
                              const updated = [...medications];
                              updated[idx].dose = e.target.value;
                              setMedications(updated);
                            }}
                            className="w-2/3 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-900"
                          />
                          <input
                            type="text"
                            placeholder="mcg"
                            value={item.unit}
                            onChange={(e) => {
                              const updated = [...medications];
                              updated[idx].unit = e.target.value;
                              setMedications(updated);
                            }}
                            className="w-1/3 bg-white border border-slate-200 rounded-lg px-1.5 py-1.5 text-xs text-slate-900"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] text-slate-600 block mb-0.5">Frequency</label>
                        <input
                          type="text"
                          placeholder="e.g. Once daily in morning"
                          value={item.frequency}
                          onChange={(e) => {
                            const updated = [...medications];
                            updated[idx].frequency = e.target.value;
                            setMedications(updated);
                          }}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={addMedicationRow}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-teal-700" />
                <span>Add Another Medication</span>
              </button>
            </div>
          )}

          {/* STEP 6: MEDICAL HISTORY & CONFIRMATION */}
          {step === 6 && (
            <div className="space-y-6">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Optional Relevant Medical History / Prior Surgeries / Family Notes
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Appendectomy in 2018. Maternal history of hypothyroidism. Non-smoker."
                  value={medicalHistory}
                  onChange={(e) => setMedicalHistory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-700"
                />
              </div>

              {/* INTAKE SUMMARY CARD */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Intake Verification Summary
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <span className="text-slate-500 block">Patient Name:</span>
                    <strong className="text-slate-900">{fullName || "Not specified"}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">DOB / Age:</span>
                    <strong className="text-slate-900">{dob} ({age}y)</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Sex:</span>
                    <strong className="text-slate-900">{sex}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Provenance:</span>
                    <span className="px-1.5 py-0.2 rounded bg-teal-100 text-teal-800 font-semibold text-[10px]">
                      Patient provided
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/80 text-[11px] text-slate-600 flex justify-between">
                  <span>Symptoms: {symptoms.filter((s) => s.symptom.trim()).length} recorded</span>
                  <span>Conditions: {conditions.filter((c) => c.condition.trim()).length} recorded</span>
                  <span>Allergies: {hasNoKnownAllergies ? "No known" : allergies.filter((a) => a.allergen.trim()).length} recorded</span>
                  <span>Medications: {medications.filter((m) => m.name.trim()).length} recorded</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-teal-50 border border-teal-200 text-xs text-teal-900 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
                <p>
                  <strong>MedLens Living Record Commitment:</strong> By submitting this intake, your baseline profile will be created with verifiable <code>user_input</code> provenance. Only then will document uploads and laboratory intelligence be enabled.
                </p>
              </div>
            </div>
          )}

          {/* CONTROLS */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            {step > 1 ? (
              <button
                type="button"
                onClick={handlePrevStep}
                disabled={isSubmitting}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Previous Step</span>
              </button>
            ) : (
              <div />
            )}

            {step < totalSteps ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-teal-800 hover:bg-teal-900 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                <span>Continue to Step {step + 1}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmitIntake}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-teal-800 hover:bg-teal-900 disabled:opacity-50 text-white text-xs font-bold shadow-sm cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSubmitting ? "Creating Profile..." : "Complete Intake & Open Record"}</span>
              </button>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-slate-400 border-t border-slate-200">
        MEDLENS • Clinical Information Intelligence • Non-Diagnostic System
      </footer>
    </div>
  );
}
