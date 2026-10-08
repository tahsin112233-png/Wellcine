import { NextRequest, NextResponse } from "next/server";
import { mbGet } from "@/lib/provider/client";
import { ENDPOINTS } from "@/lib/provider/contract";
import { captionsToTracks } from "@/lib/provider/adapt";
import { outboundFetch } from "@/lib/net";
import {
  CONFIG_ERROR_MESSAGE,
  signStreamTarget,
  signingSecret,
  verifyStreamToken,
} from "@/lib/tokens";
import { toVtt } from "@/lib/srt2vtt";
import { cacheGet, cacheSet } from "@/lib/cache";
import { toErrorResponse } from "@/lib/bff/respond";
import { BffError } from "@/lib/bff/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/subtitle — two modes:
 *   list:     ?id=<subjectId>&rid=<resourceId> → { tracks: [{lang,label,url}] }
 *   download: ?token=<signed> → WebVTT bytes (SRT converted on the fly)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  try {
    if (token) return await download(token);

    if (!signingSecret()) {
      throw new BffError(500, "CONFIG", CONFIG_ERROR_MESSAGE);
    }
    const id = searchParams.get("id") ?? "";
    const rid = searchParams.get("rid") ?? "";
    if (!id || !rid) {
      throw new BffError(400, "BAD_REQUEST", "Provide ?token= or ?id= and ?rid=.");
    }

    const key = `subs:${id}:${rid}`;
    const cached = cacheGet<{ tracks: unknown[] }>(key);
    if (cached) return NextResponse.json(cached);

    const data = await mbGet(ENDPOINTS.extCaptions(id, rid));
    const tracks = captionsToTracks(data)
      .map((t) => {
        const signed = signStreamTarget({ url: t.upstreamUrl, kind: "text" });
        return signed
          ? { lang: t.lang, label: t.label, url: `/api/subtitle?token=${encodeURIComponent(signed)}` }
          : null;
      })
      .filter((t): t is { lang: string; label: string; url: string } => t !== null);
    const res = { tracks };
    cacheSet(key, res, 3_600_000);
    return NextResponse.json(res);
  } catch (err) {
    return toErrorResponse(err);
  }
}

async function download(token: string): Promise<Response> {
  if (!signingSecret()) {
    return NextResponse.json(
      { error: { code: "CONFIG", message: CONFIG_ERROR_MESSAGE } },
      { status: 500 },
    );
  }
  const target = verifyStreamToken(token);
  if (!target || target.kind !== "text") {
    return NextResponse.json(
      { error: { code: "BAD_TOKEN", message: "Invalid or expired token." } },
      { status: 403 },
    );
  }

  const timeoutMs = Number(process.env.MOVIEBOX_TIMEOUT_MS ?? 12_000);
  let res: Response;
  try {
    res = await outboundFetch(target.url, {
      headers: { "user-agent": "Mozilla/5.0", accept: "*/*" },
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    return NextResponse.json(
      { error: { code: "PROVIDER_UNREACHABLE", message: "Subtitle fetch failed.", retryable: true } },
      { status: 502 },
    );
  }
  if (!res.ok) {
    return NextResponse.json(
      { error: { code: "PROVIDER_UNREACHABLE", message: `Subtitle status ${res.status}.`, retryable: true } },
      { status: 502 },
    );
  }
  const text = await res.text();
  const vtt = toVtt(text, target.url);
  if (vtt === null) {
    return NextResponse.json(
      { error: { code: "SUBTITLE_FORMAT", message: "Unsupported subtitle format." } },
      { status: 415 },
    );
  }
  return new Response(vtt, {
    headers: {
      "content-type": "text/vtt; charset=utf-8",
      "cache-control": "private, max-age=3600",
      "access-control-allow-origin": "*",
    },
  });
}
