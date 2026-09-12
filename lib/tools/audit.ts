import {
  FieldValue,
} from "firebase-admin/firestore";

import {
  adminDb,
} from "@/lib/firebase/admin";

import type {
  ToolResult,
} from "./types";

export async function recordToolAudit(
  params: {
    userId: string;
    projectId?: string;
    agentId?: string;
    executionId?: string;

    toolId: string;

    input: unknown;

    result: ToolResult;
  },
) {
  const ref =
    adminDb
      .collection("toolAuditLogs")
      .doc();

  await ref.set({
    userId:
      params.userId,

    projectId:
      params.projectId ?? null,

    agentId:
      params.agentId ?? null,

    executionId:
      params.executionId ?? null,

    toolId:
      params.toolId,

    input:
      sanitizeAuditInput(
        params.input,
      ),

    result: {
      status:
        params.result.status,

      output:
        sanitizeAuditInput(
          params.result.output,
        ),

      error:
        params.result.error ??
        null,

      latencyMs:
        params.result.latencyMs,
    },

    createdAt:
      FieldValue.serverTimestamp(),
  });

  return ref.id;
}

function sanitizeAuditInput(
  value: unknown,
): unknown {
  if (
    value === undefined ||
    value === null
  ) {
    return value;
  }

  if (
    typeof value === "string"
  ) {
    if (
      value.length > 10000
    ) {
      return value.slice(
        0,
        10000,
      );
    }

    return value;
  }

  if (
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  try {
    const serialized =
      JSON.stringify(value);

    if (
      serialized.length > 20000
    ) {
      return serialized.slice(
        0,
        20000,
      );
    }

    return JSON.parse(
      serialized,
    );
  } catch {
    return "[unserializable]";
  }
}
