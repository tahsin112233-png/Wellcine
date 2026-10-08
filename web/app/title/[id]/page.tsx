import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchTitle } from "@/lib/bff/title";
import { BffError } from "@/lib/bff/errors";
import DemoBanner from "@/components/DemoBanner";
import EpisodePicker from "@/components/EpisodePicker";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  try {
    const t = await fetchTitle(id);
    return { title: t.title, description: t.synopsis };
  } catch {
    return { title: "Title" };
  }
}

export default async function TitlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let details;
  try {
    details = await fetchTitle(id);
  } catch (err) {
    if (err instanceof BffError && err.status === 404) notFound();
    throw err;
  }

  const firstEp = details.seasons[0]?.episodes[0];
  const playHref =
    details.mediaType === "series" && firstEp
      ? `/watch/${details.id}?se=${firstEp.season}&ep=${firstEp.number}`
      : `/watch/${details.id}`;

  return (
    <div className="pt-16">
      {details.demo && <DemoBanner />}
      <div className="relative overflow-hidden">
        {details.backdropUrl ? (
          <img
            src={details.backdropUrl}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full scale-110 object-cover object-top blur-md brightness-[0.35]"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-accent/25 via-panel to-ink" />
        )}
        <div className="hero-gradient absolute inset-0" />
        <div className="relative z-10 mx-auto flex max-w-6xl flex-col gap-8 px-4 py-16 md:flex-row md:px-10">
          <div className="w-44 shrink-0 md:w-60">
            {details.posterUrl ? (
              <img
                src={details.posterUrl}
                alt={details.title}
                className="w-full rounded-xl object-cover shadow-2xl ring-1 ring-white/10"
              />
            ) : (
              <div className="flex aspect-[2/3] w-full items-center justify-center rounded-xl bg-gradient-to-br from-accent/40 via-panel to-ink">
                <span className="text-7xl font-bold text-white/25">
                  {details.title.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>
          <div className="max-w-2xl">
            <div className="mb-2 flex items-center gap-2">
              {details.demo && (
                <span className="rounded bg-amber-500/20 px-2 py-0.5 text-xs font-semibold uppercase text-amber-300">
                  Demo
                </span>
              )}
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                {details.mediaType === "series" ? "Series" : "Film"}
              </span>
            </div>
            <h1 className="mb-3 text-4xl font-extrabold text-white md:text-5xl">{details.title}</h1>
            <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-zinc-300">
              {details.year && <span>{details.year}</span>}
              {details.rating && (
                <span className="rounded bg-amber-400/20 px-1.5 py-0.5 font-semibold text-amber-300">
                  ★ {details.rating}
                </span>
              )}
              {details.duration && <span>{details.duration}</span>}
              {details.genres.map((g) => (
                <span key={g} className="rounded-full border border-white/15 px-2 py-0.5 text-xs">
                  {g}
                </span>
              ))}
            </div>
            {details.tagline && (
              <p className="mb-3 italic text-zinc-400">“{details.tagline}”</p>
            )}
            {details.synopsis && (
              <p className="mb-6 leading-relaxed text-zinc-300">{details.synopsis}</p>
            )}
            {(details.director || details.stars) && (
              <dl className="mb-6 space-y-1 text-sm">
                {details.director && (
                  <div className="flex gap-2">
                    <dt className="w-20 shrink-0 text-zinc-500">Director</dt>
                    <dd className="text-zinc-300">{details.director}</dd>
                  </div>
                )}
                {details.stars && (
                  <div className="flex gap-2">
                    <dt className="w-20 shrink-0 text-zinc-500">Stars</dt>
                    <dd className="text-zinc-300">{details.stars}</dd>
                  </div>
                )}
              </dl>
            )}
            <div className="flex gap-3">
              <Link
                href={playHref}
                className="rounded-full bg-white px-8 py-3 text-sm font-bold text-black transition hover:bg-zinc-200"
              >
                ▶ Play
              </Link>
            </div>
            {details.dubs.length > 0 && (
              <div className="mt-6">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Dubbed versions
                </p>
                <div className="flex flex-wrap gap-2">
                  {details.dubs.map((d) => (
                    <Link
                      key={d.subjectId}
                      href={`/title/${d.subjectId}`}
                      className="rounded-full bg-white/10 px-3 py-1 text-xs text-zinc-300 transition hover:bg-white/20"
                    >
                      {d.language}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {details.mediaType === "series" && (
        <div className="mx-auto max-w-6xl px-4 pb-8 md:px-10">
          <EpisodePicker id={details.id} seasons={details.seasons} />
        </div>
      )}
    </div>
  );
}
