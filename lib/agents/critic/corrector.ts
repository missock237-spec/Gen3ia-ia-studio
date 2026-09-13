import {
  RuntimeExecutionState,
} from "@/lib/agents/runtime";

import {
  CriticResult,
} from "./types";

export function applyCorrections(
  state: RuntimeExecutionState,
  critic: CriticResult,
): RuntimeExecutionState {
  if (!critic.retry) {
    return state;
  }

  const retrySteps =
    new Set(
      critic.retrySteps,
    );

  for (const step of state.plan.steps) {
    if (
      retrySteps.has(step.id)
    ) {
      step.status = "pending";

      step.output = undefined;

      state.observations =
        state.observations.filter(
          (observation) =>
            observation.stepId !==
            step.id,
        );

      delete state.outputs[
        step.id
      ];
    }
  }

  return state;
}
