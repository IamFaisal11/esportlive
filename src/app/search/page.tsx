import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Chip, Loading, panel, SectionTitle } from "@/components/ui";
import { searchSite, type SearchHit } from "@/lib/liquipedia";

export const instant = false; // search results are fetched per request

export const metadata: Metadata = {
  title: "Search",
  description: "Search BGMI and PUBG Mobile tournaments, teams and players.",
};

const href = (h: SearchHit) =>
  h.kind === "tournament" ? `/event/${h.title.replaceAll(" ", "_").split("/").map(encodeURIComponent).join("/")}` : `/${h.kind}/${encodeURIComponent(h.title)}`;

const GROUPS: [SearchHit["kind"], string][] = [["tournament", "Tournaments"], ["team", "Teams"], ["player", "Players"]];

async function Results({ q }: { q: string }) {
  let hits: SearchHit[];
  try {
    hits = await searchSite(q);
  } catch {
    return <p className={`${panel} p-6 text-zinc-400`}>Search is unavailable right now. Try again in a minute.</p>;
  }
  if (hits.length === 0) return <p className={`${panel} p-6 text-zinc-400`}>No tournaments, teams or players found for “{q}”. Try a shorter or different name.</p>;

  // The group of the best match comes first: "godlike" should lead with the team, "bmic" with the tournament.
  const order = [...GROUPS].sort((a, b) => Number(b[0] === hits[0].kind) - Number(a[0] === hits[0].kind));
  return order.map(([kind, label]) => {
    const rows = hits.filter((h) => h.kind === kind).slice(0, 8);
    if (rows.length === 0) return null;
    return (
      <section key={kind}>
        <SectionTitle>{label}</SectionTitle>
        <ul className="grid gap-3 sm:grid-cols-2">
          {rows.map((h) => (
            <li key={h.title}>
              <Link href={href(h)} className="group flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-orange-500/60">
                <span className="min-w-0">
                  <span className="block truncate font-medium transition group-hover:text-orange-400">{h.title.replace(/\/(20\d\d)/, " $1").replaceAll("/", " · ")}</span>
                  {h.sub && <span className="block truncate text-xs text-zinc-500">{h.sub}</span>}
                </span>
                <Chip>{kind}</Chip>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    );
  });
}

export default async function SearchPage(props: PageProps<"/search">) {
  const sp = await props.searchParams;
  const q = (typeof sp.q === "string" ? sp.q : "").trim().slice(0, 80);

  return (
    <>
      <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold tracking-wide sm:text-5xl">Search</h1>
      <form action="/search" role="search" className="mb-8 mt-6 flex max-w-2xl gap-2">
        <input
          name="q"
          type="search"
          defaultValue={q}
          required
          minLength={2}
          autoFocus={!q}
          aria-label="Search tournaments, teams and players"
          placeholder="Search tournaments, teams and players…"
          className="min-w-0 flex-1 rounded-full border border-white/10 bg-white/5 px-5 py-2.5 outline-none transition placeholder:text-zinc-500 focus:border-orange-500"
        />
        <button type="submit" className="rounded-full bg-orange-500 px-6 py-2.5 text-sm font-semibold text-black transition hover:bg-orange-400">Search</button>
      </form>
      {q.length >= 2 ? (
        <Suspense fallback={<Loading label="results" />}>
          <Results q={q} />
        </Suspense>
      ) : (
        <p className="text-zinc-500">Type a team, player or tournament name, for example “GodLike”, “BMIC” or “Chennai”.</p>
      )}
    </>
  );
}
