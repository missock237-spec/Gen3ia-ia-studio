import {
  ToolRegistry,
} from "./registry";

import {
  webSearchTool,
} from "./web/search";

import {
  webOpenTool,
} from "./web/open";

export function createDefaultToolRegistry() {
  const registry =
    new ToolRegistry();

  registry.register(
    webSearchTool,
  );

  registry.register(
    webOpenTool,
  );

  return registry;
}
