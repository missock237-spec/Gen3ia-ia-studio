import {
  adminStorage,
} from "@/lib/firebase/admin";

import {
  getArtifactById,
} from "../repository";

import {
  analyzeZip,
} from "./analyzer";

export async function analyzeStoredZip(
  userId: string,
  artifactId: string,
) {
  const artifact =
    await getArtifactById(
      userId,
      artifactId,
    );

  if (
    !artifact
  ) {
    throw new Error(
      "Artifact not found.",
    );
  }

  if (
    artifact.format !== "zip" &&
    artifact.mimeType !==
      "application/zip"
  ) {
    throw new Error(
      "Artifact is not a ZIP archive.",
    );
  }

  const [buffer] =
    await adminStorage
      .bucket()
      .file(artifact.storagePath)
      .download();

  const analysis =
    await analyzeZip(buffer);

  return {
    artifactId,

    filename:
      artifact.filename,

    analysis,
  };
}
