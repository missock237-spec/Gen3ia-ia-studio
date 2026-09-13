import {
  randomUUID,
} from "crypto";

import {
  adminDb,
} from "@/lib/firebase/admin";

import {
  chunkText,
} from "./chunker";

import {
  createMemoryEmbedding,
} from "@/lib/memory/embeddings";

export async function indexKnowledgeDocument(
  input: {
    userId: string;
    projectId: string;
    documentId: string;
    text: string;
  },
): Promise<number> {
  const chunks =
    chunkText(input.text);

  const batch =
    adminDb.batch();

  for (const chunk of chunks) {
    const embedding =
      await createMemoryEmbedding(
        chunk.text,
      );

    const ref =
      adminDb
        .collection(
          "knowledgeChunks",
        )
        .doc(
          randomUUID(),
        );

    batch.set(ref, {
      userId:
        input.userId,

      projectId:
        input.projectId,

      documentId:
        input.documentId,

      chunkIndex:
        chunk.index,

      text:
        chunk.text,

      start:
        chunk.start,

      end:
        chunk.end,

      embedding,

      createdAt:
        new Date().toISOString(),
    });
  }

  await batch.commit();

  return chunks.length;
} 
