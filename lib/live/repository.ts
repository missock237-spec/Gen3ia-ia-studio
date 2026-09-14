import { adminDb } from "@/lib/firebase/admin";
import type { LiveAction, LivePermission, LivePendingAction, LiveSession, LiveSessionStatus } from "./types";

const COLLECTION = "liveAgentSessions";
const PENDING_ACTION_MAX_AGE_MS = 10 * 60_000;

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
  const data = snap.data()!;
  return {
    ...(data as LiveSession),
    createdAt: typeof data.createdAt === "number" ? data.createdAt : Date.now(),
    updatedAt: typeof data.updatedAt === "number" ? data.updatedAt : Date.now(),
    pairingTokenHash: String(data.pairingTokenHash ?? ""),
  };
}

export async function assertLiveSessionOwner(id: string, ownerId: string) {
  const session = await getLiveSession(id);
  if (!session || session.ownerId !== ownerId) throw new Error("Live session access denied");
  return session;
}

export async function updateLiveSessionStatus(id: string, status: LiveSessionStatus, deviceId?: string) {
  await ref(id).update({ status, ...(deviceId ? { deviceId } : {}), updatedAt: Date.now(), version: Date.now() });
}

export async function heartbeatLiveSession(id: string, deviceId: string) {
  await ref(id).update({ lastHeartbeatAt: Date.now(), deviceId, updatedAt: Date.now() });
}

export async function setPendingLiveAction(id: string, pendingAction: LivePendingAction) {
  const now = Date.now();
  await ref(id).update({ pendingAction, status: "paused", updatedAt: now, version: now });
}

export async function approvePendingLiveAction(id: string, actionId: string, ownerId: string) {
  const sessionRef = ref(id);
  const result = await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(sessionRef);
    if (!snap.exists) throw new Error("Live session not found");
    const data = snap.data()! as LiveSession & { pairingTokenHash: string };
    if (data.ownerId !== ownerId) throw new Error("Live session access denied");
    const pending = data.pendingAction;
    if (!pending || pending.actionId !== actionId) throw new Error("Pending live action not found");
    if (pending.approvedAt || pending.sentAt) throw new Error("Live action is no longer pending approval");
    if (Date.now() - pending.createdAt > PENDING_ACTION_MAX_AGE_MS) throw new Error("Live action approval expired");
    const approvedAt = Date.now();
    tx.update(sessionRef, { "pendingAction.approvedAt": approvedAt, status: "running", updatedAt: approvedAt, version: approvedAt });
    return approvedAt;
  });
  return result;
}

export async function claimApprovedLiveAction(id: string, deviceId: string): Promise<LivePendingAction | null> {
  const sessionRef = ref(id);
  return adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(sessionRef);
    if (!snap.exists) return null;
    const data = snap.data()! as LiveSession;
    const pending = data.pendingAction;
    if (data.deviceId !== deviceId || data.status !== "running" || !pending?.approvedAt || pending.sentAt) return null;
    if (Date.now() - pending.createdAt > PENDING_ACTION_MAX_AGE_MS) {
      tx.update(sessionRef, { pendingAction: null, status: "paused", updatedAt: Date.now(), version: Date.now() });
      return null;
    }
    const sentAt = Date.now();
    tx.update(sessionRef, { "pendingAction.sentAt": sentAt, updatedAt: sentAt, version: sentAt });
    return { ...pending, sentAt };
  });
}

export async function clearPendingLiveAction(id: string, actionId: string) {
  const sessionRef = ref(id);
  await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(sessionRef);
    if (!snap.exists) return;
    const data = snap.data()! as LiveSession;
    if (data.pendingAction?.actionId !== actionId) return;
    tx.update(sessionRef, { pendingAction: null, updatedAt: Date.now(), version: Date.now() });
  });
}

export async function recordLiveEvent(id: string, event: Record<string, unknown>) {
  await ref(id).collection("events").add({ ...event, createdAt: Date.now() });
}
