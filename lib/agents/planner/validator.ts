import {
  DynamicPlan,
} from "./schema";

import {
  validateDAG,
} from "@/lib/agents/runtime/dag";

export interface PlannerValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateGeneratedPlan(
  plan: DynamicPlan,
  availableTools: string[],
  availableSkills: string[],
): PlannerValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const ids = new Set(
    plan.steps.map(
      (step) => step.id,
    ),
  );

  for (const step of plan.steps) {
    if (
      step.type === "tool" &&
      !step.toolName
    ) {
      errors.push(
        `${step.id}: toolName is required`,
      );
    }

    if (
      step.toolName &&
      !availableTools.includes(
        step.toolName,
      )
    ) {
      errors.push(
        `${step.id}: unknown tool ${step.toolName}`,
      );
    }

    for (const skillId of step.skillIds) {
      if (
        !availableSkills.includes(
          skillId,
        )
      ) {
        errors.push(
          `${step.id}: unknown skill ${skillId}`,
        );
      }
    }

    for (const dependency of step.dependencies) {
      if (!ids.has(dependency)) {
        errors.push(
          `${step.id}: unknown dependency ${dependency}`,
        );
      }
    }

    if (
      step.sideEffect &&
      !step.requiresApproval
    ) {
      warnings.push(
        `${step.id}: side effect does not require approval`,
      );
    }
  }

  const runtimePlan = {
    executionId: "validation",
    objective: plan.objective,
    steps: plan.steps,
    maxConcurrency:
      plan.maxConcurrency,
    maxIterations:
      plan.maxIterations,
  };

  const dag =
    validateDAG(runtimePlan);

  errors.push(...dag.errors);

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
