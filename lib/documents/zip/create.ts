import archiver from "archiver";

export interface ZipEntry {
  filename: string;
  data: Buffer;
}

function assertSafeZipPath(filename: string): void {
  if (!filename) {
    throw new Error("ZIP filename cannot be empty.");
  }

  if (filename.startsWith("/")) {
    throw new Error(
      `Absolute ZIP path rejected: ${filename}`,
    );
  }

  if (/^[A-Za-z]:[\\/]/.test(filename)) {
    throw new Error(
      `Windows absolute ZIP path rejected: ${filename}`,
    );
  }

  const normalized = filename.replace(/\\/g, "/");

  if (
    normalized
      .split("/")
      .some((segment) => segment === "..")
  ) {
    throw new Error(
      `Path traversal rejected: ${filename}`,
    );
  }
}

export async function createZip(
  entries: ZipEntry[],
): Promise<Buffer> {
  if (!entries.length) {
    throw new Error(
      "Cannot create an empty ZIP archive.",
    );
  }

  for (const entry of entries) {
    assertSafeZipPath(entry.filename);
  }

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];

    const archive = archiver("zip", {
      zlib: {
        level: 9,
      },
    });

    archive.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });

    archive.on("error", reject);

    archive.on("end", () => {
      resolve(Buffer.concat(chunks));
    });

    for (const entry of entries) {
      archive.append(entry.data, {
        name: entry.filename.replace(/\\/g, "/"),
      });
    }

    archive.finalize().catch(reject);
  });
}
