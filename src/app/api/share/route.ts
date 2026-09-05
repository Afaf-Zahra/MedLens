import { NextRequest, NextResponse } from "next/server";
import { db, ShareSession } from "@/lib/db";
import { getActiveSession } from "@/lib/session";

export async function GET() {
  const session = await getActiveSession();
  const patientId = session.patientId;
  const profile = session.profile;
  const activeSession = db.getShareSession("medlens_share_demo_9876");

  return NextResponse.json({
    activeSession,
    profile,
  });
}

export async function POST(req: NextRequest) {
  try {
    const { permissions, expiresInHours = 48 } = await req.json();
    const session = await getActiveSession();
    const patientId = session.patientId;

    const shareToken = `medlens_share_${Math.random().toString(36).substring(2, 10)}`;
    const expiresAt = new Date(Date.now() + expiresInHours * 3600 * 1000).toISOString();

    const newSession: ShareSession = {
      id: `shr_${Date.now()}`,
      patientId,
      shareToken,
      expiresAt,
      permissions: {
        basicInfo: permissions?.basicInfo ?? true,
        allergies: permissions?.allergies ?? true,
        medications: permissions?.medications ?? true,
        conditions: permissions?.conditions ?? true,
        labResults: permissions?.labResults ?? true,
        timeline: permissions?.timeline ?? true,
        originalDocuments: permissions?.originalDocuments ?? false,
      },
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    db.createShareSession(newSession);

    db.logAudit({
      patientId,
      action: "SHARE_SESSION_CREATED",
      targetType: "share_session",
      targetId: newSession.id,
      newValue: `Token: ${shareToken}, Expires: ${expiresAt}`,
    });

    return NextResponse.json({
      success: true,
      session: newSession,
      shareUrl: `/shared/${shareToken}`,
    });
  } catch (e) {
    return NextResponse.json({ error: "Failed to create share link" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { token } = await req.json();
    const revoked = db.revokeShareSession(token);
    return NextResponse.json({ success: revoked });
  } catch (e) {
    return NextResponse.json({ error: "Failed to revoke share link" }, { status: 500 });
  }
}
