import { z } from "zod";

export const AgentRoleSchema = z.enum([
  "planner",
  "researcher",
  "coder",
  "developer",
  "file_manager",
  "reviewer",
  "tester",
  "publisher",
  "general",
]);

export type AgentRole = z.infer<typeof AgentRoleSchema>;

export const AgentMessageSchema = z.object({
  id: z.string(),
  fromAgentId: z.string(),
  toAgentId: z.string().optional(),
  role: AgentRoleSchema,
  content: z.string(),
  metadata: z.record(z.string(), z.unknown()).default({}),
  createdAt: z.string(),
});

export type AgentMessage = z.infer<typeof AgentMessageSchema>;

export const AgentNodeSchema = z.object({
  id: z.string(),
  role: AgentRoleSchema,
  objective: z.string(),
  dependencies: z.array(z.string()).default([]),
  requiredSkills: z.array(z.string()).default([]),
  requiredTools: z.array(z.string()).default([]),
  maxIterations: z.number().int().min(1).max(50).default(5),
  requiresApproval: z.boolean().default(false),
});

export type AgentNode = z.infer<typeof AgentNodeSchema>;

export const MultiAgentPlanSchema = z.object({
  executionId: z.string(),
  objective: z.string(),
  agents: z.array(AgentNodeSchema).min(1),
  maxConcurrency: z.number().int().min(1).max(16).default(4),
});

export type MultiAgentPlan = z.infer<
  typeof MultiAgentPlanSchema
>;

export interface AgentResult {
  agentId: string;
  success: boolean;
  output?: unknown;
  error?: string;
  durationMs: number;
}

export interface MultiAgentExecutionState {
  executionId: string;
  status:
    | "pending"
    | "running"
    | "completed"
    | "failed"
    | "cancelled";

  results: Record<string, AgentResult>;

  messages: AgentMessage[];

  startedAt?: string;
  completedAt?: string;
    }
