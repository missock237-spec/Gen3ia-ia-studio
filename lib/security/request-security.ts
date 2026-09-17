import { NextRequest } from "next/server";

const MAX_BODY_BYTES = 2 * 1024 * 1024;

const BLOCKED_HEADERS = [
  "x-forwarded-host",
];

export function validateRequest(
  request: NextRequest,
): void {
  const contentLength =
    request.headers.get("content-length");

  if (contentLength) {
    const size = Number(contentLength);

    if (
      Number.isFinite(size) &&
      size > MAX_BODY_BYTES
    ) {
      throw new Error(
        "Request body too large",
      );
    }
  }

  for (
    const header of BLOCKED_HEADERS
  ) {
    // Cas particulier : derriere un reverse proxy de confiance (Vercel),
    // `x-forwarded-host` est ajoute par la plateforme a CHAQUE requete.
    // On ne le refuse que s'il entre en conflit avec le Host reel de la
    // requete (tentative de spoofing), sinon toute l'API serait bloquee
    // en production. Hors proxy, le blocage strict reste actif.
    if (header === "x-forwarded-host") {
      const forwarded =
        request.headers.get(header);

      const forwardedHost = forwarded
        ?.split(",")[0]
        ?.trim();

      const host =
        request.headers.get("host");

      if (
        forwardedHost &&
        host &&
        forwardedHost !== host
      ) {
        throw new Error(
          `Blocked request header: ${header}`,
        );
      }

      continue;
    }

    if (request.headers.has(header)) {
      throw new Error(
        `Blocked request header: ${header}`,
      );
    }
  }
}

export function securityHeaders(
  headers = new Headers(),
): Headers {
  headers.set(
    "X-Content-Type-Options",
    "nosniff",
  );

  headers.set(
    "X-Frame-Options",
    "DENY",
  );

  headers.set(
    "Referrer-Policy",
    "strict-origin-when-cross-origin",
  );

  headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );

  headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "img-src 'self' data: https:",
      "font-src 'self' https: data:",
      "style-src 'self' 'unsafe-inline'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "connect-src 'self' https:",
      "frame-ancestors 'none'",
    ].join("; "),
  );

  return headers;
}
