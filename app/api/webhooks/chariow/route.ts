import crypto from "node:crypto";
import { getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { adminDb } from "@/lib/firebase/admin";
import { applyTopup, WALLET_CURRENCY } from "@/lib/billing/wallet";
import { settleChariowExtensionPurchase } from "@/lib/extensions/entitlements";

const CREDITABLE_STATUSES = new Set(["completed", "settled"]);

function verifySignature(raw: string, received: string | null): boolean {
  const secret = process.env.CHARIOW_PULSE_SECRET?.trim();
  if (!secret || !received?.startsWith("sha256=")) return false;
  const expected = `sha256=${crypto.createHmac("sha256", secret).update(raw, "utf8").digest("hex")}`;
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/**
 * A sale credits the wallet when it matches the configured top-up product
 * OR when it was created through our own checkout API (tagged with
 * custom_metadata.gen3ia_product = "wallet_topup"). Storefront purchases
 * of unrelated products never touch wallets.
 */
function isTopupSale(payload: any): boolean {
  const configuredProductId = process.env.CHARIOW_TOPUP_PRODUCT_ID?.trim();
  if (configuredProductId && String(payload?.product?.id ?? "") === configuredProductId) {
    return true;
  }
  return String(payload?.sale?.custom_metadata?.gen3ia_product ?? "") === "wallet_topup";
}

export async function POST(request: Request) {
  const raw = await request.text();
  if (!verifySignature(raw, request.headers.get("x-chariow-signature"))) {
    return new Response("Invalid signature", { status: 401 });
  }

  const deliveryId = request.headers.get("x-pulse-delivery-id");
  const event = request.headers.get("x-pulse-event");
  if (!deliveryId) return new Response("Missing delivery id", { status: 400 });

  let payload: any;
  try { payload = JSON.parse(raw); } catch { return new Response("Invalid JSON", { status: 400 }); }
  if (event && event !== "successful.sale" && payload.event !== "successful.sale") {
    return Response.json({ received: true, ignored: true });
  }

  const deliveryRef = adminDb.collection("chariowPulseDeliveries").doc(deliveryId);
  const claimed = await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(deliveryRef);
    if (snap.exists) return false;
    tx.create(deliveryRef, { deliveryId, event: payload.event ?? event ?? null, receivedAt: new Date(), status: "processing" });
    return true;
  });
  if (!claimed) return Response.json({ received: true, duplicate: true });

  try {
    // Extension purchases: the sale carries custom_metadata
    // gen3ia_product = "extension_purchase" + purchaseId. The entitlement is
    // granted here only — the webhook signature is the sole payment proof.
    const metaProduct = String(payload?.sale?.custom_metadata?.gen3ia_product ?? "");
    if (metaProduct === "extension_purchase") {
      const purchaseId = String(payload?.sale?.custom_metadata?.purchaseId ?? "");
      const saleId = String(payload?.sale?.id ?? "");
      if (!purchaseId || !saleId) throw new Error("Extension purchase payload is missing purchaseId or saleId.");
      const result = await settleChariowExtensionPurchase({ purchaseId, providerRef: `chariow:${saleId}` });
      await deliveryRef.update({ status: "processed", kind: "extension_purchase", purchaseId, saleId, granted: result.granted, processedAt: new Date() });
      return Response.json({ received: true, kind: "extension_purchase", granted: result.granted });
    }

    if (!isTopupSale(payload)) {
      await deliveryRef.update({ status: "ignored", reason: "not_a_wallet_topup_sale", processedAt: new Date() });
      return Response.json({ received: true, ignored: true });
    }

    const customerEmail = String(payload.customer?.email ?? "").trim().toLowerCase();
    const amount = Number(payload.sale?.amount?.value);
    const currency = String(payload.sale?.amount?.currency ?? "").toUpperCase();
    const saleId = String(payload.sale?.id ?? "");
    const saleStatus = String(payload.sale?.status ?? "completed").toLowerCase();
    if (!customerEmail || !saleId || !Number.isFinite(amount) || amount <= 0) {
      throw new Error("Chariow successful sale payload is missing required wallet fields.");
    }
    if (!CREDITABLE_STATUSES.has(saleStatus)) {
      throw new Error(`Sale status ${saleStatus} is not creditable.`);
    }
    if (currency !== WALLET_CURRENCY) {
      throw new Error(`Top-up currency ${currency} does not match wallet currency ${WALLET_CURRENCY}.`);
    }

    let user;
    try {
      user = await getAuth(getApps()[0]!).getUserByEmail(customerEmail);
    } catch {
      // Permanent condition: no point asking Chariow to retry for hours.
      await deliveryRef.update({
        status: "failed",
        reason: "firebase_user_not_found",
        customerEmail,
        saleId,
        failedAt: new Date(),
      });
      return Response.json({ received: true, credited: false, reason: "user_not_found" });
    }

    const amountMinor = Math.round(amount * 100);
    const wallet = await applyTopup({
      userId: user.uid,
      amountMinor,
      currency,
      providerReference: saleId,
      metadata: {
        customerEmail,
        productId: String(payload.product?.id ?? ""),
        source: "pulse_webhook",
      },
    });
    await deliveryRef.update({ status: "processed", userId: user.uid, saleId, amountMinor, processedAt: new Date() });
    return Response.json({ received: true, credited: true, wallet });
  } catch (error) {
    await deliveryRef.update({ status: "failed", error: error instanceof Error ? error.message.slice(0, 1000) : "Wallet credit failed", failedAt: new Date() });
    return new Response("Webhook processing failed", { status: 500 });
  }
}
