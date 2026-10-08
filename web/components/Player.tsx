"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { PlayResponse, StreamSource } from "@/lib/bff/types";

interface Props {
  id: string;
  se: number;
  ep: number;
}

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: PlayResponse };

/**
 * Player page client: loads /api/play, renders an HTML5 <video> with a
 * quality picker and subtitle tracks. DASH manifests play via dash.js
 * (dynamically imported so the initial bundle stays lean); progressive
 * MP4 sources play natively.
 */
export default function Player({ id, se, ep }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const dashRef = useRef<{ reset: () => void } | null>(null);
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [sourceIdx, setSourceIdx] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    fetch(`/api/play?id=${encodeURIComponent(id)}&se=${se}&ep=${ep}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error?.message ?? `Play failed (${res.status})`);
        }
        return res.json();
      })
      .then((data: PlayResponse) => {
        if (!cancelled) {
          setSourceIdx(0);
          setState({ status: "ready", data });
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setState({
            status: "error",
            message: err instanceof Error ? err.message : "Failed to load sources.",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [id, se, ep]);

  const attach = useCallback(async (source: StreamSource) => {
    const video = videoRef.current;
    if (!video) return;
    // Tear down any previous dash.js instance.
    try {
      dashRef.current?.reset();
    } catch {
      /* ignore */
    }
    dashRef.current = null;

    if (source.isDash) {
      try {
        const mod = (await import("dashjs")) as unknown as {
          MediaPlayer?: () => { create: () => { initialize: (v: HTMLVideoElement, u: string, a: boolean) => void; reset: () => void } };
          default?: { MediaPlayer?: () => { create: () => { initialize: (v: HTMLVideoElement, u: string, a: boolean) => void; reset: () => void } } };
        };
        const factory = mod.MediaPlayer ?? mod.default?.MediaPlayer;
        if (!factory) throw new Error("dash.js unavailable");
        const player = factory().create();
        dashRef.current = player;
        player.initialize(video, source.url, true);
        return;
      } catch {
        throw new Error("This DASH stream needs dash.js, which failed to load.");
      }
    }
    video.src = source.url;
    video.load();
  }, []);

  const [attachError, setAttachError] = useState<string | null>(null);

  useEffect(() => {
    if (state.status !== "ready") return;
    const source = state.data.sources[sourceIdx];
    if (!source) return;
    setAttachError(null);
    attach(source).catch((err: unknown) => {
      setAttachError(err instanceof Error ? err.message : "Playback failed.");
    });
    return () => {
      try {
        dashRef.current?.reset();
      } catch {
        /* ignore */
      }
      dashRef.current = null;
    };
  }, [state, sourceIdx, attach]);

  if (state.status === "loading") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          <p className="text-zinc-400">Resolving sources…</p>
        </div>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <h1 className="mb-3 text-2xl font-bold text-white">Can&apos;t play this title</h1>
        <p className="mb-6 text-zinc-400">{state.message}</p>
        <Link href="/" className="rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-white">
          Back to home
        </Link>
      </div>
    );
  }

  const { data } = state;
  const source = data.sources[sourceIdx];
  const epLabel =
    data.mediaType === "series" && data.season && data.episode
      ? `S${data.season}:E${data.episode}`
      : null;

  return (
    <div className="mx-auto max-w-6xl px-4 pt-24 md:px-10">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Link href={`/title/${data.id}`} className="text-sm text-zinc-400 hover:text-white">
          ← Back
        </Link>
        <h1 className="text-xl font-bold text-white md:text-2xl">
          {data.title} {epLabel && <span className="text-zinc-400">{epLabel}</span>}
        </h1>
        {data.demo && (
          <span className="rounded bg-amber-500/20 px-2 py-0.5 text-xs font-semibold uppercase text-amber-300">
            Demo
          </span>
        )}
      </div>

      <div className="overflow-hidden rounded-xl bg-black ring-1 ring-white/10">
        <video
          ref={videoRef}
          controls
          playsInline
          className="aspect-video w-full"
          crossOrigin="anonymous"
        >
          {data.subtitles.map((t, i) => (
            <track
              key={t.url}
              kind="subtitles"
              src={t.url}
              srcLang={t.lang.slice(0, 2).toLowerCase()}
              label={t.label}
              default={i === 0}
            />
          ))}
        </video>
      </div>
      {attachError && <p className="mt-3 text-sm text-red-400">{attachError}</p>}

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Quality</p>
          <div className="flex flex-wrap gap-2">
            {data.sources.map((s, i) => (
              <button
                key={`${s.quality}-${i}`}
                onClick={() => setSourceIdx(i)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                  i === sourceIdx
                    ? "bg-accent text-white"
                    : "bg-white/10 text-zinc-300 hover:bg-white/20"
                }`}
              >
                {s.quality}
                {s.codec ? ` · ${s.codec}` : ""}
              </button>
            ))}
          </div>
        </div>
        {data.subtitles.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Subtitles ({data.subtitles.length})
            </p>
            <p className="text-sm text-zinc-400">
              {data.subtitles.map((t) => t.lang).join(", ")} — enable via the CC button
            </p>
          </div>
        )}
      </div>

      {data.demo && (
        <p className="mt-6 rounded-lg bg-amber-500/10 p-4 text-sm text-amber-200/90 ring-1 ring-inset ring-amber-500/30">
          Demo stream — this is the bundled BigBuckBunny sample, not the actual title. Set{" "}
          <code className="font-mono">MOVIEBOX_PROXY_URL</code> for real playback.
        </p>
      )}
    </div>
  );
}
