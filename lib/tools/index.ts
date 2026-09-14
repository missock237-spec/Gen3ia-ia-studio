import { executeTool, ToolExecutor } from "./executor";
import { createDefaultToolRegistry } from "./default-registry";

export { executeTool, ToolExecutor };
export { createDefaultToolRegistry };
export * from "./types";

export async function executeRegisteredTool(request: Parameters<typeof executeTool>[0]) {
  return executeTool(request);
}
