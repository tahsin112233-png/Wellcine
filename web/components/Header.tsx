import Link from "next/link";
import SearchBox from "./SearchBox";

/** Glassmorphic sticky header. */
export default function Header() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/5 bg-ink/80 backdrop-blur-md">
      <div className="flex h-16 items-center gap-6 px-4 md:px-10">
        <Link href="/" className="text-xl font-extrabold tracking-tight text-white">
          well<span className="text-accent">-cinebox</span>
        </Link>
        <nav className="flex items-center gap-5 text-sm text-zinc-300">
          <Link href="/" className="transition hover:text-white">
            Home
          </Link>
          <Link href="/search" className="transition hover:text-white">
            Browse
          </Link>
        </nav>
        <div className="ml-auto">
          <SearchBox />
        </div>
      </div>
    </header>
  );
}
