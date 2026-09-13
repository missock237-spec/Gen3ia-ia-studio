import {
  listProjectMemories,
} from "./repository";

import {
  createMemoryEmbedding,
} from "./embeddings";

import {
  cosineSimilarity,
} from "./similarity";

export interface MemorySearchResult {
  memory: Awaited<
    ReturnType<
      typeof listProjectMemories
    >
  >[number];

  score: number;
}

export async function searchMemories(
  userId: string,
  projectId: string,
  query: string,
  limit = 8,
): Promise<MemorySearchResult[]> {
  const memories =
    await listProjectMemories(
      userId,
      projectId,
      200,
    );

  if (memories.length === 0) {
    return [];
  }

  const queryEmbedding =
    await createMemoryEmbedding(
      query,
    );

  return memories
    .filter(
      (memory) =>
        memory.embedding &&
        memory.embedding.length > 0,
    )
    .map((memory) => ({
      memory,

      score:
        cosineSimilarity(
          queryEmbedding,
          memory.embedding!,
        ),
    }))
    .sort(
      (a, b) =>
        b.score - a.score,
    )
    .slice(0, limit);
}
