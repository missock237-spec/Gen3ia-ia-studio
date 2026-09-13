import type { RuntimeArtifact } from "./artifact-types";

export interface RuntimeStepOutput {
  text?: string;

  json?: unknown;

  artifacts?: RuntimeArtifact[];

  metadata?: Record<
    string,
    unknown
  >;
}

export function normalizeStepOutput(
  output: unknown,
): RuntimeStepOutput {
  if (output == null) {
    return {};
  }

  if (typeof output === "string") {
    return {
      text: output,
    };
  }

  if (
    typeof output === "object" &&
    output !== null
  ) {
    const value =
      output as Record<string, unknown>;

    const artifacts =
      Array.isArray(value.artifacts)
        ? value.artifacts
        : undefined;

    return {
      text:
        typeof value.text === "string"
          ? value.text
          : undefined,

      json:
        value.json !== undefined
          ? value.json
          : undefined,

      artifacts:
        artifacts as RuntimeArtifact[] | undefined,

      metadata:
        value.metadata &&
        typeof value.metadata === "object"
          ? value.metadata as Record<
              string,
              unknown
            >
          : undefined,
    };
  }

  return {
    text: String(output),
  };
}
