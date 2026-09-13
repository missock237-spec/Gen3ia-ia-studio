import {
  ExecutionPolicy,
  DEFAULT_EXECUTION_POLICY,
} from "@/lib/security/execution-policy";

import {
  executeToolSecurely,
} from "@/lib/agents/runtime/secure-tool-executor";

import {
  sandbox,
} from "@/lib/agents/runtime/sandbox";

export interface ExecutionGatewayRequest {
  userId: string;

  executionId: string;

  type:
    | "tool"
    | "code";

  name: string;

  input?: Record<string, unknown>;

  code?: string;

  policy?: ExecutionPolicy;

  signal?: AbortSignal;
}

export interface ExecutionGatewayResult {
  success: boolean;

  output?: unknown;

  error?: string;
}

export async function executeThroughGateway(
  request: ExecutionGatewayRequest,
): Promise<ExecutionGatewayResult> {
  const policy =
    request.policy ??
    DEFAULT_EXECUTION_POLICY;

  try {
    if (
      request.type === "tool"
    ) {
      const output =
        await executeToolSecurely({
          userId:
            request.userId,

          executionId:
            request.executionId,

          toolName:
            request.name,

          input:
            request.input ?? {},

          policy,

          signal:
            request.signal,
        });

      return {
        success: true,
        output,
      };
    }

    if (
      request.type === "code"
    ) {
      if (
        !policy.allowCodeExecution
      ) {
        throw new Error(
          "Code execution is not permitted.",
        );
      }

      if (!request.code) {
        throw new Error(
          "No code supplied.",
        );
      }

      return sandbox.execute({
        executionId:
          request.executionId,

        userId:
          request.userId,

        code:
          request.code,

        input:
          request.input,

        policy,
      });
    }

    throw new Error(
      "Unsupported execution type.",
    );
  } catch (error) {
    return {
      success: false,

      error:
        error instanceof Error
          ? error.message
          : String(error),
    };
  }
    }
