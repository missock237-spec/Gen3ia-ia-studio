import ExcelJS from "exceljs";
import type { DocumentPlan } from "../types";

export async function generateXlsx(
  plan: DocumentPlan,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();

  workbook.creator = "Gen3ia AI Studio";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(
    plan.title.slice(0, 31) || "Sheet1",
  );

  sheet.addRow([plan.title]);
  sheet.addRow([]);

  for (const block of plan.blocks) {
    switch (block.type) {
      case "heading":
      case "paragraph":
        sheet.addRow([block.text ?? ""]);
        break;

      case "list":
        for (const item of block.items ?? []) {
          sheet.addRow([item]);
        }
        break;

      case "table": {
        if (block.columns?.length) {
          const header = sheet.addRow(block.columns);

          header.font = {
            bold: true,
          };
        }

        for (const row of block.rows ?? []) {
          sheet.addRow(row);
        }

        break;
      }

      case "code":
        sheet.addRow([block.text ?? ""]);
        break;

      case "quote":
        sheet.addRow([block.text ?? ""]);
        break;
    }
  }

  for (const column of sheet.columns) {
    let maxLength = 10;

    column.eachCell?.({ includeEmpty: false }, (cell) => {
      maxLength = Math.max(
        maxLength,
        String(cell.value ?? "").length,
      );
    });

    column.width = Math.min(maxLength + 2, 60);
  }

  const output = await workbook.xlsx.writeBuffer();

  return Buffer.from(output);
}
