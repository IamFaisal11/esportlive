import { parseStreams, parseVods, type Broadcast, type Vod } from "./broadcast";
import { status } from "./format";
import { parseStatistics, type EventStats } from "./stats";
import { parseResults, parseRoster, parseTimeline, wikiText, type TeamHistory } from "./teamhistory";

// Reads real tournament data from Liquipedia's MediaWiki API (CC-BY-SA; keep attribution on the page).
const API = "https://liquipedia.net/pubgmobile/api.php";
const UA = "Esportlive-dev/0.1 (aazim.iqbal@alphacoders.ai)";

export type Tournament = {
  title: string;
  name: string;
  tier?: string;
  organizer?: string;
  start?: string;
  end?: string;
  prizeUsd?: string;
  location?: string;
  teams?: string;
  game: "BGMI" | "PUBG Mobile";
  url: string;
  logoFile?: string;
  logo?: string;
  abbr?: string;
};

// Pulls `|key=value` pairs out of the {{Infobox league ...}} template.
function infobox(wikitext: string) {
  const body = wikitext.match(/\{\{Infobox league([\s\S]*?)\n\}\}/)?.[1] ?? "";
  const out: Record<string, string> = {};
  for (const m of body.matchAll(/\|([a-z_0-9]+)=([^\n|]*)/g)) out[m[1]] = m[2].trim();
  return out;
}

function toTournament(title: string, wikitext: string): Tournament {
  const f = infobox(wikitext);
  return {
    title,
    name: f.name ?? title,
    tier: f.liquipediatier,
    organizer: f.organizer,
    start: f.sdate,
    end: f.edate,
    prizeUsd: f.prizepoolusd,
    location: [f.city, f.country].filter(Boolean).join(", "),
    teams: f.team_number,
    abbr: f.abbreviation || f.tickername?.split(" ")[0],
    logoFile: f.imagedark || f.imagedarkmode || f.image || undefined, // dark-theme logo first: the site is dark
    game: /Battlegrounds Mobile India|BGMI/.test(title) ? "BGMI" : "PUBG Mobile",
    url: `https://liquipedia.net/pubgmobile/${title.replaceAll(" ", "_")}`,
  };
}

// One event's details (dates, prize pool, location...), read from the main page already fetched for it.
export async function getEventInfo(title: string): Promise<Tournament | null> {
  const text = (await eventPages(title)).get(title);
  return text ? toTournament(title, text) : null;
}

// Discovers events from Liquipedia's tier index pages, then reads each event's infobox.
export async function getTournaments(): Promise<Tournament[]> {
  const titles = new Set<string>();
  for (const tier of ["S", "A"]) {
    const d = await api(`action=query&prop=links&pllimit=500&plnamespace=0&titles=${tier}-Tier_Tournaments`);
    for (const l of (d.query.pages[0].links ?? []) as { title: string }[])
      if (/\/20\d\d(\/Season \d)?$/.test(l.title) && !l.title.includes("Tier Tournaments")) titles.add(l.title);
  }
  const all = [...titles];
  const out: Tournament[] = [];
  for (let i = 0; i < all.length; i += 50) {
    const data = await api(`action=query&prop=revisions&rvprop=content&rvslots=main&titles=${encodeURIComponent(all.slice(i, i + 50).join("|"))}`);
    for (const p of data.query.pages as { title: string; missing?: boolean; revisions?: { slots: { main: { content: string } } }[] }[]) {
      if (p.missing || !p.revisions) continue;
      out.push(toTournament(p.title, p.revisions[0].slots.main.content));
    }
  }
  const urls = await fileUrls(out.flatMap((t) => (t.logoFile ? [t.logoFile] : [])));
  for (const t of out) t.logo = urls.get(t.logoFile ?? "");
  return out.sort((a, b) => (b.end ?? b.start ?? "").localeCompare(a.end ?? a.start ?? ""));
}

export type Game = { map: string; place: number; kills: number; placePts: number; killPts: number };
export type Standing = { key: string; team: string; maps: number; wwcd: number; kills: number; placePts: number; total: number; games: Game[] };
export type Stage = { title: string; name: string; standings: Standing[] };

const titleCase = (s: string) => s.replace(/ \(.*\)$/, "").replace(/\b[a-z]/g, (c) => c.toUpperCase());

