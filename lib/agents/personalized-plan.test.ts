import { describe, expect, it } from "vitest";

import { createPersonalizedPlan, policyForAgent, securityLevelForAgent } from "./personalized-plan";
import type { AgentRecord } from "./schema";

function makeAgent(overrides: Partial<AgentRecord> = {}): AgentRecord {
  return {
    id: "agent_1",
    ownerId: "user_1",
    name: "Test Agent",
    description: "",
    type: "universal",
    systemPrompt: "Tu es un assistant de test.",
    modelStrategy: "automatic",
    autonomous: true,
    maxIterations: 8,
    tools: [],
    memoryEnabled: true,
    webResearchEnabled: true,
    documentGenerationEnabled: true,
    status: "active",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("createPersonalizedPlan", () => {
  it("cree une chaine recherche -> llm quand la recherche web est activee", () => {
    const plan = createPersonalizedPlan(makeAgent(), "Analyse le marche des drones");
    expect(plan.steps).toHaveLength(2);
    expect(plan.steps[0].type).toBe("research");
    expect(plan.steps[1].type).toBe("llm");
    expect(plan.steps[1].dependencies).toEqual([plan.steps[0].id]);
    expect(plan.maxIterations).toBe(8);
    expect(plan.objective).toBe("Analyse le marche des drones");
  });

  it("cree un seul step llm sans recherche web", () => {
    const plan = createPersonalizedPlan(makeAgent({ webResearchEnabled: false }), "Ecris un haiku");
    expect(plan.steps).toHaveLength(1);
    expect(plan.steps[0].type).toBe("llm");
    expect(plan.steps[0].dependencies).toEqual([]);
  });

  it("assigne le role correspondant au type d'agent", () => {
    const plan = createPersonalizedPlan(makeAgent({ type: "code", webResearchEnabled: false }), "Refactorise");
    expect(plan.steps[0].agentRole).toBe("developer");
  });

  it("plafonne les iterations a 20", () => {
    const plan = createPersonalizedPlan(makeAgent({ maxIterations: 50 }), "Objectif");
    expect(plan.maxIterations).toBeLessThanOrEqual(20);
  });
});

describe("securityLevelForAgent", () => {
  it("donne le niveau power aux agents de code", () => {
    expect(securityLevelForAgent(makeAgent({ type: "code" }))).toBe("power");
  });

  it("donne le niveau standard aux autres types", () => {
    for (const type of ["universal", "content", "research", "automation"] as const) {
      expect(securityLevelForAgent(makeAgent({ type }))).toBe("standard");
    }
  });
});

describe("policyForAgent", () => {
  it("autorise code.execute et ui.components pour un agent de code", () => {
    const policy = policyForAgent(makeAgent({ type: "code" }));
    expect(policy.allowedTools).toContain("code.execute");
    expect(policy.allowedTools).toContain("ui.components");
    expect(policy.allowCodeExecution).toBe(true);
  });

  it("n'autorise PAS ui.components pour un agent non-code, meme declare", () => {
    const policy = policyForAgent(
      makeAgent({ type: "content", tools: ["web.search", "ui.components"] }),
    );
    expect(policy.allowedTools).toContain("web.search");
    expect(policy.allowedTools).not.toContain("ui.components");
  });

  it("ajoute les outils declares a la whitelist du niveau", () => {
    const policy = policyForAgent(makeAgent({ type: "research", tools: ["web.open"] }));
    expect(policy.allowedTools).toContain("web.open");
  });

  it("rejette les noms d'outils suspects", () => {
    const policy = policyForAgent(makeAgent({ tools: ["bad tool!", "x".repeat(100)] }));
    expect(policy.allowedTools).not.toContain("bad tool!");
  });
});
