import { createHash, randomBytes } from "node:crypto";

import { verifyFirebaseToken } from "@/lib/firebase/auth-server";
import {
  createDeveloperApiKey,
  ensureDeveloperProfile,
  getDeveloperApiKey,
} from "./repository";

/**
 * Developer SDK/API keys.
 *
 * Keys look like `g3x_<43 base62 chars>` and authenticate the Developer API
 * (create extensions / versions / submit) from CI or external tooling.
 * Only the sha256 hash is stored; the plaintext is shown exactly once.
 */

const KEY_PREFIX = "g3x_";

export function generateDeveloperApiKey(): { key: string; keyHash: string; prefix: string } {
  const key = `${KEY_PREFIX}${randomBytes(32).toString("base64url")}`;
  return { key, keyHash: hashDeveloperApiKey(key), prefix: `${KEY_PREFIX}${key.slice(4, 10)}` };
}

export function hashDeveloperApiKey(key: string): string {
  return createHash("sha256").update(key.trim()).digest("hex");
}

export interface DeveloperIdentity {
  userId: string;
  via: "firebase" | "api_key";
  displayName: string;
}

/**
 * Authenticates a developer from either:
 * - a Firebase ID token (Developer Studio web UI), or
 * - an SDK API key `Authorization: Bearer g3x_...` (CI / external tools).
 */
export async function authenticateDeveloper(request: Request): Promise<DeveloperIdentity> {
  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";

  if (token.startsWith(KEY_PREFIX)) {
    const record = await getDeveloperApiKey(hashDeveloperApiKey(token));
    if (!record) throw new Error("Invalid or revoked developer API key.");
    const profile = await ensureDeveloperProfile(record.userId, `developer-${record.userId.slice(0, 8)}`);
    return { userId: record.userId, via: "api_key", displayName: profile.displayName };
  }

  const decoded = await verifyFirebaseToken(authorization);
  const displayName =
    (decoded.name && String(decoded.name).slice(0, 80)) ||
    (decoded.email && String(decoded.email).split("@")[0].slice(0, 80)) ||
    `developer-${decoded.uid.slice(0, 8)}`;
  await ensureDeveloperProfile(decoded.uid, displayName);
  return { userId: decoded.uid, via: "firebase", displayName };
}

export async function issueDeveloperApiKey(userId: string, name: string): Promise<{ key: string; prefix: string; name: string }> {
  const { key, keyHash, prefix } = generateDeveloperApiKey();
  await createDeveloperApiKey({ userId, keyHash, prefix, name });
  return { key, prefix, name };
}
