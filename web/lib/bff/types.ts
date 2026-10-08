/**
 * well-cinebox BFF contract — mirrors §2 of the BFF design doc
 * (wellcinebox/hidden_files/bff-design.md). Concepts only, no upstream code.
 */

export type MediaType = "movie" | "series";

export interface CatalogItem {
  id: string; // provider subjectId
  title: string;
  mediaType: MediaType;
  year?: string; // "2010"
  posterUrl?: string;
  seasonCount?: number;
}

export interface HomeRail {
  key: string; // stable slug, e.g. "trending-now"
  title: string; // display title
  items: CatalogItem[];
}

export interface Episode {
  season: number;
  number: number;
  title?: string;
  overview?: string;
}

export interface Season {
  number: number;
  episodes: Episode[];
}

export interface DubOption {
  subjectId: string;
  language: string;
  label: string;
}

export interface TitleDetails {
  id: string;
  title: string;
  mediaType: MediaType;
  year?: string;
  synopsis?: string;
  tagline?: string;
  rating?: string; // "8.7"
  director?: string;
  stars?: string;
  prints?: string;
  audios?: string;
  posterUrl?: string;
  backdropUrl?: string; // provider gives poster only; poster fallback
  duration?: string; // "169m"
  genres: string[];
  seasons: Season[];
  dubs: DubOption[];
  demo?: boolean;
}

export interface StreamSource {
  quality: string; // "1080p"
  codec?: string; // "hevc"
  sizeBytes?: number;
  label: string; // "1080p hevc" / uploader
  resourceId?: string;
  url: string; // SIGNED /api/stream?token=… URL (never the raw upstream URL)
  isDash: boolean;
  demo?: boolean;
}

export interface SubtitleTrack {
  lang: string; // "English"
  label: string;
  url: string; // /api/subtitle?token=… (serves VTT)
}

export interface ApiError {
  error: { code: string; message: string; retryable?: boolean };
}

export interface HomeResponse {
  tab: string;
  rails: HomeRail[];
  page: number;
  demo?: boolean;
}

export interface SearchResponse {
  results: CatalogItem[];
  page: number;
  exhausted: boolean;
  demo?: boolean;
}

export interface PlayResponse {
  id: string;
  title: string;
  mediaType: MediaType;
  season?: number;
  episode?: number;
  sources: StreamSource[];
  subtitles: SubtitleTrack[];
  demo?: boolean;
}

export interface DebugProviderResponse {
  proxy: { configured: boolean; urlHost?: string };
  session: { valid: boolean };
  hosts: Array<{
    host: string;
    reachable: boolean;
    status?: number;
    latencyMs?: number;
    viaProxy: boolean;
    error?: string;
  }>;
  activeHost: string;
  demoMode: boolean;
  now: string;
}
