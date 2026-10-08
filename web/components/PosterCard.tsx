"use client";

import { useState } from "react";
import Link from "next/link";
import type { CatalogItem } from "@/lib/bff/types";

/** Poster image with a letter-placeholder fallback when no/invalid artwork. */
export default function PosterCard({ item, width = "w-36 md:w-44" }: { item: CatalogItem; width?: string }) {
  const [failed, setFailed] = useState(false);
  const showImg = item.posterUrl && !failed;
  return (
    <Link
      href={`/title/${item.id}`}
      className={`poster-card relative block shrink-0 overflow-hidden rounded-lg bg-panel ${width}`}
      title={item.title}
    >
      <div className="aspect-[2/3] w-full">
        {showImg ? (
          <img
            src={item.posterUrl}
            alt={item.title}
            loading="lazy"
            className="h-full w-full object-cover"
            onError={() => setFailed(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-accent/40 via-panel to-ink">
            <span className="px-2 text-center text-5xl font-bold text-white/25">
              {item.title.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
      </div>
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-2 pt-6">
        <p className="truncate text-xs font-medium text-white">{item.title}</p>
        <p className="text-[11px] text-zinc-400">
          {[item.year, item.mediaType === "series" ? "Series" : null].filter(Boolean).join(" · ")}
        </p>
      </div>
      {item.mediaType === "series" && (
        <span className="absolute left-2 top-2 rounded bg-accent/90 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white">
          Series
        </span>
      )}
    </Link>
  );
}
