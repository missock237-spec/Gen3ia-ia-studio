import {
  InferenceClient,
} from "@huggingface/inference";

const model =
  process.env.HF_EMBEDDING_MODEL;

if (!model) {
  console.warn(
    "HF_EMBEDDING_MODEL is not configured",
  );
}

const client =
  new InferenceClient(
    process.env.HF_TOKEN,
  );

export async function createMemoryEmbedding(
  text: string,
): Promise<number[]> {
  if (!model) {
    throw new Error(
      "HF_EMBEDDING_MODEL is not configured",
    );
  }

  const result =
    await client.featureExtraction({
      model,
      inputs: text,
    });

  if (
    !Array.isArray(result)
  ) {
    throw new Error(
      "Invalid embedding response",
    );
  }

  if (
    result.length === 0
  ) {
    throw new Error(
      "Empty embedding",
    );
  }

  if (
    Array.isArray(result[0])
  ) {
    return result[0] as number[];
  }

  return result as number[];
}
