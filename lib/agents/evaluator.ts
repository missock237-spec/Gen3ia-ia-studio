import type {
  AgentExecutionState,
  EvaluationResult
} from "./types";

export interface EvaluationModel {
  evaluate(input: {
    objective: string;
    result: unknown;
    requirements: string[];
  }): Promise<EvaluationResult>;
}

export class AgentEvaluator {
  constructor(
    private readonly model: EvaluationModel
  ) {}

  async evaluate(
    state: AgentExecutionState
  ): Promise<AgentExecutionState> {
    const result =
      await this.model.evaluate({
        objective:
          state.task.objective,

        result:
          this.collectResults(state),

        requirements:
          state.task.constraints || []
      });

    return {
      ...state,

      evaluations: [
        ...state.evaluations,
        result
      ],

      status:
        result.passed
          ? "completed"
          : "executing"
    };
  }

  private collectResults(
    state: AgentExecutionState
  ): Record<string, unknown> {
    return Object.fromEntries(
      state.plan?.steps
        .filter(
          (step) =>
            step.result !== undefined
        )
        .map((step) => [
          step.id,
          step.result
        ]) || []
    );
  }
}
