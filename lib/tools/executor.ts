import { checkPermission, DEFAULT_PERMISSION_POLICY, type PermissionPolicy } from "./permission";
import { recordToolAudit } from "./audit";
import { ToolRegistry } from "./registry";
import { createDefaultToolRegistry } from "./default-registry";
import type { ToolCall, ToolContext, ToolResult } from "./types";

export interface ToolApprovalService {
  requestApproval(params: { userId: string; toolId: string; input: unknown; reason: string }): Promise<boolean>;
}

export interface ExecuteToolRequest {
  userId: string;
  executionId: string;
  toolName: string;
  input: unknown;
  signal?: AbortSignal;
}

const toolRegistry = createDefaultToolRegistry();

export async function executeTool(request: ExecuteToolRequest) {
  const tool = toolRegistry.get(request.toolName);
  if (!tool) return { success: false, error: `Unknown tool: ${request.toolName}` };

  try {
    const parsedInput = tool.inputSchema.parse(request.input);
    const output = await tool.execute(parsedInput, {
      userId: request.userId,
      executionId: request.executionId,
      signal: request.signal,
    });
    return { success: true, output };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Tool execution failed" };
  }
}

export class ToolExecutor {
  constructor(
    private readonly registry: ToolRegistry,
    private readonly approvalService?: ToolApprovalService,
    private readonly policy: PermissionPolicy = DEFAULT_PERMISSION_POLICY,
  ) {}

  async execute(call: ToolCall, context: ToolContext): Promise<ToolResult> {
    const startedAt = Date.now();
    let result: ToolResult;
    try {
      const tool = this.registry.get(call.toolId);
      if (!tool) throw new Error(`Unknown tool: ${call.toolId}`);
      const permission = checkPermission(tool.risk, this.policy);
      if (!permission.allowed) {
        result = { callId: call.id, toolId: call.toolId, status: "denied", error: "Tool execution denied by policy.", latencyMs: Date.now() - startedAt, executedAt: new Date().toISOString() };
        await recordToolAudit({ ...context, toolId: call.toolId, input: call.input, result });
        return result;
      }
      if (permission.requiresApproval) {
        if (!this.approvalService) throw new Error("Human approval is required but no approval service is configured.");
        const approved = await this.approvalService.requestApproval({ userId: context.userId, toolId: call.toolId, input: call.input, reason: permission.reason });
        if (!approved) {
          result = { callId: call.id, toolId: call.toolId, status: "denied", error: "User denied the requested action.", latencyMs: Date.now() - startedAt, executedAt: new Date().toISOString() };
          await recordToolAudit({ ...context, toolId: call.toolId, input: call.input, result });
          return result;
        }
      }
      const parsedInput = tool.inputSchema.parse(call.input);
      const output = await tool.execute(parsedInput, context);
      result = { callId: call.id, toolId: call.toolId, status: "success", output, latencyMs: Date.now() - startedAt, executedAt: new Date().toISOString() };
    } catch (error) {
      result = { callId: call.id, toolId: call.toolId, status: "failed", error: error instanceof Error ? error.message : "Tool execution failed.", latencyMs: Date.now() - startedAt, executedAt: new Date().toISOString() };
    }
    await recordToolAudit({ ...context, toolId: call.toolId, input: call.input, result });
    return result;
  }
}
