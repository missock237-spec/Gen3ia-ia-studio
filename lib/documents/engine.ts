import {
  Document,
  Packer,
  Paragraph,
  TextRun
} from "docx";

import {
  PDFDocument,
  StandardFonts,
  rgb
} from "pdf-lib";

import {
  DocumentRequest,
  GeneratedDocument
} from "./types";

export class DocumentEngine {
  async generate(
    request: DocumentRequest
  ): Promise<GeneratedDocument> {
    switch (request.format) {
      case "docx":
        return this.generateDocx(request);

      case "pdf":
        return this.generatePdf(request);

      case "txt":
        return this.generateText(request);

      case "md":
        return this.generateText(request);

      default:
        throw new Error(
          `Unsupported document format: ${request.format}`
        );
    }
  }

  private async generateDocx(
    request: DocumentRequest
  ): Promise<GeneratedDocument> {
    const paragraphs =
      request.content
        .split(/\n+/)
        .map(
          (text) =>
            new Paragraph({
              children: [
                new TextRun({
                  text
                })
              ]
            })
        );

    const document =
      new Document({
        sections: [
          {
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: request.title,
                    bold: true,
                    size: 32
                  })
                ]
              }),
              ...paragraphs
            ]
          }
        ]
      });

    const buffer =
      await Packer.toBuffer(document);

    return {
      filename:
        `${this.safeFilename(request.title)}.docx`,
      mimeType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      buffer,
      size: buffer.length
    };
  }

  private async generatePdf(
    request: DocumentRequest
  ): Promise<GeneratedDocument> {
    const pdf =
      await PDFDocument.create();

    const page =
      pdf.addPage();

    const font =
      await pdf.embedFont(
        StandardFonts.Helvetica
      );

    page.drawText(
      request.title,
      {
        x: 50,
        y: 750,
        size: 20,
        font,
        color: rgb(0, 0, 0)
      }
    );

    const lines =
      request.content.split(/\n+/);

    let y = 720;

    for (const line of lines) {
      if (y < 50) {
        y = 750;
        pdf.addPage();
      }

      const currentPage =
        pdf.getPages().at(-1)!;

      currentPage.drawText(
        line.slice(0, 110),
        {
          x: 50,
          y,
          size: 10,
          font
        }
      );

      y -= 16;
    }

    const bytes =
      await pdf.save();

    const buffer =
      Buffer.from(bytes);

    return {
      filename:
        `${this.safeFilename(request.title)}.pdf`,
      mimeType: "application/pdf",
      buffer,
      size: buffer.length
    };
  }

  private async generateText(
    request: DocumentRequest
  ): Promise<GeneratedDocument> {
    const buffer =
      Buffer.from(
        `${request.title}\n\n${request.content}`,
        "utf8"
      );

    return {
      filename:
        `${this.safeFilename(request.title)}.${request.format}`,
      mimeType:
        request.format === "md"
          ? "text/markdown"
          : "text/plain",
      buffer,
      size: buffer.length
    };
  }

  private safeFilename(
    filename: string
  ): string {
    return filename
      .normalize("NFKD")
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .toLowerCase();
  }
  }
