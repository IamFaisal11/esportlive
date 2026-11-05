import Link from "next/link";
import { Chip, panel } from "@/components/ui";
import type { TeamStint } from "@/lib/liquipedia";

// A player's teams over time, newest first, as a timeline.
export function TeamChanges({ stints }: { stints: TeamStint[] }) {
  if (!stints.length) return <p className={`${panel} p-5 text-zinc-400`}>No team changes are recorded for this player.</p>;
  return (
    <ol className="relative space-y-3 border-l border-white/10 pl-6">
      {stints.map((s) => (
        <li key={s.join + s.team} className="relative">
          <span className={`absolute -left-[31px] top-4 size-2.5 rounded-full ring-4 ${s.leave ? "bg-zinc-500 ring-zinc-500/20" : "bg-emerald-400 ring-emerald-400/20"}`} />
          <div className={`${panel} flex flex-wrap items-center justify-between gap-3 p-4`}>
            <Link href={`/team/${encodeURIComponent(s.team)}`} className="font-[family-name:var(--font-display)] text-lg font-semibold hover:text-orange-400">{s.team}</Link>
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              {s.join} → {s.leave ?? "present"}
              {!s.leave && <Chip tone="green">Current</Chip>}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
