export interface ZipContextFile {
  path: string;

  size: number;

  isText: boolean;

  content?: string;
}

export interface ZipAgentContext {
  artifactId: string;

  filename: string;

  fileCount: number;

  totalUncompressedSize: number;

  files: ZipContextFile[];
}

export function buildZipAgentContext(
  result: {
    artifactId: string;
    filename: string;
    analysis: {
      fileCount?: number;
      totalUncompressedSize?: number;
      files?: Array<{
        path: string;
        size: number;
        isText?: boolean;
        content?: string;
      }>;
    };
  },
): ZipAgentContext {
  return {
    artifactId:
      result.artifactId,

    filename:
      result.filename,

    fileCount:
      result.analysis.fileCount ?? 0,

    totalUncompressedSize:
      result.analysis
        .totalUncompressedSize ?? 0,

    files:
      (result.analysis.files ?? [])
        .map((file) => ({
          path: file.path,

          size: file.size,

          isText:
            file.isText ?? false,

          content:
            file.content,
        })),
  };
}

export function serializeZipContext(
  context: ZipAgentContext,
): string {
  const parts = [
    `ZIP: ${context.filename}`,
    `Artifact ID: ${context.artifactId}`,
    `Files: ${context.fileCount}`,
    `Uncompressed size: ${context.totalUncompressedSize}`,
    "",
    "FILES:",
  ];

  for (const file of context.files) {
    parts.push(
      `- ${file.path} (${file.size} bytes)`,
    );

    if (
      file.isText &&
      file.content
    ) {
      parts.push(
        "```",
        file.content,
        "```",
      );
    }
  }

  return parts.join("\n");
}
