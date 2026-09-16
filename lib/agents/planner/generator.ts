import { generate } from "@/lib/ai/router";
import {
  DynamicPlan,
  DynamicPlanSchema,
} from "./schema";

export interface PlanGenerationInput {
  objective: string;

  tools: Array<{
    name: string;
    description: string;
    risk: string;
  }>;

  skills: Array<{
    id: string;
    name: string;
    description: string;
    capabilities: string[];
  }>;
}

export async function generatePlan(
  input: PlanGenerationInput,
): Promise<DynamicPlan> {
  const prompt = `
You are the Gen3ia autonomous planning engine.

Your task is to transform the user objective into
a valid executable DAG.

USER OBJECTIVE:
${input.objective}

AVAILABLE TOOLS:
${JSON.stringify(
  input.tools,
  null,
  2,
)}

AVAILABLE SKILLS:
${JSON.stringify(
  input.skills,
  null,
  2,
)}

RULES:

1. Produce only executable steps.
2. Every step must have a unique ID.
3. Dependencies must reference existing steps.
4. Never create a dependency cycle.
5. Use parallel steps when they are independent.
6. Never invent tools.
7. Never invent skills.
8. Use research steps for external factual research.
9. Use document steps when a document must be created.
10. Mark sideEffect=true for irreversible/external actions.
11. Mark requiresApproval=true for sensitive actions.
12. Keep the plan as small as possible.
13. Use dependencies to transfer outputs between steps.
14. Prefer deterministic tool execution over hallucinated tool results.
15. maxConcurrency must be between 1 and 8.
16. maxIterations must be between 1 and 20.

Return ONLY valid JSON.
`;

  const response = await generate({
    task: "reasoning",

    messages: [
      {
        role: "system",
        content:
          "You are Gen3ia Planner. Output valid JSON only.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  let parsed: unknown;

  try {
    parsed = JSON.parse(
      response.text,
    );
  } catch {
    throw new Error(
      "Planner returned invalid JSON",
    );
  }

  const result =
    DynamicPlanSchema.safeParse(
      parsed,
    );

  if (!result.success) {
    throw new Error(
      `Invalid generated plan: ${result.error.message}`,
    );
  }

  return result.data;
}
