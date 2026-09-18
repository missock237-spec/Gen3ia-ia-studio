import crypto from "node:crypto";
import type { LiveAction, LivePermission } from "./types";

const ACTION_PERMISSION: Record<LiveAction["type"], LivePermission | null> = {
  "mouse.move": "input.mouse",
  "mouse.click": "input.mouse",
  "keyboard.type": "input.keyboard",
  "keyboard.key": "input.keyboard",
  wait: null,
};

export function hashPairingToken(token: string): string {
  return crypto.createHash("sha256").update(token, "utf8").digest("hex");
}

export function createPairingToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export function assertActionAllowed(action: LiveAction, permissions: LivePermission[]): void {
  const required = ACTION_PERMISSION[action.type];
  if (required && !permissions.includes(required)) {
    throw new Error(`Live permission denied: ${required}`);
  }
}

export function constantTimeEqual(a: string, b: string): boolean {
  const aa = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}


const LIVE_PROTOCOL_WINDOW_MS = 10_000;
const LIVE_PROTOCOL_MAX_MESSAGES = 40;
const LIVE_MAX_AUTH_FAILURES = 5;

export class LiveRateLimiter {
  private windowStartedAt = Date.now();
  private messageCount = 0;

  allow(now = Date.now()): boolean {
    if (now - this.windowStartedAt >= LIVE_PROTOCOL_WINDOW_MS) {
      this.windowStartedAt = now;
      this.messageCount = 0;
    }
    this.messageCount += 1;
    return this.messageCount <= LIVE_PROTOCOL_MAX_MESSAGES;
  }
}

export class LiveAuthFailureLimiter {
  private failures = 0;

  registerFailure(): boolean {
    this.failures += 1;
    return this.failures <= LIVE_MAX_AUTH_FAILURES;
  }
}

export function assertFreshLiveTimestamp(timestamp: number, now = Date.now()): void {
  if (!Number.isSafeInteger(timestamp) || Math.abs(now - timestamp) > 30_000) {
    throw new Error("Live message timestamp is outside the allowed clock window.");
  }
}
