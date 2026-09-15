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

const MAX_ARTIFACT_BYTES = 100 * 1024 * 1024;
const ALLOWED_MIME = /^(?:text|image|audio|video|application)\/[a-z0-9.+-]+$/i;

function assertArtifactPayload(data: Buffer, mimeType: string): void {
  if (data.length > MAX_ARTIFACT_BYTES) throw new Error("Artifact exceeds the 100 MiB limit");
  if (!ALLOWED_MIME.test(mimeType)) throw new Error("Unsupported artifact content type");
}

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
  assertArtifactPayload(data, input.mimeType);
  const artifactId = createArtifactId();
  const storageKey = createArtifactStorageKey(input.ownerId, artifactId, input.name);
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
    if (uploadedKey) await deleteFromR2(uploadedKey).catch(() => undefined);
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
    return await storeArtifactBuffer({ ...input, data });
  } finally {
    await fs.rm(input.localPath, { force: true }).catch(() => undefined);
  }
}

export async function getArtifactDownloadUrl(artifactId: string, userId: string) {
  const artifact = await getArtifactRecord(artifactId);
  if (!artifact) throw new Error("Artifact not found");
  assertArtifactOwner(artifact, userId);
  if (artifact.expiresAt && artifact.expiresAt <= Date.now()) throw new Error("Artifact expired");
  if (!Number.isSafeInteger(artifact.size) || artifact.size < 0 || artifact.size > MAX_ARTIFACT_BYTES) {
    throw new Error("Artifact exceeds the download size limit");
  }
  if (typeof artifact.mimeType !== "string" || !ALLOWED_MIME.test(artifact.mimeType)) {
    throw new Error("Artifact content type is not allowed");
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
