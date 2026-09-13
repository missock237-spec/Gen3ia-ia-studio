import {
  generate,
} from "@/lib/ai/router";

import {
  ResearchClaim,
  ResearchSource,
} from "./types";

export async function synthesizeResearch(
  objective: string,
  claims: ResearchClaim[],
  sources: ResearchSource[],
): Promise<string> {
  const supportedClaims =
    claims.filter(
      (claim) =>
        claim.status ===
        "supported",
    );

  const response =
    await generate({
      taskType: "research",

      messages: [
        {
          role: "system",
          content:
            `
You are the Gen3ia research synthesizer.

Produce a precise research answer.

Rules:
- Use only supplied evidence.
- Do not invent facts.
- Distinguish verified facts from uncertainty.
- Mention contradictions.
- Prefer authoritative sources.
- Cite claims using [SOURCE_ID].
`,
        },

        {
          role: "user",
          content:
            JSON.stringify({
              objective,

              claims:
                supportedClaims,

              sources:
                sources.map(
                  (source) => ({
                    id:
                      source.id,

                    title:
                      source.title,

                    url:
                      source.url,
                  }),
                ),
            }),
        },
      ],
    });

  return response.content;
}
