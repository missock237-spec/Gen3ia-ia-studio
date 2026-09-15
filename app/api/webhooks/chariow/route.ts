import crypto from "node:crypto";
import { getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { adminDb } from "@/lib/firebase/admin";
import { applyTopup, WALLET_CURRENCY } from "@/lib/billing/wallet";

function verifySignature(raw: string, received: string | null): boolean {
  const secret = process.env.CHARIOW_PULSE_SECRET?.trim();
  if (!secret || !received?.startsWith("sha256=")) return false;
  const expected = `sha256=${crypto.createHmac("sha256", secret).update(raw, "utf8").digest("hex")}`;
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  const raw = await request.text();
  if (!verifySignature(raw, request.headers.get("x-chariow-signature"))) return new Response("Invalid signature", { status: 401 });

  const deliveryId = request.headers.get("x-pulse-delivery-id");
  const event = request.headers.get("x-pulse-event");
  if (!deliveryId) return new Response("Missing delivery id", { status: 400 });

  let payload: any;
  try { payload = JSON.parse(raw); } catch { return new Response("Invalid JSON", { status: 400 }); }
  if (event && event !== "successful.sale" && payload.event !== "successful.sale") return Response.json({ received: true, ignored: true });

  const deliveryRef = adminDb.collection("chariowPulseDeliveries").doc(deliveryId);
  const claimed = await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(deliveryRef);
    if (snap.exists) return false;
    tx.create(deliveryRef, { deliveryId, event: payload.event ?? event ?? null, receivedAt: new Date(), status: "processing" });
    return true;
  });
  if (!claimed) return Response.json({ received: true, duplicate: true });

  try {
    const productId = String(payload.product?.id ?? "");
    const configuredProductId = process.env.CHARIOW_TOPUP_PRODUCT_ID?.trim();
    if (!configuredProductId) throw new Error("CHARIOW_TOPUP_PRODUCT_ID is not configured.");
    if (productId !== configuredProductId) {
      await deliveryRef.update({ status: "ignored", reason: "not_gen3ia_topup_product", processedAt: new Date() });
      return Response.json({ received: true, ignored: true });
    }

    const customerEmail = String(payload.customer?.email ?? "").trim().toLowerCase();
    const amount = Number(payload.sale?.amount?.value);
    const currency = String(payload.sale?.amount?.currency ?? "").toUpperCase();
    const saleId = String(payload.sale?.id ?? "");
    if (!customerEmail || !saleId || !Number.isFinite(amount) || amount <= 0) throw new Error("Chariow successful sale payload is missing required wallet fields.");
    if (currency !== WALLET_CURRENCY) throw new Error(`Top-up currency ${currency} does not match wallet currency ${WALLET_CURRENCY}.`);

    const user = await getAuth(getApps()[0]!).getUserByEmail(customerEmail);
    const amountMinor = Math.round(amount * 100);
    const wallet = await applyTopup({ userId: user.uid, amountMinor, currency, providerReference: saleId, metadata: { customerEmail, productId } });
    await deliveryRef.update({ status: "processed", userId: user.uid, saleId, amountMinor, processedAt: new Date() });
    return Response.json({ received: true, credited: true, wallet });
  } catch (error) {
    await deliveryRef.update({ status: "failed", error: error instanceof Error ? error.message.slice(0, 1000) : "Wallet credit failed", failedAt: new Date() });
    return new Response("Webhook processing failed", { status: 500 });
  }
}
