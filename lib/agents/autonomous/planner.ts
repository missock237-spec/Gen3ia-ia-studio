import { randomUUID } from "node:crypto";
import type { AgentNode, MultiAgentPlan } from "@/lib/agents/orchestrator/types";

export interface AutonomousTask {
  userId: string;
  projectId?: string;
  agentId?: string;
  objective: string;
  context?: string;
  constraints?: string[];
  autonomous?: boolean;
  maxIterations?: number;
}

function contains(text: string, values: string[]): boolean {
  const normalized = text.toLowerCase();
  return values.some((value) => normalized.includes(value));
}

export function createAutonomousPlan(task: AutonomousTask): MultiAgentPlan {
  const objective = task.objective.trim();
  if (objective.length < 3) throw new Error("The objective must contain at least 3 characters.");

  const agents: AgentNode[] = [];
  const requiresResearch = contains(objective, ["research", "recherche", "cherche", "internet", "web", "source", "actualité", "actualités"]);
  const requiresCoding = contains(objective, ["code", "coder", "application", "app", "logiciel", "software", "site", "github", "api", "programmer", "développer", "développe"]);
  const requiresFiles = contains(objective, ["fichier", "fichiers", "document", "pdf", "docx", "excel", "xlsx", "zip", "archive", "projet"]);

  if (requiresResearch) {
    agents.push({
      id: `researcher-${randomUUID()}`,
      role: "researcher",
      objective: "Research the information required to complete the main objective and distinguish verified information from assumptions.",
      dependencies: [],
      requiredSkills: ["web-research", "source-verification"],
      requiredTools: ["web.search"],
      maxIterations: 5,
      requiresApproval: false,
    });
  }

  if (requiresCoding) {
    agents.push({
      id: `developer-${randomUUID()}`,
      role: "developer",
      objective: "Design, implement and test the requested software solution using the secure execution environment.",
      dependencies: agents.map((agent) => agent.id),
      requiredSkills: ["software-engineering", "code-generation", "testing", "code-review"],
      requiredTools: ["file.read", "file.create", "file.modify", "code.execute"],
      maxIterations: 10,
      requiresApproval: true,
    });
  }

  if (requiresFiles) {
    agents.push({
      id: `file-manager-${randomUUID()}`,
      role: "file_manager",
      objective: "Create, analyze, transform and package the requested files while enforcing archive and path security.",
      dependencies: agents.map((agent) => agent.id),
      requiredSkills: ["file-management", "zip-processing", "artifact-management"],
      requiredTools: ["file.read", "file.create", "zip.analyze", "zip.create", "artifact.create"],
      maxIterations: 5,
      requiresApproval: false,
    });
  }

  agents.push({
    id: `reviewer-${randomUUID()}`,
    role: "reviewer",
    objective: "Review all generated results against the original objective, identify defects and propose corrections.",
    dependencies: agents.map((agent) => agent.id),
    requiredSkills: ["quality-control", "self-evaluation"],
    requiredTools: [],
    maxIterations: 5,
    requiresApproval: false,
  });

  return { executionId: randomUUID(), objective, agents, maxConcurrency: 4 };
}
