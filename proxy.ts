import { NextRequest, NextResponse } from "next/server";

import { detectDeviceFromHeaders } from "@/lib/device/detect";

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https:",
  "media-src 'self' blob: https:",
  "connect-src 'self' https: wss:",
  "frame-src 'self' https://accounts.google.com https://*.firebaseapp.com https://*.firebaseio.com",
  "worker-src 'self' blob:",
].join('; ');

export function proxy(request: NextRequest) {
  // Detection automatique d'appareils : le resultat est expose aux pages
  // serveur et aux routes API via les en-tetes x-gen3ia-device-*.
  const device = detectDeviceFromHeaders(request.headers);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-gen3ia-device", device.type);
  requestHeaders.set("x-gen3ia-device-os", device.os);
  requestHeaders.set("x-gen3ia-device-app", device.isDesktopApp ? "desktop-app" : "web");

  const response = NextResponse.next({ request: { headers: requestHeaders } });

  response.headers.set("X-Gen3ia-Device", device.type);
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(self), microphone=(self), geolocation=()");
  response.headers.set("Content-Security-Policy", CONTENT_SECURITY_POLICY);
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  response.headers.set("Cross-Origin-Resource-Policy", "same-origin");
  response.headers.set("X-DNS-Prefetch-Control", "off");

  if (process.env.NODE_ENV === "production") {
    response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
