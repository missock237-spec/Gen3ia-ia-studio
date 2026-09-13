import { z } from "zod";

import type {
  ToolDefinition,
} from "../types";

import {
  createZip,
} from "@/lib/documents/zip";

const inputSchema = z.object({
  files: z.array(
    z.object({
      filename: z.string().min(1),

      dataBase64:
        z.string().min(1),
    }),
  ).min(1),
});

export const createZipTool:
  ToolDefinition = {
    name: "artifact.create_zip",

    description:
      "Create a ZIP archive from files generated or collected by the agent.",

    category: "files",

    risk: "low",

    inputSchema,

    execute: async ({
      input,
    }) => {
      const parsed =
        inputSchema.parse(input);

      const entries =
        parsed.files.map(
          (file) => ({
            filename:
              file.filename,

            data:
              Buffer.from(
                file.dataBase64,
                "base64",
              ),
          }),
        );

      const data =
        await createZip(entries);

      return {
        success: true,

        mimeType:
          "application/zip",

        sizeBytes:
          data.length,

        dataBase64:
          data.toString("base64"),
      };
    },
  };
