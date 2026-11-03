// What a Liquipedia "Statistics" page holds: MVP / IGL cards, tournament totals, title rankings and per-player tables.
export type StatCard = { title: string; name: string; team: string; stats: [string, string][] };
export type StatTable = { title: string; headers: string[]; rows: { player: string; team: string; cells: string[] }[] };
export type EventStats = { id: string; name: string; cards: StatCard[]; summary: [string, string][]; rankings: StatTable[]; playerTables: StatTable[] };

const params = (block: string) => Object.fromEntries([...block.matchAll(/\|(\w+)=([^|\n}]*)/g)].map((m) => [m[1], m[2].trim()]));
const pickStats = (f: Record<string, string>, labels: Record<string, string>): [string, string][] =>
  Object.entries(labels).filter(([k]) => f[k]).map(([k, label]) => [label, f[k]]);

const CARD_LABELS = { matches: "Matches", elims: "Elims", damage: "Damage", assists: "Assists", survival: "Avg. survival", knocks: "Knocks", longestelim: "Longest elim", healing: "Healing" };
const SUMMARY_LABELS = { stages: "Stages", days: "Days", games: "Games", teams: "Teams", players: "Players", elims: "Elims", damage: "Damage", assists: "Assists", knocks: "Knocks", grenades: "Grenades", smokes: "Smokes", gelims: "Grenade elims", airdrops: "Airdrops", healing: "Healing", longest_elim: "Longest elim" };

// Rankings tables are plain wikitables: a title row, a header row, then {{Placement|n}} || {{Player|id |team=..}} || values.
function parseRankings(text: string): StatTable[] {
  const out: StatTable[] = [];
  for (const chunk of text.split("{|").slice(1)) {
    const table = chunk.split(/\n\|\}/)[0];
    const title = table.match(/!\s*colspan="?\d+"?\s*\|\s*([^\n]+)/)?.[1].trim();
    const headers = [...table.matchAll(/^!\s*(?:width="[^"]*"\s*\|\s*)?([^\n]+)$/gm)].map((m) => m[1].trim()).filter((h) => !h.startsWith("colspan") && h !== "#");
    const rows: StatTable["rows"] = [];
    for (const line of table.split("\n")) {
      const m = line.match(/\{\{Placement\|\d+\}\}.*?\{\{Player\|([^|}]+)([^}]*)\}\}\s*\|\|(.*)/);
      if (m) rows.push({ player: m[1].trim(), team: m[2].match(/\|team=([^|}]*)/)?.[1].trim() ?? "", cells: m[3].split("||").map((x) => x.trim()) });
    }
    if (title && rows.length) out.push({ title, headers: headers.slice(1), rows });
  }
  return out;
}

// {{PlayerTournamentStats |title=.. |stat1=Matches<br>Played ... |{{TournamentStats/row|team=..|player=..|stat1=..}} ...}}
function parsePlayerTables(text: string): StatTable[] {
  return text.split("{{PlayerTournamentStats").slice(1).flatMap((chunk) => {
    const body = chunk.split(/\n\}\}/)[0];
    const head = body.split("\n").filter((l) => !l.includes("TournamentStats/row")).join("\n");
    const title = head.match(/\|title=([^\n|]+)/)?.[1].trim() ?? "Player statistics";
    const headers = [...head.matchAll(/\|stat\d=([^|\n]+)/g)].map((m) => m[1].replace(/<br\s*\/?>/gi, " ").trim());
    const rows = [...body.matchAll(/\{\{TournamentStats\/row([^}]*)\}\}/g)].map((m) => {
      const f = params(m[1]);
      return { player: f.player, team: f.team ?? "", cells: [1, 2, 3, 4, 5, 6].map((i) => f[`stat${i}`]).filter((v) => v !== undefined) };
    });
    return rows.length ? [{ title, headers, rows }] : [];
  });
}

export function parseStatistics(raw: string): Omit<EventStats, "id" | "name"> {
  const text = raw.replace(/<!--[\s\S]*?-->/g, "");
  const cards: StatCard[] = text.split("{{MVPStatsTable").slice(1).map((chunk) => {
    const f = params(chunk.split(/\n\}\}/)[0]);
    return { title: f.title ?? "MVP", name: f.name, team: f.team ?? "", stats: pickStats(f, CARD_LABELS) };
  }).filter((c) => c.name);
  const summaryBlock = text.split("{{TournamentStatsTable")[1]?.split(/\n\}\}/)[0] ?? "";
  return { cards, summary: pickStats(params(summaryBlock), SUMMARY_LABELS), rankings: parseRankings(text), playerTables: parsePlayerTables(text) };
}
