import { NextResponse } from "next/server";

import { verifyFirebaseToken } from "@/lib/firebase/auth-server";
import { extensionApiError } from "@/lib/extensions/api";
import {
  getExtension,
  getInstallation,
  getLatestApprovedVersion,
  installExtension,
  uninstallExtension,
} from "@/lib/extensions/repository";
import { purchaseWithWallet, startChariowPurchase } from "@/lib/extensions/entitlements";

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/extensions/:id/install — install (or buy then install).
 * Body (optional): { provider?: "wallet" | "chariow", email?, redirectUrl? }
 *
 * Free extensions install immediately with a consent snapshot of permissions.
 * Paid extensions REQUIRE a valid entitlement; without one the route starts a
 * wallet purchase (default) or a Chariow checkout, and the entitlement is only
 * created by wallet settlement or the verified Pulse webhook — never by the UI.
 */
export async function POST(request: Request, { params }: Params) {
  try {
    const token = await verifyFirebaseToken(request.headers.get("authorization"));
    const { id } = await params;
    const extension = await getExtension(id);
    if (!extension) return NextResponse.json({ error: "Extension introuvable." }, { status: 404 });
    if (extension.status !== "approved") {
      return NextResponse.json({ error: "Cette extension n'est pas disponible à l'installation." }, { status: 400 });
    }
    const version = await getLatestApprovedVersion(id);
    if (!version) return NextResponse.json({ error: "Aucune version approuvée." }, { status: 400 });

    const body = (await request.json().catch(() => ({}))) as {
      provider?: string;
      email?: string;
      redirectUrl?: string;
    };

    const pricing = version.manifest.pricing;
    if (pricing.model !== "free") {
      const existing = await getInstallation(id, token.uid);
      const alreadyActive = existing?.status === "active";
      const entitlementInstalled = await hasActiveEntitlement(id, token.uid);
      if (!alreadyActive && !entitlementInstalled) {
        if (body.provider === "chariow") {
          const checkout = await startChariowPurchase({
            userId: token.uid,
            extension,
            email: body.email ?? `${token.uid}@gen3ia.placeholder`,
            redirectUrl: body.redirectUrl ?? "https://gen3ia.online/marketplace",
          });
          return NextResponse.json({ status: "checkout_required", checkoutUrl: checkout.checkoutUrl, purchaseId: checkout.purchaseId }, { status: 202 });
        }
        const purchase = await purchaseWithWallet({
          userId: token.uid,
          extension,
          reference: `ext_${id}_${token.uid.slice(0, 8)}_${Date.now()}`,
        });
        return NextResponse.json({ status: "purchased", purchaseId: purchase.purchaseId, message: purchase.message });
      }
    }

    const installation = await installExtension({
      userId: token.uid,
      extension,
      version: version.version,
      permissionsGranted: version.manifest.permissions,
      settings: Object.fromEntries((version.manifest.settings ?? []).map((setting) => [setting.key, setting.default])),
    });
    return NextResponse.json({
      installation: { extensionId: installation.extensionId, version: installation.version, status: installation.status },
      permissionsGranted: installation.permissionsGranted,
    });
  } catch (error) {
    return extensionApiError(error);
  }
}

/** DELETE /api/extensions/:id/install — uninstall (soft delete + counter). */
export async function DELETE(request: Request, { params }: Params) {
  try {
    const token = await verifyFirebaseToken(request.headers.get("authorization"));
    const { id } = await params;
    await uninstallExtension(id, token.uid);
    return NextResponse.json({ ok: true, status: "uninstalled" });
  } catch (error) {
    return extensionApiError(error);
  }
}

async function hasActiveEntitlement(extensionId: string, userId: string): Promise<boolean> {
  try {
    const { getEntitlement } = await import("@/lib/extensions/repository");
    const entitlement = await getEntitlement(extensionId, userId);
    return Boolean(entitlement && entitlement.status === "active");
  } catch {
    return false;
  }
}
