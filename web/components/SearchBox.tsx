"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Debounced search box used in the header. */
export default function SearchBox() {
  const router = useRouter();
  const [value, setValue] = useState("");

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        const q = value.trim();
        if (q.length >= 2) router.push(`/search?q=${encodeURIComponent(q)}`);
      }}
      className="relative"
    >
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search titles…"
        aria-label="Search titles"
        className="w-40 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-sm text-white placeholder:text-zinc-500 outline-none transition focus:w-56 focus:border-accent/60"
      />
    </form>
  );
}
