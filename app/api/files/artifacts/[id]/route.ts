import { NextRequest, NextResponse } from "next/server";

import { protectRoute } from "@/lib/security/route-guard";
import { getArtifactDownloadUrl } from "@/lib/documents/artifact-store";

import { removeArtifact } from "@/lib/documents/artifact-store";

export async function DELETE(
  request: NextRequest,
  context: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  const guard = await protectRoute(request);

  if (!guard.ok) {
    return guard.response;
  }

  try {
    const { id } = await context.params;

    await removeArtifact(
      id,
      guard.context.userId,
    );

    return NextResponse.json({
      success: true,
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Artifact not found",
      },
      {
        status: 404,
      },
    );
  }
}
export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  context: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  const guard = await protectRoute(request);

  if (!guard.ok) {
    return guard.response;
  }

  try {
    const { id } = await context.params;

    const url = await getArtifactDownloadUrl(
      id,
      guard.context.userId,
    );

    return NextResponse.json({
      success: true,
      url,
      expiresIn: 300,
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Artifact not found",
      },
      {
        status: 404,
      },
    );
  }
}
