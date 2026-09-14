import type { AgentResult, MultiAgentExecutionState, MultiAgentPlan, AgentNode } from "./types";

export interface AgentExecutor {
  execute(
    agent: AgentNode,
    context: { objective: string; dependencyResults: Record<string, unknown> },
  ): Promise<unknown>;
}

export class MultiAgentOrchestrator {
  constructor(private readonly executor: AgentExecutor) {}

  async run(plan: MultiAgentPlan): Promise<MultiAgentExecutionState> {
    const state: MultiAgentExecutionState = {
      executionId: plan.executionId,
      status: "running",
      results: {},
      messages: [],
      startedAt: new Date().toISOString(),
    };

    try {
      const completed = new Set<string>();
      const knownIds = new Set(plan.agents.map((agent) => agent.id));

      for (const agent of plan.agents) {
        for (const dependency of agent.dependencies) {
          if (!knownIds.has(dependency)) throw new Error(`Unknown agent dependency: ${dependency}`);
          if (dependency === agent.id) throw new Error(`Agent cannot depend on itself: ${agent.id}`);
        }
      }

      let guard = 0;
      const maxRounds = Math.max(1, plan.agents.length * 2);

      while (completed.size < plan.agents.length && guard < maxRounds) {
        guard++;
        const ready = plan.agents.filter(
          (agent) => !completed.has(agent.id) && agent.dependencies.every((dependency) => completed.has(dependency)),
        );

        if (ready.length === 0) throw new Error("Multi-agent plan cannot make progress. Check dependencies for a cycle or failed prerequisite.");

        const batch = ready.slice(0, plan.maxConcurrency);
        const results = await Promise.all(batch.map(async (agent) => {
          const started = Date.now();
          try {
            const dependencyResults = Object.fromEntries(
              agent.dependencies.map((dependency) => [dependency, state.results[dependency]?.output]),
            );
            const output = await this.executor.execute(agent, {
              objective: plan.objective,
              dependencyResults,
            });
            return { agentId: agent.id, success: true, output, durationMs: Date.now() - started } satisfies AgentResult;
          } catch (error) {
            return {
              agentId: agent.id,
              success: false,
              error: error instanceof Error ? error.message : String(error),
              durationMs: Date.now() - started,
            } satisfies AgentResult;
          }
        }));

        for (const result of results) {
          state.results[result.agentId] = result;
          if (!result.success) {
            state.status = "failed";
            state.error = result.error;
            state.completedAt = new Date().toISOString();
            return state;
          }
          completed.add(result.agentId);
        }
      }

      if (completed.size !== plan.agents.length) throw new Error("Multi-agent execution exceeded its scheduling guard.");
      state.status = "completed";
      state.completedAt = new Date().toISOString();
      return state;
    } catch (error) {
      state.status = "failed";
      state.error = error instanceof Error ? error.message : String(error);
      state.completedAt = new Date().toISOString();
      return state;
    }
  }
}
