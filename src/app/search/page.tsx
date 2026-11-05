import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { Chip, Loading, panel, SectionTitle } from "@/components/ui";
import { dateRange, status, tierLabel } from "@/lib/format";
import { searchSite, type SearchHit } from "@/lib/liquipedia";

export const instant = false; // search results are fetched per request

export const metadata: Metadata = {
  title: "Search",
  description: "Search BGMI and PUBG Mobile tournaments, teams and players.",
};

const href = (h: SearchHit) =>
  h.kind === "tournament" ? `/event/${h.title.replaceAll(" ", "_").split("/").map(encodeURIComponent).join("/")}` : `/${h.kind}/${encodeURIComponent(h.title)}`;

const GROUPS: [SearchHit["kind"], string][] = [["tournament", "Tournaments"], ["team", "Teams"], ["player", "Players"]];

// Logo for tournaments and teams (on a dark plate: Liquipedia's dark-theme logos are white), photo for players.
function Thumb({ hit }: { hit: SearchHit }) {
  const player = hit.kind === "player";
  const box = player ? "size-16 rounded-full" : "logo-plate size-16 rounded-xl p-1.5";
  if (!hit.image)
    return <span className={`flex shrink-0 items-center justify-center bg-white/10 font-[family-name:var(--font-display)] text-xl font-bold text-zinc-500 ${player ? "size-16 rounded-full" : "size-16 rounded-xl"}`}>{hit.title.slice(0, 2).toUpperCase()}</span>;
  return <Image src={hit.image} alt="" width={64} height={64} unoptimized={hit.image.endsWith(".svg")} className={`shrink-0 bg-white/5 object-contain ${box} ${player ? "object-cover object-top" : ""}`} />;
}

function Details({ hit: h }: { hit: SearchHit }) {
  if (h.kind === "tournament") {
    const st = h.start ? status(h.start, h.end ?? h.start) : undefined;
    return (
      <>
        <span className="mt-1 flex flex-wrap items-center gap-1.5">
          {st && <Chip tone={st === "live" ? "red" : st === "upcoming" ? "blue" : "neutral"}>{st}</Chip>}
          {h.tier && <Chip>{tierLabel(h.tier)}</Chip>}
        </span>
        <span className="mt-1 block truncate text-xs text-zinc-500">{[h.start && dateRange(h.start, h.end ?? h.start), h.place].filter(Boolean).join(" · ")}</span>
      </>
    );
  }
  if (h.kind === "player")
    return (
      <>
        {h.realName && <span className="block truncate text-sm text-zinc-400">{h.realName}</span>}
        <span className="mt-1 flex flex-wrap items-center gap-1.5">
          <Chip tone="amber">Player</Chip>
          {h.role && <Chip>{h.role}</Chip>}
        </span>
        {h.country && <span className="mt-1 block truncate text-xs text-zinc-500">{h.country}</span>}
      </>
    );
  return (
    <>
      <span className="mt-1 flex"><Chip tone="green">Team</Chip></span>
      {h.sub && <span className="mt-1 block truncate text-xs text-zinc-500">{h.sub}</span>}
    </>
  );
}

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
      <section key={kind} className="mt-10">
        <SectionTitle>{label}</SectionTitle>
        <ul className={`grid gap-3 sm:grid-cols-2 ${kind === "player" ? "lg:grid-cols-3" : ""}`}>
          {rows.map((h) => (
            <li key={h.title}>
              <Link href={href(h)} className="group flex h-full items-center gap-4 rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.02] p-4 transition hover:-translate-y-0.5 hover:border-orange-500/60">
                <Thumb hit={h} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-[family-name:var(--font-display)] text-xl font-semibold leading-tight transition group-hover:text-orange-400">{h.title.replace(/\/(20\d\d)/, " $1").replaceAll("/", " · ")}</span>
                  <Details hit={h} />
                </span>
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
