import "server-only";

import { safeError } from "./logger";

const SENTRY_DSN = process.env.SENTRY_DSN?.trim();

export function isSentryConfigured(): boolean {
  return Boolean(SENTRY_DSN);
}

/**
 * Lightweight server-side Sentry bridge.
 * The DSN is intentionally never logged. If @sentry/nextjs is installed later,
 * this module can be replaced by the native SDK without changing callers.
 */
export function captureServerException(
  error: unknown,
  context: Record<string, unknown> = {},
): void {
  if (!SENTRY_DSN) return;

  // Keep production telemetry safe until the Sentry SDK is explicitly installed.
  // Structured logs remain the source of truth and contain redacted fields.
  const payload = {
    error: safeError(error),
    context,
    dsnConfigured: true,
  };

  void import("./logger").then(({ logger }) => {
    logger.error({ sentry: payload }, "server exception captured for telemetry");
  });
}
