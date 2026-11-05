import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Loading, panel } from "@/components/ui";
import { getNews, type NewsGame } from "@/lib/news";

export const instant = false; // the headlines are fetched per request

export const metadata: Metadata = {
  title: "News",
  description: "Latest BGMI and PUBG Mobile esports headlines.",
};

const FILTERS: [NewsGame, string][] = [["all", "All"], ["bgmi", "BGMI"], ["pubgm", "PUBG Mobile"]];
const chip = (on: boolean) =>
  `rounded-full border px-3.5 py-1.5 text-sm transition ${on ? "border-orange-500 bg-orange-500 font-semibold text-black" : "border-white/10 bg-white/5 text-zinc-300 hover:border-white/30 hover:text-white"}`;

async function Headlines({ game }: { game: NewsGame }) {
  let items;
  try {
    items = await getNews(game);
  } catch {
    return <p className={`${panel} p-6 text-zinc-400`}>Couldn&apos;t load headlines right now. Try again in a minute.</p>;
  }
  if (items.length === 0) return <p className={`${panel} p-6 text-zinc-400`}>No recent headlines found.</p>;
  return (
    <ul className="space-y-3">
      {items.map((n) => (
        <li key={n.url}>
          <a href={n.url} target="_blank" rel="noopener noreferrer" className="group block rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.02] p-4 transition hover:border-orange-500/60 sm:p-5">
            <div className="mb-1.5 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
              <span className="rounded-full bg-white/10 px-2.5 py-0.5 font-semibold uppercase tracking-wider text-zinc-300">{n.source || "News"}</span>
              <time dateTime={n.date}>{new Date(n.date).toLocaleDateString("en", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })}</time>
            </div>
            <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold leading-snug transition group-hover:text-orange-400 sm:text-2xl">{n.title} <span aria-hidden className="text-zinc-500">↗</span></h2>
          </a>
        </li>
      ))}
    </ul>
  );
}

export default async function NewsPage(props: PageProps<"/news">) {
  const sp = await props.searchParams;
  const game: NewsGame = sp.game === "bgmi" || sp.game === "pubgm" ? sp.game : "all";

  return (
    <>
      <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold tracking-wide sm:text-5xl">Esports <span className="text-orange-500">news</span></h1>
      <p className="mt-2 max-w-2xl text-zinc-400">The latest BGMI and PUBG Mobile esports headlines from the last 30 days.</p>
      <div className="mb-6 mt-6 flex flex-wrap gap-2">
        {FILTERS.map(([value, label]) => (
          <Link key={value} href={value === "all" ? "/news" : `/news?game=${value}`} className={chip(game === value)}>{label}</Link>
        ))}
      </div>
      <Suspense fallback={<Loading label="headlines" />}>
        <Headlines game={game} />
      </Suspense>
      <p className="mt-8 text-xs text-zinc-600">Headlines come from Google News and link to the publishers&apos; own sites. Esportlive does not host or edit the articles.</p>
    </>
  );
}
