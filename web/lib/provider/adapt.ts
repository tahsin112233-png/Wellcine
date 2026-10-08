/**
 * Provider payload → BFF contract adapters.
 *
 * All parsing is defensive: provider IDs may be numbers or strings, fields
 * may be missing, and shapes vary between endpoints. Mirrors the upstream
 * TUI's defensive parsing (concepts only).
 */
import "server-only";
import {
  DEPRECATION_MARKERS,
  PLACEHOLDER_SUB_HASH,
  STREAM_REFERER,
} from "./contract";
import { clientUserAgent } from "./client";
import type {
  CatalogItem,
  DubOption,
  Episode,
  HomeRail,
  Season,
  TitleDetails,
} from "../bff/types";

/* ---------- tolerant accessors ---------- */

const asStr = (v: unknown): string | undefined => {
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return undefined;
};

const asNum = (v: unknown): number | undefined => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
};

const asArr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

const get = (o: unknown, ...keys: string[]): unknown => {
  if (o === null || typeof o !== "object") return undefined;
  const rec = o as Record<string, unknown>;
  for (const k of keys) {
    if (rec[k] !== undefined && rec[k] !== null) return rec[k];
  }
  return undefined;
};

/* ---------- catalog ---------- */

function extractYear(v: unknown): string | undefined {
  const s = asStr(v);
  if (!s) return undefined;
  const m = s.match(/\b(19|20)\d{2}\b/);
  return m ? m[0] : undefined;
}

