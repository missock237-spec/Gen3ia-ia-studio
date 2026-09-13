import crypto from "node:crypto";

const SHARED_SECRET =
  process.env.SANDBOX_SHARED_SECRET;

if (!SHARED_SECRET) {
  throw new Error(
    "SANDBOX_SHARED_SECRET is required"
  );
}

export function signPayload(
  payload: string,
  timestamp: string
): string {
  return crypto
    .createHmac(
      "sha256",
      SHARED_SECRET
    )
    .update(
      `${timestamp}.${payload}`
    )
    .digest("hex");
}

export function verifySignature(
  payload: string,
  timestamp: string,
  signature: string
): boolean {
  const now = Date.now();

  const timestampMs =
    Number(timestamp);

  if (
    !Number.isFinite(timestampMs)
  ) {
    return false;
  }

  // Protection contre le replay
  if (
    Math.abs(
      now - timestampMs
    ) > 30_000
  ) {
    return false;
  }

  const expected =
    signPayload(
      payload,
      timestamp
    );

  const a =
    Buffer.from(expected);

  const b =
    Buffer.from(signature);

  if (a.length !== b.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    a,
    b
  );
}
