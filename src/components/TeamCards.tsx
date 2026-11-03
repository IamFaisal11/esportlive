import Image from "next/image";
import Link from "next/link";
import type { TeamGroup } from "@/lib/liquipedia";

// Team cards: logo + name; hovering (or keyboard-focusing) a card slides in its roster.
export function TeamCards({ groups, eventUrl }: { groups: TeamGroup[]; eventUrl: string }) {
  if (groups.length === 0)
    return (
      <p className="rounded-xl border border-dashed border-white/15 bg-white/[0.03] p-6 text-zinc-400">
        Teams haven&apos;t been announced for this event yet, or the participant list uses a format we can&apos;t read.{" "}
        <a className="text-orange-400 underline" href={eventUrl}>View on Liquipedia</a>.
      </p>
    );

  return (
    <>
      {groups.map((g) => (
        <section key={g.stage} className="mb-8">
          <h3 className="mb-3 font-[family-name:var(--font-display)] text-xl font-semibold text-orange-400">
            {g.stage} <span className="text-sm text-zinc-500">· {g.teams.length} teams</span>
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {g.teams.map((t) => {
              const players = t.members.filter((m) => !m.staff);
              const staff = t.members.filter((m) => m.staff);
              return (
                <Link
                  key={t.name}
                  href={`/team/${encodeURIComponent(t.name)}`}
                  className="group relative flex aspect-square flex-col items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-3 text-center outline-none transition hover:border-orange-500/60 focus-visible:border-orange-500/60"
                >
                  {t.logo ? (
                    <Image src={t.logo} alt="" width={72} height={72} unoptimized={t.logo.endsWith(".svg")} className="mb-3 size-[72px] object-contain" />
                  ) : (
                    <span className="mb-3 flex size-[72px] items-center justify-center rounded-full bg-white/10 font-[family-name:var(--font-display)] text-2xl font-bold text-zinc-400">
                      {t.name.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                  <span className="text-sm font-semibold leading-tight">{t.name}</span>
                  {t.qualification && <span className="mt-1 text-[11px] text-zinc-500">{t.qualification}</span>}

                  <div className="absolute inset-0 flex flex-col justify-center bg-[#0c0c0f]/95 p-3 text-left opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-orange-400">Roster</div>
                    {players.length === 0 ? (
                      <p className="text-xs text-zinc-500">Roster to be announced</p>
                    ) : (
                      <ul className="space-y-1 text-xs">
                        {players.map((m) => (
                          <li key={m.id} className="flex justify-between gap-2">
                            <span className="font-medium">{m.id}</span>
                            <span className="text-zinc-500">{m.sub ? "Sub" : m.role}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {staff.map((m) => (
                      <div key={m.id} className="mt-2 border-t border-white/10 pt-2 text-xs text-zinc-400">
                        {m.role ?? "Staff"}: <span className="text-zinc-200">{m.id}</span>
                      </div>
                    ))}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </>
  );
}