/** Strip bracketed tags / language tags / season suffixes from display titles. */
export function cleanTitle(title: string): string {
  return title
    .replace(/\[[^\]]*\]/g, "")
    .replace(/\([^)]*(?:dub|sub|hindi|tamil|telugu)[^)]*\)/gi, "")
    .replace(/\s*-\s*season\s*\d+\s*$/i, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function subjectToCatalogItem(s: unknown): CatalogItem | null {
  const id = asStr(get(s, "subjectId", "id"));
  if (!id) return null;
  const stype = asNum(get(s, "subjectType", "stype"));
  const cover = get(s, "cover");
  return {
    id,
    title: cleanTitle(asStr(get(s, "title", "name")) ?? "Untitled"),
    mediaType: stype === 2 ? "series" : "movie",
    year: extractYear(get(s, "releaseDate", "year", "releaseInfo")),
    posterUrl: asStr(get(cover, "url") ?? get(s, "coverUrl", "poster", "pic")),
    seasonCount: asNum(get(s, "season")),
  };
}

function ratingOf(s: unknown): number {
  return asNum(get(s, "imdbRatingValue", "rating")) ?? 0;
}
function trendingOf(s: unknown): number {
  return asNum(get(s, "imdbTrending", "imdbPopularity", "viewers")) ?? 0;
}

interface GroupedItems {
  label?: string;
  banner: unknown[];
  rest: unknown[];
}

/** Pull subjects out of one `tab-operating` group object. */
function subjectsFromGroup(group: unknown): GroupedItems {
  const banners = asArr(get(group, "banner", "banners")).flatMap((b) =>
    asArr(get(b, "banners")),
  );
  const customItems = asArr(get(get(group, "customData"), "items"));
  const direct = asArr(get(group, "subjects"));
  const bannerSubjects = banners.map((b) => get(b, "subject")).filter(Boolean);
  const customSubjects = customItems.map((i) => get(i, "subject")).filter(Boolean);
  return {
    label: asStr(get(group, "name", "title")),
    banner: bannerSubjects,
    rest: [...customSubjects, ...direct],
  };
}

/**
 * Build HBO-Max-style rails from a `tab-operating` payload.
 * Prefers provider group names when the response carries them (≥2 labelled
 * groups); otherwise derives the heuristic rail set from §2.1 of the design doc.
 */
export function buildRails(payload: unknown): HomeRail[] {
  const groups = asArr(get(payload, "items")).map(subjectsFromGroup);
  const labelled = groups.filter((g) => g.label && g.banner.length + g.rest.length > 0);

  const dedupe = (rails: HomeRail[]): HomeRail[] => {
    const seen = new Set<string>();
    return rails.map((rail) => ({
      ...rail,
      items: rail.items.filter((item) => {
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      }),
    }));
  };

  if (labelled.length >= 2) {
    const rails = labelled.map((g, i) => {
      const items = [...g.banner, ...g.rest]
        .map(subjectToCatalogItem)
        .filter((x): x is CatalogItem => x !== null)
        .slice(0, 24);
      return {
        key: `group-${i}-${slugify(g.label ?? `rail-${i}`)}`,
        title: g.label!,
        items,
      };
    });
    return dedupe(rails).filter((r) => r.items.length > 0);
  }

  // Heuristic rails from the flattened catalog.
  const allRaw = groups.flatMap((g) => [...g.banner, ...g.rest]);
  const bannerRaw = groups.flatMap((g) => g.banner);
  const all = allRaw.map(subjectToCatalogItem).filter((x): x is CatalogItem => x !== null);
  const bannerItems = bannerRaw
    .map(subjectToCatalogItem)
    .filter((x): x is CatalogItem => x !== null);
  const rawById = new Map<string, unknown>();
  for (const s of allRaw) {
    const item = subjectToCatalogItem(s);
    if (item && !rawById.has(item.id)) rawById.set(item.id, s);
  }

  const byTrending = [...all].sort(
    (a, b) => trendingOf(rawById.get(b.id)) - trendingOf(rawById.get(a.id)),
  );
  const movies = all.filter((i) => i.mediaType === "movie");
  const series = all.filter((i) => i.mediaType === "series");
  const byRating = (list: CatalogItem[]) =>
    [...list].sort((a, b) => ratingOf(rawById.get(b.id)) - ratingOf(rawById.get(a.id)));
  const dramaish = (s: unknown): boolean => {
    const genres = asArr(get(s, "genre", "genres"))
      .map((g) => String(g).toLowerCase())
      .join(" ");
    return /drama|crime|thriller|mystery/.test(genres);
  };

  const rails: HomeRail[] = [
    { key: "trending-now", title: "Trending Now", items: [...bannerItems, ...byTrending].slice(0, 24) },
    { key: "blockbuster-movies", title: "Blockbuster Movies", items: byRating(movies).slice(0, 24) },
    {
      key: "prestige-drama",
      title: "Prestige Drama",
      items: byRating(series.filter((i) => dramaish(rawById.get(i.id)) || ratingOf(rawById.get(i.id)) >= 7.5)).slice(0, 24),
    },
    { key: "series", title: "Series", items: byTrending.filter((i) => i.mediaType === "series").slice(0, 24) },
    { key: "all-movies", title: "All Movies", items: byTrending.filter((i) => i.mediaType === "movie").slice(0, 24) },
  ];
  return dedupe(rails).filter((r) => r.items.length > 0);
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 32);
}

/* ---------- title details ---------- */

function durationStr(v: unknown): string | undefined {
  const s = asStr(v);
  if (s) return s;
  const n = asNum(v);
  if (n !== undefined && n > 0) return `${Math.round(n / 60)}m`;
  return undefined;
}

function ratingStr(v: unknown): string | undefined {
  const n = asNum(v);
  if (n === undefined) return undefined;
  return String(Math.round(n * 10) / 10);
}

