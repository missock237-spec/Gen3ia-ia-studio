import yauzl from "yauzl";
import type {
  ArtifactFileEntry,
  ZipAnalysisResult,
} from "../types";

const MAX_FILES = 5000;
const MAX_TOTAL_UNCOMPRESSED = 500 * 1024 * 1024;
const MAX_SINGLE_FILE = 100 * 1024 * 1024;
const MAX_TEXT_EXTRACTION = 10 * 1024 * 1024;

const TEXT_EXTENSIONS = new Set([
  ".txt",
  ".md",
  ".markdown",
  ".json",
  ".csv",
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".py",
  ".java",
  ".go",
  ".rs",
  ".cpp",
  ".c",
  ".h",
  ".css",
  ".scss",
  ".html",
  ".xml",
  ".yaml",
  ".yml",
  ".env.example",
]);

const MAX_COMPRESSION_RATIO = 200;
const size = entry.uncompressedSize;
const compressedSize =
  entry.compressedSize;

if (
  compressedSize === 0 &&
  size > 0
) {
  fail(
    `Suspicious compression ratio: ${filename}`,
  );
  return;
}

if (
  compressedSize > 0 &&
  size / compressedSize >
    MAX_COMPRESSION_RATIO
) {
  fail(
    `Compression ratio too high: ${filename}`,
  );
  return;
}
function isUnsafePath(filename: string): boolean {
  const normalized = filename.replace(/\\/g, "/");

  if (normalized.startsWith("/")) {
    return true;
  }

  if (/^[A-Za-z]:\//.test(normalized)) {
    return true;
  }

  return normalized
    .split("/")
    .some((segment) => segment === "..");
}

function isTextFile(filename: string): boolean {
  const lower = filename.toLowerCase();

  for (const extension of TEXT_EXTENSIONS) {
    if (lower.endsWith(extension)) {
      return true;
    }
  }

  return false;
}

export async function analyzeZip(
  data: Buffer,
): Promise<ZipAnalysisResult> {
  return new Promise((resolve, reject) => {
    yauzl.fromBuffer(
      data,
      {
        lazyEntries: true,
        decodeStrings: true,
      },
      (error, zipFile) => {
        if (error || !zipFile) {
          reject(
            error ??
              new Error("Unable to open ZIP archive."),
          );
          return;
        }

        const files: ArtifactFileEntry[] = [];
        const textFiles: Array<{
          path: string;
          content: string;
        }> = [];

        const warnings: string[] = [];
        const errors: string[] = [];

        let totalUncompressed = 0;
        let fileCount = 0;

        const fail = (message: string) => {
          errors.push(message);

          try {
            zipFile.close();
          } catch {}

          resolve({
            safe: false,
            fileCount,
            totalUncompressedBytes:
              totalUncompressed,
            files,
            textFiles,
            warnings,
            errors,
          });
        };

        zipFile.readEntry();

        zipFile.on("entry", (entry) => {
          const filename = entry.fileName;

          if (isUnsafePath(filename)) {
            fail(
              `Unsafe path detected: ${filename}`,
            );
            return;
          }

          fileCount++;

          if (fileCount > MAX_FILES) {
            fail(
              `ZIP contains more than ${MAX_FILES} files.`,
            );
            return;
          }

          const isDirectory = filename.endsWith("/");

          const size = entry.uncompressedSize;

          if (size > MAX_SINGLE_FILE) {
            fail(
              `File exceeds maximum size: ${filename}`,
            );
            return;
          }

          totalUncompressed += size;

          if (
            totalUncompressed >
            MAX_TOTAL_UNCOMPRESSED
          ) {
            fail(
              "ZIP exceeds maximum uncompressed size.",
            );
            return;
          }

          files.push({
            path: filename,
            type: isDirectory
              ? "directory"
              : isTextFile(filename)
                ? "text"
                : "binary",
            sizeBytes: size,
            compressedSizeBytes:
              entry.compressedSize,
            isDirectory,
          });

          if (
            !isDirectory &&
            isTextFile(filename) &&
            size <= MAX_TEXT_EXTRACTION
          ) {
            zipFile.openReadStream(
              entry,
              (streamError, stream) => {
                if (streamError || !stream) {
                  warnings.push(
                    `Could not read ${filename}`,
                  );

                  zipFile.readEntry();
                  return;
                }

                const chunks: Buffer[] = [];

                stream.on(
                  "data",
                  (chunk: Buffer) => {
                    chunks.push(chunk);
                  },
                );

                stream.on("end", () => {
                  textFiles.push({
                    path: filename,
                    content: Buffer.concat(
                      chunks,
                    ).toString("utf8"),
                  });

                  zipFile.readEntry();
                });

                stream.on("error", () => {
                  warnings.push(
                    `Could not extract ${filename}`,
                  );

                  zipFile.readEntry();
                });
              },
            );

            return;
          }

          zipFile.readEntry();
        });

        zipFile.on("end", () => {
          resolve({
            safe: errors.length === 0,
            fileCount,
            totalUncompressedBytes:
              totalUncompressed,
            files,
            textFiles,
            warnings,
            errors,
          });
        });

        zipFile.on("error", (zipError) => {
          reject(zipError);
        });
      },
    );
  });
}
