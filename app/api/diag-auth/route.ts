import { NextRequest, NextResponse } from "next/server";

import { verifyFirebaseToken } from "@/lib/firebase/auth-server";

export const dynamic = "force-dynamic";

const GOOGLE_CERTS_URL =
  "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";

/** TEMPORAIRE — diagnostic auth production. À supprimer après résolution. */
async function probeCerts(): Promise<unknown> {
  try {
    const response = await fetch(GOOGLE_CERTS_URL, { cache: "no-store" });
    const body = response.ok ? await response.json() : {};
    return { status: response.status, kids: Object.keys(body).length };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

export async function GET(request: NextRequest) {
  const [certs] = await Promise.all([probeCerts()]);
  const env = {
    nextPublicProjectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? null,
    firebaseProjectId: process.env.FIREBASE_PROJECT_ID ?? null,
  };

  try {
    const decoded = await verifyFirebaseToken(request.headers.get("authorization"));
    return NextResponse.json({ ok: true, uid: decoded.uid, email: decoded.email ?? null, provider: decoded.firebase?.sign_in_provider ?? null, certs, env });
  } catch (error) {
    return NextResponse.json(
      { ok: false, inner: error instanceof Error ? error.message : String(error), certs, env },
      { status: 401 }
    );
  }
}
