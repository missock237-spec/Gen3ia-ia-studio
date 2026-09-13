import type { RuntimeArtifact } from "./artifact-types";

export function toRuntimeArtifact(
  artifact: Record<string, unknown>,
): RuntimeArtifact {
  if (
    typeof artifact.artifactId !== "string" ||
    typeof artifact.filename !== "string" ||
    typeof artifact.format !== "string" ||
    typeof artifact.mimeType !== "string" ||
    typeof artifact.sizeBytes !== "number" ||
    typeof artifact.storagePath !== "string"
  ) {
    throw new Error(
      "Invalid artifact returned by artifact service.",
    );
  }

  return {
    type: "artifact",

    artifactId: artifact.artifactId,

    filename: artifact.filename,

    format: artifact.format,

    mimeType: artifact.mimeType,

    sizeBytes: artifact.sizeBytes,

    storagePath: artifact.storagePath,

    checksum:
      typeof artifact.checksum === "string"
        ? artifact.checksum
        : undefined,

    createdAt:
      typeof artifact.createdAt === "string"
        ? artifact.createdAt
        : undefined,
  };
}