// Scores one stage page: {{MS|placement|kills}} per team per map, points from the |p1=..|p_kill= header.
function parseStage(wikitext: string): Standing[] {
  const rows = new Map<string, Standing>();
  for (const block of wikitext.split("{{Match|").slice(1)) {
    const [header, ...opps] = block.split(/\|opponent\d+=\{\{TeamOpponent\|/);
    const pts = [...header.matchAll(/\|p(\d+)=(\d+)/g)].map((m) => [+m[1], +m[2]]);
    if (!pts.length) continue;
    const perKill = +(header.match(/\|p_kill=(\d+)/)?.[1] ?? 1);
    // |map3={{Map |date=.. |map=Erangel |mvp=..}} -> game 3 was played on Erangel
    const mapNames = new Map([...header.matchAll(/\|map(\d+)=\{\{Map[\s\S]*?\|map=([^|}\n\t]+)/g)].map((m) => [+m[1], m[2].trim()]));
    for (const o of opps) {
      const key = o.match(/^[^|\n}]+/)?.[0].trim() ?? "?";
      const team = titleCase(key);
      const row = rows.get(team) ?? { key, team, maps: 0, wwcd: 0, kills: 0, placePts: 0, total: 0, games: [] };
      for (const m of o.matchAll(/\|m(\d+)=\{\{MS\|(\d+)\|(\d+)\}\}/g)) {
        const place = +m[2];
        const kills = +m[3];
        const placePts = pts.find(([p]) => p === place)?.[1] ?? 0;
        row.maps++;
        row.wwcd += place === 1 ? 1 : 0;
        row.kills += kills;
        row.placePts += placePts;
        row.total += placePts + kills * perKill;
        row.games.push({ map: mapNames.get(+m[1]) ?? `Game ${m[1]}`, place, kills, placePts, killPts: kills * perKill });
      }
      rows.set(team, row);
    }
  }
  return [...rows.values()]
    .filter((r) => r.maps > 0)
    .sort((a, b) => b.total - a.total || b.wwcd - a.wwcd || b.kills - a.kills);
}

// Identical queries are answered from memory for 30 min and de-duplicated while in flight; real network calls
// go through one queue with a gap between them, since Liquipedia asks API users to stay near 1 request / 2 s.
const TTL = 30 * 60 * 1000;
const LIVE_TTL = 60 * 1000; // a tournament that is running is re-read every minute
const liveEvents = new Set<string>();
const GAP = 1200;
// MediaWiki responses differ per query, so they stay untyped here and are narrowed at each call site.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const cache = new Map<string, { at: number; data: Promise<any> }>();
let queue: Promise<void> = Promise.resolve();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function api(params: string, ttl = TTL): Promise<any> {
  const hit = cache.get(params);
  if (hit && performance.now() - hit.at < ttl) return hit.data;
  const turn = queue;
  let done!: () => void;
  queue = new Promise((r) => (done = r));
  const data = (async () => {
    await turn;
    const started = performance.now();
    let upstream = true;
    try {
      // Next's data cache keeps each answer for the TTL and serves it stale while refreshing in the background.
      const res = await fetch(`${API}?format=json&formatversion=2&${params}`, { headers: { "User-Agent": UA, "Accept-Encoding": "gzip" }, next: { revalidate: ttl / 1000 } });
      // An answer that came back this fast was served from the cache, not from Liquipedia, so it needs no politeness gap.
      upstream = performance.now() - started > 150;
      if (!res.ok) throw new Error(`Liquipedia API ${res.status}`);
      return await res.json();
    } finally {
      setTimeout(done, upstream ? GAP : 0);
    }
  })();
  cache.set(params, { at: performance.now(), data }); // performance.now(): Date.now() is rejected while Next prerenders
  data.catch(() => cache.delete(params));
  return data;
}

type Page = { title: string; revisions?: { slots: { main: { content: string } } }[] };

// One shared fetch per event: the main page plus its stage and statistics sub-pages, as title -> wikitext.
async function eventPages(title: string): Promise<Map<string, string>> {
  const ttl = liveEvents.has(title) ? LIVE_TTL : TTL;
  const list = await api(`action=query&list=allpages&aplimit=50&apprefix=${encodeURIComponent(title.replaceAll(" ", "_") + "/")}`, ttl);
  const subs = (list.query.allpages as { title: string }[]).map((p) => p.title).filter((t) => !/Additional Content|\/Map$|Statistics\/Players\//.test(t));
  const data = await api(`action=query&prop=revisions&rvprop=content&rvslots=main&titles=${encodeURIComponent([title, ...subs.slice(0, 49)].join("|"))}`, ttl);
  const pages = new Map((data.query.pages as Page[]).map((p) => [p.title, p.revisions?.[0].slots.main.content ?? ""] as const));
  // Remember whether the event is running so the next read uses the short cache (clock without Date.now(), which Next rejects here).
  const f = infobox(pages.get(title) ?? "");
  if (status(f.sdate, f.edate, performance.timeOrigin + performance.now()) === "live") liveEvents.add(title);
  else liveEvents.delete(title);
  return pages;
}

export async function getStages(title: string): Promise<Stage[]> {
  // Many events keep their results on the main page instead of sub-pages, so the main page is read too.
  return [...(await eventPages(title))]
    .filter(([t]) => t === title || !/Statistics|Additional Content|Map|Players/.test(t))
    .map(([t, text]) => {
      const name = t === title ? (text.match(/\|R1M1header=([^\n|]+)/)?.[1].trim() ?? "Results") : t.slice(title.length + 1);
      return { title: t, name, standings: parseStage(text) };
    })
    .filter((st) => st.standings.length)
    .sort((x, y) => x.title.localeCompare(y.title));
}

// Every Statistics page of the event (overall and per stage), parsed into cards, totals, rankings and player tables.
export async function getEventStats(title: string): Promise<EventStats[]> {
  return [...(await eventPages(title))]
    .filter(([t]) => /\/Statistics(\/Players)?$/.test(t))
    .map(([t, text]) => ({
      id: t,
      name: t.slice(title.length + 1).replace(/\/?Statistics(\/Players)?$/, "") || "Overall",
      ...parseStatistics(text),
    }))
    .filter((e) => e.cards.length || e.summary.length || e.rankings.length || e.playerTables.length)
    .sort((x, y) => x.id.localeCompare(y.id));
}

export type Team = { title: string; url: string; fields: Record<string, string>; roster: { id: string; name?: string; role?: string }[] };

// Strips wiki markup: templates ({{Flag|in}}), links ([[a|b]] -> b) and <br> tags.
const clean = (v?: string) =>
  (v ?? "")
    .replace(/<br\s*\/?>/gi, ", ")
    .replace(/\{\{[^}]*\}\}:?\s*/g, "")
    .replace(/\[\[([^\]|]+\|)?([^\]]+)\]\]/g, "$2")
    .replace(/,\s*$/, "")
    .trim();

