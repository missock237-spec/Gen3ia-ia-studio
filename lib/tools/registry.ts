import type { ToolDefinition } from "./types";

export class ToolRegistry {
  private readonly tools = new Map<string, ToolDefinition>();

  register(tool: ToolDefinition): void {
    const id = tool.id ?? tool.name;
    if (this.tools.has(id)) throw new Error(`Tool already registered: ${id}`);
    this.tools.set(id, { ...tool, id });
    if (tool.name !== id && !this.tools.has(tool.name)) this.tools.set(tool.name, { ...tool, id });
  }

  get(toolId: string): ToolDefinition | undefined {
    return this.tools.get(toolId);
  }

  has(toolId: string): boolean {
    return this.tools.has(toolId);
  }

  list(): ToolDefinition[] {
    return [...new Map([...this.tools.values()].map((tool) => [tool.id ?? tool.name, tool])).values()];
  }
}

export interface Gen3iaToolDefinition {
  name: string;
  description: string;
  risk: "read" | "write" | "external" | "destructive";
  permission: string;
  sideEffect: boolean;
}

export const GEN3IA_TOOLS: Gen3iaToolDefinition[] = [
  { name: "web.search", description: "Search the public web.", risk: "read", permission: "network.read", sideEffect: false },
  { name: "file.read", description: "Read a workspace file.", risk: "read", permission: "file.read", sideEffect: false },
  { name: "file.create", description: "Create a workspace file.", risk: "write", permission: "file.create", sideEffect: true },
  { name: "file.modify", description: "Modify a workspace file.", risk: "write", permission: "file.write", sideEffect: true },
  { name: "zip.analyze", description: "Analyze a ZIP archive safely.", risk: "read", permission: "file.read", sideEffect: false },
  { name: "zip.create", description: "Create and persist a ZIP artifact.", risk: "write", permission: "file.create", sideEffect: true },
  { name: "artifact.create", description: "Create a persistent document artifact.", risk: "write", permission: "file.create", sideEffect: true },
  { name: "code.execute", description: "Execute code in the isolated sandbox.", risk: "external", permission: "code.execute", sideEffect: false },
  { name: "composio.execute", description: "Execute an authorized external action.", risk: "external", permission: "tool.external", sideEffect: true },
];
