import type { DecodedIdToken } from "firebase-admin/auth";

import {
  verifyFirebaseToken as verifyBearerToken,
} from "@/lib/firebase/auth-server";

/**
 * Verifies the Firebase ID token carried by an incoming Request.
 *
 * Route handlers receive a standard `Request`; this helper extracts the
 * Authorization header and delegates to the strict server-side verifier.
 */
export async function verifyFirebaseToken(
  request: Request,
): Promise<DecodedIdToken> {
  return verifyBearerToken(request.headers.get("authorization"));
}
