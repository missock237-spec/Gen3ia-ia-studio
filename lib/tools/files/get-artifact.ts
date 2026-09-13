import { z } from "zod";

import type { ToolDefinition } from "../types";

import {
  getArtifactById,
} from "@/lib/documents/repository";

const InputSchema = z.object({
  artifactId: z.string().min(1),
});

export const getArtifactTool: ToolDefinition = {
  name: "artifact.get",

  description:
    "Get metadata for an artifact owned by the current user.",

  category: "files",

  risk: "low",

  inputSchema: InputSchema,

  async execute(
    input,
    context,
  ) {
    const {
      artifactId,
    } = InputSchema.parse(input);

    return getArtifactById(
      context.userId,
      artifactId,
    );
  },
};
