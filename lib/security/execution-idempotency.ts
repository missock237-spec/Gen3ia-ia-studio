import { FieldValue } from "firebase-admin/firestore";
import { createHash } from "node:crypto";
import { adminDb } from "@/lib/firebase/admin";

const COLLECTION = "executionIdempotency";
const MAX_RESULT_CHARS = 200_000;
type State = "processing" | "completed" | "failed";
export interface IdempotencyClaim { key: string; state: State; result?: unknown; error?: string; }
function digest(value: string): string { return createHash("sha256").update(value).digest("hex"); }
function stableSerialize(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableSerialize(record[key])}`).join(",")}}`;
}
function docId(userId: string, toolName: string, key: string): string { return digest(stableSerialize({ userId, toolName, key })).slice(0, 64); }
export async function claimExecutionIdempotency(params: { userId: string; toolName: string; key: string; input: Record<string, unknown> }): Promise<IdempotencyClaim> {
  if (!params.userId.trim() || !params.toolName.trim() || !params.key.trim()) throw new Error("Invalid idempotency parameters.");
  const id = docId(params.userId, params.toolName, params.key);
  const inputHash = digest(stableSerialize(params.input));
  const ref = adminDb.collection(COLLECTION).doc(id);
  return adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists) {
      const data = snap.data() ?? {};
      if (String(data.inputHash ?? "") !== inputHash) throw new Error("Idempotency key conflict: arguments differ.");
      const state = String(data.state) as State;
      if (state === "completed") return { key: id, state, result: data.result };
      if (state === "failed") return { key: id, state, error: String(data.error ?? "Execution previously failed.") };
      throw new Error("Identical action is already processing; duplicate execution is blocked.");
    }
    tx.create(ref, { userId: params.userId, toolName: params.toolName, key: params.key, inputHash, state: "processing", createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
    return { key: id, state: "processing" };
  });
}
export async function completeExecutionIdempotency(params: { key: string; result: unknown }): Promise<void> {
  if (stableSerialize(params.result).length > MAX_RESULT_CHARS) throw new Error("Idempotency result exceeds persistence limit.");
  await adminDb.collection(COLLECTION).doc(params.key).update({ state: "completed", result: params.result, updatedAt: FieldValue.serverTimestamp() });
}
export async function failExecutionIdempotency(params: { key: string; error: string }): Promise<void> {
  await adminDb.collection(COLLECTION).doc(params.key).update({ state: "failed", error: params.error.slice(0, 4_000), updatedAt: FieldValue.serverTimestamp() });
}