// Resolves a lowercase Liquipedia key (like "team aryan") to the real page, then reads infobox + active roster.
// Liquipedia's own team template knows which page a team key belongs to ({{Team|versus}} -> [[Versus]]). A text search
// is the fallback, but it can pick the wrong page: "versus" finds "Versus Programming Network" first.
async function teamPageTitle(key: string): Promise<string | undefined> {
  if (/^[\p{L}\p{N} .'&()-]+$/u.test(key)) {
    const out = await expand("Main Page", `{{Team|${key}}}`);
    const link = out.match(/\[\[(?!File:)([^\]|]+)/)?.[1]?.trim();
    if (link) return link;
  }
  const search = await api(`action=opensearch&limit=1&namespace=0&search=${encodeURIComponent(key)}`);
  return search[1]?.[0];
}

export async function getTeam(key: string): Promise<Team | null> {
  const title = await teamPageTitle(key);
  if (!title) return null;
  const data = await api(`action=query&redirects=1&prop=revisions&rvprop=content&rvslots=main&titles=${encodeURIComponent(title)}`);
  const page = data.query.pages[0];
  const text: string = page.revisions?.[0].slots.main.content ?? "";
  if (!text.includes("{{Infobox team")) return null;
  const raw = text.match(/\{\{Infobox team([\s\S]*?)\n\}\}/)?.[1] ?? "";
  const fields: Record<string, string> = {};
  for (const m of raw.matchAll(/^\|([a-z_0-9]+)=(.*)$/gm)) if (clean(m[2])) fields[m[1]] = clean(m[2]);
  const active = text.match(/\{\{ActiveSquadAuto([\s\S]*?)\n\}\}/)?.[1] ?? "";
  const roster = [...active.matchAll(/\{\{SquadAutoRow\s*\|([^}]*)\}\}/g)].map((m) => {
    const kv = Object.fromEntries(m[1].split("|").map((x) => x.split("=").map((y) => y.trim())));
    return { id: kv.id as string, name: kv.name as string | undefined, role: kv.role as string | undefined };
  });
  return { title: page.title, url: `https://liquipedia.net/pubgmobile/${page.title.replaceAll(" ", "_")}`, fields, roster };
}

export type Member = { id: string; role?: string; staff: boolean; sub: boolean };
export type TeamCard = { name: string; qualification?: string; logo?: string; members: Member[] };
export type TeamGroup = { stage: string; teams: TeamCard[] };

// Reads the ==Participants== section: {{Opponent|Team ... |players={{Persons|{{Person|id|role=..}}}} |qualification={{Qualification|text=..}}}}
function parseParticipants(wikitext: string): TeamGroup[] {
  const start = wikitext.search(/==\s*Participants\s*==/i);
  if (start < 0) return [];
  const rest = wikitext.slice(start).replace(/==\s*Participants\s*==/i, "");
  const section = rest.split(/\n==[^=]/)[0];
  const groups: TeamGroup[] = [];
  for (const part of section.split(/\n===\s*/)) {
    const [head, ...body] = part.split("\n");
    const stage = body.length ? head.replace(/\s*===.*$/, "").trim() : "Teams";
    const text = body.length ? body.join("\n") : part;
    const teams: TeamCard[] = [];
    for (const chunk of text.split("{{Opponent|").slice(1)) {
      const name = chunk.match(/^[^|\n}]+/)?.[0].trim();
      if (!name || name.toLowerCase() === "tbd") continue;
      const members: Member[] = [...chunk.matchAll(/\{\{Person\|([^|}]*)([^}]*)\}\}/g)]
        .filter((m) => m[1].trim())
        .map((m) => ({
          id: m[1].trim(),
          role: m[2].match(/\|role=([^|}]+)/)?.[1].trim(),
          staff: /\|type=staff/i.test(m[2]),
          sub: /\|played=false/i.test(m[2]),
        }));
      teams.push({ name, qualification: chunk.match(/\|text=([^|}]+)/)?.[1].trim(), members });
    }
    if (teams.length) groups.push({ stage, teams });
  }
  return groups;
}

