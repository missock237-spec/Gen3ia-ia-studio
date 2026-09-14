import { executeTool } from "@/lib/tools";
import { ExecutionPolicy, DEFAULT_EXECUTION_POLICY } from "@/lib/security/execution-policy";
import { authorizeTool } from "@/lib/security/tool-permissions";
import { assertExecutionInputSize, assertOutputSize } from "./execution-limits";

export interface SecureToolExecutionOptions {
  userId: string;
  executionId: string;
  toolName: string;
  input: Record<string, unknown>;
  policy?: ExecutionPolicy;
  signal?: AbortSignal;
}

export async function executeToolSecurely(options: SecureToolExecutionOptions): Promise<unknown> {
  const policy = options.policy ?? DEFAULT_EXECUTION_POLICY;
  assertExecutionInputSize(options.input, policy.maxInputBytes);
  authorizeTool(policy, options.toolName);
  if (options.signal?.aborted) throw new Error("Execution cancelled");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), policy.maxToolExecutionMs);
  const onAbort = () => controller.abort();
  options.signal?.addEventListener("abort", onAbort, { once: true });

  try {
    const result = await executeTool({
      userId: options.userId,
      executionId: options.executionId,
      toolName: options.toolName,
      input: options.input,
      signal: controller.signal,
    });

    if (!result.success) throw new Error(result.error ?? `Tool ${options.toolName} failed`);
    assertOutputSize(result.output, policy.maxOutputBytes);
    return result.output;
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener("abort", onAbort);
  }
}
