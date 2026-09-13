export const ZIP_SECURITY_LIMITS = {
  maxArchiveBytes: 100 * 1024 * 1024,

  maxFiles: 10_000,

  maxUncompressedBytes: 500 * 1024 * 1024,

  maxSingleFileBytes: 100 * 1024 * 1024,

  maxPathLength: 1024,

  maxCompressionRatio: 200,

  maxDepth: 30,
} as const;

export type ZipSecurityLimits =
  typeof ZIP_SECURITY_LIMITS;
