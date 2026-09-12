import {
  ResearchResult,
  ResearchSource
} from "./types";

export interface SearchProvider {
  search(
    query: string,
    options?: {
      limit?: number;
      recencyDays?: number;
    }
  ): Promise<ResearchSource[]>;
}

export class ResearchEngine {
  constructor(
    private readonly provider: SearchProvider
  ) {}

  async research(
    query: string
  ): Promise<ResearchResult> {
    const sources =
      await this.provider.search(query, {
        limit: 20,
        recencyDays: 3650
      });

    const uniqueSources =
      this.deduplicateSources(sources);

    return {
      query,
      sources: uniqueSources,
      claims: [],
      summary: "",
      retrievedAt:
        new Date().toISOString()
    };
  }

  private deduplicateSources(
    sources: ResearchSource[]
  ): ResearchSource[] {
    const seen = new Set<string>();

    return sources.filter((source) => {
      if (seen.has(source.url)) {
        return false;
      }

      seen.add(source.url);

      return true;
    });
  }
}
