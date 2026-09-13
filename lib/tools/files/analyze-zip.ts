import { z } from "zod";

import type {
  ToolDefinition,
} from "../types";

import {
  analyzeZip,
} from "@/lib/documents/zip";

const inputSchema = z.object({
  dataBase64: z.string().min(1),

  includeText: z
    .boolean()
    .default(true),
});

export const analyzeZipTool:
  ToolDefinition = {
    name: "artifact.analyze_zip",

    description:
      "Safely inspect and analyze a ZIP archive. Lists files, detects dangerous paths, checks archive limits and extracts supported text/code files.",

    category: "files",

    risk: "low",

    inputSchema,

    execute: async ({
      input,
    }) => {
      const parsed =
        inputSchema.parse(input);

      const data =
        Buffer.from(
          parsed.dataBase64,
          "base64",
        );

      const result =
        await analyzeZip(data);

      return {
        success: true,

        safe: result.safe,

        fileCount:
          result.fileCount,

        totalUncompressedBytes:
          result.totalUncompressedBytes,

        files:
          result.files,

        textFiles:
          parsed.includeText
            ? result.textFiles
            : [],

        warnings:
          result.warnings,

        errors:
          result.errors,
      };
    },
  };
