import { NextRequest, NextResponse } from "next/server";

import {
  verifyFirebaseToken
} from "@/lib/firebase/auth-server";

import {
  ensureUserProfile
} from "@/lib/firebase/users";

export async function POST(
  request: NextRequest
) {
  try {
    const token =
      await verifyFirebaseToken(
        request.headers.get("authorization")
      );

    const provider =
      token.firebase?.sign_in_provider ||
      "unknown";

    await ensureUserProfile({
      uid: token.uid,
      email: token.email,
      displayName:
        token.name,
      photoURL:
        token.picture,
      provider
    });

    return NextResponse.json({
      authenticated: true,
      user: {
        uid: token.uid,
        email: token.email ?? null,
        name: token.name ?? null,
        picture:
          token.picture ?? null
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        authenticated: false,
        error:
          error instanceof Error
            ? error.message
            : "Authentication failed."
      },
      {
        status: 401
      }
    );
  }
}
