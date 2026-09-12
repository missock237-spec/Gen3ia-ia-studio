import {
  AIProvider,
  MODEL_REGISTRY,
  TaskType
} from "./models";

export interface RoutingRequest {
  task: TaskType;
  requiresTools?: boolean;
  requiresVision?: boolean;
  requiresStructuredOutput?: boolean;
  preferFree?: boolean;
  preferredProvider?: AIProvider;
}

export interface RoutingDecision {
  provider: AIProvider;
  model: string;
  reason: string;
}

export function selectModel(
  request: RoutingRequest
): RoutingDecision {
  const candidates = MODEL_REGISTRY.filter((model) => {
    if (!model.tasks.includes(request.task)) {
      return false;
    }

    if (
      request.requiresTools &&
      !model.toolCalling
    ) {
      return false;
    }

    if (
      request.requiresVision &&
      !model.vision
    ) {
      return false;
    }

    if (
      request.requiresStructuredOutput &&
      !model.structuredOutput
    ) {
      return false;
    }

    return true;
  });

  if (candidates.length === 0) {
    throw new Error(
      `No AI provider supports task: ${request.task}`
    );
  }

  const sorted = [...candidates].sort((a, b) => {
    let scoreA = a.priority;
    let scoreB = b.priority;

    if (
      request.preferredProvider &&
      a.provider === request.preferredProvider
    ) {
      scoreA += 50;
    }

    if (
      request.preferredProvider &&
      b.provider === request.preferredProvider
    ) {
      scoreB += 50;
    }

    if (
      request.preferFree &&
      a.provider === "openrouter"
    ) {
      scoreA += 30;
    }

    if (
      request.preferFree &&
      b.provider === "openrouter"
    ) {
      scoreB += 30;
    }

    return scoreB - scoreA;
  });

  const selected = sorted[0];

  return {
    provider: selected.provider,
    model: selected.model,
    reason:
      `Selected ${selected.provider}/${selected.model} ` +
      `for ${request.task}.`
  };
}
