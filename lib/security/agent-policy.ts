import {
  DEFAULT_EXECUTION_POLICY,
  type ExecutionPolicy,
} from "./execution-policy";

export type AgentSecurityLevel =
  | "safe"
  | "standard"
  | "power"
  | "admin";

export function createAgentPolicy(
  level: AgentSecurityLevel,
): ExecutionPolicy {
  const base: ExecutionPolicy = {
    ...DEFAULT_EXECUTION_POLICY,
    allowedTools: [],
    permissions: ["tool.read", "file.read"],
  };

  switch (level) {
    case "safe":
      return base;

    case "standard":
      return {
        ...base,
        allowedTools: [
          "web.search",
          "file.read",
          "file.create",
        ],
        permissions: [
          "tool.read",
          "tool.write",
          "file.read",
          "file.write",
          "file.create",
        ],
        allowFileWrite: true,
      };

    case "power":
      return {
        ...base,
        allowedTools: [
          "web.search",
          "file.read",
          "file.create",
          "file.modify",
          "zip.analyze",
          "zip.create",
          "zip.extract",
          "artifact.create",
          "code.execute",
          "composio.execute",
        ],
        permissions: [
          "tool.read",
          "tool.write",
          "tool.external",
          "file.read",
          "file.write",
          "file.create",
          "network.read",
          "network.write",
          "code.execute",
        ],
        allowNetwork: true,
        allowExternalApps: true,
        allowFileWrite: true,
        allowCodeExecution: true,
      };

    case "admin":
      return {
        ...base,
        allowedTools: ["*"],
        permissions: [
          "tool.read",
          "tool.write",
          "tool.external",
          "tool.destructive",
          "file.read",
          "file.write",
          "file.create",
          "file.delete",
          "network.read",
          "network.write",
          "code.execute",
        ],
        allowNetwork: true,
        allowExternalApps: true,
        allowFileWrite: true,
        allowFileDelete: true,
        allowCodeExecution: true,
      };
  }
}
