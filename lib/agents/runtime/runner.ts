import { randomUUID } from "crypto";

import { generate } from "@/lib/ai/router";
import {
  executeTool,
  toolRegistry,
} from "@/lib/tools";

import {
  RuntimeExecutionState,
  RuntimeObservation,
  RuntimePlan,
  RuntimeStep,
} from "./types";

import {
  createCheckpoint,
  saveCheckpoint,
} from "./checkpoint";

import {
  getReadySteps,
  validateDAG,
} from "./dag";

import {
  critiqueExecution,
} from "@/lib/agents/critic/service";

import {
  applyCorrections,
} from "@/lib/agents/critic/corrector";

import { RuntimeScheduler } from "./scheduler";

import {
  buildAgentContext,
} from "./context-builder";

import {
  writeMemory,
} from "@/lib/memory/service";

export interface RuntimeRunnerOptions {
  userId: string;

  objective: string;

  plan: RuntimePlan;

  signal?: AbortSignal;
}

export class AgentRuntime {
  private state: RuntimeExecutionState;

  private readonly scheduler: RuntimeScheduler;

  private readonly signal?: AbortSignal;

  constructor(options: RuntimeRunnerOptions) {
    const validation =
      validateDAG(options.plan);

if (
  this.state.totalRetries >=
  this.state.maxTotalRetries
) {
  this.state.status = "failed";

  this.state.error =
    "Global retry budget exhausted.";

  this.state.completedAt =
    new Date().toISOString();

  await saveCheckpoint(
    this.state,
  );

  return this.state;
}

this.state.totalRetries++;
    
    if (!validation.valid) {
      throw new Error(
        `Invalid agent DAG:\n${validation.errors.join(
          "\n",
        )}`,
      );
    }

    this.signal = options.signal;

    this.scheduler =
      new RuntimeScheduler(
        options.plan.maxConcurrency,
      );

    this.state = {
      executionId:
        options.plan.executionId ||
        randomUUID(),

      userId: options.userId,

      objective: options.objective,

      status: "pending",

      plan: options.plan,

      observations: [],

      evaluations: [],

      outputs: {},

      iteration: 0,
    };
  }

  async run(): Promise<RuntimeExecutionState> {
    this.state.status = "running";

    this.state.startedAt =
      new Date().toISOString();

    await createCheckpoint(this.state);

    try {
      while (
        this.state.iteration <
        this.state.plan.maxIterations
      ) {
        this.throwIfCancelled();

        this.state.iteration++;

        const completed =
          this.getCompletedSteps();

        const ready =
          getReadySteps(
            this.state.plan,
            completed,
            new Set(
              this.scheduler.getRunning(),
            ),
          );

        if (
          ready.length === 0 &&
          this.scheduler.getRunning().length === 0
        ) {
          break;
        }

        const executable = ready.slice(
          0,
          this.scheduler.capacity,
        );

        await Promise.all(
          executable.map((step) =>
            this.executeStep(step),
          ),
        );

        await saveCheckpoint(this.state);
      }

      this.finalize();

      await saveCheckpoint(this.state);

      return this.state;
    } catch (error) {
      this.state.status = "failed";

      this.state.error =
        error instanceof Error
          ? error.message
          : String(error);

      this.state.completedAt =
        new Date().toISOString();

      await saveCheckpoint(this.state);

      throw error;
    }
  }

private areAllStepsFinished(): boolean {
  return this.state.plan.steps.every(
    (step) =>
      step.status === "completed" ||
      step.status === "skipped",
  );
}
  
  private async executeStep(
    step: RuntimeStep,
  ): Promise<void> {
    this.scheduler.start(step);

    step.status = "running";

    const startedAt = Date.now();

    try {
      const output =
        await this.withTimeout(
          this.dispatch(step),
          step.timeoutMs,
        );

      step.output = output;
      step.status = "completed";

      this.state.outputs[step.id] =
        output;

      const observation:
        RuntimeObservation = {
          stepId: step.id,
          success: true,
          output,
          latencyMs:
            Date.now() - startedAt,
          timestamp:
            new Date().toISOString(),
        };

      this.state.observations.push(
        observation,
      );
    } catch (error) {
      step.status = "failed";

      const message =
        error instanceof Error
          ? error.message
          : String(error);

      this.state.observations.push({
        stepId: step.id,
        success: false,
        error: message,
        latencyMs:
          Date.now() - startedAt,
        timestamp:
          new Date().toISOString(),
      });

      if (
        step.sideEffect ||
        step.maxRetries <= 0
      ) {
        throw error;
      }

      step.maxRetries--;

      step.status = "pending";
    } finally {
      this.scheduler.finish(step);

      await saveCheckpoint(this.state);
    }
  }

