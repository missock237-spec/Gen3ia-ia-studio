import { DecodedIdToken } from "firebase-admin/auth";
import { getAuth } from "firebase-admin/auth";

import "./admin";

const adminAuth = getAuth();

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
    return await adminAuth.verifyIdToken(token, true);
  } catch {
    throw new Error("Invalid or revoked Firebase ID token.");
  }
}
