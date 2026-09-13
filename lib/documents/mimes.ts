import type { ArtifactFormat } from "./types";

export const MIME_TYPES: Record<ArtifactFormat, string> = {
  pdf: "application/pdf",

  docx:
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

  xlsx:
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

  pptx:
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",

  csv: "text/csv",

  md: "text/markdown",

  txt: "text/plain",

  json: "application/json",

  html: "text/html",

  zip: "application/zip",
};

export const EXTENSIONS: Record<ArtifactFormat, string> = {
  pdf: "pdf",
  docx: "docx",
  xlsx: "xlsx",
  pptx: "pptx",
  csv: "csv",
  md: "md",
  txt: "txt",
  json: "json",
  html: "html",
  zip: "zip",
};

export function formatFromFilename(
  filename: string,
): ArtifactFormat | null {
  const extension = filename
    .split(".")
    .pop()
    ?.toLowerCase();

  if (!extension) {
    return null;
  }

  const entry = Object.entries(EXTENSIONS).find(
    ([, value]) => value === extension,
  );

  return entry?.[0] as ArtifactFormat | null;
}
