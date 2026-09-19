import { NextResponse } from "next/server";

import { requireCodeAgentOwner } from "@/lib/agents/code-agent-guard";
import { listAgentsByOwner } from "@/lib/agents/repository";

/** Verifie l'acces a l'Atelier d'Interfaces (reserve aux agents de code actifs). */
export async function GET(request: Request) {
  const guard = await requireCodeAgentOwner(request);
  if ("forbidden" in guard) {
    const body = (await guard.forbidden.json()) as { error?: string; code?: string };
    return NextResponse.json(
      { access: false, reason: body.code ?? "UNAUTHENTICATED", message: body.error ?? "Acces refuse" },
      { status: 200 },
    );
  }

  const agents = await listAgentsByOwner(guard.user.uid);
  const codeAgents = agents.filter((agent) => agent.type === "code");
  return NextResponse.json({
    access: true,
    codeAgents: codeAgents.map((agent) => ({ id: agent.id, name: agent.name, status: agent.status })),
  });
}
