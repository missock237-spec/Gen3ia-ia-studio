import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";

import { analyzeZip } from "./analyzer";
import { buildWorkspaceZip } from "./build-workspace";
import { storeLocalArtifact } from "../artifact-store";

const MAX_ARCHIVE_BYTES = 100 * 1024 * 1024;

export async function packageWorkspaceAsZip(input: {
  workspaceRoot: string;
  ownerId: string;
  executionId: string;
  name?: string;
}) {
  const workspaceRoot = path.resolve(input.workspaceRoot);
  const stat = await fs.stat(workspaceRoot);
  if (!stat.isDirectory()) throw new Error("Workspace root must be a directory");

  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "gen3ia-zip-"));
  const outputPath = path.join(tempRoot, "artifact.zip");

  try {
    await buildWorkspaceZip(workspaceRoot, outputPath);
    const archive = await fs.readFile(outputPath);

    if (archive.byteLength > MAX_ARCHIVE_BYTES) {
      throw new Error("Generated ZIP exceeds the maximum archive size");
    }

    const analysis = await analyzeZip(archive);
    if (!analysis.safe) {
      throw new Error(`Generated ZIP failed security validation: ${analysis.errors.join("; ")}`);
    }

    const checksum = crypto.createHash("sha256").update(archive).digest("hex");
    const name = input.name?.trim() || `gen3ia-${input.executionId}.zip`;
    const artifact = await storeLocalArtifact({
      ownerId: input.ownerId,
      executionId: input.executionId,
      localPath: outputPath,
      name: name.endsWith(".zip") ? name : `${name}.zip`,
      mimeType: "application/zip",
    });

    return { ...artifact, checksum, analysis };
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
}
