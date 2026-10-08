import { fetchHome, homeTab } from "@/lib/bff/home";
import { fetchTitle } from "@/lib/bff/title";
import DemoBanner from "@/components/DemoBanner";
import Hero from "@/components/Hero";
import Rail from "@/components/Rail";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const home = await fetchHome(homeTab(), 1);
  const featured = home.rails[0]?.items[0];
  const details = featured ? await fetchTitle(featured.id).catch(() => undefined) : undefined;

  return (
    <div className="pt-16">
      {home.demo && <DemoBanner />}
      {featured ? (
        <Hero item={featured} details={details} />
      ) : (
        <div className="px-4 py-24 text-center text-zinc-400 md:px-10">
          <h1 className="mb-2 text-2xl font-bold text-white">Nothing here yet</h1>
          <p>The catalog came back empty. Try again in a bit.</p>
        </div>
      )}
      <div className={featured ? "" : "pt-10"}>
        {home.rails.map((rail) => (
          <Rail key={rail.key} rail={rail} />
        ))}
      </div>
    </div>
  );
}
