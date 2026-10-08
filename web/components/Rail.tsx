"use client";

import { useRef } from "react";
import type { HomeRail } from "@/lib/bff/types";
import PosterCard from "./PosterCard";

/** Horizontal rail with arrow controls and edge fades. */
export default function Rail({ rail }: { rail: HomeRail }) {
  const scroller = useRef<HTMLDivElement>(null);

  const scrollBy = (dir: number) => {
    const el = scroller.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };

  if (rail.items.length === 0) return null;

  return (
    <section className="group/rail relative mb-8">
      <h2 className="mb-3 px-4 text-lg font-semibold text-white md:px-10">{rail.title}</h2>
      <div className="relative">
        <button
          aria-label="Scroll left"
          onClick={() => scrollBy(-1)}
          className="absolute left-0 top-0 z-20 hidden h-full w-10 items-center justify-center bg-black/50 text-2xl text-white opacity-0 transition group-hover/rail:opacity-100 md:flex"
        >
          ‹
        </button>
        <div ref={scroller} className="no-scrollbar flex gap-3 overflow-x-auto px-4 md:px-10">
          {rail.items.map((item) => (
            <PosterCard key={item.id} item={item} />
          ))}
        </div>
        <button
          aria-label="Scroll right"
          onClick={() => scrollBy(1)}
          className="absolute right-0 top-0 z-20 hidden h-full w-10 items-center justify-center bg-black/50 text-2xl text-white opacity-0 transition group-hover/rail:opacity-100 md:flex"
        >
          ›
        </button>
        <div className="rail-fade absolute right-0 top-0 h-full w-16" />
      </div>
    </section>
  );
}
