import { ExecutionPolicy, Permission, ToolRisk, assertPermission, assertToolAllowed } from "./execution-policy";

export interface ToolSecurityDefinition {
  name: string; risk: ToolRisk; requiredPermissions: Permission[]; network?: boolean;
  filesystemRead?: boolean; filesystemWrite?: boolean; destructive?: boolean; externalApp?: boolean;
}

const TOOL_SECURITY: Record<string, ToolSecurityDefinition> = {
  "web.search": { name: "web.search", risk: "read", requiredPermissions: ["tool.read", "network.read"], network: true },
  "file.read": { name: "file.read", risk: "read", requiredPermissions: ["tool.read", "file.read"], filesystemRead: true },
  "file.create": { name: "file.create", risk: "write", requiredPermissions: ["tool.write", "file.create", "file.write"], filesystemWrite: true },
  "file.modify": { name: "file.modify", risk: "write", requiredPermissions: ["tool.write", "file.write"], filesystemWrite: true },
  "file.delete": { name: "file.delete", risk: "destructive", requiredPermissions: ["tool.destructive", "file.delete"], filesystemWrite: true, destructive: true },
  "zip.analyze": { name: "zip.analyze", risk: "read", requiredPermissions: ["tool.read", "file.read"], filesystemRead: true },
  "zip.create": { name: "zip.create", risk: "write", requiredPermissions: ["tool.write", "file.write"], filesystemRead: true, filesystemWrite: true },
  "zip.extract": { name: "zip.extract", risk: "write", requiredPermissions: ["tool.write", "file.write", "file.create"], filesystemRead: true, filesystemWrite: true },
  "artifact.create": { name: "artifact.create", risk: "write", requiredPermissions: ["tool.write", "file.write"], filesystemRead: true, filesystemWrite: true },
  "artifact.download": { name: "artifact.download", risk: "read", requiredPermissions: ["tool.read", "file.read"] },
  "composio.execute": { name: "composio.execute", risk: "external", requiredPermissions: ["tool.external", "tool.write", "network.write"], network: true, externalApp: true },
  "code.execute": { name: "code.execute", risk: "destructive", requiredPermissions: ["code.execute"] },
  "terminal.execute": { name: "terminal.execute", risk: "destructive", requiredPermissions: ["terminal.execute"] },
  "memory.read": { name: "memory.read", risk: "read", requiredPermissions: ["tool.read", "memory.read"] },
  "memory.write": { name: "memory.write", risk: "write", requiredPermissions: ["tool.write", "memory.write"] },
  "camera.capture": { name: "camera.capture", risk: "external", requiredPermissions: ["tool.external", "camera.capture"], externalApp: true },
  "ads.read": { name: "ads.read", risk: "read", requiredPermissions: ["tool.read", "ads.read"] },
  "ads.publish": { name: "ads.publish", risk: "external", requiredPermissions: ["tool.external", "tool.write", "ads.write", "network.write"], network: true, externalApp: true },
};

export function getToolSecurityDefinition(toolName: string): ToolSecurityDefinition {
  const definition = TOOL_SECURITY[toolName];
  if (!definition) throw new Error(`Unknown tool security definition: ${toolName}`);
  return definition;
}

export function authorizeTool(policy: ExecutionPolicy, toolName: string): ToolSecurityDefinition {
  assertToolAllowed(policy, toolName);
  const definition = getToolSecurityDefinition(toolName);
  for (const permission of definition.requiredPermissions) assertPermission(policy, permission);
  if (definition.network && !policy.allowNetwork) throw new Error(`Network access denied for tool: ${toolName}`);
  if (definition.externalApp && !policy.allowExternalApps) throw new Error(`External application access denied: ${toolName}`);
  if (definition.filesystemWrite && !policy.allowFileWrite) throw new Error(`Filesystem write denied: ${toolName}`);
  if (definition.destructive && !policy.allowFileDelete && !["code.execute", "terminal.execute"].includes(toolName)) throw new Error(`Destructive operation denied: ${toolName}`);
  if (toolName === "code.execute" && !policy.allowCodeExecution) throw new Error("Code execution denied by policy");
  if (toolName === "terminal.execute" && !policy.allowAgentTerminal) throw new Error("Agent terminal denied by policy");
  if (toolName === "camera.capture" && !policy.allowCamera) throw new Error("Camera access denied by policy");
  return definition;
}
