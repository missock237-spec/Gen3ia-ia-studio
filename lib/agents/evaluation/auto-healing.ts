import type {
  EvaluationResult,
} from "@/lib/agents/types";

export interface HealingAttempt {
  attempt: number;
  previousScore: number;
  newScore: number;
  correction: string;
  successful: boolean;
}

export interface HealingOptions {
  maxAttempts?: number;
  minimumImprovement?: number;

  evaluate: (
    output: unknown,
  ) => Promise<EvaluationResult>;

  regenerate: (
    correction: string,
    previousOutput: unknown,
  ) => Promise<unknown>;
}

export async function autoHeal(
  initialOutput: unknown,
  initialEvaluation: EvaluationResult,
  options: HealingOptions,
): Promise<{
  output: unknown;
  evaluation: EvaluationResult;
  attempts: HealingAttempt[];
}> {
  const maxAttempts =
    options.maxAttempts ?? 3;

  const minimumImprovement =
    options.minimumImprovement ?? 0.03;

  let output = initialOutput;
  let evaluation =
    initialEvaluation;

  const attempts: HealingAttempt[] =
    [];

  for (
    let attempt = 1;
    attempt <= maxAttempts;
    attempt++
  ) {
    if (evaluation.passed) {
      break;
    }

    const correction =
      evaluation.suggestedCorrections.join(
        "\n",
      );

    if (!correction.trim()) {
      break;
    }

    const previousScore =
      evaluation.score;

    output =
      await options.regenerate(
        correction,
        output,
      );

    evaluation =
      await options.evaluate(
        output,
      );

    const improvement =
      evaluation.score -
      previousScore;

    attempts.push({
      attempt,
      previousScore,
      newScore:
        evaluation.score,
      correction,
      successful:
        evaluation.passed ||
        improvement >=
          minimumImprovement,
    });

    if (
      improvement <
        minimumImprovement &&
      !evaluation.passed
    ) {
      break;
    }
  }

  return {
    output,
    evaluation,
    attempts,
  };
}
