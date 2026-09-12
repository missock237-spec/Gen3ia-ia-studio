export interface MCPServerConfig {
  id: string;

  name: string;

  url: string;

  enabled: boolean;

  authentication:
    | "none"
    | "bearer"
    | "api_key";

  secretEnv?: string;
}

export interface MCPTool {
  name: string;

  description?: string;

  inputSchema?: unknown;
}

export interface MCPToolCall {
  serverId: string;

  toolName: string;

  arguments: Record<
    string,
    unknown
  >;
}
