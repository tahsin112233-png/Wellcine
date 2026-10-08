import Link from "next/link";
import type { CatalogItem, TitleDetails } from "@/lib/bff/types";

/** Hero billboard with the featured title. */
export default function Hero({ item, details }: { item: CatalogItem; details?: TitleDetails }) {
  return (
    <section className="relative mb-10 flex min-h-[62vh] items-end overflow-hidden">
      {item.posterUrl ? (
        <img
          src={item.posterUrl}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full scale-110 object-cover object-top blur-md brightness-[0.45]"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-accent/30 via-panel to-ink" />
      )}
      <div className="hero-gradient absolute inset-0" />
      <div className="relative z-10 max-w-2xl px-4 pb-14 pt-32 md:px-10">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-accent">
          Featured {item.mediaType === "series" ? "Series" : "Film"}
        </p>
        <h1 className="mb-3 text-4xl font-extrabold leading-tight text-white md:text-6xl">
          {item.title}
        </h1>
        <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-zinc-300">
          {item.year && <span>{item.year}</span>}
          {details?.rating && (
            <span className="rounded bg-amber-400/20 px-1.5 py-0.5 font-semibold text-amber-300">
              ★ {details.rating}
            </span>
          )}
          {details?.duration && <span>{details.duration}</span>}
          {details?.genres?.slice(0, 3).map((g) => (
            <span key={g} className="rounded-full border border-white/15 px-2 py-0.5 text-xs">
              {g}
            </span>
          ))}
        </div>
        {details?.synopsis && (
          <p className="mb-6 line-clamp-3 max-w-xl text-sm leading-relaxed text-zinc-300 md:text-base">
            {details.synopsis}
          </p>
        )}
        <div className="flex gap-3">
          <Link
            href={
              item.mediaType === "series"
                ? `/title/${item.id}`
                : `/watch/${item.id}`
            }
            className="rounded-full bg-white px-7 py-2.5 text-sm font-bold text-black transition hover:bg-zinc-200"
          >
            ▶ Play
          </Link>
          <Link
            href={`/title/${item.id}`}
            className="rounded-full bg-white/15 px-7 py-2.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/25"
          >
            More info
          </Link>
        </div>
      </div>
    </section>
  );
}
