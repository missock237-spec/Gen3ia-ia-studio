import {
  createHash,
} from "crypto";

import {
  ResearchSource,
} from "./types";

export interface RawSearchResult {
  url: string;
  title?: string;
  snippet?: string;
  publishedAt?: string;
}

export function normalizeSearchResult(
  result: RawSearchResult,
): ResearchSource {
  const url =
    normalizeUrl(result.url);

  const domain =
    new URL(url).hostname
      .replace(/^www\./, "");

  return {
    id: createHash("sha256")
      .update(url)
      .digest("hex")
      .slice(0, 24),

    url,

    title:
      result.title ??
      domain,

    domain,

    snippet:
      result.snippet,

    publishedAt:
      result.publishedAt,

    accessedAt:
      new Date().toISOString(),

    sourceType:
      classifyDomain(domain),

    authorityScore:
      authorityScore(domain),

    relevanceScore: 0,

    freshnessScore: 0,

    verified: false,
  };
}

function normalizeUrl(
  raw: string,
): string {
  const url =
    new URL(raw);

  url.hash = "";

  for (
    const parameter of [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_content",
      "utm_term",
    ]
  ) {
    url.searchParams.delete(
      parameter,
    );
  }

  return url.toString();
}

function classifyDomain(
  domain: string,
): ResearchSource["sourceType"] {
  if (
    domain.endsWith(".gov") ||
    domain.endsWith(".gov.uk")
  ) {
    return "official";
  }

  if (
    domain.includes("github.com") ||
    domain.includes("readthedocs") ||
    domain.includes("developer.")
  ) {
    return "documentation";
  }

  if (
    domain.includes("arxiv.org") ||
    domain.includes("nature.com") ||
    domain.includes("acm.org")
  ) {
    return "academic";
  }

  if (
    domain.includes("reddit.com") ||
    domain.includes("stackoverflow.com")
  ) {
    return "community";
  }

  return "unknown";
}

function authorityScore(
  domain: string,
): number {
  if (
    domain.endsWith(".gov") ||
    domain.endsWith(".edu")
  ) {
    return 0.95;
  }

  if (
    domain.includes("github.com") ||
    domain.includes("openai.com") ||
    domain.includes("google.com")
  ) {
    return 0.9;
  }

  if (
    domain.includes("arxiv.org")
  ) {
    return 0.9;
  }

  return 0.5;
}
