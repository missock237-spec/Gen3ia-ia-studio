import {
  checkPermission,
  DEFAULT_PERMISSION_POLICY,
  type PermissionPolicy,
} from "./permissions";

import {
  recordToolAudit,
} from "./audit";

import {
  ToolRegistry,
} from "./registry";

import type {
  ToolCall,
  ToolContext,
  ToolResult,
} from "./types";

export interface ToolApprovalService {
  requestApproval(params: {
    userId: string;
    toolId: string;
    input: unknown;
    reason: string;
  }): Promise<boolean>;
}

export interface ExecuteToolRequest {
  userId: string;
  executionId: string;
  toolName: string;
  input: unknown;
  signal?: AbortSignal;
}
export async function executeTool(
  request: ExecuteToolRequest,
) {
  const tool = toolRegistry.get(
    request.toolName,
  );

  if (!tool) {
    return {
      success: false,
      error: `Unknown tool: ${request.toolName}`,
    };
  }

  // 1. permission
  // 2. validation Zod
  // 3. approval si nécessaire
  // 4. exécution
  // 5. audit
  // 6. résultat normalisé

  return {
    success: true,
    output: await tool.execute({
      userId: request.userId,
      executionId: request.executionId,
      input: request.input,
      signal: request.signal,
    }),
  };
}

export class ToolExecutor {
  constructor(
    private readonly registry: ToolRegistry,

    private readonly approvalService?: ToolApprovalService,

    private readonly policy:
      PermissionPolicy =
      DEFAULT_PERMISSION_POLICY,
  ) {}

  async execute(
    call: ToolCall,
    context: ToolContext,
  ): Promise<ToolResult> {
    const startedAt =
      Date.now();

    let result:
      ToolResult;

    try {
      const tool =
        this.registry.get(
          call.toolId,
        );

      const permission =
        checkPermission(
          tool.risk,
          this.policy,
        );

      if (!permission.allowed) {
        result = {
          callId: call.id,

          toolId: call.toolId,

          status: "denied",

          error:
            "Tool execution denied by policy.",

          latencyMs:
            Date.now() -
            startedAt,

          executedAt:
            new Date().toISOString(),
        };

        await recordToolAudit({
          userId:
            context.userId,

          projectId:
            context.projectId,

          agentId:
            context.agentId,

          executionId:
            context.executionId,

          toolId:
            call.toolId,

          input:
            call.input,

          result,
        });

        return result;
      }

      if (
        permission.requiresApproval
      ) {
        if (
          !this.approvalService
        ) {
          throw new Error(
            "Human approval is required but no approval service is configured.",
          );
        }

        const approved =
          await this.approvalService.requestApproval(
            {
              userId:
                context.userId,

              toolId:
                call.toolId,

              input:
                call.input,

              reason:
                permission.reason,
            },
          );

        if (!approved) {
          result = {
            callId:
              call.id,

            toolId:
              call.toolId,

            status:
              "denied",

            error:
              "User denied the requested action.",

            latencyMs:
              Date.now() -
              startedAt,

            executedAt:
              new Date().toISOString(),
          };

          await recordToolAudit({
            userId:
              context.userId,

            projectId:
              context.projectId,

            agentId:
              context.agentId,

            executionId:
              context.executionId,

            toolId:
              call.toolId,

            input:
              call.input,

            result,
          });

          return result;
        }
      }

      const parsedInput =
        tool.inputSchema.parse(
          call.input,
        );

      const output =
        await tool.execute(
          parsedInput,
          context,
        );

      result = {
        callId:
          call.id,

        toolId:
          call.toolId,

        status:
          "success",

        output,

        latencyMs:
          Date.now() -
          startedAt,

        executedAt:
          new Date().toISOString(),
      };
    } catch (error) {
      result = {
        callId:
          call.id,

        toolId:
          call.toolId,

        status:
          "failed",

        error:
          error instanceof Error
            ? error.message
            : "Tool execution failed.",

        latencyMs:
          Date.now() -
          startedAt,

        executedAt:
          new Date().toISOString(),
      };
    }

    await recordToolAudit({
      userId:
        context.userId,

      projectId:
        context.projectId,

      agentId:
        context.agentId,

      executionId:
        context.executionId,

      toolId:
        call.toolId,

      input:
        call.input,

      result,
    });

    return result;
  }
}
