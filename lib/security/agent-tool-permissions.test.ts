import { describe, expect, it } from "vitest";
import { authorizeTool } from "./tool-permissions";
import { createAgentPolicy } from "./agent-policy";

describe("agent tool permissions", () => {
  it("allows standard agents to create files", () => {
    const policy = createAgentPolicy("standard");
    expect(() => authorizeTool(policy, "file.create")).not.toThrow();
  });

  it("keeps ZIP creation out of standard agents", () => {
    const policy = createAgentPolicy("standard");
    expect(() => authorizeTool(policy, "zip.create")).toThrow();
  });

  it("allows power agents to create and analyze ZIP artifacts", () => {
    const policy = createAgentPolicy("power");
    expect(() => authorizeTool(policy, "zip.create")).not.toThrow();
    expect(() => authorizeTool(policy, "zip.analyze")).not.toThrow();
    expect(() => authorizeTool(policy, "artifact.create")).not.toThrow();
  });

  it("keeps code execution disabled for standard agents", () => {
    const policy = createAgentPolicy("standard");
    expect(() => authorizeTool(policy, "code.execute")).toThrow();
  });
});
