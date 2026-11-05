import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Loading, panel } from "@/components/ui";
import { PLACE_POINTS, TIER_WEIGHT, getRankings } from "@/lib/rankings";

export const instant = false; // rankings are calculated per request from the latest standings
export const maxDuration = 60; // the first calculation reads many events from Liquipedia

export const metadata: Metadata = {
  title: "Rankings",
  description: "Esportlive team rankings for BGMI and PUBG Mobile, calculated from the latest tournament results.",
};

const GAMES = [["BGMI", "BGMI"], ["PUBG Mobile", "PUBG Mobile"]] as const;
const chip = (on: boolean) =>
  `rounded-full border px-3.5 py-1.5 text-sm transition ${on ? "border-orange-500 bg-orange-500 font-semibold text-black" : "border-white/10 bg-white/5 text-zinc-300 hover:border-white/30 hover:text-white"}`;
const medal = ["bg-yellow-400 text-black", "bg-zinc-300 text-black", "bg-orange-700 text-white"];
const th = "p-3 text-xs font-medium uppercase tracking-wider text-zinc-500";

async function Table({ game }: { game: "BGMI" | "PUBG Mobile" }) {
  await connection(); // "the last 12 months" depends on today's date
  const { teams, events } = await getRankings(game);
  if (teams.length === 0) return <p className={`${panel} p-6 text-zinc-400`}>Not enough finished events with readable results to rank {game} teams yet.</p>;

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/[0.03]">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className={`${th} pl-4`}>#</th><th className={th}>Team</th>
              <th className={`${th} text-right`}>Points</th><th className={`${th} text-right`}>Events</th>
              <th className={`${th} text-right`}>Titles</th><th className={`${th} text-right`}>Podiums</th><th className={`${th} pr-4 text-right`}>Best</th>
            </tr>
          </thead>
          <tbody>
            {teams.slice(0, 30).map((t, i) => (
              <tr key={t.key} className="border-t border-white/5 hover:bg-white/5">
                <td className="p-3 pl-4">
                  <span className={`inline-flex size-6 items-center justify-center rounded-full text-xs font-bold ${medal[i] ?? "text-zinc-500"}`}>{i + 1}</span>
                </td>
                <td className="p-3 font-medium">
                  <Link href={`/team/${encodeURIComponent(t.key)}`} className="hover:text-orange-400 hover:underline">{t.team}</Link>
                </td>
                <td className="p-3 text-right font-[family-name:var(--font-display)] text-lg font-bold text-orange-400">{t.points}</td>
                <td className="p-3 text-right text-zinc-400">{t.results.length}</td>
                <td className="p-3 text-right text-zinc-400">{t.titles}</td>
                <td className="p-3 text-right text-zinc-400">{t.podiums}</td>
                <td className="p-3 pr-4 text-right text-zinc-400">{t.best <= 98 ? `#${t.best}` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <details className="mt-6 rounded-xl border border-white/10 bg-white/[0.03]">
        <summary className="cursor-pointer select-none px-5 py-3 font-semibold">How this ranking is calculated</summary>
        <div className="space-y-3 border-t border-white/10 px-5 py-4 text-sm text-zinc-400">
          <p>
            Liquipedia has no official ranking for these games, so this is Esportlive&apos;s own. Every S, A and B-tier event
            finished in the last 12 months whose final standings can be read ({events.length} right now) gives each team
            points for its final position, multiplied by the event&apos;s tier: S-tier ×{TIER_WEIGHT["1"]}, A-tier ×{TIER_WEIGHT["2"]},
            B-tier ×{TIER_WEIGHT["3"]}.
          </p>
          <p>Position points: {PLACE_POINTS.map((p, i) => `${i + 1}${["st", "nd", "rd"][i] ?? "th"} ${p}`).join(", ")}; every lower place 1.</p>
          <p className="font-semibold text-zinc-300">Events counted</p>
          <ul className="list-disc space-y-1 pl-5">
            {events.map((e) => (
              <li key={e.title}>
                <Link href={`/event/${e.title.replaceAll(" ", "_").split("/").map(encodeURIComponent).join("/")}`} className="text-orange-400 hover:underline">{e.name}</Link>
              </li>
            ))}
          </ul>
        </div>
      </details>
    </>
  );
}

export default async function RankingsPage(props: PageProps<"/rankings">) {
  const sp = await props.searchParams;
  const game = sp.game === "PUBG Mobile" ? "PUBG Mobile" : "BGMI";

  return (
    <>
      <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold tracking-wide sm:text-5xl">Team <span className="text-orange-500">rankings</span></h1>
      <p className="mt-2 max-w-2xl text-zinc-400">Who is performing best right now, based on the most recent S, A and B-tier results.</p>
      <div className="mb-6 mt-6 flex flex-wrap gap-2">
        {GAMES.map(([value, label]) => (
          <Link key={value} href={`/rankings?game=${encodeURIComponent(value)}`} className={chip(game === value)}>{label}</Link>
        ))}
      </div>
      <Suspense fallback={<Loading label="rankings (calculating from the latest standings)" />}>
        <Table game={game} />
      </Suspense>
    </>
  );
}
