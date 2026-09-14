import yauzl from "yauzl";
import type { ArtifactFileEntry, ZipAnalysisResult } from "../types";

const MAX_FILES = 10_000;
const MAX_TOTAL_UNCOMPRESSED = 500 * 1024 * 1024;
const MAX_SINGLE_FILE = 100 * 1024 * 1024;
const MAX_TEXT_EXTRACTION = 10 * 1024 * 1024;
const MAX_COMPRESSION_RATIO = 200;
const MAX_PATH_LENGTH = 1024;

const TEXT_EXTENSIONS = new Set([
  ".txt", ".md", ".markdown", ".json", ".csv", ".ts", ".tsx", ".js", ".jsx",
  ".mjs", ".cjs", ".py", ".java", ".go", ".rs", ".cpp", ".c", ".h", ".css",
  ".scss", ".html", ".xml", ".yaml", ".yml", ".env.example",
]);

function isUnsafePath(filename: string): boolean {
  if (filename.length > MAX_PATH_LENGTH) return true;
  const normalized = filename.replace(/\\/g, "/");
  if (normalized.startsWith("/") || /^[A-Za-z]:\//.test(normalized)) return true;
  return normalized.split("/").some((segment) => segment === "..");
}

function isTextFile(filename: string): boolean {
  const lower = filename.toLowerCase();
  return [...TEXT_EXTENSIONS].some((extension) => lower.endsWith(extension));
}

function isSymlink(entry: yauzl.Entry): boolean {
  const mode = (entry.externalFileAttributes >>> 16) & 0xffff;
  return (mode & 0xf000) === 0xa000;
}

export async function analyzeZip(data: Buffer): Promise<ZipAnalysisResult> {
  return new Promise((resolve, reject) => {
    yauzl.fromBuffer(data, { lazyEntries: true, decodeStrings: true }, (error, zipFile) => {
      if (error || !zipFile) {
        reject(error ?? new Error("Unable to open ZIP archive."));
        return;
      }

      const files: ArtifactFileEntry[] = [];
      const textFiles: Array<{ path: string; content: string }> = [];
      const warnings: string[] = [];
      const errors: string[] = [];
      let totalUncompressed = 0;
      let fileCount = 0;
      let finished = false;

      const finishUnsafe = (message: string) => {
        if (finished) return;
        finished = true;
        errors.push(message);
        try { zipFile.close(); } catch {}
        resolve({ safe: false, fileCount, totalUncompressedBytes: totalUncompressed, files, textFiles, warnings, errors });
      };

      zipFile.on("error", (zipError) => {
        if (!finished) reject(zipError);
      });

      zipFile.on("end", () => {
        if (finished) return;
        finished = true;
        resolve({ safe: errors.length === 0, fileCount, totalUncompressedBytes: totalUncompressed, files, textFiles, warnings, errors });
      });

      zipFile.on("entry", (entry) => {
        if (finished) return;
        const filename = entry.fileName;
        if (isUnsafePath(filename)) return finishUnsafe(`Unsafe ZIP path: ${filename}`);
        if (isSymlink(entry)) return finishUnsafe(`Symlink entry is not allowed: ${filename}`);

        fileCount += 1;
        if (fileCount > MAX_FILES) return finishUnsafe(`ZIP contains more than ${MAX_FILES} entries.`);

        const isDirectory = filename.endsWith("/");
        const size = entry.uncompressedSize;
        const compressedSize = entry.compressedSize;

        if (size > MAX_SINGLE_FILE) return finishUnsafe(`File exceeds maximum size: ${filename}`);
        if (compressedSize === 0 && size > 0) return finishUnsafe(`Invalid compression metadata: ${filename}`);
        if (compressedSize > 0 && size / compressedSize > MAX_COMPRESSION_RATIO) {
          return finishUnsafe(`Compression ratio too high: ${filename}`);
        }

        totalUncompressed += size;
        if (totalUncompressed > MAX_TOTAL_UNCOMPRESSED) {
          return finishUnsafe("ZIP exceeds maximum uncompressed size.");
        }

        files.push({
          path: filename,
          type: isDirectory ? "directory" : isTextFile(filename) ? "text" : "binary",
          sizeBytes: size,
          compressedSizeBytes: compressedSize,
          isDirectory,
        });

        if (!isDirectory && isTextFile(filename) && size <= MAX_TEXT_EXTRACTION) {
          zipFile.openReadStream(entry, (streamError, stream) => {
            if (finished) return;
            if (streamError || !stream) {
              warnings.push(`Could not read ${filename}`);
              zipFile.readEntry();
              return;
            }
            const chunks: Buffer[] = [];
            stream.on("data", (chunk: Buffer) => chunks.push(chunk));
            stream.on("end", () => {
              if (finished) return;
              textFiles.push({ path: filename, content: Buffer.concat(chunks).toString("utf8") });
              zipFile.readEntry();
            });
            stream.on("error", () => {
              if (finished) return;
              warnings.push(`Could not extract ${filename}`);
              zipFile.readEntry();
            });
          });
          return;
        }

        zipFile.readEntry();
      });

      zipFile.readEntry();
    });
  });
}
