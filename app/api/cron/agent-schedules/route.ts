import { NextRequest, NextResponse } from "next/server";

import { dispatchSchedules } from "@/lib/agents/scheduler";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function isAuthorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;

  const authorization = request.headers.get("authorization") ?? "";
  return authorization === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await dispatchSchedules(new Date());
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("Agent schedule dispatcher failed", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Dispatcher failed" },
      { status: 500 },
    );
  }
}
