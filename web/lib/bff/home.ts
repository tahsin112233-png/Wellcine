import "server-only";
import { mbGet, MovieBoxError } from "../provider/client";
import { ENDPOINTS } from "../provider/contract";
import { buildRails } from "../provider/adapt";
import { demoHome } from "../provider/demo";
import { usingProxy } from "../net";
import { cacheGet, cacheSet } from "../cache";
import type { HomeResponse } from "./types";

/** Demo fallback is active when forced, or when there is no proxy egress. */
export function demoModeActive(): boolean {
  return process.env.DEMO_MODE === "true" || !usingProxy();
}

export const homeTab = (): string => process.env.MOVIEBOX_HOME_TAB ?? "2";
const cacheTtlMs = (): number => Number(process.env.CONTENT_CACHE_TTL_MS ?? 300_000);

export async function fetchHome(tab: string, page: number): Promise<HomeResponse> {
  if (demoModeActive()) return demoHome(tab, page);

  const key = `home:${tab}:${page}`;
  const cached = cacheGet<HomeResponse>(key);
  if (cached) return cached;

  try {
    const data = await mbGet(ENDPOINTS.tabOperating(page, tab));
    const res: HomeResponse = { tab, rails: buildRails(data), page };
    cacheSet(key, res, cacheTtlMs());
    return res;
  } catch (err) {
    if (err instanceof MovieBoxError) return demoHome(tab, page); // labelled fallback
    throw err;
  }
}
