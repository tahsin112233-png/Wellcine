import type { Metadata } from "next";
import { fetchTitle } from "@/lib/bff/title";
import Player from "@/components/Player";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ se?: string; ep?: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const { se, ep } = await searchParams;
  try {
    const t = await fetchTitle(id);
    const epLabel = se && ep ? ` S${se}:E${ep}` : "";
    return { title: `Watch ${t.title}${epLabel}` };
  } catch {
    return { title: "Watch" };
  }
}

export default async function WatchPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ se?: string; ep?: string }>;
}) {
  const { id } = await params;
  const { se = "0", ep = "0" } = await searchParams;
  return <Player id={id} se={Math.max(0, Number(se) || 0)} ep={Math.max(0, Number(ep) || 0)} />;
}