// File names -> direct image URLs, 50 per call.
async function fileUrls(files: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const unique = [...new Set(files)];
  for (let i = 0; i < unique.length; i += 50) {
    const chunk = unique.slice(i, i + 50);
    const d = await api(`action=query&prop=imageinfo&iiprop=url&titles=${encodeURIComponent(chunk.map((f) => "File:" + f).join("|"))}`);
    const hop = new Map<string, string>(((d.query.normalized ?? []) as { from: string; to: string }[]).map((x) => [x.from, x.to]));
    const byTitle = new Map((d.query.pages as { title: string; imageinfo?: { url: string }[] }[]).map((p) => [p.title, p.imageinfo?.[0]?.url]));
    for (const f of chunk) {
      const url = byTitle.get(hop.get("File:" + f) ?? "File:" + f);
      if (url) out.set(f, url);
    }
  }
  return out;
}

const norm = (x: string) => x.toLowerCase().replace(/[^a-z0-9]/g, "");

// Words Liquipedia often leaves out of a logo file name ("Weibo Gaming" -> "Weibo allmode.png").
const TRAILING = new Set(["esports", "esport", "gaming", "club", "team", "official", "mea"]);

// Normalised spellings to try for a team: the full name, then with trailing generic words dropped one by one.
function nameKeys(team: string): string[] {
  const words = team.replace(/ \(.*\)$/, "").trim().split(/\s+/);
  const keys = [norm(words.join(" "))];
  while (words.length > 1 && TRAILING.has(words[words.length - 1].toLowerCase())) {
    words.pop();
    keys.push(norm(words.join(" ")));
  }
  return keys;
}

// Liquipedia uploads logos as "<Team name> [year] darkmode/allmode/lightmode.png"; pick the best one for a team:
// dark theme first (the site is dark), then newest year, then shortest name.
function pickLogo(team: string, files: string[]) {
  const mode = (f: string) => (/darkmode/i.test(f) ? 0 : /allmode/i.test(f) ? 1 : 2);
  const year = (f: string) => Math.max(0, ...[...f.matchAll(/\b(20\d\d)\b/g)].map((m) => +m[1]));
  const pool = files.filter((f) => /(darkmode|allmode|lightmode)\.(png|svg|webp|jpg)$/i.test(f));
  for (const key of nameKeys(team)) {
    const hit = pool.filter((f) => norm(f).startsWith(key)).sort((a, b) => mode(a) - mode(b) || year(b) - year(a) || a.length - b.length)[0];
    if (hit) return hit;
  }
}

