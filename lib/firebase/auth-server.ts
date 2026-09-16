import { DecodedIdToken } from "firebase-admin/auth";
import { getAuth } from "firebase-admin/auth";

import { getAdminApp } from "./admin";

/**
 * Lazily resolved Admin Auth instance: `getAuth()` is only called on first
 * use so importing this module never initializes Firebase Admin.
 */
let cachedAuth: ReturnType<typeof getAuth> | undefined;

function getAdminAuth() {
  if (!cachedAuth) {
    cachedAuth = getAuth(getAdminApp());
  }
  return cachedAuth;
}

export async function verifyFirebaseToken(
  authorizationHeader: string | null
): Promise<DecodedIdToken> {
  if (!authorizationHeader) {
    throw new Error("Missing authorization header.");
  }

  if (!authorizationHeader.startsWith("Bearer ")) {
    throw new Error("Invalid authorization scheme.");
  }

  const token = authorizationHeader.slice(7).trim();

  if (!token) {
    throw new Error("Missing Firebase ID token.");
  }

  try {
    return await getAdminAuth().verifyIdToken(token, true);
  } catch {
    throw new Error("Invalid or revoked Firebase ID token.");
  }
}
