import {
  ToolRegistry,
} from "./registry";

import {
  webSearchTool,
} from "./web/search";

import {
  webOpenTool,
} from "./web/open";

import {
  createComposioTool,
} from "@/lib/integrations/composio/adapter";

export function createDefaultToolRegistry() {
  const registry =
    new ToolRegistry();

  registry.register(
    webSearchTool,
  );

  registry.register(
    webOpenTool,
  );

  if (
    process.env.COMPOSIO_API_KEY
  ) {
    registry.register(
      createComposioTool(),
    );
  }

  return registry;
}