export function subjectToDetails(subject: unknown, id: string): TitleDetails {
  const stype = asNum(get(subject, "subjectType", "stype"));
  const mediaType = stype === 2 ? "series" : "movie";
  const genres = asArr(get(subject, "genre", "genres"))
    .map((g) => asStr(g))
    .filter((g): g is string => !!g);
  const dubs: DubOption[] = asArr(get(subject, "dubs"))
    .map((d) => {
      const dubId = asStr(get(d, "subjectId", "id"));
      if (!dubId) return null;
      const language = asStr(get(d, "lanName", "language", "lang")) ?? "Dubbed";
      return {
        subjectId: dubId,
        language,
        label: asStr(get(d, "title", "name")) ?? language,
      } satisfies DubOption;
    })
    .filter((d): d is DubOption => d !== null);

  const posterUrl = asStr(
    get(get(subject, "cover"), "url") ?? get(subject, "coverUrl", "poster", "pic"),
  );

  return {
    id,
    title: cleanTitle(asStr(get(subject, "title", "name")) ?? "Untitled"),
    mediaType,
    year: extractYear(get(subject, "releaseDate", "year", "releaseInfo")),
    synopsis: asStr(get(subject, "description", "intro")),
    tagline: asStr(get(subject, "tagline")),
    rating: ratingStr(get(subject, "imdbRatingValue", "rating")),
    director: asStr(get(subject, "director")),
    stars: asStr(get(subject, "stars")),
    prints: asStr(get(subject, "prints")),
    audios: asStr(get(subject, "audios")),
    posterUrl,
    backdropUrl: posterUrl, // provider exposes poster only
    duration: durationStr(get(subject, "duration")),
    genres,
    seasons: [],
    dubs,
  };
}

export function seasonsFromInfo(info: unknown): Season[] {
  const list = asArr(get(info, "seasons", "seasonList", "list"));
  const seasons: Season[] = [];
  for (const entry of list) {
    const se = asNum(get(entry, "se", "season", "seasonNumber"));
    if (se === undefined) continue;
    let numbers: number[] = asArr(get(entry, "episodeNumbers", "episodes", "eps"))
      .map((e) => asNum(typeof e === "object" ? get(e, "ep", "episode", "number") : e))
      .filter((n): n is number => n !== undefined);
    const maxEp = asNum(get(entry, "maxEp", "episodeCount", "totalEpisodes"));
    if (numbers.length === 0 && maxEp !== undefined && maxEp > 0) {
      numbers = Array.from({ length: Math.min(maxEp, 200) }, (_, i) => i + 1);
    }
    const episodes: Episode[] = numbers.map((n) => ({ season: se, number: n }));
    seasons.push({ number: se, episodes });
  }
  seasons.sort((a, b) => a.number - b.number);
  return seasons;
}

/* ---------- stream sources ---------- */

export interface UnsignedSource {
  quality: string; // "1080p"
  codec?: string;
  sizeBytes?: number;
  label: string;
  resourceId?: string;
  upstreamUrl: string;
  isDash: boolean;
  cookie?: string;
  cookieExp?: number; // epoch seconds
  userAgent: string;
}

function isDeprecated(url: string): boolean {
  const lower = url.toLowerCase();
  return DEPRECATION_MARKERS.some((m) => lower.includes(m.toLowerCase()));
}

function b64UrlSafeDecode(input: string): string {
  let s = input.replace(/-/g, "+").replace(/_/g, "/").replace(/~/g, "/");
  while (s.length % 4 !== 0) s += "=";
  return Buffer.from(s, "base64").toString("utf8");
}

/**
 * Derive the playable URL from a play-info stream's signCookie.
 * CloudFront → decode policy → Resource minus trailing /* → /index.mpd
 * Edge-Cache → decode urlprefix → /index.mpd
 * else fall back to the stream's own url.
 */
