import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Chip, Loading, panel, Stat } from "@/components/ui";
import { teamLogos } from "@/lib/liquipedia";
import { getTransfers, recentMonths, type Month, type Transfer } from "@/lib/transfers";

export const instant = false; // transfers are read from Liquipedia per request

export const metadata: Metadata = {
  title: "Transfers",
  description: "Latest BGMI and PUBG Mobile player transfers, signings and departures.",
};

type Kind = "all" | "joins" | "leaves" | "moves";
const KINDS: [Kind, string][] = [["all", "All"], ["joins", "Signings"], ["leaves", "Departures"], ["moves", "Team to team"]];

const chip = (on: boolean) =>
  `rounded-full border px-3.5 py-1.5 text-sm transition ${on ? "border-orange-500 bg-orange-500 font-semibold text-black" : "border-white/10 bg-white/5 text-zinc-300 hover:border-white/30 hover:text-white"}`;

const kindOf = (t: Transfer): Exclude<Kind, "all"> | "other" => (t.from && t.to ? "moves" : t.to ? "joins" : t.from ? "leaves" : "other");
const day = (iso: string) => new Date(iso).toLocaleDateString("en", { weekday: "long", day: "numeric", month: "short", timeZone: "UTC" });
const ACCENT = { joins: "bg-emerald-400", leaves: "bg-red-400", moves: "bg-sky-400", other: "bg-zinc-500" };

// Windows draws flag emoji as letters, so use flag images.
function Flag({ code }: { code?: string }) {
  const c = code === "uk" ? "gb" : code;
  if (!c || !/^[a-z]{2}$/.test(c)) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`https://flagcdn.com/w40/${c}.png`} alt={c.toUpperCase()} width={20} height={14} className="h-3.5 w-5 rounded-[3px] object-cover ring-1 ring-white/20" />;
}

function TeamBadge({ name, logo }: { name?: string; logo?: string }) {
  if (!name) return <span className="flex items-center gap-2 text-sm text-zinc-500"><span className="grid size-9 place-items-center rounded-lg border border-dashed border-white/15 text-xs">?</span>No team</span>;
  return (
    <Link href={`/team/${encodeURIComponent(name)}`} className="group flex min-w-0 items-center gap-2">
      <span className="logo-plate grid size-9 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/5 p-1">
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo} alt="" className="max-h-full max-w-full object-contain" loading="lazy" />
        ) : (
          <span className="text-xs font-bold text-zinc-400">{name.slice(0, 2).toUpperCase()}</span>
        )}
      </span>
      <span className="truncate text-sm font-medium text-zinc-200 group-hover:text-orange-400">{name}</span>
    </Link>
  );
}

function Row({ t, logos }: { t: Transfer; logos: Map<string, string> }) {
  const kind = kindOf(t);
  const loan = /loan/i.test(`${t.fromRole} ${t.toRole}`);
  const role = (t.toRole ?? t.fromRole)?.replace(/^loan$/i, "");
  return (
    <li className="relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.02] transition hover:border-white/25">
      <span className={`absolute inset-y-0 left-0 w-1 ${ACCENT[kind]}`} />
      <div className="grid gap-4 p-4 pl-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_auto] sm:items-center sm:p-5 sm:pl-6">
        <div className="min-w-0 space-y-1.5">
          {t.players.map((p) => (
            <Link key={p.name} href={`/player/${encodeURIComponent(p.page ?? p.name)}`} className="flex items-center gap-3 hover:text-orange-400">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-orange-500/30 to-white/5 font-[family-name:var(--font-display)] font-bold text-orange-300">{p.name[0]?.toUpperCase()}</span>
              <span className="truncate font-[family-name:var(--font-display)] text-xl font-semibold">{p.name}</span>
              <Flag code={p.flag} />
            </Link>
          ))}
          {role && <p className="pl-12 text-xs uppercase tracking-wider text-zinc-500">{role}</p>}
        </div>
        <div className="flex min-w-0 items-center gap-3">
          <div className="min-w-0 flex-1"><TeamBadge name={t.from} logo={t.from ? logos.get(t.from) : undefined} /></div>
          <span className="text-lg text-orange-400" aria-label="to">→</span>
          <div className="min-w-0 flex-1"><TeamBadge name={t.to} logo={t.to ? logos.get(t.to) : undefined} /></div>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-end">
          <Chip tone={kind === "joins" ? "green" : kind === "leaves" ? "red" : "blue"}>{kind === "joins" ? "Signed" : kind === "leaves" ? "Left" : "Transfer"}</Chip>
          {loan && <Chip tone="amber">Loan</Chip>}
          {t.wholeTeam && <Chip>Whole roster</Chip>}
          {t.source?.url && (
            <a href={t.source.url} target="_blank" rel="noopener noreferrer" title={t.source.title} className="max-w-40 truncate text-xs text-zinc-500 transition hover:text-orange-400">
              {t.source.publisher ?? "Source"} ↗
            </a>
          )}
        </div>
      </div>
    </li>
  );
}

