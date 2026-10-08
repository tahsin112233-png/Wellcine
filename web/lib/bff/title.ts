import "server-only";
import { mbGet, MovieBoxError } from "../provider/client";
import { ENDPOINTS } from "../provider/contract";
import { seasonsFromInfo, subjectToDetails } from "../provider/adapt";
import { demoTitle } from "../provider/demo";
import { cacheGet, cacheSet } from "../cache";
import { BffError } from "./errors";
import { demoModeActive } from "./home";
import type { TitleDetails } from "./types";

export async function fetchTitle(id: string): Promise<TitleDetails> {
  if (!id.trim()) throw new BffError(400, "BAD_REQUEST", "Missing title id.");

  const key = `title:${id}`;
  const cached = cacheGet<TitleDetails>(key);
  if (cached) return cached;

  if (demoModeActive()) {
    const demo = demoTitle(id);
    if (!demo) throw new BffError(404, "NOT_FOUND", "No results found.");
    return demo;
  }

  try {
    const raw = await mbGet(ENDPOINTS.subjectGet(id));
    const subject =
      raw !== null && typeof raw === "object" && "subject" in (raw as Record<string, unknown>)
        ? (raw as Record<string, unknown>).subject
        : raw;
    if (!subject || typeof subject !== "object") {
      throw new BffError(404, "NOT_FOUND", "No results found.");
    }
    const details = subjectToDetails(subject, id);
    if (details.mediaType === "series") {
      try {
        const info = await mbGet(ENDPOINTS.seasonInfo(id));
        details.seasons = seasonsFromInfo(info);
      } catch {
        /* seasons are best-effort */
      }
    }
    cacheSet(key, details, 3_600_000);
    return details;
  } catch (err) {
    if (err instanceof BffError) throw err;
    if (err instanceof MovieBoxError) {
      if (err.status === 404) throw new BffError(404, "NOT_FOUND", "No results found.");
      const demo = demoTitle(id);
      if (demo) return demo; // labelled fallback
      throw new BffError(502, "PROVIDER_UNREACHABLE", "The provider is unreachable.", true);
    }
    throw err;
  }
}
