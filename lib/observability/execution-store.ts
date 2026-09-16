import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { redactSensitiveContent } from "@/lib/security/guardrails";
import type { ExecutionEvent } from "./execution-tracer";

const COLLECTION = "executionTelemetry";
const MAX_METADATA_CHARS = 20_000;

function sanitizeMetadata(value: Record<string, unknown>): string {
  const redacted = redactSensitiveContent(value);
  const serialized = JSON.stringify(redacted);
  return serialized.length > MAX_METADATA_CHARS
    ? `${serialized.slice(0, MAX_METADATA_CHARS)}...[truncated]`
    : serialized;
}

export async function persistExecutionEvent(event: ExecutionEvent): Promise<void> {
  await adminDb.collection(COLLECTION).doc(event.id).create({
    eventId: event.id,
    executionId: event.executionId,
    type: event.type,
    timestamp: event.timestamp,
    agentId: event.agentId ?? null,
    stepId: event.stepId ?? null,
    toolName: event.toolName ?? null,
    model: event.model ?? null,
    durationMs: event.durationMs ?? null,
    inputTokens: event.inputTokens ?? null,
    outputTokens: event.outputTokens ?? null,
    estimatedCostUsd: event.estimatedCostUsd ?? null,
    metadata: sanitizeMetadata(event.metadata),
    createdAt: FieldValue.serverTimestamp(),
  });
}
