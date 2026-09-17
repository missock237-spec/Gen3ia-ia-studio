import { NextResponse } from "next/server";

import { authenticateDeveloper } from "@/lib/extensions/developer-keys";
import { extensionApiError } from "@/lib/extensions/api";
import { listExtensionsByDeveloper } from "@/lib/extensions/repository";

/**
 * GET /api/developer/extensions — Developer Studio list:
 * own extensions with status, versions and aggregate stats.
 */
export async function GET(request: Request) {
  try {
    const developer = await authenticateDeveloper(request);
    const extensions = await listExtensionsByDeveloper(developer.userId);
    return NextResponse.json({
      developer: { userId: developer.userId, displayName: developer.displayName },
      extensions: extensions.map((extension) => ({
        id: extension.id,
        name: extension.name,
        description: extension.description,
        category: extension.category,
        status: extension.status,
        latestVersion: extension.latestVersion,
        approvedVersion: extension.approvedVersion,
        permissions: extension.permissions,
        pricing: extension.pricing,
        stats: extension.stats,
        rating:
          extension.stats.ratingCount > 0
            ? Number((extension.stats.ratingSum / extension.stats.ratingCount).toFixed(2))
            : null,
        updatedAt: extension.updatedAt,
      })),
    });
  } catch (error) {
    return extensionApiError(error);
  }
}
