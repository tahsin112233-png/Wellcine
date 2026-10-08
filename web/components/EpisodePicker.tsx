"use client";

import { useState } from "react";
import Link from "next/link";
import type { Season } from "@/lib/bff/types";

/** Season tabs + episode grid linking into the player. */
export default function EpisodePicker({ id, seasons }: { id: string; seasons: Season[] }) {
  const [seasonIdx, setSeasonIdx] = useState(0);
  if (seasons.length === 0) return null;
  const season = seasons[Math.min(seasonIdx, seasons.length - 1)];

  return (
    <div className="mt-8">
      <div className="mb-4 flex flex-wrap gap-2">
        {seasons.map((s, i) => (
          <button
            key={s.number}
            onClick={() => setSeasonIdx(i)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              i === seasonIdx ? "bg-accent text-white" : "bg-white/10 text-zinc-300 hover:bg-white/20"
            }`}
          >
            Season {s.number}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
        {season.episodes.map((ep) => (
          <Link
            key={`${season.number}-${ep.number}`}
            href={`/watch/${id}?se=${season.number}&ep=${ep.number}`}
            className="rounded-lg bg-white/5 py-3 text-center text-sm font-medium text-zinc-200 transition hover:bg-accent hover:text-white"
          >
            E{ep.number}
          </Link>
        ))}
      </div>
    </div>
  );
}
