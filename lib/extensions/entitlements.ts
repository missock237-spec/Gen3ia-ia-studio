import { randomBytes } from "node:crypto";

import {
  reserveFunds,
  settleReservation,
  WALLET_CURRENCY,
  getWallet,
} from "@/lib/billing/wallet";
import { createChariowExtensionCheckout, getChariowStoreUrl } from "@/lib/billing/chariow";
import type { ExtensionDoc, PurchaseDoc } from "./repository";
import {
  createExtensionPurchase,
  createLicense,
  getEntitlement,
  getExtension,
  markPurchasePaid,
  upsertEntitlement,
} from "./repository";
import { canUseExtension, subscriptionExpiry, type PricingInfo } from "./pricing";
import { getLatestApprovedVersion } from "./repository";

/**
 * Extension billing (server-side only).
 *
 * The frontend is NEVER treated as proof of payment:
 * - free extensions install directly (entitlement source "free");
 * - paid extensions require an entitlement created either by a wallet
 *   settlement (immediate) or by the verified Chariow Pulse webhook;
 * - subscriptions get an expiry and must be renewed (re-payment extends it).
 */

export interface PurchaseStartResult {
  mode: "wallet" | "chariow";
  purchaseId: string;
  checkoutUrl?: string;
  message?: string;
}

/** True when the user may use the extension right now. */
export async function assertExtensionUsable(userId: string, extension: ExtensionDoc): Promise<void> {
  const pricing: PricingInfo = extension.pricing as PricingInfo;
  const entitlement = await getEntitlement(extension.id, userId);
  const decision = canUseExtension(pricing, entitlement);
  if (!decision.allowed) throw new Error(decision.reason ?? "This extension is not usable.");
}

/** Grants (or refreshes) the entitlement that unlocks an extension. */
export async function grantEntitlement(params: {
  userId: string;
  extension: ExtensionDoc;
  source: "free" | "purchase" | "subscription" | "grant";
  purchaseId?: string | null;
}): Promise<void> {
  const pricing = params.extension.pricing as PricingInfo;
  const expiresAt =
    pricing.model === "subscription" && pricing.interval ? subscriptionExpiry(pricing.interval) : null;
  await upsertEntitlement({
    extensionId: params.extension.id,
    userId: params.userId,
    source: params.source,
    purchaseId: params.purchaseId ?? null,
    expiresAt,
  });
}

function licenseKey(): string {
  return `g3lic_${randomBytes(24).toString("base64url")}`;
}

/**
 * Purchases a paid extension with the Gen3ia wallet (Chariow-funded balance).
 * Reserves, charges, creates purchase + entitlement + license + revenue entry.
 */
export async function purchaseWithWallet(params: {
  userId: string;
  extension: ExtensionDoc;
  reference: string;
}): Promise<PurchaseStartResult> {
  const pricing = params.extension.pricing as PricingInfo;
  if (pricing.model === "free") throw new Error("This extension is free — install it directly.");
  if (pricing.model !== "one_time" && pricing.model !== "subscription") {
    throw new Error("Usage-based extensions are charged per execution, not purchased upfront.");
  }
  const amountMinor = pricing.amountMinor ?? 0;
  if (amountMinor <= 0) throw new Error("Invalid extension price.");

  await getWallet(params.userId);
  const purchase = await createExtensionPurchase({
    userId: params.userId,
    extensionId: params.extension.id,
    provider: "wallet",
    amountMinor,
    currency: pricing.currency ?? WALLET_CURRENCY,
    kind: pricing.model === "subscription" ? "subscription" : "one_time",
  });

  try {
    await reserveFunds({
      userId: params.userId,
      amountMinor,
      reference: params.reference,
      metadata: { kind: "extension_purchase", extensionId: params.extension.id, purchaseId: purchase.id },
    });
    await settleReservation({
      userId: params.userId,
      reference: params.reference,
      reservedMinor: amountMinor,
      actualChargeMinor: amountMinor,
      metadata: { kind: "extension_purchase", extensionId: params.extension.id, purchaseId: purchase.id },
    });
  } catch (error) {
    await adminUpdatePurchaseFailed(purchase.id, error instanceof Error ? error.message : "wallet_error");
    throw error;
  }

  await markPurchasePaid(purchase.id, `wallet:${params.reference}`);
  await grantEntitlement({
    userId: params.userId,
    extension: params.extension,
    source: pricing.model === "subscription" ? "subscription" : "purchase",
    purchaseId: purchase.id,
  });
  await createLicense({
    purchaseId: purchase.id,
    userId: params.userId,
    extensionId: params.extension.id,
    licenseKey: licenseKey(),
    expiresAt: pricing.model === "subscription" && pricing.interval ? subscriptionExpiry(pricing.interval) : null,
  });
  return { mode: "wallet", purchaseId: purchase.id, message: "Paiement effectué via le wallet Gen3ia." };
}

