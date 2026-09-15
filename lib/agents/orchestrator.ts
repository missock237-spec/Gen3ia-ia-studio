import { randomUUID } from "node:crypto";
import { AgentRuntime } from "@/lib/agents/runtime/runner";
import type { RuntimePlan, RuntimeStep } from "@/lib/agents/runtime/types";
import { DEFAULT_EXECUTION_POLICY, type ExecutionPolicy } from "@/lib/security/execution-policy";
import { getCustomerContext } from "@/lib/agents/memory/customer-context";
import { assertUserWalletActive } from "@/lib/billing/wallet";

export type AgentRole = "customer_service" | "sales" | "content" | "admin" | "analytics";
export interface AgentDefinition { id: AgentRole; name: string; mission: string; capabilities: string[]; policy: ExecutionPolicy; }
export interface OrchestratorTask { userId: string; objective: string; context?: Record<string, unknown>; customerId?: string; requestedRoles?: AgentRole[]; signal?: AbortSignal; }
export interface OrchestratorResult { executionId: string; roles: AgentRole[]; state: Awaited<ReturnType<AgentRuntime["run"]>>; summary: string; }

const READ_POLICY: ExecutionPolicy = { ...DEFAULT_EXECUTION_POLICY, allowedTools: ["web.search", "file.read"], permissions: ["tool.read", "file.read", "network.read"], allowNetwork: true };

const AGENTS: Record<AgentRole, AgentDefinition> = {
  customer_service: { id: "customer_service", name: "Customer Service Agent", mission: "Gérer les demandes clients, FAQ, réclamations, qualification et escalade humaine.", capabilities: ["multilingual support", "FAQ", "customer context", "triage", "human escalation"], policy: READ_POLICY },
  sales: { id: "sales", name: "Sales Agent", mission: "Qualifier les prospects, préparer les suivis, rendez-vous, offres et recommandations commerciales.", capabilities: ["lead qualification", "follow-up", "appointment preparation", "offer drafting", "pipeline analysis"], policy: READ_POLICY },
  content: { id: "content", name: "Content Agent", mission: "Produire et décliner des contenus marketing pour TikTok, Instagram, SEO, newsletters et campagnes.", capabilities: ["social content", "SEO", "short-video scripts", "newsletter", "content calendar"], policy: READ_POLICY },
  admin: { id: "admin", name: "Admin Agent", mission: "Automatiser et analyser les opérations administratives, planning, reporting et données structurées.", capabilities: ["reports", "scheduling", "invoice preparation", "inventory alerts", "spreadsheet analysis"], policy: READ_POLICY },
  analytics: { id: "analytics", name: "Business Intelligence Agent", mission: "Analyser marché, concurrence, tendances, performances et opportunités afin d'aider à la décision.", capabilities: ["research", "competitor analysis", "trend analysis", "forecasting", "recommendations"], policy: READ_POLICY },
};

const ROLE_KEYWORDS: Record<AgentRole, string[]> = {
  customer_service: ["client", "customer", "support", "sav", "réclamation", "plainte", "whatsapp", "telegram", "faq"],
  sales: ["vente", "sales", "lead", "prospect", "devis", "quote", "rendez-vous", "appointment", "conversion", "crm"],
  content: ["contenu", "content", "tiktok", "instagram", "seo", "newsletter", "post", "vidéo", "script", "marketing"],
  admin: ["admin", "facture", "invoice", "planning", "stock", "inventaire", "excel", "rapport", "agenda"],
  analytics: ["analyse", "analytics", "concurrence", "concurrent", "marché", "trend", "tendance", "prévision", "insight", "business intelligence"],
};

export function getAgentDefinition(role: AgentRole): AgentDefinition { return AGENTS[role]; }
export function listAgentDefinitions(): AgentDefinition[] { return Object.values(AGENTS); }

