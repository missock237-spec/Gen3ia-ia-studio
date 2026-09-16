import { NextRequest, NextResponse } from "next/server";

import {
  requireUser,
} from "@/lib/security/authenticated-request";

import {
  listUserArtifacts,
} from "@/lib/documents/repository";

export async function GET(
  request: NextRequest,
) {
  try {
    const user =
      await requireUser(request);

    const projectId =
      request.nextUrl.searchParams
        .get("projectId") ??
      undefined;

    const artifacts =
      await listUserArtifacts(
        user.uid,
        projectId,
      );

    return NextResponse.json({
      success: true,
      artifacts,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Unable to list artifacts.",
      },
      {
        status: 400,
      },
    );
  }
}
