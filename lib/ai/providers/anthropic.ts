import type {
  AIRequest,
  AIResponse,
} from "../models";

import {
  getProvider,
} from "../config";

interface AnthropicResponse {
  id: string;

  model: string;

  content: Array<{
    type: string;
    text?: string;
  }>;

  usage?: {
    input_tokens?: number;
    output_tokens?: number;
  };

  stop_reason?: string;
}

export async function callAnthropic(
  request: AIRequest,
): Promise<AIResponse> {
  const config =
    getProvider("anthropic");

  if (!config.apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is missing.",
    );
  }

  if (
    !config.defaultModel ||
    config.defaultModel === "auto"
  ) {
    throw new Error(
      "CLAUDE_MODEL must be configured.",
    );
  }

  const startedAt =
    Date.now();

  const response =
    await fetch(
      "https://api.anthropic.com/v1/messages",
      {
        method: "POST",

        headers: {
          "content-type":
            "application/json",

          "x-api-key":
            config.apiKey,

          "anthropic-version":
            "2023-06-01",
        },

        body: JSON.stringify({
          model:
            request.model ||
            config.defaultModel,

          max_tokens:
            request.maxTokens ?? 8192,

          system:
            request.system,

          messages:
            request.messages
              .filter(
                (message) =>
                  message.role !==
                  "system",
              )
              .map(
                (message) => ({
                  role:
                    message.role ===
                    "assistant"
                      ? "assistant"
                      : "user",

                  content:
                    message.content,
                }),
              ),
        }),
      },
    );

  if (!response.ok) {
    const errorText =
      await response.text();

    throw new Error(
      `Anthropic error ${response.status}: ${errorText}`,
    );
  }

  const data =
    (await response.json()) as AnthropicResponse;

  const text =
    data.content
      .filter(
        (item) =>
          item.type === "text",
      )
      .map(
        (item) =>
          item.text ?? "",
      )
      .join("");

  return {
    id: data.id,

    provider: "anthropic",

    model: data.model,

    text,

    usage: {
      inputTokens:
        data.usage?.input_tokens ??
        0,

      outputTokens:
        data.usage?.output_tokens ??
        0,

      totalTokens:
        (data.usage?.input_tokens ??
          0) +
        (data.usage?.output_tokens ??
          0),
    },

    finishReason:
      data.stop_reason,

    raw: data,

    latencyMs:
      Date.now() - startedAt,
  };
}
