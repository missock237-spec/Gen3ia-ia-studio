import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  protectRoute,
} from "@/lib/security/route-guard";

import {
  rateLimit,
} from "@/lib/security/rate-limit";

import {
  executeThroughGateway,
} from "@/lib/execution/execution-gateway";

import {
  createAgentPolicy,
} from "@/lib/security/agent-policy";

import {
  randomUUID,
} from "crypto";

export async function POST(
  request: NextRequest,
) {
  const auth =
    await protectRoute(
      request,
    );

  if (!auth.ok) {
    return auth.response;
  }

  const userId =
    auth.context.userId;

  const limit =
    rateLimit(
      `tools:${userId}`,
      {
        limit: 30,

        windowMs:
          60 * 1000,
      },
    );

  if (!limit.allowed) {
    return NextResponse.json(
      {
        success: false,

        error:
          "Too many tool requests.",

        retryAfterMs:
          limit.retryAfterMs,
      },
      {
        status: 429,
      },
    );
  }

  try {
    const body =
      await request.json();

    const {
      toolName,
      input,
      executionId,
    } = body;

    if (
      typeof toolName !==
      "string"
    ) {
      return NextResponse.json(
        {
          success: false,

          error:
            "toolName is required.",
        },
        {
          status: 400,
        },
      );
    }

    const policy =
      createAgentPolicy(
        "standard",
      );

    const result =
      await executeThroughGateway({
        userId,

        executionId:
          executionId ??
          randomUUID(),

        type: "tool",

        name:
          toolName,

        input:
          input ?? {},

        policy,

      });

    if (!result.success) {
      return NextResponse.json(
        result,
        {
          status: 403,
        },
      );
    }

    return NextResponse.json(
      result,
      {
        status: 200,
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Internal error",
      },
      {
        status: 500,
      },
    );
  }
}
