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
