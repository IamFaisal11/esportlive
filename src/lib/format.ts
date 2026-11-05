// V8 parses partial dates like 2026-11-?? as a wrong day, so only accept full ISO dates.
const parse = (d?: string) => (/^\d{4}-\d\d-\d\d/.test(d ?? "") ? Date.parse(d!) : NaN);

const fmt = (d?: string) => {
  const t = parse(d);
  return Number.isNaN(t) ? null : new Date(t).toLocaleDateString("en", { month: "short", day: "numeric", timeZone: "UTC" });
};

// Liquipedia dates can be partial (like 2026-11-??), so unparseable ones show as TBA.
export function dateRange(start?: string, end?: string) {
  const year = (end ?? start ?? "").slice(0, 4);
  return `${fmt(start) ?? "TBA"} – ${fmt(end) ?? "TBA"}, ${year}`;
}

export function status(start?: string, end?: string, now = Date.now()): "live" | "upcoming" | "finished" {
  const e = parse(end);
  const s = parse(start);
  if (!Number.isNaN(e) && e + 864e5 < now) return "finished";
  if (!Number.isNaN(s) && s > now) return "upcoming";
  return Number.isNaN(s) ? "upcoming" : "live";
}

// Liquipedia stores a tournament's tier as a number but names it with a letter: 1 = S-Tier, 2 = A-Tier, 3 = B-Tier...
export function tierLabel(tier?: string) {
  const letter = ["S", "A", "B", "C", "D"][Number(tier) - 1];
  return letter ? `${letter}-Tier` : tier ? `Tier ${tier}` : "Tier ?";
}

// True when `start` (YYYY-MM-DD) is no more than `days` days from now.
export const startsWithin = (start: string, days: number) => Date.parse(start) <= Date.now() + days * 864e5;
