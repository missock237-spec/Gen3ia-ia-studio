export type ModelCapability =
  | "reasoning"
  | "coding"
  | "research"
  | "vision"
  | "document"
  | "creative"
  | "fast"
  | "structured";

export interface ModelCandidate {
  provider: string;
  model: string;

  capabilities: ModelCapability[];

  costPerMillionInputTokens: number;
  costPerMillionOutputTokens: number;

  contextWindow: number;

  qualityScore: number;
  latencyScore: number;

  available: boolean;
}

export interface ModelRoutingRequest {
  taskType:
    | "chat"
    | "research"
    | "coding"
    | "document"
    | "image"
    | "video"
    | "audio"
    | "reasoning";

  requiredCapabilities?: ModelCapability[];

  estimatedInputTokens?: number;

  budgetUsd?: number;

  preferSpeed?: boolean;

  preferQuality?: boolean;
}

const DEFAULT_MODELS:
  ModelCandidate[] = [
    {
      provider: "openrouter",
      model: "auto",
      capabilities: [
        "reasoning",
        "coding",
        "research",
        "structured",
      ],
      costPerMillionInputTokens: 0,
      costPerMillionOutputTokens: 0,
      contextWindow: 128_000,
      qualityScore: 0.85,
      latencyScore: 0.8,
      available: true,
    },

    {
      provider: "groq",
      model: "auto",
      capabilities: [
        "fast",
        "coding",
        "reasoning",
      ],
      costPerMillionInputTokens: 0,
      costPerMillionOutputTokens: 0,
      contextWindow: 128_000,
      qualityScore: 0.82,
      latencyScore: 0.98,
      available: true,
    },

    {
      provider: "google",
      model: "gemini",
      capabilities: [
        "reasoning",
        "coding",
        "vision",
        "research",
        "structured",
      ],
      costPerMillionInputTokens: 0,
      costPerMillionOutputTokens: 0,
      contextWindow: 1_000_000,
      qualityScore: 0.9,
      latencyScore: 0.82,
      available: true,
    },

    {
      provider: "anthropic",
      model: "claude",
      capabilities: [
        "reasoning",
        "coding",
        "research",
        "document",
        "structured",
      ],
      costPerMillionInputTokens: 0,
      costPerMillionOutputTokens: 0,
      contextWindow: 200_000,
      qualityScore: 0.95,
      latencyScore: 0.75,
      available: true,
    },
  ];

function taskCapabilities(
  taskType: ModelRoutingRequest["taskType"],
): ModelCapability[] {
  switch (taskType) {
    case "coding":
      return [
        "coding",
        "reasoning",
      ];

    case "research":
      return [
        "research",
        "reasoning",
      ];

    case "document":
      return [
        "document",
        "structured",
      ];

    case "reasoning":
      return ["reasoning"];

    default:
      return ["fast"];
  }
}

export function selectModel(
  request: ModelRoutingRequest,
  models: ModelCandidate[] =
    DEFAULT_MODELS,
): ModelCandidate {
  const required = [
    ...taskCapabilities(
      request.taskType,
    ),
    ...(request.requiredCapabilities ??
      []),
  ];

  const candidates = models.filter(
    (model) =>
      model.available &&
      required.every((capability) =>
        model.capabilities.includes(
          capability,
        ),
      ),
  );

  if (candidates.length === 0) {
    throw new Error(
      `No model available for task type: ${request.taskType}`,
    );
  }

  return [...candidates].sort(
    (a, b) => {
      let scoreA =
        a.qualityScore * 0.5 +
        a.latencyScore * 0.2;

      let scoreB =
        b.qualityScore * 0.5 +
        b.latencyScore * 0.2;

      if (request.preferSpeed) {
        scoreA +=
          a.latencyScore * 0.3;
        scoreB +=
          b.latencyScore * 0.3;
      }

      if (request.preferQuality) {
        scoreA +=
          a.qualityScore * 0.3;
        scoreB +=
          b.qualityScore * 0.3;
      }

      return scoreB - scoreA;
    },
  )[0];
     }
