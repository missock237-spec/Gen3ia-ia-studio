import {
  checkArtifact,
} from "./artifact-checks";

export async function checkArtifacts(
  userId: string,
  artifacts: Array<{
    artifactId: string;
    expectedFormat?: string;
  }>,
) {
  const results = [];

  for (const artifact of artifacts) {
    results.push(
      await checkArtifact(
        userId,
        artifact.artifactId,
        artifact.expectedFormat,
      ),
    );
  }

  return {
    passed:
      results.every(
        (result) => result.passed,
      ),

    results,

    issues: results.flatMap(
      (result) => result.issues,
    ),
  };
}
