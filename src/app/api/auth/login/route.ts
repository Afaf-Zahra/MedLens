import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    let user = db.getUser(email);
    if (!user) {
      // For demo hackathon convenience, if registering or logging in as Eleanor or another demo user
      if (email.toLowerCase().includes("eleanor")) {
        user = db.getUser("eleanor.vance@example.org");
      } else {
        return NextResponse.json({ error: "Invalid credentials. Try eleanor.vance@example.org or create a new account." }, { status: 401 });
      }
    }

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const profile = db.getProfileByUserId(user.id);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      profile,
    });
  } catch (error) {
    return NextResponse.json({ error: "Authentication processing failed" }, { status: 500 });
  }
}
