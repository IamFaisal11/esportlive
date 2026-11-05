import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { getPlayerPhotos, getTeam, getTeamHistory } from "@/lib/liquipedia";
import { ResultsTable } from "@/components/ResultsTable";
import { Chip, Loading, SectionTitle } from "@/components/ui";
import type { RosterMember } from "@/lib/teamhistory";

export const instant = false; // team data is fetched from Liquipedia per request

const labels: Record<string, string> = {
  location: "Location",
  region: "Region",
  captain: "Captain",
  coach: "Coach",
  created: "Founded",
  disbanded: "Disbanded",
};

const socials: Record<string, (v: string) => string> = {
  twitter: (v) => `https://x.com/${v}`,
  instagram: (v) => `https://instagram.com/${v}`,
  youtube: (v) => `https://youtube.com/${v}`,
  facebook: (v) => `https://facebook.com/${v}`,
  tiktok: (v) => `https://tiktok.com/@${v}`,
};

const card = "rounded-xl border border-white/10 bg-white/[0.03] p-5";
const th = "p-3 text-xs font-medium uppercase tracking-wider text-zinc-500";

const player = (m: { id: string; page?: string }) => `/player/${encodeURIComponent(m.page ?? m.id)}`;

function MemberCard({ m, photo }: { m: RosterMember; photo?: string }) {
  return (
    <Link href={player(m)} className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.04] p-3 transition hover:border-orange-500/60">
      {photo ? (
        <span className="size-16 shrink-0 overflow-hidden rounded-lg bg-gradient-to-b from-zinc-500/40 to-zinc-800/60">
          <Image src={photo} alt="" width={64} height={64} className="size-16 object-cover object-top" />
        </span>
      ) : (
        <span className="flex size-16 shrink-0 items-center justify-center rounded-lg bg-orange-500/15 font-[family-name:var(--font-display)] text-xl font-bold text-orange-400">{m.id.slice(0, 2).toUpperCase()}</span>
      )}
      <span className="min-w-0">
        <span className="block truncate font-semibold">{m.id}</span>
        {m.name && <span className="block truncate text-xs text-zinc-400">{m.name}</span>}
        <span className="block text-xs text-zinc-500">{[m.role, m.joined && `Joined ${m.joined}`].filter(Boolean).join(" · ")}</span>
      </span>
    </Link>
  );
}

function Roster({ members, photos }: { members: RosterMember[]; photos?: Record<string, string> }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {members.map((m) => <MemberCard key={m.id} m={m} photo={photos?.[m.page ?? m.id]} />)}
    </div>
  );
}

// Cards render at once; the photos (two extra API calls) swap in when ready.
async function RosterWithPhotos({ members }: { members: RosterMember[] }) {
  return <Roster members={members} photos={await getPlayerPhotos(members.map((m) => m.page ?? m.id))} />;
}

