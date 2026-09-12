export type AIProvider =
  | "groq"
  | "openrouter"
  | "anthropic"
  | "openai"
  | "glm"
  | "huggingface"
  | "jules";

export type TaskType =
  | "chat"
  | "reasoning"
  | "research"
  | "coding"
  | "image"
  | "video"
  | "audio"
  | "document"
  | "automation"
  | "agent";

export interface ModelCapability {
  provider: AIProvider;
  model: string;
  tasks: TaskType[];
  toolCalling: boolean;
  vision: boolean;
  structuredOutput: boolean;
  streaming: boolean;
  priority: number;
}

export const MODEL_REGISTRY: ModelCapability[] = [
  {
    provider: "groq",
    model: process.env.GROQ_MODEL || "auto",
    tasks: ["chat", "reasoning", "agent"],
    toolCalling: true,
    vision: true,
    structuredOutput: true,
    streaming: true,
    priority: 80
  },

  {
    provider: "openrouter",
    model: process.env.OPENROUTER_MODEL || "openrouter/free",
    tasks: [
      "chat",
      "reasoning",
      "coding",
      "research",
      "agent"
    ],
    toolCalling: true,
    vision: true,
    structuredOutput: true,
    streaming: true,
    priority: 75
  },

  {
    provider: "anthropic",
    model: process.env.CLAUDE_MODEL || "auto",
    tasks: [
      "reasoning",
      "coding",
      "research",
      "agent"
    ],
    toolCalling: true,
    vision: true,
    structuredOutput: true,
    streaming: true,
    priority: 95
  },

  {
    provider: "openai",
    model: process.env.OPENAI_TEXT_MODEL || "auto",
    tasks: [
      "chat",
      "reasoning",
      "coding",
      "research",
      "agent",
      "image",
      "audio"
    ],
    toolCalling: true,
    vision: true,
    structuredOutput: true,
    streaming: true,
    priority: 98
  },

  {
    provider: "glm",
    model: process.env.GLM_MODEL || "auto",
    tasks: [
      "chat",
      "reasoning",
      "coding",
      "agent",
      "image",
      "video",
      "audio"
    ],
    toolCalling: true,
    vision: true,
    structuredOutput: true,
    streaming: true,
    priority: 90
  },

  {
    provider: "huggingface",
    model: process.env.HF_TEXT_MODEL || "auto",
    tasks: [
      "chat",
      "research",
      "image",
      "video",
      "audio"
    ],
    toolCalling: false,
    vision: true,
    structuredOutput: false,
    streaming: false,
    priority: 70
  }
];
