import type {
  ToolRisk,
} from "@/lib/security/execution-policy";

export interface Gen3iaToolDefinition {
  name: string;

  description: string;

  risk: ToolRisk;

  permission:
    | "tool.read"
    | "tool.write"
    | "tool.external"
    | "tool.destructive"
    | "file.read"
    | "file.write"
    | "file.create"
    | "file.delete"
    | "network.read"
    | "network.write"
    | "code.execute";

  sideEffect: boolean;
}

export const GEN3IA_TOOLS:
  Gen3iaToolDefinition[] = [
    {
      name: "web.search",
      description:
        "Search the public web.",
      risk: "read",
      permission:
        "network.read",
      sideEffect: false,
    },

    {
      name: "file.read",
      description:
        "Read a workspace file.",
      risk: "read",
      permission:
        "file.read",
      sideEffect: false,
    },

    {
      name: "file.create",
      description:
        "Create a workspace file.",
      risk: "write",
      permission:
        "file.create",
      sideEffect: true,
    },

    {
      name: "file.modify",
      description:
        "Modify an existing workspace file.",
      risk: "write",
      permission:
        "file.write",
      sideEffect: true,
    },

    {
      name: "zip.analyze",
      description:
        "Analyze a ZIP archive.",
      risk: "read",
      permission:
        "file.read",
      sideEffect: false,
    },

    {
      name: "zip.create",
      description:
        "Create a ZIP archive from a workspace.",
      risk: "write",
      permission:
        "file.write",
      sideEffect: true,
    },

    {
      name: "artifact.create",
      description:
        "Create a persistent artifact.",
      risk: "write",
      permission:
        "file.write",
      sideEffect: true,
    },

    {
      name: "code.execute",
      description:
        "Execute code in the isolated sandbox.",
      risk: "external",
      permission:
        "code.execute",
      sideEffect: false,
    },

    {
      name: "composio.execute",
      description:
        "Execute an authorized external application action.",
      risk: "external",
      permission:
        "tool.external",
      sideEffect: true,
    },
  ];
