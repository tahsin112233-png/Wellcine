import "server-only";
import { mbGet, MovieBoxError } from "../provider/client";
import { ENDPOINTS } from "../provider/contract";
import {
  captionsToTracks,
  mergeSources,
  minCookieExp,
  sourcesFromPlayInfo,
  sourcesFromResources,
  streamRequestHeaders,
  subjectToDetails,
  type UnsignedSource,
  type UnsignedSubtitle,
} from "../provider/adapt";
import { demoPlay } from "../provider/demo";
import { cacheGet, cacheSet } from "../cache";
import { CONFIG_ERROR_MESSAGE, signStreamTarget, signingSecret, subtitleUrlFor } from "../tokens";
import { BffError } from "./errors";
import { demoModeActive } from "./home";
import type { PlayResponse, StreamSource, SubtitleTrack, TitleDetails } from "./types";

/** Fetch up to 3 resource pages (best-effort; a page error stops pagination). */
async function fetchResourcePages(id: string, se: number, ep: number): Promise<unknown[]> {
  const pages: unknown[] = [];
  for (let page = 1; page <= 3; page += 1) {
    try {
      const data = await mbGet(ENDPOINTS.resource(id, se, ep, page));
      pages.push(data);
      const list = (data as Record<string, unknown> | null)?.list;
      if (!Array.isArray(list) || list.length === 0) break;
      const pager = (data as Record<string, unknown> | null)?.pager as
        | Record<string, unknown>
        | undefined;
      const total = typeof pager?.totalPage === "number" ? pager.totalPage : undefined;
      if (total !== undefined && page >= total) break;
    } catch {
      break;
    }
  }
  return pages;
}

function signSource(
  s: UnsignedSource,
  title: string,
): StreamSource | null {
  const token = signStreamTarget(
    {
      url: s.upstreamUrl,
      headers: streamRequestHeaders(s.cookie),
      kind: "video",
      mpd: s.isDash || undefined,
      title,
    },
    s.cookieExp,
  );
  if (!token) return null;
  return {
    quality: s.quality,
    codec: s.codec,
    sizeBytes: s.sizeBytes,
    label: s.label,
    resourceId: s.resourceId,
    url: `/api/stream?token=${encodeURIComponent(token)}`,
    isDash: s.isDash,
  };
}

/**
 * Subtitle aggregation: primary subject + up to 3 sibling dub subject IDs,
 * 15 s overall budget, failure non-fatal.
 */
async function fetchSubtitles(
  id: string,
  se: number,
  ep: number,
  sources: UnsignedSource[],
  dubs: TitleDetails["dubs"],
): Promise<SubtitleTrack[]> {
  const found = new Map<string, UnsignedSubtitle>();
  const add = (tracks: UnsignedSubtitle[]): void => {
    for (const t of tracks) {
      if (!found.has(t.upstreamUrl)) found.set(t.upstreamUrl, t);
    }
  };

  const captionsFor = async (subjectId: string, resourceId?: string): Promise<void> => {
    try {
      let rid = resourceId;
      if (!rid) {
        const data = await mbGet(ENDPOINTS.resource(subjectId, se, ep, 1));
        const list = ((data as Record<string, unknown> | null)?.list ?? []) as Array<
          Record<string, unknown>
        >;
        const match =
          list.find((r) => {
            const rSe = typeof r.se === "number" ? r.se : Number(r.se);
            const rEp = typeof r.ep === "number" ? r.ep : Number(r.ep);
            return (se <= 0 && ep <= 0) || (rSe === se && rEp === ep);
          }) ?? list[0];
        rid = match ? String(match.resourceId ?? match.id ?? "") : "";
      }
      if (!rid) return;
      const data = await mbGet(ENDPOINTS.extCaptions(subjectId, rid));
      add(captionsToTracks(data));
    } catch {
      /* non-fatal */
    }
  };

  const primaryRid = sources.find((s) => s.resourceId)?.resourceId;
  const jobs: Promise<void>[] = [captionsFor(id, primaryRid)];
  for (const dub of dubs.slice(0, 3)) jobs.push(captionsFor(dub.subjectId));

  await Promise.race([
    Promise.all(jobs),
    new Promise((r) => setTimeout(r, 15_000)),
  ]);

  const tracks: SubtitleTrack[] = [];
  for (const t of found.values()) {
    const url = subtitleUrlFor(t.upstreamUrl);
    if (url) tracks.push({ lang: t.lang, label: t.label, url });
  }
  return tracks;
}

