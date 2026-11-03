import Link from "next/link";
import type { EventStats, StatTable } from "@/lib/stats";

const medal = ["bg-yellow-400 text-black", "bg-zinc-300 text-black", "bg-orange-700 text-white"];
const h3 = "mb-3 font-[family-name:var(--font-display)] text-xl font-semibold text-orange-400";
const h4 = "mb-2 mt-6 text-sm font-semibold uppercase tracking-wider text-zinc-400";

// Rankings come lowercase from Liquipedia ("ns redforce"); keep names that already have capitals as they are.
const pretty = (t: string) => (/[A-Z]/.test(t) ? t : t.replace(/ \(.*\)$/, "").replace(/\b[a-z]/g, (c) => c.toUpperCase()));

function Table({ t, ranked }: { t: StatTable; ranked?: boolean }) {
  return (
    <div className="max-h-[28rem] overflow-auto rounded-xl border border-white/10 bg-white/[0.03]">
      <table className="w-full text-left text-sm">
        <thead className="sticky top-0 bg-[#121214] text-xs uppercase tracking-wider text-zinc-500">
          <tr className="border-b border-white/10">
            <th className="p-3 pl-4">#</th><th className="p-3">Player</th><th className="p-3">Team</th>
            {t.headers.map((h, i) => <th key={h + i} className="p-3 text-right">{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {t.rows.map((r, i) => (
            <tr key={r.player + r.team + i} className="border-t border-white/5 hover:bg-white/5">
              <td className="p-3 pl-4">
                <span className={`inline-flex size-6 items-center justify-center rounded-full text-xs font-bold ${ranked && medal[i] ? medal[i] : "text-zinc-500"}`}>{i + 1}</span>
              </td>
              <td className="p-3 font-medium"><Link href={`/player/${encodeURIComponent(r.player)}`} className="hover:text-orange-400 hover:underline">{r.player}</Link></td>
              <td className="p-3 text-zinc-400">
                {r.team ? <Link href={`/team/${encodeURIComponent(r.team.toLowerCase())}`} className="hover:text-orange-400 hover:underline">{pretty(r.team)}</Link> : "—"}
              </td>
              {r.cells.map((c, k) => (
                <td key={k} className={`p-3 text-right ${k === 0 && ranked ? "font-[family-name:var(--font-display)] text-lg font-bold text-orange-400" : "text-zinc-400"}`}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Mirrors a Liquipedia Statistics page: MVP / IGL cards, tournament totals, title rankings, per-player tables.
export function Statistics({ stats }: { stats: EventStats[] }) {
  return stats.map((s) => (
    <section key={s.id} className="mb-12">
      {stats.length > 1 && <h3 className={h3}>{s.name}</h3>}

      {s.cards.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {s.cards.map((c) => (
            <div key={c.title} className="rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-5">
              <div className="text-xs font-semibold uppercase tracking-wider text-orange-400">{c.title}</div>
              <div className="mt-1 font-[family-name:var(--font-display)] text-3xl font-bold">{c.name}</div>
              <div className="text-sm text-zinc-400">{pretty(c.team)}</div>
              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
                {c.stats.map(([k, v]) => (
                  <div key={k}><dt className="text-xs text-zinc-500">{k}</dt><dd className="font-semibold">{v}</dd></div>
                ))}
              </dl>
            </div>
          ))}
        </div>
      )}

      {s.summary.length > 0 && (
        <>
          <h4 className={h4}>Tournament statistics</h4>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
            {s.summary.map(([k, v]) => (
              <div key={k} className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                <dt className="text-xs text-zinc-500">{k}</dt>
                <dd className="font-[family-name:var(--font-display)] text-xl font-bold text-orange-400">{v}</dd>
              </div>
            ))}
          </dl>
        </>
      )}

      {s.rankings.length > 0 && (
        <>
          <h4 className={h4}>Title rankings</h4>
          <div className="grid gap-6 xl:grid-cols-2">
            {s.rankings.map((t) => (
              <div key={t.title}>
                <div className="mb-2 font-semibold">{t.title}</div>
                <Table t={t} ranked />
              </div>
            ))}
          </div>
        </>
      )}

      {s.playerTables.map((t) => (
        <div key={t.title}>
          <h4 className={h4}>Player statistics · {t.title}</h4>
          <Table t={t} />
        </div>
      ))}
    </section>
  ));
}
