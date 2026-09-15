import { getComposio } from "./client";

export type AdsComposioToolkit = "googleads" | "metaads" | "tiktok_ads";

export const ADS_COMPOSIO_TOOLKITS: Record<string, AdsComposioToolkit> = {
  google_ads: "googleads",
  meta_ads: "metaads",
  tiktok_ads: "tiktok_ads",
};

export function getAdsToolkit(provider: string): AdsComposioToolkit {
  const toolkit = ADS_COMPOSIO_TOOLKITS[provider];
  if (!toolkit) throw new Error(`Unsupported Ads provider: ${provider}`);
  return toolkit;
}

export async function authorizeAdsProvider(userId: string, provider: string) {
  if (!userId) throw new Error("userId is required.");
  const toolkit = getAdsToolkit(provider);
  const composio = getComposio();
  return composio.toolkits.authorize(userId, toolkit);
}

export async function listAdsConnections(userId: string) {
  if (!userId) throw new Error("userId is required.");
  const composio = getComposio();
  const result = await composio.connectedAccounts.list({ userIds: [userId] });
  return result.items
    .filter((account) =>
      (Object.values(ADS_COMPOSIO_TOOLKITS) as string[]).includes(
        account.toolkit?.slug ?? "",
      ),
    )
    .map((account) => ({
      id: account.id,
      provider: Object.entries(ADS_COMPOSIO_TOOLKITS).find(
        ([, toolkit]) => toolkit === account.toolkit?.slug,
      )?.[0] ?? "unknown",
      toolkit: account.toolkit?.slug,
      status: account.status,
      enabled: !account.isDisabled,
    }));
}

export async function getAdsTools(userId: string, provider: string) {
  if (!userId) throw new Error("userId is required.");
  const toolkit = getAdsToolkit(provider);
  const composio = getComposio();
  return composio.tools.get(userId, { toolkits: [toolkit] });
}
