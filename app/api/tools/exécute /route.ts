import {
  randomUUID,
} from "node:crypto";

import {
  NextRequest,
  NextResponse,
} from "next/server";

import { z } from "zod";

import {
  requireUser,
} from "@/lib/security/authenticated-request";

import {
  createDefaultToolRegistry,
} from "@/lib/tools/default-registry";

import {
  ToolExecutor,
} from "@/lib/tools/executor";

const RequestSchema =
  z.object({
    toolId:
      z.string().min(1),

    input:
      z.unknown(),

    projectId:
      z.string().optional(),

    agentId:
      z.string().optional(),

    executionId:
      z.string().optional(),
  });

export async function POST(
  request: NextRequest,
) {
  try {
    const user =
      await requireUser(request);

    const body =
      await request.json();

    const input =
      RequestSchema.parse(
        body,
      );

    const registry =
      createDefaultToolRegistry();

    const executor =
      new ToolExecutor(
        registry,
      );

    const result =
      await executor.execute(
        {
          id:
            randomUUID(),

          toolId:
            input.toolId,

          input:
            input.input,

          requestedAt:
            new Date().toISOString(),
        },
        {
          userId:
            user.uid,

          projectId:
            input.projectId,

          agentId:
            input.agentId,

          executionId:
            input.executionId,
        },
      );

    return NextResponse.json({
      result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Tool execution failed.",
      },
      {
        status: 400,
      },
    );
  }
}
