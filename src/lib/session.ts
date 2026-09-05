import { cookies } from "next/headers";
import { db, PatientProfile, User } from "./db";

export const DEMO_PATIENT_ID = "pat_demo_eleanor";
export const DEMO_USER_ID = "usr_demo_eleanor";

export async function getActiveSession(): Promise<{
  userId: string;
  patientId: string;
  isDemoMode: boolean;
  profile: PatientProfile | null;
  user: User | null;
  isOnboarded: boolean;
}> {
  const cookieStore = await cookies();
  const modeCookie = cookieStore.get("medlens_mode")?.value;
  const patientIdCookie = cookieStore.get("medlens_patient_id")?.value;
  const userIdCookie = cookieStore.get("medlens_user_id")?.value;

  const isDemoMode = modeCookie === "demo";

  if (isDemoMode) {
    const demoProfile = db.getProfileById(DEMO_PATIENT_ID);
    const demoUser = db.getUserById(DEMO_USER_ID);
    return {
      userId: DEMO_USER_ID,
      patientId: DEMO_PATIENT_ID,
      isDemoMode: true,
      profile: demoProfile || null,
      user: demoUser || null,
      isOnboarded: true,
    };
  }

  // Real User Mode
  if (patientIdCookie) {
    const realProfile = db.getProfileById(patientIdCookie);
    const realUser = userIdCookie ? db.getUserById(userIdCookie) : (realProfile ? db.getUserById(realProfile.userId) : null);
    if (realProfile) {
      return {
        userId: realProfile.userId,
        patientId: realProfile.id,
        isDemoMode: false,
        profile: realProfile,
        user: realUser || null,
        isOnboarded: !!realProfile.isOnboarded,
      };
    }
  }

  // Brand-new visitor with no session cookie: completely blank, un-onboarded, no patient data
  return {
    userId: "",
    patientId: "",
    isDemoMode: false,
    profile: null,
    user: null,
    isOnboarded: false,
  };
}

