import pptxgen from "pptxgenjs";
import type { DocumentPlan } from "../types";

export async function generatePptx(
  plan: DocumentPlan,
): Promise<Buffer> {
  const pptx = new pptxgen();

  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "Gen3ia AI Studio";
  pptx.subject = plan.title;
  pptx.title = plan.title;
  pptx.company = "Gen3ia";

  let slide = pptx.addSlide();

  slide.addText(plan.title, {
    x: 0.7,
    y: 0.6,
    w: 12,
    h: 0.7,
    fontSize: 28,
    bold: true,
  });

  let y = 1.5;

  const newSlide = () => {
    slide = pptx.addSlide();
    y = 0.7;
  };

  for (const block of plan.blocks) {
    switch (block.type) {
      case "pageBreak":
        newSlide();
        break;

      case "heading":
        if (y > 6) {
          newSlide();
        }

        slide.addText(block.text ?? "", {
          x: 0.8,
          y,
          w: 11.5,
          h: 0.5,
          fontSize: block.level === 1 ? 24 : 19,
          bold: true,
          fit: "shrink",
        });

        y += 0.75;
        break;

      case "paragraph":
      case "quote":
      case "code":
        if (y > 5.8) {
          newSlide();
        }

        slide.addText(block.text ?? "", {
          x: 0.9,
          y,
          w: 11.2,
          h: 1.2,
          fontSize: block.type === "code" ? 11 : 14,
          italic: block.type === "quote",
          fit: "shrink",
          breakLine: false,
        });

        y += 1.35;
        break;

      case "list": {
        if (y > 5.3) {
          newSlide();
        }

        const text = (block.items ?? [])
          .map((item, index) =>
            block.ordered
              ? `${index + 1}. ${item}`
              : `• ${item}`,
          )
          .join("\n");

        slide.addText(text, {
          x: 1,
          y,
          w: 10.8,
          h: 2,
          fontSize: 14,
          fit: "shrink",
        });

        y += 2.1;
        break;
      }

      case "table": {
        if (y > 4.8) {
          newSlide();
        }

        const rows = [
          ...(block.columns
            ? [block.columns]
            : []),
          ...(block.rows ?? []),
        ];

        if (rows.length > 0) {
          slide.addTable(rows, {
            x: 0.7,
            y,
            w: 12,
            h: 2.5,
            fontSize: 10,
            border: {
              type: "solid",
              pt: 1,
            },
          });

          y += 2.8;
        }

        break;
      }
    }
  }

  const output = await pptx.write({
    outputType: "nodebuffer",
  });

  return Buffer.from(output as Buffer);
}
