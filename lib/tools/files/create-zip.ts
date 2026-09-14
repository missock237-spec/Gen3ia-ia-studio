import { z } from "zod";
import type { ToolDefinition } from "../types";
import { createZip } from "@/lib/documents/zip";
import { storeLocalArtifact } from "@/lib/documents/artifact-store";
import { assertWorkspaceOwner } from "@/lib/execution/workspace-registry";
import path from "node:path";
import fs from "node:fs/promises";

const inputSchema = z.object({
  workspaceId: z.string().min(1).max(128).optional(),
  filename: z.string().min(1).max(255).default("gen3ia-output.zip"),
  files: z.array(z.object({ filename: z.string().min(1).max(1024), dataBase64: z.string().min(1) })).min(1).max(10000),
});

export const createZipTool: ToolDefinition = {
  id: "zip.create",
  name: "zip.create",
  description: "Create, validate and persist a ZIP artifact from agent-generated files.",
  category: "files",
  risk: "medium",
  inputSchema,
  execute: async (input, context) => {
    const parsed = inputSchema.parse(input);
    const entries = parsed.files.map((file) => ({
      filename: file.filename,
      data: Buffer.from(file.dataBase64, "base64"),
    }));
    const data = await createZip(entries);

    const tempRoot = context.executionId ? path.join("/tmp", `gen3ia-${context.executionId}`) : "/tmp";
    await fs.mkdir(tempRoot, { recursive: true, mode: 0o700 });
    const outputPath = path.join(tempRoot, parsed.filename.replace(/[^a-zA-Z0-9._-]/g, "_"));
    await fs.writeFile(outputPath, data, { mode: 0o600 });

    if (parsed.workspaceId) {
      assertWorkspaceOwner(parsed.workspaceId, context.userId);
    }

    const artifact = await storeLocalArtifact({
      ownerId: context.userId,
      executionId: context.executionId ?? "unknown",
      localPath: outputPath,
      name: parsed.filename,
      mimeType: "application/zip",
    });

    return {
      success: true,
      artifactId: artifact.artifactId,
      filename: artifact.name,
      mimeType: artifact.mimeType,
      sizeBytes: artifact.size,
      checksum: artifact.checksum,
      storageKey: artifact.storageKey,
    };
  },
};
