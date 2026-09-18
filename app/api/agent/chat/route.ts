import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/security/authenticated-request";
import { planUniversalAgent } from "@/lib/agents/runtime/unified-agent";
import { AgentRuntime } from "@/lib/agents/runtime/runner";
import { createCheckpoint } from "@/lib/agents/runtime/checkpoint";
import { createActionApproval } from "@/lib/agents/action-approvals";
import { classifyRoles } from "@/lib/agents/orchestrator";
import { DEFAULT_EXECUTION_POLICY, type ExecutionPolicy } from "@/lib/security/execution-policy";
import { getToolSecurityDefinition } from "@/lib/security/tool-permissions";

const Body = z.object({
  message: z.string().trim().min(1).max(20_000),
});

function buildPolicy(plan: Awaited<ReturnType<typeof planUniversalAgent>>, approved = false): ExecutionPolicy {
  const tools = [...new Set(plan.steps.filter((step) => step.type === "tool" || step.type === "research").map((step) => step.toolName).filter((name): name is string => Boolean(name)))];
  const permissions = new Set<ExecutionPolicy["permissions"][number]>(["tool.read"]);
  let allowNetwork = false;
  let allowFileWrite = false;
  let allowFileDelete = false;
  let allowCodeExecution = false;
  let allowAgentTerminal = false;
  let allowCamera = false;
  let allowExternalApps = false;

  for (const tool of tools) {
    const definition = getToolSecurityDefinition(tool);
    for (const permission of definition.requiredPermissions) permissions.add(permission);
    if (definition.network) allowNetwork = true;
    if (definition.filesystemWrite) allowFileWrite = true;
    if (definition.destructive) allowFileDelete = approved;
    if (tool === "code.execute") allowCodeExecution = approved;
    if (tool === "terminal.execute") allowAgentTerminal = approved;
    if (tool === "camera.capture") allowCamera = approved;
    if (definition.externalApp) allowExternalApps = approved;
  }

  return {
    ...DEFAULT_EXECUTION_POLICY,
    allowedTools: tools,
    permissions: [...permissions],
    maxSteps: Math.max(50, plan.steps.length + 10),
    allowNetwork,
    allowFileWrite: allowFileWrite && approved,
    allowFileDelete,
    allowCodeExecution,
    allowAgentTerminal,
    allowCamera,
    allowExternalApps,
  };
}

function initialState(userId: string, plan: Awaited<ReturnType<typeof planUniversalAgent>>) {
  return {
    executionId: plan.executionId,
    userId,
    objective: plan.objective,
    status: "pending" as const,
    plan,
    observations: [],
    evaluations: [],
    outputs: {},
    iteration: 0,
    totalRetries: 0,
    maxTotalRetries: 15,
    billing: { currency: "XAF", totalChargeMinor: 0, totalProviderCostEur: 0, llmInputTokens: 0, llmOutputTokens: 0 },
  };
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const body = Body.parse(await request.json());
    const plan = await planUniversalAgent(user.uid, body.message);

    const approvalSteps = plan.steps.filter((step) =>
      step.type === "tool" &&
      Boolean(step.toolName) &&
      (step.requiresApproval || step.sideEffect),
    );

    if (approvalSteps.length > 0) {
      await createCheckpoint(initialState(user.uid, plan));
      const role = classifyRoles(body.message)[0];
      const approvals = await Promise.all(approvalSteps.map((step) =>
        createActionApproval({
          ownerId: user.uid,
          executionId: plan.executionId,
          role,
          toolSlug: step.toolName!,
          arguments: step.input,
          reason: step.description,
        }),
      ));
      return NextResponse.json({
        mode: "agent",
        status: "waiting_approval",
        executionId: plan.executionId,
        objective: plan.objective,
        plan,
        approvals: approvals.map((approval) => ({
          id: approval.id,
          toolSlug: approval.toolSlug,
          reason: approval.reason,
          status: approval.status,
          expiresAt: approval.expiresAt,
          stepId: approval.arguments.__stepId ?? undefined,
        })),
      });
    }

    const runtime = new AgentRuntime({
      userId: user.uid,
      objective: plan.objective,
      plan,
      policy: buildPolicy(plan, false),
    });
    const state = await runtime.run();

    return NextResponse.json({
      mode: "agent",
      status: state.status,
      executionId: state.executionId,
      objective: state.objective,
      plan: state.plan,
      observations: state.observations,
      outputs: state.outputs,
      billing: state.billing,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Agent execution failed." },
      { status: 400 },
    );
  }
}
