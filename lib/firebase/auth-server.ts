import { createPublicKey, createVerify, type KeyObject } from "node:crypto";

import type { DecodedIdToken } from "firebase-admin/auth";

/**
 * Vérification serveur des Firebase ID tokens SANS clé de service account.
 *
 * Implémente la procédure officielle documentée par Google pour vérifier un
 * ID token avec une librairie JWT tierce :
 * https://firebase.google.com/docs/auth/admin/verify-id-tokens#verify_id_tokens_using_a_third-party_jwt_library
 *
 * Le token est signé (RS256) par le service `securetoken@system.gserviceaccount.com`
 * ; la clé publique est publiée par Google (URL ci-dessous). On vérifie :
 *   - la signature contre la clé publique correspondant au `kid` du header ;
 *   - `iss` = https://securetoken.google.com/<projet> ;
 *   - `aud` = <projet> (le projet du CLIENT, cf. NEXT_PUBLIC_FIREBASE_PROJECT_ID) ;
 *   - exp / iat / auth_time ; `sub` non vide.
 *
 * Différence connue avec l'Admin SDK (`verifyIdToken(token, true)`) : la
 * révocation en temps réel (compte désactivé / refresh token révoqué) ne peut
 * pas être consultée sans credential admin. Les ID tokens restent limités à
 * 1 h — le compromis est acceptable et permet à l'authentification de
 * fonctionner indépendamment du projet de la clé admin.
 */

const GOOGLE_CERTS_URL =
  "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";

interface TokenHeader {
  alg: string;
  typ?: string;
  kid?: string;
}

interface TokenPayload {
  iss?: string;
  aud?: string | string[];
  sub?: string;
  exp?: number;
  iat?: number;
  auth_time?: number;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
  phone_number?: string;
  firebase?: {
    identities?: Record<string, unknown>;
    sign_in_provider?: string;
    tenant?: string;
  };
  [key: string]: unknown;
}

let certCache: {
  keys: Record<string, KeyObject>;
  fetchedAt: number;
  maxAgeMs: number;
} | undefined;

async function fetchGooglePublicKeys(
  force = false,
): Promise<Record<string, KeyObject>> {
  if (
    !force &&
    certCache &&
    Date.now() < certCache.fetchedAt + certCache.maxAgeMs
  ) {
    return certCache.keys;
  }

  const response = await fetch(GOOGLE_CERTS_URL, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(
      `Impossible de récupérer les certificats publics Google (HTTP ${response.status}).`
    );
  }

  const cacheControl = response.headers.get("cache-control") ?? "";
  const maxAgeSeconds = Number(/max-age=(\d+)/.exec(cacheControl)?.[1] ?? 3600);
  const certificates =
    (await response.json()) as Record<string, string>;

  const keys: Record<string, KeyObject> = {};

  for (const [kid, pem] of Object.entries(certificates)) {
    keys[kid] = createPublicKey(pem);
  }

  certCache = {
    keys,
    fetchedAt: Date.now(),
    maxAgeMs: Math.max(60, maxAgeSeconds) * 1000,
  };

  return keys;
}

function decodeSegment(segment: string): unknown {
  const json = Buffer.from(segment, "base64url").toString("utf8");
  return JSON.parse(json);
}

/**
 * Projet Firebase attendu côté serveur : celui du SDK CLIENT (c'est lui qui
 * émet les tokens présentés aux API). NEXT_PUBLIC_FIREBASE_PROJECT_ID est la
 * source de vérité ; FIREBASE_PROJECT_ID sert de repli.
 */
function expectedProjectId(): string {
  return (
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() ||
    process.env.FIREBASE_PROJECT_ID?.trim() ||
    ""
  );
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
    const projectId = expectedProjectId();

    if (!projectId) {
      throw new Error(
        "Firebase project id is not configured (NEXT_PUBLIC_FIREBASE_PROJECT_ID)."
      );
    }

    const segments = token.split(".");

    if (segments.length !== 3) {
      throw new Error("Malformed JWT.");
    }

    const header = decodeSegment(segments[0]!) as TokenHeader;
    const payload = decodeSegment(segments[1]!) as TokenPayload;
    const signature = Buffer.from(segments[2]!, "base64url");

    if (header.alg !== "RS256") {
      throw new Error(`Unexpected JWT alg: ${String(header.alg)}.`);
    }

    const kid = header.kid;

    if (!kid) {
      throw new Error("Missing JWT kid.");
    }

    // Vérification des claims temporels AVANT la signature (échec rapide).
    const now = Math.floor(Date.now() / 1000);

    if (typeof payload.exp !== "number" || payload.exp <= now) {
      throw new Error("Token expired.");
    }

    if (typeof payload.iat !== "number" || payload.iat > now + 300) {
      throw new Error("Token issued in the future.");
    }

    if (
      typeof payload.auth_time === "number" &&
      payload.auth_time > now + 300
    ) {
      throw new Error("Token auth_time in the future.");
    }

    if (typeof payload.sub !== "string" || payload.sub.length === 0) {
      throw new Error("Token subject is empty.");
    }

    if (payload.iss !== `https://securetoken.google.com/${projectId}`) {
      throw new Error(`Token issuer mismatch: ${String(payload.iss)}.`);
    }

    if (payload.aud !== projectId) {
      throw new Error(`Token audience mismatch: ${String(payload.aud)}.`);
    }

    // Vérification de la signature. Si le `kid` est inconnu (rotation des
    // certificats Google), on re-téléforce la liste avant d'échouer.
    let keys = await fetchGooglePublicKeys();
    let publicKey = keys[kid];

    if (!publicKey) {
      keys = await fetchGooglePublicKeys(true);
      publicKey = keys[kid];
    }

    if (!publicKey) {
      throw new Error(`Unknown JWT kid: ${kid}.`);
    }

    const signatureValid = createVerify("RSA-SHA256")
      .update(`${segments[0]}.${segments[1]}`)
      .verify(publicKey, signature);

    if (!signatureValid) {
      throw new Error("Invalid JWT signature.");
    }

    const decoded = {
      ...payload,
      uid: payload.sub,
      firebase: {
        identities: payload.firebase?.identities ?? {},
        sign_in_provider: payload.firebase?.sign_in_provider ?? "unknown",
        ...(payload.firebase?.tenant
          ? { tenant: payload.firebase.tenant }
          : {}),
      },
    } as unknown as DecodedIdToken;

    return decoded;
  } catch (error) {
    const cause = error instanceof Error ? error.message : String(error);
    console.warn("[auth-server] ID token verification failed:", cause);
    throw new Error(`Invalid or revoked Firebase ID token. [cause: ${cause}]`);
  }
}
