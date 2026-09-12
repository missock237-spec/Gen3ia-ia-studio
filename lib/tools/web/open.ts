import { z } from "zod";

import type {
  ToolDefinition,
} from "../types";

const OpenInput =
  z.object({
    url:
      z.string().url(),

    maxCharacters:
      z.number()
        .int()
        .min(1000)
        .max(50000)
        .default(20000),
  });

interface OpenResult {
  url: string;
  status: number;
  contentType: string;
  text: string;
}

export const webOpenTool:
  ToolDefinition<
    z.infer<
      typeof OpenInput
    >,
    OpenResult
  > = {
    id:
      "web.open",

    name:
      "Open Web Page",

    description:
      "Retrieve and extract text from a public web page.",

    category:
      "web",

    risk:
      "low",

    inputSchema:
      OpenInput,

    async execute(input) {
      const response =
        await fetch(
          input.url,
          {
            redirect:
              "follow",

            headers: {
              "User-Agent":
                "Gen3ia-AI-Studio/1.0",
            },
          },
        );

      if (!response.ok) {
        throw new Error(
          `Web page returned ${response.status}.`,
        );
      }

      const contentType =
        response.headers.get(
          "content-type",
        ) ?? "";

      if (
        !contentType.includes(
          "text/html",
        ) &&
        !contentType.includes(
          "text/plain",
        )
      ) {
        throw new Error(
          `Unsupported content type: ${contentType}`,
        );
      }

      const html =
        await response.text();

      const text =
        html
          .replace(
            /<script[\s\S]*?<\/script>/gi,
            " ",
          )
          .replace(
            /<style[\s\S]*?<\/style>/gi,
            " ",
          )
          .replace(
            /<[^>]+>/g,
            " ",
          )
          .replace(
            /\s+/g,
            " ",
          )
          .trim()
          .slice(
            0,
            input.maxCharacters,
          );

      return {
        url:
          response.url,

        status:
          response.status,

        contentType,

        text,
      };
    },
  };
