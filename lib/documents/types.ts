import { z } from "zod";

export const ArtifactFormatSchema = z.enum([
  "pdf",
  "docx",
  "xlsx",
  "pptx",
  "csv",
  "md",
  "txt",
  "json",
  "html",
  "zip",
]);

export type ArtifactFormat = z.infer<typeof ArtifactFormatSchema>;

export const ArtifactOperationSchema = z.enum([
  "create",
  "analyze",
  "extract",
  "package",
]);

export type ArtifactOperation = z.infer<typeof ArtifactOperationSchema>;

export const DocumentBlockSchema = z.object({
  type: z.enum([
    "title",
    "heading",
    "paragraph",
    "list",
    "table",
    "code",
    "quote",
    "image",
    "pageBreak",
  ]),

  text: z.string().optional(),

  level: z.number().int().min(1).max(6).optional(),

  ordered: z.boolean().optional(),

  items: z.array(z.string()).optional(),

  columns: z.array(z.string()).optional(),

  rows: z.array(z.array(z.string())).optional(),

  language: z.string().optional(),

  url: z.string().url().optional(),
});

export type DocumentBlock = z.infer<typeof DocumentBlockSchema>;

export const DocumentPlanSchema = z.object({
  title: z.string().min(1).max(300),

  format: ArtifactFormatSchema,

  description: z.string().max(5000).optional(),

  blocks: z.array(DocumentBlockSchema).min(1),

  metadata: z.record(z.string(), z.string()).optional(),
});

export type DocumentPlan = z.infer<typeof DocumentPlanSchema>;

export const ArtifactInputSchema = z.object({
  filename: z.string().min(1).max(255),

  mimeType: z.string().optional(),

  sizeBytes: z.number().int().nonnegative().optional(),

  storagePath: z.string().optional(),
});

export const ArtifactValidationSchema = z.object({
  valid: z.boolean(),

  format: ArtifactFormatSchema,

  sizeBytes: z.number().int().nonnegative(),

  mimeType: z.string(),

  errors: z.array(z.string()),

  warnings: z.array(z.string()),
});

export type ArtifactValidation = z.infer<
  typeof ArtifactValidationSchema
>;

export interface DocumentRequest {
  title: string;

  content: string;

  format: "docx" | "pdf" | "txt" | "md";
}

export interface GeneratedDocument {
  filename: string;

  mimeType: string;

  buffer: Buffer;

  size: number;
}

export interface GeneratedArtifact {
  artifactId: string;

  userId: string;

  projectId?: string;

  executionId?: string;

  filename: string;

  format: ArtifactFormat;

  mimeType: string;

  sizeBytes: number;

  storagePath: string;

  downloadUrl?: string;

  createdAt: string;

  validation: ArtifactValidation;
}

export interface ArtifactAnalysis {
  artifactId: string;

  filename: string;

  format: ArtifactFormat;

  mimeType: string;

  sizeBytes: number;

  safe: boolean;

  files?: ArtifactFileEntry[];

  extractedText?: string;

  summary?: string;

  warnings: string[];

  errors: string[];

  metadata?: Record<string, unknown>;
}

export interface ArtifactFileEntry {
  path: string;

  type: string;

  sizeBytes: number;

  compressedSizeBytes?: number;

  isDirectory: boolean;
}

export interface ZipAnalysisResult {
  safe: boolean;

  fileCount: number;

  totalUncompressedBytes: number;

  files: ArtifactFileEntry[];

  textFiles: Array<{
    path: string;
    content: string;
  }>;

  warnings: string[];

  errors: string[];
} 
