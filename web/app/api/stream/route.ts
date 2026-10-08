import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { outboundFetch } from "@/lib/net";
import {
  CONFIG_ERROR_MESSAGE,
  signStreamTarget,
  signingSecret,
  verifyStreamToken,
  type StreamTarget,
} from "@/lib/tokens";
import { rewriteManifest } from "@/lib/mpd";
import { cacheGet, cacheSet } from "@/lib/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "transfer-encoding",
  "upgrade",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
]);

const tokenError = (message: string, status: number) =>
  NextResponse.json({ error: { code: "BAD_TOKEN", message } }, { status });

/**
 * Fail a stalled stream: cancel the upstream reader if no chunk arrives
 * within `idleMs` (mirrors upstream's chunk-idle watchdog).
 */
function withIdleWatchdog(
  stream: ReadableStream<Uint8Array>,
  idleMs: number,
): ReadableStream<Uint8Array> {
  const reader = stream.getReader();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const arm = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      reader.cancel(new Error("upstream idle timeout")).catch(() => undefined);
    }, idleMs);
    // Don't keep the lambda alive for the watchdog alone.
    (timer as unknown as { unref?: () => void }).unref?.();
  };
  arm();
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        if (timer) clearTimeout(timer);
        controller.close();
        return;
      }
      arm();
      controller.enqueue(value);
    },
    cancel(reason) {
      if (timer) clearTimeout(timer);
      return reader.cancel(reason);
    },
  });
}

function upstreamHeaders(target: StreamTarget): Headers {
  const headers = new Headers();
  for (const [k, v] of Object.entries(target.headers ?? {})) headers.set(k, v);
  headers.set("accept", "*/*");
  if (!headers.has("user-agent")) headers.set("user-agent", "Mozilla/5.0");
  return headers;
}

/** Fetch a DASH manifest server-side, rewrite segment URLs, serve it. */
async function serveManifest(target: StreamTarget): Promise<Response> {
  const key = `mpd:${createHash("sha256").update(target.url).digest("hex")}`;
  const cached = cacheGet<string>(key);
  if (cached) {
    return new Response(cached, {
      headers: {
        "content-type": "application/dash+xml",
        "cache-control": "private, max-age=60",
      },
    });
  }

  const timeoutMs = Number(process.env.MOVIEBOX_TIMEOUT_MS ?? 12_000);
  let res: Response;
  try {
    res = await outboundFetch(target.url, {
      headers: upstreamHeaders(target),
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    return NextResponse.json(
      { error: { code: "PROVIDER_UNREACHABLE", message: "Upstream manifest fetch failed.", retryable: true } },
      { status: 502 },
    );
  }
  if (!res.ok) {
    return NextResponse.json(
      { error: { code: "PROVIDER_UNREACHABLE", message: `Upstream manifest status ${res.status}.`, retryable: true } },
      { status: 502 },
    );
  }
  const text = await res.text();
  const sign = (url: string): string | null => {
    const token = signStreamTarget(
      { url, headers: target.headers, kind: "video", title: target.title },
      target.exp,
    );
    return token ? `/api/stream?token=${encodeURIComponent(token)}` : null;
  };
  const rewritten = rewriteManifest(text, target.url, sign);

  // Cache the rewritten manifest: min(cookie TTL, 5 min).
  const ttlMs = Math.min(
    5 * 60_000,
    Math.max(60_000, (target.exp ?? Math.floor(Date.now() / 1000) + 300) * 1000 - Date.now()),
  );
  cacheSet(key, rewritten, ttlMs);

  return new Response(rewritten, {
    headers: {
      "content-type": "application/dash+xml",
      "cache-control": "private, max-age=60",
      "access-control-allow-origin": "*",
    },
  });
}

/** Range-aware byte relay with server-side Referer/Cookie injection. */
async function relayBytes(request: NextRequest, target: StreamTarget): Promise<Response> {
  const headers = upstreamHeaders(target);
  const range = request.headers.get("range");
  if (range) headers.set("range", range);

  let upstream: Response;
  try {
    upstream = await outboundFetch(target.url, {
      headers,
      redirect: "follow",
      cache: "no-store",
      // Total watchdog; idle stalls are caught by withIdleWatchdog below.
      signal: AbortSignal.timeout(600_000),
    });
  } catch {
    return NextResponse.json(
      { error: { code: "PROVIDER_UNREACHABLE", message: "Upstream fetch failed.", retryable: true } },
      { status: 502 },
    );
  }

  const out = new Headers();
  upstream.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (HOP_BY_HOP.has(lower) || lower === "set-cookie" || lower === "content-encoding") return;
    out.set(key, value);
  });
  out.set("accept-ranges", "bytes");
  out.set("cache-control", "private, max-age=0, no-store");
  out.set("access-control-allow-origin", "*");
  if (!out.has("content-type")) out.set("content-type", "video/mp4");

  const body = upstream.body
    ? withIdleWatchdog(upstream.body as ReadableStream<Uint8Array>, 60_000)
    : null;

  return new Response(body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: out,
  });
}

async function handle(request: NextRequest): Promise<Response> {
  if (!signingSecret()) {
    return NextResponse.json(
      { error: { code: "CONFIG", message: CONFIG_ERROR_MESSAGE } },
      { status: 500 },
    );
  }
  const token = new URL(request.url).searchParams.get("token");
  if (!token) return tokenError("Missing token.", 400);

  const target = verifyStreamToken(token);
  if (!target) return tokenError("Invalid or expired token.", 403);
  if (target.kind === "text") {
    return NextResponse.json(
      { error: { code: "BAD_TOKEN", message: "This token is for subtitles; use /api/subtitle." } },
      { status: 400 },
    );
  }

  // Never log the upstream URL, cookie headers, or the token.
  if (target.mpd || target.url.endsWith("/index.mpd")) return serveManifest(target);
  return relayBytes(request, target);
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function HEAD(request: NextRequest) {
  const res = await handle(request);
  // HEAD: same headers, no body.
  return new Response(null, { status: res.status, headers: res.headers });
}

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,HEAD,OPTIONS",
      "access-control-allow-headers": "range",
    },
  });
}