async function adminUpdatePurchaseFailed(purchaseId: string, reason: string): Promise<void> {
  const { adminDb } = await import("@/lib/firebase/admin");
  await adminDb.collection("extensionPurchases").doc(purchaseId).update({
    status: "failed",
    providerRef: `failed:${reason.slice(0, 200)}`,
    paidAt: null,
  }).catch(() => undefined);
}

/**
 * Starts a Chariow checkout for an extension purchase (external payment).
 * The entitlement is granted ONLY by the verified Pulse webhook.
 */
export async function startChariowPurchase(params: {
  userId: string;
  extension: ExtensionDoc;
  email: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  countryCode?: string;
  redirectUrl: string;
  customerIp?: string;
}): Promise<PurchaseStartResult> {
  const productId = process.env.CHARIOW_EXT_PRODUCT_ID?.trim();
  if (!productId) {
    throw new Error("Achat direct Chariow non configuré pour les extensions — utilisez le wallet Gen3ia.");
  }
  const pricing = params.extension.pricing as PricingInfo;
  if (pricing.model !== "one_time" && pricing.model !== "subscription") {
    throw new Error("Ce modèle de tarification n'est pas achetable à l'unité.");
  }
  const purchase = await createExtensionPurchase({
    userId: params.userId,
    extensionId: params.extension.id,
    provider: "chariow",
    amountMinor: pricing.amountMinor ?? 0,
    currency: pricing.currency ?? WALLET_CURRENCY,
    kind: pricing.model === "subscription" ? "subscription" : "one_time",
  });
  const storeUrl = getChariowStoreUrl();
  const redirectUrl = params.redirectUrl || storeUrl || "https://gen3ia.online/marketplace";
  const checkout = await createChariowExtensionCheckout({
    productId,
    email: params.email,
    firstName: params.firstName ?? "Gen3ia",
    lastName: params.lastName ?? "User",
    phoneNumber: params.phoneNumber ?? "00000000",
    countryCode: params.countryCode ?? "CM",
    redirectUrl,
    customerIp: params.customerIp,
    metadata: { purchaseId: purchase.id, userId: params.userId, extensionId: params.extension.id },
  });
  if (!checkout.checkoutUrl) {
    throw new Error(checkout.message ?? "Chariow n'a pas retourné d'URL de paiement.");
  }
  return { mode: "chariow", purchaseId: purchase.id, checkoutUrl: checkout.checkoutUrl };
}

/**
 * Webhook-side entitlement grant. Idempotent: replayed sales are ignored.
 */
export async function settleChariowExtensionPurchase(params: {
  purchaseId: string;
  providerRef: string;
}): Promise<{ granted: boolean }> {
  const { getExtensionPurchase } = await import("./repository");
  const purchase = await getExtensionPurchase(params.purchaseId);
  if (!purchase) throw new Error("Unknown extension purchase reference.");
  if (purchase.status === "paid") return { granted: false };
  const extension = await getExtension(purchase.extensionId);
  if (!extension) throw new Error("Extension no longer exists.");
  await markPurchasePaid(purchase.id, params.providerRef);
  await grantEntitlement({
    userId: purchase.userId,
    extension,
    source: purchase.kind === "subscription" ? "subscription" : "purchase",
    purchaseId: purchase.id,
  });
  await createLicense({
    purchaseId: purchase.id,
    userId: purchase.userId,
    extensionId: purchase.extensionId,
    licenseKey: licenseKey(),
    expiresAt: purchase.kind === "subscription" ? subscriptionExpiry("month") : null,
  });
  return { granted: true };
}
