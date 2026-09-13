export interface TextChunk {
  index: number;

  text: string;

  start: number;

  end: number;
}

export interface ChunkOptions {
  maxCharacters?: number;

  overlap?: number;
}

export function chunkText(
  text: string,
  options: ChunkOptions = {},
): TextChunk[] {
  const maxCharacters =
    options.maxCharacters ?? 4000;

  const overlap =
    options.overlap ?? 400;

  if (
    maxCharacters <= overlap
  ) {
    throw new Error(
      "maxCharacters must be greater than overlap",
    );
  }

  const chunks: TextChunk[] = [];

  let start = 0;

  while (
    start < text.length
  ) {
    const end = Math.min(
      start + maxCharacters,
      text.length,
    );

    chunks.push({
      index:
        chunks.length,

      text:
        text.slice(
          start,
          end,
        ),

      start,

      end,
    });

    if (
      end >= text.length
    ) {
      break;
    }

    start =
      end - overlap;
  }

  return chunks;
}
