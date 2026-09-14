import fs from "node:fs/promises";
import path from "node:path";

function normalizeRelativePath(
  relativePath: string,
): string {
  const normalized = relativePath
    .replace(/\\/g, "/")
    .trim();

  if (!normalized) {
    throw new Error(
      "File path cannot be empty.",
    );
  }

  if (
    normalized.startsWith("/") ||
    normalized.startsWith("//")
  ) {
    throw new Error(
      "Absolute paths are forbidden.",
    );
  }

  if (/^[A-Za-z]:\//.test(normalized)) {
    throw new Error(
      "Windows absolute paths are forbidden.",
    );
  }

  const result =
    path.posix.normalize(normalized);

  if (
    result === ".." ||
    result.startsWith("../")
  ) {
    throw new Error(
      "Path traversal detected.",
    );
  }

  return result;
}

export function resolveWorkspacePath(
  workspaceRoot: string,
  relativePath: string,
): string {
  const root =
    path.resolve(workspaceRoot);

  const safe =
    normalizeRelativePath(relativePath);

  const resolved =
    path.resolve(root, safe);

  if (
    resolved !== root &&
    !resolved.startsWith(
      `${root}${path.sep}`,
    )
  ) {
    throw new Error(
      "Workspace boundary violation.",
    );
  }

  return resolved;
}

export async function writeWorkspaceFile(
  workspaceRoot: string,
  relativePath: string,
  content: string | Buffer,
): Promise<void> {
  const target = resolveWorkspacePath(
    workspaceRoot,
    relativePath,
  );

  await fs.mkdir(
    path.dirname(target),
    {
      recursive: true,
    },
  );

  await fs.writeFile(
    target,
    content,
  );
}

export async function readWorkspaceFile(
  workspaceRoot: string,
  relativePath: string,
): Promise<Buffer> {
  const target = resolveWorkspacePath(
    workspaceRoot,
    relativePath,
  );

  return fs.readFile(target);
}

export async function deleteWorkspaceFile(
  workspaceRoot: string,
  relativePath: string,
): Promise<void> {
  const target = resolveWorkspacePath(
    workspaceRoot,
    relativePath,
  );

  await fs.rm(target, {
    force: true,
  });
}
