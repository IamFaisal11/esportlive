import { getWikiPages } from "./liquipedia";

// Player transfers from Liquipedia's monthly "Player Transfers/<year>/<Month>" pages. Each move is one {{Transfer Row|...}}.
export type TransferPlayer = { name: string; page?: string; flag?: string };
export type Transfer = {
  date: string;
  players: TransferPlayer[];
  from?: string;
  to?: string;
  fromRole?: string;
  toRole?: string;
  wholeTeam: boolean;
  source?: { url?: string; title?: string; publisher?: string };
};
export type Month = { id: string; label: string; year: number; name: string };

const NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// The last `count` months, newest first (callers run after connection(), so reading the clock here is fine).
export function recentMonths(count: number): Month[] {
  const now = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const name = NAMES[d.getUTCMonth()];
    return { id: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`, label: `${name} ${d.getUTCFullYear()}`, year: d.getUTCFullYear(), name };
  });
}

// The text between "{{Transfer Row|" and its matching "}}" (templates nest: {{TRef|...{{flag|id}}...}}).
function templateBody(text: string, start: number): string | null {
  let depth = 1;
  for (let k = start; k < text.length; ) {
    if (text.startsWith("{{", k)) { depth++; k += 2; }
    else if (text.startsWith("}}", k)) { depth--; if (depth === 0) return text.slice(start, k); k += 2; }
    else k++;
  }
  return null;
}

// "a=1|b=[[X|y]]|c={{t|d}}" -> { a: "1", b: "[[X|y]]", c: "{{t|d}}" }: split on | only outside [[ ]] and {{ }}.
function params(body: string): Record<string, string> {
  const out: Record<string, string> = {};
  let depth = 0, from = 0;
  const push = (end: number) => {
    const piece = body.slice(from, end);
    const eq = piece.indexOf("=");
    if (eq > 0) out[piece.slice(0, eq).trim()] = piece.slice(eq + 1).trim();
  };
  for (let k = 0; k < body.length; k++) {
    const two = body.slice(k, k + 2);
    if (two === "{{" || two === "[[") { depth++; k++; }
    else if (two === "}}" || two === "]]") { depth--; k++; }
    else if (body[k] === "|" && depth === 0) { push(k); from = k + 1; }
  }
  push(body.length);
  return out;
}

const plain = (s?: string) => (s ?? "").replace(/\[\[(?:[^\]|]+\|)?([^\]]+)\]\]/g, "$1").replace(/\{\{[^}]*\}\}/g, "").replace(/'''?/g, "").trim() || undefined;

export function parseTransfers(wikitext: string): Transfer[] {
  const text = wikitext.replace(/<!--[\s\S]*?-->/g, "");
  const marker = "{{Transfer Row|";
  const out: Transfer[] = [];
  for (let i = text.indexOf(marker); i !== -1; i = text.indexOf(marker, i + marker.length)) {
    const body = templateBody(text, i + marker.length);
    if (!body) continue;
    const p = params(body);
    if (!/^\d{4}-\d\d-\d\d/.test(p.date ?? "")) continue;
    const players: TransferPlayer[] = ["", "2", "3", "4", "5", "6"].flatMap((n) =>
      p[`name${n}`] ? [{ name: plain(p[`name${n}`])!, page: plain(p[`link${n}`]), flag: p[`flag${n}`]?.toLowerCase() }] : [],
    );
    if (!players.length) continue;
    const ref = p.ref?.match(/\{\{TRef\|([\s\S]*)\}\}/)?.[1];
    const r = ref ? params(ref) : {};
    out.push({
      date: p.date.slice(0, 10),
      players,
      from: plain(p.team1),
      to: plain(p.team2),
      fromRole: plain(p.role1),
      toRole: plain(p.role2),
      wholeTeam: p.wholeteam === "true",
      source: ref ? { url: r.url, title: plain(r.title), publisher: plain(r.publisher) } : undefined,
    });
  }
  return out.sort((a, b) => b.date.localeCompare(a.date));
}

export async function getTransfers(month: Month): Promise<{ edited: string; transfers: Transfer[] } | null> {
  const title = `Player Transfers/${month.year}/${month.name}`;
  const page = (await getWikiPages([title])).get(title);
  return page ? { edited: page.edited, transfers: parseTransfers(page.text) } : null;
}
