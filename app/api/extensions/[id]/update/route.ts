import { NextResponse } from "next/server";

import { verifyFirebaseToken } from "@/lib/firebase/auth-server";
import { extensionApiError } from "@/lib/extensions/api";
import { getInstallation, getLatestApprovedVersion, updateInstallationVersion } from "@/lib/extensions/repository";
import { compareSemver } from "@/lib/extensions/manifest";

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/extensions/:id/update — upgrade an installed extension to the
 * latest approved version. The permission snapshot is refreshed to the new
 * manifest permissions (re-consent happens client-side via the fiche page).
 */
export async function POST(request: Request, { params }: Params) {
  try {
    const token = await verifyFirebaseToken(request.headers.get("authorization"));
    const { id } = await params;
    const installation = await getInstallation(id, token.uid);
    if (!installation || installation.status !== "active") {
      return NextResponse.json({ error: "Cette extension n'est pas installée." }, { status: 400 });
    }
    const latest = await getLatestApprovedVersion(id);
    if (!latest) return NextResponse.json({ error: "Aucune version approuvée." }, { status: 400 });
    if (compareSemver(installation.version, latest.version) >= 0) {
      return NextResponse.json({ status: "up_to_date", version: installation.version });
    }
    const updated = await updateInstallationVersion(id, token.uid, installation.version);
    return NextResponse.json({
      status: "updated",
      version: updated.version,
      permissionsGranted: updated.permissionsGranted,
    });
  } catch (error) {
    return extensionApiError(error);
  }
}