export function deriveStreamUrl(stream: Record<string, unknown>): {
  url?: string;
  cookieExp?: number;
} {
  const cookie = asStr(get(stream, "signCookie")) ?? "";
  const direct = asStr(get(stream, "url"));

  const cf = cookie.match(/CloudFront-Policy=([^;]+)/);
  if (cf) {
    try {
      const policy = JSON.parse(b64UrlSafeDecode(cf[1])) as {
        Statement?: Array<{ Resource?: string; Condition?: { DateLessThan?: { "AWS:EpochTime"?: number } } }>;
      };
      const stmt = policy.Statement?.[0];
      const resource = stmt?.Resource?.replace(/\/\*$/, "");
      const exp = stmt?.Condition?.DateLessThan?.["AWS:EpochTime"];
      if (resource && /^https?:\/\//i.test(resource)) {
        return { url: `${resource.replace(/\/$/, "")}/index.mpd`, cookieExp: exp };
      }
    } catch {
      /* fall through */
    }
  }

  const edge = cookie.match(/urlprefix=([^:;]+)/);
  if (edge) {
    try {
      const base = b64UrlSafeDecode(edge[1]).trim();
      const t = cookie.match(/[;:]t=(\d+)/);
      if (/^https?:\/\//i.test(base)) {
        return {
          url: `${base.replace(/\/$/, "")}/index.mpd`,
          cookieExp: t ? Number(t[1]) : undefined,
        };
      }
    } catch {
      /* fall through */
    }
  }

  if (direct && /^https?:\/\//i.test(direct) && !isDeprecated(direct)) return { url: direct };
  return {};
}

function streamRequestHeaders(cookie?: string): Record<string, string> {
  const headers: Record<string, string> = {
    referer: STREAM_REFERER,
    "user-agent": clientUserAgent(),
  };
  if (cookie) {
    const normalized = cookie
      .split(";")
      .map((p) => p.trim())
      .filter(Boolean)
      .join("; ");
    if (normalized) headers.cookie = normalized;
  }
  return headers;
}

const RES_RE = /\b(2160|1440|1080|720|480|360)\b/;

export function sourcesFromPlayInfo(playInfo: unknown): UnsignedSource[] {
  const streams = asArr(get(playInfo, "streams", "streamList", "list"));
  const out: UnsignedSource[] = [];
  for (const raw of streams) {
    if (raw === null || typeof raw !== "object") continue;
    const stream = raw as Record<string, unknown>;
    const { url, cookieExp } = deriveStreamUrl(stream);
    if (!url || isDeprecated(url)) continue;
    const isDash = url.endsWith("/index.mpd");
    const codec = asStr(get(stream, "codecName", "codec"))?.toLowerCase();
    const totalSize = asNum(get(stream, "size"));
    const resList =
      asStr(get(stream, "resolutions", "displayResolutions")) ?? "1080,720,480";
    const resolutions = resList
      .split(",")
      .map((r) => Number(r.trim()))
      .filter((n) => Number.isFinite(n) && n > 0);
    const maxRes = Math.max(...(resolutions.length ? resolutions : [720]));
    const cookie = asStr(get(stream, "signCookie"));
    const resourceId = asStr(get(stream, "id", "resourceId"));

    for (const res of resolutions.length ? resolutions : [720]) {
      const scale = Math.min(1, Math.max(0.15, Math.pow(res / maxRes, 1.6)));
      out.push({
        quality: `${res}p`,
        codec,
        sizeBytes: totalSize !== undefined ? Math.round(totalSize * scale) : undefined,
        label: [res + "p", codec, asStr(get(stream, "format"))].filter(Boolean).join(" "),
        resourceId,
        upstreamUrl: url,
        isDash,
        cookie,
        cookieExp,
        userAgent: clientUserAgent(),
      });
    }
  }
  return out;
}

export function sourcesFromResources(
  resources: unknown,
  se: number,
  ep: number,
): UnsignedSource[] {
  const list = asArr(get(resources, "list", "resources", "items"));
  const out: UnsignedSource[] = [];
  for (const raw of list) {
    if (raw === null || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    const itemSe = asNum(get(r, "se"));
    const itemEp = asNum(get(r, "ep"));
    if (se > 0 || ep > 0) {
      // keep entries matching the requested episode, or entries with no se/ep info
      if (itemSe !== undefined && itemEp !== undefined && (itemSe !== se || itemEp !== ep)) {
        continue;
      }
    }
    const url = asStr(get(r, "resourceLink", "url"));
    if (!url || !/^https?:\/\//i.test(url) || isDeprecated(url)) continue;
    const res = asNum(get(r, "resolution"));
    const fileName = asStr(get(r, "fileName")) ?? "";
    const resFromName = fileName.match(RES_RE)?.[1];
    const quality = res ? `${res}p` : resFromName ? `${resFromName}p` : "SD";
    const uploader = asStr(get(r, "uploadBy", "source"));
    out.push({
      quality,
      codec: asStr(get(r, "codecName", "codec"))?.toLowerCase(),
      sizeBytes: asNum(get(r, "size")),
      label: [quality, uploader ?? fileName].filter(Boolean).join(" · "),
      resourceId: asStr(get(r, "resourceId", "id")),
      upstreamUrl: url,
      isDash: url.endsWith("/index.mpd"),
      userAgent: clientUserAgent(),
    });
  }
  return out;
}

const stripQuery = (url: string): string => {
  const i = url.indexOf("?");
  return i === -1 ? url : url.slice(0, i);
};

const resRank = (q: string): number => {
  const m = q.match(/^(\d+)p$/);
  return m ? Number(m[1]) : 0;
};

/** Merge, dedupe by URL (sans query), sort resolution desc then size desc. */
export function mergeSources(lists: UnsignedSource[][]): UnsignedSource[] {
  const seen = new Set<string>();
  const merged: UnsignedSource[] = [];
  for (const list of lists) {
    for (const s of list) {
      const key = stripQuery(s.upstreamUrl);
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(s);
    }
  }
  merged.sort(
    (a, b) => resRank(b.quality) - resRank(a.quality) || (b.sizeBytes ?? 0) - (a.sizeBytes ?? 0),
  );
  return merged;
}

/** Earliest upstream cookie expiry across sources (epoch seconds). */
export function minCookieExp(sources: UnsignedSource[]): number | undefined {
  let min: number | undefined;
  for (const s of sources) {
    if (s.cookieExp !== undefined && (!min || s.cookieExp < min)) min = s.cookieExp;
  }
  return min;
}

export { streamRequestHeaders };

/* ---------- subtitles ---------- */

export interface UnsignedSubtitle {
  lang: string;
  label: string;
  upstreamUrl: string;
}

export function captionsToTracks(captions: unknown): UnsignedSubtitle[] {
  const list = asArr(get(captions, "extCaptions", "captions", "list"));
  const seen = new Set<string>();
  const out: UnsignedSubtitle[] = [];
  for (const raw of list) {
    if (raw === null || typeof raw !== "object") continue;
    const c = raw as Record<string, unknown>;
    const url = asStr(get(c, "url"));
    if (!url || !/^https?:\/\//i.test(url)) continue;
    if (url.toLowerCase().includes(PLACEHOLDER_SUB_HASH)) continue;
    if (seen.has(stripQuery(url))) continue;
    const size = asNum(get(c, "size")) ?? 0;
    if (size <= 50) continue;
    const lanName = asStr(get(c, "lanName")) ?? "";
    if (lanName === "IN" && size <= 100) continue;
    seen.add(stripQuery(url));
    const lang = lanName || asStr(get(c, "lan")) || "Unknown";
    out.push({
      lang,
      label: `${lang}${size ? ` · ${Math.round(size / 1024)}KB` : ""}`,
      upstreamUrl: url,
    });
  }
  return out;
}

/* ---------- search results ---------- */

export function resultsFromSearch(payload: unknown): CatalogItem[] {
  const data = payload as Record<string, unknown> | null;
  const nested = asArr(get(data, "results"))[0];
  const subjects = asArr(get(nested, "subjects"));
  const fallback = asArr(get(data, "list"));
  const list = subjects.length > 0 ? subjects : fallback;
  return list.map(subjectToCatalogItem).filter((x): x is CatalogItem => x !== null);
}
