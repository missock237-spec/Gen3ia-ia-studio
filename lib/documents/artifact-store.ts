import fs from "node:fs/promises";
import crypto from "node:crypto";

import {
  uploadToR2,
  deleteFromR2,
  createR2DownloadUrl,
} from "@/lib/storage/r2";

import {
  createArtifactId,
  createArtifactStorageKey,
} from "./artifact";

import {
  createArtifactRecord,
  deleteArtifactRecord,
  getArtifactRecord,
} from "./artifact-repository";

import { assertArtifactOwner } from "./artifact-access";

export async function storeLocalArtifact(input: {
  ownerId: string;
  executionId: string;
  localPath: string;
  name: string;
  mimeType: string;
}) {
  const data = await fs.readFile(input.localPath);

  const artifactId = createArtifactId();

  const storageKey = createArtifactStorageKey(
    input.ownerId,
    artifactId,
    input.name,
  );

  const checksum = crypto
    .createHash("sha256")
    .update(data)
    .digest("hex");

  await uploadToR2(
    storageKey,
    data,
    input.mimeType,
  );

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
  };

  await createArtifactRecord(artifact);

  await fs.rm(input.localPath, {
    force: true,
  });

  return artifact;
}

export async function getArtifactDownloadUrl(
  artifactId: string,
  userId: string,
) {
  const artifact = await getArtifactRecord(
    artifactId,
  );

  if (!artifact) {
    throw new Error("Artifact not found");
  }

  assertArtifactOwner(
    artifact,
    userId,
  );

  return createR2DownloadUrl(
    artifact.storageKey,
    300,
  );
}

export async function removeArtifact(
  artifactId: string,
  userId: string,
) {
  const artifact = await getArtifactRecord(
    artifactId,
  );

  if (!artifact) {
    throw new Error("Artifact not found");
  }

  assertArtifactOwner(
    artifact,
    userId,
  );

  await deleteFromR2(
    artifact.storageKey,
  );

  await deleteArtifactRecord(
    artifactId,
  );
}
