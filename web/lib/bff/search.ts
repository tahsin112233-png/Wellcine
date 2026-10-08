import "server-only";
import { mbPost, MovieBoxError } from "../provider/client";
import { ENDPOINTS } from "../provider/contract";
import { resultsFromSearch } from "../provider/adapt";
import { demoSearch } from "../provider/demo";
import { cacheGet, cacheSet } from "../cache";
import { BffError } from "./errors";
import { demoModeActive } from "./home";
import type { SearchResponse } from "./types";

export async function fetchSearch(q: string, page: number): Promise<SearchResponse> {
  const query = q.trim();
  if (query.length < 2) {
    throw new BffError(400, "BAD_REQUEST", "Query must be at least 2 characters.");
  }
  if (demoModeActive()) return demoSearch(query, page);

  const key = `search:${query.toLowerCase()}:${page}`;
  const cached = cacheGet<SearchResponse>(key);
  if (cached) return cached;

  try {
    const data = await mbPost(ENDPOINTS.search, {
      keyword: query,
      page,
      perPage: 15,
      subjectType: 0,
    });
    const results = resultsFromSearch(data);
    const res: SearchResponse = { results, page, exhausted: results.length === 0 };
    cacheSet(key, res, 90_000);
    return res;
  } catch (err) {
    if (err instanceof MovieBoxError) return demoSearch(query, page); // labelled fallback
    throw err;
  }
}
