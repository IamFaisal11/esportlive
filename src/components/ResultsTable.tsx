import Link from "next/link";
import type { PastResult } from "@/lib/teamhistory";

const th = "p-3 text-xs font-medium uppercase tracking-wider text-zinc-500";
const card = "rounded-xl border border-white/10 bg-white/[0.03]";

export const eventHref = (page: string) => `/event/${page.split("/").map(encodeURIComponent).join("/")}`;

export function placeBadge(place: string) {
  const cls = place.startsWith("1st") ? "bg-yellow-400 text-black" : place.startsWith("2nd") ? "bg-zinc-300 text-black" : place.startsWith("3rd") ? "bg-orange-700 text-white" : "bg-white/10 text-zinc-300";
  return <span className={`inline-block min-w-12 rounded px-2 py-0.5 text-center text-xs font-bold ${cls}`}>{place || "—"}</span>;
}

export const prizeValue = (p: string) => Number(p.replace(/[^0-9.]/g, "")) || 0;
export const usd = (n: number) => `$${n.toLocaleString("en-US")}`;

// Results grouped by year (latest open). Pass `withTeam` for a player's results, where each row has a team.
export function ResultsTable({ groups, withTeam }: { groups: { year: string; rows: PastResult[] }[]; withTeam?: boolean }) {
  const all = groups.flatMap((g) => g.rows);
  const wins = all.filter((r) => r.place.startsWith("1st")).length;
  const podiums = all.filter((r) => /^(1st|2nd|3rd)/.test(r.place)).length;
  return (
    <>
      <p className="mb-4 text-sm text-zinc-400">
        <b className="text-zinc-200">{all.length}</b> tournaments · <b className="text-yellow-400">{wins}</b> wins · <b className="text-zinc-200">{podiums}</b> top-3 finishes
      </p>
      <div className="space-y-3">
        {groups.map((g, gi) => (
          <details key={g.year} open={gi === 0} className={card}>
            <summary className="cursor-pointer select-none px-5 py-3 font-semibold">
              {g.year} <span className="text-sm font-normal text-zinc-500">· {g.rows.length} tournaments</span>
            </summary>
            <div className="overflow-x-auto border-t border-white/10">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr>
                    <th className={th}>Date</th><th className={th}>Place</th><th className={th}>Tier</th><th className={th}>Tournament</th>
                    {withTeam && <th className={th}>Team</th>}
                    <th className={`${th} text-right`}>Prize</th>
                  </tr>
                </thead>
                <tbody>
                  {g.rows.map((r) => (
                    <tr key={r.date + r.name} className="border-t border-white/5 hover:bg-white/5">
                      <td className="p-3 text-zinc-400">{r.date}</td>
                      <td className="p-3">{placeBadge(r.place)}</td>
                      <td className="p-3 text-zinc-400">{r.tier}</td>
                      <td className="p-3 font-medium">
                        {r.page ? <Link href={eventHref(r.page)} className="hover:text-orange-400 hover:underline">{r.name}</Link> : r.name}
                      </td>
                      {withTeam && <td className="p-3 text-zinc-400">{r.team ?? "—"}</td>}
                      <td className="p-3 text-right text-orange-400">{r.prize}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        ))}
      </div>
    </>
  );
}
