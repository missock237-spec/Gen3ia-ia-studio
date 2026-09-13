import { z } from "zod";

export const ArtifactIdSchema = z
  .string()
  .regex(
    /^art_[A-Za-z0-9_-]+$/,
    "Invalid artifact ID"
  );

export const WorkspaceFileSchema = z.object({
  relativePath: z
    .string()
    .min(1)
    .max(1024),

  content: z
    .string()
    .max(10 * 1024 * 1024),
});

export const ZipCreateSchema = z.object({
  workspaceId: z
    .string()
    .min(1)
    .max(128),

  filename: z
    .string()
    .min(1)
    .max(180)
    .regex(
      /^[a-zA-Z0-9._-]+$/,
      "Invalid filename"
    ),
});

export const ZipAnalyzeSchema = z.object({
  artifactId: ArtifactIdSchema,
});

export type ZipCreateInput =
  z.infer<typeof ZipCreateSchema>;

export type ZipAnalyzeInput =
  z.infer<typeof ZipAnalyzeSchema>;
