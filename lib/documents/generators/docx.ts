import {
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
} from "docx";

import type { DocumentPlan } from "../types";

function getHeadingLevel(level: number): HeadingLevel {
  const levels = [
    HeadingLevel.HEADING_1,
    HeadingLevel.HEADING_2,
    HeadingLevel.HEADING_3,
    HeadingLevel.HEADING_4,
    HeadingLevel.HEADING_5,
    HeadingLevel.HEADING_6,
  ];

  return levels[Math.min(Math.max(level, 1), 6) - 1];
}

export async function generateDocx(
  plan: DocumentPlan,
): Promise<Buffer> {
  const children: Array<
    Paragraph | Table
  > = [];

  children.push(
    new Paragraph({
      text: plan.title,
      heading: HeadingLevel.TITLE,
    }),
  );

  for (const block of plan.blocks) {
    switch (block.type) {
      case "pageBreak":
        children.push(
          new Paragraph({
            pageBreakBefore: true,
          }),
        );
        break;

      case "heading":
        children.push(
          new Paragraph({
            text: block.text ?? "",
            heading: getHeadingLevel(block.level ?? 2),
          }),
        );
        break;

      case "paragraph":
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: block.text ?? "",
              }),
            ],
          }),
        );
        break;

      case "quote":
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: block.text ?? "",
                italics: true,
              }),
            ],
          }),
        );
        break;

      case "code":
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: block.text ?? "",
                font: "Courier New",
              }),
            ],
          }),
        );
        break;

      case "list":
        for (const item of block.items ?? []) {
          children.push(
            new Paragraph({
              text: item,
              bullet: {
                level: 0,
              },
            }),
          );
        }
        break;

      case "table": {
        const rows = [];

        if (block.columns?.length) {
          rows.push(
            new TableRow({
              children: block.columns.map(
                (column) =>
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: String(column),
                            bold: true,
                          }),
                        ],
                      }),
                    ],
                  }),
              ),
            }),
          );
        }

        for (const row of block.rows ?? []) {
          rows.push(
            new TableRow({
              children: row.map(
                (value) =>
                  new TableCell({
                    children: [
                      new Paragraph({
                        text: String(value ?? ""),
                      }),
                    ],
                  }),
              ),
            }),
          );
        }

        children.push(
          new Table({
            rows,
          }),
        );

        break;
      }

      default:
        if (block.text) {
          children.push(
            new Paragraph({
              text: block.text,
            }),
          );
        }
    }
  }

  const document = new Document({
    sections: [
      {
        children,
      },
    ],
  });

  return Packer.toBuffer(document);
            }
