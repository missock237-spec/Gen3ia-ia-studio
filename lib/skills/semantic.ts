import { InferenceClient } from "@huggingface/inference";

const hf = process.env.HF_TOKEN
  ? new InferenceClient(process.env.HF_TOKEN)
  : null;

function cosineSimilarity(
  a: number[],
  b: number[],
): number {
  if (a.length !== b.length) {
    return 0;
  }

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return (
    dot /
    (Math.sqrt(normA) * Math.sqrt(normB))
  );
}

export async function createEmbedding(
  text: string,
): Promise<number[]> {
  if (!hf) {
    throw new Error(
      "HF_TOKEN is required for semantic skill search.",
    );
  }

  const model =
    process.env.HF_EMBEDDING_MODEL;

  if (!model) {
    throw new Error(
      "HF_EMBEDDING_MODEL is not configured.",
    );
  }

  const result = await hf.featureExtraction({
    model,
    inputs: text,
  });

  if (!Array.isArray(result)) {
    throw new Error(
      "Invalid embedding response from Hugging Face.",
    );
  }

  const vector = Array.isArray(result[0])
    ? result[0]
    : result;

  return vector as number[];
}

export function similarity(
  a: number[],
  b: number[],
): number {
  return cosineSimilarity(a, b);
}

export function buildSkillSearchText(skill: {
  name: string;
  description: string;
  category: string;
  capabilities: Array<{
    name: string;
    description: string;
  }>;
  compatibleTasks: string[];
  triggers: string[];
}): string {
  return [
    skill.name,
    skill.description,
    skill.category,
    skill.capabilities
      .map(
        (capability) =>
          `${capability.name}: ${capability.description}`,
      )
      .join(" "),
    skill.compatibleTasks.join(" "),
    skill.triggers.join(" "),
  ].join("\n");
}
