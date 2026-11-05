import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Chip, Stat } from "@/components/ui";
import { dateRange, status, tierLabel } from "@/lib/format";
import { getTournaments } from "@/lib/liquipedia";

export const instant = false; // allow a blocking render: the list is fetched and time-dependent

const chip = (on: boolean) =>
  `rounded-full border px-3.5 py-1.5 text-sm transition ${on ? "border-orange-500 bg-orange-500 font-semibold text-black" : "border-white/10 bg-white/5 text-zinc-300 hover:border-white/30 hover:text-white"}`;

const PAGE_SIZE = 9; // three rows of three cards

const tone = { live: "red", upcoming: "blue", finished: "neutral" } as const;
const money = (n: number) => (n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : `$${Math.round(n / 1e3)}K`);

async function List({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await connection(); // status() depends on the current time, so render per request
  const sp = await searchParams;
  const pick = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const all = await getTournaments();
  const years = [...new Set(all.map((t) => (t.end ?? t.start ?? "").slice(0, 4)).filter(Boolean))].sort().reverse();
  const f = { game: pick("game"), tier: pick("tier"), year: pick("year") };
  const shown = all.filter(
    (t) =>
      (!f.game || t.game === f.game) &&
      (!f.tier || t.tier === f.tier) &&
      (!f.year || (t.end ?? t.start ?? "").startsWith(f.year)),
  );
  // Link that sets one filter and keeps the others; clicking the active chip clears it.
  const href = (k: keyof typeof f, v: string) => {
    const q = new URLSearchParams(Object.entries({ ...f, [k]: f[k] === v ? "" : v }).filter(([, x]) => x));
    return `/?${q}`;
  };
  const pages = Math.max(1, Math.ceil(shown.length / PAGE_SIZE));
  const current = Math.min(Math.max(1, Number(pick("page")) || 1), pages);
  const visible = shown.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  // Page links keep the active filters; changing a filter (href above) drops back to page 1.
  const pageHref = (n: number) => {
    const q = new URLSearchParams(Object.entries(f).filter(([, x]) => x));
    if (n > 1) q.set("page", String(n));
    return `/?${q}`;
  };
  // 1 … 4 5 [6] 7 8 … 12: first, last and two neighbours of the current page
  const numbers = Array.from({ length: pages }, (_, i) => i + 1).filter((n) => n === 1 || n === pages || Math.abs(n - current) <= 2);
  const count = (s: ReturnType<typeof status>) => shown.filter((t) => status(t.start, t.end) === s).length;
  const prize = shown.reduce((a, t) => a + (Number(t.prizeUsd?.replace(/[^0-9]/g, "")) || 0), 0);

  return (
    <>
      <dl className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Tournaments" value={shown.length} />
        <Stat label="Live now" value={count("live")} accent />
        <Stat label="Upcoming" value={count("upcoming")} />
        <Stat label="Prize pools" value={money(prize)} accent />
      </dl>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        {["BGMI", "PUBG Mobile"].map((g) => <Link key={g} href={href("game", g)} className={chip(f.game === g)}>{g}</Link>)}
        <span className="mx-1 hidden h-6 w-px bg-white/10 sm:block" />
        {["1", "2", "3"].map((t) => <Link key={t} href={href("tier", t)} className={chip(f.tier === t)}>{tierLabel(t)}</Link>)}
        <span className="mx-1 hidden h-6 w-px bg-white/10 sm:block" />
        {years.map((y) => <Link key={y} href={href("year", y)} className={chip(f.year === y)}>{y}</Link>)}
      </div>

      {shown.length === 0 && <p className="rounded-xl border border-dashed border-white/15 p-10 text-center text-zinc-400">No tournaments match these filters.</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((t) => {
          const st = status(t.start, t.end);
          const bgmi = t.game === "BGMI";
          return (
            <Link
              key={t.title}
              href={`/event/${t.title.replaceAll(" ", "_")}`}
              className="group relative flex aspect-square flex-col overflow-hidden rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-5 transition duration-200 hover:-translate-y-1 hover:border-orange-500/60 hover:shadow-[0_12px_40px_-12px_rgba(249,115,22,0.55)]"
            >
              <span className={`absolute inset-x-0 top-0 h-0.5 ${bgmi ? "bg-emerald-400" : "bg-amber-400"} opacity-70`} />
              <div className="flex items-center justify-between">
                <Chip tone={bgmi ? "green" : "amber"}>{t.game}</Chip>
                <Chip tone={tone[st]}>
                  {st === "live" && <span className="size-1.5 animate-pulse rounded-full bg-red-400" />}
                  {st}
                </Chip>
              </div>
              <div className="flex min-h-0 flex-1 items-center justify-center py-3">
                {t.logo ? (
                  <Image src={t.logo} alt="" width={200} height={120} unoptimized={t.logo.endsWith(".svg")} className="max-h-28 w-auto max-w-[80%] object-contain transition duration-300 group-hover:scale-105" />
                ) : (
                  <span className="flex size-20 items-center justify-center rounded-2xl bg-white/10 font-[family-name:var(--font-display)] text-3xl font-bold text-zinc-500">
                    {t.name.split(" ").filter((w) => /^[A-Za-z]/.test(w)).slice(0, 2).map((w) => w[0]).join("").toUpperCase()}
                  </span>
                )}
              </div>
              <h2 className="line-clamp-2 font-[family-name:var(--font-display)] text-xl font-semibold leading-tight transition group-hover:text-orange-400">{t.name}</h2>
              <p className="mt-1 text-sm text-zinc-400">{dateRange(t.start, t.end)}</p>
              <div className="mt-3 flex items-end justify-between gap-3 text-sm">
                <div className="min-w-0 text-zinc-400">
                  <div className="truncate">{t.location || "Online"}</div>
                  <div className="text-xs text-zinc-500">{t.teams ? `${t.teams} teams · ` : ""}{tierLabel(t.tier)}</div>
                </div>
                {t.prizeUsd && <div className="shrink-0 font-[family-name:var(--font-display)] text-xl font-bold text-orange-400">${t.prizeUsd}</div>}
              </div>
            </Link>
          );
        })}
      </div>

      {pages > 1 && (
        <nav className="mt-8 flex flex-col items-center gap-3" aria-label="Pagination">
          <p className="text-sm text-zinc-500">
            Showing {(current - 1) * PAGE_SIZE + 1}–{Math.min(current * PAGE_SIZE, shown.length)} of {shown.length}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Link href={pageHref(current - 1)} aria-disabled={current === 1} className={`${chip(false)} ${current === 1 ? "pointer-events-none opacity-40" : ""}`}>← Prev</Link>
            {numbers.map((n, i) => (
              <span key={n} className="flex items-center gap-2">
                {i > 0 && n - numbers[i - 1] > 1 && <span className="text-zinc-600">…</span>}
                <Link href={pageHref(n)} aria-current={n === current ? "page" : undefined} className={`${chip(n === current)} min-w-10 text-center`}>{n}</Link>
              </span>
            ))}
            <Link href={pageHref(current + 1)} aria-disabled={current === pages} className={`${chip(false)} ${current === pages ? "pointer-events-none opacity-40" : ""}`}>Next →</Link>
          </div>
        </nav>
      )}
    </>
  );
}

// Hero and filters frame render immediately; the tournament list streams in once Liquipedia answers.
export default function Home(props: PageProps<"/">) {
  return (
    <>
      <section className="mb-10 max-w-3xl">
        <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-widest text-zinc-400">
          <span className="size-1.5 rounded-full bg-orange-500" /> BGMI · PUBG Mobile
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-5xl font-bold leading-[1.05] tracking-wide sm:text-6xl">
          Mobile esports,{" "}
          <span className="block w-fit bg-gradient-to-r from-orange-400 to-amber-300 bg-clip-text text-transparent">every tournament.</span>
        </h1>
        <p className="mt-4 text-lg text-zinc-400">Schedules, prize pools, points tables, teams and players for BGMI and PUBG Mobile events, straight from Liquipedia.</p>
      </section>
      <Suspense
        fallback={
          <div className="grid animate-pulse gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
            {Array.from({ length: 6 }, (_, i) => <div key={i} className="aspect-square rounded-xl border border-white/10 bg-white/[0.04]" />)}
          </div>
        }
      >
        <List searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}
