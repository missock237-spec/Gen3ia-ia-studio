import {
  randomUUID,
} from "crypto";

import { generate } from "@/lib/ai/router";

import {
  ResearchClaimSchema,
  ResearchClaim,
  ResearchSource,
} from "./types";

import { z } from "zod";

const ClaimResponseSchema =
  z.object({
    claims: z.array(
      z.object({
        claim: z.string(),
        sourceIds:
          z.array(z.string()),
        confidence:
          z.number()
            .min(0)
            .max(1),
      }),
    ),
  });

export async function extractClaims(
  objective: string,
  sources: ResearchSource[],
): Promise<ResearchClaim[]> {
  const evidence = sources
    .filter(
      (source) =>
        source.verified &&
        source.content,
    )
    .map((source) => ({
      id: source.id,
      title: source.title,
      url: source.url,
      content:
        source.content!.slice(
          0,
          12000,
        ),
    }));

  const response =
    await generate({
      taskType: "research",

      messages: [
        {
          role: "system",
          content:
            "Extract evidence-backed claims. Never invent unsupported facts. Return JSON only.",
        },

        {
          role: "user",
          content: JSON.stringify({
            objective,
            sources: evidence,
          }),
        },
      ],
    });

  let parsed: unknown;

  try {
    parsed =
      JSON.parse(
        response.content,
      );
  } catch {
    throw new Error(
      "Claim extractor returned invalid JSON",
    );
  }

  const result =
    ClaimResponseSchema.safeParse(
      parsed,
    );

  if (!result.success) {
    throw new Error(
      `Invalid claims: ${result.error.message}`,
    );
  }

  return result.data.claims.map(
    (claim) =>
      ResearchClaimSchema.parse({
        id: randomUUID(),

        claim:
          claim.claim,

        sourceIds:
          claim.sourceIds,

        confidence:
          claim.confidence,

        status:
          "supported",
      }),
  );
}
