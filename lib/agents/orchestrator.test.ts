import { describe, expect, it } from "vitest";
import { classifyRoles, createOrchestratorPlan } from "./orchestrator";

describe("multi-agent orchestrator", () => {
  it("selects customer service, sales and content for a combined business objective", () => {
    const roles = classifyRoles("Gère le support client, les ventes et le contenu TikTok/Instagram");
    expect(roles).toEqual(expect.arrayContaining(["customer_service", "sales", "content"]));
  });

  it("honors explicit requested roles", () => {
    expect(classifyRoles("anything", ["admin", "analytics", "admin"])).toEqual(["admin", "analytics"]);
  });

  it("creates parallel specialist steps and a dependent synthesis step", () => {
    const { roles, plan } = createOrchestratorPlan({ userId: "user-1", objective: "Analyse le marché et prépare une stratégie marketing" });
    expect(roles).toEqual(expect.arrayContaining(["analytics", "content"]));
    const specialistIds = roles.map((role) => `agent-${role}`);
    const specialists = plan.steps.filter((step) => specialistIds.includes(step.id));
    expect(specialists.every((step) => step.dependencies.length === 0)).toBe(true);
    const synthesis = plan.steps.find((step) => step.id === "orchestrator-synthesis");
    expect(synthesis?.dependencies.sort()).toEqual(specialistIds.sort());
  });
});
