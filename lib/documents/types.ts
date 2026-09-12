export type DocumentFormat =
  | "pdf"
  | "docx"
  | "xlsx"
  | "pptx"
  | "md"
  | "txt"
  | "csv";

export interface DocumentRequest {
  title: string;

  format: DocumentFormat;

  content: string;

  metadata?: {
    author?: string;
    description?: string;
    language?: string;
  };
}

export interface GeneratedDocument {
  filename: string;

  mimeType: string;

  buffer: Buffer;

  size: number;
}
