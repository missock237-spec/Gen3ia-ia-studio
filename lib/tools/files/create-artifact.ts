import { z } from "zod";

import type {
  ToolDefinition,
} from "../types";

import {
  generateArtifact,
} from "@/lib/documents/engine";

const inputSchema = z.object({
  title: z.string(),

  format: z.enum([
    "pdf",
    "docx",
    "xlsx",
    "pptx",
    "csv",
    "md",
    "txt",
    "json",
    "html",
  ]),

  blocks: z.array(
    z.object({
      type: z.enum([
        "title",
        "heading",
        "paragraph",
        "list",
        "table",
        "code",
        "quote",
        "image",
        "pageBreak",
      ]),

      text: z.string().optional(),

      level: z.number().optional(),

      items: z.array(z.string()).optional(),

      columns: z.array(z.string()).optional(),

      rows: z.array(
        z.array(z.string()),
      ).optional(),
    }),
  ),
});

export const createArtifactTool:
  ToolDefinition = {
    name: "artifact.create",

    description:
      "Create a validated document artifact.",

    category: "files",

    risk: "low",

    inputSchema,

    execute: async ({
      context,
      input,
    }) => {
      const parsed =
        inputSchema.parse(input);

      const artifact =
        await generateArtifact({
          userId: context.userId,

          projectId:
            context.projectId,

          executionId:
            context.executionId,

          plan: {
            title: parsed.title,

            format: parsed.format,

            blocks: parsed.blocks,
          },
        });

      return {
        success: true,

        artifactId:
          artifact.artifactId,

        filename:
          artifact.filename,

        format:
          artifact.format,

        sizeBytes:
          artifact.sizeBytes,

        storagePath:
          artifact.storagePath,

        validation:
          artifact.validation,
      };
    },
  };
