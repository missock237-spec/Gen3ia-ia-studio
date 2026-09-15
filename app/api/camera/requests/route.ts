import { NextRequest, NextResponse } from "next/server";
import { protectRoute } from "@/lib/security/route-guard";
import { adminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  const guard = await protectRoute(request); if (!guard.ok) return guard.response;
  const snap = await adminDb.collection("agentCameraRequests").where("userId", "==", guard.context.userId).where("status", "==", "pending_user_permission").limit(20).get();
  return NextResponse.json({ requests: snap.docs.map((doc) => ({ id: doc.id, reason: String(doc.get("reason") ?? ""), facingMode: String(doc.get("facingMode") ?? "environment"), expiresAtMs: Number(doc.get("expiresAtMs") ?? 0), executionId: String(doc.get("executionId") ?? "") })) }, { headers: { "cache-control": "no-store" } });
}
