import {
  randomUUID,
} from "crypto";

import {
  getAvailableSkills,
} from "@/lib/skills/service";

import {
  buildPlannerToolContext,
} from "./context";

import {
  generatePlan,
} from "./generator";

import {
  validateGeneratedPlan,
} from "./validator";

import {
  RuntimePlan,
} from "@/lib/agents/runtime";

export async function createAgentPlan(
  userId: string,
  objective: string,
): Promise<RuntimePlan> {
  const tools =
    buildPlannerToolContext();

  const skills =
    await getAvailableSkills(
      userId,
    );

  const generated =
    await generatePlan({
      objective,
      tools,

      skills: skills.map(
        (skill) => ({
          id: skill.id,
          name: skill.name,
          description:
            skill.description,
          capabilities:
            skill.capabilities.map(
              (capability) =>
                capability.name,
            ),
        }),
      ),
    });

  const validation =
    validateGeneratedPlan(
      generated,
      tools.map(
        (tool) => tool.name,
      ),
      skills.map(
        (skill) => skill.id,
      ),
    );

  if (!validation.valid) {
    throw new Error(
      `Generated plan rejected:\n${validation.errors.join(
        "\n",
      )}`,
    );
  }

  return {
    executionId:
      randomUUID(),

    objective,

    steps: generated.steps,

    maxConcurrency:
      generated.maxConcurrency,

    maxIterations:
      generated.maxIterations,
  };
}
