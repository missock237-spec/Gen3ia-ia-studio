import { NextResponse } from "next/server";

import { verifyFirebaseAuth } from "@/lib/firebase/auth-server";
import { extensionApiError } from "@/lib/extensions/api";
import { getExtension, listExtensionExecutions } from "@/lib/extensions/repository";

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/extensions/:id/executions — execution logs.
 * The developer sees all executions of their extension; a user only sees
 * their own. Enforced by comparing the authenticated identity to
 * extension.developerId (never trust a query parameter for this).
 */
export async function GET(request: Request, { params }: Params) {
  try {
    const token = await verifyFirebaseAuth(request);
    const { id } = await params;
    const extension = await getExtension(id);
    if (!extension) return NextResponse.json({ error: "Extension introuvable." }, { status: 404 });
    const isDeveloper = extension.developerId === token.uid;
    const url = new URL(request.url);
    const limit = Number(url.searchParams.get("limit") ?? 50);
    const executions = await listExtensionExecutions({
      extensionId: id,
      userId: isDeveloper ? undefined : token.uid,
      limit,
    });
    return NextResponse.json({
      scope: isDeveloper ? "developer" : "user",
      executions: executions.map((entry) => ({
        toolId: entry.toolId,
        ok: entry.ok,
        status: entry.status,
        durationMs: entry.durationMs,
        error: entry.error ?? null,
        userId: isDeveloper ? String(entry.userId ?? "").slice(0, 6) + "…" : undefined,
        createdAt: entry.createdAt,
      })),
    });
  } catch (error) {
    return extensionApiError(error);
  }
}
