import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "crypto";

import { requireUser } from "@/lib/security/authenticated-request";
import {
  AgentRuntime,
  RuntimePlanSchema,
} from "@/lib/agents/runtime";

const RunAgentSchema = z.object({
  objective: z.string().min(3),

  plan: RuntimePlanSchema
    .omit({
      executionId: true,
      objective: true,
    })
    .optional(),
});

export async function POST(
  request: NextRequest,
) {
  try {
    const user = await requireUser(request);

    const body = await request.json();

    const parsed =
      RunAgentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            parsed.error.flatten(),
        },
        {
          status: 400,
        },
      );
    }

    const executionId = randomUUID();

    const plan =
      parsed.data.plan ?? {
        steps: [
          {
            id: "step_1",
            type: "llm",
            name: "Execute objective",
            description:
              parsed.data.objective,
            dependencies: [],
            status: "pending",
            input: {},
            skillIds: [],
            maxRetries: 2,
            timeoutMs: 120_000,
            sideEffect: false,
            requiresApproval: false,
          },
        ],

        maxConcurrency: 4,
        maxIterations: 10,
      };

    const runtimePlan = {
      ...plan,
      executionId,
      objective:
        parsed.data.objective,
    };

    const runtime =
      new AgentRuntime({
        userId: user.uid,
        objective:
          parsed.data.objective,
        plan: runtimePlan,
        signal: request.signal,
      });

    const state =
      await runtime.run();

    return NextResponse.json({
      executionId,
      status: state.status,
      outputs: state.outputs,
      observations:
        state.observations,
    });
  } catch (error) {
    console.error(
      "Agent runtime error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Agent execution failed",
      },
      {
        status: 500,
      },
    );
  }
}
