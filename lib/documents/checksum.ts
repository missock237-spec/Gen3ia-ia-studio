import crypto from "node:crypto";

export function sha256(data: Buffer): string {
  return crypto
    .createHash("sha256")
    .update(data)
    .digest("hex");
}
