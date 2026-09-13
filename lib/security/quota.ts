export interface ExecutionQuota {
  maxExecutions: number;

  maxSteps: number;

  maxRuntimeMs: number;

  maxToolCalls: number;
}

export const DEFAULT_QUOTA: ExecutionQuota = {
  maxExecutions: 100,

  maxSteps: 1000,

  maxRuntimeMs:
    30 * 60 * 1000,

  maxToolCalls: 200,
};

export interface QuotaUsage {
  executions: number;

  steps: number;

  runtimeMs: number;

  toolCalls: number;
}

export function checkQuota(
  usage: QuotaUsage,
  quota: ExecutionQuota,
): void {
  if (
    usage.executions >=
    quota.maxExecutions
  ) {
    throw new Error(
      "Execution quota exceeded.",
    );
  }

  if (
    usage.steps >=
    quota.maxSteps
  ) {
    throw new Error(
      "Step quota exceeded.",
    );
  }

  if (
    usage.runtimeMs >=
    quota.maxRuntimeMs
  ) {
    throw new Error(
      "Runtime quota exceeded.",
    );
  }

  if (
    usage.toolCalls >=
    quota.maxToolCalls
  ) {
    throw new Error(
      "Tool-call quota exceeded.",
    );
  }
}
