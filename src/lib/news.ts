// BGMI / PUBG Mobile headlines for the News page. Stories come from Bing News' public RSS search feeds (which carry the
// publisher's real link and, for many stories, an image); stories without an image get the preview image and summary
// the publisher itself puts in the page head (og:image / og:description), like a link preview. Only the headline, a short
// summary, an image and a link out are used; the articles belong to their publishers.
export type NewsItem = { title: string; url: string; source: string; date: string; image?: string; excerpt?: string };
export type NewsGame = "all" | "bgmi" | "pubgm";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const BGMI_QUERIES = ["BGMI esports", "BGMI tournament", "BMPS BGIS Krafton India esports"];
const PUBGM_QUERIES = ["PUBG Mobile esports", "PMGC 2026", "PUBG Mobile World Cup"];
const QUERIES: Record<NewsGame, string[]> = { all: [...BGMI_QUERIES, ...PUBGM_QUERIES], bgmi: BGMI_QUERIES, pubgm: PUBGM_QUERIES };
const RELEVANT = /bgmi|pubg|battlegrounds mobile|pmgc|pmwc|pmgo|bmps|bgis|bmic|krafton|esports/i;

const dec = (s: string) =>
  s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ").trim();
const tag = (item: string, name: string) => dec(item.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`))?.[1] ?? "");

// Bing names sources like "english.loktej" or "moneycontrol.com"; show them as a publisher name.
const SOURCE_NAMES: Record<string, string> = { "respawn.outlookindia": "Outlook Respawn", "english.loktej": "Loktej", talkesport: "TalkEsport", sportstiger: "Sports Tiger" };
function prettySource(s: string) {
  const key = s.toLowerCase();
  if (SOURCE_NAMES[key]) return SOURCE_NAMES[key];
  if (!/^[a-z0-9.-]+$/.test(s) || !s.includes(".")) return s;
  const label = s.replace(/\.(com|in|net|org|co|co\.in|news)$/i, "").split(".").pop() ?? s;
  return label.charAt(0).toUpperCase() + label.slice(1);
}

async function bing(query: string): Promise<NewsItem[]> {
  const res = await fetch(`https://www.bing.com/news/search?q=${encodeURIComponent(query)}&format=rss&mkt=en-IN&setlang=en`, {
    headers: { "User-Agent": UA },
    signal: AbortSignal.timeout(8000),
    cache: "no-store",
  });
  if (!res.ok) return [];
  const xml = await res.text();
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].flatMap((m) => {
    const link = tag(m[1], "link");
    let url = "";
    try {
      url = new URL(link).searchParams.get("url") ?? "";
    } catch {}
    const time = Date.parse(tag(m[1], "pubDate"));
    const title = tag(m[1], "title");
    if (!url || !title || Number.isNaN(time)) return [];
    const img = tag(m[1], "News:Image");
    return [{
      title,
      url,
      source: prettySource(tag(m[1], "News:Source")),
      date: new Date(time).toISOString(),
      // Bing serves the picture at any size; ask for a 16:9 card
      image: img ? `${img.replace(/^http:/, "https:")}&w=640&h=360&c=14` : undefined,
    }];
  });
}

// The preview a publisher puts in its page head. Only the first part of the page is read.
async function preview(url: string): Promise<{ image?: string; excerpt?: string }> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "text/html" }, redirect: "follow", signal: AbortSignal.timeout(4000), cache: "no-store" });
    if (!res.ok || !res.body) return {};
    const reader = res.body.getReader();
    let html = "";
    const decoder = new TextDecoder();
    while (html.length < 120_000) {
      const { done, value } = await reader.read();
      if (done) break;
      html += decoder.decode(value, { stream: true });
      if (html.includes("</head>")) break;
    }
    reader.cancel().catch(() => {});
    const meta = (prop: string) =>
      html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]*content=["']([^"']+)["']`, "i"))?.[1] ??
      html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${prop}["']`, "i"))?.[1];
    const img = meta("og:image") ?? meta("twitter:image");
    let image: string | undefined;
    try {
      image = img ? new URL(dec(img), res.url).toString() : undefined;
    } catch {}
    const excerpt = meta("og:description") ?? meta("description");
    return { image, excerpt: excerpt ? dec(excerpt).slice(0, 220) : undefined };
  } catch {
    return {};
  }
}

export async function getNews(game: NewsGame): Promise<NewsItem[]> {
  const lists = await Promise.allSettled(QUERIES[game].map(bing));
  const seen = new Set<string>();
  const stories = lists
    .flatMap((r) => (r.status === "fulfilled" ? r.value : []))
    .filter((n) => RELEVANT.test(n.title) && !seen.has(n.title.toLowerCase()) && seen.add(n.title.toLowerCase()))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 30);
  // One link preview per story, all at once: gives every card a summary and fills in the missing images.
  const previews = await Promise.all(stories.map((s) => preview(s.url)));
  // A site's generic tagline ("Top English News Headline - Find latest breaking news...") is not a summary: keep the
  // description only if it is about the headline (4+ longer words in common, or a quarter of its own words).
  const words = (t: string) => new Set(t.toLowerCase().match(/[a-z0-9]{4,}/g) ?? []);
  const about = (title: string, text?: string) => {
    if (!text) return false;
    const mine = words(text);
    const shared = [...mine].filter((w) => words(title).has(w)).length;
    return shared >= 4 || (shared >= 2 && shared / mine.size >= 0.25);
  };
  return stories.map((s, i) => ({ ...s, image: s.image ?? previews[i].image, excerpt: about(s.title, previews[i].excerpt) ? previews[i].excerpt : undefined }));
}
