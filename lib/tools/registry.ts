import type {
  ToolDefinition,
} from "./types";

export class ToolRegistry {
  private readonly tools =
    new Map<
      string,
      ToolDefinition
    >();

  register(
    tool: ToolDefinition,
  ): void {
    if (
      this.tools.has(tool.id)
    ) {
      throw new Error(
        `Tool "${tool.id}" is already registered.`,
      );
    }

    this.tools.set(
      tool.id,
      tool,
    );
  }

  replace(
    tool: ToolDefinition,
  ): void {
    this.tools.set(
      tool.id,
      tool,
    );
  }

  get(
    toolId: string,
  ): ToolDefinition {
    const tool =
      this.tools.get(toolId);

    if (!tool) {
      throw new Error(
        `Unknown tool: ${toolId}`,
      );
    }

    return tool;
  }

  has(
    toolId: string,
  ): boolean {
    return this.tools.has(toolId);
  }

  list(): ToolDefinition[] {
    return [...this.tools.values()];
  }
}
