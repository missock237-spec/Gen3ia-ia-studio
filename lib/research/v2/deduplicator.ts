import {
  ResearchSource,
} from "./types";

export function deduplicateSources(
  sources: ResearchSource[],
): ResearchSource[] {
  const seen = new Map<
    string,
    ResearchSource
  >();

  for (const source of sources) {
    const key =
      canonicalUrl(source.url);

    const existing =
      seen.get(key);

    if (!existing) {
      seen.set(key, source);
      continue;
    }

    if (
      source.relevanceScore >
      existing.relevanceScore
    ) {
      seen.set(key, source);
    }
  }

  return [
    ...seen.values(),
  ];
}

function canonicalUrl(
  raw: string,
): string {
  const url =
    new URL(raw);

  url.hash = "";

  url.hostname =
    url.hostname.toLowerCase();

  return url.toString()
    .replace(/\/$/, "");
}
