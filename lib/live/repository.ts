import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import type { LivePermission, LiveSession, LiveSessionStatus } from "./types";

const COLLECTION = "liveAgentSessions";

function ref(id: string) {
  return adminDb.collection(COLLECTION).doc(id);
}

export async function createLiveSession(input: {
  id: string;
  ownerId: string;
  name: string;
  objective: string;
  permissions: LivePermission[];
  expiresAt?: number;
  pairingTokenHash: string;
}): Promise<LiveSession> {
  const now = Date.now();
  const session: LiveSession = {
    id: input.id,
    ownerId: input.ownerId,
    name: input.name,
    objective: input.objective,
    status: "pending",
    permissions: input.permissions,
    createdAt: now,
    updatedAt: now,
    expiresAt: input.expiresAt,
    version: 1,
  };
  await ref(input.id).set({ ...session, pairingTokenHash: input.pairingTokenHash });
  return session;
}

export async function getLiveSession(id: string): Promise<(LiveSession & { pairingTokenHash: string }) | null> {
  const snap = await ref(id).get();
  if (!snap.exists) return null;
  return snap.data() as LiveSession & { pairingTokenHash: string };
}

export async function assertLiveSessionOwner(id: string, ownerId: string) {
  const session = await getLiveSession(id);
  if (!session || session.ownerId !== ownerId) throw new Error("Live session access denied");
  return session;
}

export async function updateLiveSessionStatus(id: string, status: LiveSessionStatus, deviceId?: string) {
  await ref(id).update({ status, ...(deviceId ? { deviceId } : {}), updatedAt: FieldValue.serverTimestamp(), version: FieldValue.increment(1) });
}

export async function heartbeatLiveSession(id: string, deviceId: string) {
  await ref(id).update({ lastHeartbeatAt: FieldValue.serverTimestamp(), deviceId, updatedAt: FieldValue.serverTimestamp() });
}

export async function recordLiveEvent(id: string, event: Record<string, unknown>) {
  await ref(id).collection("events").add({ ...event, createdAt: FieldValue.serverTimestamp() });
}