async function History({ title, fallback }: { title: string; fallback: RosterMember[] }) {
  const h = await getTeamHistory(title);
  const current = h.active.length ? h.active : fallback;
  return (
    <>
      <SectionTitle>Current roster</SectionTitle>
      {current.length === 0 ? (
        <p className={`${card} text-zinc-500`}>No active roster listed.</p>
      ) : (
        <Suspense fallback={<Roster members={current} />}>
          <RosterWithPhotos members={current} />
        </Suspense>
      )}

      <SectionTitle>Team changes</SectionTitle>
      {h.timeline.length === 0 ? (
        <p className={`${card} text-zinc-500`}>No roster changes recorded.</p>
      ) : (
        <div className="space-y-3">
          {h.timeline.map((y, i) => (
            <details key={y.year} open={i === 0} className={`${card} !p-0`}>
              <summary className="cursor-pointer select-none px-5 py-3 font-semibold">{y.year} <span className="text-sm font-normal text-zinc-500">· {y.items.length} changes</span></summary>
              <ul className="space-y-2 border-t border-white/10 px-5 py-4 text-sm text-zinc-300">
                {y.items.map((t, k) => <li key={k} className="border-l-2 border-orange-500/50 pl-3">{t}</li>)}
              </ul>
            </details>
          ))}
        </div>
      )}

      <SectionTitle>Previous players</SectionTitle>
      {h.former.length === 0 ? (
        <p className={`${card} text-zinc-500`}>No former players listed.</p>
      ) : (
        <div className="max-h-[28rem] overflow-auto rounded-xl border border-white/10 bg-white/[0.03]">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-surface"><tr><th className={`${th} pl-4`}>Player</th><th className={th}>Name</th><th className={th}>Joined</th><th className={th}>Left</th><th className={th}>Moved to</th></tr></thead>
            <tbody>
              {h.former.map((m, i) => (
                <tr key={m.id + i} className="border-t border-white/5 hover:bg-white/5">
                  <td className="p-3 pl-4 font-medium"><Link href={player(m)} className="hover:text-orange-400 hover:underline">{m.id}</Link>{m.note && <span className="ml-2 text-xs text-zinc-500">{m.note}</span>}</td>
                  <td className="p-3 text-zinc-400">{m.name ?? "—"}</td>
                  <td className="p-3 text-zinc-400">{m.joined ?? "—"}</td>
                  <td className="p-3 text-zinc-400">{m.left ?? "—"}</td>
                  <td className="p-3 text-zinc-400">{m.newTeam ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <SectionTitle>Previous tournaments</SectionTitle>
      {h.results.length === 0 ? <p className={`${card} text-zinc-500`}>No results recorded.</p> : <ResultsTable groups={h.results} />}
    </>
  );
}

// Some teams (small league sides) have no Liquipedia page; say so instead of showing an error.
function TeamMissing({ name }: { name: string }) {
  return (
    <>
      <Link href="/" className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-500 transition hover:text-orange-400">← All tournaments</Link>
      <header className="relative mb-6 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-orange-500/15 via-white/[0.03] to-transparent p-6 sm:p-8">
        <div className="mb-3"><Chip>Team</Chip></div>
        <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold leading-tight tracking-wide sm:text-5xl">{name}</h1>
      </header>
      <p className={`${card} text-zinc-400`}>
        Liquipedia doesn&apos;t have a page for this team yet, so there is no roster, history or results to show here.{" "}
        <a className="text-orange-400 underline" href={`https://liquipedia.net/pubgmobile/index.php?search=${encodeURIComponent(name)}`} target="_blank" rel="noopener noreferrer">Search Liquipedia ↗</a>
      </p>
    </>
  );
}

export default async function TeamPage(props: PageProps<"/team/[key]">) {
  const { key } = await props.params;
  const team = await getTeam(decodeURIComponent(key));
  if (!team) return <TeamMissing name={decodeURIComponent(key)} />;
  const details = Object.entries(labels).filter(([k]) => team.fields[k]);
  const links = Object.entries(socials).filter(([k]) => team.fields[k]);
  const fallback: RosterMember[] = team.roster.map((p) => ({ id: p.id, name: p.name, role: p.role }));

  return (
    <>
      <Link href="/" className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-500 transition hover:text-orange-400">← All tournaments</Link>
      <header className="relative mb-6 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-orange-500/15 via-white/[0.03] to-transparent p-6 sm:p-8">
        <div aria-hidden className="absolute -right-10 -top-10 size-56 rounded-full bg-orange-500/10 blur-3xl" />
        <div className="relative">
          <div className="mb-3 flex flex-wrap gap-2">
            <Chip>Team</Chip>
            {team.fields.region && <Chip tone="blue">{team.fields.region}</Chip>}
            {team.fields.location && <Chip tone="green">{team.fields.location}</Chip>}
          </div>
          <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold leading-tight tracking-wide sm:text-5xl">{team.title}</h1>
        </div>
      </header>

      <section className={card}>
        <h2 className="mb-3 font-[family-name:var(--font-display)] text-xl font-semibold text-orange-400">Team details</h2>
        <dl className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
          {details.map(([k, label]) => (
            <div key={k} className="flex justify-between gap-4 border-b border-white/5 pb-2">
              <dt className="text-zinc-500">{label}</dt>
              <dd>{team.fields[k]}</dd>
            </div>
          ))}
          {details.length === 0 && <p className="text-zinc-500">No details listed.</p>}
        </dl>
        <div className="mt-4 flex flex-wrap gap-2">
          {links.map(([k, url]) => (
            <a key={k} href={url(team.fields[k])} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs capitalize hover:border-orange-500">{k}</a>
          ))}
          <a href={team.url} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs hover:border-orange-500">Liquipedia</a>
        </div>
      </section>

      <Suspense fallback={<div className="mt-10"><Loading label="roster, changes and results" /></div>}>
        <History title={team.title} fallback={fallback} />
      </Suspense>
    </>
  );
}
