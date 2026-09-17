import { NextRequest, NextResponse } from "next/server";

import { verifyFirebaseToken } from "@/lib/firebase/auth-server";

export const dynamic = "force-dynamic";

/** TEMPORAIRE — diagnostic auth production. À supprimer après résolution. */
export async function GET(request: NextRequest) {
  const env = {
    nextPublicProjectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? null,
    firebaseProjectId: process.env.FIREBASE_PROJECT_ID ?? null,
    nodeVersion: process.version,
  };
  try {
    const decoded = await verifyFirebaseToken(request.headers.get("authorization"));
    return NextResponse.json({ ok: true, uid: decoded.uid, iss: decoded.iss, aud: decoded.aud, env });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, detail, env }, { status: 401 });
  }
}
