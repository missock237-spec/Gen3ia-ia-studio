import { z } from "zod";

import type {
  ToolDefinition,
} from "../types";

const SearchInput =
  z.object({
    query:
      z.string().min(2),

    maxResults:
      z.number()
        .int()
        .min(1)
        .max(20)
        .default(10),
  });

interface SearchResult {
  title: string;
  url: string;
  snippet?: string;
  publishedAt?: string;
}

interface SearchResponse {
  results: SearchResult[];
}

async function executeSearch(
  input: z.infer<
    typeof SearchInput
  >,
): Promise<SearchResponse> {
  const provider =
    process.env.SEARCH_PROVIDER;

  const apiKey =
    process.env.SEARCH_API_KEY;

  if (!provider) {
    throw new Error(
      "SEARCH_PROVIDER is not configured.",
    );
  }

  if (!apiKey) {
    throw new Error(
      "SEARCH_API_KEY is not configured.",
    );
  }

  switch (provider) {
    case "tavily":
      return searchTavily(
        input.query,
        input.maxResults,
        apiKey,
      );

    case "serper":
      return searchSerper(
        input.query,
        input.maxResults,
        apiKey,
      );

    case "serpapi":
      return searchSerpApi(
        input.query,
        input.maxResults,
        apiKey,
      );

    default:
      throw new Error(
        `Unsupported search provider: ${provider}`,
      );
  }
}

async function searchSerpApi(
  query: string,
  maxResults: number,
  apiKey: string,
): Promise<SearchResponse> {
  const params = new URLSearchParams({
    engine: "google",
    q: query,
    num: String(Math.min(maxResults, 20)),
    api_key: apiKey,
  });

  const response = await fetch(
    `https://serpapi.com/search?${params.toString()}`,
  );

  if (!response.ok) {
    throw new Error(
      `SerpApi returned ${response.status}.`,
    );
  }

  const data =
    (await response.json()) as {
      organic_results?: Array<{
        title?: string;
        link?: string;
        snippet?: string;
        date?: string;
      }>;
    };

  return {
    results:
      (data.organic_results ?? [])
        .filter(
          (item) =>
            typeof item.link === "string" &&
            item.link.length > 0,
        )
        .map(
          (item) => ({
            title:
              item.title ?? "",

            url:
              item.link as string,

            snippet:
              item.snippet,

            publishedAt:
              item.date,
          }),
        ),
  };
}

async function searchTavily(
  query: string,
  maxResults: number,
  apiKey: string,
): Promise<SearchResponse> {
  const response =
    await fetch(
      "https://api.tavily.com/search",
      {
        method: "POST",

        headers: {
          "content-type":
            "application/json",
        },

        body: JSON.stringify({
          api_key:
            apiKey,

          query,

          max_results:
            maxResults,

          include_answer:
            false,

          include_raw_content:
            false,
        }),
      },
    );

  if (!response.ok) {
    throw new Error(
      `Tavily returned ${response.status}.`,
    );
  }

  const data =
    (await response.json()) as {
      results?: Array<{
        title: string;
        url: string;
        content?: string;
        published_date?: string;
      }>;
    };

  return {
    results:
      (data.results ?? []).map(
        (item) => ({
          title:
            item.title,

          url:
            item.url,

          snippet:
            item.content,

          publishedAt:
            item.published_date,
        }),
      ),
  };
}

async function searchSerper(
  query: string,
  maxResults: number,
  apiKey: string,
): Promise<SearchResponse> {
  const response =
    await fetch(
      "https://google.serper.dev/search",
      {
        method: "POST",

        headers: {
          "X-API-KEY":
            apiKey,

          "content-type":
            "application/json",
        },

        body: JSON.stringify({
          q: query,

          num:
            maxResults,
        }),
      },
    );

  if (!response.ok) {
    throw new Error(
      `Serper returned ${response.status}.`,
    );
  }

  const data =
    (await response.json()) as {
      organic?: Array<{
        title: string;
        link: string;
        snippet?: string;
        date?: string;
      }>;
    };

  return {
    results:
      (data.organic ?? []).map(
        (item) => ({
          title:
            item.title,

          url:
            item.link,

          snippet:
            item.snippet,

          publishedAt:
            item.date,
        }),
      ),
  };
}

export const webSearchTool:
  ToolDefinition<
    z.infer<
      typeof SearchInput
    >,
    SearchResponse
  > = {
    id:
      "web.search",

    name:
      "Web Search",

    description:
      "Search the public Internet for relevant information in real time (Google via SerpApi).",

    category:
      "web",

    risk:
      "low",

    inputSchema:
      SearchInput,

    execute:
      executeSearch,
  };

/**
 * Standalone search helper for server modules (research engine, planners)
 * that need raw results without going through the tool registry.
 */
export async function searchWeb(
  query: string,
  maxResults = 10,
): Promise<SearchResult[]> {
  const parsed =
    SearchInput.parse({ query, maxResults });

  const response =
    await executeSearch(parsed);

  return response.results;
}