// The event page embeds every participant's logo, so its file list (one call, rarely more) covers all teams;
// a second call turns the chosen file names into direct image URLs.
async function attachLogos(groups: TeamGroup[], title: string) {
  const used: string[] = [];
  let more = "";
  for (let k = 0; k < 4; k++) {
    const d = await api(`action=query&prop=images&imlimit=max&titles=${encodeURIComponent(title)}${more}`);
    used.push(...((d.query.pages[0].images ?? []) as { title: string }[]).map((i) => i.title.replace(/^File:/, "")));
    if (!d.continue?.imcontinue) break;
    more = `&imcontinue=${encodeURIComponent(d.continue.imcontinue)}`;
  }
  const fileByTeam = new Map<string, string>();
  for (const g of groups) for (const t of g.teams) {
    const f = pickLogo(t.name, used);
    if (f) fileByTeam.set(t.name, f);
  }
  // Teams whose logo isn't among the event page's files (renamed teams, odd file names): ask Liquipedia's own team-icon
  // template which file it draws for each, all in one call. A "default" file means it has no real logo either.
  const unmatched = [...new Set(groups.flatMap((g) => g.teams.map((t) => t.name)))].filter((n) => !fileByTeam.has(n) && n.toLowerCase() !== "tbd" && !/[|{}]/.test(n));
  if (unmatched.length) {
    const SPLIT = "@@SPLIT@@";
    const out = await expand("Main Page", unmatched.map((n) => `{{TeamIcon|${n.toLowerCase()}}}`).join(SPLIT));
    const mode = (f: string) => (/darkmode/i.test(f) ? 0 : /allmode/i.test(f) ? 1 : 2);
    out.split(SPLIT).forEach((part, i) => {
      const f = [...part.matchAll(/\[\[File:([^|\]]+)/g)].map((m) => m[1].trim()).filter((x) => !/default/i.test(x)).sort((x, y) => mode(x) - mode(y))[0];
      if (f && unmatched[i]) fileByTeam.set(unmatched[i], f);
    });
  }
  const files = [...new Set(fileByTeam.values())];
  const urlByFile = await fileUrls(files);
  for (const g of groups) for (const t of g.teams) t.logo = urlByFile.get(fileByTeam.get(t.name) ?? "");
}

// Phase 1: participants only (needs the shared event fetch), so cards can render right away.
export async function getTeamGroups(title: string): Promise<TeamGroup[]> {
  return parseParticipants((await eventPages(title)).get(title) ?? "");
}

// Phase 2: the slower logo lookups (two extra API calls), returned as a copy so phase 1 stays logo-free.
export async function withLogos(groups: TeamGroup[], title: string): Promise<TeamGroup[]> {
  const copy = structuredClone(groups);
  if (copy.length) await attachLogos(copy, title);
  return copy;
}

// A team's roster, roster changes and past results. Liquipedia builds these from its own database, so the
// templates are expanded server-side with expandtemplates instead of being read from the page source.
export async function getTeamHistory(title: string): Promise<TeamHistory> {
  const SPLIT = "@@SPLIT@@";
  const roster = `{{ActiveSquadAuto}}${SPLIT}{{FormerSquadAuto}}${SPLIT}{{TimelineSquadAuto}}`;
  const [main, results] = await Promise.all([
    api(`action=expandtemplates&prop=wikitext&title=${encodeURIComponent(title)}&text=${encodeURIComponent(roster)}`),
    api(`action=expandtemplates&prop=wikitext&title=${encodeURIComponent(title + "/Results")}&text=${encodeURIComponent("{{QuickResultsTeam}}")}`),
  ]);
  const [active = "", former = "", timeline = ""] = ((main.expandtemplates?.wikitext as string | undefined) ?? "").split(SPLIT);
  return {
    active: parseRoster(active),
    former: parseRoster(former),
    timeline: parseTimeline(timeline),
    results: parseResults((results.expandtemplates?.wikitext as string | undefined) ?? ""),
  };
}

export type Player = { title: string; url: string; fields: Record<string, string>; intro: string; team?: string; photo?: string };

const expand = async (title: string, text: string): Promise<string> =>
  ((await api(`action=expandtemplates&prop=wikitext&title=${encodeURIComponent(title)}&text=${encodeURIComponent(text)}`)).expandtemplates?.wikitext as string | undefined) ?? "";

// Profile from the page's {{Infobox player}}; the "plays for" sentence comes from expanding {{PlayerIntro}},
// because the infobox team field is empty (Liquipedia fills it from its database).
export async function getPlayer(id: string): Promise<Player | null> {
  const load = async (t: string) => (await api(`action=query&redirects=1&prop=revisions&rvprop=content&rvslots=main&titles=${encodeURIComponent(t)}`)).query.pages[0] as { title: string; missing?: boolean; revisions?: { slots: { main: { content: string } } }[] };
  let page = await load(id);
  if (page.missing) {
    const hit = (await api(`action=query&list=prefixsearch&pssearch=${encodeURIComponent(id)}&pslimit=1`)).query.prefixsearch?.[0]?.title as string | undefined;
    if (!hit) return null;
    page = await load(hit);
  }
  const text = (page.revisions?.[0].slots.main.content ?? "").replace(/<!--[\s\S]*?-->/g, "");
  const box = text.match(/\{\{Infobox player([\s\S]*?)\n\}\}/)?.[1];
  if (box === undefined) return null;
  const fields: Record<string, string> = {};
  for (const m of box.matchAll(/^\|([a-z_0-9]+)=(.*)$/gm)) if (clean(m[2]).replace(/'''/g, "")) fields[m[1]] = clean(m[2]).replace(/'''/g, "");

  const intro = wikiText(await expand(page.title, "{{PlayerIntro}}")).replace(/'''?/g, "").replace(/" ([^"]+) "/, '"$1"');
  let photo: string | undefined;
  if (fields.image) {
    const d = await api(`action=query&prop=imageinfo&iiprop=url&titles=${encodeURIComponent("File:" + fields.image)}`);
    photo = d.query.pages[0]?.imageinfo?.[0]?.url;
  }
  return { title: page.title, url: `https://liquipedia.net/pubgmobile/${page.title.replaceAll(" ", "_")}`, fields, intro, team: intro.match(/playing for ([^.]+)\./)?.[1], photo };
}

// {{QuickResults}} on the player's /Results page: same table as a team's, with a Team column.
export async function getPlayerResults(title: string): Promise<TeamHistory["results"]> {
  return parseResults(await expand(`${title}/Results`, "{{QuickResults}}"));
}

// Photos for a list of player pages: each page's infobox image field, then its direct URL (two batched calls).
export async function getPlayerPhotos(pages: string[]): Promise<Record<string, string>> {
  const titles = [...new Set(pages)].slice(0, 50);
  if (!titles.length) return {};
  const d = await api(`action=query&redirects=1&prop=revisions&rvprop=content&rvslots=main&titles=${encodeURIComponent(titles.join("|"))}`);
  const hop = new Map<string, string>(([...(d.query.normalized ?? []), ...(d.query.redirects ?? [])] as { from: string; to: string }[]).map((x) => [x.from, x.to]));
  const text = new Map((d.query.pages as Page[]).map((p) => [p.title, p.revisions?.[0].slots.main.content ?? ""]));
  const fileOf = new Map<string, string>();
  for (const t of titles) {
    let r = t;
    for (let k = 0; k < 3 && hop.has(r); k++) r = hop.get(r)!;
    const box = (text.get(r) ?? "").replace(/<!--[\s\S]*?-->/g, "").match(/\{\{Infobox player([\s\S]*?)\n\}\}/)?.[1] ?? "";
    const file = box.match(/^\|image=([^|\n]+)/m)?.[1].trim();
    if (file) fileOf.set(t, file);
  }
  const files = [...new Set(fileOf.values())];
  if (!files.length) return {};
  const im = await api(`action=query&prop=imageinfo&iiprop=url&titles=${encodeURIComponent(files.map((f) => "File:" + f).join("|"))}`);
  const ihop = new Map<string, string>(((im.query.normalized ?? []) as { from: string; to: string }[]).map((x) => [x.from, x.to]));
  const url = new Map((im.query.pages as { title: string; imageinfo?: { url: string }[] }[]).map((p) => [p.title, p.imageinfo?.[0]?.url]));
  return Object.fromEntries([...fileOf].flatMap(([t, f]) => {
    const u = url.get(ihop.get("File:" + f) ?? "File:" + f);
    return u ? [[t, u]] : [];
  }));
}

// Official stream channels per language and the recordings table, both read from the event's main page.
export async function getBroadcast(title: string): Promise<{ streams: Broadcast[]; vods: Vod[] }> {
  const text = (await eventPages(title)).get(title) ?? "";
  return { streams: parseStreams(text), vods: parseVods(text) };
}
