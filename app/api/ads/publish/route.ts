import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { protectRoute } from "@/lib/security/route-guard";
import { getWallet, assertWalletActive } from "@/lib/billing/wallet";
import { billUsage } from "@/lib/billing/media-meter";
import { claimActionExecution, completeAction, failAction } from "@/lib/agents/action-approvals";
import { publishAd } from "@/lib/ads/ad-publisher";

const Schema = z.object({ approvalId: z.string().min(1).max(256) });
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const guard = await protectRoute(request); if (!guard.ok) return guard.response;
  try {
    const { approvalId } = Schema.parse(await request.json());
    const wallet = await getWallet(guard.context.userId); assertWalletActive(wallet);
    const approval = await claimActionExecution(guard.context.userId, approvalId);
    if (approval.toolSlug !== "ads.publish") throw new Error("Approval is not an Ads publishing action.");
    const args = approval.arguments as Record<string, unknown>;
    const provider = args.provider;
    if (provider !== "google_ads" && provider !== "meta_ads" && provider !== "tiktok_ads") throw new Error("Unsupported Ads provider.");
    const result = await publishAd({ userId: guard.context.userId, provider, name: String(args.name), accountId: String(args.accountId), destinationUrl: String(args.destinationUrl), primaryText: String(args.primaryText), headline: String(args.headline), imageUrl: typeof args.imageUrl === "string" ? args.imageUrl : undefined, campaignId: typeof args.campaignId === "string" ? args.campaignId : undefined, adGroupId: typeof args.adGroupId === "string" ? args.adGroupId : undefined, creativeId: typeof args.creativeId === "string" ? args.creativeId : undefined, dailyBudgetMinor: typeof args.dailyBudgetMinor === "number" ? args.dailyBudgetMinor : undefined });
    const billing = await billUsage({ userId: guard.context.userId, executionId: approval.executionId || randomUUID(), kind: "ads_publish", quantity: 1, metadata: { provider, approvalId } });
    await completeAction(guard.context.userId, approvalId, { result, chargeMinor: billing.chargeMinor });
    return NextResponse.json({ ok: true, result, billing: { chargeMinor: billing.chargeMinor } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ads publishing failed";
    const approvalId = (() => { try { return Schema.parse((request as unknown as { body?: unknown }).body).approvalId; } catch { return null; } })();
    if (approvalId) await failAction(guard.context.userId, approvalId, error).catch(() => undefined);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
