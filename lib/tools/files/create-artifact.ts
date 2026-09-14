import { z } from "zod";
import type { ToolDefinition } from "../types";
import { generateArtifact } from "@/lib/documents/engine";
import { storeArtifactBuffer } from "@/lib/documents/artifact-store";

const inputSchema = z.object({
  title: z.string().min(1).max(300),
  format: z.enum(["pdf", "docx", "xlsx", "pptx", "csv", "md", "txt", "json", "html"]),
  blocks: z.array(
    z.object({
      type: z.enum(["title", "heading", "paragraph", "list", "table", "code", "quote", "image", "pageBreak"]),
      text: z.string().max(1_000_000).optional(),
      level: z.number().int().min(1).max(6).optional(),
      ordered: z.boolean().optional(),
      items: z.array(z.string().max(100_000)).max(10_000).optional(),
      columns: z.array(z.string().max(10_000)).max(1_000).optional(),
      rows: z.array(z.array(z.string().max(10_000)).max(1_000)).max(10_000).optional(),
      language: z.string().max(100).optional(),
      url: z.string().url().optional(),
    }),
  ).min(1).max(10_000),
});

export const createArtifactTool: ToolDefinition = {
  id: "artifact.create",
  name: "artifact.create",
  description: "Generate, validate and persist a document artifact in the authenticated user's private R2 storage.",
  category: "files",
  risk: "medium",
  inputSchema,
  execute: async (input, context) => {
    const parsed = inputSchema.parse(input);
    const generated = await generateArtifact({
      userId: context.userId,
      projectId: context.projectId,
      executionId: context.executionId,
      plan: {
        title: parsed.title,
        format: parsed.format,
        blocks: parsed.blocks,
      },
    });

    const artifact = await storeArtifactBuffer({
      ownerId: context.userId,
      executionId: context.executionId ?? "unknown",
      name: generated.filename,
      mimeType: generated.mimeType,
      data: generated.data,
    });

    return {
      success: true,
      artifactId: artifact.artifactId,
      filename: artifact.name,
      format: generated.format,
      mimeType: artifact.mimeType,
      sizeBytes: artifact.size,
      checksum: artifact.checksum,
      storageKey: artifact.storageKey,
      validation: generated.validation,
    };
  },
};
