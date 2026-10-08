import type { Metadata } from "next";
import { fetchSearch } from "@/lib/bff/search";
import DemoBanner from "@/components/DemoBanner";
import PosterCard from "@/components/PosterCard";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}): Promise<Metadata> {
  const { q } = await searchParams;
  return { title: q ? `Search: ${q}` : "Browse" };
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q = "", page = "1" } = await searchParams;
  const query = q.trim();
  const pageNum = Math.max(1, Number(page) || 1);

  const result = query.length >= 2 ? await fetchSearch(query, pageNum).catch(() => null) : null;

  return (
    <div className="px-4 pt-24 md:px-10">
      {result?.demo && <DemoBanner />}
      <h1 className="mb-6 text-2xl font-bold text-white">
        {query ? (
          <>
            Results for <span className="text-accent">“{query}”</span>
          </>
        ) : (
          "Browse"
        )}
      </h1>

      {!query && (
        <p className="max-w-lg text-zinc-400">
          Use the search box in the header to find movies and series. Try “dune”, “breaking bad”
          or “squid game”.
        </p>
      )}
      {query && query.length < 2 && (
        <p className="text-zinc-400">Type at least 2 characters to search.</p>
      )}
      {result && result.results.length === 0 && (
        <p className="text-zinc-400">No results found{result.demo ? " in the demo catalog" : ""}.</p>
      )}
      {result && result.results.length > 0 && (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
          {result.results.map((item) => (
            <PosterCard key={item.id} item={item} width="w-full" />
          ))}
        </div>
      )}
    </div>
  );
}
