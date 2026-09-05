import { NextRequest, NextResponse } from "next/server";
import { db, User, PatientProfile } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, phone } = await req.json();

    if (!name || !email) {
      return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
    }

    const existing = db.getUser(email);
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }

    const userId = `usr_${Date.now()}`;
    const patientId = `pat_${Date.now()}`;

    const newUser: User = {
      id: userId,
      email,
      name,
      passwordHash: `hash_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    const newProfile: PatientProfile = {
      id: patientId,
      userId,
      fullName: name,
      dob: "1995-01-01",
      sex: "Other",
      phone: phone || "",
      emergencyContact: "",
      isPrivacyMode: false,
      isOnboarded: false,
    };

    db.createUser(newUser);
    // Create new patient profile
    const createdProfile = db.updateProfile(patientId, newProfile) || newProfile;

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
      },
      profile: newProfile,
    });
  } catch (err) {
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
