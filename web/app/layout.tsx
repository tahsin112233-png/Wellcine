import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  title: { default: "well-cinebox", template: "%s · well-cinebox" },
  description: "Free movie & series streaming — HBO Max-style front-end for the MovieBox provider.",
  metadataBase: new URL(siteUrl),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-ink">
        <Header />
        <main className="pb-16">{children}</main>
        <footer className="border-t border-white/10 px-6 py-8 text-center text-xs text-zinc-500">
          well-cinebox — a web front-end for the MovieBox provider contract. Demo catalog titles are
          bundled samples.
        </footer>
      </body>
    </html>
  );
}
