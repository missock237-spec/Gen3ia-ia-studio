import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  assertSafeExtractionPath,
} from "./path-security";

export interface SecureExtractionResult {
  root: string;
  files: string[];
}

export async function createExtractionDirectory(): Promise<string> {
  return fs.mkdtemp(
    path.join(
      os.tmpdir(),
      "gen3ia-zip-"
    )
  );
}

export async function validateExtractionTarget(
  root: string,
  archivePath: string
): Promise<string> {
  const target =
    assertSafeExtractionPath(
      root,
      archivePath
    );

  const parent =
    path.dirname(target);

  await fs.mkdir(parent, {
    recursive: true,
  });

  return target;
}
