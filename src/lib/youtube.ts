// Reads YouTube's public search results page (they are embedded as JSON, so no API key is needed) and picks out
// the videos that are really about one tournament: watch parties, co-streams and live streams.
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

export type YtVideo = { id: string; title: string; channel: string; meta: string; live: boolean };

type Node = Record<string, unknown>;
const cache = new Map<string, { at: number; ttl: number; videos: YtVideo[] }>();

// Every {videoRenderer: {...}} anywhere in the result tree.
function renderers(node: unknown, out: Node[] = []): Node[] {
  if (Array.isArray(node)) node.forEach((n) => renderers(n, out));
  else if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node as Node)) {
      if (k === "videoRenderer" && v && typeof v === "object") out.push(v as Node);
      else renderers(v, out);
    }
  }
  return out;
}

const text = (t: unknown): string => {
  const o = t as { simpleText?: string; runs?: { text: string }[] } | undefined;
  return o?.simpleText ?? o?.runs?.map((r) => r.text).join("") ?? "";
};

export async function searchYoutube(q: string, liveOnly = false): Promise<YtVideo[]> {
  const key = `${liveOnly ? "live" : "all"}:${q.toLowerCase()}`;
  const hit = cache.get(key);
  if (hit && performance.now() - hit.at < hit.ttl) return hit.videos;

  // sp=EgJAAQ%3D%3D is YouTube's own "Live" filter
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}${liveOnly ? "&sp=EgJAAQ%253D%253D" : ""}`;
  const res = await fetch(url, { headers: { "User-Agent": UA, "Accept-Language": "en-US,en;q=0.9", Cookie: "CONSENT=YES+1; SOCS=CAI" } });
  if (!res.ok) throw new Error(`YouTube search ${res.status}`);
  const html = await res.text();
  const start = html.indexOf("ytInitialData = ");
  const end = html.indexOf(";</script>", start);
  if (start < 0 || end < 0) throw new Error("Couldn't read YouTube's results");
  const data = JSON.parse(html.slice(start + "ytInitialData = ".length, end));

  const videos = renderers(data).flatMap((v) => {
    const id = v.videoId as string | undefined;
    if (!id) return [];
    const badges = JSON.stringify(v.badges ?? "") + JSON.stringify(v.thumbnailOverlays ?? "");
    return [{
      id,
      title: text(v.title),
      channel: text(v.ownerText),
      meta: [text(v.viewCountText), text(v.publishedTimeText) || text(v.lengthText)].filter(Boolean).join(" · "),
      live: /LIVE_NOW|"LIVE"/.test(badges),
    }];
  });
  cache.set(key, { at: performance.now(), ttl: liveOnly ? 60_000 : 10 * 60_000, videos });
  return videos;
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const PARTY = /watch ?party|watch ?along|co ?stream|reaction|reacting|commentary/;

// Watch parties of one event. A video is kept only if its title names the event (its short name such as "BMIC", or the
// full name) and does not carry a different year; unless the event is running and the video is live, it must also say it is a watch party / co-stream.
export async function findWatchParties(e: { name: string; abbr?: string; year?: string }, live: boolean): Promise<YtVideo[]> {
  const abbr = e.abbr ? norm(e.abbr) : "";
  const full = norm(e.name);
  const label = abbr ? `${abbr}${e.year ? " " + e.year : ""}` : e.name;
  const queries: [string, boolean][] = [[`${label} watch party`, false], [`${e.name} watch party`, false]];
  if (live) queries.push([`${label} live`, true]);

  const results = await Promise.allSettled(queries.map(([q, l]) => searchYoutube(q, l)));
  const seen = new Set<string>();
  const kept: YtVideo[] = [];
  for (const r of results) {
    if (r.status !== "fulfilled") continue;
    for (const v of r.value) {
      if (seen.has(v.id)) continue;
      seen.add(v.id);
      const t = norm(v.title);
      const named = (abbr && new RegExp(`\\b${abbr}\\b`).test(t)) || t.includes(full);
      const years = t.match(/\b20\d\d\b/g);
      const sameYear = !e.year || !years || years.includes(e.year);
      if (named && sameYear && ((live && v.live) || PARTY.test(`${t} ${norm(v.channel)}`))) kept.push(v);
    }
  }
  // Live first, then in YouTube's own relevance order
  return [...kept.filter((v) => v.live), ...kept.filter((v) => !v.live)].slice(0, 12);
}
