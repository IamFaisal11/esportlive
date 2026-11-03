"use client";

import Link from "next/link";
import { useState } from "react";
import type { Standing } from "@/lib/liquipedia";

const medal = ["bg-yellow-400 text-black", "bg-zinc-300 text-black", "bg-orange-700 text-white"];
const avg = (n: number, of: number) => (of ? (n / of).toFixed(2) : "-");
const th = "px-3 py-2 text-right";
const group = "border-l border-white/10";

// Team statistics with a tab per map, like Liquipedia's Statistics page: points, averages and placement counts.
export function TeamStatsTable({ standings }: { standings: Standing[] }) {
  const maps = [...new Set(standings.flatMap((s) => s.games.map((g) => g.map)))];
  const [map, setMap] = useState("All Maps");

  const rows = standings
    .map((s) => {
      const g = s.games.filter((x) => map === "All Maps" || x.map === map);
      const placePts = g.reduce((a, x) => a + x.placePts, 0);
      const killPts = g.reduce((a, x) => a + x.killPts, 0);
      return {
        s,
        n: g.length,
        placePts,
        elims: g.reduce((a, x) => a + x.kills, 0),
        killPts,
        total: placePts + killPts,
        placeSum: g.reduce((a, x) => a + x.place, 0),
        wwcd: g.filter((x) => x.place === 1).length,
        top5: g.filter((x) => x.place <= 5).length,
        top8: g.filter((x) => x.place > 5 && x.place <= 8).length,
        low: g.filter((x) => x.place > 8).length,
      };
    })
    .filter((r) => r.n > 0)
    .sort((a, b) => b.total - a.total || b.wwcd - a.wwcd || b.elims - a.elims);

  return (
    <div>
      {maps.length > 1 && (
        <div className="mb-3 flex flex-wrap gap-2" role="tablist">
          {["All Maps", ...maps].map((m) => (
            <button
              key={m}
              role="tab"
              aria-selected={m === map}
              onClick={() => setMap(m)}
              className={`rounded-full border px-3.5 py-1 text-sm transition ${m === map ? "border-orange-500 bg-orange-500 font-semibold text-black" : "border-white/10 bg-white/5 text-zinc-300 hover:border-white/30"}`}
            >
              {m}
            </button>
          ))}
        </div>
      )}
      <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/[0.03]">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-wider text-zinc-500">
            <tr className="border-b border-white/10 text-center">
              <th colSpan={4} />
              <th colSpan={2} className={`${group} px-3 py-1`}>Points</th>
              <th colSpan={4} className={`${group} px-3 py-1`}>Averages</th>
              <th colSpan={4} className={`${group} px-3 py-1`}>Placements</th>
            </tr>
            <tr className="border-b border-white/10">
              <th className="p-3 pl-4">#</th><th className="p-3">Team</th>
              <th className={th}>Total</th><th className={th}>Matches</th>
              <th className={`${th} ${group}`}>Place</th><th className={th}>Elims</th>
              <th className={`${th} ${group}`}>Placement</th><th className={th}>Place pts</th><th className={th}>Elims</th><th className={th}>Total</th>
              <th className={`${th} ${group}`}>WWCD</th><th className={th}>Top 5</th><th className={th}>6–8</th><th className={`${th} pr-4`}>&gt; 8th</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.s.team} className="border-t border-white/5 hover:bg-white/5">
                <td className="p-3 pl-4">
                  <span className={`inline-flex size-6 items-center justify-center rounded-full text-xs font-bold ${medal[i] ?? "text-zinc-500"}`}>{i + 1}</span>
                </td>
                <td className="p-3 font-medium">
                  <Link href={`/team/${encodeURIComponent(r.s.key)}`} className="hover:text-orange-400 hover:underline">{r.s.team}</Link>
                </td>
                <td className="px-3 py-2 text-right font-[family-name:var(--font-display)] text-lg font-bold text-orange-400">{r.total}</td>
                <td className="px-3 py-2 text-right text-zinc-400">{r.n}</td>
                <td className={`px-3 py-2 text-right text-zinc-400 ${group}`}>{r.placePts}</td>
                <td className="px-3 py-2 text-right text-zinc-400">{r.killPts}</td>
                <td className={`px-3 py-2 text-right text-zinc-400 ${group}`}>{avg(r.placeSum, r.n)}</td>
                <td className="px-3 py-2 text-right text-zinc-400">{avg(r.placePts, r.n)}</td>
                <td className="px-3 py-2 text-right text-zinc-400">{avg(r.elims, r.n)}</td>
                <td className="px-3 py-2 text-right text-zinc-400">{avg(r.total, r.n)}</td>
                <td className={`px-3 py-2 text-right text-zinc-400 ${group}`}>{r.wwcd}</td>
                <td className="px-3 py-2 text-right text-zinc-400">{r.top5}</td>
                <td className="px-3 py-2 text-right text-zinc-400">{r.top8}</td>
                <td className="px-3 py-2 pr-4 text-right text-zinc-400">{r.low}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
