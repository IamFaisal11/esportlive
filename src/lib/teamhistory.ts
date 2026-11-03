// Parsers for what Liquipedia's roster / timeline / results templates expand to (HTML with wiki links).
export type RosterMember = { id: string; page?: string; name?: string; role?: string; joined?: string; left?: string; newTeam?: string; note?: string };
export type PastResult = { date: string; place: string; tier: string; name: string; page?: string; team?: string; prize: string };
export type TeamHistory = {
  active: RosterMember[];
  former: RosterMember[];
  timeline: { year: string; items: string[] }[];
  results: { year: string; rows: PastResult[] }[];
};

// Strips refs, file links, wiki links ([[a|b]] -> b) and tags down to plain text.
export const wikiText = (s: string) =>
  s
    .replace(/<ref[^>]*\/>/g, "")
    .replace(/<ref[\s\S]*?<\/ref>/g, "")
    .replace(/\[\[File:[^\]]*\]\]/g, "")
    .replace(/\[\[(?:[^\]|]+\|)?([^\]]+)\]\]/g, "$1")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;|&#32;|&#160;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();

const rowsOf = (html: string) => [...html.matchAll(/<tr([^>]*)>([\s\S]*?)<\/tr>/g)].map((m) => ({ attrs: m[1], cells: [...m[2].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)].map((c) => c[1]) }));
const tablesOf = (html: string) => [...html.matchAll(/<table[^>]*>([\s\S]*?)<\/table>/g)].map((m) => rowsOf(m[1]));

// Liquipedia writes unknown dates as 2019-??-??; show them as just the known part.
const date = (s: string) => s.replace(/(-\?\?)+$/, "").replace(/\?\?/g, "").trim();

// Active / former player tables: header cells (ID, Name, Join Date, Leave Date, New Team, ...) decide the columns.
export function parseRoster(html: string): RosterMember[] {
  const out: RosterMember[] = [];
  for (const rows of tablesOf(html)) {
    const head = rows.find((r) => /head/.test(r.attrs))?.cells.map((c) => wikiText(c).toLowerCase()) ?? [];
    for (const r of rows.filter((r) => /row--body/.test(r.attrs))) {
      const m: RosterMember = { id: "" };
      r.cells.forEach((c, i) => {
        const v = wikiText(c);
        const h = head[i] ?? "";
        if (h === "id") {
          m.id = v;
          m.page = c.match(/\[\[(?!File:)([^\]|]+)/)?.[1];
        }
        else if (h === "name") m.name = v || undefined;
        else if (h.startsWith("join")) m.joined = date(v) || undefined;
        else if (h.startsWith("leave")) m.left = date(v) || undefined;
        else if (h.startsWith("new")) m.newTeam = v || undefined;
        else if (h.startsWith("role") || h.startsWith("position")) m.role = v || undefined;
        else if (v) m.note = v;
      });
      if (m.id) out.push(m);
    }
  }
  return out;
}

// <li class="tabN"><span>2019</span> ... <div class="contentN"><ul><li>August 5th – ...</li></ul></div>
export function parseTimeline(html: string): TeamHistory["timeline"] {
  const years = new Map([...html.matchAll(/<li class="tab(\d+)[^"]*"><span>(\d{4})<\/span>/g)].map((m) => [m[1], m[2]]));
  return [...html.matchAll(/<div class="content(\d+)[^"]*"[^>]*>([\s\S]*?)<\/ul>/g)]
    .map((m) => ({ year: years.get(m[1]) ?? "", items: [...m[2].matchAll(/<li>([\s\S]*?)<\/li>/g)].map((i) => wikiText(i[1])).filter(Boolean) }))
    .filter((y) => y.year && y.items.length)
    .sort((a, b) => b.year.localeCompare(a.year));
}

// "Detailed Results" table: year sub-header rows, then Date | Place | Tier | icon | Tournament | Prize.
export function parseResults(html: string): TeamHistory["results"] {
  const groups: TeamHistory["results"] = [];
  for (const rows of tablesOf(html)) {
    let year = "";
    for (const r of rows) {
      if (/sortbottom/.test(r.attrs)) year = wikiText(r.cells[0] ?? "");
      else if (/row--body/.test(r.attrs) && r.cells.length >= 5) {
        const ti = r.cells.findIndex((c, i) => i >= 3 && wikiText(c));
        const nameCell = r.cells[ti] ?? "";
        const row: PastResult = {
          date: wikiText(r.cells[0]),
          place: wikiText(r.cells[1]),
          tier: wikiText(r.cells[2]),
          name: wikiText(nameCell),
          page: nameCell.match(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/)?.[1],
          team: r.cells.length - ti > 2 ? wikiText(r.cells[ti + 1]) : undefined,
          prize: wikiText(r.cells[r.cells.length - 1]),
        };
        if (!row.name) continue;
        const y = year || row.date.slice(0, 4);
        (groups.find((g) => g.year === y) ?? groups[groups.push({ year: y, rows: [] }) - 1]).rows.push(row);
      }
    }
  }
  return groups.sort((a, b) => b.year.localeCompare(a.year));
}
