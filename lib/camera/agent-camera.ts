import { FieldValue } from "firebase-admin/firestore";
import { randomUUID } from "node:crypto";
import { adminDb } from "@/lib/firebase/admin";

const COLLECTION = "agentCameraRequests";

export async function requestCameraCapture(params: { userId: string; executionId: string; agentId?: string; reason: string; facingMode?: "user" | "environment" }) {
  if (!params.reason.trim()) throw new Error("Camera capture requires a reason.");
  const id = randomUUID();
  await adminDb.collection(COLLECTION).doc(id).create({ id, userId: params.userId, executionId: params.executionId, agentId: params.agentId ?? null, reason: params.reason.slice(0, 1000), facingMode: params.facingMode ?? "environment", status: "pending_user_permission", createdAt: FieldValue.serverTimestamp(), expiresAt: new Date(Date.now() + 5 * 60 * 1000) });
  return { requestId: id, status: "pending_user_permission", requiresUserPermission: true };
}

export async function completeCameraCapture(params: { userId: string; requestId: string; storagePath: string }) {
  const ref = adminDb.collection(COLLECTION).doc(params.requestId);
  await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists || snap.get("userId") !== params.userId) throw new Error("Camera request not found.");
    if (snap.get("status") !== "pending_user_permission") throw new Error("Camera request is no longer active.");
    if (Date.now() > new Date(snap.get("expiresAt")).getTime()) throw new Error("Camera request expired.");
    tx.update(ref, { status: "completed", storagePath: params.storagePath, completedAt: FieldValue.serverTimestamp() });
  });
}