export async function fetchPlay(id: string, se: number, ep: number): Promise<PlayResponse> {
  if (!id.trim()) throw new BffError(400, "BAD_REQUEST", "Missing title id.");

  if (!signingSecret()) {
    throw new BffError(500, "CONFIG", CONFIG_ERROR_MESSAGE);
  }

  if (demoModeActive()) {
    const demo = demoPlay(id, se, ep);
    if (!demo) throw new BffError(404, "NOT_FOUND", "No results found.");
    return demo;
  }

  const key = `play:${id}:${se}:${ep}`;
  const cached = cacheGet<PlayResponse>(key);
  if (cached) return cached;

  try {
    const [playInfo, resourcePages, rawDetails] = await Promise.all([
      mbGet(ENDPOINTS.playInfo(id, se, ep)).catch(() => null),
      fetchResourcePages(id, se, ep),
      mbGet(ENDPOINTS.subjectGet(id)).catch(() => null),
    ]);

    const sources = mergeSources([
      sourcesFromPlayInfo(playInfo),
      ...resourcePages.map((p) => sourcesFromResources(p, se, ep)),
    ]);
    if (sources.length === 0) {
      throw new BffError(502, "NO_SOURCES", "No playable sources found for this title.");
    }

    let titleText = id;
    let mediaType: PlayResponse["mediaType"] = se > 0 || ep > 0 ? "series" : "movie";
    let dubs: TitleDetails["dubs"] = [];
    if (rawDetails && typeof rawDetails === "object") {
      const subject =
        "subject" in (rawDetails as Record<string, unknown>)
          ? (rawDetails as Record<string, unknown>).subject
          : rawDetails;
      try {
        const details = subjectToDetails(subject, id);
        titleText = details.title;
        mediaType = details.mediaType;
        dubs = details.dubs;
      } catch {
        /* keep defaults */
      }
    }

    const signed = sources
      .map((s) => signSource(s, titleText))
      .filter((s): s is StreamSource => s !== null);
    if (signed.length === 0) {
      throw new BffError(500, "CONFIG", CONFIG_ERROR_MESSAGE);
    }

    const subtitles = await fetchSubtitles(id, se, ep, sources, dubs);

    const res: PlayResponse = {
      id,
      title: titleText,
      mediaType,
      season: mediaType === "series" && se > 0 ? se : undefined,
      episode: mediaType === "series" && ep > 0 ? ep : undefined,
      sources: signed,
      subtitles,
    };

    // Never serve a signed URL past its cookie expiry (min 60 s, max 2 h).
    const nowS = Math.floor(Date.now() / 1000);
    const cookieExp = minCookieExp(sources);
    const ttlMs =
      cookieExp !== undefined
        ? Math.max(60_000, Math.min(cookieExp - nowS, 7200) * 1000)
        : 120_000;
    cacheSet(key, res, ttlMs);
    return res;
  } catch (err) {
    if (err instanceof BffError) throw err;
    if (err instanceof MovieBoxError) {
      if (err.status === 404) throw new BffError(404, "NOT_FOUND", "No results found.");
      const demo = demoPlay(id, se, ep);
      if (demo) return demo; // labelled fallback
      throw new BffError(502, "PROVIDER_UNREACHABLE", "The provider is unreachable.", true);
    }
    throw err;
  }
}
