import { randomUUID } from "node:crypto";
import { generate } from "@/lib/ai/router";
import { GEN3IA_TOOLS } from "@/lib/tools/registry";
import { AgentRuntime } from "./runner";
import { RuntimePlanSchema, type RuntimePlan } from "./types";
import { DEFAULT_EXECUTION_POLICY, type ExecutionPolicy } from "@/lib/security/execution-policy";

const MAX_OBJECTIVE_LENGTH = 20_000;
const MAX_PLAN_STEPS = 20;

const PLAN_SYSTEM = [
  "You are the Gen3ia universal agent planner.",
  "Every user request must be converted into a safe executable plan using only the capabilities listed below.",
  "Prefer the smallest number of steps and reuse previous outputs through dependencies.",
  "Use an llm step for reasoning or drafting, a research step for web research, a document step for document generation, a media step for media planning, a tool step for registered tools, and a code step only when isolated computation is necessary.",
  "Never invent a tool name.",
  "Never claim that an external action was completed unless the corresponding tool step succeeds.",
  "Mark sideEffect=true and requiresApproval=true for destructive, financial, credential, account-security, publication, deletion, external-account or other irreversible actions.",
  "Never request secrets in step inputs.",
  "Return JSON only with: executionId, objective, steps, maxConcurrency, maxIterations.",
].join(" ");

function toolCatalog(): string {
  return GEN3IA_TOOLS.map((tool) =>
    `- ${tool.name}: ${tool.description}; risk=${tool.risk}; permission=${tool.permission}; sideEffect=${tool.sideEffect}`,
  ).join("\n");
}

function normalizePlan(plan: RuntimePlan, objective: string): RuntimePlan {
  const normalized = RuntimePlanSchema.parse({
    ...plan,
    executionId: plan.executionId || randomUUID(),
    objective,
    steps: plan.steps.slice(0, MAX_PLAN_STEPS),
    maxConcurrency: Math.min(plan.maxConcurrency ?? 4, 4),
    maxIterations: Math.min(plan.maxIterations ?? 10, 20),
  });
  for (const step of normalized.steps) {
    if (step.type === "tool" && !step.toolName) throw new Error(`Tool step ${step.id} has no toolName.`);
    if (step.type === "tool" && !GEN3IA_TOOLS.some((tool) => tool.name === step.toolName)) {
      throw new Error(`Planner selected an unavailable tool: ${step.toolName}`);
    }
  }
  return normalized;
}

export async function planUniversalAgent(
  userId: string,
  objective: string,
  options?: { policy?: ExecutionPolicy; signal?: AbortSignal },
): Promise<RuntimePlan> {
  const trimmed = objective.trim();
  if (!trimmed || trimmed.length > MAX_OBJECTIVE_LENGTH) throw new Error("Invalid agent objective.");

  const response = await generate({
    task: "agent",
    messages: [
      { role: "system", content: PLAN_SYSTEM },
      { role: "user", content: JSON.stringify({ objective: trimmed, availableCapabilities: toolCatalog() }) },
    ],
    requiresStructuredOutput: true,
    preferFree: true,
    maxTokens: 6000,
    metadata: { userId },
  });

  let parsed: unknown;
  try {
    parsed = JSON.parse(response.text);
  } catch {
    throw new Error("The agent planner returned invalid JSON.");
  }

  const plan = normalizePlan(RuntimePlanSchema.parse(parsed), trimmed);
  const runtime = new AgentRuntime({
    userId,
    objective: trimmed,
    plan,
    policy: options?.policy ?? DEFAULT_EXECUTION_POLICY,
    signal: options?.signal,
  });
  // Construction validates the DAG. Execution is intentionally separate so
  // callers can inspect/approve the generated plan before side effects.
  void runtime;
  return plan;
}
