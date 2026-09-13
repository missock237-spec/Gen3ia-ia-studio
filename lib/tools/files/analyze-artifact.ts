import { z } from "zod";

import type { ToolDefinition } from "../types";

import {
  analyzeStoredZip,
} from "@/lib/documents/zip/analyze-artifact";

const InputSchema = z.object({
  artifactId: z.string().min(1),
});

export const analyzeArtifactTool: ToolDefinition = {
  name: "artifact.analyze",

  description:
    "Analyze a stored ZIP archive. Safely inspect its directory structure, detect dangerous paths, inspect file metadata and extract supported text/code files.",

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

    return analyzeStoredZip(
      context.userId,
      artifactId,
    );
  },
};
