import { NextRequest, NextResponse } from "next/server";
import { db, calculateAge, Symptom, Condition, Allergy, Medication, TimelineEvent } from "@/lib/db";
import { getActiveSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      fullName,
      dob,
      sex,
      phone,
      emergencyContact,
      symptoms = [],
      conditions = [],
      allergies = [],
      medications = [],
      medicalHistory = "",
    } = body;

    if (!fullName || !dob || !sex) {
      return NextResponse.json(
        { error: "Full name, date of birth, and sex are required for patient intake." },
        { status: 400 }
      );
    }

    const session = await getActiveSession();
    let patientId = session.patientId;
    let userId = session.userId;

    // If currently in demo mode or without a real profile, create a dedicated real patient ID
    if (session.isDemoMode || !session.profile || session.profile.isDemo) {
      userId = `usr_${Date.now()}`;
      patientId = `pat_${Date.now()}`;

      db.createUser({
        id: userId,
        email: `${fullName.toLowerCase().replace(/[^a-z0-9]/g, ".")}@patient.medlens.org`,
        name: fullName,
        passwordHash: `hash_${Date.now()}`,
        createdAt: new Date().toISOString(),
      });

      db.addPatientProfile({
        id: patientId,
        userId,
        fullName,
        dob,
        sex,
        phone: phone || "",
        emergencyContact: emergencyContact || "",
        isPrivacyMode: false,
        isOnboarded: true,
        isDemo: false,
        notes: medicalHistory,
      });
    } else {
      // Update existing profile
      db.updateProfile(patientId, {
        fullName,
        dob,
        sex,
        phone: phone || "",
        emergencyContact: emergencyContact || "",
        isOnboarded: true,
        notes: medicalHistory,
      });
    }

    const today = new Date().toISOString().split("T")[0];

    // Store Symptoms with source = "user_input"
    for (const sym of symptoms) {
      if (sym.symptom && sym.symptom.trim()) {
        db.addSymptom({
          id: `sym_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          patientId,
          symptom: sym.symptom.trim(),
          onset: sym.onset || today,
          duration: sym.duration || "Ongoing",
          notes: sym.notes || "",
          source: "user_input",
          verified: true,
        });
      }
    }

    // Store Conditions with source = "user_input"
    for (const cond of conditions) {
      if (cond.condition && cond.condition.trim()) {
        db.addCondition({
          id: `cnd_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          patientId,
          condition: cond.condition.trim(),
          diagnosedDate: cond.diagnosedDate || today,
          status: cond.status || "active",
          source: "user_input",
          verified: true,
        });
      }
    }

    // Store Allergies with source = "user_input"
    if (allergies.length === 0) {
      db.addAllergy({
        id: `alg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        patientId,
        allergen: "No known drug allergies (Patient stated)",
        reaction: "None reported by patient at intake",
        status: "no_known",
        source: "user_input",
        verified: true,
      });
    } else {
      for (const alg of allergies) {
        if (alg.allergen && alg.allergen.trim()) {
          db.addAllergy({
            id: `alg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            patientId,
            allergen: alg.allergen.trim(),
            reaction: alg.reaction || "No reaction specified",
            status: alg.status || "active",
            source: "user_input",
            verified: true,
          });
        }
      }
    }

    // Store Medications with source = "user_input"
    for (const med of medications) {
      if (med.name && med.name.trim()) {
        db.addMedication({
          id: `med_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          patientId,
          name: med.name.trim(),
          dose: med.dose || "1",
          unit: med.unit || "tablet",
          frequency: med.frequency || "Daily",
          date: today,
          source: "user_input",
          confidence: 100,
          verificationStatus: "confirmed",
        });
      }
    }

    // Register Living Medical Timeline Event
    const timelineEvent: TimelineEvent = {
      id: `evt_intake_${Date.now()}`,
      patientId,
      eventDate: today,
      eventType: "symptom_logged",
      title: "Patient Information Intake Completed",
      description: `Structured onboarding completed for ${fullName}. Demographic baseline and patient-provided medical history recorded.`,
      category: "system",
      badge: "Intake Complete",
      statusHighlight: "teal",
    };
    db.addTimelineEvent(timelineEvent);

    db.logAudit({
      patientId,
      action: "PATIENT_INTAKE_COMPLETED",
      targetType: "patient_profile",
      targetId: patientId,
      newValue: `Intake complete for ${fullName}, DOB: ${dob}, Sex: ${sex}.`,
    });

    const response = NextResponse.json({
      success: true,
      patientId,
      userId,
      message: "Patient intake completed successfully. Your Living Medical Record is ready.",
    });

    // Set cookies to bind browser session to this real patient
    response.cookies.set("medlens_patient_id", patientId, { path: "/", httpOnly: false });
    response.cookies.set("medlens_user_id", userId, { path: "/", httpOnly: false });
    response.cookies.set("medlens_mode", "real", { path: "/", httpOnly: false });
    response.cookies.set("medlens_onboarded", "true", { path: "/", httpOnly: false });

    return response;
  } catch (error) {
    console.error("Onboarding error:", error);
    return NextResponse.json(
      { error: "Failed to process patient intake. Please try again." },
      { status: 500 }
    );
  }
}
