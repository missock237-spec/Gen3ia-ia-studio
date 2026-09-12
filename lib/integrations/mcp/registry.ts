import type {
  MCPServerConfig,
} from "./types";

const servers =
  new Map<
    string,
    MCPServerConfig
  >();

export function registerMCPServer(
  server: MCPServerConfig,
) {
  servers.set(
    server.id,
    server,
  );
}

export function getMCPServer(
  id: string,
) {
  return servers.get(id);
}

export function listMCPServers() {
  return [
    ...servers.values(),
  ].filter(
    (server) =>
      server.enabled,
  );
}
