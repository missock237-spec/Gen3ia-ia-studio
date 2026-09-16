import { generate } from "@/lib/ai/router";

import {
  ResearchClaim,
  ResearchSource,
} from "./types";

export async function verifyClaims(
  claims: ResearchClaim[],
  sources: ResearchSource[],
): Promise<ResearchClaim[]> {
  const sourceMap =
    new Map(
      sources.map(
        (source) => [
          source.id,
          source,
        ],
      ),
    );

  return Promise.all(
    claims.map(
      async (claim) => {
        const evidence =
          claim.sourceIds
            .map(
              (id) =>
                sourceMap.get(id),
            )
            .filter(Boolean)
            .map(
              (source) => ({
                title:
                  source!.title,

                url:
                  source!.url,

                content:
                  source!.content
                    ?.slice(
                      0,
                      6000,
                    ),
              }),
            );

        const response =
          await generate({
            task:
              "reasoning",

            messages: [
              {
                role: "system",
                content:
                  "Verify whether a claim is supported by the supplied evidence. Return JSON only.",
              },

              {
                role: "user",
                content:
                  JSON.stringify({
                    claim:
                      claim.claim,

                    evidence,
                  }),
              },
            ],
          });

        try {
          const result =
            JSON.parse(
              response.text,
            );

          return {
            ...claim,

            confidence:
              typeof result.confidence ===
              "number"
                ? Math.max(
                    0,
                    Math.min(
                      1,
                      result.confidence,
                    ),
                  )
                : claim.confidence,

            status:
              result.supported ===
              true
                ? "supported"
                : result.contradicted ===
                    true
                  ? "contradicted"
                  : "uncertain",
          };
        } catch {
          return {
            ...claim,

            status:
              "uncertain" as const,
          };
        }
      },
    ),
  );
}
