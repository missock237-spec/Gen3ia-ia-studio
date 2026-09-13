import type { DocumentPlan } from "../types";
import { generateTextArtifact } from "./text";

export async function generateDocument(
  plan: DocumentPlan,
): Promise<Buffer> {
  switch (plan.format) {
    case "txt":
    case "md":
    case "csv":
    case "json":
    case "html":
      return generateTextArtifact(plan);

    /*
     * Ces renderers seront branchés aux bibliothèques
     * spécialisées du projet :
     *
     * PDF  -> pdf-lib
     * DOCX -> docx
     * XLSX -> exceljs
     * PPTX -> pptxgenjs
     */

    case "pdf":
      throw new Error(
        "PDF renderer not connected yet.",
      );

    case "docx":
      throw new Error(
        "DOCX renderer not connected yet.",
      );

    case "xlsx":
      throw new Error(
        "XLSX renderer not connected yet.",
      );

    case "pptx":
      throw new Error(
        "PPTX renderer not connected yet.",
      );

    case "zip":
      throw new Error(
        "ZIP must be created through the ZIP engine.",
      );
  }
}
