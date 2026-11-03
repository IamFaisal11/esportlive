import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { prizeValue, ResultsTable, usd } from "@/components/ResultsTable";
import { Chip, Loading, SectionTitle, Stat } from "@/components/ui";
import { getPlayer, getPlayerResults } from "@/lib/liquipedia";

export const instant = false; // player data is fetched from Liquipedia per request

const card = "rounded-xl border border-white/10 bg-white/[0.03] p-5";

const socials: Record<string, (v: string) => string> = {
  youtube: (v) => `https://youtube.com/${v.startsWith("@") ? v : "@" + v}`,
  twitter: (v) => `https://x.com/${v.replace(/^@/, "")}`,
  instagram: (v) => `https://instagram.com/${v.replace(/^@/, "")}`,
  twitch: (v) => `https://twitch.tv/${v}`,
  kick: (v) => `https://kick.com/${v}`,
  tiktok: (v) => `https://tiktok.com/@${v.replace(/^@/, "")}`,
  facebook: (v) => `https://facebook.com/${v}`,
};

function born(iso?: string) {
  const t = Date.parse(iso ?? "");
  if (!/^\d{4}-\d\d-\d\d/.test(iso ?? "") || Number.isNaN(t)) return iso;
  const age = Math.floor((Date.now() - t) / 31557600000);
  return `${new Date(t).toLocaleDateString("en", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" })} (age ${age})`;
}

async function Career({ title }: { title: string }) {
  const groups = await getPlayerResults(title);
  if (groups.length === 0) return <p className={`${card} text-zinc-500`}>No tournament results recorded.</p>;

  const rows = groups.flatMap((g) => g.rows);
  const earnings = rows.reduce((a, r) => a + prizeValue(r.prize), 0);
  const byYear = groups.map((g) => ({ year: g.year, usd: g.rows.reduce((a, r) => a + prizeValue(r.prize), 0), n: g.rows.length }));
  // "Achievements": first-place finishes at S, A and B tier events, newest first.
  const titles = rows.filter((r) => r.place.startsWith("1st") && /^(S|A|B)-Tier/.test(r.tier));
  const stats: [string, string][] = [
    ["Total earnings", usd(earnings)],
    ["Tournaments", String(rows.length)],
    ["Wins", String(rows.filter((r) => r.place.startsWith("1st")).length)],
    ["Top-3 finishes", String(rows.filter((r) => /^(1st|2nd|3rd)/.test(r.place)).length)],
  ];

  return (
    <>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map(([k, v], i) => <Stat key={k} label={k} value={v} accent={i === 0 || i === 2} />)}
      </dl>

      <SectionTitle>Achievements</SectionTitle>
      {titles.length === 0 ? (
        <p className={`${card} text-zinc-500`}>No S, A or B-tier titles.</p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {titles.map((r) => (
            <li key={r.date + r.name} className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-3 text-sm">
              <span className="rounded bg-yellow-400 px-2 py-0.5 text-xs font-bold text-black">1st</span>
              <span className="min-w-0 flex-1 truncate font-medium">{r.name}</span>
              <span className="text-xs text-zinc-500">{r.date.slice(0, 4)}</span>
            </li>
          ))}
        </ul>
      )}

      <SectionTitle>Earnings by year</SectionTitle>
      <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/[0.03]">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-wider text-zinc-500">
            <tr><th className="p-3 pl-4">Year</th><th className="p-3 text-right">Tournaments</th><th className="p-3 pr-4 text-right">Earnings</th></tr>
          </thead>
          <tbody>
            {byYear.map((y) => (
              <tr key={y.year} className="border-t border-white/5">
                <td className="p-3 pl-4 font-medium">{y.year}</td>
                <td className="p-3 text-right text-zinc-400">{y.n}</td>
                <td className="p-3 pr-4 text-right text-orange-400">{usd(y.usd)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SectionTitle>Previous tournaments</SectionTitle>
      <ResultsTable groups={groups} withTeam />
    </>
  );
}

export default async function PlayerPage(props: PageProps<"/player/[id]">) {
  await connection(); // the player's age depends on the current time, so render per request
  const { id } = await props.params;
  const player = await getPlayer(decodeURIComponent(id));
  if (!player) notFound();
  const f = player.fields;
  const info: [string, string | undefined][] = [
    ["Name", f.name],
    ["Romanized name", f.romanized_name],
    ["Nationality", f.country],
    ["Born", born(f.birth_date)],
    ["Status", f.status],
    ["Role", f.role],
    ["Years active", f.years_active],
    ["Team", player.team],
  ];
  const links = Object.entries(socials).filter(([k]) => f[k]);

  return (
    <>
      <Link href="/" className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-500 transition hover:text-orange-400">← All tournaments</Link>
      <header className="relative mb-6 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-orange-500/15 via-white/[0.03] to-transparent p-6 sm:p-8">
        <div aria-hidden className="absolute -right-10 -top-10 size-56 rounded-full bg-orange-500/10 blur-3xl" />
        <div className="relative">
          <div className="mb-3 flex flex-wrap gap-2">
            <Chip>Player</Chip>
            {f.role && <Chip tone="amber">{f.role}</Chip>}
            {f.status && <Chip tone={f.status === "Active" ? "green" : "neutral"}>{f.status}</Chip>}
            {f.country && <Chip tone="blue">{f.country}</Chip>}
          </div>
          <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold leading-tight tracking-wide sm:text-5xl">{f.id ?? player.title}</h1>
          {player.intro && <p className="mt-3 max-w-2xl text-zinc-400">{player.intro}</p>}
        </div>
      </header>

      <section className={`${card} grid gap-6 md:grid-cols-[220px_1fr]`}>
        {player.photo ? (
          <div className="overflow-hidden rounded-lg bg-gradient-to-b from-zinc-500/40 to-zinc-800/60">
            <Image src={player.photo} alt={f.id ?? player.title} width={220} height={280} className="h-auto w-full object-cover" />
          </div>
        ) : (
          <div className="flex aspect-[4/5] items-center justify-center rounded-lg bg-white/5 font-[family-name:var(--font-display)] text-5xl font-bold text-zinc-600">{(f.id ?? player.title).slice(0, 2).toUpperCase()}</div>
        )}
        <div>
          <h2 className="mb-3 font-[family-name:var(--font-display)] text-xl font-semibold text-orange-400">Player information</h2>
          <dl className="space-y-2 text-sm">
            {info.filter(([, v]) => v).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 border-b border-white/5 pb-2">
                <dt className="text-zinc-500">{k}</dt>
                <dd className="text-right">
                  {k === "Team" && v ? <Link href={`/team/${encodeURIComponent(v)}`} className="text-orange-400 hover:underline">{v}</Link> : v}
                </dd>
              </div>
            ))}
          </dl>
          <div className="mt-4 flex flex-wrap gap-2">
            {links.map(([k, url]) => (
              <a key={k} href={url(f[k])} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs capitalize hover:border-orange-500">{k}</a>
            ))}
            <a href={player.url} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs hover:border-orange-500">Liquipedia</a>
          </div>
        </div>
      </section>

      <SectionTitle>Career</SectionTitle>
      <Suspense fallback={<Loading label="results" />}>
        <Career title={player.title} />
      </Suspense>
    </>
  );
}
