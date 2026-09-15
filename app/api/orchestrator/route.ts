import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyFirebaseToken } from "@/lib/firebase/auth-server";
import { coordinateTeamExecution } from "@/lib/orchestrator/team-coordination";

const RequestSchema = z.object({
  teamId: z.string().trim().min(1).max(256),
  objective: z.string().trim().min(1).max(20_000),
  context: z.record(z.string(), z.unknown()).optional(),
  customerId: z.string().trim().min(1).max(256).optional(),
  requestedRoles: z.array(z.enum(["customer_service", "sales", "content", "admin", "analytics"])).max(5).optional(),
});

export async function POST(request: Request) {
  try {
    const token = await verifyFirebaseToken(request.headers.get("authorization"));
    const body = RequestSchema.parse(await request.json());
    const result = await coordinateTeamExecution({ userId: token.uid, ...body });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Orchestrator execution failed";
    if (/authorization|token|revoked|scheme/i.test(message)) return NextResponse.json({ error: message }, { status: 401 });
    if (/team|membership|archived|role/i.test(message)) return NextResponse.json({ error: message }, { status: 403 });
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
