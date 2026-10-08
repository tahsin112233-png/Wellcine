/**
 * DASH manifest rewriting.
 *
 * The player must never touch the CDN directly (it can't set Referer/Cookie),
 * so every absolute segment/manifest URL inside an MPD is rewritten to a
 * freshly-signed /api/stream?token= URL. Relative references (SegmentTemplate
 * media="seg-$Number$.m4s") are resolved against the manifest URL first.
 */
import "server-only";

type Signer = (url: string) => string | null;

function replaceAll(text: string, re: RegExp, sign: Signer, base: string): string {
  return text.replace(re, (whole, captured: string) => {
    // Never touch URLs we already rewrote.
    if (captured.startsWith("/api/stream")) return whole;
    let absolute = captured;
    if (!/^https?:\/\//i.test(captured)) {
      try {
        absolute = new URL(captured, base).toString();
      } catch {
        return whole;
      }
    }
    const signed = sign(absolute);
    if (!signed) return whole;
    return whole.replace(captured, signed);
  });
}

/**
 * Rewrite an MPD so the player fetches every segment through /api/stream.
 * Only media-bearing URLs are rewritten; XML namespace URIs are left alone.
 */
export function rewriteManifest(mpd: string, manifestUrl: string, sign: Signer): string {
  // Base URL of the manifest directory, used to resolve relative references.
  let base = manifestUrl;
  try {
    const u = new URL(manifestUrl);
    base = u.origin + u.pathname.replace(/\/[^/]*$/, "/");
  } catch {
    /* keep manifestUrl */
  }

  let out = mpd;
  // <BaseURL>https://…</BaseURL>
  out = replaceAll(out, /<BaseURL>\s*(https?:\/\/[^<\s]+)\s*<\/BaseURL>/g, sign, base);
  // <BaseURL>relative/…</BaseURL>
  out = replaceAll(out, /<BaseURL>\s*([^<>\s][^<]*?)\s*<\/BaseURL>/g, sign, base);
  // SegmentTemplate media="…" / initialization="…"
  out = replaceAll(out, /\bmedia="([^"]+)"/g, sign, base);
  out = replaceAll(out, /\binitialization="([^"]+)"/g, sign, base);
  // SegmentList <SegmentURL media="…"/>
  out = replaceAll(out, /<SegmentURL[^>]*\bmedia="([^"]+)"/g, sign, base);
  return out;
}
