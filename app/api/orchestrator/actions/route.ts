import { z } from "zod";
import { verifyFirebaseToken } from "@/lib/auth/firebase";
import { executeToolSecurely } from "@/lib/agents/runtime/secure-tool-executor";
import { buildOrchestratorActionPolicy, roleCanUseExternalActions } from "@/lib/agents/orchestrator-actions";

const BodySchema = z.object({
  executionId: z.string().min(1).max(256),
  role: z.enum(["customer_service", "sales", "content", "admin", "analytics"]),
  toolSlug: z.string().min(1).max(256),
  arguments: z.record(z.string(), z.unknown()).default({}),
  confirmed: z.literal(true),
});

export async function POST(request: Request) {
  try {
    const token = await verifyFirebaseToken(request);
    const body = BodySchema.parse(await request.json());

    if (!roleCanUseExternalActions(body.role)) {
      return Response.json({ error: "This agent role cannot execute external actions." }, { status: 403 });
    }

    const policy = buildOrchestratorActionPolicy({
      roles: [body.role],
      allowExternalActions: body.confirmed,
    });

    const output = await executeToolSecurely({
      userId: token.uid,
      executionId: body.executionId,
      toolName: "composio.execute",
      input: {
        toolSlug: body.toolSlug,
        arguments: body.arguments,
      },
      policy,
    });

    return Response.json({ success: true, executionId: body.executionId, output });
  } catch (error) {
    const message = error instanceof Error ? error.message : "External action failed";
    const status = message.includes("authorization") || message.includes("token") ? 401 : 400;
    return Response.json({ error: message }, { status });
  }
}
