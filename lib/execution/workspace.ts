import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";

export interface ExecutionWorkspace {
  id: string;
  root: string;
}

export async function createExecutionWorkspace(
  executionId: string
): Promise<ExecutionWorkspace> {
  const safeId =
    crypto
      .createHash("sha256")
      .update(executionId)
      .digest("hex")
      .slice(0, 24);

  const root =
    await fs.mkdtemp(
      path.join(
        os.tmpdir(),
        `gen3ia-${safeId}-`
      )
    );

  return {
    id: safeId,
    root,
  };
}

export async function destroyExecutionWorkspace(
  workspace: ExecutionWorkspace
): Promise<void> {
  await fs.rm(
    workspace.root,
    {
      recursive: true,
      force: true,
    }
  );
}
