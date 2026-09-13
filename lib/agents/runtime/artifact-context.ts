import type { RuntimeArtifact } from "./artifact-types";

export function formatArtifactForContext(
  artifact: RuntimeArtifact,
): string {
  return [
    `Artifact ID: ${artifact.artifactId}`,
    `Filename: ${artifact.filename}`,
    `Format: ${artifact.format}`,
    `MIME: ${artifact.mimeType}`,
    `Size: ${artifact.sizeBytes} bytes`,
    `Storage: ${artifact.storagePath}`,
    artifact.checksum
      ? `SHA-256: ${artifact.checksum}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildArtifactContext(
  artifacts: RuntimeArtifact[],
): string {
  if (!artifacts.length) {
    return "No artifacts available.";
  }

  return [
    "AVAILABLE ARTIFACTS:",
    "",

    ...artifacts.map(
      (artifact, index) =>
        `Artifact ${index + 1}\n${formatArtifactForContext(
          artifact,
        )}`,
    ),

    "",
    "IMPORTANT:",
    "Use artifact IDs when referring to files.",
    "Do not request binary data unless a dedicated artifact tool is available.",
  ].join("\n");
}
