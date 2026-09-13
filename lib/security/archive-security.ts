import path from "node:path";

const MAX_ARCHIVE_FILES = 5000;

const MAX_UNCOMPRESSED_BYTES =
  500 * 1024 * 1024;

export function validateArchivePath(
  entryName: string,
): string {
  const normalized =
    path.posix.normalize(
      entryName.replaceAll("\\", "/"),
    );

  if (
    normalized.startsWith("../") ||
    normalized === ".." ||
    normalized.includes("/../") ||
    normalized.startsWith("/")
  ) {
    throw new Error(
      `Unsafe archive path: ${entryName}`,
    );
  }

  if (
    normalized.includes("\0")
  ) {
    throw new Error(
      "Null byte in archive path",
    );
  }

  return normalized;
}

export function validateArchiveEntryCount(
  count: number,
): void {
  if (
    count >
    MAX_ARCHIVE_FILES
  ) {
    throw new Error(
      "Archive contains too many files",
    );
  }
}

export function validateArchiveSize(
  totalUncompressedBytes: number,
): void {
  if (
    totalUncompressedBytes >
    MAX_UNCOMPRESSED_BYTES
  ) {
    throw new Error(
      "Archive uncompressed size exceeds security limit",
    );
  }
}
