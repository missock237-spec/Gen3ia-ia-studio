import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyFirebaseToken } from "@/lib/firebase/auth-server";
import { runOrchestrator } from "@/lib/agents/orchestrator";

const RequestSchema = z.object({
  objective: z.string().trim().min(1).max(20_000),
  context: z.record(z.string(), z.unknown()).optional(),
  requestedRoles: z.array(z.enum(["customer_service", "sales", "content", "admin", "analytics"])).max(5).optional(),
});

export async function POST(request: Request) {
  try {
    const token = await verifyFirebaseToken(request.headers.get("authorization"));
    const body = RequestSchema.parse(await request.json());
    const result = await runOrchestrator({ userId: token.uid, objective: body.objective, context: body.context, requestedRoles: body.requestedRoles });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Orchestrator execution failed";
    if (/authorization|token|revoked|scheme/i.test(message)) return NextResponse.json({ error: message }, { status: 401 });
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
