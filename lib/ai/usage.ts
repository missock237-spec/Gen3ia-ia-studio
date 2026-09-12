import {
  FieldValue,
} from "firebase-admin/firestore";

import {
  adminDb,
} from "@/lib/firebase/admin";

import type {
  AIResponse,
} from "./models";

export async function recordAIUsage(
  params: {
    userId: string;
    task: string;
    response: AIResponse;
  },
) {
  const ref =
    adminDb
      .collection("usage")
      .doc();

  await ref.set({
    userId:
      params.userId,

    provider:
      params.response.provider,

    model:
      params.response.model,

    task:
      params.task,

    inputTokens:
      params.response.usage.inputTokens,

    outputTokens:
      params.response.usage.outputTokens,

    totalTokens:
      params.response.usage.totalTokens,

    latencyMs:
      params.response.latencyMs,

    createdAt:
      FieldValue.serverTimestamp(),
  });

  return ref.id;
}
