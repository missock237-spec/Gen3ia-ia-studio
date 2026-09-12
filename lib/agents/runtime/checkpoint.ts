import {
  FieldValue,
  Timestamp,
} from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebase/admin";
import { RuntimeExecutionState } from "./types";

function executionRef(executionId: string) {
  return adminDb
    .collection("executions")
    .doc(executionId);
}

export async function saveCheckpoint(
  state: RuntimeExecutionState,
): Promise<void> {
  await executionRef(state.executionId).set(
    {
      ...state,
      updatedAt: FieldValue.serverTimestamp(),
    },
    {
      merge: true,
    },
  );
}

export async function loadCheckpoint(
  executionId: string,
): Promise<RuntimeExecutionState | null> {
  const snapshot =
    await executionRef(executionId).get();

  if (!snapshot.exists) {
    return null;
  }

  return snapshot.data() as RuntimeExecutionState;
}

export async function createCheckpoint(
  state: RuntimeExecutionState,
): Promise<void> {
  await executionRef(state.executionId).set({
    ...state,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
}
