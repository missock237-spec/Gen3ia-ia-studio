import fs from "node:fs/promises";
import path from "node:path";

import {
  assertSafeExtractionPath,
} from "./zip/path-security";

export interface FileWriteRequest {
  workspaceRoot: string;
  relativePath: string;
  content: string | Buffer;
}

export interface FileReadRequest {
  workspaceRoot: string;
  relativePath: string;
}

export async function writeWorkspaceFile(
  request: FileWriteRequest
): Promise<string> {
  const target =
    assertSafeExtractionPath(
      request.workspaceRoot,
      request.relativePath
    );

  await fs.mkdir(
    path.dirname(target),
    {
      recursive: true,
    }
  );

  await fs.writeFile(
    target,
    request.content
  );

  return request.relativePath;
}

export async function readWorkspaceFile(
  request: FileReadRequest
): Promise<Buffer> {
  const target =
    assertSafeExtractionPath(
      request.workspaceRoot,
      request.relativePath
    );

  return fs.readFile(target);
}

export async function deleteWorkspaceFile(
  request: FileReadRequest
): Promise<void> {
  const target =
    assertSafeExtractionPath(
      request.workspaceRoot,
      request.relativePath
    );

  await fs.rm(target, {
    force: true,
  });
}
