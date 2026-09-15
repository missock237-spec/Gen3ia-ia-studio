import { verifyFirebaseToken } from "@/lib/auth/firebase";
import { activateEmergencyStop, clearEmergencyStop, type StopScope } from "@/lib/security/emergency-stop";

function parseScope(value: unknown): StopScope {
  if (value === undefined) return "user";
  if (value !== "user" && value !== "agent" && value !== "execution") throw new Error("scope must be user, agent, or execution");
  return value;
}

export async function POST(request: Request) {
  try {
    const token = await verifyFirebaseToken(request);
    const body = await request.json().catch(() => ({}));
    const scope = parseScope(body.scope);
    await activateEmergencyStop({ userId: token.uid, scope, agentId: typeof body.agentId === "string" ? body.agentId : undefined, executionId: typeof body.executionId === "string" ? body.executionId : undefined, reason: typeof body.reason === "string" ? body.reason : undefined });
    return Response.json({ success: true, stopped: true, scope });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not activate emergency stop";
    const status = message.includes("authorization") || message.includes("token") ? 401 : 400;
    return Response.json({ error: message }, { status });
  }
}

export async function DELETE(request: Request) {
  try {
    const token = await verifyFirebaseToken(request);
    const body = await request.json().catch(() => ({}));
    const scope = parseScope(body.scope);
    await clearEmergencyStop({ userId: token.uid, scope, agentId: typeof body.agentId === "string" ? body.agentId : undefined, executionId: typeof body.executionId === "string" ? body.executionId : undefined });
    return Response.json({ success: true, stopped: false, scope });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not clear emergency stop";
    const status = message.includes("authorization") || message.includes("token") ? 401 : 409;
    return Response.json({ error: message }, { status });
  }
}
