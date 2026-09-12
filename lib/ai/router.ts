import {
  MODEL_CAPABILITIES,
  PROVIDERS,
} from "./config";

import type {
  AIProvider,
  AIRequest,
  AIResponse,
  TaskType,
} from "./models";

import {
  callProvider,
} from "./providers";

export interface RoutingDecision {
  provider: AIProvider;

  model: string;

  reason: string;

  score: number;
}

function calculateScore(
  request: AIRequest,
  provider: AIProvider,
  model: string,
): number {
  const capability =
    MODEL_CAPABILITIES.find(
      (item) =>
        item.provider === provider &&
        item.model === model,
    );

  if (!capability) {
    return -Infinity;
  }

  if (
    !capability.tasks.includes(
      request.task,
    )
  ) {
    return -Infinity;
  }

  if (
    request.requiresTools &&
    !capability.toolCalling
  ) {
    return -Infinity;
  }

  if (
    request.requiresVision &&
    !capability.vision
  ) {
    return -Infinity;
  }

  if (
    request.requiresStructuredOutput &&
    !capability.structuredOutput
  ) {
    return -Infinity;
  }

  let score =
    capability.priority;

  if (
    request.provider ===
    provider
  ) {
    score += 100;
  }

  if (
    request.preferFree &&
    provider === "openrouter"
  ) {
    score += 40;
  }

  return score;
}

export function selectProvider(
  request: AIRequest,
): RoutingDecision[] {
  const decisions:
    RoutingDecision[] = [];

  for (const providerConfig of PROVIDERS) {
    if (!providerConfig.enabled) {
      continue;
    }

    const model =
      request.provider ===
        providerConfig.provider &&
      request.model
        ? request.model
        : providerConfig.defaultModel;

    if (
      !model ||
      model === "auto"
    ) {
      continue;
    }

    const score =
      calculateScore(
        request,
        providerConfig.provider,
        model,
      );

    if (
      score === -Infinity
    ) {
      continue;
    }

    decisions.push({
      provider:
        providerConfig.provider,

      model,

      score,

      reason:
        `${providerConfig.provider} selected for ${request.task}`,
    });
  }

  return decisions.sort(
    (a, b) =>
      b.score - a.score,
  );
}

export async function generate(
  request: AIRequest,
): Promise<AIResponse> {
  const candidates =
    selectProvider(request);

  if (candidates.length === 0) {
    throw new Error(
      `No configured provider can execute task "${request.task}".`,
    );
  }

  const failures: Array<{
    provider: AIProvider;
    error: string;
  }> = [];

  for (const candidate of candidates) {
    try {
      return await callProvider(
        candidate.provider,
        {
          ...request,

          provider:
            candidate.provider,

          model:
            candidate.model,
        },
      );
    } catch (error) {
      failures.push({
        provider:
          candidate.provider,

        error:
          error instanceof Error
            ? error.message
            : "Unknown provider error.",
      });
    }
  }

  throw new Error(
    `All AI providers failed: ${JSON.stringify(
      failures,
    )}`,
  );
}
