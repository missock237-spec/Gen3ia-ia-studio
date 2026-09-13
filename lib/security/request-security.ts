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
