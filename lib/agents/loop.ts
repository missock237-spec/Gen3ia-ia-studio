import type {
  AgentExecutionState
} from "./types";

import {
  AgentPlanner
} from "./planner";

import {
  AgentExecutor,
  StepExecutor
} from "./executor";

import {
  AgentEvaluator,
  EvaluationModel
} from "./evaluator";

export class AutonomousAgentLoop {
  private readonly planner =
    new AgentPlanner();

  private readonly executor: AgentExecutor;

  private readonly evaluator:
    AgentEvaluator;

  constructor(
    stepExecutor: StepExecutor,
    evaluationModel: EvaluationModel
  ) {
    this.executor =
      new AgentExecutor(
        stepExecutor
      );

    this.evaluator =
      new AgentEvaluator(
        evaluationModel
      );
  }

  async run(
    initialState: AgentExecutionState
  ): Promise<AgentExecutionState> {
    let state = initialState;

    if (!state.plan) {
      state = {
        ...state,
        status: "planning",
        plan:
          this.planner.createPlan(
            state.task
          )
      };
    }

    while (
      state.iteration <
      state.task.maxIterations
    ) {
      state.iteration++;

      state =
        await this.executor.execute(
          state
        );

      if (state.status === "failed") {
        return state;
      }

      state =
        await this.evaluator.evaluate(
          state
        );

      if (
        state.status === "completed"
      ) {
        state.finalResult =
          this.extractFinalResult(
            state
          );

        return state;
      }

      state =
        this.prepareRetry(state);
    }

    return {
      ...state,
      status: "failed",
      error:
        "Maximum autonomous iterations reached."
    };
  }

  private prepareRetry(
    state: AgentExecutionState
  ): AgentExecutionState {
    const lastEvaluation =
      state.evaluations.at(-1);

    if (!lastEvaluation) {
      return state;
    }

    const corrections =
      lastEvaluation
        .suggestedCorrections;

    const plan = state.plan;

    if (!plan) {
      return state;
    }

    for (const step of plan.steps) {
      if (
        step.status === "completed"
      ) {
        step.status = "pending";
      }
    }

    if (corrections.length > 0) {
      const evaluationStep =
        plan.steps.find(
          (step) =>
            step.title ===
            "Evaluation"
        );

      if (evaluationStep) {
        evaluationStep.objective =
          `Correct the previous result using:
${corrections.join("\n")}`;
      }
    }

    return {
      ...state,
      currentStepIndex: 0,
      status: "executing"
    };
  }

  private extractFinalResult(
    state: AgentExecutionState
  ): unknown {
    const evaluationStep =
      state.plan?.steps.find(
        (step) =>
          step.title === "Evaluation"
      );

    return (
      evaluationStep?.result ||
      state.plan?.steps.at(-2)?.result ||
      null
    );
  }
}
