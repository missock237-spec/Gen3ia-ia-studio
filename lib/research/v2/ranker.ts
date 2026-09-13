import {
  ResearchSource,
} from "./types";

export function rankSources(
  sources: ResearchSource[],
): ResearchSource[] {
  return sources
    .map((source) => ({
      ...source,

      relevanceScore:
        calculateRelevance(
          source,
        ),

      freshnessScore:
        calculateFreshness(
          source.publishedAt,
        ),
    }))
    .sort(
      (a, b) =>
        totalScore(b) -
        totalScore(a),
    );
}

function totalScore(
  source: ResearchSource,
): number {
  return (
    source.authorityScore * 0.45 +
    source.relevanceScore * 0.35 +
    source.freshnessScore * 0.20
  );
}

function calculateRelevance(
  source: ResearchSource,
): number {
  if (
    source.sourceType ===
    "official"
  ) {
    return 1;
  }

  if (
    source.sourceType ===
    "documentation"
  ) {
    return 0.95;
  }

  if (
    source.sourceType ===
    "academic"
  ) {
    return 0.9;
  }

  return 0.6;
}

function calculateFreshness(
  publishedAt?: string,
): number {
  if (!publishedAt) {
    return 0.5;
  }

  const timestamp =
    Date.parse(
      publishedAt,
    );

  if (
    Number.isNaN(timestamp)
  ) {
    return 0.5;
  }

  const age =
    Date.now() -
    timestamp;

  const days =
    age /
    (1000 * 60 * 60 * 24);

  if (days <= 7) {
    return 1;
  }

  if (days <= 30) {
    return 0.9;
  }

  if (days <= 180) {
    return 0.7;
  }

  if (days <= 365) {
    return 0.5;
  }

  return 0.3;
}
