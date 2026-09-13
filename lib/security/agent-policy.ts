import {
  ExecutionPolicy,
} from "./execution-policy";

export type AgentSecurityLevel =
  | "safe"
  | "standard"
  | "power"
  | "admin";

export function createAgentPolicy(
  level: AgentSecurityLevel,
): ExecutionPolicy {
  switch (level) {
    case "safe":
      return {
        allowedTools: [
          "web.search",
          "file.read",
        ],

        permissions: [
          "tool.read",
          "file.read",
          "network.read",
        ],

        maxSteps: 20,

        maxExecutionMs:
          5 * 60 * 1000,

        maxToolExecutionMs:
          30 * 1000,

        maxOutputBytes:
          2 * 1024 * 1024,

        maxInputBytes:
          1024 * 1024,

        allowNetwork: true,

        allowExternalApps: false,

        allowFileWrite: false,

        allowFileDelete: false,

        allowCodeExecution: false,
      };

    case "standard":
      return {
        allowedTools: [
          "web.search",
          "file.read",
          "file.create",
        ],

        permissions: [
          "tool.read",
          "tool.write",
          "file.read",
          "file.create",
          "file.write",
          "network.read",
        ],

        maxSteps: 50,

        maxExecutionMs:
          10 * 60 * 1000,

        maxToolExecutionMs:
          60 * 1000,

        maxOutputBytes:
          5 * 1024 * 1024,

        maxInputBytes:
          2 * 1024 * 1024,

        allowNetwork: true,

        allowExternalApps: false,

        allowFileWrite: true,

        allowFileDelete: false,

        allowCodeExecution: false,
      };

    case "power":
      return {
        allowedTools: [
          "web.search",
          "file.read",
          "file.create",
          "composio.execute",
        ],

        permissions: [
          "tool.read",
          "tool.write",
          "tool.external",
          "file.read",
          "file.create",
          "file.write",
          "network.read",
          "network.write",
        ],

        maxSteps: 100,

        maxExecutionMs:
          20 * 60 * 1000,

        maxToolExecutionMs:
          2 * 60 * 1000,

        maxOutputBytes:
          10 * 1024 * 1024,

        maxInputBytes:
          5 * 1024 * 1024,

        allowNetwork: true,

        allowExternalApps: true,

        allowFileWrite: true,

        allowFileDelete: false,

        allowCodeExecution: false,
      };

    case "admin":
      return {
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

        maxSteps: 200,

        maxExecutionMs:
          30 * 60 * 1000,

        maxToolExecutionMs:
          5 * 60 * 1000,

        maxOutputBytes:
          20 * 1024 * 1024,

        maxInputBytes:
          10 * 1024 * 1024,

        allowNetwork: true,

        allowExternalApps: true,

        allowFileWrite: true,

        allowFileDelete: true,

        allowCodeExecution: true,
      };
  }
          }
