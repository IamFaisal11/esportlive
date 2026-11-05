import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import Image from "next/image";
import { Suspense } from "react";
import { Chip, Loading, panel } from "@/components/ui";
import { teamLogos, wikiLabels } from "@/lib/liquipedia";
import { getKie, getPmgcLatest, type PointsRow, type PointsTable } from "@/lib/rankings";

export const instant = false; // rankings are read from Liquipedia per request
export const maxDuration = 30;

export const metadata: Metadata = {
  title: "Rankings",
  description: "Official BGMI (KIE Global Leaderboard) and PUBG Mobile (PMGC points by region) rankings.",
};

const medal = ["bg-yellow-400 text-black", "bg-zinc-300 text-black", "bg-orange-700 text-white"];
const chip = (on: boolean) =>
  `rounded-full border px-3.5 py-1.5 text-sm transition ${on ? "border-orange-500 bg-orange-500 font-semibold text-black" : "border-white/10 bg-white/5 text-zinc-300 hover:border-white/30 hover:text-white"}`;
const th = "p-3 text-xs font-medium uppercase tracking-wider text-zinc-500";
const when = (iso: string) => new Date(iso).toLocaleDateString("en", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

type Row = { rank: number; key: string; name: string; href: string; logo?: string; region?: string; qualified?: boolean; row: PointsRow };

function RankTable({ rows, rounds, showRegion }: { rows: Row[]; rounds: string[]; showRegion?: boolean }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/[0.03]">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-white/10">
            <th className={`${th} pl-4`}>#</th>
            <th className={th}>{showRegion !== undefined ? "Team" : "Name"}</th>
            {showRegion && <th className={th}>Region</th>}
            <th className={`${th} text-right`}>Points</th>
            {rounds.map((r, i) => <th key={r + i} className={`${th} whitespace-nowrap text-right`}>{r}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.rank + r.key + (r.region ?? "")} className="border-t border-white/5 hover:bg-white/5">
              <td className="p-3 pl-4">
                <span className={`inline-flex size-7 items-center justify-center rounded-full text-xs font-bold ${medal[r.rank - 1] ?? "text-zinc-500"}`}>{r.rank}</span>
              </td>
              <td className="p-3 font-medium">
                <Link href={r.href} className="inline-flex items-center gap-3 hover:text-orange-400">
                  {r.logo ? (
                    <Image src={r.logo} alt="" width={28} height={28} unoptimized={r.logo.endsWith(".svg")} className="logo-plate size-7 shrink-0 rounded object-contain p-0.5" />
                  ) : (
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] font-bold text-zinc-400">{r.name.slice(0, 2).toUpperCase()}</span>
                  )}
                  <span className="hover:underline">{r.name}</span>
                </Link>
                {r.qualified && <span className="ml-3 rounded bg-emerald-500/15 px-1.5 py-0.5 align-middle text-[10px] font-bold uppercase tracking-wider text-emerald-300">Qualified</span>}
              </td>
              {showRegion && <td className="p-3 text-zinc-400">{r.region}</td>}
              <td className="p-3 text-right font-[family-name:var(--font-display)] text-lg font-bold text-orange-400">{r.row.total.toLocaleString("en")}</td>
              {r.row.parts.map((p, i) => <td key={i} className="p-3 text-right text-zinc-500">{p === null ? "–" : p.toLocaleString("en")}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---- BGMI: KIE Global Leaderboard ----
async function KieBoard({ view }: { view: "teams" | "players" }) {
  const kie = await getKie().catch(() => null);
  const table = kie && (view === "players" ? kie.players : kie.teams);
  if (!kie || !table) return <p className={`${panel} p-6 text-zinc-400`}>The KIE Global Leaderboard couldn&apos;t be loaded right now.</p>;

  const top = table.rows.slice(0, 50);
  const keys = top.map((r) => r.key);
  const [names, logos] = await Promise.all([
    wikiLabels(view === "players" ? "Player" : "Team", keys).catch(() => new Map<string, string>()),
    view === "teams" ? teamLogos(keys).catch(() => new Map<string, string>()) : Promise.resolve(new Map<string, string>()),
  ]);
  const rows: Row[] = top.map((r, i) => {
    const name = names.get(r.key) ?? r.key;
    return { rank: i + 1, key: r.key, name, href: view === "players" ? `/player/${encodeURIComponent(name)}` : `/team/${encodeURIComponent(r.key)}`, logo: logos.get(r.key), row: r };
  });

  return (
    <>
      <p className="mb-4 text-sm text-zinc-400">
        The official <b className="text-zinc-200">KIE Global Leaderboard</b> by Krafton India Esports, ranking BGMI {view} on results across the BGIS, BMPS and Showdown events.
        Last updated <b className="text-zinc-200">{kie.updated ?? when(kie.edited)}</b>.
      </p>
      <RankTable rows={rows} rounds={table.rounds} />
      {(kie.placement.length > 0 || kie.decay.length > 0) && (
        <details className="mt-6 rounded-xl border border-white/10 bg-white/[0.03]">
          <summary className="cursor-pointer select-none px-5 py-3 font-semibold">How the points work</summary>
          <div className="grid gap-6 border-t border-white/10 px-5 py-4 text-sm text-zinc-400 sm:grid-cols-2">
            <div>
              <p className="mb-2 font-semibold text-zinc-300">Points per finish (teams)</p>
              <ul className="space-y-1">{kie.placement.map(([place, pts]) => <li key={place} className="flex justify-between"><span>Rank {place}</span><b className="text-zinc-200">{pts}</b></li>)}</ul>
            </div>
            <div>
              <p className="mb-2 font-semibold text-zinc-300">Decay (event age in months)</p>
              <ul className="space-y-1">{kie.decay.map(([months, mult]) => <li key={months} className="flex justify-between"><span>{months} months</span><b className="text-zinc-200">×{mult}</b></li>)}</ul>
            </div>
          </div>
        </details>
      )}
    </>
  );
}

// ---- PUBG Mobile: PMGC qualification points ----
async function PmgcBoard({ region, qual }: { region: string; qual: "pmgc" | "pmwc" }) {
  const { year, boards } = await getPmgcLatest().catch(() => ({ year: 0, boards: [] }));
  if (boards.length === 0) return <p className={`${panel} p-6 text-zinc-400`}>The PMGC points couldn&apos;t be loaded right now.</p>;

  const tableOf = (b: (typeof boards)[number]): PointsTable | undefined => (qual === "pmwc" ? b.pmwc : b.pmgc);
  const selected = boards.find((b) => b.id === region);
  const sources = selected ? [selected] : boards;
  const rounds = tableOf(sources.find((b) => tableOf(b)) ?? sources[0])?.rounds ?? [];

  // Rank inside each region (that is what decides qualification), then order by points for the global view.
  const all = sources.flatMap((b) => {
    const t = tableOf(b);
    return t ? t.rows.map((row, i) => ({ row, region: b.label, qualified: i < t.slots })) : [];
  });
  if (!selected) all.sort((a, b) => b.row.total - a.row.total);
  const top = all.slice(0, 50);
  const names = await wikiLabels("Team", top.map((r) => r.row.key)).catch(() => new Map<string, string>());
  const logos = await teamLogos(top.map((r) => r.row.key)).catch(() => new Map<string, string>());
  const rows: Row[] = top.map((r, i) => ({
    rank: i + 1,
    key: r.row.key,
    name: names.get(r.row.key) ?? r.row.key,
    href: `/team/${encodeURIComponent(r.row.key)}`,
    logo: logos.get(r.row.key),
    region: r.region,
    qualified: r.qualified,
    row: { ...r.row, parts: rounds.map((_, i2) => r.row.parts[i2] ?? null) },
  }));
  const slots = selected ? tableOf(selected)?.slots : undefined;
  const edited = boards.map((b) => b.edited).sort().at(-1)!;

  return (
    <>
      <p className="mb-4 text-sm text-zinc-400">
        <b className="text-zinc-200">PMGC {year} points: {qual === "pmwc" ? "World Cup" : "Global Championship"} qualification</b>. Points from final placements in the Global Open regional finals
        {qual === "pmwc" ? " and main event" : ", main events and the World Cup"} decide who qualifies{slots ? <>; the top <b className="text-zinc-200">{slots}</b> in this region qualify</> : ""}.
        This system covers the global regions (not China, Korea, Japan or India). Updated <b className="text-zinc-200">{when(edited)}</b>.
      </p>
      {rows.length === 0 ? (
        <p className={`${panel} p-6 text-zinc-400`}>No standings published for this selection yet.</p>
      ) : (
        <RankTable rows={rows} rounds={rounds} showRegion={!selected} />
      )}
    </>
  );
}

export default async function RankingsPage(props: PageProps<"/rankings">) {
  await connection(); // the current season depends on today's date
  const sp = await props.searchParams;
  const get = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const board = get("board") === "pmgc" ? "pmgc" : "kie";
  const view = get("view") === "players" ? "players" : "teams";
  const qual = get("qual") === "pmwc" ? "pmwc" : "pmgc";
  const region = get("region") || "global";

  const url = (p: Record<string, string>) => `/rankings?${new URLSearchParams(p)}`;
  const REGION_CHIPS: [string, string][] = [["global", "Global"], ["southeast-asia", "Southeast Asia"], ["south-asia", "South Asia"], ["eeca", "EECA"], ["mena", "MENA"], ["turkiye", "Türkiye"], ["western-europe", "Western Europe"], ["americas", "Americas"], ["africa", "Africa"]];

  return (
    <>
      <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold tracking-wide sm:text-5xl">Official <span className="text-orange-500">rankings</span></h1>
      <p className="mt-2 max-w-2xl text-zinc-400">The ranking each game&apos;s organiser uses, shown as published on Liquipedia.</p>

      <div className="mb-4 mt-6 grid gap-3 sm:grid-cols-2">
        {[
          { id: "kie", game: "BGMI", title: "KIE Global Leaderboard", sub: "Teams and players · Krafton India Esports" },
          { id: "pmgc", game: "PUBG Mobile", title: "PMGC Points", sub: "By region and global · Global Championship qualification" },
        ].map((b) => (
          <Link key={b.id} href={url({ board: b.id })} className={`rounded-xl border p-4 transition ${board === b.id ? "border-orange-500 bg-orange-500/10" : "border-white/10 bg-white/[0.03] hover:border-white/30"}`}>
            <Chip tone={b.id === "kie" ? "green" : "amber"}>{b.game}</Chip>
            <div className="mt-2 font-[family-name:var(--font-display)] text-xl font-semibold">{b.title}</div>
            <div className="text-xs text-zinc-500">{b.sub}</div>
          </Link>
        ))}
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {board === "kie" ? (
          <>
            <Link href={url({ board: "kie", view: "teams" })} className={chip(view === "teams")}>Teams</Link>
            <Link href={url({ board: "kie", view: "players" })} className={chip(view === "players")}>Players</Link>
          </>
        ) : (
          <>
            <Link href={url({ board: "pmgc", qual: "pmgc", region })} className={chip(qual === "pmgc")}>PMGC qualification</Link>
            <Link href={url({ board: "pmgc", qual: "pmwc", region })} className={chip(qual === "pmwc")}>PMWC qualification</Link>
            <span className="mx-1 hidden h-6 w-px bg-white/10 sm:block" />
            {REGION_CHIPS.map(([id, label]) => <Link key={id} href={url({ board: "pmgc", qual, region: id })} className={chip(region === id)}>{label}</Link>)}
          </>
        )}
      </div>

      <Suspense key={`${board}${view}${qual}${region}`} fallback={<Loading label="rankings" />}>
        {board === "kie" ? <KieBoard view={view} /> : <PmgcBoard region={region} qual={qual} />}
      </Suspense>
    </>
  );
}
