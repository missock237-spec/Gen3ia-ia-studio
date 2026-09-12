import {
  FieldValue
} from "firebase-admin/firestore";

import {
  adminDb
} from "@/lib/firebase/admin";

import type {
  AgentExecutionState
} from "./types";

export async function saveExecutionState(
  state: AgentExecutionState
): Promise<void> {
  const executionRef =
    adminDb
      .collection("executions")
      .doc(state.task.id);

  await executionRef.set(
    {
      id: state.task.id,

      userId:
        state.task.userId,

      projectId:
        state.task.projectId,

      agentId:
        state.task.agentId,

      task:
        state.task.objective,

      status:
        state.status,

      iteration:
        state.iteration,

      maxIterations:
        state.task.maxIterations,

      selectedSkills:
        state.selectedSkills,

      selectedTools:
        state.selectedTools,

      plan:
        state.plan || null,

      observations:
        state.observations,

      evaluations:
        state.evaluations,

      finalResult:
        state.finalResult || null,

      error:
        state.error || null,

      updatedAt:
        FieldValue.serverTimestamp(),

      createdAt:
        FieldValue.serverTimestamp()
    },
    {
      merge: true
    }
  );
}
