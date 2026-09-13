import {
  adminDb,
} from "@/lib/firebase/admin";

import {
  createMemoryEmbedding,
} from "@/lib/memory/embeddings";

import {
  cosineSimilarity,
} from "@/lib/memory/similarity";

export async function searchKnowledge(
  userId: string,
  projectId: string,
  query: string,
  limit = 8,
) {
  const snapshot =
    await adminDb
      .collection(
        "knowledgeChunks",
      )
      .where(
        "userId",
        "==",
        userId,
      )
      .where(
        "projectId",
        "==",
        projectId,
      )
      .limit(500)
      .get();

  if (snapshot.empty) {
    return [];
  }

  const queryEmbedding =
    await createMemoryEmbedding(
      query,
    );

  return snapshot.docs
    .map((doc) => {
      const data =
        doc.data();

      return {
        id: doc.id,

        documentId:
          data.documentId,

        text:
          data.text,

        chunkIndex:
          data.chunkIndex,

        score:
          cosineSimilarity(
            queryEmbedding,
            data.embedding ?? [],
          ),
      };
    })
    .sort(
      (a, b) =>
        b.score - a.score,
    )
    .slice(0, limit);
}