async function Moves({ month, kind }: { month: Month; kind: Kind }) {
  const data = await getTransfers(month).catch(() => null);
  if (!data) return <p className={`${panel} p-6 text-zinc-400`}>No transfers page exists for {month.label} yet.</p>;
  const all = data.transfers;
  const shown = kind === "all" ? all : all.filter((t) => kindOf(t) === kind);
  const count = (k: Kind) => all.filter((t) => kindOf(t) === k).length;

  const days = [...new Set(shown.map((t) => t.date))];
  const logos = await teamLogos(shown.flatMap((t) => [t.from, t.to].filter((x): x is string => !!x))).catch(() => new Map<string, string>());
  return (
    <>
      <dl className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Moves" value={all.length} accent />
        <Stat label="Signings" value={count("joins")} />
        <Stat label="Departures" value={count("leaves")} />
        <Stat label="Team to team" value={count("moves")} />
      </dl>
      {shown.length === 0 ? (
        <p className={`${panel} p-6 text-zinc-400`}>No {kind === "all" ? "transfers" : "matching moves"} recorded for {month.label}.</p>
      ) : (
        days.map((d) => (
          <section key={d} className="mb-8">
            <h2 className="mb-3 flex items-center gap-3 font-[family-name:var(--font-display)] text-lg font-semibold tracking-wide">
              <span className="size-2.5 rounded-full bg-orange-500 ring-4 ring-orange-500/20" />
              {day(d)}
              <span className="h-px flex-1 bg-white/10" />
            </h2>
            <ul className="space-y-3">{shown.filter((t) => t.date === d).map((t, i) => <Row key={d + i + t.players[0].name} t={t} logos={logos} />)}</ul>
          </section>
        ))
      )}
      <p className="text-xs text-zinc-600">Transfers are collected by the Liquipedia community from team announcements, so recent moves can take a little while to appear.</p>
    </>
  );
}

export default async function TransfersPage(props: PageProps<"/transfers">) {
  await connection(); // the months shown depend on today's date
  const sp = await props.searchParams;
  const months = recentMonths(6);
  const month = months.find((m) => m.id === sp.month) ?? months[0];
  const kind: Kind = KINDS.some(([k]) => k === sp.kind) ? (sp.kind as Kind) : "all";
  const url = (m: string, k: Kind) => `/transfers?${new URLSearchParams({ month: m, ...(k === "all" ? {} : { kind: k }) })}`;

  return (
    <>
      <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold tracking-wide sm:text-5xl">Player <span className="text-orange-500">transfers</span></h1>
      <p className="mt-2 max-w-2xl text-zinc-400">Signings, departures and moves between BGMI and PUBG Mobile teams.</p>
      <div className="mb-3 mt-6 flex flex-wrap gap-2">
        {months.map((m) => <Link key={m.id} href={url(m.id, kind)} className={chip(m.id === month.id)}>{m.label}</Link>)}
      </div>
      <div className="mb-6 flex flex-wrap gap-2">
        {KINDS.map(([k, label]) => <Link key={k} href={url(month.id, k)} className={chip(k === kind)}>{label}</Link>)}
      </div>
      <Suspense key={`${month.id}${kind}`} fallback={<Loading label="transfers" />}>
        <Moves month={month} kind={kind} />
      </Suspense>
    </>
  );
}
