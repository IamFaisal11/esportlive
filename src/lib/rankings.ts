import { getWikiPages } from "./liquipedia";

// Liquipedia's real rankings, not a calculation of ours:
//  - BGMI: the KIE (Krafton India Esports) Global Leaderboard, for teams and players.
//  - PUBG Mobile: the PMGC qualification points by region (the table that decides who plays the Global Championship).
// Both are {{FfaStandings}} tables: one row per team with the points earned at each event (r1, r2, ...).

export type PointsRow = { key: string; total: number; parts: (number | null)[] };
export type PointsTable = { title: string; rounds: string[]; slots: number; rows: PointsRow[] };

export function parseFfa(wikitext: string): PointsTable[] {
  const text = wikitext.replace(/<!--[\s\S]*?-->/g, "");
  return text
    .split("{{FfaStandings")
    .slice(1)
    .map((block) => {
      const body = block.split(/\n\}\}/)[0];
      // The event label is the link text: [[Page|2025 BMPS]] or {{TourLinkIcon|Page|Regionals S1}}
      const rounds = [...body.matchAll(/^\|round(\d+)=(.*)$/gm)].map(
        (m) => (m[2].match(/\[\[[^\]|]+\|([^\]]+)\]\]/)?.[1] ?? m[2].match(/TourLinkIcon\|[^|}]*\|([^}]*)\}\}/)?.[1] ?? `Event ${m[1]}`).trim(),
      );
      const rows: PointsRow[] = [];
      for (const m of body.matchAll(/\{\{(?:Team|Solo)Opponent\|([^|\n}]+?)\s*\|([^}\n]*)\}\}/g)) {
        const parts: (number | null)[] = rounds.map(() => null);
        for (const r of m[2].matchAll(/\br(\d+)=\s*([^\s|}]*)/g)) {
          const v = Number(r[2]);
          if (+r[1] - 1 < parts.length && r[2] !== "" && !Number.isNaN(v)) parts[+r[1] - 1] = v;
        }
        rows.push({ key: m[1].trim(), parts, total: parts.reduce<number>((a, b) => a + (b ?? 0), 0) });
      }
      // The page lists teams unsorted; rank by total points, then by the most recent event.
      const lastEvent = (r: PointsRow) => [...r.parts].reverse().find((p) => p !== null) ?? 0;
      rows.sort((a, b) => b.total - a.total || lastEvent(b) - lastEvent(a));
      // |bg=1-4=up  or  |bg=1=seedup,2=byeup,3=seedup,4-5=up : every position marked ...up qualifies, so the slot count
      // is the last such position.
      const slots = Math.max(0, ...(body.match(/\|bg=([^\n|]+)/)?.[1].split(",") ?? []).map((part) => {
        const m = part.trim().match(/^(\d+)(?:-(\d+))?=\w*up$/);
        return m ? Number(m[2] ?? m[1]) : 0;
      }));
      return { title: body.match(/\|title=([^\n|]+)/)?.[1].trim() ?? "", rounds, slots, rows };
    })
    .filter((t) => t.rows.length > 0);
}

// ---- BGMI: KIE Global Leaderboard -----------------------------------------------------------------------------------
export type Kie = {
  teams?: PointsTable;
  players?: PointsTable;
  updated?: string;
  edited: string;
  placement: [string, string][];
  decay: [string, string][];
};

export async function getKie(): Promise<Kie | null> {
  const page = (await getWikiPages(["BGMI Esports/KIE Global Leaderboard"])).get("BGMI Esports/KIE Global Leaderboard");
  if (!page) return null;
  const tables = parseFfa(page.text);
  // "Points System" -> first tab (Teams) holds two wikitables: points per finish, then the decay multiplier by months
  const system = page.text.split("{{Tabs dynamic/tab|1}}")[1]?.split("{{Tabs dynamic/tab|2}}")[0] ?? "";
  const pairs = (chunk: string): [string, string][] =>
    [...chunk.matchAll(/\{\{Placement\|([\d+-]+)\}\}\s*\|\|[^|\n]*\|\s*([\d.]+)/g)].map((m) => [m[1], m[2]]);
  const [pts = "", decay = ""] = system.split("{{box|break}}");
  return {
    teams: tables.find((t) => /teams/i.test(t.title)),
    players: tables.find((t) => /players/i.test(t.title)),
    updated: page.text.match(/Last Updated:'''\s*([^\n]+)/)?.[1].trim().replace(/\.$/, ""),
    edited: page.edited,
    placement: pairs(pts),
    decay: pairs(decay),
  };
}

// ---- PUBG Mobile: PMGC qualification points by region -----------------------------------------------------------------
export const REGIONS = [
  { id: "southeast-asia", label: "Southeast Asia", path: "Southeast Asia" },
  { id: "south-asia", label: "South Asia", path: "South Asia" },
  { id: "eeca", label: "Eastern Europe & Central Asia", path: "EECA" },
  { id: "mena", label: "Middle East & North Africa", path: "MENA" },
  { id: "turkiye", label: "Türkiye", path: "Turkiye" },
  { id: "western-europe", label: "Western Europe", path: "Western Europe" },
  { id: "americas", label: "Americas", path: "Americas" },
  { id: "africa", label: "Africa", path: "Africa" },
] as const;

export type RegionBoard = {
  id: string;
  label: string;
  edited: string;
  /** "PMGC Qualification" and "PMWC Qualification" tables, as titled on Liquipedia */
  pmgc?: PointsTable;
  pmwc?: PointsTable;
};

export async function getPmgc(year: number): Promise<RegionBoard[]> {
  const base = `PUBG Mobile Global Championship/${year}/Points`;
  const pages = await getWikiPages(REGIONS.map((r) => `${base}/${r.path}`));
  return REGIONS.flatMap((r) => {
    const page = pages.get(`${base}/${r.path}`);
    if (!page) return [];
    const tables = parseFfa(page.text);
    return [{ id: r.id, label: r.label, edited: page.edited, pmgc: tables.find((t) => /PMGC Qualification/i.test(t.title)), pmwc: tables.find((t) => /PMWC Qualification/i.test(t.title)) }];
  });
}

// The current season's boards (falls back to last year's early in a new year, before the new pages exist).
export async function getPmgcLatest(): Promise<{ year: number; boards: RegionBoard[] }> {
  const year = new Date().getFullYear(); // callers run after connection(), so reading the clock here is fine
  const boards = await getPmgc(year);
  return boards.length ? { year, boards } : { year: year - 1, boards: await getPmgc(year - 1) };
}
