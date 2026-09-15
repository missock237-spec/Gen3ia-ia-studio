import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyFirebaseToken } from "@/lib/firebase/auth-server";
import { coordinateTeamExecution } from "@/lib/orchestrator/team-coordination";

const Schema = z.object({ objective: z.string().trim().min(1).max(20000), context: z.record(z.string(), z.unknown()).optional(), customerId: z.string().trim().min(1).max(256).optional(), requestedRoles: z.array(z.enum(["customer_service", "sales", "content", "admin", "analytics"])).max(5).optional() });

export async function POST(request: Request, { params }: { params: { teamId: string } }) {
  try {
    const token = await verifyFirebaseToken(request.headers.get("authorization"));
    const body = Schema.parse(await request.json());
    return NextResponse.json(await coordinateTeamExecution({ userId: token.uid, teamId: params.teamId, ...body }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Team orchestration failed";
    const status = /authorization|token|revoked|scheme/i.test(message) ? 401 : /team|membership|archived|role/i.test(message) ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
