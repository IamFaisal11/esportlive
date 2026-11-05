"use client";

import { useEffect, useState } from "react";
import type { NewsGame, NewsItem } from "@/lib/news";

type State = { game: NewsGame; items?: NewsItem[] };

const date = (iso: string) => new Date(iso).toLocaleDateString("en", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

function Card({ n, featured }: { n: NewsItem; featured: boolean }) {
  const [broken, setBroken] = useState(false); // publishers sometimes block hot-linked images: fall back to the placeholder
  return (
    <a
      href={n.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`group flex flex-col overflow-hidden rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] transition duration-200 hover:-translate-y-1 hover:border-orange-500/60 hover:shadow-[0_12px_40px_-12px_rgba(249,115,22,0.45)] ${featured ? "lg:col-span-2 lg:flex-row" : ""}`}
    >
      <div className={`relative aspect-video shrink-0 overflow-hidden bg-zinc-900 ${featured ? "lg:aspect-auto lg:min-h-64 lg:w-1/2" : ""}`}>
        {n.image && !broken ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={n.image} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setBroken(true)} className="absolute inset-0 size-full object-cover transition duration-300 group-hover:scale-105" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-orange-500/25 via-zinc-800 to-zinc-900">
            <span className="font-[family-name:var(--font-display)] text-5xl font-bold text-white/25">{n.source.slice(0, 2).toUpperCase()}</span>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
          <span className="rounded-full bg-orange-500/15 px-2.5 py-0.5 font-semibold uppercase tracking-wider text-orange-300">{n.source}</span>
          <time dateTime={n.date}>{date(n.date)}</time>
        </div>
        <h2 className={`line-clamp-3 font-[family-name:var(--font-display)] font-semibold leading-snug transition group-hover:text-orange-400 ${featured ? "text-2xl sm:text-3xl" : "text-xl"}`}>{n.title}</h2>
        {n.excerpt && <p className={`mt-2 text-sm text-zinc-400 ${featured ? "line-clamp-4" : "line-clamp-3"}`}>{n.excerpt}</p>}
        <span className="mt-auto pt-4 text-xs text-zinc-500 transition group-hover:text-orange-400">Read on {n.source} ↗</span>
      </div>
    </a>
  );
}

// Loads the stories after the page has rendered (building them takes a few seconds; the CDN caches the result).
export function NewsFeed({ game }: { game: NewsGame }) {
  const [state, setState] = useState<State>();

  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`/api/news?game=${game}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((d: { items?: NewsItem[] }) => setState({ game, items: d.items }))
      .catch((e) => e.name !== "AbortError" && setState({ game }));
    return () => ctrl.abort();
  }, [game]);

  const ready = state?.game === game ? state : undefined;

  if (!ready)
    return (
      <div className="grid animate-pulse gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className={`overflow-hidden rounded-xl border border-white/10 bg-white/[0.04] ${i === 0 ? "lg:col-span-2" : ""}`}>
            <div className="aspect-video bg-white/10" />
            <div className="space-y-3 p-5"><div className="h-3 w-1/3 rounded bg-white/10" /><div className="h-5 rounded bg-white/10" /><div className="h-5 w-2/3 rounded bg-white/10" /></div>
          </div>
        ))}
      </div>
    );

  if (!ready.items?.length)
    return <p className="rounded-xl border border-white/10 bg-white/[0.03] p-6 text-zinc-400">{ready.items ? "No recent stories found." : "Couldn't load the news right now. Try again in a minute."}</p>;

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {ready.items.map((n, i) => <Card key={n.url} n={n} featured={i === 0} />)}
    </div>
  );
}
