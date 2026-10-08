/**
 * MovieBox provider contract — values derived from the upstream
 * `mesamirh/MovieBox-Tui` Rust sources (src/providers/moviebox/*).
 *
 * Concepts, not code: host pool order, request-signing key material,
 * fingerprint pools, endpoint paths and placeholder-video markers.
 */

/** Rotating API host pool, in upstream priority order. */
export const HOST_POOL: readonly string[] = [
  "https://api6.aoneroom.com",
  "https://api5.aoneroom.com",
  "https://api4.aoneroom.com",
  "https://api4sg.aoneroom.com",
  "https://api3.aoneroom.com",
  "https://api6sg.aoneroom.com",
  "https://api.inmoviebox.com",
];

/** HTTP statuses that trigger host rotation + retry (upstream list). */
export const RETRY_STATUS_CODES: readonly number[] = [403, 406, 407, 429, 500, 502, 503, 504];

/**
 * HMAC-MD5 key material for the `x-tr-signature` header.
 * Copied from upstream `src/providers/moviebox/crypto.rs` DEFAULT_SECRET_BYTES.
 */
export const SIGNING = {
  secretBytes: Uint8Array.from([
    239, 168, 145, 151, 78, 236, 211, 20, 141, 246, 58, 166, 17, 96, 45, 239, 209, 1, 37,
    155, 165, 33, 2, 44, 87, 174, 5, 102, 189, 142,
  ]),
  bodyMaxBytes: 102400,
  signatureVersion: "2",
} as const;

/** Referer required by the CDN when fetching a resolved stream. */
export const STREAM_REFERER = "https://sportslive.wine";

/** Provider endpoint path templates. */
export const ENDPOINTS = {
  visitorLogin: "/wefeed-mobile-bff/user-api/visitor-login",
  tabOperating: (page: number, tabId: string) =>
    `/wefeed-mobile-bff/tab-operating?page=${page}&tabId=${tabId}&version=`,
  search: "/wefeed-mobile-bff/subject-api/search/v2",
  subjectGet: (id: string) => `/wefeed-mobile-bff/subject-api/get?subjectId=${encodeURIComponent(id)}`,
  seasonInfo: (id: string) =>
    `/wefeed-mobile-bff/subject-api/season-info?subjectId=${encodeURIComponent(id)}`,
  playInfo: (id: string, se: number, ep: number) =>
    se > 0 || ep > 0
      ? `/wefeed-mobile-bff/subject-api/play-info/v2?subjectId=${encodeURIComponent(id)}&se=${se}&ep=${ep}`
      : `/wefeed-mobile-bff/subject-api/play-info/v2?subjectId=${encodeURIComponent(id)}`,
  resource: (id: string, se: number, ep: number, page: number, perPage = 20) => {
    const base = `/wefeed-mobile-bff/subject-api/resource?subjectId=${encodeURIComponent(id)}`;
    const seEp = se > 0 || ep > 0 ? `&se=${se}&ep=${ep}` : "";
    return `${base}${seEp}&page=${page}&perPage=${perPage}`;
  },
  extCaptions: (id: string, resourceId: string) =>
    `/wefeed-mobile-bff/subject-api/get-ext-captions?subjectId=${encodeURIComponent(id)}&resourceId=${encodeURIComponent(resourceId)}`,
} as const;

/** Android client fingerprint pools (user-agent + x-client-info). */
export const FINGERPRINT = {
  packageName: "com.community.oneroom",
  versionName: "4.0.01.0813.03",
  spCode: "40401",
  versionCodes: [50020117, 50020118, 50020119, 50020120, 50020121] as const,
  androidVersions: [
    ["9", "PQ3A.190605.03081104"],
    ["10", "QP1A.191005.007.A3"],
    ["11", "RP1A.200720.011"],
    ["12", "S1B.220414.015"],
    ["13", "TQ2A.230405.003"],
  ] as const,
  devices: [
    ["23078RKD5C", "Redmi"],
    ["2201117TY", "Redmi"],
    ["2201117TG", "Redmi"],
    ["22101316G", "Redmi"],
    ["21121210G", "Redmi"],
    ["M2012K11AG", "Redmi"],
    ["M2007J20CG", "Redmi"],
  ] as const,
  networkTypes: ["NETWORK_WIFI", "NETWORK_MOBILE"] as const,
  timezones: [
    "Asia/Kolkata",
    "Asia/Shanghai",
    "Asia/Tokyo",
    "America/New_York",
    "Europe/London",
  ] as const,
  ipPrefixes: [
    "103.241",
    "49.36",
    "117.195",
    "106.198",
    "122.162",
    "157.32",
    "182.70",
    "103.58",
    "27.60",
    "59.90",
  ] as const,
} as const;

/** URL fragments that identify "this title is unavailable" placeholder videos. */
export const DEPRECATION_MARKERS: readonly string[] = [
  "1c7de0bd3393702d9191801f15f88f8d",
  "9a0461bc39da389663bf3dbb17091d3f",
  "b164fbfb4347792950bdfbfb563d39d9",
  "/notice.mp4",
  "macdn.aoneroom.com",
  "/other/",
];

/** Placeholder subtitle hash prefix (empty/placeholder caption file). */
export const PLACEHOLDER_SUB_HASH = "aa348f2541d13ffe";
