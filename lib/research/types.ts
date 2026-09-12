export interface ResearchSource {
  url: string;
  title: string;
  publishedAt?: string;
  retrievedAt: string;

  sourceType:
    | "official"
    | "news"
    | "academic"
    | "documentation"
    | "community"
    | "unknown";

  credibility: number;

  content: string;
}

export interface ResearchClaim {
  claim: string;

  sources: string[];

  confidence: number;

  verified: boolean;
}

export interface ResearchResult {
  query: string;

  sources: ResearchSource[];

  claims: ResearchClaim[];

  summary: string;

  retrievedAt: string;
}
