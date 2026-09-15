import type { AIProvider, AIResponse, AIRequest, TaskType } from "@/lib/ai/models";

const n = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

/** Prices are EUR per 1M tokens. Configure actual provider/model rates with env vars. */
const DEFAULT_INPUT_PER_MILLION: Record<AIProvider, number> = {
  openai: n(process.env.COST_OPENAI_INPUT_EUR_PER_1M, 2.5),
  anthropic: n(process.env.COST_ANTHROPIC_INPUT_EUR_PER_1M, 3),
  groq: n(process.env.COST_GROQ_INPUT_EUR_PER_1M, 0.6),
  openrouter: n(process.env.COST_OPENROUTER_INPUT_EUR_PER_1M, 1.5),
  glm: n(process.env.COST_GLM_INPUT_EUR_PER_1M, 1),
  huggingface: n(process.env.COST_HF_INPUT_EUR_PER_1M, 0.8),
};

const DEFAULT_OUTPUT_PER_MILLION: Record<AIProvider, number> = {
  openai: n(process.env.COST_OPENAI_OUTPUT_EUR_PER_1M, 10),
  anthropic: n(process.env.COST_ANTHROPIC_OUTPUT_EUR_PER_1M, 15),
  groq: n(process.env.COST_GROQ_OUTPUT_EUR_PER_1M, 0.8),
  openrouter: n(process.env.COST_OPENROUTER_OUTPUT_EUR_PER_1M, 5),
  glm: n(process.env.COST_GLM_OUTPUT_EUR_PER_1M, 3),
  huggingface: n(process.env.COST_HF_OUTPUT_EUR_PER_1M, 3),
};

const TASK_MULTIPLIER: Record<TaskType, number> = {
  chat: 1,
  reasoning: 1.5,
  research: 1.25,
  coding: 1.35,
  image: 1.5,
  video: 2.5,
  audio: 1.8,
  document: 1.1,
  automation: 1.25,
  agent: 1.4,
};

const PLATFORM_OVERHEAD_EUR = n(process.env.GEN3IA_EXECUTION_OVERHEAD_EUR, 0.0005);
const PLATFORM_MARGIN = Math.max(0, n(process.env.GEN3IA_PLATFORM_MARGIN_RATE, 0.35));
const RESERVE_MULTIPLIER = Math.max(1, n(process.env.GEN3IA_RESERVE_MULTIPLIER, 2));
const MIN_CHARGE_EUR = Math.max(0, n(process.env.GEN3IA_MIN_EXECUTION_CHARGE_EUR, 0.001));

export interface ExecutionCostInput {
  task: TaskType;
  provider?: AIProvider;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  durationMs?: number;
  storageBytes?: number;
  networkBytes?: number;
  externalToolCostEur?: number;
  toolCalls?: number;
  complexity?: number;
}

export interface ExecutionCostBreakdown {
  providerCostEur: number;
  platformOverheadEur: number;
  storageCostEur: number;
  networkCostEur: number;
  externalToolCostEur: number;
  complexityMultiplier: number;
  marginEur: number;
  chargeEur: number;
  reserveEur: number;
  chargeMinor: number;
  reserveMinor: number;
}

function clampComplexity(value: number | undefined): number {
  return Math.min(5, Math.max(0.5, value ?? 1));
}

function ceilMinor(eur: number): number {
  return Math.max(0, Math.ceil(eur * 100));
}

export function estimateExecutionCost(input: ExecutionCostInput): ExecutionCostBreakdown {
  const provider = input.provider ?? "openrouter";
  const inputTokens = Math.max(0, input.inputTokens ?? 0);
  const outputTokens = Math.max(0, input.outputTokens ?? 0);
  const inputRate = DEFAULT_INPUT_PER_MILLION[provider];
  const outputRate = DEFAULT_OUTPUT_PER_MILLION[provider];
  const tokenProviderCost = inputTokens / 1_000_000 * inputRate + outputTokens / 1_000_000 * outputRate;
  const toolCalls = Math.max(0, input.toolCalls ?? 0);
  const toolOverhead = toolCalls * n(process.env.GEN3IA_TOOL_CALL_OVERHEAD_EUR, 0.0002);
  const storageCostEur = Math.max(0, input.storageBytes ?? 0) / (1024 ** 3) * n(process.env.GEN3IA_STORAGE_EUR_PER_GB, 0.02);
  const networkCostEur = Math.max(0, input.networkBytes ?? 0) / (1024 ** 3) * n(process.env.GEN3IA_NETWORK_EUR_PER_GB, 0.08);
  const providerCostEur = tokenProviderCost + toolOverhead;
  const complexityMultiplier = clampComplexity(input.complexity) * (TASK_MULTIPLIER[input.task] ?? 1);
  const rawCost = (providerCostEur + PLATFORM_OVERHEAD_EUR + storageCostEur + networkCostEur + Math.max(0, input.externalToolCostEur ?? 0)) * complexityMultiplier;
  const marginEur = rawCost * PLATFORM_MARGIN;
  const chargeEur = Math.max(MIN_CHARGE_EUR, rawCost + marginEur);
  const reserveEur = Math.max(chargeEur, chargeEur * RESERVE_MULTIPLIER);

  return {
    providerCostEur,
    platformOverheadEur: PLATFORM_OVERHEAD_EUR,
    storageCostEur,
    networkCostEur,
    externalToolCostEur: Math.max(0, input.externalToolCostEur ?? 0),
    complexityMultiplier,
    marginEur,
    chargeEur,
    reserveEur,
    chargeMinor: ceilMinor(chargeEur),
    reserveMinor: ceilMinor(reserveEur),
  };
}

export function costFromAIResponse(request: AIRequest, response: AIResponse): ExecutionCostBreakdown {
  return estimateExecutionCost({
    task: request.task,
    provider: response.provider,
    model: response.model,
    inputTokens: response.usage.inputTokens,
    outputTokens: response.usage.outputTokens,
    durationMs: response.latencyMs,
    complexity: request.requiresTools ? 1.15 : 1,
    toolCalls: request.requiresTools ? 1 : 0,
  });
}
