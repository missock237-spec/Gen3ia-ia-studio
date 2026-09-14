import crypto from "node:crypto";
import fs from "node:fs/promises";

import {
  createR2DownloadUrl,
  deleteFromR2,
  uploadToR2,
} from "@/lib/storage/r2";
import { createArtifactId, createArtifactStorageKey } from "./artifact";
import { assertArtifactOwner } from "./artifact-access";
import {
  createArtifactRecord,
  deleteArtifactRecord,
  getArtifactRecord,
} from "./artifact-repository";

export interface StoreArtifactInput {
  ownerId: string;
  executionId: string;
  name: string;
  mimeType: string;
  data: Uint8Array | Buffer;
  expiresAt?: number;
}

export async function storeArtifactBuffer(input: StoreArtifactInput) {
  const data = Buffer.from(input.data);
  const artifactId = createArtifactId();
  const storageKey = createArtifactStorageKey(
    input.ownerId,
    artifactId,
    input.name,
  );
  const checksum = crypto.createHash("sha256").update(data).digest("hex");
  let uploadedKey: string | null = null;

  try {
    await uploadToR2(storageKey, data, input.mimeType);
    uploadedKey = storageKey;

    const artifact = {
      artifactId,
      ownerId: input.ownerId,
      executionId: input.executionId,
      name: input.name,
      mimeType: input.mimeType,
      size: data.length,
      storageKey,
      checksum,
      createdAt: Date.now(),
      ...(input.expiresAt ? { expiresAt: input.expiresAt } : {}),
    };

    await createArtifactRecord(artifact);
    return artifact;
  } catch (error) {
    if (uploadedKey) {
      try {
        await deleteFromR2(uploadedKey);
      } catch {}
    }
    throw error;
  }
}

export async function storeLocalArtifact(input: {
  ownerId: string;
  executionId: string;
  localPath: string;
  name: string;
  mimeType: string;
  expiresAt?: number;
}) {
  try {
    const data = await fs.readFile(input.localPath);
    return await storeArtifactBuffer({
      ownerId: input.ownerId,
      executionId: input.executionId,
      name: input.name,
      mimeType: input.mimeType,
      data,
      expiresAt: input.expiresAt,
    });
  } finally {
    await fs.rm(input.localPath, { force: true }).catch(() => undefined);
  }
}

export async function getArtifactDownloadUrl(
  artifactId: string,
  userId: string,
) {
  const artifact = await getArtifactRecord(artifactId);
  if (!artifact) throw new Error("Artifact not found");
  assertArtifactOwner(artifact, userId);

  if (artifact.expiresAt && artifact.expiresAt <= Date.now()) {
    throw new Error("Artifact expired");
  }

  return createR2DownloadUrl(artifact.storageKey, 300);
}

export async function removeArtifact(artifactId: string, userId: string) {
  const artifact = await getArtifactRecord(artifactId);
  if (!artifact) throw new Error("Artifact not found");
  assertArtifactOwner(artifact, userId);

  await deleteFromR2(artifact.storageKey);
  await deleteArtifactRecord(artifactId);
}
