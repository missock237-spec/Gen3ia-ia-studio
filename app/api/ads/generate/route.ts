import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { protectRoute } from "@/lib/security/route-guard";
import { generateForUser } from "@/lib/billing/ai-execution";
import { createActionApproval } from "@/lib/agents/action-approvals";

const Schema = z.object({ objective: z.string().min(10).max(4000), provider: z.enum(["google_ads", "meta_ads", "tiktok_ads"]), accountId: z.string().min(1).max(200), destinationUrl: z.string().url(), audience: z.string().max(2000).optional(), budgetMinor: z.number().int().positive().max(100000000).optional() });
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const guard = await protectRoute(request); if (!guard.ok) return guard.response;
  try {
    const input = Schema.parse(await request.json()); const executionId = randomUUID();
    const generated = await generateForUser({ userId: guard.context.userId, executionId, complexity: 1.35, request: { task: "agent", maxTokens: 2048, requiresStructuredOutput: true, messages: [{ role: "system", content: "You are Gen3ia Ads Agent. Create compliant advertising copy and a campaign proposal. Never invent product claims, prices, guarantees, targeting eligibility or platform approval. Return strict JSON with name, primaryText, headline, callToAction and riskNotes. Do not publish anything." }, { role: "user", content: JSON.stringify(input) }] } });
    const parsed = JSON.parse(generated.response.text) as Record<string, unknown>;
    const approval = await createActionApproval({ ownerId: guard.context.userId, executionId, role: "content", toolSlug: "ads.publish", arguments: { provider: input.provider, accountId: input.accountId, destinationUrl: input.destinationUrl, name: String(parsed.name ?? "Gen3ia campaign"), primaryText: String(parsed.primaryText ?? ""), headline: String(parsed.headline ?? ""), callToAction: String(parsed.callToAction ?? "LEARN_MORE"), dailyBudgetMinor: input.budgetMinor ?? 1000 }, reason: `Publication Ads demandée par l'agent pour: ${input.objective}` });
    return NextResponse.json({ executionId, proposal: parsed, approvalId: approval.id, requiresHumanApproval: true });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Ad generation failed" }, { status: 400 }); }
}
