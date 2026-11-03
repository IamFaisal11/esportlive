// Sample data only: edit this file by hand to update the site (no API covers BGMI / PUBG Mobile).
export type Game = "BGMI" | "PUBG Mobile";
export type Result = { team: string; placement: number; kills: number };
export type Match = { id: string; map: string; startsAt: string; results?: Result[] };
export type Tournament = {
  slug: string;
  name: string;
  game: Game;
  status: "live" | "upcoming" | "finished";
  matches: Match[];
};

// Standard BR placement points: 1st 10, 2nd 6, 3rd 5, 4th 4, 5th 3, 6th 2, 7th-8th 1.
const PLACEMENT = [10, 6, 5, 4, 3, 2, 1, 1];

export function standings(t: Tournament) {
  const rows = new Map<string, { team: string; played: number; wins: number; kills: number; points: number }>();
  for (const m of t.matches)
    for (const r of m.results ?? []) {
      const row = rows.get(r.team) ?? { team: r.team, played: 0, wins: 0, kills: 0, points: 0 };
      row.played++;
      row.wins += r.placement === 1 ? 1 : 0;
      row.kills += r.kills;
      row.points += (PLACEMENT[r.placement - 1] ?? 0) + r.kills;
      rows.set(r.team, row);
    }
  return [...rows.values()].sort((a, b) => b.points - a.points || b.kills - a.kills);
}

const r = (team: string, placement: number, kills: number): Result => ({ team, placement, kills });

export const tournaments: Tournament[] = [
  {
    slug: "bgmi-sample-series",
    name: "BGMI Sample Series",
    game: "BGMI",
    status: "live",
    matches: [
      { id: "m1", map: "Erangel", startsAt: "2026-11-03T12:00:00Z", results: [r("Alpha Wolves", 1, 7), r("Nova Esports", 2, 5), r("Delta Force", 3, 4), r("Orion Gaming", 4, 3), r("Titan Squad", 5, 2), r("Phoenix Rising", 6, 4), r("Viper Clan", 7, 1), r("Zenith", 8, 0)] },
      { id: "m2", map: "Miramar", startsAt: "2026-11-03T13:00:00Z", results: [r("Nova Esports", 1, 9), r("Alpha Wolves", 2, 4), r("Titan Squad", 3, 6), r("Delta Force", 4, 2), r("Zenith", 5, 3), r("Orion Gaming", 6, 1), r("Phoenix Rising", 7, 2), r("Viper Clan", 8, 0)] },
      { id: "m3", map: "Rondo", startsAt: "2026-11-03T14:00:00Z", results: [r("Delta Force", 1, 8), r("Alpha Wolves", 2, 6), r("Phoenix Rising", 3, 5), r("Nova Esports", 4, 3), r("Viper Clan", 5, 4), r("Titan Squad", 6, 1), r("Orion Gaming", 7, 2), r("Zenith", 8, 0)] },
      { id: "m4", map: "Erangel", startsAt: "2026-11-04T12:00:00Z" },
      { id: "m5", map: "Miramar", startsAt: "2026-11-04T13:00:00Z" },
    ],
  },
  {
    slug: "pubgm-sample-cup",
    name: "PUBG Mobile Sample Cup",
    game: "PUBG Mobile",
    status: "upcoming",
    matches: [
      { id: "m1", map: "Erangel", startsAt: "2026-11-10T11:00:00Z" },
      { id: "m2", map: "Livik", startsAt: "2026-11-10T12:00:00Z" },
      { id: "m3", map: "Miramar", startsAt: "2026-11-10T13:00:00Z" },
    ],
  },
];
