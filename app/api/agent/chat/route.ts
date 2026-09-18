import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/security/authenticated-request";
import { planUniversalAgent } from "@/lib/agents/runtime/unified-agent";

const Body = z.object({
  message: z.string().trim().min(1).max(20_000),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const body = Body.parse(await request.json());
    const plan = await planUniversalAgent(user.uid, body.message);

    return NextResponse.json({
      mode: "agent",
      objective: body.message,
      executionId: plan.executionId,
      status: "planned",
      plan,
      next: "The plan is validated and ready for the Gen3ia execution/approval pipeline.",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Agent planning failed." },
      { status: 400 },
    );
  }
}
