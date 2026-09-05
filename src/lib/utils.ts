import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function maskPII(value: string | undefined | null, isPrivacyMode: boolean): string {
  if (!value) return "";
  if (!isPrivacyMode) return value;
  
  // If email
  if (value.includes("@")) {
    const parts = value.split("@");
    const name = parts[0];
    const domain = parts[1] || "";
    const maskedName = name.length > 2 ? name[0] + "••••" + name[name.length - 1] : "••••";
    return `${maskedName}@${domain}`;
  }

  // If phone or numeric ID
  if (/^\+?[\d\s\-()]+$/.test(value) && value.replace(/\D/g, "").length >= 7) {
    const digits = value.replace(/\D/g, "");
    return "••••••" + digits.slice(-4);
  }

  // If name (two or more words)
  const words = value.trim().split(/\s+/);
  if (words.length >= 2) {
    return words.map(w => (w.length > 1 ? w[0] + "••••" : "•")).join(" ");
  }

  // General text masking
  if (value.length > 2) {
    return value[0] + "••••" + value[value.length - 1];
  }
  return "••••";
}

export function formatDate(dateString: string): string {
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateString;
  }
}

export function calculateAge(dob: string): number {
  if (!dob) return 0;
  const birthDate = new Date(dob);
  if (isNaN(birthDate.getTime())) return 0;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return Math.max(0, age);
}

