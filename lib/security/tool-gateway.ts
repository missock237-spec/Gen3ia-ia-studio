import {
  ExecutionPolicy,
} from "./execution-policy";

import {
  authorizeTool,
} from "./tool-permissions";

export interface ToolRequest {
  toolName: string;

  input: Record<string, unknown>;

  policy: ExecutionPolicy;
}

export function validateToolRequest(
  request: ToolRequest,
): void {
  if (
    !request.toolName
  ) {
    throw new Error(
      "Tool name is required.",
    );
  }

  if (
    typeof request.input !==
    "object" ||
    request.input === null
  ) {
    throw new Error(
      "Tool input must be an object.",
    );
  }

  authorizeTool(
    request.policy,
    request.toolName,
  );
}
