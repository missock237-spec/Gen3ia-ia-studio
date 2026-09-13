const MAX_DEPTH = 10;

export function assertExecutionDepth(
  depth: number,
): void {
  if (
    depth > MAX_DEPTH
  ) {
    throw new Error(
      "Maximum execution depth exceeded.",
    );
  }
}
