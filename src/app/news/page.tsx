import type { Metadata } from "next";
import Link from "next/link";
import { NewsFeed } from "@/components/NewsFeed";
import type { NewsGame } from "@/lib/news";

export const instant = false; // the filter comes from the URL, so this page is rendered per request

export const metadata: Metadata = {
  title: "News",
  description: "Latest BGMI and PUBG Mobile esports news.",
};

const FILTERS: [NewsGame, string][] = [["all", "All"], ["bgmi", "BGMI"], ["pubgm", "PUBG Mobile"]];
const chip = (on: boolean) =>
  `rounded-full border px-3.5 py-1.5 text-sm transition ${on ? "border-orange-500 bg-orange-500 font-semibold text-black" : "border-white/10 bg-white/5 text-zinc-300 hover:border-white/30 hover:text-white"}`;

export default async function NewsPage(props: PageProps<"/news">) {
  const sp = await props.searchParams;
  const game: NewsGame = sp.game === "bgmi" || sp.game === "pubgm" ? sp.game : "all";

  return (
    <>
      <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold tracking-wide sm:text-5xl">Esports <span className="text-orange-500">news</span></h1>
      <p className="mt-2 max-w-2xl text-zinc-400">The latest BGMI and PUBG Mobile esports stories from across the web.</p>
      <div className="mb-6 mt-6 flex flex-wrap gap-2">
        {FILTERS.map(([value, label]) => (
          <Link key={value} href={value === "all" ? "/news" : `/news?game=${value}`} className={chip(game === value)}>{label}</Link>
        ))}
      </div>
      <NewsFeed game={game} />
      <p className="mt-8 text-xs text-zinc-600">Stories are found through Bing News and link to the publishers&apos; own sites. Images and summaries are the previews publishers provide. Esportlive does not host or edit the articles.</p>
    </>
  );
}
