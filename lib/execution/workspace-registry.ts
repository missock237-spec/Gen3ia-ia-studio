import type {
  ExecutionWorkspace,
} from "./workspace";

interface WorkspaceRecord
  extends ExecutionWorkspace {
  ownerId: string;
  executionId: string;
  createdAt: number;
}

const workspaces =
  new Map<string, WorkspaceRecord>();

export function registerWorkspace(
  workspace: ExecutionWorkspace,
  ownerId: string,
  executionId: string
): void {
  workspaces.set(
    workspace.id,
    {
      ...workspace,
      ownerId,
      executionId,
      createdAt: Date.now(),
    }
  );
}

export function getWorkspace(
  workspaceId: string
): WorkspaceRecord | null {
  return (
    workspaces.get(workspaceId) ??
    null
  );
}

export function assertWorkspaceOwner(
  workspaceId: string,
  ownerId: string
): WorkspaceRecord {
  const workspace =
    getWorkspace(workspaceId);

  if (
    !workspace ||
    workspace.ownerId !== ownerId
  ) {
    throw new Error(
      "Workspace access denied"
    );
  }

  return workspace;
}

export function removeWorkspace(
  workspaceId: string
): void {
  workspaces.delete(workspaceId);
}
