import { executeSandbox } from "@/lib/sandbox/client";
import type { SandboxLimits, SandboxRuntime } from "@/lib/sandbox/types";

const MAX_COMMAND_LENGTH = 50_000;
const MAX_OUTPUT_BYTES = 1_000_000;

export interface AgentTerminalRequest {
  userId: string;
  executionId: string;
  runtime: SandboxRuntime;
  command: string;
  cwd?: string;
  timeoutMs?: number;
  memoryMb?: number;
}

const DENIED_PATTERNS = [
  /(^|\s)(sudo|su)\b/i,
  /rm\s+-rf\s+\//i,
  /mkfs\b/i,
  /:\(\)\s*\{\s*:\|:&\s*\};:/,
  /curl\s+[^\n]*\|\s*(ba)?sh/i,
  /wget\s+[^\n]*\|\s*(ba)?sh/i,
  /shutdown|reboot|poweroff/i,
];

function assertCommandSafe(command: string): void {
  if (!command.trim()) throw new Error("Terminal command cannot be empty.");
  if (command.length > MAX_COMMAND_LENGTH) throw new Error("Terminal command is too large.");
  if (DENIED_PATTERNS.some((pattern) => pattern.test(command))) {
    throw new Error("Terminal command rejected by Gen3ia safety policy.");
  }
}

export async function executeAgentTerminal(params: AgentTerminalRequest) {
  assertCommandSafe(params.command);
  if (!params.userId || !params.executionId) throw new Error("Agent terminal requires an authenticated execution.");
  const limits: SandboxLimits = {
    timeoutMs: Math.min(Math.max(params.timeoutMs ?? 30_000, 100), 120_000),
    memoryMb: Math.min(Math.max(params.memoryMb ?? 512, 64), 2_048),
    cpu: 1,
    maxOutputBytes: MAX_OUTPUT_BYTES,
  };
  return executeSandbox({
    executionId: params.executionId,
    userId: params.userId,
    runtime: params.runtime,
    code: params.command,
    input: { cwd: params.cwd ?? "/workspace" },
    limits,
    network: "none",
  });
}
