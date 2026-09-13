import crypto from "node:crypto";

import type {
  SandboxJob,
  SandboxResult
} from "./types";

const SANDBOX_URL =
  process.env.SANDBOX_URL;

const SANDBOX_SECRET =
  process.env.SANDBOX_SHARED_SECRET;

if (!SANDBOX_URL) {
  throw new Error(
    "SANDBOX_URL is missing"
  );
}

if (!SANDBOX_SECRET) {
  throw new Error(
    "SANDBOX_SHARED_SECRET is missing"
  );
}

function sign(
  body: string,
  timestamp: string
) {
  return crypto
    .createHmac(
      "sha256",
      SANDBOX_SECRET
    )
    .update(
      `${timestamp}.${body}`
    )
    .digest("hex");
}

export async function executeSandbox(
  job: SandboxJob
): Promise<SandboxResult> {
  const body =
    JSON.stringify(job);

  const timestamp =
    String(Date.now());

  const signature =
    sign(
      body,
      timestamp
    );

  const response =
    await fetch(
      `${SANDBOX_URL}/execute`,
      {
        method: "POST",

        headers: {
          "content-type":
            "application/json",

          "x-gen3ia-timestamp":
            timestamp,

          "x-gen3ia-signature":
            signature
        },

        body,

        signal:
          AbortSignal.timeout(
            job.limits.timeoutMs +
              10_000
          )
      }
    );

  if (!response.ok) {
    const text =
      await response.text();

    throw new Error(
      `Sandbox error ${response.status}: ${text}`
    );
  }

  return response.json();
}
