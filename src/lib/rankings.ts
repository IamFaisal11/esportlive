import { status } from "./format";
import { getStages, getTournaments, teamLabels, type Tournament } from "./liquipedia";

// Esportlive's own team ranking. Liquipedia publishes no ranking for these games, so it is calculated from the final
// standings of the most recent finished events: points for the finishing position, multiplied by the event's tier.
export const PLACE_POINTS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 2, 2, 2];
export const TIER_WEIGHT: Record<string, number> = { "1": 3, "2": 2, "3": 1 };
const MAX_EVENTS = 10; // each event costs two Liquipedia calls the first time, so the list is kept short
const WINDOW_DAYS = 365;

export type RankedTeam = {
  key: string;
  team: string;
  points: number;
  titles: number;
  podiums: number;
  best: number;
  results: { event: string; place: number; points: number }[];
};
export type Ranking = { teams: RankedTeam[]; events: { title: string; name: string; tier?: string; end?: string }[] };

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export async function getRankings(game: Tournament["game"]): Promise<Ranking> {
  const now = Date.now(); // callers run after connection(), so reading the clock here is fine
  const cutoff = now - WINDOW_DAYS * 864e5;
  const events = (await getTournaments())
    .filter((t) => t.game === game && t.tier && TIER_WEIGHT[t.tier] && status(t.start, t.end, now) === "finished" && Date.parse(t.end ?? "") >= cutoff)
    .sort((a, b) => (b.end ?? "").localeCompare(a.end ?? ""))
    .slice(0, MAX_EVENTS);

  const teams = new Map<string, RankedTeam>();
  const used: Ranking["events"] = [];
  const staged = await Promise.all(events.map(async (e) => ({ e, stages: await getStages(e.title).catch(() => []) })));
  for (const { e, stages } of staged) {
    // The event's final table: a stage called (Grand) Finals; a single-stage event is its own final.
    const final = stages.find((s) => /grand finals?/i.test(s.name)) ?? stages.find((s) => /final/i.test(s.name)) ?? (stages.length === 1 ? stages[0] : undefined);
    if (!final) continue;
    used.push({ title: e.title, name: e.name, tier: e.tier, end: e.end });
    final.standings.forEach((row, i) => {
      const place = i + 1;
      const points = (PLACE_POINTS[i] ?? 1) * TIER_WEIGHT[e.tier!];
      const key = norm(row.key);
      const t = teams.get(key) ?? { key: row.key, team: row.team, points: 0, titles: 0, podiums: 0, best: 99, results: [] };
      t.points += points;
      t.titles += place === 1 ? 1 : 0;
      t.podiums += place <= 3 ? 1 : 0;
      t.best = Math.min(t.best, place);
      t.results.push({ event: e.name, place, points });
      teams.set(key, t);
    });
  }
  const ranked = [...teams.values()].sort((a, b) => b.points - a.points || b.titles - a.titles || a.best - b.best);
  // Standings use short keys ("godl", "ns redforce"): show proper names, and merge keys that turn out to be the same team.
  const head = ranked.slice(0, 60);
  const names = await teamLabels(head.map((t) => t.key)).catch(() => new Map<string, string>());
  const merged = new Map<string, RankedTeam>();
  for (const t of head) {
    const team = names.get(t.key) ?? t.team;
    const m = merged.get(norm(team));
    if (!m) merged.set(norm(team), { ...t, team, results: [...t.results] });
    else {
      m.points += t.points;
      m.titles += t.titles;
      m.podiums += t.podiums;
      m.best = Math.min(m.best, t.best);
      m.results.push(...t.results);
    }
  }
  const teamsOut = [...merged.values()].sort((a, b) => b.points - a.points || b.titles - a.titles || a.best - b.best);
  return { teams: teamsOut, events: used };
}