export function classifyRoles(objective: string, requestedRoles?: AgentRole[]): AgentRole[] {
  if (requestedRoles?.length) return [...new Set(requestedRoles)];
  const normalized = objective.toLocaleLowerCase();
  const scores = (Object.keys(ROLE_KEYWORDS) as AgentRole[]).map((role) => ({ role, score: ROLE_KEYWORDS[role].reduce((n, word) => n + (normalized.includes(word) ? 1 : 0), 0) }));
  const selected = scores.filter((x) => x.score > 0).sort((a, b) => b.score - a.score).map((x) => x.role);
  return selected.length ? selected.slice(0, 4) : ["analytics"];
}

function buildSteps(task: OrchestratorTask, roles: AgentRole[], context: Record<string, unknown>): RuntimeStep[] {
  const steps: RuntimeStep[] = roles.map((role) => {
    const definition = AGENTS[role];
    const isResearch = role === "analytics";
    return {
      id: `agent-${role}`, type: isResearch ? "research" : "llm", name: definition.name,
      description: `${definition.mission} Travaille comme membre d'une équipe multi-agent. Retourne des résultats structurés et directement exploitables par l'orchestrateur. Capacités: ${definition.capabilities.join(", ")}.`,
      dependencies: [], status: "pending",
      input: isResearch ? { query: task.objective, maxResults: 10, context } : { context, role, instruction: task.objective },
      toolName: isResearch ? "web.search" : undefined, skillIds: [], maxRetries: 2, timeoutMs: 120_000,
      sideEffect: false, requiresApproval: false, agentRole: role,
    };
  });
  steps.push({
    id: "orchestrator-synthesis", type: "llm", name: "Orchestrator Synthesis",
    description: "Fusionner les sorties de toute l'équipe en une réponse opérationnelle unique. Distinguer faits, recommandations, actions proposées, dépendances et points nécessitant une validation humaine.",
    dependencies: roles.map((role) => `agent-${role}`), status: "pending",
    input: { context, instruction: task.objective, team: roles }, skillIds: [], maxRetries: 2, timeoutMs: 120_000,
    sideEffect: false, requiresApproval: false, agentRole: "orchestrator",
  });
  return steps;
}

export function createOrchestratorPlan(task: OrchestratorTask): { executionId: string; roles: AgentRole[]; plan: RuntimePlan } {
  const executionId = randomUUID();
  const roles = classifyRoles(task.objective, task.requestedRoles);
  const context = { ...(task.context ?? {}), ...(task.customerId ? { customerId: task.customerId } : {}) };
  return { executionId, roles, plan: { executionId, objective: task.objective, steps: buildSteps(task, roles, context), maxConcurrency: Math.min(4, roles.length), maxIterations: 20 } };
}

export async function runOrchestrator(task: OrchestratorTask): Promise<OrchestratorResult> {
  if (!task.userId?.trim()) throw new Error("Orchestrator requires userId");
  if (!task.objective?.trim()) throw new Error("Orchestrator requires objective");

  // Authoritative wallet gate: no new agent execution may start at zero balance.
  // AgentRuntime and every billable tool/LLM operation enforce the same gate while running.
  await assertUserWalletActive(task.userId);

  const persistedCustomer = task.customerId ? await getCustomerContext(task.userId, task.customerId) : null;
  const effectiveTask: OrchestratorTask = {
    ...task,
    context: { ...(task.context ?? {}), ...(task.customerId ? { customerId: task.customerId } : {}), ...(persistedCustomer ? { customer: persistedCustomer } : {}) },
  };
  const { executionId, roles, plan } = createOrchestratorPlan(effectiveTask);
  const policy: ExecutionPolicy = { ...DEFAULT_EXECUTION_POLICY, allowedTools: ["web.search", "file.read"], permissions: ["tool.read", "file.read", "network.read"], maxSteps: Math.max(DEFAULT_EXECUTION_POLICY.maxSteps, plan.steps.length + 5), allowNetwork: true };
  const runtime = new AgentRuntime({ userId: task.userId, objective: task.objective, plan, policy, signal: task.signal });
  const state = await runtime.run();
  const synthesis = state.outputs["orchestrator-synthesis"];
  const summary = typeof synthesis === "string" ? synthesis : "Équipe multi-agent exécutée; consultez les sorties de l'exécution pour le détail.";
  return { executionId, roles, state, summary };
}
