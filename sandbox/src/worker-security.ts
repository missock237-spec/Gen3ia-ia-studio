import crypto from "node:crypto";

const SECRET = process.env.SANDBOX_SHARED_SECRET;
const MAX_SKEW_MS = 60_000;

if (!SECRET) throw new Error("SANDBOX_SHARED_SECRET is required");

export function verifySandboxRequest(body: string, timestamp: string, signature: string): boolean {
  const ts = Number(timestamp);
  if (!Number.isSafeInteger(ts) || Math.abs(Date.now() - ts) > MAX_SKEW_MS) return false;
  const expected = crypto.createHmac("sha256", SECRET).update(`${timestamp}.${body}`).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
