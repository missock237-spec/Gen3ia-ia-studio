import crypto from "node:crypto";

export interface ArtifactMetadata {
  artifactId: string;
  ownerId: string;
  executionId: string;
  name: string;
  mimeType: string;
  size: number;
  storageKey: string;
  createdAt: Date;
}

export function createArtifactId(): string {
  return `art_${crypto
    .randomBytes(18)
    .toString("base64url")}`;
}

export function createArtifactStorageKey(
  ownerId: string,
  artifactId: string,
  filename: string
): string {
  const safeFilename =
    filename
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .slice(0, 180);

  return [
    "artifacts",
    ownerId,
    artifactId,
    safeFilename,
  ].join("/");
}
