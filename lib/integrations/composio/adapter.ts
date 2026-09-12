import { z } from "zod";

import type {
  ToolDefinition,
  ToolContext,
} from "@/lib/tools/types";

import {
  executeComposioTool,
} from "./tools";

const InputSchema =
  z.object({
    toolSlug:
      z.string().min(1),

    arguments:
      z.record(
        z.string(),
        z.unknown(),
      ),
  });

export function createComposioTool(): ToolDefinition<
  z.infer<typeof InputSchema>,
  unknown
> {
  return {
    id:
      "composio.execute",

    name:
      "Composio Execute",

    description:
      "Execute an action through a user's connected external application.",

    category:
      "composio",

    risk:
      "high",

    inputSchema:
      InputSchema,

    async execute(
      input,
      context: ToolContext,
    ) {
      if (!context.userId) {
        throw new Error(
          "A user ID is required.",
        );
      }

      return executeComposioTool({
        userId:
          context.userId,

        toolSlug:
          input.toolSlug,

        arguments:
          input.arguments,

        signal:
          context.signal,
      });
    },
  };
}
