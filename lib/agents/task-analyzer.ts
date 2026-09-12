import type { TaskType } from "@/lib/ai/models";

export interface TaskAnalysis {
  taskType: TaskType;

  requiresResearch: boolean;

  requiresCoding: boolean;

  requiresDocuments: boolean;

  requiresImage: boolean;

  requiresVideo: boolean;

  requiresAudio: boolean;

  requiresTools: boolean;

  requiresAutonomy: boolean;

  complexity: "low" | "medium" | "high" | "extreme";

  capabilities: string[];
}

export class TaskAnalyzer {
  analyze(objective: string): TaskAnalysis {
    const text = objective.toLowerCase();

    const requiresResearch =
      this.contains(text, [
        "recherche",
        "cherche",
        "sources",
        "actualités",
        "actualité",
        "internet",
        "web",
        "comparatif",
        "étude"
      ]);

    const requiresCoding =
      this.contains(text, [
        "code",
        "application",
        "site",
        "programmer",
        "développe",
        "github",
        "api",
        "logiciel"
      ]);

    const requiresDocuments =
      this.contains(text, [
        "pdf",
        "document",
        "rapport",
        "docx",
        "excel",
        "xlsx",
        "powerpoint",
        "pptx"
      ]);

    const requiresImage =
      this.contains(text, [
        "image",
        "illustration",
        "logo",
        "visuel",
        "photo"
      ]);

    const requiresVideo =
      this.contains(text, [
        "vidéo",
        "video",
        "animation",
        "film"
      ]);

    const requiresAudio =
      this.contains(text, [
        "audio",
        "voix",
        "voice",
        "musique",
        "podcast"
      ]);

    const requiresTools =
      requiresCoding ||
      this.contains(text, [
        "envoyer",
        "publier",
        "installer",
        "déployer",
        "créer un compte",
        "modifier",
        "supprimer"
      ]);

    const complexity =
      this.calculateComplexity({
        requiresResearch,
        requiresCoding,
        requiresDocuments,
        requiresImage,
        requiresVideo,
        requiresAudio,
        requiresTools
      });

    let taskType: TaskType = "chat";

    if (requiresResearch) {
      taskType = "research";
    } else if (requiresCoding) {
      taskType = "coding";
    } else if (requiresVideo) {
      taskType = "video";
    } else if (requiresImage) {
      taskType = "image";
    } else if (requiresAudio) {
      taskType = "audio";
    } else if (requiresDocuments) {
      taskType = "document";
    }

    return {
      taskType,

      requiresResearch,
      requiresCoding,
      requiresDocuments,
      requiresImage,
      requiresVideo,
      requiresAudio,
      requiresTools,

      requiresAutonomy:
        complexity === "high" ||
        complexity === "extreme",

      complexity,

      capabilities: [
        requiresResearch
          ? "web-research"
          : null,

        requiresCoding
          ? "software-development"
          : null,

        requiresDocuments
          ? "document-generation"
          : null,

        requiresImage
          ? "image-generation"
          : null,

        requiresVideo
          ? "video-generation"
          : null,

        requiresAudio
          ? "audio-generation"
          : null,

        requiresTools
          ? "tool-use"
          : null
      ].filter(
        (value): value is string =>
          value !== null
      )
    };
  }

  private contains(
    text: string,
    words: string[]
  ): boolean {
    return words.some((word) =>
      text.includes(word)
    );
  }

  private calculateComplexity(flags: {
    requiresResearch: boolean;
    requiresCoding: boolean;
    requiresDocuments: boolean;
    requiresImage: boolean;
    requiresVideo: boolean;
    requiresAudio: boolean;
    requiresTools: boolean;
  }): TaskAnalysis["complexity"] {
    const score =
      Object.values(flags).filter(Boolean)
        .length;

    if (score <= 1) {
      return "low";
    }

    if (score <= 3) {
      return "medium";
    }

    if (score <= 5) {
      return "high";
    }

    return "extreme";
  }
      }