  private async dispatch(
    step: RuntimeStep,
  ): Promise<unknown> {
    switch (step.type) {
      case "llm":
        return this.executeLLM(step);

      case "tool":
        return this.executeTool(step);

      case "research":
        return this.executeTool({
          ...step,
          toolName:
            step.toolName ?? "web.search",
        });

      case "document":
      case "media":
      case "code":
        return this.executeLLM(step);

      case "condition":
        return this.evaluateCondition(step);

      default:
        throw new Error(
          `Unsupported runtime step: ${step.type}`,
        );
    }
  }

  private async executeLLM(
    step: RuntimeStep,
  ): Promise<unknown> {
    const dependencyContext =
      this.getDependencyOutputs(step);

    const response = await generate({
      taskType:
        step.type === "research"
          ? "research"
          : step.type === "code"
            ? "coding"
            : "agent",

      messages: [
        {
          role: "system",
          content:
            "You are an autonomous Gen3ia agent. Execute the assigned step precisely. Do not invent external results.",
        },
        {
          role: "user",
          content: JSON.stringify({
            objective:
              this.state.objective,

            step: {
              id: step.id,
              name: step.name,
              description:
                step.description,
              input: step.input,
            },

            dependencies:
              dependencyContext,
          }),
        },
      ],
    });

    return response.content;
  }

const response = await generate({
  taskType:
    step.type === "research"
      ? "research"
      : step.type === "code"
        ? "coding"
        : "agent",

  messages: [
    {
      role: "system",
      content:
        "You are an autonomous Gen3ia agent. Use retrieved context when relevant. Do not claim retrieved information as current external truth unless it is verified.",
    },

    {
      role: "user",
      content: JSON.stringify({
        objective:
          this.state.objective,

        step: {
          id: step.id,
          name: step.name,
          description:
            step.description,
          input: step.input,
        },

        dependencies:
          dependencyContext,

        retrievedContext:
          ragContext,
      }),
    },
  ],
});
  
  private async executeTool(
    step: RuntimeStep,
  ): Promise<unknown> {
    if (!step.toolName) {
      throw new Error(
        `Tool step ${step.id} has no toolName`,
      );
    }

    const dependencyContext =
      this.getDependencyOutputs(step);

    const result = await executeTool({
      userId: this.state.userId,

      executionId:
        this.state.executionId,

      toolName: step.toolName,

      input: {
        ...step.input,

        dependencies:
          dependencyContext,
      },

      signal: this.signal,
    });

    if (!result.success) {
      throw new Error(
        result.error ??
          `Tool ${step.toolName} failed`,
      );
    }

    return result.output;
  }

  private evaluateCondition(
    step: RuntimeStep,
  ): boolean {
    const input =
      step.input as {
        expression?: string;
      };

    if (!input.expression) {
      return true;
    }

    return Boolean(
      this.state.outputs[
        input.expression
      ],
    );
  }

  private getDependencyOutputs(
    step: RuntimeStep,
  ): Record<string, unknown> {
    const result: Record<
      string,
      unknown
    > = {};

    for (const dependency of step.dependencies) {
      result[dependency] =
        this.state.outputs[dependency];
    }

    return result;
  }

  private getCompletedSteps(): Set<string> {
    return new Set(
      this.state.plan.steps
        .filter(
          (step) =>
            step.status === "completed",
        )
        .map((step) => step.id),
    );
  }

  private async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
  ): Promise<T> {
    return Promise.race([
      promise,

      new Promise<T>((_, reject) => {
        const timer = setTimeout(() => {
          reject(
            new Error(
              `Step timeout after ${timeoutMs}ms`,
            ),
          );
        }, timeoutMs);

        promise.finally(() =>
          clearTimeout(timer),
        );
      }),
    ]);
  }

  private throwIfCancelled(): void {
    if (this.signal?.aborted) {
      this.state.status =
        "cancelled";

      throw new Error(
        "Agent execution cancelled",
      );
    }
  }

  private finalize(): void {
    const hasFailures =
      this.state.plan.steps.some(
        (step) =>
          step.status === "failed",
      );

    if (hasFailures) {
      this.state.status = "failed";
    } else {
      this.state.status =
        "completed";
    }

    this.state.completedAt =
      new Date().toISOString();
  }
}
