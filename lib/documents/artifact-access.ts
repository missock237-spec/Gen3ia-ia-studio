import type {
  ArtifactMetadata,
} from "./artifact";

export class ArtifactAccessDeniedError
  extends Error {
  constructor() {
    super("Artifact access denied");
    this.name =
      "ArtifactAccessDeniedError";
  }
}

export function assertArtifactOwner(
  artifact: ArtifactMetadata,
  userId: string
): void {
  if (
    artifact.ownerId !== userId
  ) {
    throw new ArtifactAccessDeniedError();
  }
}
