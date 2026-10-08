/**
 * Signed stream/subtitle tokens.
 *
 * The CDN only serves media when the request carries upstream Referer / Cookie
 * / User-Agent headers, which a browser cannot set cross-origin. Playback goes
 * through /api/stream and /api/subtitle, and the target URL + headers are
 * handed to the client as an opaque, HMAC-SHA256-signed, short-lived token.
 * Signing keeps the routes from becoming open proxies.
 *
 * Token format: base64url(payloadJson) + "." + base64url(hmacSha256(payloadB64))
 */
import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

export const CONFIG_ERROR_MESSAGE =
  "STREAM_SIGNING_SECRET is not set. Set it to a random value (e.g. `openssl rand -hex 32`) in the deployment environment.";

/** The signing key, or null when unset. Never falls back to a default. */
export function signingSecret(): string | null {
  const s = process.env.STREAM_SIGNING_SECRET?.trim();
  return s ? s : null;
}

export const tokenTtlSec = (): number => Number(process.env.STREAM_TOKEN_TTL_SEC ?? 21_600);

export interface StreamTarget {
  /** Upstream URL to fetch (DASH manifest, segment, media file, caption). */
  url: string;
  /** Headers to inject server-side (referer, user-agent, cookie). */
  headers?: Record<string, string>;
  /** Restricts what the proxy will return for this token. */
  kind?: "video" | "text";
  /** True when `url` is a DASH manifest that must be rewritten, not relayed. */
  mpd?: boolean;
  /** Title, for logging / Content-Disposition only. */
  title?: string;
  /** Epoch seconds at which this token expires (echoed on verify). */
  exp?: number;
}

interface Payload extends StreamTarget {
  exp: number; // epoch seconds
}

const b64url = (buf: Buffer): string => buf.toString("base64url");

/**
 * Mint a signed token. `expOverride` lets callers clamp the token lifetime to
 * the upstream signed-cookie expiry (the token must die when the signature
 * dies). Returns null when no signing secret is configured.
 */
export function signStreamTarget(target: StreamTarget, expOverride?: number): string | null {
  const secret = signingSecret();
  if (!secret) return null;
  const exp =
    expOverride !== undefined
      ? Math.min(expOverride, Math.floor(Date.now() / 1000) + tokenTtlSec())
      : Math.floor(Date.now() / 1000) + tokenTtlSec();
  const payload: Payload = { ...target, exp };
  const body = b64url(Buffer.from(JSON.stringify(payload), "utf8"));
  const sig = b64url(createHmac("sha256", secret).update(body).digest());
  return `${body}.${sig}`;
}

/** Verify a token with a constant-time signature compare. Null = reject. */
export function verifyStreamToken(token: string): StreamTarget | null {
  const secret = signingSecret();
  if (!secret) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;

  const expected = b64url(createHmac("sha256", secret).update(body).digest());
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Payload;
    if (!payload.url || typeof payload.url !== "string") return null;
    if (!/^https?:\/\//i.test(payload.url)) return null;
    if (typeof payload.exp !== "number" || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return {
      url: payload.url,
      headers: payload.headers,
      kind: payload.kind ?? "video",
      mpd: payload.mpd,
      title: payload.title,
      exp: payload.exp,
    };
  } catch {
    return null;
  }
}

export const streamUrlFor = (target: StreamTarget, expOverride?: number): string | null => {
  const token = signStreamTarget(target, expOverride);
  return token ? `/api/stream?token=${encodeURIComponent(token)}` : null;
};

export const subtitleUrlFor = (url: string): string | null => {
  const token = signStreamTarget({ url, kind: "text" });
  return token ? `/api/subtitle?token=${encodeURIComponent(token)}` : null;
};
