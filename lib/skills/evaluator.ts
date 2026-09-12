import {
  SkillEvaluationSchema,
} from "./schema";

export interface SkillEvaluationInput {
  skillId: string;
  version: number;

  expected: string;

  actual: string;

  latencyMs: number;

  criteria: string[];
}

export function evaluateSkill(
  input: SkillEvaluationInput,
) {
  const failures: string[] = [];
  const improvements: string[] = [];

  const actual =
    input.actual.trim();

  const hasOutput =
    actual.length > 0;

  if (!hasOutput) {
    failures.push(
      "The skill produced no output.",
    );
  }

  const latencyScore =
    input.latencyMs <= 5000
      ? 100
      : input.latencyMs <= 15000
        ? 80
        : input.latencyMs <= 30000
          ? 60
          : 30;

  if (latencyScore < 60) {
    improvements.push(
      "Reduce execution latency.",
    );
  }

  const correctnessScore =
    hasOutput ? 100 : 0;

  const reliability =
    hasOutput ? 100 : 0;

  const usefulness =
    hasOutput ? 100 : 0;

  const score =
    correctnessScore * 0.4 +
    reliability * 0.3 +
    usefulness * 0.2 +
    latencyScore * 0.1;

  const evaluation =
    SkillEvaluationSchema.parse({
      skillId: input.skillId,
      version: input.version,

      score,

      reliability,

      usefulness,

      correctness:
        correctnessScore,

      latencyScore,

      passed:
        score >= 75 &&
        failures.length === 0,

      failures,

      improvements,

      evaluatedAt:
        new Date().toISOString(),
    });

  return evaluation;
}
