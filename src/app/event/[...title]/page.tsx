import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { LiveRefresh } from "@/components/LiveRefresh";
import { Statistics } from "@/components/Statistics";
import { TeamCards } from "@/components/TeamCards";
import { TeamStatsTable } from "@/components/TeamStatsTable";
import { Watch } from "@/components/Watch";
import { WatchParties } from "@/components/WatchParties";
import { Chip, Loading, panel, SectionTitle, SubTitle } from "@/components/ui";
import { dateRange, status, tierLabel } from "@/lib/format";
import type { EventRef } from "@/lib/youtube";
import { getBroadcast, getEventInfo, getEventStats, getStages, getTeamGroups, withLogos } from "@/lib/liquipedia";

export const instant = false; // data is fetched from Liquipedia per request

const tone = { live: "red", upcoming: "blue", finished: "neutral" } as const;
const navLink = "rounded-full px-3.5 py-1.5 text-sm text-zinc-300 transition hover:bg-white/10 hover:text-white";

// Title shows at once; the facts (dates, prize pool, location...) join in when the event page has loaded.
function Hero({ name, info }: { name: string; info?: Awaited<ReturnType<typeof getEventInfo>> }) {
  const st = info ? status(info.start, info.end) : undefined;
  return (
    <header className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-orange-500/15 via-white/[0.03] to-transparent p-6 sm:p-8">
      <div aria-hidden className="absolute -right-10 -top-10 size-56 rounded-full bg-orange-500/10 blur-3xl" />
      <div className="relative">
        <div className="mb-3 flex flex-wrap gap-2">
          {info && <Chip tone={info.game === "BGMI" ? "green" : "amber"}>{info.game}</Chip>}
          {info?.tier && <Chip>{tierLabel(info.tier)}</Chip>}
          {st && (
            <Chip tone={tone[st]}>
              {st === "live" && <span className="size-1.5 animate-pulse rounded-full bg-red-400" />}
              {st}
            </Chip>
          )}
        </div>
        <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold leading-tight tracking-wide sm:text-5xl">{name}</h1>
        {st === "live" && <LiveRefresh />}
        {info && (
          <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 text-sm sm:grid-cols-3 lg:grid-cols-5">
            {[
              ["Dates", dateRange(info.start, info.end)],
              ["Location", info.location || "Online"],
              ["Prize pool", info.prizeUsd ? `$${info.prizeUsd}` : undefined],
              ["Teams", info.teams],
              ["Organizer", info.organizer],
            ].filter(([, v]) => v).map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs uppercase tracking-wider text-zinc-500">{k}</dt>
                <dd className="mt-0.5 font-medium">{v}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </header>
  );
}

async function HeroWithInfo({ page, name }: { page: string; name: string }) {
  await connection(); // the status chip depends on the current time, so render per request
  return <Hero name={name} info={await getEventInfo(page)} />;
}

async function WatchSection({ page, name }: { page: string; name: string }) {
  await connection(); // live / upcoming / finished depends on the current time
  const [info, bc] = await Promise.all([getEventInfo(page), getBroadcast(page)]);
  const state = info ? status(info.start, info.end) : "upcoming";
  const event: EventRef = { name: info?.name ?? name, abbr: info?.abbr, year: name.match(/\b20\d\d\b/)?.[0] ?? info?.start?.slice(0, 4) };
  return (
    <Watch
      streams={bc.streams}
      vods={bc.vods}
      state={state}
      parties={<WatchParties name={event.name} abbr={event.abbr} year={event.year} live={state === "live"} />}
    />
  );
}

async function Standings({ page }: { page: string }) {
  const stages = await getStages(page);
  if (stages.length === 0)
    return (
      <p className={`${panel} p-6 text-zinc-400`}>
        No standings available for this event yet, or it uses an older results format we can&apos;t read.{" "}
        <a className="text-orange-400 underline" href={`https://liquipedia.net/pubgmobile/${page.replaceAll(" ", "_")}`}>View on Liquipedia</a>.
      </p>
    );
  return stages.map((s) => (
    <section key={s.title} className="mb-10 last:mb-0">
      <SubTitle>{s.name}</SubTitle>
      <TeamStatsTable standings={s.standings} />
    </section>
  ));
}

async function Stats({ page }: { page: string }) {
  const stats = await getEventStats(page);
  if (stats.length === 0) return <p className={`${panel} p-6 text-zinc-400`}>No statistics published for this event.</p>;
  return <Statistics stats={stats} />;
}

// Cards render as soon as the participant list is known; logos swap in once the slower lookups finish.
async function Teams({ page }: { page: string }) {
  const groups = await getTeamGroups(page);
  const eventUrl = `https://liquipedia.net/pubgmobile/${page.replaceAll(" ", "_")}`;
  return (
    <Suspense fallback={<TeamCards groups={groups} eventUrl={eventUrl} />}>
      <TeamsWithLogos groups={groups} page={page} eventUrl={eventUrl} />
    </Suspense>
  );
}

async function TeamsWithLogos({ groups, page, eventUrl }: { groups: Awaited<ReturnType<typeof getTeamGroups>>; page: string; eventUrl: string }) {
  return <TeamCards groups={await withLogos(groups, page)} eventUrl={eventUrl} />;
}

// The hero and section frames render immediately; each table streams in as its data arrives.
export default async function EventPage(props: PageProps<"/event/[...title]">) {
  const { title } = await props.params;
  const page = title.map(decodeURIComponent).join("/").replaceAll("_", " ");
  const name = page.replace(/\/(20\d\d)/, " $1").replaceAll("/", " · ");

  return (
    <>
      <Link href="/" className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-500 transition hover:text-orange-400">← All tournaments</Link>
      <Suspense fallback={<Hero name={name} />}>
        <HeroWithInfo page={page} name={name} />
      </Suspense>

      <nav className="sticky top-14 z-10 -mx-4 mb-2 mt-6 flex gap-1 overflow-x-auto border-b border-white/5 bg-[#09090b]/85 px-4 py-2 backdrop-blur-md" aria-label="Sections">
        <a href="#watch" className={navLink}>Watch</a>
        <a href="#standings" className={navLink}>Team standings</a>
        <a href="#statistics" className={navLink}>Statistics</a>
        <a href="#teams" className={navLink}>Teams</a>
      </nav>

      <SectionTitle id="watch" sub="Streams, watch parties and recordings">Where to watch</SectionTitle>
      <Suspense fallback={<Loading label="broadcasts" />}><WatchSection page={page} name={name} /></Suspense>

      <SectionTitle id="standings" sub="Points from placements and eliminations">Team standings</SectionTitle>
      <Suspense fallback={<Loading label="standings" />}><Standings page={page} /></Suspense>

      <SectionTitle id="statistics" sub="Rankings and player stats">Statistics</SectionTitle>
      <Suspense fallback={<Loading label="statistics" />}><Stats page={page} /></Suspense>

      <SectionTitle id="teams" sub="Hover a card to see the roster">Teams</SectionTitle>
      <Suspense fallback={<Loading label="teams" />}><Teams page={page} /></Suspense>
    </>
  );
}

