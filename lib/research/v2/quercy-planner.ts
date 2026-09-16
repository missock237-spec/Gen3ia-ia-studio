import { generate } from "@/lib/ai/router";

import { z } from "zod";

const QueryPlanSchema =
  z.object({
    queries: z
      .array(z.string().min(2))
      .min(1)
      .max(8),

    focus: z
      .array(z.string())
      .default([]),
  });

export async function generateResearchQueries(
  objective: string,
): Promise<string[]> {
  const response =
    await generate({
      task: "research",

      messages: [
        {
          role: "system",
          content:
            "Generate independent search queries for rigorous web research. Return JSON only.",
        },

        {
          role: "user",
          content: `
Research objective:

${objective}

Generate multiple complementary queries.

Cover, when relevant:
- primary facts
- official sources
- technical documentation
- recent developments
- alternatives
- contradictory evidence
- dates
- limitations

Do not answer the research question.
Only generate the queries.
`,
        },
      ],
    });

  let parsed: unknown;

  try {
    parsed =
      JSON.parse(
        response.text,
      );
  } catch {
    throw new Error(
      "Research query planner returned invalid JSON",
    );
  }

  const result =
    QueryPlanSchema.safeParse(
      parsed,
    );

  if (!result.success) {
    throw new Error(
      `Invalid research query plan: ${result.error.message}`,
    );
  }

  return result.data.queries;
}
