import type {
  AgentPlan,
  AgentTask
} from "./types";

import type {
  TaskType,
} from "@/lib/ai/models";

import { TaskAnalyzer } from "./task-analyzer";

import {
  selectModel
} from "@/lib/ai/router";

export class AgentPlanner {
  private readonly analyzer =
    new TaskAnalyzer();

  createPlan(
    task: AgentTask
  ): AgentPlan {
    const analysis =
      this.analyzer.analyze(
        task.objective
      );

    const steps: AgentPlan["steps"] = [];

    let order = 1;

    if (analysis.requiresResearch) {
      steps.push({
        id: `${task.id}-research`,
        order: order++,
        title: "Research",
        objective:
          "Collect and verify relevant real-time information.",
        taskType: "research" as const,
        requiredSkills: [
          "web-research",
          "source-verification"
        ],
        requiredTools: [
          "web-search"
        ],
        dependencies: [],
        status: "pending" as const
      });
    }

    steps.push({
      id: `${task.id}-analysis`,
      order: order++,
      title: "Analysis",
      objective:
        "Analyze the available information and determine the best solution.",
      taskType:
        analysis.taskType as TaskType,
      requiredSkills: [
        "task-analysis"
      ],
      requiredTools: [],
      dependencies:
        analysis.requiresResearch
          ? [`${task.id}-research`]
          : [],
      status: "pending" as const
    });

    if (analysis.requiresCoding) {
      steps.push({
        id: `${task.id}-implementation`,
        order: order++,
        title: "Implementation",
        objective:
          "Implement the required software solution and validate it.",
        taskType: "coding" as const,
        requiredSkills: [
          "software-engineering",
          "code-review",
          "testing"
        ],
        requiredTools: [
          "filesystem",
          "shell",
          "git"
        ],
        dependencies: [
          `${task.id}-analysis`
        ],
        status: "pending" as const
      });
    }

    if (analysis.requiresDocuments) {
      steps.push({
        id: `${task.id}-document`,
        order: order++,
        title: "Document Generation",
        objective:
          "Generate the requested professional document.",
        taskType: "document" as const,
        requiredSkills: [
          "document-generation",
          "formatting",
          "quality-control"
        ],
        requiredTools: [
          "document-engine"
        ],
        dependencies: [
          `${task.id}-analysis`
        ],
        status: "pending" as const
      });
    }

    if (
      analysis.requiresImage ||
      analysis.requiresVideo ||
      analysis.requiresAudio
    ) {
      steps.push({
        id: `${task.id}-media`,
        order: order++,
        title: "Media Generation",
        objective:
          "Generate and validate the requested media.",
        taskType:
          analysis.requiresVideo
            ? "video"
            : analysis.requiresImage
              ? "image"
              : "audio",
        requiredSkills: [
          "creative-generation",
          "quality-control"
        ],
        requiredTools: [
          "media-engine"
        ],
        dependencies: [
          `${task.id}-analysis`
        ],
        status: "pending" as const
      });
    }

    steps.push({
      id: `${task.id}-evaluation`,
      order: order++,
      title: "Evaluation",
      objective:
        "Evaluate the result against the original objective and requirements.",
      taskType: "reasoning" as const,
      requiredSkills: [
        "quality-evaluation",
        "self-critique"
      ],
      requiredTools: [],
      dependencies:
        steps.map((step) => step.id),
      status: "pending" as const
    });

    const model =
      selectModel({
        task:
          analysis.taskType as TaskType,
        requiresTools:
          analysis.requiresTools,
        requiresStructuredOutput:
          true
      });

    return {
      taskId: task.id,
      objective: task.objective,
      steps,
      reasoningSummary:
        model
          ? `Plan generated using ${model.provider}/${model.model}.`
          : "Plan generated with the default model configuration.",
      createdAt:
        new Date().toISOString()
    };
  }
}
