import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { verifyFirebaseToken } from "@/lib/firebase/auth-server";
import { createLiveSession } from "@/lib/live/repository";
import { createPairingToken, hashPairingToken } from "@/lib/live/security";
import { LivePermissionSchema } from "@/lib/live/types";

const CreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  objective: z.string().trim().min(1).max(20_000),
  permissions: z.array(LivePermissionSchema).min(1).max(6),
  ttlMs: z.number().int().min(60_000).max(30 * 24 * 60 * 60 * 1000).default(24 * 60 * 60 * 1000),
});

function unauthorized(error: unknown) {
  return NextResponse.json({ error: error instanceof Error ? error.message : "Unauthorized" }, { status: 401 });
}

export async function POST(request: Request) {
  try {
    const token = await verifyFirebaseToken(request.headers.get("authorization"));
    const body = CreateSchema.parse(await request.json());
    const pairingToken = createPairingToken();
    const session = await createLiveSession({
      id: `live_${randomUUID()}`,
      ownerId: token.uid,
      name: body.name,
      objective: body.objective,
      permissions: body.permissions,
      expiresAt: Date.now() + body.ttlMs,
      pairingTokenHash: hashPairingToken(pairingToken),
    });
    return NextResponse.json({ session, pairingToken }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && /authorization|token|revoked|scheme/i.test(error.message)) return unauthorized(error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid request" }, { status: 400 });
  }
}
