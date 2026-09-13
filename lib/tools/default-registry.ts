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
  getArtifactTool,
} from "./files/get-artifact";

registry.register(
  getArtifactTool,
);

import {
  createComposioTool,
} from "@/lib/integrations/composio/adapter";

import {
  githubCreateRepositoryTool,
} from "@/lib/integrations/github/tools";

registry.register(
  createArtifactTool,
);

registry.register(
  analyzeZipTool,
);

registry.register(
  createZipTool,
);

import {
  createArtifactTool,
} from "./files/create-artifact";

import {
  analyzeZipTool,
} from "./files/analyze-zip";

import {
  createZipTool,
} from "./files/create-zip";

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

  if (
  process.env.GITHUB_TOKEN
) {
  registry.register(
    githubCreateRepositoryTool,
  );
}
  return registry;
}
