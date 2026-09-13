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
  research,
} from "@/lib/research/v2/service";

toolRegistry.register({
  name: "research.v2",

  description:
    "Perform multi-source web research with verification and citations.",

  category: "web",

  risk: "low",

  inputSchema: ResearchInputSchema,

  execute: async ({
    input,
  }) => {
    const parsed =
      ResearchInputSchema.parse(
        input,
      );

    return research(
      parsed.query,
    );
  },
});

const ResearchInputSchema =
  z.object({
    query: z
      .string()
      .min(3)
      .max(20_000),
  });

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
