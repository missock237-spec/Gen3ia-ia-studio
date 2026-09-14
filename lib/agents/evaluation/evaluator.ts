import type {
  EvaluationResult,
} from "@/lib/agents/types";

export interface EvaluationCriterion {
  name: string;
  description: string;
  weight: number;
  evaluator: (
    output: unknown,
  ) => Promise<{
    score: number;
    feedback: string;
  }>;
}

export interface EvaluationRequest {
  objective: string;
  output: unknown;
  criteria: EvaluationCriterion[];
}

export async function evaluateAgentResult(
  request: EvaluationRequest,
): Promise<EvaluationResult> {
  if (
    request.criteria.length === 0
  ) {
    throw new Error(
      "At least one evaluation criterion is required.",
    );
  }

  let totalWeight = 0;
  let weightedScore = 0;

  const criteriaResults = [];

  for (const criterion of request.criteria) {
    if (criterion.weight <= 0) {
      throw new Error(
        `Invalid criterion weight: ${criterion.name}`,
      );
    }

    const result =
      await criterion.evaluator(
        request.output,
      );

    const score = Math.max(
      0,
      Math.min(1, result.score),
    );

    totalWeight += criterion.weight;

    weightedScore +=
      score * criterion.weight;

    criteriaResults.push({
      name: criterion.name,
      score,
      feedback: result.feedback,
    });
  }

  const score =
    totalWeight > 0
      ? weightedScore / totalWeight
      : 0;

  const passed = score >= 0.8;

  return {
    score,
    passed,

    criteria:
      criteriaResults,

    missingRequirements:
      passed
        ? []
        : [
            "The generated result does not meet the minimum quality threshold.",
          ],

    suggestedCorrections:
      passed
        ? []
        : [
            "Review failed criteria and regenerate the affected steps.",
          ],

    evaluatedAt:
      new Date().toISOString(),
  };
    }
