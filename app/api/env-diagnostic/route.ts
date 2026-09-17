import { NextResponse } from "next/server";

// ROUTE DE DIAGNOSTIC TEMPORAIRE (sera supprimee apres verification).
// N'expose QUE la presence/vide des cles d'environnement — jamais les valeurs.

const KEYS = [
  "FIREBASE_PROJECT_ID",
  "FIREBASE_CLIENT_EMAIL",
  "FIREBASE_PRIVATE_KEY",
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "CRON_SECRET",
  "OPENAI_API_KEY",
  "ANTHROPIC_API_KEY",
  "GROQ_API_KEY",
  "GLM_API_KEY",
  "HF_TOKEN",
  "SEARCH_API_KEY",
  "R2_BUCKET",
  "CHARIOW_API_KEY",
  "VERCEL_ENV",
  "VERCEL_REGION",
];

export const runtime = "nodejs";

export async function GET() {
  const report: Record<string, string> = {};
  for (const key of KEYS) {
    const value = process.env[key];
    if (value === undefined) report[key] = "ABSENT";
    else if (value === "") report[key] = "VIDE";
    else report[key] = `PRESENT (${value.length} chars)`;
  }
  return NextResponse.json({ timestamp: new Date().toISOString(), env: report });
}
