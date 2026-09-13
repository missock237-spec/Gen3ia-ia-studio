import { adminDb } from "@/lib/firebase/admin";

export interface ArtifactRecord {
  artifactId: string;
  ownerId: string;
  executionId: string;
  name: string;
  mimeType: string;
  size: number;
  storageKey: string;
  createdAt: number;
  expiresAt?: number;
}

const COLLECTION = "artifacts";

export async function createArtifactRecord(
  artifact: ArtifactRecord,
) {
  await adminDb
    .collection(COLLECTION)
    .doc(artifact.artifactId)
    .set(artifact);

  return artifact;
}

export async function getArtifactRecord(
  artifactId: string,
): Promise<ArtifactRecord | null> {
  const snapshot = await adminDb
    .collection(COLLECTION)
    .doc(artifactId)
    .get();

  if (!snapshot.exists) {
    return null;
  }

  return snapshot.data() as ArtifactRecord;
}

export async function deleteArtifactRecord(
  artifactId: string,
) {
  await adminDb
    .collection(COLLECTION)
    .doc(artifactId)
    .delete();
}
