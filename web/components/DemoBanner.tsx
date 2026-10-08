/** Amber banner labelling the offline demo catalog honestly. */
export default function DemoBanner() {
  return (
    <div className="bg-amber-500/15 px-4 py-2 text-center text-sm text-amber-300 ring-1 ring-inset ring-amber-500/40">
      <span className="font-semibold uppercase tracking-wide">Demo catalog</span>
      <span className="mx-2 text-amber-500">·</span>
      These rails are the bundled demo catalog. Set{" "}
      <code className="rounded bg-black/40 px-1 font-mono">MOVIEBOX_PROXY_URL</code> for the live
      catalog.
    </div>
  );
}
