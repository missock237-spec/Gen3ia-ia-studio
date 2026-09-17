import { NextResponse } from "next/server";

/**
 * Shared error mapping for the Extension Platform API.
 * Authentication/authorization failures map to 401/403, validation and
 * business-rule failures to 400/404, everything else to 500.
 */
export function extensionApiError(error: unknown): NextResponse {
  const message = error instanceof Error ? error.message : "Invalid request.";
  if (/authorization|token|revoked|scheme|API key|api key/i.test(message)) {
    return NextResponse.json({ error: message }, { status: 401 });
  }
  if (/Only the developer|Administrator|not the owner/i.test(message)) {
    return NextResponse.json({ error: message }, { status: 403 });
  }
  if (/not found|not found\.|does not exist|not installed/i.test(message)) {
    return NextResponse.json({ error: message }, { status: 404 });
  }
  if (/already exists|Invalid|invalid|required|must |exceeds|not allowed|denied|quota|rate limit|expired|requires a purchase|not active|not available|not configured/i.test(message)) {
    return NextResponse.json({ error: message }, { status: 400 });
  }
  return NextResponse.json({ error: message }, { status: 500 });
}
