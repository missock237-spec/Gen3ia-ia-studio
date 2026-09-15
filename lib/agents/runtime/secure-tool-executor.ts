import { executeTool } from "@/lib/tools";
import { ExecutionPolicy, DEFAULT_EXECUTION_POLICY } from "@/lib/security/execution-policy";
import { authorizeTool } from "@/lib/security/tool-permissions";
import { assertExecutionInputSize, assertOutputSize } from "./execution-limits";
import { executeSandbox } from "@/lib/sandbox/client";
import type { SandboxRuntime, SandboxLimits } from "@/lib/sandbox/types";
import { billToolExecution } from "@/lib/billing/tool-meter";

export interface SecureToolExecutionOptions {
  userId: string;
  executionId: string;
  toolName: string;
  input: Record<string, unknown>;
  policy?: ExecutionPolicy;
  signal?: AbortSignal;
}

const DEFAULT_SANDBOX_LIMITS: SandboxLimits = { timeoutMs: 30_000, memoryMb: 512, cpu: 1, maxOutputBytes: 1_000_000 };

function parseSandboxInput(input: Record<string, unknown>) {
  const runtime = input.runtime;
  const code = input.code;
  const providedLimits = input.limits;
  if (runtime !== "node" && runtime !== "python") throw new Error("code.execute requires runtime 'node' or 'python'");
  if (typeof code !== "string" || code.length === 0 || code.length > 500_000) throw new Error("code.execute requires code between 1 and 500000 characters");
  if (providedLimits !== undefined && (typeof providedLimits !== "object" || providedLimits === null)) throw new Error("code.execute limits must be an object");
  const limits = { ...DEFAULT_SANDBOX_LIMITS, ...(providedLimits as Partial<SandboxLimits> | undefined) };
  if (!Number.isInteger(limits.timeoutMs) || limits.timeoutMs < 100 || limits.timeoutMs > 120_000 || !Number.isInteger(limits.memoryMb) || limits.memoryMb < 64 || limits.memoryMb > 2_048 || typeof limits.cpu !== "number" || limits.cpu < 0.1 || limits.cpu > 2 || !Number.isInteger(limits.maxOutputBytes) || limits.maxOutputBytes < 1_024 || limits.maxOutputBytes > 10_000_000) throw new Error("code.execute limits are outside the allowed sandbox bounds");
  return { runtime: runtime as SandboxRuntime, code, input: input.input, limits };
}

export async function executeToolSecurely(options: SecureToolExecutionOptions): Promise<unknown> {
  const policy = options.policy ?? DEFAULT_EXECUTION_POLICY;
  assertExecutionInputSize(options.input, policy.maxInputBytes);
  authorizeTool(policy, options.toolName);
  if (options.signal?.aborted) throw new Error("Execution cancelled");

  const startedAt = Date.now();
  let result: unknown;
  if (options.toolName === "code.execute") {
    if (!policy.allowCodeExecution) throw new Error("Code execution is disabled by the execution policy");
    const sandbox = parseSandboxInput(options.input);
    result = await executeSandbox({ executionId: options.executionId, userId: options.userId, runtime: sandbox.runtime, code: sandbox.code, input: sandbox.input, limits: sandbox.limits, network: "none" });
  } else {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), policy.maxToolExecutionMs);
    const onAbort = () => controller.abort();
    options.signal?.addEventListener("abort", onAbort, { once: true });
    try {
      const toolResult = await executeTool({ userId: options.userId, executionId: options.executionId, toolName: options.toolName, input: options.input, signal: controller.signal, policy });
      if (!toolResult.success) throw new Error(toolResult.error ?? `Tool ${options.toolName} failed`);
      result = toolResult.output;
    } finally {
      clearTimeout(timeout);
      options.signal?.removeEventListener("abort", onAbort);
    }
  }

  assertOutputSize(result, policy.maxOutputBytes);
  await billToolExecution({ userId: options.userId, executionId: options.executionId, toolName: options.toolName, input: options.input, durationMs: Date.now() - startedAt });
  return result;
}
