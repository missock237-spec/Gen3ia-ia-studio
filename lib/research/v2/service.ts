import {
  generateResearchQueries,
} from "./quercy-planner";

import {
  normalizeSearchResult,
} from "./normalizer";

import {
  deduplicateSources,
} from "./deduplicator";

import {
  rankSources,
} from "./ranker";

import {
  fetchSources,
} from "./fetcher";

import {
  extractClaims,
} from "./claims";

import {
  verifyClaims,
} from "./verifier";

import {
  synthesizeResearch,
} from "./synthesizer";

import {
  ResearchReport,
} from "./types";

import {
  searchWeb,
} from "@/lib/tools/web/search";

export async function research(
  objective: string,
): Promise<ResearchReport> {
  const queries =
    await generateResearchQueries(
      objective,
    );

  const rawResults =
    await Promise.all(
      queries.map(
        (query) =>
          searchWeb(query),
      ),
    );

  const normalized =
    rawResults
      .flat()
      .map(
        normalizeSearchResult,
      );

  const unique =
    deduplicateSources(
      normalized,
    );

  const ranked =
    rankSources(unique);

  const fetched =
    await fetchSources(
      ranked,
      16,
    );

  const claims =
    await extractClaims(
      objective,
      fetched,
    );

  const verified =
    await verifyClaims(
      claims,
      fetched,
    );

  const summary =
    await synthesizeResearch(
      objective,
      verified,
      fetched,
    );

  return {
    query: objective,

    summary,

    claims: verified,

    sources: fetched,

    citations:
      verified.flatMap(
        (claim) =>
          claim.sourceIds.map(
            (sourceId) => ({
              claimId:
                claim.id,

              sourceId,
            }),
          ),
      ),

    generatedAt:
      new Date().toISOString(),
  };
}
