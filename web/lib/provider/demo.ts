/**
 * Bundled offline demo catalog.
 *
 * Served (labelled `demo: true`) when MOVIEBOX_PROXY_URL is unset, when every
 * provider host fails (403/440/timeout), or when DEMO_MODE=true. The UI must
 * badge demo mode honestly — these rails are the bundled demo catalog.
 */
import "server-only";
import catalog from "../../data/demo-catalog.json";
import type {
  CatalogItem,
  HomeResponse,
  PlayResponse,
  SearchResponse,
  Season,
  TitleDetails,
} from "../bff/types";
import { streamUrlFor, signingSecret } from "../tokens";

export const DEMO_STREAM_URL =
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

interface DemoEntry {
  id: string;
  title: string;
  mediaType: "movie" | "series";
  year: string;
  synopsis: string;
  genres: string[];
  rating: string;
  director?: string;
  stars?: string;
  duration?: string;
  seasonEpCounts?: number[];
}

const entries = (catalog as { items: DemoEntry[] }).items;

const asCatalogItem = (e: DemoEntry): CatalogItem => ({
  id: e.id,
  title: e.title,
  mediaType: e.mediaType,
  year: e.year,
});

const seasonsOf = (e: DemoEntry): Season[] =>
  (e.seasonEpCounts ?? []).map((count, i) => ({
    number: i + 1,
    episodes: Array.from({ length: count }, (_, n) => ({ season: i + 1, number: n + 1 })),
  }));

export function demoEntry(id: string): DemoEntry | undefined {
  return entries.find((e) => e.id === id);
}

export function demoHome(tab: string, page: number): HomeResponse {
  const items = entries.map(asCatalogItem);
  const movies = items.filter((i) => i.mediaType === "movie");
  const series = items.filter((i) => i.mediaType === "series");
  const byRating = [...items].sort(
    (a, b) => Number(demoEntry(b.id)?.rating ?? 0) - Number(demoEntry(a.id)?.rating ?? 0),
  );
  const rails = [
    { key: "demo-trending", title: "Trending Now", items: byRating.slice(0, 12) },
    { key: "demo-movies", title: "Blockbuster Movies", items: movies },
    { key: "demo-series", title: "Series", items: series },
    { key: "demo-all", title: "All Titles", items },
  ];
  return { tab, rails, page, demo: true };
}

export function demoSearch(q: string, page: number): SearchResponse {
  const needle = q.toLowerCase();
  const results = entries
    .filter(
      (e) =>
        e.title.toLowerCase().includes(needle) ||
        e.genres.some((g) => g.toLowerCase().includes(needle)),
    )
    .map(asCatalogItem);
  const perPage = 15;
  const slice = results.slice((page - 1) * perPage, page * perPage);
  return { results: slice, page, exhausted: slice.length === 0, demo: true };
}

export function demoTitle(id: string): TitleDetails | null {
  const e = demoEntry(id);
  if (!e) return null;
  return {
    id: e.id,
    title: e.title,
    mediaType: e.mediaType,
    year: e.year,
    synopsis: e.synopsis,
    rating: e.rating,
    director: e.director,
    stars: e.stars,
    duration: e.duration,
    genres: e.genres,
    seasons: seasonsOf(e),
    dubs: [],
    demo: true,
  };
}

/**
 * Demo playback: a single 1080p BigBuckBunny stand-in source, proxied through
 * /api/stream like a real source (same code path). Requires the signing
 * secret — returns null without it so callers surface the config error.
 */
export function demoPlay(id: string, se: number, ep: number): PlayResponse | null {
  const e = demoEntry(id);
  if (!e) return null;
  if (!signingSecret()) return null;
  const url = streamUrlFor(
    {
      url: DEMO_STREAM_URL,
      title: `${e.title} (demo)`,
      headers: { "user-agent": "Mozilla/5.0" },
    },
    undefined,
  );
  if (!url) return null;
  return {
    id: e.id,
    title: e.title,
    mediaType: e.mediaType,
    season: e.mediaType === "series" ? se : undefined,
    episode: e.mediaType === "series" ? ep : undefined,
    sources: [
      {
        quality: "1080p",
        codec: "h264",
        label: "1080p · demo sample",
        url,
        isDash: false,
        demo: true,
      },
    ],
    subtitles: [],
    demo: true,
  };
}
