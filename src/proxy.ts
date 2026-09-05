import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * MedLens Route Protection Middleware
 * Ensures a brand-new visitor is always directed to the Patient Information Intake form (/onboarding).
 * Never exposes the medical dashboard or record views to an un-onboarded user.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Bypass static files, next.js internals, and public endpoints
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/favicon.ico") ||
    pathname === "/auth" ||
    pathname === "/onboarding" ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const patientId = request.cookies.get("medlens_patient_id")?.value;
  const isOnboarded = request.cookies.get("medlens_onboarded")?.value === "true";
  const isDemo = request.cookies.get("medlens_mode")?.value === "demo";

  // If a brand-new user visits (no genuine onboarded profile and not explicitly in demo mode),
  // immediately redirect them to the blank patient intake form.
  if (!patientId || (!isOnboarded && !isDemo)) {
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static files and images
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
