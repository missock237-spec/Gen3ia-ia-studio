import {
  openWebPage,
} from "@/lib/tools/web/open";

import {
  ResearchSource,
} from "./types";

export async function fetchSources(
  sources: ResearchSource[],
  limit = 12,
): Promise<ResearchSource[]> {
  const selected =
    sources.slice(0, limit);

  const results =
    await Promise.allSettled(
      selected.map(
        async (source) => {
          const content =
            await openWebPage(
              source.url,
            );

          return {
            ...source,

            content,

            verified:
              Boolean(
                content &&
                content.length > 100,
              ),
          };
        },
      ),
    );

  return results
    .filter(
      (
        result,
      ): result is PromiseFulfilledResult<ResearchSource> =>
        result.status ===
        "fulfilled",
    )
    .map(
      (result) =>
        result.value,
    );
}
